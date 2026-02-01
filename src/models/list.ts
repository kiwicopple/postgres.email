import { getSupabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type messages = Database["public"]["Tables"]["messages"]["Row"]

export type ListsData = Awaited<ReturnType<typeof getLists>>
export type ListsDataSuccess = ListsData["data"]
export type ListsDataError = ListsData["error"]

export async function getLists() {
  return await getSupabase().from("mailboxes").select(`id, message_count`)
}

export type ListDetailData = Awaited<ReturnType<typeof getListDetail>>
export type ListDetailDataSuccess = ListDetailData["data"] & {
  messages: messages[]
}
export type ListDetailDataError = ListDetailData["error"]

export async function getListDetail(id: string) {
  return await getSupabase()
    .from("mailboxes")
    .select(`id, message_count, messages(*)`)
    .eq("id", id)
    .is("messages.in_reply_to", null)
    .order("ts", { foreignTable: "messages", ascending: false })
    .single()
}
