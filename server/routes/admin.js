import { Router } from 'express'
import { execSync } from 'child_process'
import { requireAdmin } from '../middleware/auth.js'
import { disableUserDevices, enableUserDevices } from '../services/wireguard.js'
import { isInAllowedGroup, isAdmin } from '../services/linux-user.js'
import db from '../db.js'

const router = Router()

// GET /api/admin/users
router.get('/users', requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.*, COUNT(d.id) as device_count
    FROM users u
    LEFT JOIN devices d ON d.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all()
  res.json({ users })
})

// GET /api/admin/users/:id/devices
router.get('/users/:id/devices', requireAdmin, (req, res) => {
  const devices = db.prepare(
    'SELECT id, name, vpn_ip, public_key, enabled, created_at, last_handshake, rx_bytes, tx_bytes FROM devices WHERE user_id = ?'
  ).all(req.params.id)
  res.json({ devices })
})

// PATCH /api/admin/users/:id
router.patch('/users/:id', requireAdmin, (req, res) => {
  const { max_devices, enabled } = req.body
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  if (max_devices !== undefined) {
    if (!Number.isInteger(max_devices) || max_devices < 0 || max_devices > 100) {
      return res.status(400).json({ error: 'max_devices must be an integer between 0 and 100' })
    }
    db.prepare('UPDATE users SET max_devices = ? WHERE id = ?').run(max_devices, user.id)
  }
  if (enabled !== undefined) {
    const wasEnabled = !!user.enabled
    const nowEnabled = !!enabled
    db.prepare('UPDATE users SET enabled = ? WHERE id = ?').run(nowEnabled ? 1 : 0, user.id)

    // Sync WireGuard peers with user enabled state
    if (wasEnabled && !nowEnabled) {
      disableUserDevices(user.id, db)
    } else if (!wasEnabled && nowEnabled) {
      enableUserDevices(user.id, db)
    }
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)
  res.json({ user: updated })
})

// GET /api/admin/groups - list all system groups
router.get('/groups', requireAdmin, (req, res) => {
  try {
    const output = execSync('getent group', { encoding: 'utf-8' })
    const groups = output.trim().split('\n')
      .map(line => {
        const parts = line.split(':')
        return { name: parts[0], gid: parseInt(parts[2], 10) }
      })
      .filter(g => g.name && g.gid >= 1000 && g.name !== 'nogroup' && g.name !== 'nobody')
      .map(g => g.name)
      .sort()
    res.json({ groups })
  } catch {
    res.status(500).json({ error: 'Failed to list groups' })
  }
})

// GET /api/admin/settings
router.get('/settings', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowed_groups')
  const allowedGroups = row ? JSON.parse(row.value) : []
  res.json({ allowed_groups: allowedGroups })
})

// PUT /api/admin/settings
router.put('/settings', requireAdmin, (req, res) => {
  const { allowed_groups } = req.body
  if (!Array.isArray(allowed_groups)) {
    return res.status(400).json({ error: 'allowed_groups must be an array of strings' })
  }

  // Get old allowed groups to detect changes
  const oldRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowed_groups')
  const oldGroups = oldRow ? JSON.parse(oldRow.value) : []

  const value = JSON.stringify(allowed_groups)
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('allowed_groups', value)

  // Sync WireGuard peers: disable/enable users based on new group rules
  const allUsers = db.prepare('SELECT * FROM users').all()
  for (const user of allUsers) {
    if (isAdmin(user.username)) continue // admins bypass group check

    const wasAllowed = isInAllowedGroup(user.username, oldGroups)
    const nowAllowed = isInAllowedGroup(user.username, allowed_groups)

    if (wasAllowed && !nowAllowed) {
      disableUserDevices(user.id, db)
    } else if (!wasAllowed && nowAllowed) {
      enableUserDevices(user.id, db)
    }
  }

  res.json({ allowed_groups })
})

export default router
