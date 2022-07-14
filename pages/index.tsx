import type { NextPage } from "next"
import Head from "next/head"
import WithSidebar from "../components/layouts/WithSidebar"

const Home: NextPage = () => {
  return (
    <WithSidebar>
      <Head>
        <title>postgres.email: PostgreSQL mailing lists</title>
        <meta name="description" content="Searchable mailing lists." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1 className="text-3xl font-bold ">Hello world!</h1>
      </main>
    </WithSidebar>
  )
}

export default Home
