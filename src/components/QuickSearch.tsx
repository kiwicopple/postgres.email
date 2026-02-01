"use client"

import { useRouter } from "next/navigation"

export default function QuickSearch() {
  const router = useRouter()

  const handleKeyDown = (event: any) => {
    if (event.key === "Enter") {
      router.push(`/lists/search?q=${event.target.value}`)
    }
  }

  return (
    <div>
      <div className="mt-1 relative flex items-center">
        <input
          type="text"
          name="search"
          id="search"
          placeholder="Search"
          className="shadow-sm focus:ring-gray-600 focus:border-gray-600 block w-full pr-12 sm:text-sm border rounded-md bg-gray-900 border-gray-800"
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  )
}
