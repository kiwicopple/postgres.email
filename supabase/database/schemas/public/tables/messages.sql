CREATE TABLE public.messages (
  id             text                     NOT NULL,
  mailbox_id     text,
  in_reply_to    text,
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

GRANT ALL ON public.messages TO anon;

GRANT ALL ON public.messages TO authenticated;

GRANT ALL ON public.messages TO service_role;

-- GRANT ALL doesn't actually grant SELECT/INSERT/UPDATE/DELETE for these roles
-- in Supabase (only TRUNCATE/REFERENCES/TRIGGER come through). We need
-- explicit SELECT so PostgREST can read for the search edge function and
-- frontend queries.
GRANT SELECT ON public.messages TO anon, authenticated, service_role;