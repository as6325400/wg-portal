import session from 'express-session'
import { createRequire } from 'module'
import db from '../db.js'
import config from '../config.js'

const require = createRequire(import.meta.url)
const SqliteStoreFactory = require('better-sqlite3-session-store')
const SqliteStore = SqliteStoreFactory(session)

export const sessionMiddleware = session({
  store: new SqliteStore({
    client: db,
    expired: { clear: true, intervalMs: 900000 },
  }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  name: 'wg.sid',
  cookie: {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  },
})
