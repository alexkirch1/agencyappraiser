import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { isAdminAuthenticated } from "@/lib/admin-auth"

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [totals, recentActivity, funnelCounts, topStates, leadStages] = await Promise.all([
      // ── Aggregate totals across all tables ──────────────────────────────────
      sql`
        SELECT
          (SELECT COUNT(*) FROM leads WHERE archived = false OR archived IS NULL)::int            AS total_leads,
          (SELECT COUNT(*) FROM quick_valuations)::int                                            AS total_quick_vals,
          (SELECT COUNT(*) FROM full_valuations)::int                                             AS total_full_vals,
          (SELECT COUNT(*) FROM quiz_submissions)::int                                            AS total_quizzes,
          (SELECT COUNT(*) FROM completed_deals)::int                                             AS total_closed_deals,
          (SELECT ROUND(AVG(
            CASE WHEN calculated_multiple::varchar ~ '^-?[0-9]+(\.[0-9]+)?$'
                 THEN calculated_multiple::varchar::numeric ELSE NULL END
          ), 2) FROM full_valuations WHERE calculated_multiple IS NOT NULL)                       AS avg_multiple,
          (SELECT ROUND(AVG(revenue_ltm), 0) FROM full_valuations WHERE revenue_ltm IS NOT NULL)  AS avg_revenue_ltm,
          (SELECT ROUND(AVG(retention_rate), 1) FROM full_valuations WHERE retention_rate IS NOT NULL) AS avg_retention,
          (SELECT ROUND(AVG(final_multiple), 2) FROM completed_deals WHERE final_multiple IS NOT NULL) AS avg_closed_multiple,
          (SELECT ROUND(AVG(final_offer), 0) FROM completed_deals WHERE final_offer IS NOT NULL)  AS avg_closed_value,
          (SELECT ROUND(AVG(percentage), 1) FROM quiz_submissions WHERE percentage IS NOT NULL)   AS avg_quiz_score,
          (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '30 days' AND (archived = false OR archived IS NULL))::int AS leads_last_30,
          (SELECT COUNT(*) FROM full_valuations WHERE created_at >= NOW() - INTERVAL '30 days')::int AS full_vals_last_30,
          (SELECT COUNT(*) FROM leads WHERE stage = 'hot' AND (archived = false OR archived IS NULL))::int AS hot_leads,
          (SELECT ROUND(AVG(estimated_value), 0) FROM leads WHERE estimated_value IS NOT NULL AND (archived = false OR archived IS NULL)) AS avg_lead_value
      `,

      // ── Recent activity: last 8 leads + last 8 full valuations ─────────────
      sql`
        (
          SELECT
            'lead'                                                                AS type,
            id::text                                                              AS id,
            COALESCE(agency_name, name, 'Unknown Agency')                         AS label,
            COALESCE(estimated_value, 0)                                          AS value,
            created_at,
            stage                                                                 AS extra
          FROM leads
          WHERE archived = false OR archived IS NULL
          ORDER BY created_at DESC
          LIMIT 6
        )
        UNION ALL
        (
          SELECT
            'valuation'                                                           AS type,
            id::text                                                              AS id,
            COALESCE(agency_description, 'Agency Valuation')                      AS label,
            COALESCE(high_offer, 0)                                               AS value,
            created_at,
            risk_grade                                                            AS extra
          FROM full_valuations
          ORDER BY created_at DESC
          LIMIT 6
        )
        ORDER BY created_at DESC
        LIMIT 10
      `,

      // ── Funnel: distinct activity counts ────────────────────────────────────
      sql`
        SELECT
          (SELECT COUNT(*) FROM leads)::int                  AS total_leads_ever,
          (SELECT COUNT(*) FROM quick_valuations)::int       AS quick_vals,
          (SELECT COUNT(*) FROM full_valuations)::int        AS full_vals,
          (SELECT COUNT(*) FROM quiz_submissions)::int       AS quizzes,
          (SELECT COUNT(*) FROM completed_deals)::int        AS closed
      `,

      // ── Top states from full valuations ─────────────────────────────────────
      sql`
        SELECT primary_state AS state, COUNT(*)::int AS count
        FROM full_valuations
        WHERE primary_state IS NOT NULL AND primary_state != ''
        GROUP BY primary_state
        ORDER BY count DESC
        LIMIT 5
      `,

      // ── Lead stage distribution ──────────────────────────────────────────────
      sql`
        SELECT COALESCE(stage, 'unknown') AS stage, COUNT(*)::int AS count
        FROM leads
        WHERE archived = false OR archived IS NULL
        GROUP BY stage
        ORDER BY count DESC
      `,
    ])

    const t = totals[0]

    return NextResponse.json({
      stats: {
        totalLeads:           t.total_leads ?? 0,
        totalQuickVals:       t.total_quick_vals ?? 0,
        totalFullVals:        t.total_full_vals ?? 0,
        totalQuizzes:         t.total_quizzes ?? 0,
        totalClosedDeals:     t.total_closed_deals ?? 0,
        avgMultiple:          t.avg_multiple          ? parseFloat(t.avg_multiple)       : null,
        avgRevenueLTM:        t.avg_revenue_ltm       ? parseFloat(t.avg_revenue_ltm)    : null,
        avgRetention:         t.avg_retention         ? parseFloat(t.avg_retention)      : null,
        avgClosedMultiple:    t.avg_closed_multiple   ? parseFloat(t.avg_closed_multiple): null,
        avgClosedValue:       t.avg_closed_value      ? parseFloat(t.avg_closed_value)   : null,
        avgQuizScore:         t.avg_quiz_score        ? parseFloat(t.avg_quiz_score)     : null,
        leadsLast30:          t.leads_last_30 ?? 0,
        fullValsLast30:       t.full_vals_last_30 ?? 0,
        hotLeads:             t.hot_leads ?? 0,
        avgLeadValue:         t.avg_lead_value        ? parseFloat(t.avg_lead_value)     : null,
      },
      recentActivity: recentActivity.map((r) => ({
        type:      r.type,
        id:        r.id,
        label:     r.label,
        value:     parseFloat(r.value) || 0,
        createdAt: r.created_at,
        extra:     r.extra,
      })),
      funnel: funnelCounts[0]
        ? {
            leads:    funnelCounts[0].total_leads_ever ?? 0,
            quickVals: funnelCounts[0].quick_vals ?? 0,
            fullVals: funnelCounts[0].full_vals ?? 0,
            quizzes:  funnelCounts[0].quizzes ?? 0,
            closed:   funnelCounts[0].closed ?? 0,
          }
        : { leads: 0, quickVals: 0, fullVals: 0, quizzes: 0, closed: 0 },
      topStates: topStates.map((r) => ({ state: r.state, count: r.count })),
      leadStages: leadStages.map((r) => ({ stage: r.stage, count: r.count })),
    })
  } catch (err) {
    console.error("[admin/overview] error:", err)
    return NextResponse.json({ error: "Failed to load overview." }, { status: 500 })
  }
}
