import { Client } from 'ldapts'
import config from '../config.js'

const ldapConfig = config.ldap

const tlsOptions = ldapConfig.url.startsWith('ldaps://') && !ldapConfig.tlsRejectUnauthorized
  ? { rejectUnauthorized: false }
  : undefined

function createClient() {
  return new Client({ url: ldapConfig.url, tlsOptions })
}

export function isLdapEnabled() {
  return !!(ldapConfig.url && ldapConfig.baseDn)
}

/**
 * Extract group CN names from memberOf DN list.
 * e.g. "cn=ipausers,cn=groups,..." => "ipausers"
 */
function extractGroupNames(memberOf) {
  if (!memberOf) return []
  const entries = Array.isArray(memberOf) ? memberOf : [memberOf]
  return entries.map(dn => {
    const match = dn.match(/^cn=([^,]+)/i)
    return match ? match[1] : null
  }).filter(Boolean)
}

/**
 * Authenticate a user against LDAP using search-then-bind.
 * Returns { username, isAdmin, groups } on success, throws on failure.
 */
export async function ldapAuthenticate(username, password) {
  if (!isLdapEnabled()) throw new Error('LDAP is not configured')

  const client = createClient()

  try {
    // Step 1: Bind with service account (or anonymous) to search for the user
    if (ldapConfig.bindDn && ldapConfig.bindPassword) {
      await client.bind(ldapConfig.bindDn, ldapConfig.bindPassword)
    }

    // Step 2: Search for the user DN
    const filter = ldapConfig.userFilter.replace(/\{username\}/g, username)
    const { searchEntries } = await client.search(ldapConfig.baseDn, {
      scope: 'sub',
      filter,
      attributes: ['dn', 'uid', 'cn', 'memberOf'],
    })

    if (searchEntries.length === 0) {
      throw new Error('User not found in LDAP')
    }

    const userEntry = searchEntries[0]
    const userDn = userEntry.dn

    // Step 3: Unbind service account, then bind as user to verify password
    await client.unbind()

    const userClient = createClient()
    try {
      await userClient.bind(userDn, password)
      await userClient.unbind()
    } catch {
      throw new Error('Invalid LDAP credentials')
    }

    // Step 4: Extract group info
    const groups = extractGroupNames(userEntry.memberOf)
    const isAdmin = checkLdapAdmin(groups)

    return { username, isAdmin, groups }
  } finally {
    try { await client.unbind() } catch { /* ignore */ }
  }
}

function checkLdapAdmin(groups) {
  if (!ldapConfig.adminGroup) return false
  return groups.some(g => g.toLowerCase() === ldapConfig.adminGroup.toLowerCase())
}

/**
 * List all LDAP groups with their members for admin panel.
 * Returns [{ name, members: [username, ...] }, ...]
 */
export async function getLdapGroupsWithMembers() {
  if (!isLdapEnabled()) return []

  const client = createClient()
  try {
    if (ldapConfig.bindDn && ldapConfig.bindPassword) {
      await client.bind(ldapConfig.bindDn, ldapConfig.bindPassword)
    }

    const groupBaseDn = ldapConfig.baseDn.replace(/cn=users,/i, 'cn=groups,')

    // Get all groups
    let { searchEntries: groupEntries } = await client.search(groupBaseDn, {
      scope: 'sub',
      filter: '(objectClass=ipaUserGroup)',
      attributes: ['cn'],
    })

    if (groupEntries.length === 0) {
      ({ searchEntries: groupEntries } = await client.search(groupBaseDn, {
        scope: 'sub',
        filter: '(|(objectClass=groupOfNames)(objectClass=posixGroup))',
        attributes: ['cn'],
      }))
    }

    const groupNames = groupEntries.map(e => e.cn).filter(Boolean).sort()

    // Get all users with their memberOf
    const { searchEntries: userEntries } = await client.search(ldapConfig.baseDn, {
      scope: 'sub',
      filter: '(objectClass=posixAccount)',
      attributes: ['uid', 'memberOf'],
    })

    // Build group → members map
    const groups = groupNames.map(name => {
      const members = userEntries
        .filter(u => {
          const userGroups = extractGroupNames(u.memberOf)
          return userGroups.includes(name)
        })
        .map(u => u.uid)
        .filter(Boolean)
        .sort()
      return { name, members }
    })

    await client.unbind()
    return groups
  } catch {
    return []
  } finally {
    try { await client.unbind() } catch { /* ignore */ }
  }
}
