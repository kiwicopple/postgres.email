
alter table mailboxes enable row level security;
alter table messages enable row level security;


create policy "Read only"
on public.mailboxes
for select 
to anon, authenticated
using (
  true
);

create policy "Read only"
on public.messages
for select 
to anon, authenticated
using (
  true
);