require('dotenv').config()

const { getPool, closePool, withRetry } = require('./lib/db')

// Backfill / repair public.messages.thread_id.
//
// Iterative parent → child UPDATE passes (no recursive CTE) so memory and WAL
// stay bounded — important on prod, which is currently memory-constrained.
// Each pass is its own transaction. Idempotent: only touches rows whose
// thread_id is wrong, so safe to re-run.
//
// Order matters: roots and orphans both have thread_id = id, and both must
// be set BEFORE the propagation loop. Otherwise descendants of orphans see
// a NULL parent.thread_id during propagation, get skipped, and end up
// classified as their own orphan instead of inheriting from the actual
// orphan ancestor.
//
// Re-running after loading historical emails repairs orphans whose parents
// have since arrived: the orphan pass becomes a no-op for those rows
// (NOT EXISTS now returns false), and the propagation pass picks them up
// because their thread_id no longer matches the now-resolved parent.
//
// Run as a CLI against prod:
//   NODE_ENV=production node -r dotenv/config scripts/backfill-thread-id.js dotenv_config_path=.env.prod
//
// Or call programmatically: `await repairThreadIds(pool)`.

async function repairThreadIds(pool, { logger = console } = {}) {
  logger.log('🌱 thread_id repair: roots (in_reply_to IS NULL → thread_id = id)')
  const rootsResult = await withRetry(
    () => pool.query(`
      UPDATE public.messages
         SET thread_id = id
       WHERE in_reply_to IS NULL
         AND thread_id IS DISTINCT FROM id
    `),
    { label: 'thread_id repair: roots' }
  )
  logger.log(`   ${rootsResult.rowCount} rows`)

  logger.log('🪦 thread_id repair: orphans (in_reply_to set but parent absent → thread_id = id)')
  const orphansResult = await withRetry(
    () => pool.query(`
      UPDATE public.messages m
         SET thread_id = m.id
       WHERE m.in_reply_to IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.messages p WHERE p.id = m.in_reply_to
         )
         AND m.thread_id IS DISTINCT FROM m.id
    `),
    { label: 'thread_id repair: orphans' }
  )
  logger.log(`   ${orphansResult.rowCount} rows`)

  // Parent → child propagation. With roots and orphans seeded, every chain
  // terminates at a row whose thread_id is already correct, so propagation
  // converges in O(max chain depth from root/orphan to leaf).
  let pass = 0
  while (true) {
    pass++
    const result = await withRetry(
      () => pool.query(`
        UPDATE public.messages m
           SET thread_id = parent.thread_id
          FROM public.messages parent
         WHERE m.in_reply_to = parent.id
           AND parent.thread_id IS NOT NULL
           AND m.thread_id IS DISTINCT FROM parent.thread_id
      `),
      { label: `thread_id repair: pass ${pass}` }
    )
    logger.log(`🔁 pass ${pass}: ${result.rowCount} rows`)
    if (result.rowCount === 0) break
    if (pass > 1000) {
      // pgsql-hackers threads can run hundreds of replies deep, so the
      // expected pass count is O(chain depth). Anything past 1000 likely
      // means a real cycle (in_reply_to graph not a DAG).
      throw new Error('thread_id repair did not converge after 1000 passes — investigate cycles')
    }
  }
}

async function main() {
  const pool = getPool()
  await repairThreadIds(pool)
  console.log('\n✅ thread_id repair complete')
}

module.exports = { repairThreadIds }

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('Fatal error:', err)
      process.exit(1)
    })
    .finally(() => closePool())
}
