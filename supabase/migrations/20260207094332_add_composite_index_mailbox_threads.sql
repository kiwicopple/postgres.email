-- Add composite index for the most common query pattern:
-- WHERE mailbox_id = X AND in_reply_to IS NULL ORDER BY ts DESC
-- This query is used to fetch root messages (threads) for a mailbox list

-- Partial index for root messages only (most common case)
-- This is more efficient as it only indexes rows where in_reply_to IS NULL
CREATE INDEX IF NOT EXISTS idx_messages_mailbox_root_threads
ON messages(mailbox_id, ts DESC)
WHERE in_reply_to IS NULL;

-- Composite index for all messages in a mailbox ordered by timestamp
-- This helps with queries that need all messages in a mailbox, not just root threads
CREATE INDEX IF NOT EXISTS idx_messages_mailbox_ts
ON messages(mailbox_id, ts DESC);
