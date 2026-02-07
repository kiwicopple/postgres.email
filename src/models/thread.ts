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
