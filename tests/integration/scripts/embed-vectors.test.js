import { describe, it, expect } from 'vitest'

const { buildVectors, EMBEDDING_MODEL } = require('../../../scripts/embed-vectors.js')

describe('buildVectors', () => {
  const sampleChunks = [
    {
      id: '<msg-001@example.org>#chunk0',
      message_id: '<msg-001@example.org>',
      mailbox_id: 'pgsql-hackers',
      chunk_index: 0,
      chunk_text: 'Some chunk text about PostgreSQL',
      subject: 'PostgreSQL Discussion',
      from_email: 'dev@example.org',
      ts: '2026-01-15T10:30:00Z',
    },
    {
      id: '<msg-001@example.org>#chunk1',
      message_id: '<msg-001@example.org>',
      mailbox_id: 'pgsql-hackers',
      chunk_index: 1,
      chunk_text: 'Another chunk about query planning',
      subject: 'PostgreSQL Discussion',
      from_email: 'dev@example.org',
      ts: '2026-01-15T10:30:00Z',
    },
  ]

  // Mock 384-dim embeddings (gte-small)
  const sampleEmbeddings = [
    new Float32Array(384).fill(0.1),
    new Float32Array(384).fill(0.2),
  ]

  it('builds vector objects with correct structure', () => {
    const vectors = buildVectors(sampleChunks, sampleEmbeddings)

    expect(vectors.length).toBe(2)

    expect(vectors[0].key).toBe('<msg-001@example.org>#chunk0')
    expect(vectors[0].data.float32).toHaveLength(384)
    expect(vectors[0].metadata.message_id).toBe('<msg-001@example.org>')
    expect(vectors[0].metadata.mailbox_id).toBe('pgsql-hackers')
    expect(vectors[0].metadata.subject).toBe('PostgreSQL Discussion')
    expect(vectors[0].metadata.from_email).toBe('dev@example.org')
    expect(vectors[0].metadata.chunk_index).toBe(0)
    expect(vectors[0].metadata.embedding_model).toBe('gte-small')
  })

  it('includes embedding_model in metadata', () => {
    const vectors = buildVectors(sampleChunks, sampleEmbeddings)
    vectors.forEach(v => {
      expect(v.metadata.embedding_model).toBe(EMBEDDING_MODEL)
    })
  })

  it('converts Float32Array to regular array', () => {
    const vectors = buildVectors(sampleChunks, sampleEmbeddings)
    expect(Array.isArray(vectors[0].data.float32)).toBe(true)
  })

  it('handles missing optional fields gracefully', () => {
    const chunks = [{
      id: '<no-meta@example.org>#chunk0',
      message_id: '<no-meta@example.org>',
      mailbox_id: 'pgsql-general',
      chunk_index: 0,
      chunk_text: 'Text without metadata',
      subject: null,
      from_email: null,
      ts: null,
    }]
    const embeddings = [new Float32Array(384).fill(0.5)]

    const vectors = buildVectors(chunks, embeddings)
    expect(vectors[0].metadata.subject).toBe('')
    expect(vectors[0].metadata.from_email).toBe('')
    expect(vectors[0].metadata.ts).toBe('')
  })

  it('formats timestamp as ISO string', () => {
    const vectors = buildVectors(sampleChunks, sampleEmbeddings)
    expect(vectors[0].metadata.ts).toBe('2026-01-15T10:30:00.000Z')
  })

  it('returns empty array for empty input', () => {
    expect(buildVectors([], [])).toEqual([])
  })
})
