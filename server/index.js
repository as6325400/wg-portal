import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import config from './config.js'
import { sessionMiddleware } from './middleware/session.js'
import authRoutes from './routes/auth.js'
import deviceRoutes from './routes/devices.js'
import adminRoutes from './routes/admin.js'
import { getPeersStatus } from './services/wireguard.js'
import db from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(helmet({ contentSecurityPolicy: false }))

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
}

app.use(express.json())
app.use(sessionMiddleware)

app.use('/api/auth', authRoutes)
app.use('/api/devices', deviceRoutes)
app.use('/api/admin', adminRoutes)

// Periodic traffic stats update
function updateTrafficStats() {
  try {
    const peers = getPeersStatus()
    const updateStmt = db.prepare(
      'UPDATE devices SET last_handshake = ?, rx_bytes = ?, tx_bytes = ? WHERE public_key = ?'
    )
    const transaction = db.transaction(() => {
      for (const peer of peers) {
        const handshake = peer.latestHandshake > 0
          ? new Date(peer.latestHandshake * 1000).toISOString()
          : null
        updateStmt.run(handshake, peer.rxBytes, peer.txBytes, peer.publicKey)
      }
    })
    transaction()
  } catch (err) {
    // WireGuard may not be available during development
    if (process.env.NODE_ENV === 'production') {
      console.error('Failed to update traffic stats:', err.message)
    }
  }
}

setInterval(updateTrafficStats, 30000)
updateTrafficStats()

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist')
  app.use(express.static(distPath))
  app.get('{*path}', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(distPath, 'index.html'))
    }
  })
}

app.listen(config.port, () => {
  console.log(`wg-portal running on http://localhost:${config.port}`)
})
