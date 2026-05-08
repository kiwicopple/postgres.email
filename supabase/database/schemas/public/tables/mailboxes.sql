CREATE TABLE public.mailboxes (
  id            text    NOT NULL,
  message_count integer
);

CREATE POLICY "Read only" ON public.mailboxes
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE public.mailboxes
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.mailboxes
  ADD CONSTRAINT mailboxes_pkey PRIMARY KEY (id);

GRANT ALL ON public.mailboxes TO anon;

GRANT ALL ON public.mailboxes TO authenticated;

GRANT ALL ON public.mailboxes TO service_role;

-- GRANT ALL doesn't actually grant SELECT/INSERT/UPDATE/DELETE for these roles
-- in Supabase. Explicit SELECT lets PostgREST read for frontend queries.
GRANT SELECT ON public.mailboxes TO anon, authenticated, service_role;