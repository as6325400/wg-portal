import { readFileSync } from 'fs'
import { execSync } from 'child_process'

export function userExists(username) {
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(username)) return false
  const passwd = readFileSync('/etc/passwd', 'utf-8')
  return passwd.split('\n').some(line => line.split(':')[0] === username)
}

export function getUserUid(username) {
  const passwd = readFileSync('/etc/passwd', 'utf-8')
  for (const line of passwd.split('\n')) {
    const parts = line.split(':')
    if (parts[0] === username) return parseInt(parts[2], 10)
  }
  return null
}

export function getUserGroups(username) {
  try {
    const output = execSync(`id -Gn ${username}`, { encoding: 'utf-8' }).trim()
    return output.split(' ')
  } catch {
    return []
  }
}

export function isAdmin(username) {
  const uid = getUserUid(username)
  if (uid === 0) return true
  const groups = getUserGroups(username)
  return groups.includes('sudo') || groups.includes('wheel')
}

export function isInAllowedGroup(username, allowedGroups) {
  if (!allowedGroups || allowedGroups.length === 0) return true
  const groups = getUserGroups(username)
  return allowedGroups.some(g => groups.includes(g))
}
