export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { isAdminAuthenticated } from "@/lib/admin-auth"

// GET — list all archived items, optionally filtered by section
export async function GET(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(req.url)
    const section = searchParams.get("section")

    const rows = section
      ? await sql`
          SELECT id, section, name, identifier, reason, archived_by, archived_at, notes
          FROM site_archive
          WHERE restored_at IS NULL AND section = ${section}
          ORDER BY archived_at DESC
        `
      : await sql`
          SELECT id, section, name, identifier, reason, archived_by, archived_at, notes
          FROM site_archive
          WHERE restored_at IS NULL
          ORDER BY section, archived_at DESC
        `

    return NextResponse.json({ items: rows })
  } catch (e) {
    console.error("[site-archive GET]", e)
    return NextResponse.json({ error: "Failed to fetch archive" }, { status: 500 })
  }
}

// POST — archive an item
export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { section, name, identifier, reason, notes } = await req.json()
    if (!section || !name) {
      return NextResponse.json({ error: "section and name are required" }, { status: 400 })
    }
    const rows = await sql`
      INSERT INTO site_archive (section, name, identifier, reason, notes, archived_by)
      VALUES (${section}, ${name}, ${identifier ?? null}, ${reason ?? null}, ${notes ?? null}, 'admin')
      ON CONFLICT (section, name) DO UPDATE
        SET reason = EXCLUDED.reason,
            identifier = EXCLUDED.identifier,
            notes = EXCLUDED.notes,
            archived_at = now(),
            restored_at = NULL
      RETURNING *
    `
    return NextResponse.json({ item: rows[0] })
  } catch (e) {
    console.error("[site-archive POST]", e)
    return NextResponse.json({ error: "Failed to archive item" }, { status: 500 })
  }
}

// PATCH — update notes on an archived item
export async function PATCH(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { id, notes } = await req.json()
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
    await sql`UPDATE site_archive SET notes = ${notes ?? null} WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[site-archive PATCH]", e)
    return NextResponse.json({ error: "Failed to update notes" }, { status: 500 })
  }
}

// DELETE — restore an item (soft restore)
export async function DELETE(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
    await sql`UPDATE site_archive SET restored_at = now() WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[site-archive DELETE]", e)
    return NextResponse.json({ error: "Failed to restore item" }, { status: 500 })
  }
}
