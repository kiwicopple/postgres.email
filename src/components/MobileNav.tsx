"use client"

import Link from "next/link"
import { useState } from "react"

type ListItem = {
  id: string
  message_count: number | null
}

export default function MobileNav({ lists }: { lists: ListItem[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <span className="font-mono text-lg text-blue-400">postgres.email</span>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          aria-label="Toggle navigation"
        >
          {open ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>
      {open && (
        <nav className="border-b border-gray-800 px-4 py-3 space-y-1">
          {lists.map((item) => (
            <Link
              key={item.id}
              href={`/lists/${item.id}`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-3 py-2 text-sm font-mono text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-md"
            >
              <span>{item.id}</span>
              <span className="text-xs">{item.message_count}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
