import { GetStaticProps } from "next"
import Head from "next/head"
import WithSidebar from "../components/layouts/WithSidebar"
import { NextPageWithLayout } from "../lib/types"
import { dehydrate, QueryClient } from "react-query"
import { getMailboxes, useMailboxesQuery } from "../lib/data/mailboxes"

const IndexPage: NextPageWithLayout = () => {
  const { data, isSuccess, isLoading, isError, error } = useMailboxesQuery()
  return (
    <>
      <Head>
        <title>postgres.email: PostgreSQL mailing lists</title>
        <meta name="description" content="Searchable mailing lists." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1 className="text-3xl font-bold ">PostgreSQL Mailing Lists</h1>
        <h3 className="text-xl font-bold ">
          Browse all Postgres mailing lists online.
        </h3>

        <div>
          <p>Most popular:</p>
          {isSuccess && data.mailboxes.map((x) => <div key={x.id}>{x.id}</div>)}
        </div>
      </main>
    </>
  )
}
IndexPage.getLayout = (page) => <WithSidebar>{page}</WithSidebar>

export const getStaticProps: GetStaticProps = async () => {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery(["mailboxes"], ({ signal }) =>
    getMailboxes(signal)
  )

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
    revalidate: 60,
  }
}

export default IndexPage
