-- Track which messages have been embedded into the vector bucket.
-- Set by embed-vectors.js after successful upsert to vector bucket.
-- Pipeline queries: WHERE embedded_at IS NULL AND body_text IS NOT NULL

alter table messages add column embedded_at timestamptz;

create index on messages (embedded_at) where embedded_at is null;
