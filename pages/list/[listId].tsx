import { GetStaticProps } from "next"
import Head from "next/head"
import WithSidebar from "../../components/layouts/WithSidebar"
import { NextPageWithLayout } from "../../lib/types"
import { dehydrate, QueryClient } from "react-query"
import {
  getMailboxes,
  getMailbox,
  useMailboxesQuery,
  useMailboxQuery,
} from "../../lib/data/mailboxes"
import { useParams } from "../../lib/utils"

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

      <main className="">
        <nav>
          <ul>
            {mailbox.messages.map((message) => (
              <li key={message.id}>{message.subject}</li>
            ))}
          </ul>
        </nav>
      </main>
    </>
  )
}
ListPage.getLayout = (page) => <WithSidebar>{page}</WithSidebar>

export default ListPage
