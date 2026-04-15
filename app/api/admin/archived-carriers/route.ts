// Backwards-compatible shim — now backed by site_archive table
export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { isAdminAuthenticated } from "@/lib/admin-auth"

export async function GET(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const rows = await sql`
      SELECT id, name, reason, archived_by, archived_at
      FROM site_archive
      WHERE restored_at IS NULL AND section = 'carriers'
      ORDER BY archived_at DESC
    `
    return NextResponse.json({ carriers: rows })
  } catch (e) {
    console.error("[archived-carriers GET]", e)
    return NextResponse.json({ error: "Failed to fetch archived carriers" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { name, reason } = await req.json()
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })
    const rows = await sql`
      INSERT INTO site_archive (section, name, reason, archived_by)
      VALUES ('carriers', ${name}, ${reason ?? null}, 'admin')
      ON CONFLICT (section, name) DO UPDATE
        SET reason = EXCLUDED.reason, archived_at = now(), restored_at = NULL
      RETURNING *
    `
    return NextResponse.json({ carrier: rows[0] })
  } catch (e) {
    console.error("[archived-carriers POST]", e)
    return NextResponse.json({ error: "Failed to archive carrier" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { name } = await req.json()
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })
    await sql`
      UPDATE site_archive SET restored_at = now()
      WHERE section = 'carriers' AND name = ${name}
    `
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[archived-carriers DELETE]", e)
    return NextResponse.json({ error: "Failed to restore carrier" }, { status: 500 })
  }
}
