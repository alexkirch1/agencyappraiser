export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import sql from "@/lib/db"

// Public endpoint — no auth required. Returns only safe display fields.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const leadId = parseInt(id)
  if (isNaN(leadId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  try {
    const rows = await sql`
      SELECT
        l.id,
        l.name,
        l.agency_name,
        l.tool_used,
        l.estimated_value,
        l.valuation_summary,
        l.created_at,
        fv.low_offer,
        fv.high_offer,
        fv.primary_state,
        fv.annual_revenue,
        fv.retention_rate,
        fv.book_type,
        qv.low_estimate  AS qv_low,
        qv.high_estimate AS qv_high,
        qv.revenue       AS qv_revenue
      FROM leads l
      LEFT JOIN full_valuations  fv ON fv.lead_id = l.id
      LEFT JOIN quick_valuations qv ON qv.lead_id = l.id
      WHERE l.id = ${leadId}
        AND l.archived = false
      LIMIT 1
    `

    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Strip PII — only return name (first name only) and valuation data
    const row = rows[0]
    const firstName = (row.name as string)?.split(" ")[0] ?? "Agency Owner"

    return NextResponse.json({
      id: row.id,
      firstName,
      agencyName: row.agency_name,
      toolUsed: row.tool_used,
      estimatedValue: row.estimated_value,
      valuationSummary: row.valuation_summary,
      createdAt: row.created_at,
      // Full valuation fields
      lowOffer: row.low_offer,
      highOffer: row.high_offer,
      state: row.primary_state,
      annualRevenue: row.annual_revenue,
      retentionRate: row.retention_rate,
      bookType: row.book_type,
      // Quick valuation fields
      qvLow: row.qv_low,
      qvHigh: row.qv_high,
      qvRevenue: row.qv_revenue,
    })
  } catch (err) {
    console.error("[valuations/[id]] error:", err)
    return NextResponse.json({ error: "Failed to load valuation" }, { status: 500 })
  }
}
