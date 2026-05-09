const { Pool } = require('pg')
const { createClient } = require('@supabase/supabase-js')

let pool = null
let supabase = null

/**
 * Get or create a PostgreSQL connection pool
 * @returns {Pool}
 */
function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Recycle clients before the Supavisor pooler kills them on idle.
      idleTimeoutMillis: 30_000,
      max: 5,
    })
    // Idle clients disconnected by the pooler emit on the pool — without a
    // listener the process crashes. Swallow; the next checkout reconnects.
    pool.on('error', (err) => {
      console.warn(`[pg pool] idle client error (ignored): ${err.code || ''} ${err.message}`)
    })
  }
  return pool
}

const TRANSIENT_PG_ERRORS = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EADDRNOTAVAIL',
  'EPIPE',
  'ENOTFOUND',
])

function isTransientPgError(err) {
  if (!err) return false
  if (err.code && TRANSIENT_PG_ERRORS.has(err.code)) return true
  const msg = err.message || ''
  return (
    msg.includes('Connection terminated') ||
    msg.includes('connection terminated') ||
    msg.includes('server closed the connection') ||
    msg.includes('Client has encountered a connection error')
  )
}

async function withRetry(fn, { retries = 5, baseDelayMs = 500, label = 'op' } = {}) {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (err) {
      attempt++
      if (attempt > retries || !isTransientPgError(err)) throw err
      const delay = baseDelayMs * Math.pow(2, attempt - 1)
      console.warn(`[pg retry] ${label} attempt ${attempt}/${retries} after ${err.code || ''} ${err.message} — sleeping ${delay}ms`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
}

/**
 * Get or create a Supabase client
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SECRET_KEY
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set')
    }
    supabase = createClient(url, key)
  }
  return supabase
}

/**
 * Ensure a mailbox exists in the database
 * @param {Pool} pool
 * @param {string} mailboxId
 */
async function ensureMailbox(pool, mailboxId) {
  await pool.query(
    `INSERT INTO mailboxes (id, message_count) VALUES ($1, 0) ON CONFLICT (id) DO NOTHING`,
    [mailboxId]
  )
}

/**
 * Update message count for a mailbox
 * @param {Pool} pool
 * @param {string} mailboxId
 */
async function updateMailboxCount(pool, mailboxId) {
  await pool.query(
    `UPDATE mailboxes SET message_count = (
      SELECT count(*) FROM messages WHERE mailbox_id = $1
    ) WHERE id = $1`,
    [mailboxId]
  )
}

/**
 * Insert messages in a batch
 * @param {Pool} pool
 * @param {Array} messages
 * @param {string} mailboxId
 * @returns {number} Number of messages inserted/updated
 */
async function insertMessagesBatch(pool, messages, mailboxId) {
  if (messages.length === 0) return 0

  return withRetry(async () => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      let count = 0
      for (const msg of messages) {
        const query = `
          INSERT INTO messages (
            id, mailbox_id, in_reply_to, ts, subject, from_email,
            from_addresses, to_addresses, cc_addresses, bcc_addresses,
            size, attachments, body_text, embedded_files, headers
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (id) DO UPDATE SET
            body_text = EXCLUDED.body_text,
            from_email = EXCLUDED.from_email,
            from_addresses = EXCLUDED.from_addresses,
            to_addresses = EXCLUDED.to_addresses,
            cc_addresses = EXCLUDED.cc_addresses,
            headers = EXCLUDED.headers
        `
        await client.query(query, [
          msg.id,
          mailboxId,
          msg.in_reply_to,
          msg.ts,
          msg.subject,
          msg.from_email,
          JSON.stringify(msg.from_addresses),
          JSON.stringify(msg.to_addresses),
          JSON.stringify(msg.cc_addresses),
          JSON.stringify(msg.bcc_addresses),
          msg.size,
          JSON.stringify(msg.attachments || []),
          msg.body_text,
          JSON.stringify(msg.embedded_files || []),
          JSON.stringify(msg.headers),
        ])
        count++
      }

      await client.query('COMMIT')
      return count
    } catch (err) {
      try {
        await client.query('ROLLBACK')
      } catch (_) {
        // Connection may already be dead; nothing to roll back.
      }
      throw err
    } finally {
      client.release()
    }
  }, { label: `insertMessagesBatch(${mailboxId}, n=${messages.length})` })
}

/**
 * Close the database pool
 */
async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

module.exports = {
  getPool,
  getSupabase,
  ensureMailbox,
  updateMailboxCount,
  insertMessagesBatch,
  closePool,
  withRetry,
  isTransientPgError,
}
