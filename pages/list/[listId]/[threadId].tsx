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
import Button from "components/utils/Button"

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
        <div className="hidden md:flex md:w-80 md:flex-col md:fixed md:inset-y-0">
          <nav className="flex flex-col flex-grow border-r border-slate-100 bg-white overflow-y-auto">
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
      <a className={isActive ? "text-black" : "text-gray-500"}>
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
  const [showMarkdown, setShowMarkdown] = React.useState(false)
  const { data, isLoading, isError, error } = useThreadQuery(threadId)

  if (isLoading) return <div>Loading</div>
  else if (isError) return <div>Error: {error.message}</div>

  const { thread } = data!
  // const root = thread.filter(x => x.in_reply_to === null)
  const tree = arrayToTree(thread, { parentId: "in_reply_to" })[0]

  return (
    <div className="h-full overflow-scroll">
      <div className="bg-white p-4 border-b sticky top-0 space-y-2 z-50">
        <div className="whitespace-nowrap text-ellipsis overflow-hidden">
          {thread[0].subject}
        </div>
        <div>
          <Button
            size="xs"
            label="Markdown"
            isActive={showMarkdown}
            onClick={() => setShowMarkdown(!showMarkdown)}
          />
        </div>
      </div>
      <ul className="flex flex-row whitespace-pre-wrap">
        {tree.data && (
          <ThreadItem tree={tree} level={0} markdown={showMarkdown} />
        )}
      </ul>
    </div>
  )
}

const ThreadItem = ({
  tree,
  level,
  markdown,
}: {
  tree: TreeItem
  level: number
  markdown: boolean
}) => {
  const [showDetails, setShowDetails] = React.useState(true)
  const message: Thread = tree.data
  const children: { data: Thread; children: any }[] = tree.children

  if (!message) return null

  const isOdd = level % 2 === 0
  const colors = isOdd
    ? ["bg-slate-50 hover:border-blue-200"]
    : ["bg-white hover:border-blue-200"]

  return (
    <li key={message.id} className={`border w-full border-slate-200`}>
      <div className={`w-full pr-2 ${colors}`}>
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
            {markdown ? (
              <ReactMarkdown>{message.body_text || ""}</ReactMarkdown>
            ) : (
              message.body_text
            )}
          </div>
          <div className="thread-footer ml-4 py-4">FOOTER</div>

          {children && children.length > 0 && (
            <ul className={"replies ml-4 pt-2 space-y-5"}>
              {children.map((node, idx) => (
                <ThreadItem
                  tree={node}
                  key={idx}
                  level={level + 1}
                  markdown={markdown}
                />
              ))}
            </ul>
          )}
        </details>
      </div>
    </li>
  )
}
