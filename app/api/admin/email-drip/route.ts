export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { isAdminAuthenticated } from "@/lib/admin-auth"

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const rows = await sql`
      SELECT
        ed.id,
        ed.lead_id,
        ed.sequence,
        ed.status,
        ed.send_after,
        ed.sent_at,
        ed.created_at,
        l.name   AS lead_name,
        l.email  AS lead_email,
        l.tool_used,
        l.estimated_value
      FROM email_drip ed
      JOIN leads l ON l.id = ed.lead_id
      WHERE l.archived = false
      ORDER BY ed.created_at DESC
      LIMIT 200
    `

    // Summary counts
    const summary = {
      pending:     rows.filter((r) => r.status === "pending").length,
      sent:        rows.filter((r) => r.status === "sent").length,
      failed:      rows.filter((r) => r.status === "failed").length,
      unsubscribed:rows.filter((r) => r.status === "unsubscribed").length,
    }

    return NextResponse.json({ rows, summary })
  } catch (err) {
    console.error("[admin/email-drip] GET error:", err)
    return NextResponse.json({ error: "Failed to fetch email drip data" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id, action } = await req.json()
    if (!id || !action) return NextResponse.json({ error: "Missing id or action" }, { status: 400 })

    if (action === "retry") {
      await sql`
        UPDATE email_drip
        SET status = 'pending', send_after = now()
        WHERE id = ${id} AND status = 'failed'
      `
      return NextResponse.json({ ok: true })
    }

    if (action === "cancel") {
      await sql`
        UPDATE email_drip SET status = 'unsubscribed' WHERE id = ${id}
      `
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err) {
    console.error("[admin/email-drip] POST error:", err)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
