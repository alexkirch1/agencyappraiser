"use client"

import useSWR from "swr"

import {
  BarChart2,
  TrendingUp,
  DollarSign,
  Percent,
  Building2,
  Info,
  RefreshCw,
  MapPin,
  Users,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FeedbackWidget } from "@/components/feedback-widget"

// ─── Types ────────────────────────────────────────────────────────────────────

interface SizeTier {
  label: string
  tier: string
  count: number
  median: number | null
  p25: number | null
  p75: number | null
}

interface ByState  { state: string; count: number; medianMultiple: number | null }
interface ByStructure { structure: string; count: number; medianMultiple: number | null; avgEarnoutPct: number | null }
interface ByRetention { bucket: string; count: number; medianMultiple: number | null }
interface ByPoliciesPerCx { bucket: string; count: number; medianMultiple: number | null }
interface RecentDeal {
  dealName: string; dealType: string; finalMultiple: number | null; finalOffer: number | null
  dealStructure: string | null; earnoutPct: number | null; sellerStayMonths: number | null
  retentionRate: number | null; primaryState: string | null; closedAt: string | null
}

interface MarketStats {
  totalDeals: number
  medianMultiple: number | null
  avgMultiple: number | null
  p25Multiple: number | null
  p75Multiple: number | null
  earnoutRate: number | null
  medianEarnoutPct: number | null
  medianSellerStay: number | null
  avgOfferToEstimate: number | null
  bySize: SizeTier[]
  byState: ByState[]
  byStructure: ByStructure[]
  byRetention: ByRetention[]
  byPoliciesPerCx: ByPoliciesPerCx[]
  recentDeals: RecentDeal[]
}

// ─── Industry fallback benchmarks (used when DB sample is too small) ──────────

const FALLBACK_SIZE: SizeTier[] = [
  { label: "Micro  (< $250k)",     tier: "micro",      count: 0, median: 1.10, p25: 0.80, p75: 1.40 },
  { label: "Small  ($250k–$750k)", tier: "small",      count: 0, median: 1.40, p25: 1.00, p75: 1.80 },
  { label: "Mid    ($750k–$2M)",   tier: "mid",        count: 0, median: 1.70, p25: 1.30, p75: 2.20 },
  { label: "Large  ($2M–$5M)",     tier: "large",      count: 0, median: 2.00, p25: 1.50, p75: 2.60 },
  { label: "Enterprise  (> $5M)",  tier: "enterprise", count: 0, median: 2.30, p25: 1.80, p75: 3.00 },
]

const FALLBACK_RETENTION: { bucket: string; label: string; medianAdjustment: string; risk: string }[] = [
  { bucket: "under_75", label: "< 75%",   medianAdjustment: "−0.4x to −0.6x", risk: "High" },
  { bucket: "75_to_84", label: "75–84%",  medianAdjustment: "−0.1x to −0.3x", risk: "Moderate" },
  { bucket: "85_to_91", label: "85–91%",  medianAdjustment: "Baseline",        risk: "Average" },
  { bucket: "92_to_95", label: "92–95%",  medianAdjustment: "+0.2x to +0.4x", risk: "Low" },
  { bucket: "96_plus",  label: "96%+",    medianAdjustment: "+0.4x to +0.6x", risk: "Very Low" },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const fmt = (n: number | null | undefined) =>
  n != null ? `$${n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" : (n / 1_000).toFixed(0) + "k"}` : "—"

function retentionBucketLabel(bucket: string) {
  return (
    { under_75: "< 75%", "75_to_84": "75–84%", "85_to_91": "85–91%", "92_to_95": "92–95%", "96_plus": "96%+" }[bucket] ?? bucket
  )
}
function policiesBucketLabel(bucket: string) {
  return (
    { under_1_5: "< 1.5 pol/cx", "1_5_to_2": "1.5–2.0", "2_to_2_5": "2.0–2.5", "2_5_plus": "2.5+" }[bucket] ?? bucket
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DataBadge({ count, fallback }: { count: number; fallback: boolean }) {
  return fallback ? (
    <span className="ml-2 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
      Industry benchmark
    </span>
  ) : (
    <span className="ml-2 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
      {count} deal{count !== 1 ? "s" : ""} · live data
    </span>
  )
}

function MultipleBar({ low, mid, high }: { low: number; mid: number; high: number }) {
  const min = 0.6
  const max = 3.4
  const range = max - min
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / range) * 100))

  return (
    <div className="relative h-5 w-full rounded-full bg-secondary">
      <div
        className="absolute top-0 h-full rounded-full bg-primary/25"
        style={{ left: `${pct(low)}%`, width: `${pct(high) - pct(low)}%` }}
      />
      <div className="absolute top-0 h-full w-0.5 rounded-full bg-primary" style={{ left: `${pct(mid)}%` }} />
      <span className="absolute -bottom-5 -translate-x-1/2 font-mono text-[10px] text-muted-foreground" style={{ left: `${pct(low)}%` }}>
        {low.toFixed(2)}x
      </span>
      <span className="absolute -top-5 -translate-x-1/2 font-mono text-[10px] font-bold text-primary" style={{ left: `${pct(mid)}%` }}>
        {mid.toFixed(2)}x
      </span>
      <span className="absolute -bottom-5 -translate-x-1/2 font-mono text-[10px] text-muted-foreground" style={{ left: `${pct(high)}%` }}>
        {high.toFixed(2)}x
      </span>
    </div>
  )
}

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, string> = {
    High:     "bg-destructive/10 text-destructive border-destructive/30",
    Moderate: "bg-warning/10 text-warning border-warning/30",
    Average:  "bg-secondary text-muted-foreground border-border",
    Low:      "bg-success/10 text-success border-success/30",
    "Very Low":"bg-success/15 text-success border-success/40",
  }
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${map[risk] ?? "bg-secondary text-muted-foreground"}`}>
      {risk}
    </span>
  )
}

function Stat({ label, value, sub, icon: Icon, accent, accentBg }: {
  label: string; value: string; sub: string
  icon: React.ElementType; accent: string; accentBg: string
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentBg}`}>
          <Icon className={`h-4 w-4 ${accent}`} />
        </div>
        <p className={`font-mono text-2xl font-extrabold ${accent}`}>{value}</p>
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main tab ────────────�����───────────────────────────────────────────────────

export function MarketDataTab() {
  const { data, error, isLoading, mutate } = useSWR<MarketStats>(
    "/api/market-data/stats",
    fetcher,
    { revalidateOnFocus: false }
  )

  const hasData = !isLoading && !error && data != null && data.totalDeals > 0

  // For size tiers, prefer live data row-by-row but fall back to benchmark for tiers with 0 deals
  const sizeRows: Array<{ label: string; count: number; median: number; p25: number; p75: number; live: boolean }> = FALLBACK_SIZE.map((fb) => {
    const live = (data?.bySize ?? []).find((r) => r.tier === fb.tier)
    if (live && live.count >= 3 && live.median != null && live.p25 != null && live.p75 != null) {
      return { label: fb.label, count: live.count, median: live.median, p25: live.p25, p75: live.p75, live: true }
    }
    return { label: fb.label, count: live?.count ?? 0, median: fb.median!, p25: fb.p25!, p75: fb.p75!, live: false }
  })

  const retentionRows = (() => {
    if (!data || (data.byRetention ?? []).length === 0) return null
    const map = Object.fromEntries((data.byRetention ?? []).map((r) => [r.bucket, r]))
    return FALLBACK_RETENTION.map((fb) => {
      const live = map[fb.bucket]
      return { ...fb, liveMedian: live?.medianMultiple ?? null, count: live?.count ?? 0 }
    })
  })()

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Agency M&amp;A Deal Comps</h2>
            {hasData && (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                {data.totalDeals} closed deal{data.totalDeals !== 1 ? "s" : ""} on record
              </span>
            )}
          </div>
          <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
            {hasData
              ? `Live benchmarks computed from ${data.totalDeals} closed transaction${data.totalDeals !== 1 ? "s" : ""} recorded on this platform. Tiers with fewer than 3 deals fall back to published industry benchmarks.`
              : "Industry benchmarks shown below. Benchmarks will update automatically as you record closed deals on this platform."}
          </p>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              All multiples are revenue multiples on trailing 12-month commission &amp; fee income — not written premium.
              Ranges represent the 25th–75th percentile of observed outcomes.
            </p>
          </div>
        </div>
        <button
          onClick={() => mutate()}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border bg-card">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="h-9 w-9 animate-pulse rounded-lg bg-secondary" />
                <div className="h-7 w-24 animate-pulse rounded bg-secondary" />
                <div className="h-4 w-32 animate-pulse rounded bg-secondary" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Key stat tiles */}
      {!isLoading && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Median Closed Multiple"
            value={hasData && data.medianMultiple ? `${data.medianMultiple.toFixed(2)}x` : "1.60x"}
            sub={hasData ? `P25: ${data.p25Multiple?.toFixed(2)}x · P75: ${data.p75Multiple?.toFixed(2)}x` : "Industry benchmark"}
            icon={BarChart2}
            accent="text-primary"
            accentBg="bg-primary/10"
          />
          <Stat
            label="Deals With Earnout"
            value={hasData && data.earnoutRate != null ? `${Math.round(data.earnoutRate * 100)}%` : "55–70%"}
            sub={hasData && data.medianEarnoutPct != null ? `Median earnout portion: ${data.medianEarnoutPct.toFixed(0)}%` : "Of total deal value deferred"}
            icon={Percent}
            accent="text-warning"
            accentBg="bg-warning/10"
          />
          <Stat
            label="Median Seller Stay-On"
            value={hasData && data.medianSellerStay != null ? `${data.medianSellerStay} mo` : "12–24 mo"}
            sub="Post-close transition period"
            icon={Building2}
            accent="text-chart-5"
            accentBg="bg-chart-5/10"
          />
          <Stat
            label="Offer vs. Estimate"
            value={hasData && data.avgOfferToEstimate != null ? `${Math.round(data.avgOfferToEstimate * 100)}%` : "~95%"}
            sub={hasData ? "Avg final offer ÷ model appraisal" : "Industry benchmark"}
            icon={TrendingUp}
            accent="text-success"
            accentBg="bg-success/10"
          />
        </div>
      )}

      {/* Multiple by Agency Size */}
      <Card className="mb-6 border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
            <DollarSign className="h-5 w-5 text-primary" />
            Multiple Range by Agency Size
            <DataBadge count={data?.totalDeals ?? 0} fallback={!hasData} />
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Revenue multiples segmented by annual commission income. Green bars = live platform data; amber = industry benchmark.
          </p>
        </CardHeader>
        <CardContent className="space-y-8 pb-8">
          {sizeRows.map((row) => (
            <div key={row.tier} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono text-sm font-medium text-foreground">
                  {row.label}
                  {row.live ? (
                    <span className="rounded-full bg-success/10 px-1.5 py-0.5 font-sans text-[10px] text-success">
                      {row.count} deals
                    </span>
                  ) : (
                    <span className="rounded-full bg-warning/10 px-1.5 py-0.5 font-sans text-[10px] text-warning">
                      {row.count > 0 ? `${row.count} deal (benchmark)` : "benchmark"}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {row.p25.toFixed(2)}x – {row.p75.toFixed(2)}x
                </span>
              </div>
              <MultipleBar low={row.p25} mid={row.median} high={row.p75} />
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-5 rounded bg-primary" /> Median
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-5 rounded bg-primary/25" /> 25th–75th percentile
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Deal Structure breakdown */}
      <Card className="mb-6 border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
            <Percent className="h-5 w-5 text-primary" />
            Deal Structures
            <DataBadge count={data?.totalDeals ?? 0} fallback={!hasData || ((data?.byStructure ?? []).length) === 0} />
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            How closed agency acquisitions are structured, with median multiple for each structure type.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const structureFallback = [
              { structure: "All Cash at Close", count: 0, medianMultiple: 1.30, avgEarnoutPct: 0 },
              { structure: "Cash + Short Earnout (1–2 yr)", count: 0, medianMultiple: 1.60, avgEarnoutPct: 25 },
              { structure: "Cash + Extended Earnout (3–5 yr)", count: 0, medianMultiple: 1.75, avgEarnoutPct: 35 },
              { structure: "Equity Roll / Partnership", count: 0, medianMultiple: 2.10, avgEarnoutPct: 0 },
            ]
            const liveStructure = hasData ? (data.byStructure ?? []) : []
            const rows = liveStructure.length > 0 ? liveStructure : structureFallback
            const isLive = liveStructure.length > 0
            const total = isLive ? rows.reduce((s, r) => s + r.count, 0) : 100
            return rows.map((row) => {
              const pct = total > 0 ? Math.round((row.count / total) * 100) : 0
              const pctDisplay = isLive ? `${pct}%` : "—"
              return (
                <div key={row.structure} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{row.structure}</span>
                    <div className="flex items-center gap-3">
                      {row.medianMultiple != null && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {row.medianMultiple.toFixed(2)}x median
                        </span>
                      )}
                      <span className="w-10 text-right font-mono font-bold text-primary">{pctDisplay}</span>
                    </div>
                  </div>
                  {isLive && (
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div className="absolute left-0 top-0 h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {row.avgEarnoutPct != null && row.avgEarnoutPct > 0 && (
                    <p className="text-xs text-muted-foreground">Avg earnout component: {row.avgEarnoutPct.toFixed(0)}%</p>
                  )}
                </div>
              )
            })
          })()}
        </CardContent>
      </Card>

      {/* Retention impact */}
      <Card className="mb-6 border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
            <TrendingUp className="h-5 w-5 text-primary" />
            Retention Rate Impact on Multiple
            <DataBadge
              count={(data?.byRetention ?? []).reduce((s, r) => s + r.count, 0) ?? 0}
              fallback={!hasData || ((data?.byRetention ?? []).length) === 0}
            />
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Retention is the single largest driver of valuation multiple.
            {hasData && data.byRetention.length > 0 && " Live medians from your closed deals."}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-semibold text-muted-foreground">Retention Rate</th>
                  <th className="pb-2 font-semibold text-muted-foreground">
                    {retentionRows ? "Median Multiple (Live)" : "Multiple Adjustment"}
                  </th>
                  <th className="pb-2 font-semibold text-muted-foreground">Risk Level</th>
                  {retentionRows && <th className="pb-2 font-semibold text-muted-foreground">Deals</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(retentionRows ?? FALLBACK_RETENTION).map((row) => (
                  <tr key={row.bucket}>
                    <td className="py-3 font-mono font-medium text-foreground">{row.label}</td>
                    <td className="py-3 font-mono font-semibold text-primary">
                      {"liveMedian" in row && row.liveMedian != null
                        ? `${row.liveMedian.toFixed(2)}x`
                        : row.medianAdjustment}
                    </td>
                    <td className="py-3"><RiskBadge risk={row.risk} /></td>
                    {retentionRows && (
                      <td className="py-3 text-xs text-muted-foreground">
                        {"count" in row ? row.count : 0}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Policies per customer */}
      {hasData && data.byPoliciesPerCx.length > 0 && (
        <Card className="mb-6 border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
              <Users className="h-5 w-5 text-primary" />
              Policies per Customer vs. Multiple
              <DataBadge count={data.byPoliciesPerCx.reduce((s, r) => s + r.count, 0)} fallback={false} />
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Multi-line books command meaningfully higher multiples — more policies per customer signals stickier retention.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.byPoliciesPerCx.map((row) => (
                <div key={row.bucket} className="rounded-lg border border-border bg-secondary/30 p-4">
                  <p className="font-mono text-sm font-semibold text-foreground">{policiesBucketLabel(row.bucket)}</p>
                  <p className="mt-1 font-mono text-xl font-extrabold text-primary">
                    {row.medianMultiple != null ? `${row.medianMultiple.toFixed(2)}x` : "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{row.count} deal{row.count !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* State breakdown */}
      {hasData && data.byState.length > 0 && (
        <Card className="mb-6 border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
              <MapPin className="h-5 w-5 text-primary" />
              Deals by State
              <DataBadge count={data.byState.reduce((s, r) => s + r.count, 0)} fallback={false} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-semibold text-muted-foreground">State</th>
                    <th className="pb-2 font-semibold text-muted-foreground">Deals</th>
                    <th className="pb-2 font-semibold text-muted-foreground">Median Multiple</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.byState.map((row) => (
                    <tr key={row.state}>
                      <td className="py-2.5 font-medium text-foreground">{row.state}</td>
                      <td className="py-2.5 text-muted-foreground">{row.count}</td>
                      <td className="py-2.5 font-mono font-bold text-primary">
                        {row.medianMultiple != null ? `${row.medianMultiple.toFixed(2)}x` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Deals */}
      {hasData && data.recentDeals.length > 0 && (
        <Card className="mb-8 border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <BarChart2 className="h-5 w-5 text-primary" />
              Most Recent Closed Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-semibold text-muted-foreground">Deal</th>
                    <th className="pb-2 font-semibold text-muted-foreground">Type</th>
                    <th className="pb-2 font-semibold text-muted-foreground">Multiple</th>
                    <th className="pb-2 font-semibold text-muted-foreground">Final Offer</th>
                    <th className="pb-2 font-semibold text-muted-foreground">Structure</th>
                    <th className="pb-2 font-semibold text-muted-foreground">State</th>
                    <th className="pb-2 font-semibold text-muted-foreground">Closed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.recentDeals.map((d, i) => (
                    <tr key={i}>
                      <td className="py-2.5 font-medium text-foreground">{d.dealName}</td>
                      <td className="py-2.5 text-muted-foreground capitalize">{d.dealType}</td>
                      <td className="py-2.5 font-mono font-bold text-primary">
                        {d.finalMultiple != null ? `${d.finalMultiple.toFixed(2)}x` : "—"}
                      </td>
                      <td className="py-2.5 font-mono text-foreground">{fmt(d.finalOffer)}</td>
                      <td className="py-2.5 text-muted-foreground">{d.dealStructure ?? "—"}</td>
                      <td className="py-2.5 text-muted-foreground">{d.primaryState ?? "—"}</td>
                      <td className="py-2.5 text-muted-foreground">
                        {d.closedAt ? new Date(d.closedAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <div className="mb-6 rounded-lg border border-border bg-secondary/30 px-5 py-4 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Data Disclaimer:</strong> Live multiples are derived from deals recorded on this
        platform. Industry benchmarks (shown when live data is insufficient) are based on publicly available broker reports
        and industry surveys. These are general benchmarks — not a guarantee of any specific transaction outcome. For
        educational and planning purposes only.
      </div>

      <FeedbackWidget
        prompt="Have deal data to contribute or a question about these benchmarks?"
        placeholder="Share a transaction insight, ask a question, or suggest additional data points..."
        category="market-data"
      />
    </div>
  )
}
