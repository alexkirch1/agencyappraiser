export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { thankYouEmail, quickValuationAdminEmail, buildReportPdf } from "@/lib/email-templates"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const ADMIN_EMAIL = "alex@rockyquote.com"

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  from: string,
  opts?: { replyTo?: string; pdfBase64?: string; pdfFilename?: string }
) {
  if (!RESEND_API_KEY) return
  const body: Record<string, unknown> = { from, to: [to], subject, html }
  if (opts?.replyTo) body.reply_to = opts.replyTo
  if (opts?.pdfBase64) {
    body.attachments = [{ filename: opts.pdfFilename ?? "valuation-report.pdf", content: opts.pdfBase64 }]
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify(body),
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
    // When sendReport=true, only require the PDF-needed fields; allow others to be null/undefined
    const requiredFields = sendReport
      ? { revenue, lowValue, midValue, highValue }
      : { revenue, retention, customers, policies, ratio, multiplier, suggested, lowValue, midValue, highValue }
    for (const [field, val] of Object.entries(requiredFields)) {
      if (typeof val !== "number" || !isFinite(val) || val < 0 || val > 1_000_000_000) {
        return NextResponse.json({ error: `Invalid value for field: ${field}` }, { status: 400 })
      }
    }
    // Optional fields: allow null/undefined only
    if (!sendReport) {
      const optionalNumeric: Record<string, unknown> = { retention, customers, policies, ratio, multiplier, suggested }
      for (const [field, val] of Object.entries(optionalNumeric)) {
        if (val != null && (typeof val !== "number" || !isFinite(val) || val < 0 || val > 1_000_000_000)) {
          return NextResponse.json({ error: `Invalid value for field: ${field}` }, { status: 400 })
        }
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

          // Build the PDF report attachment with all form inputs
          const pdfBase64 = await buildReportPdf({
            type: "quick",
            name: lead.name ?? firstName,
            agencyName: lead.agency_name ?? undefined,
            revenue: revenue ?? 0,
            lowValue: lowValue ?? 0,
            highValue: highValue ?? 0,
            suggested: suggested ?? multiplier ?? 0,
            retention: typeof retention === "string" && retention ? retention : undefined,
            bookType:  typeof bookType  === "string" && bookType  ? bookType  : undefined,
            growth:    typeof growth    === "string" && growth    ? growth    : undefined,
            customers: typeof customers === "number" ? customers : undefined,
            policies:  typeof policies  === "number" ? policies  : undefined,
          })

          // Email 1: Simple thank-you to the lead with PDF attached
          const tyPayload = thankYouEmail({
            firstName,
            agencyName: lead.agency_name ?? undefined,
          })
          await sendEmail(lead.email, tyPayload.subject, tyPayload.html, tyPayload.from, {
            pdfBase64,
            pdfFilename: "agency-valuation-report.pdf",
          })

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
            ? `[SUSPICIOUS DATA] ${adminPayload.subject}`
            : adminPayload.subject
          await sendEmail(ADMIN_EMAIL, adminSubject, adminPayload.html, adminPayload.from, { replyTo: lead.email })
        }
      } catch (emailErr) {
        console.error("[save-quick-valuation] Email send failed:", emailErr)
      }
    }

    return NextResponse.json({ success: true, id: rows[0]?.id, leadId: resolvedLeadId })
  } catch (err) {
    console.error("[v0] save-quick-valuation error:", err)
    return NextResponse.json({ error: "Failed to save quick valuation" }, { status: 500 })
  }
}
