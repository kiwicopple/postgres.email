import { connect, disconnect, getMailboxes } from "../../utils/imap"
import type { Mailbox, MailboxListPromise } from "../../utils/imap"
import { getEmails } from "../../utils/imapJs"
import { simpleParser } from "mailparser"
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

  if (!mailboxes.data) {
    return res
      .status(500)
      .json({ data: null, error: "Couldn't find mailboxes" })
  }

  await disconnect()

  return res.status(200).json({ data: mailboxes.data, error: null })
}

// const getEmails = (imap: IMAP) => {
//   return new Promise((resolve, reject) => {
//     imap.openBox("INBOX", false, () => {
//       imap.search(["UNSEEN", ["SINCE", new Date()]], (err, results) => {
//         const f = imap.fetch(results, { bodies: "" })
//         f.on("message", (msg) => {
//           msg.on("body", (stream) => {
//             simpleParser(stream, async (err, parsed) => {
//               // const {from, subject, textAsHtml, text} = parsed;
//               console.log(parsed)
//               /* Make API call to save the data
//                    Save the retrieved data into a database.
//                    E.t.c
//                 */
//               return resolve(true)
//             })
//           })
//         })
//         f.once("error", (ex) => {
//           return reject(ex)
//         })
//       })
//     })
//   })
// }
