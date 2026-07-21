export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { quickValuationAgentEmail, quickValuationAdminEmail } from "@/lib/email-templates"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const ADMIN_EMAIL = "alex@rockyquote.com"

async function sendEmail(to: string, subject: string, html: string, from: string, replyTo?: string) {
  if (!RESEND_API_KEY) return
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(`Resend error ${res.status}: ${JSON.stringify(json)}`)
  }
}

export async function POST(req: Request) {
  // Env var presence check — helps debug missing config without leaking values
  console.log("[v0] save-quick-valuation: DATABASE_URL set?", !!process.env.DATABASE_URL)
  console.log("[v0] save-quick-valuation: RESEND_API_KEY set?", !!process.env.RESEND_API_KEY)

  // Rate limit: 20 saves per IP per 10 minutes (generous — users iterate)
  const { allowed } = rateLimit(`save-quick-val:${getClientIp(req)}`, 20, 10 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { leadId, revenue, retention, bookType, growth, customers, policies, ratio, multiplier, suggested, lowValue, midValue, highValue, tier, isSuspiciousData } = body

    // Validate numeric fields are numbers and within plausible bounds
    const numericFields: Record<string, unknown> = { revenue, retention, customers, policies, ratio, multiplier, suggested, lowValue, midValue, highValue }
    for (const [field, val] of Object.entries(numericFields)) {
      if (val != null && (typeof val !== "number" || !isFinite(val) || val < 0 || val > 1_000_000_000)) {
        return NextResponse.json({ error: `Invalid value for field: ${field}` }, { status: 400 })
      }
    }
    if (tier != null && (typeof tier !== "string" || tier.length > 50)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 })
    }
    if (bookType != null && (typeof bookType !== "string" || bookType.length > 100)) {
      return NextResponse.json({ error: "Invalid bookType" }, { status: 400 })
    }

    const rows = await sql`
      INSERT INTO quick_valuations (
        lead_id, revenue, retention, book_type, growth,
        customers, policies, policy_ratio,
        multiplier, suggested_mult,
        low_value, mid_value, high_value, tier
      ) VALUES (
        ${leadId ?? null},
        ${revenue ?? null}, ${retention ?? null}, ${bookType ?? null}, ${growth ?? null},
        ${customers ?? null}, ${policies ?? null}, ${ratio ?? null},
        ${multiplier ?? null}, ${suggested ?? null},
        ${lowValue ?? null}, ${midValue ?? null}, ${highValue ?? null}, ${tier ?? null}
      )
      RETURNING id
    `

    // Send emails — non-fatal: errors are logged but never break the DB save response
    if (RESEND_API_KEY && leadId) {
      try {
        const leadRows = await sql`SELECT name, email, phone, agency_name FROM leads WHERE id = ${leadId} LIMIT 1`
        const lead = leadRows[0]

        if (lead?.email) {
          const firstName = (lead.name ?? "there").split(" ")[0]

          // Email 1: Agent valuation report
          const agentPayload = quickValuationAgentEmail({
            firstName,
            agencyName: lead.agency_name ?? undefined,
            lowValue: lowValue ?? 0,
            highValue: highValue ?? 0,
            suggested: suggested ?? multiplier ?? 0,
            tier: tier ?? "Standard",
            revenue: revenue ?? 0,
            retention: retention ?? undefined,
            policies: policies ?? undefined,
            leadId,
          })
          await sendEmail(lead.email, agentPayload.subject, agentPayload.html, agentPayload.from)

          // Email 2: Admin notification with all form fields
          const adminPayload = quickValuationAdminEmail({
            leadName: lead.name ?? "Unknown",
            leadEmail: lead.email,
            leadPhone: lead.phone ?? undefined,
            agencyName: lead.agency_name ?? undefined,
            leadId,
            revenue: revenue ?? 0,
            retention: retention ?? undefined,
            bookType: bookType ?? undefined,
            growth: growth ?? undefined,
            customers: customers ?? undefined,
            policies: policies ?? undefined,
            ratio: ratio ?? undefined,
            multiplier: multiplier ?? 0,
            suggested: suggested ?? multiplier ?? 0,
            lowValue: lowValue ?? 0,
            highValue: highValue ?? 0,
            tier: tier ?? "Standard",
          })
          const adminSubject = isSuspiciousData
            ? `⚠️ SUSPICIOUS DATA FLAG — ${adminPayload.subject}`
            : adminPayload.subject
          await sendEmail(ADMIN_EMAIL, adminSubject, adminPayload.html, adminPayload.from, lead.email)
        }
      } catch (emailErr) {
        // Non-fatal — log but never crash the save response
        console.error("[save-quick-valuation] Email send failed:", emailErr)
      }
    }

    return NextResponse.json({ success: true, id: rows[0]?.id })
  } catch (err) {
    console.error("[v0] save-quick-valuation error:", err)
    return NextResponse.json({ error: "Failed to save quick valuation" }, { status: 500 })
  }
}
