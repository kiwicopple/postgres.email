-- Performance improvements for postgres.email
--
-- 1. Composite partial index for the main list query
--    getListDetail() filters: mailbox_id = X, in_reply_to IS NULL, ORDER BY ts DESC
--    This single index covers the filter, the NULL check, and the sort.
--
-- 2. HNSW index on embedding column for approximate nearest neighbor search
--    Without this, vector search does a sequential scan over every row.
--
-- 3. Materialized view: thread_summaries
--    Pre-computes reply_count and last_activity per thread root.
--    Avoids expensive COUNT/MAX aggregations on every list page load.

-- =============================================================================
-- 1. Composite partial index for list view
-- =============================================================================
-- Covers: WHERE mailbox_id = $1 AND in_reply_to IS NULL ORDER BY ts DESC
-- The existing separate indexes on (mailbox_id) and (ts) cannot be combined
-- efficiently by the planner for this query pattern.

create index if not exists messages_mailbox_threads_idx
  on public.messages (mailbox_id, ts desc)
  where in_reply_to is null;

-- =============================================================================
-- 2. HNSW index for vector similarity search
-- =============================================================================
-- The search() function uses: embedding <#> query_embedding (negative inner product)
-- HNSW provides fast approximate nearest neighbor lookups.
-- m=16, ef_construction=64 are good defaults for ~100k-1M vectors.

create index if not exists messages_embedding_idx
  on public.messages
  using hnsw (embedding vector_ip_ops)
  with (m = 16, ef_construction = 64);

-- =============================================================================
-- 3. Materialized view: thread_summaries
-- =============================================================================
-- Pre-computes per-thread stats so the list page doesn't need to join/aggregate.
-- Refresh after each data ingestion run (parse step).

create materialized view if not exists thread_summaries as
select
  root.id as thread_id,
  root.mailbox_id,
  root.subject,
  root.from_email,
  root.from_addresses,
  root.ts as started_at,
  coalesce(stats.reply_count, 0) as reply_count,
  coalesce(stats.last_activity, root.ts) as last_activity
from
  messages root
left join lateral (
  select
    count(*) as reply_count,
    max(r.ts) as last_activity
  from threads t
  inner join messages r on r.id = t.id
  where t.thread_id = root.id
    and t.id != root.id
) stats on true
where
  root.in_reply_to is null;

-- Indexes on the materialized view for fast lookups
create unique index if not exists thread_summaries_pk
  on thread_summaries (thread_id);

create index if not exists thread_summaries_list_idx
  on thread_summaries (mailbox_id, last_activity desc);

-- =============================================================================
-- Helper function to refresh the materialized view
-- =============================================================================
create or replace function refresh_thread_summaries()
returns void
language sql
security definer
as $$
  refresh materialized view concurrently thread_summaries;
$$;
