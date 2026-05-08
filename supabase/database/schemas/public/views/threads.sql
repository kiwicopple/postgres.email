CREATE VIEW public.threads WITH (security_invoker=on) AS WITH RECURSIVE threads(id, thread_id, mailbox_id, in_reply_to, ts, subject, from_email, to_addresses, cc_addresses, bcc_addresses, from_addresses, seq_num, size, attachments, body_text, embedded_files, headers) AS (
         SELECT messages.id,
            messages.id,
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
           FROM public.messages messages
          WHERE (messages.in_reply_to IS NULL)
        UNION
         SELECT replies.id,
            threads_1.thread_id,
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
           FROM (public.messages replies
             JOIN threads threads_1 ON ((threads_1.id = replies.in_reply_to)))
        )
 SELECT id,
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
   FROM threads;

-- Read-only API surface; see messages.sql for context.
GRANT SELECT ON public.threads TO anon, authenticated, service_role;