
CREATE EXTENSION postgres_fdw;

-- drop user mapping FOR postgres server steampipe;
-- drop server steampipe;

CREATE SERVER steampipe
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host 'docker.for.mac.host.internal', dbname 'steampipe', port '9193');

CREATE USER MAPPING FOR postgres
    SERVER steampipe
    OPTIONS (user 'steampipe', password '7886-4ca3-8018'); -- run "steampipe service status" to get the password

create schema if not exists imap;

IMPORT FOREIGN SCHEMA imap
    FROM SERVER steampipe INTO imap;

create schema protected;

create table mailboxes (
  id text primary key,
  message_count integer
);

insert into mailboxes (id, message_count)
    select name, messages
    from imap.imap_mailbox
    where name in (
        'pgsql-hackers'
    );

create table messages (
    id text primary key,
    external_id uuid default gen_random_uuid(),
    mailbox_id text references mailboxes(id),
    in_reply_to jsonb,
    ts timestamptz,
    subject text,
    to_addresses jsonb,
    cc_addresses jsonb,
    bcc_addresses jsonb,
    from_addresses jsonb,
    imap_seq_num integer,
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
        to_addresses,
        cc_addresses,
        bcc_addresses,
        from_addresses,
        imap_seq_num,
        size,
        attachments,
        body_text,
        embedded_files,
        headers
    )
    select 
        message_id, 
        mailbox, 
        in_reply_to,
        timestamp,
        subject,
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
        imap.imap_message
    where mailbox in (
        'pgsql-hackers'
    );
