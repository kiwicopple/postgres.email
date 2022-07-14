import IMAP from "imap"
import util from "util"

export const imapConfig = {
  user: process.env.IMAP_USERNAME || "",
  password: process.env.IMAP_PASSWORD || "",
  host: "imap.gmail.com",
  port: 993,
  tls: true,
  authTimeout: 10000,
  connTimeout: 30000,
  tlsOptions: {
    rejectUnauthorized: false,
  },
}

const imap = new IMAP(imapConfig)

export function connect(): Promise<IMAP> | null {
  return new Promise((resolve, reject) => {
    if (imap.state === "connected") return resolve(imap)

    imap.once("ready", () => {
      resolve(imap)
    })
    imap.once("error", (err: any) => {
      reject(err)
    })
    imap.connect()
  })
}

export function disconnect(): Promise<void> {
  return new Promise((resolve, reject) => {
    imap.once("end", () => {
      resolve()
    })
    imap.once("error", (err: any) => {
      reject(err)
    })
    imap.end()
  })
}

export type Mailbox = { id: string; label: string }
export type MailboxListPromise = Promise<{
  data: Mailbox[] | null
  error: Error | null
}>
export const getMailboxes = (imap: IMAP): MailboxListPromise => {
  return new Promise((resolve, reject) => {
    imap.getBoxes((err, boxes) => {
      // Error result
      if (err) {
        return reject({ data: null, error: err })
      }
      // Success result

      const exclude = ["INBOX", "[Gmail]"]
      const labels = Object.keys(boxes)
        .filter((x) => !exclude.includes(x))
        .sort((a, b) => a.localeCompare(b))
      return resolve({
        data: labels.map((label: string) => ({
          id: label,
          label,
        })),
        error: null,
      })
    })
  })
}

export type Email = { id: string; label: string }
export type EmailListPromise = Promise<{
  data: Email[] | null
  error: Error | null
}>
export function getEmails(imap: IMAP, mailboxId: string): EmailListPromise {
  const readyOnly = true
  const openMailbox = util.promisify(imap.openBox)

  // From yesterday
  const searchFrom = new Date()
  searchFrom.setDate(searchFrom.getDate() - 1)

  return new Promise(async (resolve, reject) => {
    // // Open the mailbox
    // await openMailbox(mailboxId).catch((error) => {
    //   return reject({ data: null, error })
    // })

    imap.openBox(mailboxId, readyOnly, (err, boxes) => {
      // Error result
      if (err) {
        return reject({ data: null, error: err })
      }
      // Success result

      imap.search([["SINCE", searchFrom]], (err, results) => {
        // Error result
        if (err) {
          return reject({ data: null, error: err })
        }

        console.log("searchFrom", searchFrom)
        console.log("emails", results)
        return resolve({ data: [], error: null })
      })
    })
  })
}
