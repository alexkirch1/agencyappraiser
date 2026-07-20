"use client"

import useSWR from "swr"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Trash2, TrendingUp, TrendingDown, DollarSign,
  Target, CheckCircle2, BarChart3,
  Percent, Users, Zap, FileText, Brain, RefreshCw,
  MapPin, Flame, X, Sparkles, AlertTriangle,
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

// ─── Date Filter ──────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, highlight, trend, trendLabel, size = "sm",
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  highlight?: "success" | "warning" | "primary" | "destructive" | "neutral"
  trend?: "up" | "down" | "neutral"
  trendLabel?: string
  size?: "sm" | "lg"
}) {
  const border = {
    success:     "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20",
    warning:     "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20",
    primary:     "border-primary/30 bg-primary/5",
    destructive: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20",
    neutral:     "border-border",
  }[highlight ?? "neutral"]

  const valueColor = {
    success:     "text-emerald-600 dark:text-emerald-400",
    warning:     "text-amber-600 dark:text-amber-400",
    primary:     "text-primary",
    destructive: "text-red-600 dark:text-red-400",
    neutral:     "text-foreground",
  }[highlight ?? "neutral"]

  return (
    <Card className={cn("transition-all hover:shadow-md", border)}>
      <CardContent className={size === "lg" ? "p-5" : "p-4"}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
          </div>
          {trend && (
            <span className={cn(
              "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
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
        <p className={cn("mt-2 font-extrabold", size === "lg" ? "text-3xl" : "text-2xl", valueColor)}>
          {value}
        </p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

/**
 * FunnelBar — percentage is always relative to the top-of-funnel count (funnelMax)
 * so percentages are guaranteed to be ≤ 100%.
 */
function FunnelBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(Math.round((count / max) * 100), 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {count.toLocaleString()}{" "}
          <span className="text-[10px]">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}

function EnhancedQuickValsCard({
  value, trend, sparklineData, isLoading, onOpenDrawer,
}: {
  value: string | number
  trend?: number
  sparklineData?: QuickValHistory[]
  isLoading: boolean
  onOpenDrawer: () => void
}) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md border-border col-span-2 sm:col-span-2"
      onClick={onOpenDrawer}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Zap className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Quick Valuations</span>
          </div>
          {trend !== undefined && trend > 0 && (
            <span className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <TrendingUp className="h-2.5 w-2.5" />
              +{trend} this week
            </span>
          )}
        </div>
        <p className="text-2xl font-extrabold text-foreground">{value}</p>
        {!isLoading && sparklineData && sparklineData.length > 0 && (
          <div className="mt-3 h-8 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <CartesianGrid strokeDasharray="0" stroke="transparent" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border:          "1px solid hsl(var(--border))",
                    borderRadius:    "6px",
                    fontSize:        "11px",
                  }}
                  formatter={(value: any) => `${value} vals`}
                  labelFormatter={(label: any) => `${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Click to view recent activity →</p>
      </CardContent>
    </Card>
  )
}

function RecentActivityModal({
  open, onOpenChange, entries, isLoading, dateFilter,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entries?: QuickValEntry[]
  isLoading: boolean
  dateFilter: DateFilterType
}) {
  const filterLabel = dateFilterOptions.find((o) => o.value === dateFilter)?.label ?? "All Time"

  const fmtTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    let prefix = date.toDateString() === today.toDateString()     ? "Today"
               : date.toDateString() === yesterday.toDateString() ? "Yesterday"
               : date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    return `${prefix} at ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-h-[80vh] overflow-hidden flex flex-col sm:max-w-md">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Quick Valuations</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">From {filterLabel.toLowerCase()}</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-5">
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
            ) : entries && entries.length > 0 ? (
              entries.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {entry.agency_description || "Agency Valuation"}
                      </p>
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">Standard</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{fmtTime(entry.created_at)}</p>
                    {entry.low_offer !== null && entry.high_offer !== null && (
                      <p className="mt-2 text-xs font-medium text-primary">
                        {fmtDollars(entry.low_offer)} – {fmtDollars(entry.high_offer)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No quick valuations {filterLabel.toLowerCase()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Smart Insights Banner ────────────────────────────────────────────────────

function SmartInsightsBanner({ insights, stats, isLoading }: {
  insights: InsightsData | undefined
  stats: OverviewStats | undefined
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (!insights || !stats) return null

  type InsightItem = { icon: React.ElementType; label: string; body: string; color: string }

  const items: InsightItem[] = []

  // 1. Conversion drop-off
  if (stats.totalQuickVals > 0) {
    const abandon = insights.abandonRate
    items.push({
      icon: abandon >= 50 ? AlertTriangle : TrendingUp,
      label: "Conversion Drop-off",
      body: abandon >= 0
        ? `${abandon}% of Quick Valuations don't progress to a Full Valuation. Consider adding an email follow-up sequence.`
        : "Conversion from Quick to Full Valuations is tracking well.",
      color: abandon >= 50 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
    })
  } else {
    items.push({
      icon: Zap,
      label: "Conversion Drop-off",
      body: "No Quick Valuations recorded yet. Share the tool link to start capturing agency leads.",
      color: "text-muted-foreground",
    })
  }

  // 2. Geographic hotspot
  if (insights.topState) {
    items.push({
      icon: MapPin,
      label: "Geographic Hotspot",
      body: `${insights.topState.state} is your highest-volume region with ${insights.topState.count} valuation${insights.topState.count !== 1 ? "s" : ""}.`,
      color: "text-primary",
    })
  } else {
    items.push({
      icon: MapPin,
      label: "Geographic Hotspot",
      body: "No state data yet. Full Valuations capture primary state automatically.",
      color: "text-muted-foreground",
    })
  }

  // 3. Deal quality
  const hasQuality = insights.avgRevenue != null || insights.avgMultiple != null
  items.push({
    icon: DollarSign,
    label: "Deal Quality",
    body: hasQuality
      ? [
          insights.avgRevenue  != null ? `Avg agency revenue on file is ${fmtDollars(insights.avgRevenue)}.` : null,
          insights.avgMultiple != null ? `Average multiple is ${insights.avgMultiple.toFixed(2)}x.` : null,
        ].filter(Boolean).join(" ")
      : "No full valuation data yet — multiples and revenue will appear once agencies complete the full tool.",
    color: hasQuality ? "text-foreground" : "text-muted-foreground",
  })

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Smart Executive Insights</span>
        <span className="text-xs text-muted-foreground">— generated from live data</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border bg-background/70 px-3 py-2.5"
          >
            <div className="mb-1 flex items-center gap-1.5">
              <item.icon className={cn("h-3.5 w-3.5 flex-shrink-0", item.color)} />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-foreground">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Horizon deal row helpers ─────────────────────────────────────────────────

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
  const [quickValsDrawerOpen, setQuickValsDrawerOpen] = useState(false)

  // All data fetched from one SWR call — filter param syncs every section
  const { data, error, isLoading, mutate } = useSWR<OverviewData>(
    `/api/admin/overview?filter=${dateFilter}`,
    fetcher,
    { refreshInterval: 60_000 }
  )

  const { data: quickValsHistory, isLoading: quickValsLoading } = useSWR<QuickValHistory[]>(
    `/api/admin/analytics/quick-vals-history?filter=${dateFilter}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const { data: quickValsList, isLoading: quickValsListLoading } = useSWR<QuickValEntry[]>(
    quickValsDrawerOpen ? `/api/admin/analytics/quick-vals-list?filter=${dateFilter}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const s       = data?.stats
  const funnel  = data?.funnel
  // Funnel top-of-funnel is always "All Leads" — every subsequent stage is relative to this
  const funnelMax = funnel?.leads ?? 1

  // Horizon pipeline (localStorage deals)
  const activeDeals     = deals.filter((d) => d.status === "active")
  const completedDeals  = deals.filter((d) => d.status === "completed")
  const totalSubmissions = deals.filter((d) => d.status !== "test").length
  const pipelineValue   = activeDeals.reduce((sum, d) => sum + d.valuation, 0)

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Agency Overview</h2>
          <p className="text-xs text-muted-foreground">Live data from all tools and the database</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateFilter} onValueChange={(val) => setDateFilter(val as DateFilterType)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
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
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => mutate()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Failed to load overview data. Make sure you are authenticated.
        </div>
      )}

      {/* ── Smart Executive Insights ────────────────────────────────────────── */}
      <SmartInsightsBanner insights={data?.insights} stats={s} isLoading={isLoading} />

      {/* ── Primary KPIs ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[90px]" />)
        ) : (
          <>
            <StatCard
              label="Total Leads"
              value={s?.totalLeads.toLocaleString() ?? "0"}
              sub={`${s?.leadsLast30 ?? 0} in last 30 days`}
              icon={Users}
              highlight="primary"
              size="lg"
              trend={s && s.leadsLast30 >= 5 ? "up" : s && s.leadsLast30 >= 1 ? "neutral" : "down"}
              trendLabel={s ? `${s.leadsLast30} new` : undefined}
            />
            <StatCard
              label="Full Valuations"
              value={s?.totalFullVals.toLocaleString() ?? "0"}
              sub={`${s?.fullValsLast30 ?? 0} in last 30 days`}
              icon={FileText}
              highlight="neutral"
              size="lg"
            />
            <StatCard
              label="Avg Multiple"
              value={s?.avgMultiple != null ? `${s.avgMultiple.toFixed(2)}x` : "—"}
              sub="Across all full valuations"
              icon={TrendingUp}
              highlight="success"
              size="lg"
            />
            <StatCard
              label="Hot Leads"
              value={s?.hotLeads.toLocaleString() ?? "0"}
              sub={fmtDollars(s?.avgLeadValue) + " avg value"}
              icon={Flame}
              highlight="warning"
              size="lg"
            />
          </>
        )}
      </div>

      {/* ── Secondary metrics ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[76px]" />)
        ) : (
          <>
            <EnhancedQuickValsCard
              value={s?.totalQuickVals.toLocaleString() ?? "0"}
              trend={s ? Math.max(0, s.totalQuickVals - (s.fullValsLast30 ?? 0)) : undefined}
              sparklineData={quickValsHistory}
              isLoading={quickValsLoading}
              onOpenDrawer={() => setQuickValsDrawerOpen(true)}
            />
            <StatCard label="Quizzes"            value={s?.totalQuizzes.toLocaleString()    ?? "0"} icon={Brain} />
            <StatCard label="Avg Quiz Score"     value={fmtPct(s?.avgQuizScore)}                    icon={Percent} />
            <StatCard label="Closed Deals"       value={s?.totalClosedDeals.toLocaleString() ?? "0"} icon={CheckCircle2} highlight="success" />
            <StatCard label="Avg Close $"        value={fmtDollars(s?.avgClosedValue)}              icon={DollarSign} highlight="success" />
            <StatCard label="Avg Close Multiple" value={s?.avgClosedMultiple != null ? `${s.avgClosedMultiple.toFixed(2)}x` : "—"} icon={BarChart3} />
            <StatCard label="Avg Retention"      value={fmtPct(s?.avgRetention)}                   icon={Target} />
            <StatCard label="Avg Revenue"        value={s?.avgRevenueLTM != null ? `$${(s.avgRevenueLTM / 1000).toFixed(0)}k` : "—"} sub="LTM across valuations" icon={DollarSign} />
          </>
        )}
      </div>

      {/* ── Recent Activity Modal ──────────────────────────────────────────── */}
      <RecentActivityModal
        open={quickValsDrawerOpen}
        onOpenChange={setQuickValsDrawerOpen}
        entries={quickValsList}
        isLoading={quickValsListLoading}
        dateFilter={dateFilter}
      />

      {/* ── Funnel + Top States ─────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Conversion funnel — top bar is always 100%, all others relative to it */}
        <Card className="border-border">
          <CardContent className="p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Conversion Funnel
            </h3>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7" />)}
              </div>
            ) : funnel ? (
              <div className="space-y-3">
                {/* All Leads is always 100% — it is the funnelMax */}
                <FunnelBar label="All Leads"          count={funnel.leads}     max={funnelMax} color="bg-primary" />
                <FunnelBar label="Quick Valuations"   count={funnel.quickVals} max={funnelMax} color="bg-sky-400" />
                <FunnelBar label="Full Valuations"    count={funnel.fullVals}  max={funnelMax} color="bg-violet-500" />
                <FunnelBar label="Readiness Quizzes"  count={funnel.quizzes}   max={funnelMax} color="bg-amber-500" />
                <FunnelBar label="Closed Deals"       count={funnel.closed}    max={funnelMax} color="bg-emerald-500" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Top states + lead stage breakdown */}
        <div className="space-y-4">
          <Card className="border-border">
            <CardContent className="p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Top States by Valuations
              </h3>
              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-5" />)}</div>
              ) : (data?.topStates ?? []).length > 0 ? (
                <div className="space-y-2">
                  {(data?.topStates ?? []).map((row) => (
                    <div key={row.state} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5 text-foreground">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {row.state}
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">{row.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No state data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Lead Stage Breakdown
              </h3>
              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5" />)}</div>
              ) : (data?.leadStages ?? []).length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {(data?.leadStages ?? []).map((row) => (
                    <div key={row.stage} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-1.5 text-sm">
                      <span className="capitalize text-foreground">{row.stage}</span>
                      <span className="font-bold text-foreground">{row.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No lead stages yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Valuation Submissions Timeline ─────────────────────────────────── */}
      <ValuationSubmissionsTimeline deals={deals} />

      {/* ── Recent Activity ─────────────────────────────────────────────────── */}
      <Card className="border-border overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-5 py-3">
          <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
          <span className="text-xs text-muted-foreground">
            {dateFilterOptions.find((o) => o.value === dateFilter)?.label ?? "All Time"}
          </span>
        </div>
        <div className="divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-2.5 w-28" />
                </div>
              </div>
            ))
          ) : (data?.recentActivity ?? []).length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            (data?.recentActivity ?? []).map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/20 transition-colors"
              >
                <div className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white",
                  item.type === "lead" ? "bg-primary" : "bg-violet-500"
                )}>
                  {item.type === "lead"
                    ? <Users    className="h-3.5 w-3.5" />
                    : <FileText className="h-3.5 w-3.5" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.type === "lead" ? "New lead" : "Full valuation"}
                    {item.extra && <span className="ml-1 font-semibold uppercase">&middot; {item.extra}</span>}
                    <span className="ml-2">{timeAgo(item.createdAt)}</span>
                  </p>
                </div>
                {item.value > 0 && (
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {fmtDollars(item.value)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* ── Horizon Pipeline (localStorage) ────────────────────────────────── */}
      <Card className="overflow-hidden border-border">
        <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Horizon Pipeline</h3>
            <p className="text-xs text-muted-foreground">Deals tracked in this browser</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span><span className="font-bold text-foreground">{activeDeals.length}</span> active</span>
            <span><span className="font-bold text-emerald-500">{completedDeals.length}</span> closed</span>
            <span><span className="font-bold text-muted-foreground">{totalSubmissions}</span> submissions</span>
            <span className="font-bold text-primary">{fmtDollars(pipelineValue)}</span>
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {deals.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No saved deals yet. Add them from the Horizon Pipeline tab.
            </p>
          ) : (
            deals.map((deal) => {
              const daysOld = Math.floor((Date.now() - new Date(deal.date_saved).getTime()) / 86400000)
              return (
                <div
                  key={deal.id}
                  className="flex items-center justify-between border-b border-border px-5 py-3 last:border-0 hover:bg-secondary/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onLoadDeal(deal.id)}
                      className="text-left text-sm font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {deal.deal_name}
                    </button>
                    <p className="text-xs text-muted-foreground">
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
                      className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase transition-colors", STATUS_STYLE[deal.status])}
                    >
                      {deal.status}
                    </button>
                    <p className="w-24 text-right text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
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
      </Card>

    </div>
  )
}
