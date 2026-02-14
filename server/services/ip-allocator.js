import db from '../db.js'
import config from '../config.js'

function intToIp(int) {
  return [
    (int >>> 24) & 0xFF,
    (int >>> 16) & 0xFF,
    (int >>> 8) & 0xFF,
    int & 0xFF,
  ].join('.')
}

export function allocateIp() {
  const [base, prefixStr] = config.wg.subnet.split('/')
  const prefix = parseInt(prefixStr, 10)
  const baseParts = base.split('.').map(Number)
  const baseInt = (baseParts[0] << 24) | (baseParts[1] << 16) | (baseParts[2] << 8) | baseParts[3]
  const hostCount = Math.pow(2, 32 - prefix)

  const usedIps = new Set()
  const rows = db.prepare('SELECT vpn_ip FROM devices').all()
  rows.forEach(r => usedIps.add(r.vpn_ip))

  usedIps.add(config.wg.serverIp)
  usedIps.add(intToIp(baseInt >>> 0))
  usedIps.add(intToIp((baseInt + hostCount - 1) >>> 0))

  for (let i = 2; i < hostCount - 1; i++) {
    const ip = intToIp((baseInt + i) >>> 0)
    if (!usedIps.has(ip)) return ip
  }

  throw new Error('No available IP addresses in the subnet')
}
