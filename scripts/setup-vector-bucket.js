require('dotenv').config()

const { getSupabase } = require('./lib/db')

const BUCKET_NAME = 'email-embeddings'
const INDEX_NAME = 'email-chunks'
const DIMENSION = 384
const DISTANCE_METRIC = 'cosine'

/**
 * Create the vector bucket if it doesn't exist
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} bucketName
 */
async function createBucketIfNotExists(supabase, bucketName) {
  const { error } = await supabase.storage.vectors.createBucket(bucketName)
  if (error && !error.message.includes('already exists')) {
    throw new Error(`Failed to create bucket "${bucketName}": ${error.message}`)
  }
}

/**
 * Create the vector index if it doesn't exist
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} bucketName
 * @param {Object} indexConfig
 * @param {string} indexConfig.indexName
 * @param {number} indexConfig.dimension
 * @param {string} indexConfig.distanceMetric
 */
async function createIndexIfNotExists(supabase, bucketName, indexConfig) {
  const bucket = supabase.storage.vectors.from(bucketName)
  const { error } = await bucket.createIndex(indexConfig)
  if (error && !error.message.includes('already exists')) {
    throw new Error(`Failed to create index "${indexConfig.indexName}": ${error.message}`)
  }
}

/**
 * Set up the vector bucket and index for email embeddings
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function setup(supabase) {
  await createBucketIfNotExists(supabase, BUCKET_NAME)
  await createIndexIfNotExists(supabase, BUCKET_NAME, {
    indexName: INDEX_NAME,
    dimension: DIMENSION,
    distanceMetric: DISTANCE_METRIC,
  })
}

async function main() {
  const supabase = getSupabase()

  console.log(`\nSetting up vector bucket...`)
  console.log(`  Bucket: ${BUCKET_NAME}`)
  console.log(`  Index:  ${INDEX_NAME}`)
  console.log(`  Dims:   ${DIMENSION}`)
  console.log(`  Metric: ${DISTANCE_METRIC}`)

  await setup(supabase)

  console.log(`\nVector bucket and index ready.`)
}

// Export for testing
module.exports = {
  createBucketIfNotExists,
  createIndexIfNotExists,
  setup,
  BUCKET_NAME,
  INDEX_NAME,
  DIMENSION,
  DISTANCE_METRIC,
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}
