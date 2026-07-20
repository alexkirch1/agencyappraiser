"use client"

import useSWR from "swr"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart,
  ResponsiveContainer,
} from "recharts"
import {
  Trash2, TrendingUp, TrendingDown, DollarSign,
  Target, CheckCircle2, BarChart3,
  Percent, Users, Zap, FileText, Brain, RefreshCw,
  MapPin, Flame, X,
} from "lucide-react"
import type { Deal } from "./admin-dashboard"
import { cn } from "@/lib/utils"
import { ValuationSubmissionsTimeline } from "./valuation-submissions-timeline"

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewStats {
  totalLeads: number
  totalQuickVals: number
  totalFullVals: number
  totalQuizzes: number
  totalClosedDeals: number
  avgMultiple: number | null
  avgRevenueLTM: number | null
  avgRetention: number | null
  avgClosedMultiple: number | null
  avgClosedValue: number | null
  avgQuizScore: number | null
  leadsLast30: number
  fullValsLast30: number
  hotLeads: number
  avgLeadValue: number | null
}

interface ActivityItem {
  type: "lead" | "valuation"
  id: string
  label: string
  value: number
  createdAt: string
  extra: string | null
}

interface FunnelData {
  leads: number
  quickVals: number
  fullVals: number
  quizzes: number
  closed: number
}

interface InsightsData {
  abandonRate: number
  topState: { state: string; count: number } | null
  avgRevenue: number | null
  avgMultiple: number | null
}

interface OverviewData {
  stats: OverviewStats
  recentActivity: ActivityItem[]
  funnel: FunnelData
  topStates: { state: string; count: number }[]
  leadStages: { stage: string; count: number }[]
  insights: InsightsData
}

interface QuickValHistory {
  date: string
  count: number
  day: string
}

interface QuickValEntry {
  id: string
  created_at: string
  agency_description: string | null
  revenue_ltm: number | null
  low_offer: number | null
  high_offer: number | null
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface OverviewTabProps {
  deals: Deal[]
  onStatusChange: (id: string, status: Deal["status"]) => void
  onDelete: (id: string) => void
  onLoadDeal: (id: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ADMIN_TOKEN_KEY = "admin_session_token"

const fetcher = (url: string) => {
  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null
  return fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })
}

const fmtDollars = (n: number | null | undefined) =>
  n == null ? "—" : `$${Math.round(n).toLocaleString()}`

const fmtPct = (n: number | null | undefined, suffix = "%") =>
  n == null ? "—" : `${n.toFixed(1)}${suffix}`

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

type DateFilterType = "today" | "week" | "month" | "all"

interface DateFilterOption {
  value: DateFilterType
  label: string
}

const dateFilterOptions: DateFilterOption[] = [
  { value: "today", label: "Today" },
  { value: "week",  label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all",   label: "All Time" },
]

// ─── Micro sub-components ─────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}

/** Single top-row KPI card — Linear/Stripe style */
function KpiCard({
  label,
  value,
  sub,
  trend,
  trendLabel,
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
            {trend === "up"   && <TrendingUp   className="h-2.5 w-2.5" />}
            {trend === "down" && <TrendingDown  className="h-2.5 w-2.5" />}
            {trendLabel}
          </span>
        )}
      </div>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  )
}

/** Horizontal funnel progress bar */
function FunnelBar({
  label,
  count,
  max,
  color,
}: {
  label: string
  count: number
  max: number
  color: string
}) {
  const pct = max > 0 ? Math.min(Math.round((count / max) * 100), 100) : 0
  return (
    <div className="group">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12px] font-medium text-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">
          {count.toLocaleString()}
          <span className="ml-1 text-[10px] opacity-70">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/** Compact activity row */
function ActivityRow({ item }: { item: ActivityItem }) {
  const isLead = item.type === "lead"
  return (
    <div className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
      <div className={cn(
        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white",
        isLead ? "bg-primary/90" : "bg-violet-500/90",
      )}>
        {isLead
          ? <Users    className="h-3 w-3" />
          : <FileText className="h-3 w-3" />
        }
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium leading-snug text-foreground">
          {item.label}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {isLead ? "New lead" : "Full valuation"}
          {item.extra && (
            <span className="ml-1 rounded border border-border px-1 py-px text-[10px] font-medium uppercase">
              {item.extra}
            </span>
          )}
          <span className="ml-1.5 opacity-70">{timeAgo(item.createdAt)}</span>
        </p>
      </div>
      {item.value > 0 && (
        <span className="shrink-0 text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
          {fmtDollars(item.value)}
        </span>
      )}
    </div>
  )
}

// Horizon pipeline deal status helpers
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
  const [dateFilter, setDateFilter] = useState<DateFilterType>("week")

  const { data, error, isLoading, mutate } = useSWR<OverviewData>(
    `/api/admin/overview?filter=${dateFilter}`,
    fetcher,
    { refreshInterval: 60_000 },
  )

  const s      = data?.stats
  const funnel = data?.funnel
  const funnelMax = funnel?.leads ?? 1

  // Horizon pipeline derived values
  const activeDeals    = deals.filter((d) => d.status === "active")
  const completedDeals = deals.filter((d) => d.status === "completed")
  const pipelineValue  = activeDeals.reduce((sum, d) => sum + d.valuation, 0)
  const totalSubmissions = deals.filter((d) => d.status !== "test").length

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Agency Overview</h2>
          <p className="text-[11px] text-muted-foreground">Live data · all tools and database</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilterType)}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateFilterOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground"
            onClick={() => mutate()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          Failed to load overview data. Make sure you are authenticated.
        </div>
      )}

      {/* ── 4-card KPI row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : (
          <>
            <KpiCard
              label="Total Valuations"
              value={(s?.totalLeads ?? 0).toLocaleString()}
              sub={`${s?.leadsLast30 ?? 0} in last 30 days`}
              trend={s && s.leadsLast30 >= 5 ? "up" : "neutral"}
              trendLabel={`${s?.leadsLast30 ?? 0} this week`}
            />
            <KpiCard
              label="Avg Agency Value"
              value={s?.avgLeadValue != null ? `$${Math.round(s.avgLeadValue / 1000)}k` : "—"}
              sub="Across all full valuations"
            />
            <KpiCard
              label="Avg Multiple"
              value={s?.avgMultiple != null ? `${s.avgMultiple.toFixed(2)}x` : "—"}
              sub="Revenue multiple"
            />
            <KpiCard
              label="Avg Retention"
              value={s?.avgRetention != null ? `${s.avgRetention.toFixed(1)}%` : "—"}
              sub="Client retention rate"
            />
          </>
        )}
      </div>

      {/* ── Two-column body ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[65fr_35fr]">

        {/* LEFT — Timeline + Funnel */}
        <div className="space-y-4">

          {/* Timeline chart */}
          <ValuationSubmissionsTimeline deals={deals} />

          {/* Conversion funnel */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Conversion Funnel
            </p>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6" />)}
              </div>
            ) : funnel ? (
              <div className="space-y-3">
                <FunnelBar label="All Leads"         count={funnel.leads}     max={funnelMax} color="bg-primary" />
                <FunnelBar label="Quick Valuations"  count={funnel.quickVals} max={funnelMax} color="bg-sky-400" />
                <FunnelBar label="Full Valuations"   count={funnel.fullVals}  max={funnelMax} color="bg-violet-500" />
                <FunnelBar label="Readiness Quizzes" count={funnel.quizzes}   max={funnelMax} color="bg-amber-500" />
                <FunnelBar label="Closed Deals"      count={funnel.closed}    max={funnelMax} color="bg-emerald-500" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No funnel data yet.</p>
            )}
          </div>
        </div>

        {/* RIGHT — Activity feed + Top States */}
        <div className="space-y-4">

          {/* Recent Activity Feed */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Recent Activity
              </p>
              <span className="text-[11px] text-muted-foreground">
                {dateFilterOptions.find((o) => o.value === dateFilter)?.label}
              </span>
            </div>
            <div className="max-h-64 divide-y divide-border overflow-y-auto px-4">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2.5">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-2.5 w-40" />
                      <Skeleton className="h-2 w-24" />
                    </div>
                  </div>
                ))
              ) : (data?.recentActivity ?? []).length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No activity yet.</p>
              ) : (
                (data?.recentActivity ?? []).map((item) => (
                  <ActivityRow key={`${item.type}-${item.id}`} item={item} />
                ))
              )}
            </div>
          </div>

          {/* Top States */}
          {(isLoading || (data?.topStates ?? []).length > 0) && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Top States
              </p>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-5" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {(data?.topStates ?? []).map((row, i) => {
                    const max = data!.topStates[0].count
                    const pct = Math.round((row.count / max) * 100)
                    return (
                      <div key={row.state} className="flex items-center gap-2">
                        <span className="w-5 text-[11px] text-muted-foreground">{i + 1}</span>
                        <div className="flex-1">
                          <div className="mb-0.5 flex justify-between">
                            <span className="text-[12px] font-medium text-foreground">{row.state}</span>
                            <span className="text-[11px] text-muted-foreground">{row.count}</span>
                          </div>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary/60 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Lead Stages — only shown when data exists */}
          {!isLoading && (data?.leadStages ?? []).length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Lead Stages
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {(data?.leadStages ?? []).map((row) => (
                  <div
                    key={row.stage}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5"
                  >
                    <span className="text-[12px] capitalize text-foreground">{row.stage}</span>
                    <span className="text-[12px] font-bold text-foreground">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            <span><span className="font-bold text-foreground">{totalSubmissions}</span> total</span>
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
                      {new Date(deal.date_saved).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
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
