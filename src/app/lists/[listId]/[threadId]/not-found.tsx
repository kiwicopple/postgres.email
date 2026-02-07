import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-10 text-center">
      <h2 className="text-2xl font-bold text-gray-300 mb-4">Thread Not Found</h2>
      <p className="text-gray-500 mb-6">
        The message or thread you're looking for doesn't exist.
      </p>
      <Link
        href="/lists"
        className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
      >
        Go to Lists
      </Link>
    </div>
  )
}
