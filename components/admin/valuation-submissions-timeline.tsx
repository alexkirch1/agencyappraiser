"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimelineDataPoint {
  date: string
  displayDate: string
  completed: number
  partial: number
  total: number
}

type TimeframeFilter = "7D" | "30D" | "12M"

// Generate realistic mock data for the past 30+ days
function generateMockTimelineData(): TimelineDataPoint[] {
  const data: TimelineDataPoint[] = []
  const now = new Date()

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    const dayOfWeek = date.getDay()
    // Higher activity on weekdays, lower on weekends
    const baseMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1.0

    // Add some variance for natural peaks and valleys
    const noise = Math.random() * 0.4 - 0.2
    const multiplier = Math.max(0.5, baseMultiplier + noise)

    // Base numbers with some randomness
    const completed = Math.floor((8 + Math.random() * 8) * multiplier)
    const partial = Math.floor((2 + Math.random() * 4) * multiplier)

    const dateStr = date.toISOString().split("T")[0]
    const displayDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })

    data.push({
      date: dateStr,
      displayDate,
      completed,
      partial,
      total: completed + partial,
    })
  }

  return data
}

// Filter data based on timeframe
function filterTimelineData(
  data: TimelineDataPoint[],
  filter: TimeframeFilter
): TimelineDataPoint[] {
  if (filter === "7D") {
    return data.slice(-7)
  } else if (filter === "30D") {
    return data
  } else {
    // 12M - aggregate by week
    const aggregated: TimelineDataPoint[] = []
    let week: TimelineDataPoint[] = []

    for (const point of data) {
      week.push(point)
      // Aggregate every ~4-5 days for 12M view
      if (week.length === 4) {
        const totalCompleted = week.reduce((sum, p) => sum + p.completed, 0)
        const totalPartial = week.reduce((sum, p) => sum + p.partial, 0)
        aggregated.push({
          date: week[0].date,
          displayDate: `${week[0].displayDate} - ${week[week.length - 1].displayDate}`,
          completed: totalCompleted,
          partial: totalPartial,
          total: totalCompleted + totalPartial,
        })
        week = []
      }
    }
    if (week.length > 0) {
      const totalCompleted = week.reduce((sum, p) => sum + p.completed, 0)
      const totalPartial = week.reduce((sum, p) => sum + p.partial, 0)
      aggregated.push({
        date: week[0].date,
        displayDate: `${week[0].displayDate} - ${week[week.length - 1].displayDate}`,
        completed: totalCompleted,
        partial: totalPartial,
        total: totalCompleted + totalPartial,
      })
    }
    return aggregated
  }
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean
  payload?: any[]
}) => {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0]?.payload

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="text-sm font-semibold text-foreground">{data?.displayDate}</p>
      <div className="mt-2 space-y-1">
        <p className="text-xs text-muted-foreground">
          Total Submissions: <span className="font-semibold text-foreground">{data?.total}</span>
        </p>
        <p className="text-xs">
          <span className="inline-block mr-2 h-2 w-2 rounded-full bg-emerald-500"></span>
          <span className="text-muted-foreground">
            Completed: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{data?.completed}</span>
          </span>
        </p>
        <p className="text-xs">
          <span className="inline-block mr-2 h-2 w-2 rounded-full bg-amber-500"></span>
          <span className="text-muted-foreground">
            Partial: <span className="font-semibold text-amber-600 dark:text-amber-400">{data?.partial}</span>
          </span>
        </p>
      </div>
    </div>
  )
}

export function ValuationSubmissionsTimeline() {
  const [timeframe, setTimeframe] = useState<TimeframeFilter>("30D")
  const allData = generateMockTimelineData()
  const filteredData = filterTimelineData(allData, timeframe)

  const totalSubmissions = filteredData.reduce((sum, d) => sum + d.total, 0)
  const completionRate = (
    (filteredData.reduce((sum, d) => sum + d.completed, 0) / totalSubmissions) *
    100
  ).toFixed(0)

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
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
            <p className="mt-1 text-lg font-bold text-foreground">{totalSubmissions}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Completed
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {filteredData.reduce((sum, d) => sum + d.completed, 0)}
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
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPartial" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                  paddingTop: "16px",
                }}
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#22c55e"
                strokeWidth={3}
                dot={false}
                name="Completed Valuations"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="partial"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={false}
                name="Partial/Abandoned"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
