export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { isAdminAuthenticated } from "@/lib/admin-auth"

// GET — list all feedback
export async function GET(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const rows = await sql`
      SELECT id, message, category, response, responded_at, created_at, status
      FROM feedback
      ORDER BY created_at DESC
      LIMIT 200
    `
    return NextResponse.json({ feedback: rows })
  } catch (e) {
    console.error("[admin/feedback GET]", e)
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 })
  }
}

// PATCH — add admin response and/or update status
export async function PATCH(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json()
    const { id } = body
    const newResponse: string | undefined = body.response
    const newStatus: string | undefined   = body.status

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 })
    }

    // Build update conditionally to avoid Postgres type-inference errors with null params
    let rows
    if (newResponse !== undefined && newStatus !== undefined) {
      rows = await sql`
        UPDATE feedback
        SET response = ${newResponse}, responded_at = now(), status = ${newStatus}
        WHERE id = ${id} RETURNING *
      `
    } else if (newResponse !== undefined) {
      rows = await sql`
        UPDATE feedback
        SET response = ${newResponse}, responded_at = now()
        WHERE id = ${id} RETURNING *
      `
    } else if (newStatus !== undefined) {
      rows = await sql`
        UPDATE feedback
        SET status = ${newStatus}
        WHERE id = ${id} RETURNING *
      `
    } else {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    return NextResponse.json({ feedback: rows[0] })
  } catch (e) {
    console.error("[admin/feedback PATCH]", e)
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 })
  }
}

// DELETE — remove a feedback entry
export async function DELETE(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    await sql`DELETE FROM feedback WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[admin/feedback DELETE]", e)
    return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 })
  }
}
