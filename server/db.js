import Database from 'better-sqlite3'
import config from './config.js'
import { mkdirSync } from 'fs'
import { dirname } from 'path'

mkdirSync(dirname(config.dbPath), { recursive: true })

const db = new Database(config.dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
    auth_source TEXT NOT NULL DEFAULT 'pam' CHECK(auth_source IN ('pam', 'ldap')),
    max_devices INTEGER NOT NULL DEFAULT 5,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    vpn_ip TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL UNIQUE,
    private_key_encrypted TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_handshake TEXT,
    rx_bytes INTEGER NOT NULL DEFAULT 0,
    tx_bytes INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

// Migration: add auth_source column if missing (for existing databases)
try {
  db.exec(`ALTER TABLE users ADD COLUMN auth_source TEXT NOT NULL DEFAULT 'pam' CHECK(auth_source IN ('pam', 'ldap'))`)
} catch {
  // Column already exists
}

export default db
