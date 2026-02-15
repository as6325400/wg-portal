import db from '../db.js'
import { isAdmin, isInAllowedGroup } from '../services/linux-user.js'

export function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id)
  if (!user || !user.enabled) {
    req.session.destroy(() => {})
    return res.status(403).json({ error: 'Account is disabled' })
  }

  // Admin bypasses group checks
  if (req.session.user.role === 'admin') {
    return next()
  }

  const groupsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowed_groups')
  const usersRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowed_users')
  const allowedGroups = groupsRow ? JSON.parse(groupsRow.value) : []
  const allowedUsers = usersRow ? JSON.parse(usersRow.value) : []

  // No restriction = everyone allowed
  if (allowedGroups.length === 0 && allowedUsers.length === 0) {
    return next()
  }

  // Check if user is individually allowed
  if (allowedUsers.includes(user.username)) {
    return next()
  }

  if (user.auth_source === 'ldap') {
    // Check LDAP groups stored in session
    const ldapGroups = req.session.user.ldap_groups || []
    const inAllowed = ldapGroups.some(g => allowedGroups.includes(g))
    if (!inAllowed) {
      req.session.destroy(() => {})
      return res.status(403).json({ error: 'Your group is no longer allowed' })
    }
  } else {
    // Check Linux groups for PAM users
    if (!isAdmin(user.username) && !isInAllowedGroup(user.username, allowedGroups)) {
      req.session.destroy(() => {})
      return res.status(403).json({ error: 'Your group is no longer allowed' })
    }
  }

  next()
}

export function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}
