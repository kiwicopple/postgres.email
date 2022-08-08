import { GetStaticProps } from "next"
import Head from "next/head"
import WithSidebar from "../../components/layouts/WithSidebar"
import { NextPageWithLayout } from "../../lib/types"
import { definitions } from "../../lib/definitions"
import {
  getMailboxes,
  getMailbox,
  useMailboxesQuery,
  useMailboxQuery,
} from "../../lib/data/mailboxes"
import { useParams } from "../../lib/utils"
import Link from "next/link"

const ListPage: NextPageWithLayout = ({}) => {
  const { listId } = useParams()
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
                />
              ))}
            </ul>
          </nav>
        </div>
        <div className="md:pl-80 flex flex-col flex-1 h-full">Select</div>
      </div>
    </>
  )
}
ListPage.getLayout = (page) => <WithSidebar>{page}</WithSidebar>

export default ListPage

const MessageThread = ({
  message,
  href,
}: {
  message: definitions["messages"]
  href: string
}) => {
  const from = message.from_addresses!
  // @ts-ignore
  const sender: { Name?: string; Address: string } = from[0]
  const timestamp = new Date(message.ts!).toLocaleDateString()
  return (
    <Link href={href} passHref>
      <a className="">
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
