const fs = require("fs")
const { mboxReader } = require("mbox-reader")
const { simpleParser } = require("mailparser")
const { Pool } = require("pg")
const iconv = require("iconv-lite")

// PostgreSQL pool configuration
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function parseMboxFile(filePath) {
  const stream = fs.createReadStream(filePath)

  for await (const message of mboxReader(stream)) {
    const id = message.headers.get("message-id")?.[0]
    try {
      // console.log("parsed.headers", parsed.headers)
      // console.log("parsed.cc", parsed.cc.value)
      if (id === undefined) {
        console.log("Skipping message without message ID")
        continue
      }
      const parsed = await simpleParser(message.content)
      const messageData = {
        id: message.headers.get("message-id")?.[0], // Assuming message ID is unique
        in_reply_to: message.headers.get("in-reply-to")?.[0],
        ts: message.time ? new Date(message.time) : null,
        subject: parsed.subject,
        from_email:
          parsed.from?.value[0].address ||
          parsed.from.text ||
          parsed.from?.value[0],
        from_addresses: parsed.from.value,
        to_addresses: parsed.to.value,
        cc_addresses: parsed.cc.value,
        bcc_addresses: null, // Extract if available
        seq_num: null, // Determine how to generate this
        size: message.readSize,
        attachments: JSON.stringify([]), // Extract if available
        body_text: convertToUTF8(parsed.text),
        embedded_files: JSON.stringify([]), // Extract if available
        headers: Object.fromEntries(parsed.headers),
      }

      await insertMessageIntoDB(messageData)
    } catch (err) {
      console.error("Skipping failed parse:", id)
    }
  }
}

function convertToUTF8(text) {
  return iconv.decode(Buffer.from(text), "utf-8")
}

async function insertMessageIntoDB(messageData) {
  // console.log("Inserting: ", { ...messageData, body_text: null, headers: null })
  console.log("Inserting: ", messageData.id)
  const query = `
        INSERT INTO messages (
            id, 
            mailbox_id, 
            in_reply_to, 
            ts, 
            subject, 
            from_email,
            from_addresses,
            to_addresses, 
            cc_addresses, 
            bcc_addresses, 
            size, 
            attachments, 
            body_text, 
            embedded_files, 
            headers
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          body_text = EXCLUDED.body_text,
          from_email = EXCLUDED.from_email,
          from_addresses = EXCLUDED.from_addresses,
          to_addresses = EXCLUDED.to_addresses,
          cc_addresses = EXCLUDED.cc_addresses
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
      JSON.stringify(messageData.from_addresses),
      JSON.stringify(messageData.to_addresses),
      JSON.stringify(messageData.cc_addresses),
      JSON.stringify(messageData.bcc_addresses),
      messageData.size,
      messageData.attachments,
      messageData.body_text,
      messageData.embedded_files,
      JSON.stringify(messageData.headers),
    ])
  } catch (err) {
    console.error("Failed to insert message into database:", err)
  }
}

const mboxFilePath = "archives/pgsql-hackers.202404"
parseMboxFile(mboxFilePath)
