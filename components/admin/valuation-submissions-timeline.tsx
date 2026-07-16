"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
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
import { BarChart3, Loader } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimelineDataPoint {
  date: string
  displayDate: string
  completed: number
  partial: number
  total: number
}

type TimeframeFilter = "7D" | "30D" | "12M"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

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
  const { data: chartData, isLoading, error } = useSWR<TimelineDataPoint[]>(
    `/api/admin/analytics/timeline?timeframe=${timeframe}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  // Ensure filteredData is always an array
  const filteredData = Array.isArray(chartData) ? chartData : []
  const totalSubmissions = filteredData.length > 0 
    ? filteredData.reduce((sum, d) => sum + d.total, 0) 
    : 0
  const completedCount = filteredData.length > 0
    ? filteredData.reduce((sum, d) => sum + d.completed, 0)
    : 0
  const completionRate = totalSubmissions > 0 ? (
    (completedCount / totalSubmissions) * 100
  ).toFixed(0) : "0"

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
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/30 dark:bg-red-900/10">
            <p className="text-sm text-red-700 dark:text-red-400">
              Failed to load timeline data. Please try again.
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : totalSubmissions}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Completed
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : completedCount}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Completion %
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : `${completionRate}%`}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="relative h-80 w-full">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-muted/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Loading timeline...</p>
              </div>
            </div>
          )}
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
