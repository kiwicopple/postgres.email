"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { formatDate } from "@/lib/formatters"

interface Citation {
  n: number
  thread_id: string
  mailbox_id: string
  subject: string
  from_email: string
  ts: string | null
}

type StreamEvent =
  | { type: "citations"; data: Citation[] }
  | { type: "token"; data: string }
  | { type: "done" }
  | { type: "error"; data: string }

interface AskViewProps {
  question: string
  list: string | null
}

async function* readNdjson(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<StreamEvent> {
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let nl: number
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line) continue
      try {
        yield JSON.parse(line) as StreamEvent
      } catch {
        // Drop malformed lines silently — they shouldn't happen but a partial line at stream end is recoverable.
      }
    }
  }
}

function renderAnswerWithCitations(answer: string, citations: Citation[]) {
  // Replace [#1], [#2] etc with superscript links to the matching citation row.
  const byNumber = new Map(citations.map((c) => [c.n, c]))
  const parts = answer.split(/(\[#\d+\])/g)
  return parts.map((part, i) => {
    const m = part.match(/^\[#(\d+)\]$/)
    if (!m) return <span key={i}>{part}</span>
    const n = Number(m[1])
    const citation = byNumber.get(n)
    if (!citation) return <span key={i}>{part}</span>
    return (
      <Link
        key={i}
        href={`/lists/${citation.mailbox_id}/${encodeURIComponent(citation.thread_id)}`}
        className="text-blue-400 hover:text-blue-300 align-super text-xs ml-0.5"
      >
        [{n}]
      </Link>
    )
  })
}

export default function AskView({ question, list }: AskViewProps) {
  const [citations, setCitations] = useState<Citation[]>([])
  const [answer, setAnswer] = useState("")
  const [status, setStatus] = useState<"idle" | "streaming" | "done" | "error">(
    "idle",
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!question.trim()) {
      setStatus("idle")
      return
    }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setCitations([])
    setAnswer("")
    setErrorMessage(null)
    setStatus("streaming")

    ;(async () => {
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, list }),
          signal: ctrl.signal,
        })
        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "")
          throw new Error(text || `request failed (${res.status})`)
        }
        const reader = res.body.getReader()
        for await (const event of readNdjson(reader)) {
          if (ctrl.signal.aborted) break
          if (event.type === "citations") {
            setCitations(event.data)
          } else if (event.type === "token") {
            setAnswer((prev) => prev + event.data)
          } else if (event.type === "error") {
            throw new Error(event.data)
          } else if (event.type === "done") {
            setStatus("done")
            return
          }
        }
        setStatus("done")
      } catch (err) {
        if (ctrl.signal.aborted) return
        setStatus("error")
        setErrorMessage(err instanceof Error ? err.message : String(err))
      }
    })()

    return () => ctrl.abort()
  }, [question, list])

  if (!question.trim()) {
    return (
      <p className="text-gray-500 text-sm">
        Enter a question to ask the archive.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-gray-500">Answer</p>
        <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {renderAnswerWithCitations(answer, citations)}
          {status === "streaming" && (
            <span className="inline-block w-1.5 h-4 ml-1 align-text-bottom bg-gray-500 animate-pulse" />
          )}
        </div>
        {status === "error" && (
          <p className="text-red-400 text-xs">{errorMessage}</p>
        )}
      </div>

      {citations.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
            Sources
          </p>
          <ol className="space-y-1">
            {citations.map((c) => (
              <li key={c.n}>
                <Link
                  href={`/lists/${c.mailbox_id}/${encodeURIComponent(c.thread_id)}`}
                  className="block border-b border-gray-800 hover:bg-gray-800 p-3 -mx-3 rounded transition-colors"
                >
                  <div className="text-sm text-gray-200 truncate">
                    <span className="text-gray-500 mr-2">[{c.n}]</span>
                    {c.subject}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    <span className="text-blue-400">{c.from_email}</span>
                    {" in "}
                    <span className="text-gray-400">{c.mailbox_id}</span>
                    {c.ts && <span className="ml-2">{formatDate(c.ts)}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
