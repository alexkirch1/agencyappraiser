import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { isAdminAuthenticated } from "@/lib/admin-auth"

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [leadsPerMonth, avgValuationByMonth, riskGrades, scopeBreakdown, totals] =
      await Promise.all([
        // Leads grouped by month
        sql`
          SELECT TO_CHAR(created_at, 'Mon YY') AS month,
                 DATE_TRUNC('month', created_at) AS month_order,
                 COUNT(*)::int AS count
          FROM leads
          GROUP BY month, month_order
          ORDER BY month_order ASC
          LIMIT 12
        `,
        // Average multiple grouped by month — cast through varchar to safely skip non-numeric values
        sql`
          SELECT TO_CHAR(created_at, 'Mon YY') AS month,
                 DATE_TRUNC('month', created_at) AS month_order,
                 ROUND(AVG(
                   CASE WHEN calculated_multiple::varchar ~ '^-?[0-9]+(\.[0-9]+)?$'
                        THEN calculated_multiple::varchar::numeric
                        ELSE NULL END
                 ), 2) AS avg
          FROM full_valuations
          WHERE calculated_multiple IS NOT NULL
          GROUP BY month, month_order
          ORDER BY month_order ASC
          LIMIT 12
        `,
        // Risk grade breakdown — only single-letter grades
        sql`
          SELECT risk_grade::varchar AS grade, COUNT(*)::int AS count
          FROM full_valuations
          WHERE risk_grade IS NOT NULL
            AND risk_grade::varchar ~ '^[A-Za-z]{1,2}$'
          GROUP BY risk_grade
          ORDER BY grade ASC
        `,
        // Scope of sale breakdown — coerce to varchar to avoid implicit numeric cast
        sql`
          SELECT COALESCE(scope_of_sale::varchar, 'unknown') AS scope, COUNT(*)::int AS count
          FROM full_valuations
          GROUP BY scope_of_sale
          ORDER BY count DESC
        `,
        // Aggregate totals
        sql`
          SELECT
            (SELECT COUNT(*) FROM leads)::int AS total_leads,
            (SELECT COUNT(*) FROM full_valuations)::int AS total_valuations,
            (SELECT ROUND(AVG(
               CASE WHEN calculated_multiple::varchar ~ '^-?[0-9]+(\.[0-9]+)?$'
                    THEN calculated_multiple::varchar::numeric ELSE NULL END
             ), 2) FROM full_valuations WHERE calculated_multiple IS NOT NULL) AS avg_multiple,
            (SELECT ROUND(AVG(
               CASE WHEN revenue_ltm::varchar ~ '^-?[0-9]+(\.[0-9]+)?$'
                    THEN revenue_ltm::varchar::numeric ELSE NULL END
             ), 0) FROM full_valuations WHERE revenue_ltm IS NOT NULL) AS avg_revenue_ltm
        `,
      ])

    return NextResponse.json({
      leadsPerMonth: leadsPerMonth.map((r) => ({ month: r.month, count: r.count })),
      avgValuationByMonth: avgValuationByMonth.map((r) => ({ month: r.month, avg: parseFloat(r.avg) })),
      riskGradeBreakdown: riskGrades,
      scopeBreakdown: scopeBreakdown.map((r) => ({
        scope: r.scope === "full_agency" ? "Full Agency" : r.scope === "book_only" ? "Book Only" : r.scope,
        count: r.count,
      })),
      totalLeads: totals[0]?.total_leads ?? 0,
      totalValuations: totals[0]?.total_valuations ?? 0,
      avgMultiple: totals[0]?.avg_multiple ? parseFloat(totals[0].avg_multiple) : 0,
      avgRevenueLTM: totals[0]?.avg_revenue_ltm ? parseFloat(totals[0].avg_revenue_ltm) : 0,
    })
  } catch (err) {
    console.error("[v0] Analytics error:", err)
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 })
  }
}
