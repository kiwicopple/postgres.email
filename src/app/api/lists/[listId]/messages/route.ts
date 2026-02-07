import { NextRequest, NextResponse } from "next/server"
import { getListDetail } from "@/models/list"

export async function GET(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
  const { listId } = params
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = parseInt(searchParams.get("offset") || "0")

  const { data, error } = await getListDetail(listId, { limit, offset })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "List not found" }, { status: 404 })
  }

  return NextResponse.json({
    messages: data.messages,
    pagination: data.pagination
  })
}
