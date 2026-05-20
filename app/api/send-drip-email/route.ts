// Drip email processor — called by Vercel cron every hour
// Also handles GET /api/send-drip-email?lead=ID&seq=all for one-click unsubscribe

import { NextRequest, NextResponse } from "next/server"
import sql from "@/lib/db"
import { leadConfirmationEmail, dripEmail2, dripEmail3 } from "@/lib/email-templates"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const CRON_SECRET = process.env.CRON_SECRET
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://agencyappraiser.com"

type DripRow = {
  id: number
  lead_id: number
  sequence: number
  lead_name: string
  lead_email: string
  agency_name: string | null
  estimated_value: string | null
  valuation_summary: string | null
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  from: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log("[drip] No RESEND_API_KEY — skipping send")
    return false
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })
    const json = await res.json()
    if (!res.ok) {
      console.error("[drip] Resend error:", json)
      return false
    }
    return true
  } catch (err) {
    console.error("[drip] Send failed:", err)
    return false
  }
}

// GET — one-click unsubscribe
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const leadId = parseInt(searchParams.get("lead") ?? "")
  const seq = searchParams.get("seq")

  if (!leadId || isNaN(leadId)) {
    return new NextResponse("Invalid unsubscribe link", { status: 400 })
  }

  try {
    if (seq === "all") {
      await sql`
        UPDATE email_drip SET status = 'unsubscribed'
        WHERE lead_id = ${leadId} AND status = 'pending'
      `
    } else {
      const seqNum = parseInt(seq ?? "")
      if (!isNaN(seqNum)) {
        await sql`
          UPDATE email_drip SET status = 'unsubscribed'
          WHERE lead_id = ${leadId} AND sequence = ${seqNum} AND status = 'pending'
        `
      }
    }

    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Unsubscribed</title></head>
      <body style="font-family:-apple-system,sans-serif;max-width:480px;margin:80px auto;text-align:center;padding:24px;color:#0f172a;">
        <h1 style="font-size:24px;font-weight:700;margin:0 0 12px;">You&apos;re unsubscribed</h1>
        <p style="color:#64748b;margin:0 0 24px;">You won&apos;t receive any more follow-up emails from Agency Appraiser.</p>
        <a href="${BASE_URL}" style="display:inline-block;padding:12px 28px;background:#0ea5e9;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
          Back to Agency Appraiser
        </a>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    )
  } catch (err) {
    console.error("[drip] Unsubscribe error:", err)
    return new NextResponse("Error processing unsubscribe", { status: 500 })
  }
}

// POST — hourly cron processor
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const pending = await sql<DripRow[]>`
      SELECT
        d.id,
        d.lead_id,
        d.sequence,
        l.name            AS lead_name,
        l.email           AS lead_email,
        l.agency_name,
        l.estimated_value,
        l.valuation_summary
      FROM email_drip d
      JOIN leads l ON l.id = d.lead_id
      WHERE d.status = 'pending'
        AND d.send_after <= now()
        AND l.archived = false
      ORDER BY d.send_after ASC
      LIMIT 50
    `

    if (pending.length === 0) {
      return NextResponse.json({ sent: 0, message: "No pending emails" })
    }

    let sent = 0
    let failed = 0

    for (const row of pending) {
      const firstName = row.lead_name.split(" ")[0] ?? row.lead_name
      let payload: { from: string; html: string; subject: string } | null = null

      if (row.sequence === 1) {
        payload = leadConfirmationEmail({
          firstName,
          agencyName: row.agency_name ?? undefined,
          estimatedValue: row.estimated_value ?? undefined,
          valuationSummary: row.valuation_summary ?? undefined,
          leadId: row.lead_id,
        })
      } else if (row.sequence === 2) {
        payload = dripEmail2({
          firstName,
          agencyName: row.agency_name ?? undefined,
          estimatedValue: row.estimated_value ?? undefined,
          leadId: row.lead_id,
        })
      } else if (row.sequence === 3) {
        payload = dripEmail3({
          firstName,
          agencyName: row.agency_name ?? undefined,
          estimatedValue: row.estimated_value ?? undefined,
          leadId: row.lead_id,
        })
      }

      if (!payload) continue

      const ok = await sendViaResend(row.lead_email, payload.subject, payload.html, payload.from)

      if (ok) {
        await sql`UPDATE email_drip SET status = 'sent', sent_at = now() WHERE id = ${row.id}`
        sent++
      } else {
        await sql`UPDATE email_drip SET status = 'failed' WHERE id = ${row.id}`
        failed++
      }
    }

    return NextResponse.json({ sent, failed, total: pending.length })
  } catch (err) {
    console.error("[drip] Cron error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
