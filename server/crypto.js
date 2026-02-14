import crypto from 'crypto'
import config from './config.js'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(config.encryptionKey, 'hex')

export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex')
  ciphertext += cipher.final('hex')
  const tag = cipher.getAuthTag().toString('hex')
  return JSON.stringify({ iv: iv.toString('hex'), tag, ciphertext })
}

export function decrypt(encryptedJson) {
  const { iv, tag, ciphertext } = JSON.parse(encryptedJson)
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  let plaintext = decipher.update(ciphertext, 'hex', 'utf8')
  plaintext += decipher.final('utf8')
  return plaintext
}
