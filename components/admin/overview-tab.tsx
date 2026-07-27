"use client"

import { useMemo, useState, useCallback } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Trash2, RefreshCw, Zap } from "lucide-react"
import type { Deal } from "./admin-dashboard"
import { cn } from "@/lib/utils"
import { ValuationSubmissionsTimeline } from "./valuation-submissions-timeline"
import type { ChartDataPoint } from "./valuation-submissions-timeline"

// ─── AdminLead — mirrors the exact JOIN shape returned by /api/admin/leads ───

export interface AdminLead {
  // Core (leads table)
  id: number
  name: string | null
  email: string | null
  phone: string | null
  agency_name: string | null
  tool_used: "full_valuation" | "quick_value" | "quiz" | null
  estimated_value: number | null
  valuation_summary: string | null
  referral_source: string | null
  pipedrive_deal_id: number | null
  created_at: string
  stage: string | null
  last_activity: string | null
  archived: boolean
  archive_reason: string | null
  archived_at: string | null
  deleted_at: string | null
  notes: string | null

  // Full valuation (full_valuations JOIN)
  low_offer: number | null
  high_offer: number | null
  core_score: number | null
  calculated_multiple: number | null
  risk_grade: string | null
  revenue_ltm: number | null
  revenue_y2: number | null
  revenue_y3: number | null
  retention_rate: number | null
  sde_ebitda: number | null
  year_established: number | null
  employee_count: number | null
  owner_compensation: number | null
  annual_payroll_cost: number | null
  revenue_per_employee: number | null
  client_concentration: number | null
  carrier_diversification: number | null
  scope_of_sale: number | null
  avg_client_tenure: number | null
  new_business_value: number | null
  staff_retention_risk: string | null
  office_structure: string | null
  top_carriers: string | null
  producer_agreements: string | null
  closing_timeline: string | null
  primary_state: string | null
  eo_claims: number | null
  policy_mix: number | null
  agency_description: string | null

  // Quick valuation (quick_valuations JOIN)
  quick_revenue: number | null
  quick_retention: string | null
  book_type: string | null
  growth: string | null
  policy_ratio: number | null
  quick_policies: number | null
  quick_customers: number | null
  quick_multiplier: number | null
  suggested_mult: number | null
  quick_low: number | null
  quick_mid: number | null
  quick_high: number | null
  tier: string | null

  // Quiz (quiz_submissions JOIN)
  total_score: number | null
  max_score: number | null
  quiz_pct: number | null
  quiz_grade: string | null
  quiz_answers: unknown
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

/** Best available dollar value for a lead — in priority order. */
function getLeadValue(lead: AdminLead): number {
  return lead.estimated_value ?? lead.quick_mid ?? 0
}

/** Derive every metric the dashboard needs from a single AdminLead[]. No fallbacks. */
function deriveMetrics(leads: AdminLead[]) {
  const total = leads.length
  const quick = leads.filter((l) => l.tool_used === "quick_value").length
  const full  = leads.filter((l) => l.tool_used === "full_valuation").length
  const quiz  = leads.filter((l) => l.tool_used === "quiz").length

  // Total pipeline value: sum of getLeadValue across all leads
  const totalPipelineValue = leads.reduce((s, l) => s + getLeadValue(l), 0)

  // Avg calculated multiple — only full valuations with a calculated_multiple
  // (restricts to full_valuation so the count in the sub-label matches)
  const fullWithMultiple = leads.filter(
    (l) => l.tool_used === "full_valuation" && l.calculated_multiple != null
  )
  const avgMultiple = fullWithMultiple.length > 0
    ? fullWithMultiple.reduce((s, l) => s + Number(l.calculated_multiple!), 0) / fullWithMultiple.length
    : null

  // Hot leads: getLeadValue >= 500000 OR retention_rate >= 88
  const hotLeads = leads.filter(
    (l) => getLeadValue(l) >= 500_000 || (l.retention_rate != null && l.retention_rate >= 88)
  ).length

  // Funnel max = highest individual count (guarantees no bar > 100%)
  const funnelMax = Math.max(total, quick, full, quiz, 1)

  // Top 5 states (only leads where primary_state is present)
  const stateMap = new Map<string, number>()
  for (const l of leads) {
    if (!l.primary_state) continue
    stateMap.set(l.primary_state, (stateMap.get(l.primary_state) ?? 0) + 1)
  }
  const topStates = Array.from(stateMap.entries())
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Risk grade distribution (only full valuations with a risk_grade)
  const gradeMap = new Map<string, number>()
  for (const l of leads) {
    if (!l.risk_grade) continue
    gradeMap.set(l.risk_grade, (gradeMap.get(l.risk_grade) ?? 0) + 1)
  }
  const riskGrades = Array.from(gradeMap.entries())
    .map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => a.grade.localeCompare(b.grade))

  // Timeline chart — group by ISO date (YYYY-MM-DD from created_at)
  const chartMap = new Map<string, { completed: number; partial: number }>()
  for (const l of leads) {
    const day = l.created_at.slice(0, 10) // "YYYY-MM-DD"
    const cur = chartMap.get(day) ?? { completed: 0, partial: 0 }
    // A lead is "completed" if it has a full valuation offer
    if (l.high_offer != null || l.low_offer != null) cur.completed += 1
    else cur.partial += 1
    chartMap.set(day, cur)
  }

  return { total, quick, full, quiz, totalPipelineValue, avgMultiple, hotLeads, funnelMax, topStates, riskGrades, chartMap }
}

/** Build the scaffold + overlay for the timeline chart. */
function buildChartData(leads: AdminLead[], windowDays: number): ChartDataPoint[] {
  const { chartMap } = deriveMetrics(leads)
  const now = new Date()
  const points: ChartDataPoint[] = []
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key   = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const counts = chartMap.get(key) ?? { completed: 0, partial: 0 }
    points.push({ date: label, completed: counts.completed, partial: counts.partial, total: counts.completed + counts.partial })
  }
  return points
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

const fmtDollars = (n: number | null | undefined, showZero = false): string => {
  if (n == null) return "—"
  if (n === 0) return showZero ? "$0" : "—"
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${Math.round(n)}`
}

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, trend, trendLabel }: {
  label: string; value: string; sub?: string
  trend?: "up" | "down" | "neutral"; trendLabel?: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3">
      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-bold leading-none tracking-tight text-foreground">{value}</span>
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

const GRADE_STYLE: Record<string, string> = {
  A:  "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  B:  "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800",
  "B+": "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800",
  C:  "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  D:  "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
}

const TOOL_BADGE: Record<string, { label: string; style: string }> = {
  full_valuation: { label: "Full",  style: "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800" },
  quick_value:    { label: "Quick", style: "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800" },
  quiz:           { label: "Quiz",  style: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
}

// Horizon pipeline status helpers (unchanged)
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface OverviewTabProps {
  deals: Deal[]
  onStatusChange: (id: string, status: Deal["status"]) => void
  onDelete: (id: string) => void
  onLoadDeal: (id: string) => void
}

type WindowType = "7D" | "30D" | "all"

// Every admin API route requires Authorization: Bearer <token>.
// The token is stored in localStorage under "admin_session_token" after login.
const ADMIN_TOKEN_KEY = "admin_session_token"

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const fetcher = (url: string) =>
  fetch(url, { headers: getAuthHeaders() }).then((res) => {
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
    return res.json()
  })

// ─── Main Component ───────────────────────────────────────────────────────────

export function OverviewTab({ deals, onStatusChange, onDelete, onLoadDeal }: OverviewTabProps) {
  const [window, setWindow] = useState<WindowType>("30D")
  const [testLeadLoading, setTestLeadLoading] = useState(false)

  // ── Fetch real AdminLead[] from DB — single source of truth ─────────────
  const { data, isLoading, mutate } = useSWR<{ leads: AdminLead[] }>(
    "/api/admin/leads",
    fetcher,
    {
      refreshInterval: 5000,   // re-poll every 5 s so new submissions appear immediately
      revalidateOnFocus: true, // re-fetch when the admin tab regains focus
    },
  )

  // allLeads: every non-deleted row from the API (active + archived)
  // Used for historical analytics so archived records are never erased from stats
  const allLeads = useMemo<AdminLead[]>(() => {
    if (!data?.leads) return []
    return data.leads.filter((l) => !l.deleted_at)
  }, [data])

  // activeLeads: only non-archived, non-deleted rows — used for pipeline metrics
  const activeLeads = useMemo<AdminLead[]>(
    () => allLeads.filter((l) => !l.archived),
    [allLeads],
  )

  // Apply time-window filter to allLeads before deriving historical metrics
  const filteredAll = useMemo<AdminLead[]>(() => {
    if (window === "all") return allLeads
    const days = window === "7D" ? 7 : 30
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString()
    return allLeads.filter((l) => l.created_at >= cutoffStr)
  }, [allLeads, window])

  // Apply time-window filter to activeLeads for pipeline metrics
  const filteredActive = useMemo<AdminLead[]>(() => {
    if (window === "all") return activeLeads
    const days = window === "7D" ? 7 : 30
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString()
    return activeLeads.filter((l) => l.created_at >= cutoffStr)
  }, [activeLeads, window])

  // Historical metrics from allLeads (totals, funnel, multiples, states, grades, chart)
  const mAll = useMemo(() => deriveMetrics(filteredAll), [filteredAll])

  // Pipeline-only metrics from activeLeads (pipeline $, hot leads)
  const mActive = useMemo(() => deriveMetrics(filteredActive), [filteredActive])

  // Chart data built from allLeads (historical, includes archived)
  const chartData = useMemo<ChartDataPoint[]>(() => {
    const days = window === "7D" ? 7 : window === "30D" ? 30 : 90
    return buildChartData(filteredAll, days)
  }, [filteredAll, window])

  // Recent Activity: top 10 newest from allLeads (includes archived, shows badge)
  const recentActivity = useMemo<AdminLead[]>(() =>
    [...allLeads]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10),
  [allLeads])

  // ── Test Lead — inserts a real DB row to verify end-to-end connectivity ──
  const handleAddTestLead = useCallback(async () => {
    setTestLeadLoading(true)
    try {
      const res = await fetch("/api/admin/test-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      })
      const json = await res.json()
      if (!res.ok) {
        alert(`Test lead failed (${res.status}): ${json.error ?? "Unknown error"}`)
      } else {
        await mutate()
      }
    } catch {
      alert("Test lead request threw an error — check the console.")
    } finally {
      setTestLeadLoading(false)
    }
  }, [mutate])

  // Horizon pipeline derived values (localStorage-backed, separate from DB leads)
  const activeDeals    = deals.filter((d) => d.status === "active")
  const completedDeals = deals.filter((d) => d.status === "completed")
  const pipelineValue  = activeDeals.reduce((s, d) => s + d.valuation, 0)

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Agency Overview</h2>
          <p className="text-[11px] text-muted-foreground">
            {isLoading ? "Loading..." : `${filteredAll.length} records (${filteredActive.length} active) · ${window === "all" ? "all time" : `last ${window}`}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm" variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground"
            onClick={() => mutate()}
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm" variant="outline"
            className="h-7 gap-1 px-2 text-[11px] font-medium text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/20"
            onClick={handleAddTestLead}
            disabled={testLeadLoading}
            title="Insert a test lead to verify DB connectivity"
          >
            <Zap className="h-3 w-3" />
            {testLeadLoading ? "Adding…" : "Test Lead"}
          </Button>
          {(["7D", "30D", "all"] as WindowType[]).map((f) => (
            <Button
              key={f} size="sm"
              variant={window === f ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setWindow(f)}
            >
              {f === "all" ? "All Time" : f}
            </Button>
          ))}
        </div>
      </div>

      {/* ── 4 KPI cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Historical — uses allLeads so archived records count */}
        <KpiCard
          label="Total Valuations"
          value={isLoading ? "—" : mAll.total.toLocaleString()}
          sub={isLoading ? "Loading…" : (() => {
            const parts: string[] = []
            if (mAll.quick > 0) parts.push(`${mAll.quick} Quick`)
            if (mAll.full  > 0) parts.push(`${mAll.full} Full`)
            if (mAll.quiz  > 0) parts.push(`${mAll.quiz} Quiz`)
            return parts.length > 0 ? parts.join(" · ") : "No completed valuations yet"
          })()}
          trend={mAll.total > 0 ? "up" : "neutral"}
          trendLabel={`${mAll.total} total`}
        />
        {/* Pipeline — lead pipeline + active Horizon deals */}
        {(() => {
          const totalPipeline = mActive.totalPipelineValue + pipelineValue
          const leadCount     = filteredActive.length
          const dealCount     = activeDeals.length
          let pipelineSub: string
          if (totalPipeline > 0) {
            const parts: string[] = []
            if (leadCount > 0) parts.push(`${leadCount} lead${leadCount !== 1 ? "s" : ""}`)
            if (dealCount > 0) parts.push(`${dealCount} Horizon deal${dealCount !== 1 ? "s" : ""}`)
            pipelineSub = parts.join(" · ") || "Active pipeline"
          } else {
            pipelineSub = "No active pipeline on file"
          }
          return (
            <KpiCard
              label="Est. Pipeline"
              value={isLoading ? "—" : fmtDollars(totalPipeline, true)}
              sub={isLoading ? "Loading…" : pipelineSub}
            />
          )
        })()}
        {/* Historical — uses full valuations only for accurate average */}
        <KpiCard
          label="Avg Multiple"
          value={isLoading ? "—" : mAll.avgMultiple != null ? `${mAll.avgMultiple.toFixed(2)}x` : "—"}
          sub={isLoading ? "Loading…" : mAll.avgMultiple != null
            ? `From ${mAll.full} full valuation${mAll.full !== 1 ? "s" : ""}`
            : mAll.total > 0 ? "No full valuations in range" : "No valuations yet"
          }
        />
        {/* Pipeline — active hot leads needing follow-up */}
        <KpiCard
          label="Hot Leads"
          value={isLoading ? "—" : mActive.hotLeads.toLocaleString()}
          sub="Active · ≥$500k or ≥88% retention"
          trend={mActive.hotLeads > 0 ? "up" : "neutral"}
          trendLabel={`${mActive.hotLeads} active`}
        />
      </div>

      {/* ── Two-column body ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[65fr_35fr]">

        {/* LEFT — Timeline + Funnel */}
        <div className="space-y-4">

          <ValuationSubmissionsTimeline chartData={chartData} />

          {/* Conversion Funnel */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Conversion Funnel
            </p>
            {isLoading ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>
            ) : (() => {
                const horizonCount = deals.length
                const funnelTotal  = mAll.total + horizonCount
                const funnelMax    = Math.max(funnelTotal, mAll.quick, mAll.full, mAll.quiz, horizonCount, 1)
                return (
                  <div className="space-y-3">
                    <FunnelBar label="All Submissions"    count={funnelTotal}    max={funnelMax} color="bg-primary" />
                    <FunnelBar label="Quick Valuations"   count={mAll.quick}     max={funnelMax} color="bg-sky-400" />
                    <FunnelBar label="Full Valuations"    count={mAll.full}      max={funnelMax} color="bg-violet-500" />
                    <FunnelBar label="Readiness Quizzes"  count={mAll.quiz}      max={funnelMax} color="bg-amber-500" />
                    {horizonCount > 0 && (
                      <FunnelBar label="Horizon Book Deals" count={horizonCount} max={funnelMax} color="bg-emerald-500" />
                    )}
                  </div>
                )
              })()}
          </div>
        </div>

        {/* RIGHT — Top States + Risk Grades + Recent Activity */}
        <div className="space-y-4">

          {/* Top States — only renders when primary_state data exists */}
          {!isLoading && mAll.topStates.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Top States
              </p>
              <div className="space-y-2">
                {mAll.topStates.map((row, i) => {
                  const pct = Math.round((row.count / mAll.topStates[0].count) * 100)
                  return (
                    <div key={row.state} className="flex items-center gap-2">
                      <span className="w-4 shrink-0 text-[11px] text-muted-foreground">{i + 1}</span>
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

          {/* Risk Grade Distribution — only renders when full valuation grades exist */}
          {!isLoading && mAll.riskGrades.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Risk Grade Distribution
              </p>
              <div className="flex flex-wrap gap-2">
                {mAll.riskGrades.map(({ grade, count }) => (
                  <div
                    key={grade}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-semibold",
                      GRADE_STYLE[grade] ?? "bg-muted text-muted-foreground border-border",
                    )}
                  >
                    <span>Grade {grade}</span>
                    <span className="rounded-full bg-white/30 px-1.5 py-px text-[10px] font-bold">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity — reads directly from DB AdminLead[], newest first */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Recent Activity
              </p>
              {!isLoading && (
                <span className="text-[11px] text-muted-foreground">{recentActivity.length} shown</span>
              )}
            </div>
            <div className="max-h-72 divide-y divide-border overflow-y-auto">
              {isLoading && (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</p>
              )}
              {!isLoading && recentActivity.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                  No leads found in database.
                </p>
              )}
              {!isLoading && recentActivity.map((lead) => {
                const toolKey = lead.tool_used ?? ""
                const badge   = TOOL_BADGE[toolKey] ?? { label: "Lead", style: "bg-muted text-muted-foreground border-border" }
                const value   = getLeadValue(lead)
                const displayName = lead.agency_name ?? lead.name ?? `Lead #${lead.id}`
                return (
                  <div key={lead.id} className="flex items-start gap-2.5 px-4 py-2.5">
                    {/* Tool badge */}
                    <span className={cn(
                      "mt-0.5 shrink-0 rounded border px-1.5 py-px text-[10px] font-bold uppercase",
                      badge.style,
                    )}>
                      {badge.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-foreground">{displayName}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {lead.primary_state && (
                          <span className="rounded border border-border px-1 py-px text-[10px] uppercase">
                            {lead.primary_state}
                          </span>
                        )}
                        {lead.archived && (
                          <span className="rounded border border-border bg-muted px-1 py-px text-[10px] text-muted-foreground">
                            Archived
                          </span>
                        )}
                        <span className="opacity-70">{timeAgo(lead.created_at)}</span>
                      </p>
                    </div>
                    {value > 0 && (
                      <span className="shrink-0 text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                        {fmtDollars(value)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Horizon Pipeline ────────────────────────────────────────────────── */}
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
              const revenue      = deal.revenue      ?? deal.premium_base ?? 0
              const totalPremium = deal.totalPremium ?? 0
              const multiple     = deal.multiple     ?? (deal.details?.multiple as number | undefined) ?? null
              return (
                <div key={deal.id} className="border-b border-border px-4 py-3 last:border-0 hover:bg-muted/30 transition-colors">
                  {/* Row 1: name + status + valuation + delete */}
                  <div className="flex items-start justify-between gap-2">
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
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => onStatusChange(deal.id, getNextStatus(deal.status))}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase transition-colors",
                          STATUS_STYLE[deal.status],
                        )}
                      >
                        {deal.status}
                      </button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => { if (confirm("Delete this deal?")) onDelete(deal.id) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {/* Row 2: revenue · premium · valuation @ multiple */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                    {revenue > 0 && (
                      <span className="text-muted-foreground">
                        Rev <span className="font-semibold text-foreground">{fmtDollars(revenue)}</span>
                      </span>
                    )}
                    {totalPremium > 0 && (
                      <span className="text-muted-foreground">
                        Prem <span className="font-semibold text-foreground">{fmtDollars(totalPremium)}</span>
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      Val{" "}
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {fmtDollars(deal.valuation)}
                      </span>
                      {multiple != null && (
                        <span className="ml-1 text-muted-foreground">@ {multiple.toFixed(2)}x</span>
                      )}
                    </span>
                    <button
                      onClick={() => onLoadDeal(deal.id)}
                      className="ml-auto text-primary underline-offset-2 hover:underline"
                    >
                      View Valuation
                    </button>
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
