import { NextResponse } from "next/server"
import { getThreadIdByMessageId } from "@/models/thread"
import { normalizeMessageId } from "@/lib/formatters"

export async function GET(
  _request: Request,
  { params }: { params: { messageId: string } }
) {
  const { messageId: rawMessageId } = params
  const messageId = normalizeMessageId(decodeURIComponent(rawMessageId))

  const { threadId, mailboxId, error } = await getThreadIdByMessageId(messageId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!threadId || !mailboxId) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 })
  }

  return NextResponse.json({
    threadId,
    mailboxId,
    messageId
  })
}
