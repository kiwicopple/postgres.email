/// <reference lib="deno.ns" />

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const model = new Supabase.ai.Session("gte-small")

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
)

/**
 * Deduplicate vector results by message_id.
 * Multiple chunks from the same email may match — keep only the best (first) hit.
 */
export function deduplicateResults(
  vectorResults: Array<{ metadata?: Record<string, unknown>; distance?: number }>
): Array<{ metadata?: Record<string, unknown>; distance?: number }> {
  const seen = new Set<string>()
  const unique: typeof vectorResults = []

  for (const result of vectorResults) {
    const msgId = result.metadata?.message_id as string | undefined
    if (msgId && !seen.has(msgId)) {
      seen.add(msgId)
      unique.push(result)
    }
  }

  return unique
}

/**
 * Merge vector results with full message rows, preserving ranking order.
 */
export function rankResults(
  uniqueResults: Array<{ metadata?: Record<string, unknown>; distance?: number }>,
  messages: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const messageMap = new Map(messages.map((m) => [m.id, m]))

  return uniqueResults
    .map((r) => {
      const msg = messageMap.get(r.metadata?.message_id as string)
      if (!msg) return null
      return {
        ...msg,
        score: r.distance,
        matched_chunk: r.metadata?.chunk_index,
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { query, mailbox_id, limit = 20 } = await req.json()

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({
          error: "Query parameter is required and must be a string",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // 1. Embed the user query with gte-small (runs on-device in the edge runtime)
    const queryVector = await model.run(query, {
      mean_pool: true,
      normalize: true,
    })

    // 2. Query vector bucket with optional metadata filter
    const index = supabase.storage.vectors
      .from("email-embeddings")
      .index("email-chunks")

    const filter: Record<string, string> = {}
    if (mailbox_id) filter.mailbox_id = mailbox_id

    const { data: vectorResults, error } = await index.queryVectors({
      queryVector: { float32: queryVector },
      topK: limit,
      ...(Object.keys(filter).length > 0 ? { filter } : {}),
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 3. Deduplicate by message_id (multiple chunks may match from same email)
    const uniqueResults = deduplicateResults(vectorResults ?? [])

    // 4. Fetch full messages from Postgres
    const messageIds = uniqueResults
      .map((r) => r.metadata?.message_id)
      .filter(Boolean) as string[]

    const { data: messages } = await supabase
      .from("messages")
      .select("id, mailbox_id, subject, from_email, ts, body_text")
      .in("id", messageIds)

    // 5. Merge scores with messages and preserve ranking order
    const ranked = rankResults(uniqueResults, messages ?? [])

    return new Response(JSON.stringify(ranked), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
