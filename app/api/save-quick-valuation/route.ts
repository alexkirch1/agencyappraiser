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

    const isValidNumber = (v: unknown): v is number =>
      typeof v === "number" && isFinite(v) && v >= 0 && v <= 1_000_000_000

    for (const [field, val] of Object.entries({ revenue, lowValue, midValue, highValue })) {
      if (!isValidNumber(val)) {
        return NextResponse.json({ error: `Invalid value for field: ${field}` }, { status: 400 })
      }
    }
    for (const [field, val] of Object.entries({ customers, policies, ratio, multiplier, suggested })) {
      if (val != null && !isValidNumber(val)) {
        return NextResponse.json({ error: `Invalid value for field: ${field}` }, { status: 400 })
      }
    }
    // retention, bookType, growth and tier are category labels stored as text
    for (const [field, val] of Object.entries({ retention, bookType, growth, tier })) {
      if (val != null && (typeof val !== "string" || val.length > 100)) {
        return NextResponse.json({ error: `Invalid value for field: ${field}` }, { status: 400 })
      }
    }
    if (sendReport) {
      const validEmail = typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      if (!validEmail || typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "A valid name and email are required" }, { status: 400 })
      }
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
        ${customers != null ? Math.round(customers) : null}, ${policies != null ? Math.round(policies) : null}, ${ratio ?? null},
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
        // The name and email typed into this report form win over any older lead record
        const reportName = String(name).trim().slice(0, 200)
        const reportEmail = String(email).trim().slice(0, 200)

        if (reportEmail) {
          const firstName = reportName.split(" ")[0] || "there"

          // Build the PDF report attachment with all form inputs
          const pdfBase64 = await buildReportPdf({
            type: "quick",
            name: reportName,
            agencyName: lead.agency_name ?? undefined,
            revenue,
            lowValue,
            midValue,
            highValue,
            multiplier: multiplier ?? undefined,
            suggested: suggested ?? multiplier ?? 0,
            retention: retention || undefined,
            bookType: bookType || undefined,
            growth: growth || undefined,
            customers: customers ?? undefined,
            policies: policies ?? undefined,
          })

          // Email 1: Simple thank-you to the lead with PDF attached
          const tyPayload = thankYouEmail({
            firstName,
            agencyName: lead.agency_name ?? undefined,
          })
          await sendEmail(reportEmail, tyPayload.subject, tyPayload.html, tyPayload.from, {
            pdfBase64,
            pdfFilename: "agency-valuation-report.pdf",
          })

          // Email 2: Admin notification with all form fields
          const adminPayload = quickValuationAdminEmail({
            leadName: reportName,
            leadEmail: reportEmail,
            leadPhone: lead.phone ?? undefined,
            agencyName: lead.agency_name ?? undefined,
            leadId: resolvedLeadId,
            revenue,
            retention: retention ?? undefined,
            bookType: bookType ?? undefined,
            growth: growth ?? undefined,
            customers: customers ?? undefined,
            policies: policies ?? undefined,
            ratio: ratio ?? undefined,
            multiplier: multiplier ?? suggested ?? 0,
            suggested: suggested ?? multiplier ?? 0,
            lowValue,
            midValue,
            highValue,
            tier: tier ?? "Standard",
          })
          const adminSubject = isSuspiciousData
            ? `[SUSPICIOUS DATA] ${adminPayload.subject}`
            : adminPayload.subject
          await sendEmail(ADMIN_EMAIL, adminSubject, adminPayload.html, adminPayload.from, { replyTo: reportEmail })
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
