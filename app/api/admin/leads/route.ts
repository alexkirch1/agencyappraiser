import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import sql from "@/lib/db"

async function isAuthenticated() {
  const SESSION_SECRET = process.env.SESSION_SECRET || "agency-appraiser-admin-secret-2024"
  const cookieStore = await cookies()
  const session = cookieStore.get("admin_session")
  if (!session?.value) return false
  try {
    const decoded = Buffer.from(session.value, "base64").toString()
    const parts = decoded.split(":")
    // Token format: username:timestamp:secret (secret may contain colons)
    return parts.length >= 3 && parts.slice(2).join(":") === SESSION_SECRET
  } catch {
    return false
  }
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
        fv.revenue_y2,
        fv.revenue_y3,
        fv.retention_rate,
        fv.sde_ebitda,
        fv.year_established,
        fv.employee_count,
        fv.owner_compensation,
        fv.annual_payroll_cost,
        fv.revenue_per_employee,
        fv.client_concentration,
        fv.carrier_diversification,
        fv.scope_of_sale,
        fv.avg_client_tenure,
        fv.new_business_value,
        fv.staff_retention_risk,
        fv.office_structure,
        fv.top_carriers,
        fv.producer_agreements,
        fv.closing_timeline,
        fv.primary_state,
        fv.eo_claims,
        fv.policy_mix,
        fv.agency_description,
        qv.revenue        AS quick_revenue,
        qv.retention      AS quick_retention,
        qv.book_type,
        qv.growth,
        qv.policy_ratio,
        qv.policies       AS quick_policies,
        qv.customers      AS quick_customers,
        qv.multiplier     AS quick_multiplier,
        qv.suggested_mult,
        qv.low_value      AS quick_low,
        qv.mid_value      AS quick_mid,
        qv.high_value     AS quick_high,
        qv.tier,
        qs.total_score,
        qs.max_score,
        qs.percentage     AS quiz_pct,
        qs.grade          AS quiz_grade,
        qs.answers        AS quiz_answers
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
