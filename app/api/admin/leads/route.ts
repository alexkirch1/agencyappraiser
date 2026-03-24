import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { isAdminAuthenticated } from "@/lib/admin-auth"

export async function GET() {
  if (!(await isAdminAuthenticated())) {
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
        l.stage,
        l.last_activity,
        l.archived,
        l.archive_reason,
        l.archived_at,
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

    // Also fetch summary stats with smarter metrics
    const stats = await sql`
      SELECT
        (SELECT COUNT(*) FROM leads)              AS total_leads,
        (SELECT COUNT(*) FROM full_valuations)    AS full_valuations,
        (SELECT COUNT(*) FROM quick_valuations)   AS quick_valuations,
        (SELECT COUNT(*) FROM quiz_submissions)   AS quiz_submissions,
        (SELECT AVG(estimated_value) FROM leads WHERE estimated_value IS NOT NULL)::NUMERIC(15,2) AS avg_value,
        (SELECT SUM(estimated_value) FROM leads WHERE estimated_value IS NOT NULL)::NUMERIC(15,2) AS total_pipeline_value,
        (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '7 days') AS leads_this_week,
        (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '30 days') AS leads_this_month,
        (SELECT COUNT(*) FROM leads WHERE stage = 'won') AS won_leads,
        (SELECT COUNT(*) FROM leads WHERE stage = 'lost') AS lost_leads,
        (SELECT COUNT(*) FROM leads WHERE stage NOT IN ('won', 'lost', 'new')) AS engaged_leads,
        (SELECT AVG(estimated_value) FROM leads WHERE stage = 'won' AND estimated_value IS NOT NULL)::NUMERIC(15,2) AS avg_won_value,
        (SELECT SUM(estimated_value) FROM leads WHERE stage = 'won' AND estimated_value IS NOT NULL)::NUMERIC(15,2) AS total_won_value
    `

    // Stage distribution
    const stageStats = await sql`
      SELECT 
        stage,
        COUNT(*) as count,
        SUM(estimated_value)::NUMERIC(15,2) as value
      FROM leads
      GROUP BY stage
      ORDER BY 
        CASE stage
          WHEN 'new' THEN 1
          WHEN 'contacted' THEN 2
          WHEN 'qualified' THEN 3
          WHEN 'proposal' THEN 4
          WHEN 'negotiating' THEN 5
          WHEN 'won' THEN 6
          WHEN 'lost' THEN 7
          ELSE 8
        END
    `

    // Lead source breakdown
    const sourceStats = await sql`
      SELECT 
        COALESCE(tool_used, 'unknown') as source,
        COUNT(*) as count,
        SUM(estimated_value)::NUMERIC(15,2) as value
      FROM leads
      GROUP BY tool_used
      ORDER BY count DESC
    `

    // Weekly trend (last 8 weeks)
    const weeklyTrend = await sql`
      SELECT 
        DATE_TRUNC('week', created_at) as week,
        COUNT(*) as count,
        SUM(estimated_value)::NUMERIC(15,2) as value
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '8 weeks'
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week ASC
    `

    return NextResponse.json({ 
      leads, 
      stats: stats[0],
      stageStats,
      sourceStats,
      weeklyTrend
    })
  } catch (err) {
    console.error("[v0] admin leads fetch error:", err)
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, stage, archived, archive_reason } = body

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "Invalid lead id" }, { status: 400 })
    }

    // Handle archive/unarchive
    if (typeof archived === 'boolean') {
      await sql`
        UPDATE leads 
        SET archived = ${archived},
            archive_reason = ${archive_reason ?? null},
            archived_at = ${archived ? sql`NOW()` : null},
            last_activity = NOW()
        WHERE id = ${Number(id)}
      `
      return NextResponse.json({ success: true })
    }

    // Handle stage update
    const validStages = ['new', 'contacted', 'qualified', 'proposal', 'negotiating', 'won', 'lost']
    if (stage && !validStages.includes(stage)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 })
    }

    await sql`
      UPDATE leads 
      SET stage = ${stage}, last_activity = NOW() 
      WHERE id = ${Number(id)}
    `

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[v0] admin leads patch error:", err)
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await request.json()
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "Invalid lead id" }, { status: 400 })
    }
    // Cascade: delete child rows first, then the lead
    await sql`DELETE FROM full_valuations  WHERE lead_id = ${Number(id)}`
    await sql`DELETE FROM quick_valuations WHERE lead_id = ${Number(id)}`
    await sql`DELETE FROM quiz_submissions  WHERE lead_id = ${Number(id)}`
    await sql`DELETE FROM leads WHERE id = ${Number(id)}`
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[v0] admin leads delete error:", err)
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 })
  }
}
