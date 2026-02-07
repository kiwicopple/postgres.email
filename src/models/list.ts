import { getSupabase } from "@/lib/supabase"
import type {
  MessageListMetadata,
  ListsData,
  ListDetailData,
  ListDetail
} from "@/types"

export type {
  MessageListMetadata,
  ListsData,
  ListsDataSuccess,
  ListsDataError,
  ListDetail,
  ListDetailData,
  ListDetailDataSuccess,
  ListDetailDataError
} from "@/types"

export async function getLists(): Promise<ListsData> {
  const { data, error } = await getSupabase()
    .from("mailboxes")
    .select("id, message_count")

  return {
    data: data || null,
    error: error as Error | null
  }
}

export async function getListDetail(
  id: string,
  options?: {
    limit?: number
    offset?: number
  }
): Promise<ListDetailData> {
  const limit = options?.limit
  const offset = options?.offset ?? 0

  let query = getSupabase()
    .from("mailboxes")
    .select(`
      id,
      message_count,
      messages(
        id,
        subject,
        ts,
        from_email,
        from_addresses,
        in_reply_to
      )
    `)
    .eq("id", id)
    .is("messages.in_reply_to", null)
    .order("ts", { foreignTable: "messages", ascending: false })

  // Apply pagination to the nested messages if limit is specified
  if (limit !== undefined) {
    const from = offset
    const to = offset + limit - 1
    query = query.range(from, to, { foreignTable: "messages" })
  }

  const { data, error } = await query.single()

  // If pagination was requested, add pagination metadata
  let result = data as ListDetail | null
  if (result && limit !== undefined) {
    const messageCount = result.messages?.length ?? 0
    const total = result.message_count ?? 0
    result = {
      ...result,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + messageCount < total
      }
    }
  }

  return {
    data: result,
    error: error as Error | null
  }
}
