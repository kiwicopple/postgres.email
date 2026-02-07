import { describe, it, expect, vi } from 'vitest'

const {
  createBucketIfNotExists,
  createIndexIfNotExists,
  setup,
  BUCKET_NAME,
  INDEX_NAME,
  DIMENSION,
  DISTANCE_METRIC,
} = require('../../../scripts/setup-vector-bucket.js')

describe('setup-vector-bucket constants', () => {
  it('has correct bucket name', () => {
    expect(BUCKET_NAME).toBe('email-embeddings')
  })

  it('has correct index name', () => {
    expect(INDEX_NAME).toBe('email-chunks')
  })

  it('uses 384 dimensions for gte-small', () => {
    expect(DIMENSION).toBe(384)
  })

  it('uses cosine distance metric', () => {
    expect(DISTANCE_METRIC).toBe('cosine')
  })
})

describe('createBucketIfNotExists', () => {
  it('creates bucket successfully', async () => {
    const supabase = {
      storage: { vectors: { createBucket: vi.fn().mockResolvedValue({ error: null }) } },
    }

    await createBucketIfNotExists(supabase, 'test-bucket')
    expect(supabase.storage.vectors.createBucket).toHaveBeenCalledWith('test-bucket')
  })

  it('ignores "already exists" error', async () => {
    const supabase = {
      storage: {
        vectors: {
          createBucket: vi.fn().mockResolvedValue({
            error: { message: 'Bucket already exists' },
          }),
        },
      },
    }

    await expect(createBucketIfNotExists(supabase, 'test-bucket')).resolves.toBeUndefined()
  })

  it('throws on other errors', async () => {
    const supabase = {
      storage: {
        vectors: {
          createBucket: vi.fn().mockResolvedValue({
            error: { message: 'Permission denied' },
          }),
        },
      },
    }

    await expect(createBucketIfNotExists(supabase, 'test-bucket'))
      .rejects.toThrow('Failed to create bucket "test-bucket": Permission denied')
  })
})

describe('createIndexIfNotExists', () => {
  it('creates index with correct config', async () => {
    const createIndex = vi.fn().mockResolvedValue({ error: null })
    const supabase = {
      storage: { vectors: { from: vi.fn().mockReturnValue({ createIndex }) } },
    }
    const config = { indexName: 'test-index', dimension: 384, distanceMetric: 'cosine' }

    await createIndexIfNotExists(supabase, 'test-bucket', config)
    expect(supabase.storage.vectors.from).toHaveBeenCalledWith('test-bucket')
    expect(createIndex).toHaveBeenCalledWith(config)
  })

  it('ignores "already exists" error', async () => {
    const createIndex = vi.fn().mockResolvedValue({
      error: { message: 'Index already exists' },
    })
    const supabase = {
      storage: { vectors: { from: vi.fn().mockReturnValue({ createIndex }) } },
    }

    await expect(
      createIndexIfNotExists(supabase, 'test-bucket', { indexName: 'x', dimension: 384, distanceMetric: 'cosine' })
    ).resolves.toBeUndefined()
  })

  it('throws on other errors', async () => {
    const createIndex = vi.fn().mockResolvedValue({
      error: { message: 'Invalid dimension' },
    })
    const supabase = {
      storage: { vectors: { from: vi.fn().mockReturnValue({ createIndex }) } },
    }

    await expect(
      createIndexIfNotExists(supabase, 'test-bucket', { indexName: 'bad-index', dimension: 0, distanceMetric: 'cosine' })
    ).rejects.toThrow('Failed to create index "bad-index": Invalid dimension')
  })
})

describe('setup', () => {
  it('creates bucket then index in order', async () => {
    const callOrder = []
    const createIndex = vi.fn().mockImplementation(() => {
      callOrder.push('createIndex')
      return Promise.resolve({ error: null })
    })
    const supabase = {
      storage: {
        vectors: {
          createBucket: vi.fn().mockImplementation(() => {
            callOrder.push('createBucket')
            return Promise.resolve({ error: null })
          }),
          from: vi.fn().mockReturnValue({ createIndex }),
        },
      },
    }

    await setup(supabase)

    expect(callOrder).toEqual(['createBucket', 'createIndex'])
    expect(supabase.storage.vectors.createBucket).toHaveBeenCalledWith('email-embeddings')
    expect(supabase.storage.vectors.from).toHaveBeenCalledWith('email-embeddings')
    expect(createIndex).toHaveBeenCalledWith({
      indexName: 'email-chunks',
      dimension: 384,
      distanceMetric: 'cosine',
    })
  })
})
