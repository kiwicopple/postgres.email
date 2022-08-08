import React from "react"
import Head from "next/head"
import WithSidebar from "components/layouts/WithSidebar"
import { NextPageWithLayout } from "lib/types"
import { definitions } from "lib/definitions"
import { useMailboxQuery } from "lib/data/mailboxes"
import { useThreadQuery, Thread } from "lib/data/threads"
import { useParams } from "lib/utils"
import { arrayToTree, TreeItem } from "performant-array-to-tree"
import Link from "next/link"
import ReactMarkdown from "react-markdown"

const ListPage: NextPageWithLayout = ({}) => {
  const { listId, threadId } = useParams()
  const { data, isLoading, isError, error } = useMailboxQuery(listId)

  if (isLoading) return <div>Loading</div>
  else if (isError) return <div>Error: {error.message}</div>

  const { mailbox } = data!

  return (
    <>
      <Head>
        <title>postgres.email: PostgreSQL mailing lists</title>
        <meta name="description" content="Searchable mailing lists." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="h-full ">
        <div className="hidden md:flex md:w-80 md:flex-col md:fixed md:inset-y-0 pt-10">
          <nav className="flex flex-col flex-grow border-r border-gray-200 pt-5 bg-white overflow-y-auto mt-1">
            <ul>
              {mailbox.messages.map((message) => (
                <MessageThread
                  key={message.id}
                  message={message}
                  href={`/list/${listId}/${message.id}`}
                  isActive={message.id == threadId}
                />
              ))}
            </ul>
          </nav>
        </div>
        <div className="md:pl-80 flex flex-col flex-1 h-full">
          <Thread threadId={threadId || ""} />
        </div>
      </div>
    </>
  )
}
ListPage.getLayout = (page) => <WithSidebar>{page}</WithSidebar>

export default ListPage

const MessageThread = ({
  message,
  href,
  isActive,
}: {
  message: definitions["messages"]
  href: string
  isActive: boolean
}) => {
  const from = message.from_addresses!
  // @ts-ignore
  const sender: { Name?: string; Address: string } = from[0]
  const timestamp = new Date(message.ts!).toLocaleDateString()
  return (
    <Link href={href} passHref>
      <a className={isActive ? "text-red-600" : ""}>
        <li
          key={message.id}
          className="flex flex-col p-2 py-4 border-b hover:bg-gray-100 text-sm"
        >
          <div className="flex flex-row">
            <span className="font-bold flex-grow whitespace-nowrap text-ellipsis overflow-hidden">
              {sender.Name || sender.Address}
            </span>
            <span className="text-xs">{timestamp}</span>
          </div>
          <div className="whitespace-nowrap text-ellipsis overflow-hidden">
            {message.subject}
          </div>
        </li>
      </a>
    </Link>
  )
}

const Thread = ({ threadId }: { threadId: string }) => {
  const { data, isLoading, isError, error } = useThreadQuery(threadId)

  if (isLoading) return <div>Loading</div>
  else if (isError) return <div>Error: {error.message}</div>

  const { thread } = data!
  // const root = thread.filter(x => x.in_reply_to === null)
  const tree = arrayToTree(thread, { parentId: "in_reply_to" })[0]

  return (
    <div className="h-full overflow-scroll">
      <div className="flex flex-col flex-grow">
        <div className="whitespace-nowrap text-ellipsis overflow-hidden bg-white px-4 py-6 border-b">
          {thread[0].subject}
        </div>
      </div>
      <ul className="flex flex-row whitespace-pre-wrap m-2">
        {tree.data && <ThreadItem tree={tree} level={0} />}
      </ul>
    </div>
  )
}

const ThreadItem = ({ tree, level }: { tree: TreeItem; level: number }) => {
  const [showMarkdown, setShowMarkdown] = React.useState(false)
  const [showDetails, setShowDetails] = React.useState(true)
  const message: Thread = tree.data
  const children: { data: Thread; children: any }[] = tree.children

  if (!message) return null

  const isOdd = level % 2 === 0
  const colors = isOdd
    ? ["bg-green-100 border-green-200"]
    : ["bg-indigo-50 border-indigo-100"]

  return (
    <li key={message.id} className={`border rounded w-full pr-2 ${colors}`}>
      <details className="relative overflow-hidden pb-4" open={showDetails}>
        <a
          onClick={() => setShowDetails(!showDetails)}
          className={`comment-border-link cursor-pointer block absolute top-0 left-0 w-2 h-full border-l-8 ${colors}`}
        >
          <span className="sr-only">Jump to comment-1</span>
        </a>
        <summary className="pl-6 mb-4 cursor-pointer list-none text-sm p-2">
          <div className="font-bold">
            <p>
              {`<${message.from_email}>`} {message.ts}
            </p>
          </div>
        </summary>
        <div className="pl-6 prose">
          {showMarkdown ? (
            <ReactMarkdown>{message.body_text || ""}</ReactMarkdown>
          ) : (
            message.body_text
          )}
        </div>
        <div className="thread-footer ml-4 py-4">
          <a
            className="cursor-pointer"
            onClick={() => setShowMarkdown(!showMarkdown)}
          >
            Toggle Markdown
          </a>
        </div>

        {children && children.length > 0 && (
          <ul className={"replies ml-4 pt-2 space-y-5"}>
            {children.map((node, idx) => (
              <ThreadItem tree={node} key={idx} level={level + 1} />
            ))}
          </ul>
        )}
      </details>
    </li>
  )
}
