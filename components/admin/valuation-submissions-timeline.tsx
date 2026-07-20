"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  date: string       // e.g. "Jul 17"
  completed: number
  partial: number
  total: number
}

interface ValuationSubmissionsTimelineProps {
  /** Pre-computed array from the parent — no internal fallback, no localStorage read. */
  chartData: ChartDataPoint[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ValuationSubmissionsTimeline({ chartData }: ValuationSubmissionsTimelineProps) {
  // All metrics derived directly from the prop — no internal state that can override
  const totalCompleted = chartData.reduce((s, b) => s + b.completed, 0)
  const totalPartial   = chartData.reduce((s, b) => s + b.partial,   0)
  const total          = totalCompleted + totalPartial
  const completionRate = total > 0 ? Math.round((totalCompleted / total) * 100) : 0
  const hasActivity    = total > 0
  const maxCount       = Math.max(...chartData.map((b) => b.total), 1)

  // Show a label every N bars to avoid overcrowding
  const labelStep = chartData.length > 30 ? 30 : chartData.length > 14 ? 5 : 1

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-primary" />
            Valuation Submissions Timeline
          </CardTitle>
          {/* Summary badges */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>
              <span className="font-bold text-foreground">{total}</span> total
            </span>
            <span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalCompleted}</span> completed
            </span>
            <span>
              <span className="font-bold text-foreground">{completionRate}%</span> rate
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative rounded-lg border border-border bg-secondary/30 p-4">

          {/* Bar chart */}
          <div className="flex h-40 items-end gap-px overflow-hidden">
            {chartData.map((bar) => {
              const totalPct     = (bar.total     / maxCount) * 100
              const completedFrac = bar.total > 0 ? bar.completed / bar.total : 0
              const partialFrac   = bar.total > 0 ? bar.partial   / bar.total : 0

              return (
                <div
                  key={bar.date}
                  className="group relative flex flex-1 flex-col items-center justify-end"
                  style={{ minWidth: 0 }}
                >
                  {/* Stacked bar */}
                  <div
                    className="relative w-full"
                    style={{ height: bar.total > 0 ? `${totalPct}%` : "3px" }}
                  >
                    {bar.total === 0 ? (
                      <div className="w-full h-full rounded-sm bg-muted" />
                    ) : (
                      <>
                        {/* Partial — bottom */}
                        <div
                          className="absolute bottom-0 w-full bg-amber-500"
                          style={{ height: `${partialFrac * 100}%` }}
                        />
                        {/* Completed — top */}
                        <div
                          className="absolute top-0 w-full bg-primary"
                          style={{ height: `${completedFrac * 100}%` }}
                        />
                      </>
                    )}
                  </div>

                  {/* Hover tooltip */}
                  {bar.total > 0 && (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max rounded border border-border bg-card px-2 py-1 text-xs shadow group-hover:block">
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
          <div className="mt-1.5 flex items-start gap-px overflow-hidden">
            {chartData.map((bar, i) => (
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
              <p className="text-sm font-medium text-muted-foreground">
                No valuations in this timeframe
              </p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-3 flex justify-end gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
            <span className="text-xs text-muted-foreground">Partial</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
