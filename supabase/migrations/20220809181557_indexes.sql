ALTER TABLE imap.raw_imap_messages ADD PRIMARY KEY (message_id);
ALTER TABLE imap.raw_imap_mailboxes ADD PRIMARY KEY (name);

ALTER TABLE public.messages ADD PRIMARY KEY (id);

create index on public.messages (in_reply_to);
create index on public.messages (ts);
