import { execSync } from 'child_process'
import config from '../config.js'

const WG_BIN = 'wg'
const WG_IFACE = config.wg.interface

function wgExec(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf-8', timeout: 5000, ...opts }).trim()
}

export function generateKeypair() {
  const privateKey = wgExec(`${WG_BIN} genkey`)
  const publicKey = wgExec(`${WG_BIN} pubkey`, { input: privateKey })
  return { privateKey, publicKey }
}

export function addPeer(publicKey, allowedIp) {
  wgExec(`${WG_BIN} set ${WG_IFACE} peer ${publicKey} allowed-ips ${allowedIp}/32`)
  savePeers()
}

export function removePeer(publicKey) {
  wgExec(`${WG_BIN} set ${WG_IFACE} peer ${publicKey} remove`)
  savePeers()
}

function savePeers() {
  try {
    wgExec(`wg-quick save ${WG_IFACE}`)
  } catch {
    // wg-quick save may not be available in dev
  }
}

export function getServerPublicKey() {
  const dump = wgExec(`${WG_BIN} show ${WG_IFACE} dump`)
  const firstLine = dump.split('\n')[0]
  const fields = firstLine.split('\t')
  return fields[1]
}

export function getPeersStatus() {
  const dump = wgExec(`${WG_BIN} show ${WG_IFACE} dump`)
  const lines = dump.split('\n')
  const peers = []
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split('\t')
    peers.push({
      publicKey: fields[0],
      endpoint: fields[2],
      allowedIps: fields[3],
      latestHandshake: parseInt(fields[4], 10),
      rxBytes: parseInt(fields[5], 10),
      txBytes: parseInt(fields[6], 10),
    })
  }
  return peers
}

export function disableUserDevices(userId, db) {
  const devices = db.prepare('SELECT * FROM devices WHERE user_id = ? AND enabled = 1').all(userId)
  for (const d of devices) {
    try { removePeer(d.public_key) } catch { /* peer may already be gone */ }
  }
  db.prepare('UPDATE devices SET enabled = 0 WHERE user_id = ? AND enabled = 1').run(userId)
  return devices.length
}

export function enableUserDevices(userId, db) {
  const devices = db.prepare('SELECT * FROM devices WHERE user_id = ? AND enabled = 0').all(userId)
  for (const d of devices) {
    try { addPeer(d.public_key, d.vpn_ip) } catch { /* ignore */ }
  }
  db.prepare('UPDATE devices SET enabled = 1 WHERE user_id = ? AND enabled = 0').run(userId)
  return devices.length
}

export function generateClientConfig(privateKey, vpnIp) {
  const serverPubKey = getServerPublicKey()
  return `[Interface]
PrivateKey = ${privateKey}
Address = ${vpnIp}/32
DNS = ${config.wg.dns}

[Peer]
PublicKey = ${serverPubKey}
AllowedIPs = ${config.wg.allowedIps}
Endpoint = ${config.wg.endpoint}
PersistentKeepalive = 25
`
}
