"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface AnalyticsData {
  leadsPerMonth: { month: string; count: number }[]
  avgValuationByMonth: { month: string; avg: number }[]
  riskGradeBreakdown: { grade: string; count: number }[]
  scopeBreakdown: { scope: string; count: number }[]
  totalLeads: number
  totalValuations: number
  avgMultiple: number
  avgRevenueLTM: number
}

const CHART_COLORS = {
  primary: "#3b82f6",
  success: "#22c55e",
  warning: "#f59e0b",
  destructive: "#ef4444",
  muted: "#6b7280",
}

const RISK_COLORS: Record<string, string> = {
  A: CHART_COLORS.success,
  B: CHART_COLORS.primary,
  C: CHART_COLORS.warning,
  D: CHART_COLORS.destructive,
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="border-border">
      <CardContent className="p-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-3xl font-extrabold text-foreground">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  if (!data) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Failed to load analytics.</p>
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Leads" value={data.totalLeads.toLocaleString()} />
        <StatCard label="Full Valuations" value={data.totalValuations.toLocaleString()} />
        <StatCard
          label="Avg Multiple"
          value={data.avgMultiple ? `${data.avgMultiple.toFixed(2)}x` : "—"}
          sub="Revenue multiple"
        />
        <StatCard
          label="Avg Revenue (LTM)"
          value={data.avgRevenueLTM ? `$${(data.avgRevenueLTM / 1000).toFixed(0)}k` : "—"}
          sub="Per full valuation"
        />
      </div>

      {/* Leads Per Month */}
      <Card className="border-border">
        <div className="border-b border-border bg-secondary/40 px-6 py-4">
          <h3 className="font-semibold text-foreground">Leads per Month</h3>
        </div>
        <CardContent className="p-6">
          {data.leadsPerMonth.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No lead data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.leadsPerMonth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#f9fafb", fontWeight: 600 }}
                  itemStyle={{ color: "#9ca3af" }}
                />
                <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Avg Valuation Multiple Over Time */}
      <Card className="border-border">
        <div className="border-b border-border bg-secondary/40 px-6 py-4">
          <h3 className="font-semibold text-foreground">Average Valuation Multiple Over Time</h3>
        </div>
        <CardContent className="p-6">
          {data.avgValuationByMonth.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No valuation data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.avgValuationByMonth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}x`} />
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#f9fafb", fontWeight: 600 }}
                  itemStyle={{ color: "#9ca3af" }}
                  formatter={(v: number) => [`${v.toFixed(2)}x`, "Avg Multiple"]}
                />
                <Line type="monotone" dataKey="avg" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 4, fill: CHART_COLORS.success }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Bottom row: Risk Grade Breakdown + Scope Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Risk Grade Pie */}
        <Card className="border-border">
          <div className="border-b border-border bg-secondary/40 px-6 py-4">
            <h3 className="font-semibold text-foreground">Risk Grade Distribution</h3>
          </div>
          <CardContent className="p-6">
            {data.riskGradeBreakdown.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No data yet.</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={data.riskGradeBreakdown} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                      {data.riskGradeBreakdown.map((entry) => (
                        <Cell key={entry.grade} fill={RISK_COLORS[entry.grade] ?? CHART_COLORS.muted} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                      itemStyle={{ color: "#9ca3af" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2">
                  {data.riskGradeBreakdown.map((entry) => (
                    <div key={entry.grade} className="flex items-center gap-2 text-sm">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: RISK_COLORS[entry.grade] ?? CHART_COLORS.muted }} />
                      <span className="font-medium text-foreground">Grade {entry.grade}</span>
                      <span className="text-muted-foreground">— {entry.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scope Breakdown Bar */}
        <Card className="border-border">
          <div className="border-b border-border bg-secondary/40 px-6 py-4">
            <h3 className="font-semibold text-foreground">Valuation Type Breakdown</h3>
          </div>
          <CardContent className="p-6">
            {data.scopeBreakdown.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.scopeBreakdown} layout="vertical" margin={{ top: 4, right: 16, left: 24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="scope" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip
                    contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                    itemStyle={{ color: "#9ca3af" }}
                  />
                  <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
