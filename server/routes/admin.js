import { Router } from 'express'
import { execSync } from 'child_process'
import { requireAdmin } from '../middleware/auth.js'
import { disableUserDevices, enableUserDevices } from '../services/wireguard.js'
import { isInAllowedGroup, isAdmin, getUserGroups } from '../services/linux-user.js'
import { isLdapEnabled, getLdapGroupsWithMembers } from '../services/ldap.js'
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

// GET /api/admin/groups - list all groups with members (Linux + LDAP)
router.get('/groups', requireAdmin, async (req, res) => {
  const groupMap = new Map()

  // Linux groups with members
  try {
    // Build GID → group name map and parse supplementary members
    const gidToGroup = new Map()
    const output = execSync('getent group', { encoding: 'utf-8' })
    output.trim().split('\n').forEach(line => {
      const parts = line.split(':')
      const name = parts[0]
      const gid = parseInt(parts[2], 10)
      const members = parts[3] ? parts[3].split(',').filter(Boolean) : []
      if (name && gid >= 1000 && name !== 'nogroup' && name !== 'nobody') {
        groupMap.set(name, { name, members, source: 'linux' })
        gidToGroup.set(gid, name)
      }
    })

    // Add users by their primary GID (getent group only lists supplementary members)
    const passwdOutput = execSync('getent passwd', { encoding: 'utf-8' })
    passwdOutput.trim().split('\n').forEach(line => {
      const parts = line.split(':')
      const username = parts[0]
      const uid = parseInt(parts[2], 10)
      const primaryGid = parseInt(parts[3], 10)
      if (uid < 1000) return
      const groupName = gidToGroup.get(primaryGid)
      if (groupName && groupMap.has(groupName)) {
        const group = groupMap.get(groupName)
        if (!group.members.includes(username)) {
          group.members.push(username)
        }
      }
    })
  } catch {
    // Failed to list Linux groups
  }

  // LDAP groups with members
  if (isLdapEnabled()) {
    try {
      const ldapGroups = await getLdapGroupsWithMembers()
      for (const g of ldapGroups) {
        if (groupMap.has(g.name)) {
          // Merge: LDAP members into existing group
          const existing = groupMap.get(g.name)
          const merged = [...new Set([...existing.members, ...g.members])].sort()
          groupMap.set(g.name, { name: g.name, members: merged, source: 'both' })
        } else {
          groupMap.set(g.name, { name: g.name, members: g.members, source: 'ldap' })
        }
      }
    } catch {
      // Failed to list LDAP groups
    }
  }

  const groups = [...groupMap.values()]
    .filter(g => g.members.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
  res.json({ groups })
})

// GET /api/admin/settings
router.get('/settings', requireAdmin, (req, res) => {
  const groupsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowed_groups')
  const usersRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowed_users')
  const allowedGroups = groupsRow ? JSON.parse(groupsRow.value) : []
  const allowedUsers = usersRow ? JSON.parse(usersRow.value) : []
  res.json({ allowed_groups: allowedGroups, allowed_users: allowedUsers })
})

// PUT /api/admin/settings
router.put('/settings', requireAdmin, (req, res) => {
  const { allowed_groups, allowed_users } = req.body
  if (!Array.isArray(allowed_groups)) {
    return res.status(400).json({ error: 'allowed_groups must be an array of strings' })
  }
  if (!Array.isArray(allowed_users)) {
    return res.status(400).json({ error: 'allowed_users must be an array of strings' })
  }

  // Get old settings to detect changes
  const oldGroupsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowed_groups')
  const oldUsersRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowed_users')
  const oldGroups = oldGroupsRow ? JSON.parse(oldGroupsRow.value) : []
  const oldUsers = oldUsersRow ? JSON.parse(oldUsersRow.value) : []

  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  )
  upsert.run('allowed_groups', JSON.stringify(allowed_groups))
  upsert.run('allowed_users', JSON.stringify(allowed_users))

  const noRestriction = allowed_groups.length === 0 && allowed_users.length === 0

  // Sync WireGuard peers: disable/enable PAM users based on new rules
  const allUsers = db.prepare('SELECT * FROM users').all()
  for (const user of allUsers) {
    if (user.auth_source === 'ldap') continue
    if (isAdmin(user.username)) continue

    const oldNoRestriction = oldGroups.length === 0 && oldUsers.length === 0
    const wasAllowed = oldNoRestriction || oldUsers.includes(user.username) || isInAllowedGroup(user.username, oldGroups)
    const nowAllowed = noRestriction || allowed_users.includes(user.username) || isInAllowedGroup(user.username, allowed_groups)

    if (wasAllowed && !nowAllowed) {
      disableUserDevices(user.id, db)
    } else if (!wasAllowed && nowAllowed) {
      enableUserDevices(user.id, db)
    }
  }

  res.json({ allowed_groups, allowed_users })
})

export default router
