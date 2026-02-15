import 'dotenv/config'

export default {
  port: parseInt(process.env.PORT || '3000', 10),
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  encryptionKey: process.env.ENCRYPTION_KEY,
  wg: {
    interface: process.env.WG_INTERFACE || 'wg0',
    subnet: process.env.WG_SUBNET || '10.0.0.0/24',
    serverIp: process.env.WG_SERVER_IP || '10.0.0.1',
    endpoint: process.env.WG_ENDPOINT || 'your.server:51820',
    dns: process.env.WG_DNS || '1.1.1.1',
    allowedIps: process.env.WG_ALLOWED_IPS || '0.0.0.0/0',
  },
  ldap: {
    url: process.env.LDAP_URL || '',
    bindDn: process.env.LDAP_BIND_DN || '',
    bindPassword: process.env.LDAP_BIND_PASSWORD || '',
    baseDn: process.env.LDAP_BASE_DN || '',
    userFilter: process.env.LDAP_USER_FILTER || '(uid={username})',
    adminGroup: process.env.LDAP_ADMIN_GROUP || '',
    tlsRejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false',
  },
  dbPath: process.env.DB_PATH || './data/wg-portal.db',
}
