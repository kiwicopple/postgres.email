import { getSupabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

// PMC: CLI is not exporting View types, so we need to manually
// create this for now.
type Message = Database["public"]["Tables"]["messages"]["Row"]
export type Thread = Message & {
  thread_id: string
}

export type ThreadData = Awaited<ReturnType<typeof getThread>>
export type ThreadDataSuccess = NonNullable<ThreadData["data"]>
export type ThreadDataError = ThreadData["error"]

export async function getThread(id: string) {
  // @ts-ignore-next-line - remove this when CLI is fixed
  return await getSupabase().from("threads").select(`*`).eq("thread_id", id)
}
