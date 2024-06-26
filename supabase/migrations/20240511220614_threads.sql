-- This migration is safe to copy/paste for future migrations

create or replace recursive view threads (
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
)
with (security_invoker=on)
as 
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

