import { describe, it, expect } from 'vitest'

/**
 * These functions mirror the exported logic in supabase/functions/search/index.ts.
 * The Edge Function runs in Deno, so we can't import it directly in Node/vitest.
 * Instead we test the same algorithms here to validate correctness.
 */

type VectorResult = {
  metadata?: Record<string, unknown>
  distance?: number
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
        matched_chunk: r.metadata?.chunk_index,
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>
}

// --- Test data ---

const vectorResults: VectorResult[] = [
  {
    distance: 0.95,
    metadata: {
      message_id: '<msg-1@example.org>',
      mailbox_id: 'pgsql-hackers',
      subject: 'WAL improvements',
      from_email: 'dev@example.org',
      chunk_index: 0,
      embedding_model: 'gte-small',
    },
  },
  {
    distance: 0.90,
    metadata: {
      message_id: '<msg-1@example.org>',
      mailbox_id: 'pgsql-hackers',
      subject: 'WAL improvements',
      from_email: 'dev@example.org',
      chunk_index: 1,
      embedding_model: 'gte-small',
    },
  },
  {
    distance: 0.85,
    metadata: {
      message_id: '<msg-2@example.org>',
      mailbox_id: 'pgsql-general',
      subject: 'Replication setup',
      from_email: 'admin@example.org',
      chunk_index: 0,
      embedding_model: 'gte-small',
    },
  },
  {
    distance: 0.80,
    metadata: {
      message_id: '<msg-3@example.org>',
      mailbox_id: 'pgsql-hackers',
      subject: 'Index scan optimization',
      from_email: 'perf@example.org',
      chunk_index: 2,
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
    expect(unique[0].metadata?.chunk_index).toBe(0)
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
      { distance: 0.9, metadata: { chunk_index: 0 } },
      { distance: 0.8, metadata: { message_id: '<msg@test>', chunk_index: 0 } },
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
