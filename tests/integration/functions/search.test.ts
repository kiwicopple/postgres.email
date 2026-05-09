import { describe, it, expect } from 'vitest'

/**
 * These functions mirror the exported logic in supabase/functions/search/index.ts.
 * The Edge Function runs in Deno, so we can't import it directly in Node/vitest.
 * Instead we test the same algorithms here to validate correctness.
 */

type VectorResult = {
  key?: string
  metadata?: Record<string, unknown>
  distance?: number
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const MAX_QUERY_LENGTH = 2000

type SearchPayload = {
  query: string
  mailbox_id?: string
  limit: number
}

function parseSearchPayload(raw: unknown): SearchPayload | { error: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Request body must be a JSON object' }
  }

  const body = raw as Record<string, unknown>
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  if (!query) {
    return { error: 'Query parameter is required and must be a non-empty string' }
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return { error: `Query is too long (max ${MAX_QUERY_LENGTH} chars)` }
  }

  let limit = DEFAULT_LIMIT
  if (body.limit !== undefined) {
    if (typeof body.limit !== 'number' || !Number.isFinite(body.limit)) {
      return { error: 'limit must be a number' }
    }
    limit = Math.trunc(body.limit)
  }
  if (limit < 1 || limit > MAX_LIMIT) {
    return { error: `limit must be between 1 and ${MAX_LIMIT}` }
  }

  let mailboxID: string | undefined
  if (body.mailbox_id !== undefined) {
    if (typeof body.mailbox_id !== 'string' || body.mailbox_id.trim() === '') {
      return { error: 'mailbox_id must be a non-empty string when provided' }
    }
    mailboxID = body.mailbox_id.trim()
  }

  return { query, mailbox_id: mailboxID, limit }
}

function chunkIndexFromKey(key: unknown): number | undefined {
  if (typeof key !== 'string') return undefined
  const m = key.match(/#chunk(\d+)$/)
  return m ? Number(m[1]) : undefined
}

function deduplicateResults(vectorResults: VectorResult[]): VectorResult[] {
  const seen = new Set<string>()
  const unique: VectorResult[] = []

  for (const result of vectorResults) {
    const msgId = result.metadata?.message_id as string | undefined
    if (msgId && !seen.has(msgId)) {
      seen.add(msgId)
      unique.push(result)
    }
  }

  return unique
}

function rankResults(
  uniqueResults: VectorResult[],
  messages: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const messageMap = new Map(messages.map((m) => [m.id, m]))

  return uniqueResults
    .map((r) => {
      const msg = messageMap.get(r.metadata?.message_id as string)
      if (!msg) return null
      return {
        ...msg,
        score: r.distance,
        matched_chunk: chunkIndexFromKey(r.key),
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>
}

function deduplicateByThread(
  ranked: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const seen = new Set<string>()
  const unique: Array<Record<string, unknown>> = []

  for (const row of ranked) {
    const threadId = row.thread_id as string | null | undefined
    const key = threadId ?? (row.id as string | undefined)
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(row)
  }

  return unique
}

// --- Test data ---

const vectorResults: VectorResult[] = [
  {
    key: '<msg-1@example.org>#chunk0',
    distance: 0.95,
    metadata: {
      message_id: '<msg-1@example.org>',
      mailbox_id: 'pgsql-hackers',
      subject: 'WAL improvements',
      from_email: 'dev@example.org',
      embedding_model: 'gte-small',
    },
  },
  {
    key: '<msg-1@example.org>#chunk1',
    distance: 0.90,
    metadata: {
      message_id: '<msg-1@example.org>',
      mailbox_id: 'pgsql-hackers',
      subject: 'WAL improvements',
      from_email: 'dev@example.org',
      embedding_model: 'gte-small',
    },
  },
  {
    key: '<msg-2@example.org>#chunk0',
    distance: 0.85,
    metadata: {
      message_id: '<msg-2@example.org>',
      mailbox_id: 'pgsql-general',
      subject: 'Replication setup',
      from_email: 'admin@example.org',
      embedding_model: 'gte-small',
    },
  },
  {
    key: '<msg-3@example.org>#chunk2',
    distance: 0.80,
    metadata: {
      message_id: '<msg-3@example.org>',
      mailbox_id: 'pgsql-hackers',
      subject: 'Index scan optimization',
      from_email: 'perf@example.org',
      embedding_model: 'gte-small',
    },
  },
]

const messages = [
  {
    id: '<msg-1@example.org>',
    mailbox_id: 'pgsql-hackers',
    subject: 'WAL improvements',
    from_email: 'dev@example.org',
    ts: '2026-01-15T10:00:00Z',
    body_text: 'Full body of message 1...',
  },
  {
    id: '<msg-2@example.org>',
    mailbox_id: 'pgsql-general',
    subject: 'Replication setup',
    from_email: 'admin@example.org',
    ts: '2026-01-14T09:00:00Z',
    body_text: 'Full body of message 2...',
  },
  {
    id: '<msg-3@example.org>',
    mailbox_id: 'pgsql-hackers',
    subject: 'Index scan optimization',
    from_email: 'perf@example.org',
    ts: '2026-01-13T08:00:00Z',
    body_text: 'Full body of message 3...',
  },
]

// --- Tests ---

describe('deduplicateResults', () => {
  it('removes duplicate chunks from the same message', () => {
    const unique = deduplicateResults(vectorResults)
    expect(unique).toHaveLength(3)
    expect(unique.map((r) => r.metadata?.message_id)).toEqual([
      '<msg-1@example.org>',
      '<msg-2@example.org>',
      '<msg-3@example.org>',
    ])
  })

  it('keeps the first (highest-scoring) chunk per message', () => {
    const unique = deduplicateResults(vectorResults)
    // msg-1 has chunks at distance 0.95 and 0.90 — keep 0.95
    expect(unique[0].distance).toBe(0.95)
    expect(unique[0].key).toBe('<msg-1@example.org>#chunk0')
  })

  it('handles empty input', () => {
    expect(deduplicateResults([])).toEqual([])
  })

  it('handles results without metadata', () => {
    const results = [
      { distance: 0.9 },
      { distance: 0.8, metadata: { message_id: '<msg@test>' } },
    ]
    const unique = deduplicateResults(results)
    // The one without metadata is skipped, only the one with message_id is kept
    expect(unique).toHaveLength(1)
    expect(unique[0].metadata?.message_id).toBe('<msg@test>')
  })

  it('handles results with missing message_id in metadata', () => {
    const results = [
      { distance: 0.9, metadata: {} },
      { distance: 0.8, metadata: { message_id: '<msg@test>' } },
    ]
    const unique = deduplicateResults(results)
    expect(unique).toHaveLength(1)
  })

  it('preserves original order', () => {
    const results = [
      { distance: 0.7, metadata: { message_id: '<c@test>' } },
      { distance: 0.9, metadata: { message_id: '<a@test>' } },
      { distance: 0.8, metadata: { message_id: '<b@test>' } },
    ]
    const unique = deduplicateResults(results)
    expect(unique.map((r) => r.metadata?.message_id)).toEqual([
      '<c@test>',
      '<a@test>',
      '<b@test>',
    ])
  })
})

describe('rankResults', () => {
  const unique = deduplicateResults(vectorResults)

  it('merges vector scores with message data', () => {
    const ranked = rankResults(unique, messages)
    expect(ranked).toHaveLength(3)
    expect(ranked[0].id).toBe('<msg-1@example.org>')
    expect(ranked[0].score).toBe(0.95)
    expect(ranked[0].subject).toBe('WAL improvements')
    expect(ranked[0].body_text).toBe('Full body of message 1...')
  })

  it('preserves vector ranking order, not message order', () => {
    const ranked = rankResults(unique, messages)
    expect(ranked.map((r) => r.id)).toEqual([
      '<msg-1@example.org>',
      '<msg-2@example.org>',
      '<msg-3@example.org>',
    ])
  })

  it('includes matched_chunk in results', () => {
    const ranked = rankResults(unique, messages)
    expect(ranked[0].matched_chunk).toBe(0)
    expect(ranked[2].matched_chunk).toBe(2)
  })

  it('drops results where message was not found in DB', () => {
    const partialMessages = [messages[0]] // only msg-1
    const ranked = rankResults(unique, partialMessages)
    expect(ranked).toHaveLength(1)
    expect(ranked[0].id).toBe('<msg-1@example.org>')
  })

  it('handles empty vector results', () => {
    expect(rankResults([], messages)).toEqual([])
  })

  it('handles empty messages', () => {
    expect(rankResults(unique, [])).toEqual([])
  })
})

describe('deduplicateByThread', () => {
  it('collapses multiple hits from the same thread to the first (best-scoring)', () => {
    const ranked = [
      { id: '<a@x>', thread_id: '<root@x>', score: 0.95 },
      { id: '<b@x>', thread_id: '<root@x>', score: 0.80 },
      { id: '<c@x>', thread_id: '<other@x>', score: 0.70 },
    ]
    const collapsed = deduplicateByThread(ranked)
    expect(collapsed).toHaveLength(2)
    expect(collapsed[0].id).toBe('<a@x>')
    expect(collapsed[1].id).toBe('<c@x>')
  })

  it('preserves rank order across distinct threads', () => {
    const ranked = [
      { id: '<a@x>', thread_id: '<t1@x>' },
      { id: '<b@x>', thread_id: '<t2@x>' },
      { id: '<c@x>', thread_id: '<t3@x>' },
    ]
    expect(deduplicateByThread(ranked).map((r) => r.id)).toEqual([
      '<a@x>',
      '<b@x>',
      '<c@x>',
    ])
  })

  it('falls back to id when thread_id is missing', () => {
    const ranked = [
      { id: '<a@x>', thread_id: null },
      { id: '<a@x>', thread_id: null },
      { id: '<b@x>' },
    ]
    expect(deduplicateByThread(ranked).map((r) => r.id)).toEqual(['<a@x>', '<b@x>'])
  })

  it('drops rows without id or thread_id', () => {
    const ranked = [{ score: 0.9 }, { id: '<a@x>', thread_id: '<t@x>' }]
    expect(deduplicateByThread(ranked)).toHaveLength(1)
  })

  it('handles empty input', () => {
    expect(deduplicateByThread([])).toEqual([])
  })
})

describe('parseSearchPayload', () => {
  it('accepts valid payload and trims query/mailbox', () => {
    const parsed = parseSearchPayload({
      query: '  wal replay  ',
      mailbox_id: '  pgsql-hackers  ',
      limit: 10,
    })
    expect(parsed).toEqual({
      query: 'wal replay',
      mailbox_id: 'pgsql-hackers',
      limit: 10,
    })
  })

  it('applies default limit when missing', () => {
    const parsed = parseSearchPayload({ query: 'replication' })
    expect(parsed).toEqual({
      query: 'replication',
      limit: 20,
    })
  })

  it('rejects invalid limit values', () => {
    expect(parseSearchPayload({ query: 'x', limit: 0 })).toEqual({
      error: 'limit must be between 1 and 50',
    })
    expect(parseSearchPayload({ query: 'x', limit: 51 })).toEqual({
      error: 'limit must be between 1 and 50',
    })
    expect(parseSearchPayload({ query: 'x', limit: '10' })).toEqual({
      error: 'limit must be a number',
    })
  })

  it('rejects empty query and oversized query', () => {
    expect(parseSearchPayload({ query: '   ' })).toEqual({
      error: 'Query parameter is required and must be a non-empty string',
    })
    expect(parseSearchPayload({ query: 'x'.repeat(2001) })).toEqual({
      error: 'Query is too long (max 2000 chars)',
    })
  })

  it('rejects invalid mailbox_id', () => {
    expect(parseSearchPayload({ query: 'x', mailbox_id: '' })).toEqual({
      error: 'mailbox_id must be a non-empty string when provided',
    })
    expect(parseSearchPayload({ query: 'x', mailbox_id: 42 })).toEqual({
      error: 'mailbox_id must be a non-empty string when provided',
    })
  })
})
