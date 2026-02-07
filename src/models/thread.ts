import { getSupabase } from "@/lib/supabase"
import type { Thread, ThreadData } from "@/types"

export type { Thread, ThreadData, ThreadDataSuccess, ThreadDataError } from "@/types"

export async function getThread(id: string): Promise<ThreadData> {
  const { data, error } = await getSupabase()
    .from("threads")
    .select("*")
    .eq("thread_id", id)

  return {
    data: data as Thread[] | null,
    error: error as Error | null
  }
}

export async function getThreadIdByMessageId(messageId: string): Promise<{
  threadId: string | null
  mailboxId: string | null
  error: Error | null
}> {
  const { data, error } = await getSupabase()
    .from("threads")
    .select("thread_id, mailbox_id")
    .eq("id", messageId)
    .maybeSingle()

  if (error) {
    return { threadId: null, mailboxId: null, error }
  }

  return {
    threadId: data?.thread_id || null,
    mailboxId: data?.mailbox_id || null,
    error: null
  }
}
