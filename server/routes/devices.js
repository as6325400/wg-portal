import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { generateKeypair, addPeer, removePeer, generateClientConfig } from '../services/wireguard.js'
import { allocateIp } from '../services/ip-allocator.js'
import { encrypt, decrypt } from '../crypto.js'
import db from '../db.js'
import QRCode from 'qrcode'

const router = Router()

function isValidDeviceName(name) {
  return /^[a-zA-Z0-9_\- ]{1,32}$/.test(name)
}

// GET /api/devices
router.get('/', requireAuth, (req, res) => {
  const devices = db.prepare(
    'SELECT id, name, vpn_ip, public_key, enabled, created_at, last_handshake, rx_bytes, tx_bytes FROM devices WHERE user_id = ?'
  ).all(req.session.user.id)
  res.json({ devices })
})

// POST /api/devices
router.post('/', requireAuth, (req, res) => {
  const { name } = req.body
  if (!name || !isValidDeviceName(name)) {
    return res.status(400).json({ error: 'Invalid device name. Use 1-32 characters (letters, numbers, dashes, underscores, spaces).' })
  }

  const userId = req.session.user.id
  const user = db.prepare('SELECT max_devices FROM users WHERE id = ?').get(userId)
  const deviceCount = db.prepare('SELECT COUNT(*) as count FROM devices WHERE user_id = ?').get(userId).count

  if (deviceCount >= user.max_devices) {
    return res.status(400).json({ error: `Maximum device limit (${user.max_devices}) reached` })
  }

  const existing = db.prepare('SELECT id FROM devices WHERE user_id = ? AND name = ?').get(userId, name)
  if (existing) {
    return res.status(400).json({ error: 'A device with this name already exists' })
  }

  try {
    const { privateKey, publicKey } = generateKeypair()
    const vpnIp = allocateIp()
    const privateKeyEncrypted = encrypt(privateKey)

    const result = db.prepare(
      'INSERT INTO devices (user_id, name, vpn_ip, public_key, private_key_encrypted) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, name, vpnIp, publicKey, privateKeyEncrypted)

    addPeer(publicKey, vpnIp)

    res.status(201).json({
      device: {
        id: result.lastInsertRowid,
        name,
        vpn_ip: vpnIp,
        public_key: publicKey,
      },
    })
  } catch (err) {
    console.error('Device creation failed:', err)
    res.status(500).json({ error: 'Failed to create device' })
  }
})

// DELETE /api/devices/:id
router.delete('/:id', requireAuth, (req, res) => {
  const device = db.prepare('SELECT * FROM devices WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.user.id)

  if (!device) {
    return res.status(404).json({ error: 'Device not found' })
  }

  try {
    removePeer(device.public_key)
    db.prepare('DELETE FROM devices WHERE id = ?').run(device.id)
    res.json({ message: 'Device deleted' })
  } catch (err) {
    console.error('Device deletion failed:', err)
    res.status(500).json({ error: 'Failed to delete device' })
  }
})

// GET /api/devices/:id/config
router.get('/:id/config', requireAuth, (req, res) => {
  const device = db.prepare('SELECT * FROM devices WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.user.id)

  if (!device) {
    return res.status(404).json({ error: 'Device not found' })
  }

  const privateKey = decrypt(device.private_key_encrypted)
  const configText = generateClientConfig(privateKey, device.vpn_ip)

  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Content-Disposition', `attachment; filename="${device.name}.conf"`)
  res.send(configText)
})

// GET /api/devices/:id/qrcode
router.get('/:id/qrcode', requireAuth, async (req, res) => {
  const device = db.prepare('SELECT * FROM devices WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.user.id)

  if (!device) {
    return res.status(404).json({ error: 'Device not found' })
  }

  const privateKey = decrypt(device.private_key_encrypted)
  const configText = generateClientConfig(privateKey, device.vpn_ip)

  try {
    const dataUrl = await QRCode.toDataURL(configText, { width: 300, margin: 2 })
    res.json({ qrcode: dataUrl })
  } catch {
    res.status(500).json({ error: 'Failed to generate QR code' })
  }
})

export default router
