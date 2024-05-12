-- This migration is safe to copy/paste for future migrations

drop policy if exists "Read only" on public.mailboxes;
create policy "Read only"
on public.mailboxes
for select 
to anon, authenticated
using (
  true
);

drop policy if exists "Read only" on public.messages;
create policy "Read only"
on public.messages
for select 
to anon, authenticated
using (
  true
);