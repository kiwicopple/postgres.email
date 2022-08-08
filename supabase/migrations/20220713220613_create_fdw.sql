CREATE EXTENSION postgres_fdw;

-- drop user mapping FOR postgres server steampipe;
-- drop server steampipe;
CREATE SERVER steampipe FOREIGN DATA WRAPPER postgres_fdw OPTIONS (
    host 'docker.for.mac.host.internal',
    dbname 'steampipe',
    port '9193'
);

CREATE USER MAPPING FOR postgres SERVER steampipe OPTIONS (user 'steampipe', password '7886-4ca3-8018');

-- run "steampipe service status" to get the password
create schema if not exists imap;

IMPORT FOREIGN SCHEMA imap
FROM SERVER steampipe INTO imap;

-- RAW DATA (should move this to private schema)

create table raw_imap_mailboxes as 
select *
from imap.imap_mailbox
where name in ( 'pgsql-hackers' );

create table raw_imap_messages as 
select *
from imap.imap_message
where mailbox in ( 'pgsql-hackers' );


-- FORMAT

create table mailboxes (
    id text primary key, 
    message_count integer
);

insert into
    mailboxes (id, message_count)
select
    name,
    messages
from
    raw_imap_mailboxes
where
    name in ('pgsql-hackers');


create table messages (
    id text UNIQUE,
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
    headers jsonb
);

insert into messages (
    id,
    mailbox_id,
    in_reply_to,
    ts,
    subject,
    from_email,
    to_addresses,
    cc_addresses,
    bcc_addresses,
    from_addresses,
    seq_num,
    size,
    attachments,
    body_text,
    embedded_files,
    headers
)
select
    message_id,
    mailbox,
    (in_reply_to :: jsonb ->> 0)::text,
    timestamp,
    subject,
    from_email,
    to_addresses,
    cc_addresses,
    bcc_addresses,
    from_addresses,
    seq_num,
    size,
    attachments,
    body_text,
    embedded_files,
    headers
from
    raw_imap_messages
where
    mailbox in ('pgsql-hackers')
order by 
    raw_imap_messages.seq_num asc;

create index on messages (in_reply_to);
create index on messages (ts);


create recursive view threads (
    id,
    thread_id,
    mailbox_id,
    in_reply_to,
    ts,
    subject,
    from_email,
    to_addresses,
    cc_addresses,
    bcc_addresses,
    from_addresses,
    seq_num,
    size,
    attachments,
    body_text,
    embedded_files,
    headers
) as 
  select 
    messages.id,
    messages.id, -- the first message is the start of the thread
    messages.mailbox_id,
    messages.in_reply_to,
    messages.ts,
    messages.subject,
    messages.from_email,
    messages.to_addresses,
    messages.cc_addresses,
    messages.bcc_addresses,
    messages.from_addresses,
    messages.seq_num,
    messages.size,
    messages.attachments,
    messages.body_text,
    messages.embedded_files,
    messages.headers
  from 
    messages messages
  where 
    in_reply_to is null

  union

  select 
    replies.id,
    threads.thread_id,
    replies.mailbox_id,
    replies.in_reply_to,
    replies.ts,
    replies.subject,
    replies.from_email,
    replies.to_addresses,
    replies.cc_addresses,
    replies.bcc_addresses,
    replies.from_addresses,
    replies.seq_num,
    replies.size,
    replies.attachments,
    replies.body_text,
    replies.embedded_files,
    replies.headers
  from 
    messages replies
  inner join
    threads on threads.id = replies.in_reply_to;

