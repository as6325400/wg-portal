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

  // Re-check group access (admins bypass)
  if (!isAdmin(user.username)) {
    const dbSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowed_groups')
    const allowedGroups = dbSetting ? JSON.parse(dbSetting.value) : []
    if (!isInAllowedGroup(user.username, allowedGroups)) {
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
