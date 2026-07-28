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

  // Show a label every N bars to avoid overcrowding.
  // Monthly mode (≤12 bars): every bar. Daily 7D: every 1st. Daily 30D: every 5th.
  const labelStep    = chartData.length > 14 ? 5 : 1
  // Minimum bar width: wider for monthly/sparse charts, narrow for daily
  const minBarPx     = chartData.length <= 12 ? 32 : 2
  // Chart area height in px — must match the h-40 (160px) container below
  const CHART_H      = 160

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
              // Use px heights so bars scale correctly inside the h-40 flex container.
              // % heights on flex children are unreliable without an explicit parent height.
              const barPx         = bar.total > 0 ? Math.max(Math.round((bar.total / maxCount) * CHART_H), 6) : 2
              const completedFrac = bar.total > 0 ? bar.completed / bar.total : 0
              const partialFrac   = bar.total > 0 ? bar.partial   / bar.total : 0

              return (
                <div
                  key={bar.date}
                  className="group relative flex flex-1 flex-col items-center justify-end"
                  style={{ minWidth: `${minBarPx}px` }}
                >
                  {/* Bar — explicit px height so it renders inside the flex container */}
                  {bar.total === 0 ? (
                    <div className="w-full rounded-sm bg-border" style={{ height: "2px" }} />
                  ) : (
                    <div
                      className="w-full rounded-sm"
                      style={{
                        height:          `${barPx}px`,
                        backgroundColor: completedFrac >= 1
                          ? "rgb(56 189 248)"   /* sky-400 */
                          : partialFrac   >= 1
                            ? "rgb(251 191 36)"  /* amber-400 */
                            : `linear-gradient(to top, rgb(251 191 36) ${partialFrac * 100}%, rgb(56 189 248) ${partialFrac * 100}%)`,
                      }}
                    />
                  )}

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

          {/* X-axis labels — rendered as relative positioned row; only every Nth bar
              gets a label, and labels use overflow-visible so they don't get clipped */}
          <div className="relative mt-1.5 flex gap-px" style={{ height: "14px" }}>
            {chartData.map((bar, i) => (
              <div
                key={bar.date}
                className="relative flex flex-1 justify-center"
                style={{ minWidth: `${minBarPx}px` }}
              >
                {i % labelStep === 0 && (
                  <span className="absolute top-0 whitespace-nowrap text-center text-[9px] text-muted-foreground">
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
            <span className="h-2.5 w-2.5 rounded-sm bg-sky-500 dark:bg-sky-400" />
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-400 dark:bg-amber-500" />
            <span className="text-xs text-muted-foreground">Partial</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
