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

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartPoint {
  date: string      // "Jul 17" — plain-text label for the x-axis
  completed: number
  partial: number
  total: number
}

type Timeframe = "7D" | "30D" | "12M"

interface ValuationSubmissionsTimelineProps {
  deals: Deal[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate an ordered list of "Mon DD" labels for the last N days. */
function lastNDayLabels(n: number): string[] {
  const labels: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    labels.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }))
  }
  return labels
}

/**
 * Get a plain-text "Mon DD" label from a deal.
 * Reads shortDate first (already stamped at submission time),
 * then falls back to parsing date_saved / created_at / createdAt / date.
 */
function getDealShortDate(deal: Deal): string {
  // Prefer the pre-stamped shortDate — fastest and most reliable path
  if (deal.shortDate) return deal.shortDate

  // Fallback: parse whichever date field exists
  const raw =
    deal.date_saved ||
    (deal as any).created_at ||
    (deal as any).createdAt ||
    (deal as any).date

  const parsed = raw ? new Date(raw) : new Date()
  const d = isNaN(parsed.getTime()) ? new Date() : parsed
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** Build chart data by counting deals per shortDate label. */
function buildChartData(deals: Deal[], windowDays: number): ChartPoint[] {
  // Step 1: scaffold every day in the window as 0
  const labels = lastNDayLabels(windowDays)
  const pointMap = new Map<string, ChartPoint>()
  for (const label of labels) {
    pointMap.set(label, { date: label, completed: 0, partial: 0, total: 0 })
  }

  // Step 2: loop through deals and tally by shortDate
  const safeDeals = Array.isArray(deals) ? deals : []
  for (const deal of safeDeals) {
    const label = getDealShortDate(deal)
    // Only count deals that fall within the scaffold window
    if (!pointMap.has(label)) continue
    const point = pointMap.get(label)!
    if (deal.status === "completed") {
      point.completed += 1
    } else {
      point.partial += 1
    }
    point.total = point.completed + point.partial
  }

  // Step 3: return in chronological order (Map preserves insertion order)
  return Array.from(pointMap.values())
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ChartPoint
  if (!d) return null
  return (
    <div className="rounded-lg border border-border bg-card p-2.5 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-foreground">{d.date}</p>
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

// ─── Component ────────────────────────────────────────────────────────────────

export function ValuationSubmissionsTimeline({ deals }: ValuationSubmissionsTimelineProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("30D")

  const windowDays = timeframe === "7D" ? 7 : timeframe === "30D" ? 30 : 365

  // Re-compute whenever deals or timeframe changes — instant reactive update
  const chartData = useMemo(
    () => buildChartData(deals, windowDays),
    [deals, windowDays]
  )

  // Summary metrics
  const totalCompleted = chartData.reduce((s, d) => s + d.completed, 0)
  const totalPartial   = chartData.reduce((s, d) => s + d.partial,   0)
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

        {/* Chart — always renders; flat at 0 when empty */}
        <div className="relative h-80 w-full rounded-lg border border-border bg-secondary/30 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
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

          {/* Empty-state overlay */}
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
        <div className="flex justify-end gap-4">
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
