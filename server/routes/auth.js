import { Router } from 'express'
import { authenticate } from '../services/pam.js'
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

  if (!userExists(username)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  // sudo/root users always bypass group check
  if (!isAdmin(username)) {
    const dbSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowed_groups')
    const allowedGroups = dbSetting ? JSON.parse(dbSetting.value) : []

    if (!isInAllowedGroup(username, allowedGroups)) {
      return res.status(403).json({ error: 'Your group is not allowed to use this service' })
    }
  }

  try {
    await authenticate(username, password)
  } catch {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const role = isAdmin(username) ? 'admin' : 'user'

  // Upsert user
  const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  let user
  if (existingUser) {
    if (!existingUser.enabled) {
      return res.status(403).json({ error: 'Account is disabled' })
    }
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, existingUser.id)
    user = { ...existingUser, role }
  } else {
    const result = db.prepare('INSERT INTO users (username, role) VALUES (?, ?)').run(username, role)
    user = { id: result.lastInsertRowid, username, role, max_devices: 5, enabled: 1 }
  }

  req.session.user = { id: user.id, username: user.username, role: user.role }

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
