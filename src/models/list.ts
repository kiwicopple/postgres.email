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

export async function getListDetail(id: string): Promise<ListDetailData> {
  const { data, error } = await getSupabase()
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
    .single()

  return {
    data: data as ListDetail | null,
    error: error as Error | null
  }
}
