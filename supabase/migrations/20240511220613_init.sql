create extension vector with schema extensions;

create table mailboxes (
    id text primary key, 
    message_count integer
);

alter table mailboxes enable row level security;

create table messages (
    id text primary key,
    mailbox_id text references mailboxes(id),
    in_reply_to text,
    ts timestamptz,
    subject text,
    from_email text,
    to_addresses jsonb,
    cc_addresses jsonb,
    bcc_addresses jsonb,
    from_addresses jsonb,
    seq_num integer,
    size bigint,
    attachments jsonb,
    body_text text,
    embedded_files jsonb,
    headers jsonb,
    embedding vector(1536)
);

alter table messages enable row level security;

create index on public.messages (in_reply_to);
create index on public.messages (ts);