CREATE TABLE public.messages (
  id             text                     NOT NULL,
  mailbox_id     text,
  in_reply_to    text,
  thread_id      text,
  ts             timestamp with time zone,
  subject        text,
  from_email     text,
  to_addresses   jsonb,
  cc_addresses   jsonb,
  bcc_addresses  jsonb,
  from_addresses jsonb,
  seq_num        integer,
  size           bigint,
  attachments    jsonb,
  body_text      text,
  embedded_files jsonb,
  headers        jsonb,
  embedded_at    timestamp with time zone
);

CREATE INDEX messages_mailbox_id_idx ON public.messages (mailbox_id);

CREATE INDEX messages_in_reply_to_idx ON public.messages (in_reply_to);

CREATE INDEX idx_messages_mailbox_ts ON public.messages (mailbox_id, ts DESC);

CREATE INDEX idx_messages_mailbox_root_threads ON public.messages (mailbox_id, ts DESC)
  WHERE in_reply_to IS NULL;

CREATE INDEX messages_embedded_at_idx ON public.messages (embedded_at)
  WHERE embedded_at IS NULL;

CREATE INDEX messages_ts_idx ON public.messages (ts);

-- Backs `WHERE thread_id = ? ORDER BY ts` (thread page) and the search
-- function's id-batch lookup. Replaces the recursive-CTE walk the old
-- `threads` view did at query time.
CREATE INDEX messages_thread_id_ts_idx ON public.messages (thread_id, ts);

-- Materialize the root message id of each thread on write.
-- Root (in_reply_to IS NULL) → self. Reply → parent's thread_id.
-- Parent missing (broken threading or out-of-order ingest) → self, treated
-- as its own thread; backfill-thread-id.js can repair these later if the
-- parent eventually arrives.
CREATE OR REPLACE FUNCTION public.messages_set_thread_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  parent_thread text;
BEGIN
  IF NEW.in_reply_to IS NULL THEN
    NEW.thread_id := NEW.id;
  ELSE
    SELECT thread_id INTO parent_thread
      FROM public.messages
     WHERE id = NEW.in_reply_to;
    NEW.thread_id := COALESCE(parent_thread, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_set_thread_id_trg
  BEFORE INSERT OR UPDATE OF in_reply_to ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_set_thread_id();

CREATE POLICY "Read only" ON public.messages
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE public.messages
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_mailbox_id_fkey FOREIGN KEY (mailbox_id) REFERENCES public.mailboxes(id);

ALTER TABLE public.messages
  ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

-- The Data API is read-only for this archive — frontend queries as anon,
-- the search edge function queries as service_role via @supabase/server.
-- All writes go through direct postgres connections (parse, embed scripts).
-- Per https://github.com/orgs/supabase/discussions/45329, new tables in
-- public no longer auto-grant: every role needs explicit grants.
GRANT SELECT ON public.messages TO anon, authenticated, service_role;
