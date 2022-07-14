import { GetStaticProps } from "next"
import Head from "next/head"
import WithSidebar from "../../components/layouts/WithSidebar"
import { NextPageWithLayout } from "../../lib/types"
import { dehydrate, QueryClient } from "react-query"
import { getMailboxes, useMailboxesQuery } from "../../lib/data/mailboxes"

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
        <h1 className="text-3xl font-bold ">Hello world!</h1>

        {isSuccess && data.mailboxes.map((x) => <div key={x.id}>{x.id}</div>)}
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

// This function gets called at build time
export async function getStaticPaths() {
  const { mailboxes } = await getMailboxes()

  // Get the paths we want to pre-render based on posts
  const paths = mailboxes.map((list) => ({
    params: { listId: list.id },
  }))

  // We'll pre-render only these paths at build time.
  // { fallback: false } means other routes should 404.
  return { paths, fallback: false }
}

export default IndexPage
