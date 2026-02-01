import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Postgres Email Lists",
  description: "PostgreSQL Email Lists, with a more readable interface",
  openGraph: {
    siteName: "postgres-email",
    type: "website",
    url: "https://postgres.email",
    title: "Postgres Email Lists",
    description: "PostgreSQL Email Lists, with a more readable interface",
  },
  twitter: {
    title: "Postgres Email Lists",
    description: "PostgreSQL Email Lists, with a more readable interface",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-gray-200 font-mono">
        {children}
      </body>
    </html>
  )
}
