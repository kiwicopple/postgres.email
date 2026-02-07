"use client"

import { useRouter, useSearchParams } from "next/navigation"

interface SearchFilterProps {
  lists: Array<{ id: string }>
  currentList: string | null
  currentQuery: string
}

export default function SearchFilter({
  lists,
  currentList,
  currentQuery,
}: SearchFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleListChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const list = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (list) {
      params.set("list", list)
    } else {
      params.delete("list")
    }
    router.push(`/lists/search?${params.toString()}`)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const q = formData.get("q") as string
    if (!q?.trim()) return
    const params = new URLSearchParams()
    params.set("q", q.trim())
    if (currentList) params.set("list", currentList)
    router.push(`/lists/search?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input
        type="text"
        name="q"
        defaultValue={currentQuery}
        placeholder="Search emails..."
        className="flex-grow px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:border-blue-500 text-gray-200 placeholder-gray-500"
      />
      <select
        value={currentList || ""}
        onChange={handleListChange}
        className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:border-blue-500 text-gray-200"
      >
        <option value="">All lists</option>
        {lists.map((list) => (
          <option key={list.id} value={list.id}>
            {list.id}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Search
      </button>
    </form>
  )
}
