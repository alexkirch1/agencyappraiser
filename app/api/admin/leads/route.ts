import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import sql from "@/lib/db"

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get("admin-auth")?.value === process.env.ADMIN_SECRET
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const leads = await sql`
      SELECT
        l.id,
        l.name,
        l.email,
        l.phone,
        l.agency_name,
        l.tool_used,
        l.estimated_value,
        l.pipedrive_deal_id,
        l.created_at,
        fv.low_offer,
        fv.high_offer,
        fv.core_score,
        fv.calculated_multiple,
        fv.risk_grade,
        fv.revenue_ltm,
        fv.retention_rate,
        qv.revenue        AS quick_revenue,
        qv.retention      AS quick_retention,
        qv.book_type,
        qv.growth,
        qv.policy_ratio,
        qv.suggested_mult,
        qv.low_value      AS quick_low,
        qv.mid_value      AS quick_mid,
        qv.high_value     AS quick_high,
        qv.tier,
        qs.total_score,
        qs.max_score,
        qs.percentage     AS quiz_pct,
        qs.grade          AS quiz_grade
      FROM leads l
      LEFT JOIN full_valuations  fv ON fv.lead_id = l.id
      LEFT JOIN quick_valuations qv ON qv.lead_id = l.id
      LEFT JOIN quiz_submissions qs ON qs.lead_id = l.id
      ORDER BY l.created_at DESC
      LIMIT 200
    `

    // Also fetch summary stats
    const stats = await sql`
      SELECT
        (SELECT COUNT(*) FROM leads)              AS total_leads,
        (SELECT COUNT(*) FROM full_valuations)    AS full_valuations,
        (SELECT COUNT(*) FROM quick_valuations)   AS quick_valuations,
        (SELECT COUNT(*) FROM quiz_submissions)   AS quiz_submissions,
        (SELECT AVG(estimated_value) FROM leads WHERE estimated_value IS NOT NULL)::NUMERIC(15,2) AS avg_value
    `

    return NextResponse.json({ leads, stats: stats[0] })
  } catch (err) {
    console.error("[v0] admin leads fetch error:", err)
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
  }
}
