import { useState } from "react"
import { Toaster } from "react-hot-toast"
import { Hydrate, QueryClient, QueryClientProvider } from "react-query"
import { ReactQueryDevtools } from "react-query/devtools"
import { NotFoundError, NotImplementedError } from "../lib/utils"
import { AppPropsWithLayout } from "../lib/types"
import "../styles/globals.css"

const CustomApp = ({ Component, pageProps }: AppPropsWithLayout) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              // Don't retry on 404s or if we haven't finished writing the code
              if (
                error instanceof NotFoundError ||
                error instanceof NotImplementedError
              ) {
                return false
              }

              if (failureCount < 3) {
                return true
              }

              return false
            },
          },
        },
      })
  )

  const getLayout = Component.getLayout ?? ((page) => page)

  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={pageProps.dehydratedState}>
        {getLayout(<Component {...pageProps} />)}
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
        <Toaster position="bottom-left" />
      </Hydrate>
    </QueryClientProvider>
  )
}

export default CustomApp
