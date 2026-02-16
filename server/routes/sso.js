import { Router } from 'express'
import crypto from 'crypto'
import db from '../db.js'

const router = Router()

const SSO_SECRET = process.env.SSO_SECRET || ''

// GET /api/sso/callback?token=xxx - Validate SSO token and create session
router.get('/callback', (req, res) => {
  if (!SSO_SECRET) {
    return res.status(500).json({ error: 'SSO not configured' })
  }

  const { token } = req.query
  if (!token) {
    return res.status(400).json({ error: 'Token required' })
  }

  // Parse token: payloadB64.signature
  const parts = token.split('.')
  if (parts.length !== 2) {
    return res.status(400).json({ error: 'Invalid token format' })
  }

  const [payloadB64, signature] = parts

  // Verify signature
  let payload
  try {
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString()
    const expectedSig = crypto.createHmac('sha256', SSO_SECRET).update(payloadStr).digest('hex')
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      return res.status(401).json({ error: 'Invalid token signature' })
    }
    payload = JSON.parse(payloadStr)
  } catch {
    return res.status(400).json({ error: 'Invalid token' })
  }

  // Check expiration
  if (!payload.exp || Date.now() > payload.exp) {
    return res.status(401).json({ error: 'Token expired' })
  }

  const { username } = payload
  if (!username) {
    return res.status(400).json({ error: 'Invalid token payload' })
  }

  // Determine role: admin if token says so, or check LDAP admin group
  const adminGroup = process.env.LDAP_ADMIN_GROUP || ''
  const tokenGroups = payload.groups || []
  const isAdminUser = payload.is_admin === true || (adminGroup && tokenGroups.includes(adminGroup))
  const role = isAdminUser ? 'admin' : 'user'

  // Access control (same logic as login) — admins bypass
  if (!isAdminUser) {
    const groupsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowed_groups')
    const usersRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowed_users')
    const allowedGroups = groupsRow ? JSON.parse(groupsRow.value) : []
    const allowedUsers = usersRow ? JSON.parse(usersRow.value) : []

    const noRestriction = allowedGroups.length === 0 && allowedUsers.length === 0
    if (!noRestriction && !allowedUsers.includes(username)) {
      const inAllowed = tokenGroups.some(g => allowedGroups.includes(g))
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
    db.prepare('UPDATE users SET role = ?, auth_source = ? WHERE id = ?').run(role, 'ldap', existingUser.id)
    user = { ...existingUser, role, auth_source: 'ldap' }
  } else {
    const result = db.prepare('INSERT INTO users (username, role, auth_source) VALUES (?, ?, ?)').run(username, role, 'ldap')
    user = { id: result.lastInsertRowid, username, role, auth_source: 'ldap', max_devices: 5, enabled: 1 }
  }

  // Create session
  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    auth_source: 'ldap',
    ldap_groups: tokenGroups.length > 0 ? tokenGroups : undefined,
  }

  // Redirect to frontend
  const siteUrl = process.env.SITE_URL || ''
  res.redirect(siteUrl || '/')
})

export default router
