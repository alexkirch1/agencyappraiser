import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { headers } from "next/headers"

async function verifyAdmin(): Promise<boolean> {
  const hdrs = await headers()
  const auth = hdrs.get("authorization")
  if (!auth?.startsWith("Bearer ")) return false
  const token = auth.slice(7)
  const rows = await sql`
    SELECT id FROM admin_sessions WHERE token = ${token} AND expires_at > NOW()
  `
  return rows.length > 0
}

// POST /api/leads/restore-last
// Finds the most recently soft-deleted lead and restores it (sets deleted_at = NULL).
export async function POST() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const rows = await sql`
      SELECT id, name, email, agency_name, deleted_at
      FROM leads
      WHERE deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "No trashed leads found" }, { status: 404 })
    }

    const lead = rows[0]

    await sql`
      UPDATE leads
      SET deleted_at = NULL, last_activity = NOW()
      WHERE id = ${lead.id}
    `

    return NextResponse.json({ success: true, restored: lead })
  } catch (err) {
    console.error("[restore-last] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
