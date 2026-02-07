-- Add index on mailbox_id foreign key for better join performance
-- This addresses the unindexed foreign key performance issue

create index if not exists messages_mailbox_id_idx on public.messages (mailbox_id);

-- Note: The messages_ts_idx index is kept as it's used for ORDER BY queries
-- in the application (see src/models/list.ts:26)
