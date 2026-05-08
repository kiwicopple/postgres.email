require('dotenv').config()

const { getSupabase } = require('./lib/db')

const DEFAULT_QUERY = 'postgres extension release'
const DEFAULT_LIMIT = 5

function parseArgs(args = process.argv.slice(2)) {
  const options = { query: DEFAULT_QUERY, limit: DEFAULT_LIMIT, mailboxId: null }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--query' && args[i + 1]) options.query = args[++i]
    else if (a === '--limit' && args[i + 1]) options.limit = parseInt(args[++i], 10)
    else if (a === '--mailbox' && args[i + 1]) options.mailboxId = args[++i]
  }
  return options
}

async function embedQuery(text) {
  const { pipeline } = await import('@xenova/transformers')
  const extractor = await pipeline('feature-extraction', 'Supabase/gte-small')
  const out = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(out.data)
}

async function directBucketQuery(supabase, queryVector, { limit, mailboxId }) {
  const idx = supabase.storage.vectors.from('email-embeddings').index('email-chunks')
  const opts = {
    queryVector: { float32: queryVector },
    topK: limit,
    returnMetadata: true,
    returnDistance: true,
  }
  if (mailboxId) opts.filter = { mailbox_id: mailboxId }
  const { data, error } = await idx.queryVectors(opts)
  if (error) throw new Error(`queryVectors failed: ${error.message}`)
  return data?.vectors ?? []
}

async function invokeDeployedFunction(url, key, body) {
  const res = await fetch(`${url}/functions/v1/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { /* not json */ }
  return { status: res.status, body: json ?? text }
}

async function main() {
  const { query, limit, mailboxId } = parseArgs()
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set')

  console.log(`\n[smoke-search] target: ${url}`)
  console.log(`[smoke-search] query:  "${query}" (limit=${limit}${mailboxId ? `, mailbox=${mailboxId}` : ''})\n`)

  console.log('--- 1. Local embed (gte-small via @xenova/transformers) ---')
  const queryVector = await embedQuery(query)
  console.log(`vector length: ${queryVector.length}`)
  console.log(`first 5: ${queryVector.slice(0, 5).map((n) => n.toFixed(4)).join(', ')}\n`)

  console.log('--- 2. Direct bucket query (bypasses edge function) ---')
  const supabase = getSupabase()
  const direct = await directBucketQuery(supabase, queryVector, { limit, mailboxId })
  console.log(`returned: ${direct.length}`)
  for (const v of direct.slice(0, 5)) {
    console.log(`  ${(v.distance ?? 0).toFixed(4)}  ${v.key}  ${v.metadata?.subject ?? ''}`)
  }
  console.log('')

  console.log('--- 3. Deployed edge function invoke ---')
  const fnRes = await invokeDeployedFunction(url, key, { query, limit, mailbox_id: mailboxId })
  console.log(`HTTP ${fnRes.status}`)
  if (Array.isArray(fnRes.body)) {
    console.log(`returned: ${fnRes.body.length}`)
    for (const r of fnRes.body.slice(0, 5)) {
      console.log(`  ${(r.score ?? 0).toFixed(4)}  chunk=${r.matched_chunk}  ${r.subject ?? ''}`)
    }
  } else {
    console.log(JSON.stringify(fnRes.body, null, 2))
  }

  console.log('\n--- summary ---')
  console.log(`bucket-direct: ${direct.length}, edge-function: ${Array.isArray(fnRes.body) ? fnRes.body.length : 'non-array'}`)
  if (direct.length > 0 && Array.isArray(fnRes.body) && fnRes.body.length === 0) {
    console.log('MISMATCH: bucket has matches but the edge function returned 0. Likely causes:')
    console.log('  - Edge function uses Supabase.ai.Session("gte-small") which may produce a different vector')
    console.log('  - The Postgres "messages" lookup returned 0 (RLS or wrong key)')
    console.log('  - A different filter is being applied')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
