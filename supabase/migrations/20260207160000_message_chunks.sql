-- Create message_chunks table for storing chunked email text
-- Chunks are embedded and stored in Supabase Vector Buckets

create table message_chunks (
    id text primary key,                    -- {message_id}#chunk{index}
    message_id text references messages(id),
    mailbox_id text,
    chunk_index integer,
    chunk_text text,
    token_count integer,
    embedded_at timestamptz,                -- set after vector bucket upsert
    created_at timestamptz default now()
);

create index on message_chunks (message_id);
create index on message_chunks (mailbox_id);
create index on message_chunks (embedded_at) where embedded_at is null;

alter table message_chunks enable row level security;

create policy "Public read access" on message_chunks
  for select using (true);
