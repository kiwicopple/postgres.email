"use client"

import { useRouter, useSearchParams } from "next/navigation"

export type SearchMode = "search" | "ask"

export default function ModeToggle({ mode }: { mode: SearchMode }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const setMode = (next: SearchMode) => {
    if (next === mode) return
    const params = new URLSearchParams(searchParams.toString())
    if (next === "search") {
      params.delete("mode")
    } else {
      params.set("mode", next)
    }
    router.push(`/lists/search?${params.toString()}`)
  }

  const base =
    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
  const active = "bg-blue-600 text-white"
  const inactive = "bg-gray-800 text-gray-400 hover:text-gray-200"

  return (
    <div className="inline-flex gap-1 p-1 bg-gray-900 rounded-md border border-gray-800">
      <button
        type="button"
        onClick={() => setMode("search")}
        className={`${base} ${mode === "search" ? active : inactive}`}
      >
        Search
      </button>
      <button
        type="button"
        onClick={() => setMode("ask")}
        className={`${base} ${mode === "ask" ? active : inactive}`}
      >
        Ask
      </button>
    </div>
  )
}
