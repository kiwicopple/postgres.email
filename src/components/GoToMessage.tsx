"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { stripMessageIdBrackets } from "@/lib/formatters"

function extractMessageIdFromInput(input: string): string {
  const trimmed = input.trim()

  // Check if it's a PostgreSQL archive URL
  const urlMatch = trimmed.match(/postgresql\.org\/message-id\/([^?#]+)/)
  if (urlMatch) {
    return decodeURIComponent(urlMatch[1])
  }

  // Otherwise treat it as a direct message ID
  return trimmed
}

export default function GoToMessage() {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setLoading(true)
    setError(null)

    try {
      const messageId = extractMessageIdFromInput(input)
      const encodedMessageId = encodeURIComponent(
        stripMessageIdBrackets(messageId),
      )
      const response = await fetch(`/api/messages/${encodedMessageId}/thread`)
      const data = await response.json()

      if (!response.ok) {
        // Navigate to not-found page for 404 errors
        if (response.status === 404) {
          router.push("/lists/not-found")
          setInput("")
          return
        }
        throw new Error(data.error || "Failed to find message")
      }

      const { threadId, mailboxId, messageId: normalizedMessageId } = data

      // Navigate to the thread and scroll to the message
      const threadUrl = `/lists/${mailboxId}/${encodeURIComponent(stripMessageIdBrackets(threadId))}`
      const messageHash = `#message-${normalizedMessageId}`

      router.push(threadUrl + messageHash)

      // Clear input after successful navigation
      setInput("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find message")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="mt-1 relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Go to message ID ..."
            className="shadow-sm focus:ring-0 focus:border-gray-600 block w-full pr-12 sm:text-sm border rounded-md bg-gray-900 border-gray-800"
            disabled={loading}
          />
        </div>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </form>
    </div>
  )
}
