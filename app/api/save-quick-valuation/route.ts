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
  // Rate limit: 20 saves per IP per 10 minutes (generous — users iterate)
  const { allowed } = rateLimit(`save-quick-val:${getClientIp(req)}`, 20, 10 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { leadId, name, email, sendReport, revenue, retention, bookType, growth, customers, policies, ratio, multiplier, suggested, lowValue, midValue, highValue, tier, isSuspiciousData } = body

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

    // If sendReport=true and name+email provided, upsert a lead record so we
    // have a full contact on file, then send both the agent report and admin notification.
    let resolvedLeadId = leadId ?? null
    if (sendReport && name && email) {
      try {
        const cleanName  = String(name).slice(0, 200)
        const cleanEmail = String(email).slice(0, 200)
        const existing = await sql`SELECT id FROM leads WHERE email = ${cleanEmail} LIMIT 1`
        if (existing.length > 0) {
          resolvedLeadId = existing[0].id
        } else {
          const inserted = await sql`
            INSERT INTO leads (name, email, tool_used, estimated_value)
            VALUES (${cleanName}, ${cleanEmail}, 'quick_value', ${midValue ?? null})
            RETURNING id
          `
          resolvedLeadId = inserted[0].id
          // Queue drip follow-ups (seq 1 = confirmation, marked sent since we send it now)
          const day3 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          const day7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          await sql`
            INSERT INTO email_drip (lead_id, sequence, send_after, status)
            VALUES
              (${resolvedLeadId}, 1, NOW(), 'sent'),
              (${resolvedLeadId}, 2, ${day3.toISOString()}, 'pending'),
              (${resolvedLeadId}, 3, ${day7.toISOString()}, 'pending')
            ON CONFLICT (lead_id, sequence) DO NOTHING
          `.catch(() => {})
        }
        // Backfill the quick_valuation row with the resolved lead id
        if (rows[0]?.id) {
          await sql`UPDATE quick_valuations SET lead_id = ${resolvedLeadId} WHERE id = ${rows[0].id}`.catch(() => {})
        }
      } catch (leadErr) {
        console.error("[save-quick-valuation] Lead upsert failed:", leadErr)
      }
    }

    // Send emails — non-fatal: errors are logged but never break the DB save response
    if (RESEND_API_KEY && resolvedLeadId && sendReport) {
      try {
        const leadRows = await sql`SELECT name, email, phone, agency_name FROM leads WHERE id = ${resolvedLeadId} LIMIT 1`
        const lead = leadRows[0] ?? { name, email, phone: null, agency_name: null }

        if (lead?.email) {
          const firstName = ((lead.name ?? name ?? "there") as string).split(" ")[0]

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
            leadId: resolvedLeadId,
          })
          await sendEmail(lead.email, agentPayload.subject, agentPayload.html, agentPayload.from)

          // Email 2: Admin notification with all form fields
          const adminPayload = quickValuationAdminEmail({
            leadName: lead.name ?? "Unknown",
            leadEmail: lead.email,
            leadPhone: lead.phone ?? undefined,
            agencyName: lead.agency_name ?? undefined,
            leadId: resolvedLeadId,
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

    return NextResponse.json({ success: true, id: rows[0]?.id, leadId: resolvedLeadId })
  } catch (err) {
    console.error("[v0] save-quick-valuation error:", err)
    return NextResponse.json({ error: "Failed to save quick valuation" }, { status: 500 })
  }
}
