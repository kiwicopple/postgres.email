-- This migration is safe to copy/paste for future migrations

create or replace function search (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns setof messages
language sql
as $$
  select *
  from messages
  where messages.embedding <#> query_embedding < -match_threshold
  order by messages.embedding <#> query_embedding asc
  limit least(match_count, 200);
$$;
