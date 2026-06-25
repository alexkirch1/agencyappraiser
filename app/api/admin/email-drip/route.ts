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
        l.estimated_value,
        l.archived AS lead_archived
      FROM email_drip ed
      JOIN leads l ON l.id = ed.lead_id
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

    // Trigger the drip processor immediately
    if (action === "trigger") {
      const appUrl = process.env.NEXT_PUBLIC_BASE_URL
        ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (process.env.CRON_SECRET) headers["Authorization"] = `Bearer ${process.env.CRON_SECRET}`
      const res = await fetch(`${appUrl}/api/send-drip-email`, { method: "POST", headers })
      const result = await res.json()
      return NextResponse.json({ ok: true, ...result })
    }

    // Queue a fresh drip sequence for a lead (by lead_id)
    if (action === "queue" && id) {
      const now = new Date()
      const day2 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
      const day5 = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
      await sql`
        INSERT INTO email_drip (lead_id, sequence, send_after)
        VALUES
          (${id}, 1, ${now.toISOString()}),
          (${id}, 2, ${day2.toISOString()}),
          (${id}, 3, ${day5.toISOString()})
        ON CONFLICT (lead_id, sequence) DO UPDATE
          SET status = 'pending', send_after = EXCLUDED.send_after, sent_at = NULL
      `
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err) {
    console.error("[admin/email-drip] POST error:", err)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
