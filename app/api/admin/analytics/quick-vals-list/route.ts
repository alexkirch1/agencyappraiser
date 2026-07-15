export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { isAdminAuthenticated } from "@/lib/admin-auth"

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get("filter") || "all"

  try {
    const data = await sql`
      SELECT
        qv.id,
        qv.created_at,
        qv.agency_description,
        qv.revenue_ltm,
        qv.low_offer,
        qv.high_offer
      FROM quick_valuations qv
      WHERE
        CASE
          WHEN ${filter} = 'today' THEN qv.created_at >= CURRENT_DATE AND qv.created_at < CURRENT_DATE + INTERVAL '1 day'
          WHEN ${filter} = 'week' THEN qv.created_at >= NOW() - INTERVAL '7 days'
          WHEN ${filter} = 'month' THEN qv.created_at >= NOW() - INTERVAL '30 days'
          ELSE TRUE
        END
      ORDER BY qv.created_at DESC
      LIMIT 50
    `

    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to fetch quick valuations list:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}
