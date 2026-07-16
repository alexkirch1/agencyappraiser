export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { isAdminAuthenticated } from "@/lib/admin-auth"

interface TimelineDataPoint {
  date: string
  displayDate: string
  completed: number
  partial: number
  total: number
}

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get("timeframe") || "30D"

    let daysBack = 30
    if (timeframe === "7D") {
      daysBack = 7
    } else if (timeframe === "12M") {
      daysBack = 365
    }

    const query = sql`
      SELECT 
        DATE(created_at) AS date,
        TO_CHAR(created_at, 'Mon DD') AS display_date,
        COUNT(*) FILTER (WHERE lead_id IS NOT NULL AND id IS NOT NULL)::int AS total_count
      FROM quick_valuations
      WHERE created_at >= NOW() - INTERVAL '1 day' * ${daysBack}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `

    const results = (await query) as Array<{
      date: string
      display_date: string
      total_count: number
    }>

    // Format data for chart - for now treat all quick valuations as "completed"
    // since we don't have a completion status in quick_valuations table
    const chartData: TimelineDataPoint[] = results.map((row) => ({
      date: row.date,
      displayDate: row.display_date,
      completed: row.total_count,
      partial: 0,
      total: row.total_count,
    }))

    return NextResponse.json(chartData)
  } catch (err) {
    console.error("[v0] Timeline analytics error:", err)
    return NextResponse.json({ error: "Failed to load timeline analytics." }, { status: 500 })
  }
}
