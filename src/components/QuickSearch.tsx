"use client"

import { useRouter, useSearchParams } from "next/navigation"

export default function QuickSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get("mode") === "ask" ? "ask" : "search"
  const placeholder = mode === "ask" ? "Ask a question…" : "Search emails…"

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return
    const q = event.currentTarget.value.trim()
    if (!q) return
    const params = new URLSearchParams()
    params.set("q", q)
    if (mode === "ask") params.set("mode", "ask")
    router.push(`/lists/search?${params.toString()}`)
  }

  return (
    <div>
      <div className="mt-1 relative flex items-center">
        <input
          type="text"
          name="search"
          id="search"
          placeholder={placeholder}
          className="shadow-sm focus:ring-0 focus:border-gray-600 block w-full pr-12 sm:text-sm border rounded-md bg-gray-900 border-gray-800"
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  )
}
