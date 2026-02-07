export default function ListsPage() {
  return (
    <div className="flex items-center justify-center h-full p-10">
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-blue-400 mb-4">postgres.email</h1>
          <p className="text-xl text-gray-300">
            PostgreSQL mailing lists, with a more readable interface
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-blue-300 mb-2">Better Formatting</h2>
            <p className="text-gray-400">
              Enjoy syntax-highlighted code blocks, properly rendered tables, and clean typography
              that makes technical discussions easier to follow.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-blue-300 mb-2">Fast Search</h2>
            <p className="text-gray-400">
              Quickly find messages across all mailing lists with full-text search and message ID lookup.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-blue-300 mb-2">Threaded Conversations</h2>
            <p className="text-gray-400">
              Navigate email threads with ease. See the full context of discussions with proper reply hierarchies.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-blue-300 mb-2">Mobile Friendly</h2>
            <p className="text-gray-400">
              Read PostgreSQL discussions on any device with a responsive design optimized for readability.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-blue-300 mb-2">Shareable Links</h2>
            <p className="text-gray-400">
              Every message has a permanent URL. Easily reference specific discussions in documentation or conversations.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-500">
            Select a mailing list from the sidebar to get started →
          </p>
        </div>
      </div>
    </div>
  )
}
