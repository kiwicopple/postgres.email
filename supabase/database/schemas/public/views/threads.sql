-- Flat pass-through over public.messages.
--
-- Was a recursive CTE that walked `in_reply_to` chains at query time. Every
-- PostgREST request had to materialize the full thread tree across the entire
-- table before applying filters, which exhausted memory and tripped
-- statement_timeout in prod (sql_state 57014).
--
-- Threading is now materialized in `messages.thread_id` (set on write by the
-- BEFORE INSERT/UPDATE trigger in tables/messages.sql, repaired across loads
-- by scripts/backfill-thread-id.js). This view is kept as a thin alias so the
-- existing API surface and call sites in src/models/thread.ts and
-- supabase/functions/search/index.ts don't need to change.
CREATE VIEW public.threads WITH (security_invoker=on) AS
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
  FROM public.messages;

GRANT SELECT ON public.threads TO anon, authenticated, service_role;
