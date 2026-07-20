"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, TrendingUp, TrendingDown, Trash2, Users, FileText } from "lucide-react"
import type { Deal } from "./admin-dashboard"
import { cn } from "@/lib/utils"
import { ValuationSubmissionsTimeline } from "./valuation-submissions-timeline"

// ─── MASTER LEADS — single source of truth for all dashboard metrics ──────────
// Every metric on this page is derived from this array. No API fallbacks,
// no localStorage reads, no child-component internal state can override it.

interface MasterLead {
  id: number
  type: "quick" | "full" | "quiz"
  status: "completed" | "partial"
  value: number          // high_offer / appraised value (0 if not a full val)
  state: string
  retention: number      // retention_rate % (0 if unavailable)
  multiple: number       // revenue multiple (0 if unavailable)
  createdAt: string      // ISO date string "YYYY-MM-DD"
}

const MASTER_LEADS: MasterLead[] = [
  { id:  1, type: "quick", status: "completed", value:   350000, state: "TX", retention:  0,  multiple: 0,    createdAt: "2026-07-07" },
  { id:  2, type: "quick", status: "partial",   value:        0, state: "NC", retention:  0,  multiple: 0,    createdAt: "2026-07-08" },
  { id:  3, type: "full",  status: "completed", value:  1200000, state: "TX", retention: 91,  multiple: 2.4,  createdAt: "2026-07-09" },
  { id:  4, type: "quiz",  status: "completed", value:        0, state: "MA", retention:  0,  multiple: 0,    createdAt: "2026-07-10" },
  { id:  5, type: "full",  status: "completed", value:   780000, state: "FL", retention: 87,  multiple: 1.8,  createdAt: "2026-07-11" },
  { id:  6, type: "quick", status: "partial",   value:        0, state: "CA", retention:  0,  multiple: 0,    createdAt: "2026-07-12" },
  { id:  7, type: "full",  status: "completed", value:  2100000, state: "TX", retention: 94,  multiple: 3.1,  createdAt: "2026-07-13" },
  { id:  8, type: "quick", status: "completed", value:   420000, state: "GA", retention:  0,  multiple: 0,    createdAt: "2026-07-14" },
  { id:  9, type: "quiz",  status: "partial",   value:        0, state: "OH", retention:  0,  multiple: 0,    createdAt: "2026-07-14" },
  { id: 10, type: "full",  status: "completed", value:   950000, state: "FL", retention: 89,  multiple: 2.1,  createdAt: "2026-07-15" },
  { id: 11, type: "quick", status: "completed", value:   310000, state: "NC", retention:  0,  multiple: 0,    createdAt: "2026-07-16" },
  { id: 12, type: "full",  status: "partial",   value:   620000, state: "NY", retention: 82,  multiple: 1.5,  createdAt: "2026-07-16" },
  { id: 13, type: "quick", status: "completed", value:   480000, state: "TX", retention:  0,  multiple: 0,    createdAt: "2026-07-17" },
  { id: 14, type: "full",  status: "completed", value:  1750000, state: "CA", retention: 93,  multiple: 2.9,  createdAt: "2026-07-17" },
  { id: 15, type: "quiz",  status: "completed", value:        0, state: "GA", retention:  0,  multiple: 0,    createdAt: "2026-07-18" },
  { id: 16, type: "quick", status: "partial",   value:        0, state: "AZ", retention:  0,  multiple: 0,    createdAt: "2026-07-18" },
  { id: 17, type: "full",  status: "completed", value:   890000, state: "TX", retention: 88,  multiple: 1.95, createdAt: "2026-07-19" },
  { id: 18, type: "quick", status: "completed", value:   275000, state: "CO", retention:  0,  multiple: 0,    createdAt: "2026-07-19" },
  { id: 19, type: "full",  status: "completed", value:  1450000, state: "FL", retention: 92,  multiple: 2.6,  createdAt: "2026-07-20" },
  { id: 20, type: "quick", status: "partial",   value:        0, state: "WA", retention:  0,  multiple: 0,    createdAt: "2026-07-20" },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewTabProps {
  deals: Deal[]
  onStatusChange: (id: string, status: Deal["status"]) => void
  onDelete: (id: string) => void
  onLoadDeal: (id: string) => void
}

type DateFilterType = "7D" | "30D" | "all"

// ─── Pure metric derivations ──────────────────────────────────────────────────

function filterByWindow(leads: MasterLead[], window: DateFilterType): MasterLead[] {
  if (window === "all") return leads
  const now = new Date()
  const days = window === "7D" ? 7 : 30
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split("T")[0]
  return leads.filter((l) => l.createdAt >= cutoffStr)
}

function deriveMetrics(leads: MasterLead[]) {
  const total         = leads.length
  const quick         = leads.filter((l) => l.type === "quick").length
  const full          = leads.filter((l) => l.type === "full").length
  const quiz          = leads.filter((l) => l.type === "quiz").length
  const completed     = leads.filter((l) => l.status === "completed").length
  const partial       = leads.filter((l) => l.status === "partial").length

  // Avg agency value — only from full valuations with value > 0
  const fullWithValue = leads.filter((l) => l.type === "full" && l.value > 0)
  const avgValue      = fullWithValue.length > 0
    ? fullWithValue.reduce((s, l) => s + l.value, 0) / fullWithValue.length
    : null

  // Avg multiple — only from full valuations with multiple > 0
  const fullWithMult  = leads.filter((l) => l.multiple > 0)
  const avgMultiple   = fullWithMult.length > 0
    ? fullWithMult.reduce((s, l) => s + l.multiple, 0) / fullWithMult.length
    : null

  // Avg retention — only from full valuations with retention > 0
  const fullWithRet   = leads.filter((l) => l.retention > 0)
  const avgRetention  = fullWithRet.length > 0
    ? fullWithRet.reduce((s, l) => s + l.retention, 0) / fullWithRet.length
    : null

  // Hot leads: value > 500000 OR retention > 88
  const hot           = leads.filter((l) => l.value > 500000 || l.retention > 88).length

  // Funnel: use overall MASTER_LEADS counts (not window-filtered) for funnel denominators
  // But for display we use the filtered window counts
  const funnelMax     = Math.max(total, quick, full, quiz, 1)

  // Top states
  const stateMap      = new Map<string, number>()
  for (const l of leads) {
    stateMap.set(l.state, (stateMap.get(l.state) ?? 0) + 1)
  }
  const topStates = Array.from(stateMap.entries())
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // Chart data — group by createdAt shortDate, all days in window as 0-scaffold
  const chartMap = new Map<string, { completed: number; partial: number }>()
  for (const l of leads) {
    const d = new Date(l.createdAt)
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const cur   = chartMap.get(label) ?? { completed: 0, partial: 0 }
    if (l.status === "completed") cur.completed += 1
    else cur.partial += 1
    chartMap.set(label, cur)
  }

  return {
    total, quick, full, quiz, completed, partial,
    avgValue, avgMultiple, avgRetention, hot,
    funnelMax, topStates, chartMap,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDollars = (n: number | null | undefined) =>
  n == null ? "N/A" : n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : `$${Math.round(n / 1000)}k`

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Single top-row KPI card */
function KpiCard({
  label, value, sub, trend, trendLabel,
}: {
  label: string
  value: string
  sub?: string
  trend?: "up" | "down" | "neutral"
  trendLabel?: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3">
      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-bold leading-none tracking-tight text-foreground">
          {value}
        </span>
        {trend && trendLabel && (
          <span className={cn(
            "mb-0.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
            trend === "up"      && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
            trend === "down"    && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
            trend === "neutral" && "bg-muted text-muted-foreground",
          )}>
            {trend === "up"   && <TrendingUp  className="h-2.5 w-2.5" />}
            {trend === "down" && <TrendingDown className="h-2.5 w-2.5" />}
            {trendLabel}
          </span>
        )}
      </div>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  )
}

/** Horizontal funnel progress bar */
function FunnelBar({ label, count, max, color }: {
  label: string; count: number; max: number; color: string
}) {
  const pct = max > 0 ? Math.min(Math.round((count / max) * 100), 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12px] font-medium text-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">
          {count.toLocaleString()}
          <span className="ml-1 text-[10px] opacity-70">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Horizon pipeline helpers
function getNextStatus(current: Deal["status"]): Deal["status"] {
  if (current === "active")    return "completed"
  if (current === "completed") return "declined"
  if (current === "declined")  return "test"
  return "active"
}

const STATUS_STYLE: Record<Deal["status"], string> = {
  active:    "bg-secondary text-muted-foreground",
  completed: "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  declined:  "bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  test:      "bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-700",
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OverviewTab({ deals, onStatusChange, onDelete, onLoadDeal }: OverviewTabProps) {
  const [dateFilter, setDateFilter] = useState<DateFilterType>("30D")

  // All metrics derived from MASTER_LEADS — recomputed only when filter changes
  const filtered = useMemo(() => filterByWindow(MASTER_LEADS, dateFilter), [dateFilter])
  const m        = useMemo(() => deriveMetrics(filtered), [filtered])

  // Chart data passed directly as a prop — no localStorage, no SWR
  const chartData = useMemo(() => {
    // Scaffold every day in the window as 0, then overlay real counts
    const days   = dateFilter === "7D" ? 7 : dateFilter === "30D" ? 30 : 365
    const labels: string[] = []
    const now    = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      labels.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }))
    }
    return labels.map((label) => {
      const counts = m.chartMap.get(label) ?? { completed: 0, partial: 0 }
      return { date: label, completed: counts.completed, partial: counts.partial, total: counts.completed + counts.partial }
    })
  }, [filtered, m.chartMap, dateFilter])

  // Horizon pipeline derived values
  const activeDeals    = deals.filter((d) => d.status === "active")
  const completedDeals = deals.filter((d) => d.status === "completed")
  const pipelineValue  = activeDeals.reduce((sum, d) => sum + d.valuation, 0)

  return (
    <div className="space-y-4">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Agency Overview</h2>
          <p className="text-[11px] text-muted-foreground">
            {filtered.length} records · {dateFilter === "all" ? "all time" : `last ${dateFilter}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {(["7D", "30D", "all"] as DateFilterType[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={dateFilter === f ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setDateFilter(f)}
            >
              {f === "all" ? "All Time" : f}
            </Button>
          ))}
        </div>
      </div>

      {/* ── 4-card KPI row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Total Valuations"
          value={m.total.toLocaleString()}
          sub={`${m.quick} quick · ${m.full} full · ${m.quiz} quiz`}
          trend={m.total > 0 ? "up" : "neutral"}
          trendLabel={`${m.completed} completed`}
        />
        <KpiCard
          label="Avg Agency Value"
          value={fmtDollars(m.avgValue)}
          sub={m.avgValue != null ? `From ${m.full} full valuations` : "No full valuations yet"}
        />
        <KpiCard
          label="Avg Multiple"
          value={m.avgMultiple != null ? `${m.avgMultiple.toFixed(2)}x` : "N/A"}
          sub={m.avgMultiple != null ? `${m.full} full vals` : "No multiples on file"}
        />
        <KpiCard
          label="Avg Retention"
          value={m.avgRetention != null ? `${m.avgRetention.toFixed(1)}%` : "N/A"}
          sub={m.avgRetention != null ? `${m.hot} hot leads` : "No retention data yet"}
        />
      </div>

      {/* ── Two-column body ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[65fr_35fr]">

        {/* LEFT — Timeline + Funnel */}
        <div className="space-y-4">

          {/* Timeline chart — receives pre-computed primitive chartData, no internal state */}
          <ValuationSubmissionsTimeline chartData={chartData} />

          {/* Conversion Funnel */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Conversion Funnel
            </p>
            <div className="space-y-3">
              <FunnelBar label="All Submissions"    count={m.total}  max={m.funnelMax} color="bg-primary" />
              <FunnelBar label="Quick Valuations"   count={m.quick}  max={m.funnelMax} color="bg-sky-400" />
              <FunnelBar label="Full Valuations"    count={m.full}   max={m.funnelMax} color="bg-violet-500" />
              <FunnelBar label="Readiness Quizzes"  count={m.quiz}   max={m.funnelMax} color="bg-amber-500" />
              <FunnelBar label="Completed"          count={m.completed} max={m.funnelMax} color="bg-emerald-500" />
            </div>
          </div>
        </div>

        {/* RIGHT — Top States + Recent from MASTER_LEADS */}
        <div className="space-y-4">

          {/* Top States */}
          {m.topStates.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Top States
              </p>
              <div className="space-y-2">
                {m.topStates.map((row, i) => {
                  const pct = Math.round((row.count / m.topStates[0].count) * 100)
                  return (
                    <div key={row.state} className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-[11px] text-muted-foreground">{i + 1}</span>
                      <div className="flex-1">
                        <div className="mb-0.5 flex justify-between">
                          <span className="text-[12px] font-medium text-foreground">{row.state}</span>
                          <span className="text-[11px] text-muted-foreground">{row.count}</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary/60 transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent submissions from MASTER_LEADS (last 8) */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Recent Activity
              </p>
              <span className="text-[11px] text-muted-foreground">{filtered.length} total</span>
            </div>
            <div className="max-h-64 divide-y divide-border overflow-y-auto">
              {[...filtered].reverse().slice(0, 10).map((lead) => (
                <div key={lead.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <div className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold",
                    lead.type === "full"  ? "bg-violet-500" :
                    lead.type === "quiz"  ? "bg-amber-500"  : "bg-primary/90",
                  )}>
                    {lead.type === "full" ? "F" : lead.type === "quiz" ? "Q" : "V"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-foreground">
                      {lead.type === "full" ? "Full valuation" : lead.type === "quiz" ? "Quiz submission" : "Quick valuation"}
                      <span className="ml-1.5 rounded border border-border px-1 py-px text-[10px] font-medium uppercase text-muted-foreground">
                        {lead.state}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      <span className={cn(
                        "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
                        lead.status === "completed" ? "bg-emerald-500" : "bg-amber-400",
                      )} />
                      {lead.status}
                      <span className="ml-1.5 opacity-70">{timeAgo(lead.createdAt)}</span>
                    </p>
                  </div>
                  {lead.value > 0 && (
                    <span className="shrink-0 text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                      {fmtDollars(lead.value)}
                    </span>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">No activity in this window.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Horizon Pipeline ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Horizon Pipeline
            </p>
            <p className="text-[11px] text-muted-foreground">Deals tracked in this browser</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span><span className="font-bold text-foreground">{activeDeals.length}</span> active</span>
            <span><span className="font-bold text-emerald-500">{completedDeals.length}</span> closed</span>
            <span className="font-bold text-primary">{fmtDollars(pipelineValue)}</span>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {deals.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              No saved deals yet. Add them from the Horizon Pipeline tab.
            </p>
          ) : (
            deals.map((deal) => {
              const daysOld = Math.floor((Date.now() - new Date(deal.date_saved).getTime()) / 86400000)
              return (
                <div
                  key={deal.id}
                  className="flex items-center justify-between border-b border-border px-4 py-2.5 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onLoadDeal(deal.id)}
                      className="text-left text-[13px] font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {deal.deal_name}
                    </button>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(deal.date_saved).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" · "}<span className="font-semibold uppercase">{deal.deal_type}</span>
                      {daysOld > 30 && deal.status === "active" && (
                        <span className="ml-2 font-bold text-amber-500">STALE ({daysOld}d)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onStatusChange(deal.id, getNextStatus(deal.status))}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase transition-colors",
                        STATUS_STYLE[deal.status],
                      )}
                    >
                      {deal.status}
                    </button>
                    <p className="w-20 text-right text-[13px] font-extrabold text-emerald-600 dark:text-emerald-400">
                      {fmtDollars(deal.valuation)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => { if (confirm("Delete this deal?")) onDelete(deal.id) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

    </div>
  )
}
