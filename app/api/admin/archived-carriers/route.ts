export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { isAdminAuthenticated } from "@/lib/admin-auth"

// GET — list all archived carriers
export async function GET(req: Request) {
  if (!(await isAdminAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const rows = await sql`
      SELECT id, name, reason, archived_by, archived_at
      FROM archived_carriers
      WHERE restored_at IS NULL
      ORDER BY archived_at DESC
    `
    return NextResponse.json({ carriers: rows })
  } catch (e) {
    console.error("[archived-carriers GET]", e)
    return NextResponse.json({ error: "Failed to fetch archived carriers" }, { status: 500 })
  }
}

// POST — archive a carrier
export async function POST(req: Request) {
  if (!(await isAdminAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { name, reason } = await req.json()
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }
    const rows = await sql`
      INSERT INTO archived_carriers (name, reason, archived_by)
      VALUES (${name}, ${reason ?? null}, 'admin')
      ON CONFLICT (name) DO UPDATE
        SET reason = EXCLUDED.reason,
            archived_at = now(),
            restored_at = NULL
      RETURNING *
    `
    return NextResponse.json({ carrier: rows[0] })
  } catch (e) {
    console.error("[archived-carriers POST]", e)
    return NextResponse.json({ error: "Failed to archive carrier" }, { status: 500 })
  }
}

// DELETE — restore a carrier (soft restore via restored_at timestamp)
export async function DELETE(req: Request) {
  if (!(await isAdminAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { name } = await req.json()
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }
    await sql`
      UPDATE archived_carriers
      SET restored_at = now()
      WHERE name = ${name}
    `
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[archived-carriers DELETE]", e)
    return NextResponse.json({ error: "Failed to restore carrier" }, { status: 500 })
  }
}
