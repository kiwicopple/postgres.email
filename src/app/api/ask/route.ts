import { gateway } from "@ai-sdk/gateway"
import { streamText } from "ai"
import { retrieveThreads } from "@/lib/retrieval"
import { ASK_SYSTEM_PROMPT, buildAskPrompt, buildAskUserPrompt } from "@/lib/prompts"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const MODEL_ID = "amazon/nova-lite"

interface AskBody {
  question?: string
  list?: string | null
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function POST(req: Request) {
  let body: AskBody
  try {
    body = await req.json()
  } catch {
    return jsonError(400, "Invalid JSON body")
  }

  const question = body.question?.trim()
  if (!question) return jsonError(400, "question is required")

  const { hits, error } = await retrieveThreads(question, body.list ?? null)
  if (error) return jsonError(502, `retrieval failed: ${error.message}`)

  const { context, citations } = buildAskPrompt(question, hits ?? [])
  if (citations.length === 0) {
    // Stream a structured "no results" response so the client renders consistently.
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "citations", data: [] }) + "\n"),
        )
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "token",
              data: "I couldn't find any threads in the archive that match this question.",
            }) + "\n",
          ),
        )
        controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"))
        controller.close()
      },
    })
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson" },
    })
  }

  // streamText silently swallows model errors by default — capture them via onError
  // so they surface to the client instead of producing a blank, broken stream.
  let streamError: string | null = null
  const result = streamText({
    model: gateway(MODEL_ID),
    system: ASK_SYSTEM_PROMPT,
    prompt: buildAskUserPrompt(question, context),
    onError({ error }) {
      streamError = error instanceof Error ? error.message : String(error)
      console.error("[/api/ask] streamText error:", error)
    },
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let tokensSeen = 0
      try {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "citations", data: citations }) + "\n",
          ),
        )
        for await (const chunk of result.textStream) {
          tokensSeen++
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: "token", data: chunk }) + "\n"),
          )
        }
        if (streamError) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "error", data: streamError }) + "\n",
            ),
          )
        } else if (tokensSeen === 0) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "error",
                data: `Model ${MODEL_ID} returned no output. Check the dev server logs for details.`,
              }) + "\n",
            ),
          )
        } else {
          controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"))
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error("[/api/ask] stream iteration error:", err)
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "error", data: message }) + "\n"),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  })
}
