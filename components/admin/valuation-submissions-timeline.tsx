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
  date: string        // ISO YYYY-MM-DD for comparisons
  displayDate: string // "Jul 16" for x-axis labels
  completed: number
  partial: number
  total: number
}

type TimeframeFilter = "7D" | "30D" | "12M"

interface ValuationSubmissionsTimelineProps {
  deals: Deal[]
}

/** Build last-N-days scaffold so the chart always shows an axis even with no data */
function buildEmptyDays(n: number): TimelineDataPoint[] {
  const days: TimelineDataPoint[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split("T")[0]
    days.push({
      date: dateStr,
      displayDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      completed: 0,
      partial: 0,
      total: 0,
    })
  }
  return days
}

/** Safely extract a YYYY-MM-DD string from a deal, checking every possible date field */
function extractDate(deal: Deal): string {
  const raw =
    deal.date_saved ||
    (deal as any).created_at ||
    (deal as any).createdAt ||
    (deal as any).date

  if (!raw) return new Date().toISOString().split("T")[0]

  // Handle ISO strings, plain YYYY-MM-DD, and anything parseable
  const parsed = new Date(raw)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0]

  return new Date().toISOString().split("T")[0]
}

/** Group deals by date, merging counts onto an empty-days scaffold so gaps show as 0 */
function buildTimelineData(deals: Deal[], days: number): TimelineDataPoint[] {
  const scaffold = buildEmptyDays(days)
  const map = new Map<string, TimelineDataPoint>(scaffold.map((p) => [p.date, { ...p }]))

  for (const deal of deals) {
    const dateStr = extractDate(deal)
    if (!map.has(dateStr)) {
      // Deal is outside the scaffold window — add it anyway
      const d = new Date(dateStr)
      map.set(dateStr, {
        date: dateStr,
        displayDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        completed: 0,
        partial: 0,
        total: 0,
      })
    }
    const point = map.get(dateStr)!
    if (deal.status === "completed") {
      point.completed += 1
    } else {
      point.partial += 1
    }
    point.total = point.completed + point.partial
  }

  // Sort chronologically — oldest first so the x-axis reads left → right
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

const CustomTooltip = (props: any) => {
  const { active, payload } = props
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as TimelineDataPoint
  if (!d) return null
  return (
    <div className="rounded-lg border border-border bg-card p-2 shadow-lg">
      <p className="text-xs font-semibold text-foreground">{d.displayDate}</p>
      <p className="text-xs text-muted-foreground">
        Total: <span className="font-semibold text-foreground">{d.total}</span>
      </p>
      <p className="text-xs text-emerald-600 dark:text-emerald-400">
        Completed: <span className="font-semibold">{d.completed}</span>
      </p>
      <p className="text-xs text-amber-600 dark:text-amber-400">
        Partial: <span className="font-semibold">{d.partial}</span>
      </p>
    </div>
  )
}

export function ValuationSubmissionsTimeline({ deals }: ValuationSubmissionsTimelineProps) {
  const [timeframe, setTimeframe] = useState<TimeframeFilter>("30D")

  const safeDeals = Array.isArray(deals) ? deals : []

  // Map timeframe to number of days for the scaffold
  const windowDays = timeframe === "7D" ? 7 : timeframe === "30D" ? 30 : 365

  // Compute chart data: always produces at least `windowDays` points (filled with 0s)
  const chartData = useMemo(
    () => buildTimelineData(safeDeals, windowDays),
    [safeDeals, windowDays]
  )

  // Slice to the selected window (deals outside window are excluded via date filter)
  const filteredData = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - windowDays)
    const cutoffStr = cutoff.toISOString().split("T")[0]
    return chartData.filter((d) => d.date >= cutoffStr)
  }, [chartData, windowDays])

  // Summary metrics
  const totalCompleted = filteredData.reduce((s, d) => s + d.completed, 0)
  const totalPartial   = filteredData.reduce((s, d) => s + d.partial,   0)
  const total          = totalCompleted + totalPartial
  const completionRate = total > 0 ? Math.round((totalCompleted / total) * 100) : 0

  const hasActivity    = total > 0

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
            {(["7D", "30D", "12M"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={timeframe === f ? "default" : "outline"}
                onClick={() => setTimeframe(f)}
                className="text-xs"
              >
                {f}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="mt-1 text-lg font-bold text-foreground">{total}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completed</p>
            <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{totalCompleted}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completion %</p>
            <p className="mt-1 text-lg font-bold text-foreground">{completionRate}%</p>
          </div>
        </div>

        {/* Chart — always renders axes; empty state shown via overlay */}
        <div className="relative h-80 w-full rounded-lg border border-border bg-secondary/30 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                allowDecimals={false}
              />
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
                name="Partial / Abandoned"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Empty-state overlay — shown only when there is truly no activity */}
          {!hasActivity && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  No valuations logged in this timeframe
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Submissions will appear here once deals are saved
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex gap-4 justify-end">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-xs text-muted-foreground">Partial / Abandoned</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
