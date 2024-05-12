const fs = require("fs")
const { mboxReader } = require("mbox-reader")
const { simpleParser } = require("mailparser")
const { Pool } = require("pg")
const iconv = require("iconv-lite")

// PostgreSQL pool configuration
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: "postgres",
  port: 54322,
})

async function parseMboxFile(filePath) {
  const stream = fs.createReadStream(filePath)

  for await (const message of mboxReader(stream)) {
    const parsed = await simpleParser(message.content)
    const messageData = {
      id: message.headers.get("message-id")?.[0], // Assuming message ID is unique
      in_reply_to: message.headers.get("in-reply-to")?.[0],
      ts: message.time ? new Date(message.time) : null,
      subject: message.headers.get("subject")?.[0],
      from_email: message.headers.get("from")?.[0],
      to_addresses: JSON.stringify(message.headers.get("to")),
      cc_addresses: JSON.stringify(message.headers.get("cc")),
      bcc_addresses: JSON.stringify(message.headers.get("bcc")), // Add if available
      from_addresses: JSON.stringify([message.headers.get("from")?.[0]]),
      seq_num: null, // Determine how to generate this, if needed
      size: message.readSize,
      attachments: JSON.stringify([]), // Extract if available
      body_text: convertToUTF8(parsed.text),
      embedded_files: JSON.stringify([]), // Extract if available
      headers: JSON.stringify(Object.fromEntries(message.headers)),
    }

    await insertMessageIntoDB(messageData)
  }
}

function convertToUTF8(text) {
  return iconv.decode(Buffer.from(text), "utf-8")
}

async function insertMessageIntoDB(messageData) {
  // Skip messages without a message ID
  if (messageData.id === undefined) {
    return
  }
  console.log("Inserting: ", messageData.subject)
  const query = `
        INSERT INTO messages (
            id, mailbox_id, in_reply_to, ts, subject, from_email,
            to_addresses, cc_addresses, bcc_addresses, from_addresses,
            seq_num, size, attachments, body_text, embedded_files, headers
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          body_text = EXCLUDED.body_text
        ;
    `
  try {
    await pool.query(query, [
      messageData.id,
      "pgsql-hackers",
      messageData.in_reply_to,
      messageData.ts,
      messageData.subject,
      messageData.from_email,
      messageData.to_addresses,
      messageData.cc_addresses,
      messageData.bcc_addresses,
      messageData.from_addresses,
      messageData.seq_num,
      messageData.size,
      messageData.attachments,
      messageData.body_text,
      messageData.embedded_files,
      messageData.headers,
    ])
  } catch (err) {
    console.error("Failed to insert message into database:", err)
  }
}

const mboxFilePath = "archives/pgsql-hackers.202404"
parseMboxFile(mboxFilePath)
