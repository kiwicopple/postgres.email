import { getSupabase } from "./supabase"

export interface SearchHit {
  id: string
  thread_id: string | null
  mailbox_id: string
  subject: string | null
  from_email: string | null
  ts: string | null
  body_text: string | null
  score: number
  matched_chunk: number
}

export interface RetrievalResult {
  hits: SearchHit[] | null
  error: Error | null
}

export async function retrieveThreads(
  query: string,
  mailboxId?: string | null,
): Promise<RetrievalResult> {
  const { data, error } = await getSupabase().functions.invoke("search", {
    body: {
      query,
      ...(mailboxId ? { mailbox_id: mailboxId } : {}),
    },
  })

  if (error) {
    return { hits: null, error: error as Error }
  }

  return { hits: (data as SearchHit[]) ?? [], error: null }
}
