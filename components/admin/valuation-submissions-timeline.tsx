"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { BarChart3 } from "lucide-react"
import type { Deal } from "./admin-dashboard"

interface TimelineDataPoint {
  date: string
  displayDate: string
  completed: number
  partial: number
  total: number
}

type TimeframeFilter = "7D" | "30D" | "12M"

interface ValuationSubmissionsTimelineProps {
  deals: Deal[]
}

// Convert deals to timeline data grouped by date
function groupDealsByDate(deals: Deal[]): TimelineDataPoint[] {
  if (!Array.isArray(deals) || deals.length === 0) {
    // Return empty dataset for current date at 0
    const today = new Date()
    const dateStr = today.toISOString().split("T")[0]
    const displayDate = today.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    return [{
      date: dateStr,
      displayDate,
      completed: 0,
      partial: 0,
      total: 0,
    }]
  }

  // Group deals by date
  const dateMap = new Map<string, { completed: number; partial: number }>()

  deals.forEach((deal) => {
    // Use date_saved for grouping, ensure it's a valid date
    const dateStr = deal.date_saved?.split("T")[0] || new Date().toISOString().split("T")[0]
    
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { completed: 0, partial: 0 })
    }

    const counts = dateMap.get(dateStr)!
    // Count "completed" status as completed, all others (active, declined, test) as partial/incomplete
    if (deal.status === "completed") {
      counts.completed += 1
    } else {
      counts.partial += 1
    }
  })

  // Convert to array and sort chronologically (oldest first for chart x-axis)
  const sorted = Array.from(dateMap.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([dateStr, counts]) => {
      const date = new Date(dateStr)
      return {
        date: dateStr,
        displayDate: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        completed: counts.completed,
        partial: counts.partial,
        total: counts.completed + counts.partial,
      }
    })

  return sorted.length > 0 ? sorted : [{
    date: new Date().toISOString().split("T")[0],
    displayDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    completed: 0,
    partial: 0,
    total: 0,
  }]
}

const CustomTooltip = (props: any) => {
  const { active, payload } = props
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0]?.payload
  if (!data) return null

  return (
    <div className="rounded-lg border border-border bg-card p-2 shadow-lg">
      <p className="text-xs font-semibold text-foreground">{data.displayDate}</p>
      <p className="text-xs text-muted-foreground">
        Total: <span className="font-semibold text-foreground">{data.total}</span>
      </p>
      <p className="text-xs text-emerald-600 dark:text-emerald-400">
        Completed: <span className="font-semibold">{data.completed}</span>
      </p>
      <p className="text-xs text-amber-600 dark:text-amber-400">
        Partial: <span className="font-semibold">{data.partial}</span>
      </p>
    </div>
  )
}

export function ValuationSubmissionsTimeline({ deals }: ValuationSubmissionsTimelineProps) {
  const [timeframe, setTimeframe] = useState<TimeframeFilter>("30D")

  // Group actual deals by date
  const rawData: TimelineDataPoint[] = useMemo(() => {
    return groupDealsByDate(deals)
  }, [deals])

  // Dynamically filter data based on active timeframe using useMemo
  const filteredData = useMemo(() => {
    if (!Array.isArray(rawData) || rawData.length === 0) {
      return []
    }

    const now = new Date()
    const today = now.toISOString().split("T")[0]

    switch (timeframe) {
      case "7D": {
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const cutoffDate = sevenDaysAgo.toISOString().split("T")[0]
        return rawData.filter((d) => d.date >= cutoffDate)
      }
      case "30D": {
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const cutoffDate = thirtyDaysAgo.toISOString().split("T")[0]
        return rawData.filter((d) => d.date >= cutoffDate)
      }
      case "12M":
        return rawData // Use full dataset for 12-month view
      default:
        return rawData
    }
  }, [timeframe, rawData])

  // Safe reduce calculations with fallbacks for missing properties
  const { totalCompleted, totalPartial, total, completionRate } = useMemo(() => {
    if (!Array.isArray(filteredData) || filteredData.length === 0) {
      return { totalCompleted: 0, totalPartial: 0, total: 0, completionRate: 0 }
    }

    try {
      const totalCompleted = filteredData.reduce(
        (acc, curr) => acc + (curr?.completed || 0),
        0
      )
      const totalPartial = filteredData.reduce(
        (acc, curr) => acc + (curr?.partial || 0),
        0
      )
      const total = totalCompleted + totalPartial

      return {
        totalCompleted,
        totalPartial,
        total,
        completionRate: total > 0 ? Math.round((totalCompleted / total) * 100) : 0,
      }
    } catch (err) {
      console.error("Error calculating timeline metrics:", err)
      return { totalCompleted: 0, totalPartial: 0, total: 0, completionRate: 0 }
    }
  }, [filteredData])

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Valuation Submissions Timeline
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Track submission volume and completion rates over time
            </p>
          </div>
          <div className="flex gap-2">
            {(["7D", "30D", "12M"] as const).map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={timeframe === filter ? "default" : "outline"}
                onClick={() => setTimeframe(filter)}
                className="text-xs"
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">{total}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Completed
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {totalCompleted}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Completion %
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">{completionRate}%</p>
          </div>
        </div>

        {/* Chart */}
        <div className="relative h-80 w-full rounded-lg border border-border bg-secondary/30 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="hsl(var(--primary))"
                dot={false}
                strokeWidth={2}
                name="Completed"
              />
              <Line
                type="monotone"
                dataKey="partial"
                stroke="hsl(22, 91%, 55%)"
                dot={false}
                strokeWidth={2}
                name="Partial/Abandoned"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
