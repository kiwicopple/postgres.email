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
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
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
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
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
}
