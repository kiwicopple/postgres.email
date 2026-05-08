/// <reference lib="deno.ns" />

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { withSupabase } from "npm:@supabase/server"
import { corsHeaders } from "../_shared/cors.ts"

const model = new Supabase.ai.Session("gte-small")

/**
 * Deduplicate vector results by message_id.
 * Multiple chunks from the same email may match — keep only the best (first) hit.
 */
export function deduplicateResults(
  vectorResults: Array<{
    key?: string
    metadata?: Record<string, unknown>
    distance?: number
  }>,
): Array<{ key?: string; metadata?: Record<string, unknown>; distance?: number }> {
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

function chunkIndexFromKey(key: unknown): number | undefined {
  if (typeof key !== "string") return undefined
  const m = key.match(/#chunk(\d+)$/)
  return m ? Number(m[1]) : undefined
}

/**
 * Merge vector results with full message rows, preserving ranking order.
 */
export function rankResults(
  uniqueResults: Array<{
    key?: string
    metadata?: Record<string, unknown>
    distance?: number
  }>,
  messages: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const messageMap = new Map(messages.map((m) => [m.id, m]))

  return uniqueResults
    .map((r) => {
      const msg = messageMap.get(r.metadata?.message_id as string)
      if (!msg) return null
      return {
        ...msg,
        score: r.distance,
        matched_chunk: chunkIndexFromKey(r.key),
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
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
          },
        )
      }

      // 1. Embed the user query with gte-small (runs on-device in the edge runtime)
      const queryVector = (await model.run(query, {
        mean_pool: true,
        normalize: true,
      })) as number[]

      // 2. Query vector bucket with optional metadata filter
      const index = ctx.supabaseAdmin.storage.vectors
        .from("email-embeddings")
        .index("email-chunks")

      const filter: Record<string, string> = {}
      if (mailbox_id) filter.mailbox_id = mailbox_id

      const { data: vectorResults, error } = await index.queryVectors({
        queryVector: { float32: queryVector },
        topK: limit,
        returnMetadata: true,
        returnDistance: true,
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
      })

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // 3. Deduplicate by message_id (multiple chunks may match from same email)
      const uniqueResults = deduplicateResults(vectorResults?.vectors ?? [])

      // 4. Fetch full messages from Postgres (supabaseAdmin bypasses RLS)
      const messageIds = uniqueResults
        .map((r) => r.metadata?.message_id)
        .filter(Boolean) as string[]

      const { data: messages } = await ctx.supabaseAdmin
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
  }),
}
