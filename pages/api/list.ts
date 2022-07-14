import { connect, disconnect, getMailboxes, getEmails } from "../../utils/imap"
import type { Mailbox } from "../../utils/imap"
import type { NextApiRequest, NextApiResponse } from "next"

type Data = {
  data: Mailbox[] | null
  error: string | null
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const imap = await connect()

  if (!imap) {
    return res.status(500).json({ data: null, error: "No IMAP Connection" })
  }

  const mailboxes = await getMailboxes(imap)
  const emails = await getEmails(imap, "pgsql-hackers")

  if (!mailboxes.data) {
    return res
      .status(500)
      .json({ data: null, error: "Couldn't find mailboxes" })
  }

  await disconnect()

  return res.status(200).json({ data: mailboxes.data, error: null })
}
