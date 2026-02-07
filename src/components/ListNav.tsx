"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"
import type { ListsDataSuccess } from "@/models/list"

export default function ListNav({ lists }: { lists: NonNullable<ListsDataSuccess> }) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-2 pb-4 space-y-1 text-sm">
      {lists?.map((item) => {
        const isActive = pathname.startsWith(`/lists/${item.id}`)

        return (
          <Link
            key={item.id}
            href={`/lists/${item.id}`}
            className={clsx(
              "px-3 py-1.5 flex items-center gap-4 transition-colors rounded-lg",
              isActive
                ? "bg-blue-900 text-white font-medium"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
            )}
          >
            <div className="flex-1">{item.id}</div>
          </Link>
        )
      })}
    </nav>
  )
}
