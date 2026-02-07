-- Create pipeline schema for ingestion/processing infrastructure
-- Not exposed via PostgREST — only accessed by scripts via direct pg connection

create schema if not exists pipeline;

create table pipeline.message_chunks (
    id text primary key,                    -- {message_id}#chunk{index}
    message_id text references public.messages(id),
    mailbox_id text,
    chunk_index integer,
    chunk_text text,
    token_count integer,
    embedded_at timestamptz,                -- set after vector bucket upsert
    created_at timestamptz default now()
);

create index on pipeline.message_chunks (message_id);
create index on pipeline.message_chunks (mailbox_id);
create index on pipeline.message_chunks (embedded_at) where embedded_at is null;
