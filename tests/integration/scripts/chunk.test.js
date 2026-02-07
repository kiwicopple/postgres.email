import { describe, it, expect } from 'vitest'

const { chunkMessages } = require('../../../scripts/embed-vectors.js')

describe('chunkMessages', () => {
  it('chunks a message with enough body text', () => {
    const messages = [{
      id: '<test-001@example.org>',
      mailbox_id: 'pgsql-announce',
      subject: 'Test Subject',
      from_email: 'test@example.org',
      ts: '2026-01-01T00:00:00Z',
      body_text: 'The PostgreSQL Global Development Group announces the release of PostgreSQL 17.2, the latest version of the world\'s most advanced open source database. This release includes important security fixes and bug fixes. All users are encouraged to upgrade as soon as possible.',
    }]

    const chunks = chunkMessages(messages)
    expect(chunks.length).toBe(1)
    expect(chunks[0].id).toBe('<test-001@example.org>#chunk0')
    expect(chunks[0].message_id).toBe('<test-001@example.org>')
    expect(chunks[0].mailbox_id).toBe('pgsql-announce')
    expect(chunks[0].chunk_index).toBe(0)
    expect(chunks[0].chunk_text).toContain('PostgreSQL')
    expect(chunks[0].token_count).toBeGreaterThan(0)
  })

  it('skips messages with too-short body text', () => {
    const messages = [{
      id: '<short@example.org>',
      mailbox_id: 'pgsql-announce',
      subject: 'Short',
      from_email: 'test@example.org',
      ts: '2026-01-01T00:00:00Z',
      body_text: 'Thanks!',
    }]

    const chunks = chunkMessages(messages)
    expect(chunks.length).toBe(0)
  })

  it('creates multiple chunks for long messages', () => {
    const paragraphs = []
    for (let i = 0; i < 10; i++) {
      paragraphs.push(
        `Paragraph ${i + 1}: This is a detailed discussion about PostgreSQL internals ` +
        `that goes into significant detail about the query planner, executor, and storage ` +
        `engine. We need to consider how the optimizer chooses between sequential scans and ` +
        `index scans based on the statistics collected by ANALYZE.`
      )
    }

    const messages = [{
      id: '<long@example.org>',
      mailbox_id: 'pgsql-hackers',
      subject: 'Long Discussion',
      from_email: 'hacker@example.org',
      ts: '2026-01-01T00:00:00Z',
      body_text: paragraphs.join('\n\n'),
    }]

    const chunks = chunkMessages(messages)
    expect(chunks.length).toBeGreaterThan(1)

    // Verify chunk IDs are sequential
    chunks.forEach((chunk, i) => {
      expect(chunk.id).toBe(`<long@example.org>#chunk${i}`)
      expect(chunk.chunk_index).toBe(i)
      expect(chunk.message_id).toBe('<long@example.org>')
      expect(chunk.mailbox_id).toBe('pgsql-hackers')
    })
  })

  it('handles multiple messages', () => {
    const messages = [
      {
        id: '<msg-1@example.org>',
        mailbox_id: 'pgsql-general',
        subject: 'First',
        from_email: 'a@example.org',
        ts: '2026-01-01T00:00:00Z',
        body_text: 'First message body with enough content to be meaningful for embedding and search purposes. We discuss PostgreSQL replication and how to configure it properly for production use. Streaming replication allows a standby server to stay up-to-date by reading WAL records from the primary. This is essential for high availability setups.',
      },
      {
        id: '<msg-2@example.org>',
        mailbox_id: 'pgsql-general',
        subject: 'Second',
        from_email: 'b@example.org',
        ts: '2026-01-02T00:00:00Z',
        body_text: 'Second message body also with enough content. PostgreSQL performance tuning is an important topic, covering index selection, query planning, and configuration parameters like shared_buffers, work_mem, and effective_cache_size. Proper tuning can yield dramatic improvements.',
      },
    ]

    const chunks = chunkMessages(messages)
    expect(chunks.length).toBe(2)

    const msg1Chunks = chunks.filter(c => c.message_id === '<msg-1@example.org>')
    const msg2Chunks = chunks.filter(c => c.message_id === '<msg-2@example.org>')
    expect(msg1Chunks.length).toBe(1)
    expect(msg2Chunks.length).toBe(1)
  })

  it('strips quoted replies from chunked text', () => {
    const messages = [{
      id: '<reply@example.org>',
      mailbox_id: 'pgsql-hackers',
      subject: 'Re: Discussion',
      from_email: 'replier@example.org',
      ts: '2026-01-01T00:00:00Z',
      body_text: '> Original long message that was quoted in the reply\n> with multiple lines of quoted content\nMy reply to this discussion is that we should consider the implications of the proposed change to the WAL format carefully. There are backward compatibility concerns that need to be addressed before we can proceed with this change. The on-disk format affects every installation and we need a solid migration path for upgrades from older versions.',
    }]

    const chunks = chunkMessages(messages)
    expect(chunks.length).toBeGreaterThanOrEqual(1)
    chunks.forEach(c => {
      expect(c.chunk_text).not.toContain('Original long message')
    })
  })

  it('returns empty array for empty input', () => {
    expect(chunkMessages([])).toEqual([])
  })
})
