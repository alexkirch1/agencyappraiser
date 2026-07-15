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
        DATE(created_at)::text AS date,
        TO_CHAR(created_at, 'Mon DD')::text AS day,
        COUNT(*)::int AS count
      FROM quick_valuations
      WHERE
        CASE
          WHEN ${filter} = 'today' THEN created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'
          WHEN ${filter} = 'week' THEN created_at >= NOW() - INTERVAL '7 days'
          WHEN ${filter} = 'month' THEN created_at >= NOW() - INTERVAL '30 days'
          ELSE TRUE
        END
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `

    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to fetch quick valuations history:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}
