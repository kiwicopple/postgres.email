import type { SearchHit } from "./retrieval"
import { stripMessageIdBrackets } from "./formatters"

export const ASK_SYSTEM_PROMPT = `You answer questions about the Postgres mailing list archive using the numbered context blocks below.

OUTPUT RULES:
- Output ONLY the final answer. No preamble, no meta-commentary, no thinking out loud.
- Never write phrases like "The user asked", "Let me check", "Based on the context", "Okay,", "Sure,", or any restatement of the question.
- Do not narrate your process. Do not announce what you are about to do.
- Start the answer directly with the substantive content (e.g. "pgBackRest is…", "Yes — …", "No, because…").

STYLE:
- Be concise: 1-3 short paragraphs. Use a bullet list only if the answer is genuinely a list.
- Cite every factual claim with [#N] markers matching the block numbers.
- If the context does not contain the answer, output exactly: "I couldn't find an answer in the archive." — nothing else.
- Do not invent details, message ids, or links. Only paraphrase or quote the provided context.`

export interface Citation {
  n: number
  thread_id: string
  mailbox_id: string
  subject: string
  from_email: string
  ts: string | null
}

const MAX_EXCERPT_CHARS = 1500
const MAX_HITS = 6

function excerptBody(body: string | null, maxChars = MAX_EXCERPT_CHARS): string {
  if (!body) return ""
  const cleaned = body
    .split("\n")
    .filter((line) => !line.startsWith(">"))
    .join("\n")
    .trim()
  if (cleaned.length <= maxChars) return cleaned
  return cleaned.slice(0, maxChars).trimEnd() + "…"
}

export interface AskPromptParts {
  context: string
  citations: Citation[]
}

export function buildAskPrompt(question: string, hits: SearchHit[]): AskPromptParts {
  const citations: Citation[] = []
  const blocks: string[] = []

  for (const hit of hits.slice(0, MAX_HITS)) {
    const threadId = hit.thread_id ?? hit.id
    if (!threadId || !hit.mailbox_id) continue

    const n = citations.length + 1
    citations.push({
      n,
      thread_id: stripMessageIdBrackets(threadId),
      mailbox_id: hit.mailbox_id,
      subject: hit.subject ?? "(no subject)",
      from_email: hit.from_email ?? "",
      ts: hit.ts,
    })

    blocks.push(
      [
        `[#${n}] thread: "${hit.subject ?? "(no subject)"}"`,
        `from: ${hit.from_email ?? "unknown"}`,
        `date: ${hit.ts ?? "unknown"}`,
        "",
        excerptBody(hit.body_text),
      ].join("\n"),
    )
  }

  const context = blocks.join("\n\n---\n\n")
  return { context, citations }
}

export function buildAskUserPrompt(question: string, context: string): string {
  return `Context from the archive:\n\n${context}\n\nUser question: ${question}`
}
