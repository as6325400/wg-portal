import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pam = require('authenticate-pam')

export function authenticate(username, password) {
  return new Promise((resolve, reject) => {
    pam.authenticate(username, password, (err) => {
      if (err) {
        reject(new Error(`PAM authentication failed: ${err}`))
      } else {
        resolve()
      }
    }, { serviceName: process.env.PAM_SERVICE || 'login', remoteHost: 'localhost' })
  })
}
