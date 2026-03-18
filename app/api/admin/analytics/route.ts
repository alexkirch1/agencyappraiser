import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import sql from "@/lib/db"

const SESSION_SECRET = process.env.SESSION_SECRET || "agency-appraiser-admin-secret-2024"

async function isAuthed(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_session")?.value
  if (!token) return false
  try {
    const decoded = Buffer.from(token, "base64").toString()
    const parts = decoded.split(":")
    return parts.length >= 3 && parts.slice(2).join(":") === SESSION_SECRET
  } catch {
    return false
  }
}

export async function GET() {
  if (!(await isAuthed())) {
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
        // Average multiple grouped by month
        sql`
          SELECT TO_CHAR(created_at, 'Mon YY') AS month,
                 DATE_TRUNC('month', created_at) AS month_order,
                 ROUND(AVG(calculated_multiple), 2) AS avg
          FROM full_valuations
          WHERE calculated_multiple IS NOT NULL
          GROUP BY month, month_order
          ORDER BY month_order ASC
          LIMIT 12
        `,
        // Risk grade breakdown
        sql`
          SELECT risk_grade AS grade, COUNT(*)::int AS count
          FROM full_valuations
          WHERE risk_grade IS NOT NULL
          GROUP BY risk_grade
          ORDER BY grade ASC
        `,
        // Scope of sale breakdown — scope_of_sale is numeric; cast to text AFTER grouping
        sql`
          SELECT scope_of_sale::text AS scope, COUNT(*)::int AS count
          FROM full_valuations
          GROUP BY scope_of_sale
          ORDER BY count DESC
        `,
        // Aggregate totals
        sql`
          SELECT
            (SELECT COUNT(*) FROM leads)::int AS total_leads,
            (SELECT COUNT(*) FROM full_valuations)::int AS total_valuations,
            (SELECT ROUND(AVG(calculated_multiple), 2) FROM full_valuations WHERE calculated_multiple IS NOT NULL) AS avg_multiple,
            (SELECT ROUND(AVG(revenue_ltm), 0) FROM full_valuations WHERE revenue_ltm IS NOT NULL) AS avg_revenue_ltm
        `,
      ])

    return NextResponse.json({
      leadsPerMonth: leadsPerMonth.map((r) => ({ month: r.month, count: r.count })),
      avgValuationByMonth: avgValuationByMonth.map((r) => ({ month: r.month, avg: parseFloat(r.avg) })),
      riskGradeBreakdown: riskGrades,
      scopeBreakdown: scopeBreakdown.map((r) => {
        const raw = r.scope ?? "unknown"
        // scope_of_sale is stored as a numeric multiplier: 1.0 = Full Agency, 0.95 = Book Purchase, 0.9 = Fragmented
        const label =
          raw === "1" || raw === "1.0" ? "Full Agency" :
          raw === "0.95" ? "Book Purchase" :
          raw === "0.9" ? "Fragmented" :
          raw === "unknown" || raw === "null" ? "Unknown" : raw
        return { scope: label, count: r.count }
      }),
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
