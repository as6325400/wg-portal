import { Router } from 'express'
import { authenticate } from '../services/pam.js'
import { ldapAuthenticate, isLdapEnabled } from '../services/ldap.js'
import { userExists, isAdmin, isInAllowedGroup } from '../services/linux-user.js'
import { loginLimiter } from '../middleware/rateLimit.js'
import { requireAuth } from '../middleware/auth.js'
import db from '../db.js'

const router = Router()

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  if (!/^[a-zA-Z0-9_.-]{1,64}$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username format' })
  }

  let authSource = null
  let role = 'user'
  let ldapGroups = []

  // Try LDAP first (if configured)
  if (isLdapEnabled()) {
    try {
      const ldapResult = await ldapAuthenticate(username, password)
      authSource = 'ldap'
      role = ldapResult.isAdmin ? 'admin' : 'user'
      ldapGroups = ldapResult.groups
    } catch {
      // LDAP failed, will try PAM below
    }
  }

  // Fall back to PAM (local Linux accounts)
  if (!authSource && userExists(username)) {
    if (!isAdmin(username)) {
      const groupsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowed_groups')
      const usersRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowed_users')
      const allowedGroups = groupsRow ? JSON.parse(groupsRow.value) : []
      const allowedUsers = usersRow ? JSON.parse(usersRow.value) : []

      const noRestriction = allowedGroups.length === 0 && allowedUsers.length === 0
      if (!noRestriction && !allowedUsers.includes(username) && !isInAllowedGroup(username, allowedGroups)) {
        return res.status(403).json({ error: 'Your group is not allowed to use this service' })
      }
    }

    try {
      await authenticate(username, password)
      authSource = 'pam'
      role = isAdmin(username) ? 'admin' : 'user'
    } catch {
      // PAM failed
    }
  }

  if (!authSource) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  // For LDAP users, check allowed groups/users (admin bypasses)
  if (authSource === 'ldap' && role !== 'admin') {
    const groupsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowed_groups')
    const usersRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowed_users')
    const allowedGroups = groupsRow ? JSON.parse(groupsRow.value) : []
    const allowedUsers = usersRow ? JSON.parse(usersRow.value) : []

    const noRestriction = allowedGroups.length === 0 && allowedUsers.length === 0
    if (!noRestriction && !allowedUsers.includes(username)) {
      const inAllowed = ldapGroups.some(g => allowedGroups.includes(g))
      if (!inAllowed) {
        return res.status(403).json({ error: 'Your group is not allowed to use this service' })
      }
    }
  }

  // Upsert user
  const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  let user
  if (existingUser) {
    if (!existingUser.enabled) {
      return res.status(403).json({ error: 'Account is disabled' })
    }
    db.prepare('UPDATE users SET role = ?, auth_source = ? WHERE id = ?').run(role, authSource, existingUser.id)
    user = { ...existingUser, role, auth_source: authSource }
  } else {
    const result = db.prepare('INSERT INTO users (username, role, auth_source) VALUES (?, ?, ?)').run(username, role, authSource)
    user = { id: result.lastInsertRowid, username, role, auth_source: authSource, max_devices: 5, enabled: 1 }
  }

  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    auth_source: authSource,
    ldap_groups: authSource === 'ldap' ? ldapGroups : undefined,
  }

  res.json({ user: { id: user.id, username: user.username, role: user.role } })
})

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' })
    res.clearCookie('wg.sid')
    res.json({ message: 'Logged out' })
  })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user })
})

export default router
