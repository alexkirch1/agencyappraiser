"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3 } from "lucide-react"
import type { Deal } from "./admin-dashboard"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityLogEntry {
  date: string     // "Jul 17"
  status: "Completed" | "Partial"
}

interface ChartBar {
  date: string
  completed: number
  partial: number
  total: number
}

type Timeframe = "7D" | "30D" | "12M"

interface ValuationSubmissionsTimelineProps {
  deals: Deal[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LS_KEY = "valuation_activity_log"

function getWindowDays(tf: Timeframe): number {
  if (tf === "7D") return 7
  if (tf === "30D") return 30
  return 365
}

/** Returns a list of the last N short-date labels e.g. ["Jul 11", ..., "Jul 17"] */
function lastNLabels(n: number): string[] {
  const labels: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    labels.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }))
  }
  return labels
}

/** Read the activity log from localStorage, return empty array on any failure. */
function readLog(): ActivityLogEntry[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]")
  } catch {
    return []
  }
}

/** Build chart bars for the given timeframe window from the log. */
function buildBars(log: ActivityLogEntry[], tf: Timeframe): ChartBar[] {
  const days = getWindowDays(tf)
  const labels = lastNLabels(days)

  // Scaffold every label as 0
  const map = new Map<string, ChartBar>()
  for (const label of labels) {
    map.set(label, { date: label, completed: 0, partial: 0, total: 0 })
  }

  // Tally log entries that fall inside the window
  for (const entry of log) {
    if (!map.has(entry.date)) continue
    const bar = map.get(entry.date)!
    if (entry.status === "Completed") {
      bar.completed += 1
    } else {
      bar.partial += 1
    }
    bar.total = bar.completed + bar.partial
  }

  return Array.from(map.values())
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ValuationSubmissionsTimeline({ deals }: ValuationSubmissionsTimelineProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("7D")
  const [bars, setBars] = useState<ChartBar[]>(() => buildBars(readLog(), "7D"))

  // Re-read localStorage whenever the component mounts, timeframe changes,
  // or when `deals` changes (a new deal was just saved).
  const refresh = useCallback(() => {
    setBars(buildBars(readLog(), timeframe))
  }, [timeframe])

  useEffect(() => {
    refresh()
  }, [refresh, deals])

  // Summary metrics
  const totalCompleted = bars.reduce((s, b) => s + b.completed, 0)
  const totalPartial   = bars.reduce((s, b) => s + b.partial,   0)
  const total          = totalCompleted + totalPartial
  const completionRate = total > 0 ? Math.round((totalCompleted / total) * 100) : 0
  const hasActivity    = total > 0

  // Bar sizing
  const maxCount   = Math.max(...bars.map((b) => b.total), 1)
  // How many x-axis labels to show so they don't overlap
  const labelStep  = timeframe === "12M" ? 30 : timeframe === "30D" ? 5 : 1

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

        {/* Native Tailwind bar chart */}
        <div className="relative rounded-lg border border-border bg-secondary/30 p-4">
          {/* Chart body */}
          <div className="flex h-52 items-end gap-0.5 overflow-hidden">
            {bars.map((bar, i) => {
              const completedPct = (bar.completed / maxCount) * 100
              const partialPct   = (bar.partial   / maxCount) * 100
              return (
                <div
                  key={bar.date}
                  className="group relative flex flex-1 flex-col items-center justify-end"
                  style={{ minWidth: 0 }}
                >
                  {/* Stacked bars */}
                  <div className="relative w-full" style={{ height: `${Math.max(completedPct + partialPct, 0)}%` }}>
                    {/* Partial (bottom) */}
                    {bar.partial > 0 && (
                      <div
                        className="absolute bottom-0 w-full rounded-t-none bg-amber-500"
                        style={{ height: `${(bar.partial / (bar.completed + bar.partial)) * 100}%` }}
                      />
                    )}
                    {/* Completed (top) */}
                    {bar.completed > 0 && (
                      <div
                        className="absolute top-0 w-full bg-primary"
                        style={{ height: `${(bar.completed / (bar.completed + bar.partial)) * 100}%` }}
                      />
                    )}
                    {/* Zero bar — always show a minimal grey base */}
                    {bar.total === 0 && (
                      <div className="absolute bottom-0 w-full rounded-sm bg-muted" style={{ height: "4px" }} />
                    )}
                  </div>

                  {/* Tooltip on hover */}
                  {bar.total > 0 && (
                    <div className="pointer-events-none absolute bottom-full mb-1 hidden w-max rounded border border-border bg-card px-2 py-1 text-xs shadow group-hover:block z-10">
                      <p className="font-semibold text-foreground">{bar.date}</p>
                      <p className="text-emerald-600 dark:text-emerald-400">Completed: {bar.completed}</p>
                      <p className="text-amber-500">Partial: {bar.partial}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* X-axis labels */}
          <div className="mt-2 flex items-start gap-0.5 overflow-hidden">
            {bars.map((bar, i) => (
              <div key={bar.date} className="flex flex-1 justify-center" style={{ minWidth: 0 }}>
                {i % labelStep === 0 && (
                  <span className="truncate text-center text-[9px] text-muted-foreground">
                    {bar.date}
                  </span>
                )}
              </div>
            ))}
          </div>

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
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
            <span className="text-xs text-muted-foreground">Partial / Abandoned</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
