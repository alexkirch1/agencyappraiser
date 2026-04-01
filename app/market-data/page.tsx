"use client"

import { useState, useEffect, useCallback } from "react"
import { BarChart2, TrendingUp, DollarSign, Percent, Building2, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MarketIntelPanel } from "@/components/market-intel-panel"
import { FeedbackWidget } from "@/components/feedback-widget"
import { AdminLogin } from "@/components/admin/admin-login"

const ADMIN_TOKEN_KEY = "admin_session_token"

// ─── Static industry benchmark data ─────────────────────────────────────────

const MULTIPLE_BY_SIZE = [
  { label: "Micro  (< $250k revenue)", low: 0.8, mid: 1.1, high: 1.4 },
  { label: "Small  ($250k – $750k)", low: 1.0, mid: 1.4, high: 1.8 },
  { label: "Mid    ($750k – $2M)", low: 1.3, mid: 1.7, high: 2.2 },
  { label: "Large  ($2M – $5M)", low: 1.5, mid: 2.0, high: 2.6 },
  { label: "Enterprise  (> $5M)", low: 1.8, mid: 2.3, high: 3.0 },
]

const MULTIPLE_BY_BOOK = [
  { label: "Mostly Personal Lines", low: 0.9, mid: 1.3, high: 1.7, note: "Lower predictability, higher lapse risk" },
  { label: "Mixed Book (PL + CL)", low: 1.1, mid: 1.6, high: 2.1, note: "Balanced risk/reward" },
  { label: "Mostly Commercial Lines", low: 1.4, mid: 2.0, high: 2.6, note: "Stickier accounts, higher revenue per policy" },
  { label: "Specialty / Niche Book", low: 1.5, mid: 2.1, high: 2.8, note: "Unique expertise commands a premium" },
]

const DEAL_STRUCTURE_BREAKDOWN = [
  { label: "All Cash at Close", pct: 28, note: "Rare — typically micro agencies or distressed sales" },
  { label: "Cash + Short Earnout (1–2 yr)", pct: 44, note: "Most common structure; seller retains some upside" },
  { label: "Cash + Extended Earnout (3–5 yr)", pct: 19, note: "Larger books with buyer uncertainty on retention" },
  { label: "Equity Roll / Partnership", pct: 9, note: "PE-backed roll-ups or agency mergers" },
]

const RETENTION_IMPACT = [
  { label: "< 75%", adjustment: "−0.4x to −0.6x", risk: "High" },
  { label: "75–84%", adjustment: "−0.1x to −0.3x", risk: "Moderate" },
  { label: "85–91%", adjustment: "Baseline", risk: "Average" },
  { label: "92–95%", adjustment: "+0.2x to +0.4x", risk: "Low" },
  { label: "96%+", adjustment: "+0.4x to +0.6x", risk: "Very Low" },
]

const KEY_METRICS = [
  {
    label: "Industry Median Multiple",
    value: "1.6x",
    sub: "All agency types, all sizes",
    icon: BarChart2,
    accent: "text-primary",
    accentBg: "bg-primary/10",
  },
  {
    label: "Commercial Line Premium",
    value: "+0.5–0.8x",
    sub: "vs. equivalent PL-heavy book",
    icon: TrendingUp,
    accent: "text-success",
    accentBg: "bg-success/10",
  },
  {
    label: "Typical Earnout Component",
    value: "15–35%",
    sub: "Of total deal value deferred",
    icon: Percent,
    accent: "text-warning",
    accentBg: "bg-warning/10",
  },
  {
    label: "Avg Seller Stay-On",
    value: "12–24 mo",
    sub: "Transition period post-close",
    icon: Building2,
    accent: "text-chart-5",
    accentBg: "bg-chart-5/10",
  },
]

// ─── Components ──────────────────────────────────────────────────────────────

function MultipleBar({ low, mid, high }: { low: number; mid: number; high: number }) {
  const min = 0.75
  const max = 3.2
  const range = max - min
  const toLeft = (v: number) => ((v - min) / range) * 100
  const barLeft = toLeft(low)
  const barWidth = toLeft(high) - toLeft(low)
  const midLeft = toLeft(mid)

  return (
    <div className="relative h-5 w-full rounded-full bg-secondary">
      {/* range bar */}
      <div
        className="absolute top-0 h-full rounded-full bg-primary/25"
        style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
      />
      {/* midpoint marker */}
      <div
        className="absolute top-0 h-full w-0.5 rounded-full bg-primary"
        style={{ left: `${midLeft}%` }}
      />
      {/* low / mid / high labels */}
      <span
        className="absolute -bottom-5 -translate-x-1/2 text-[10px] text-muted-foreground font-mono"
        style={{ left: `${toLeft(low)}%` }}
      >
        {low.toFixed(1)}x
      </span>
      <span
        className="absolute -top-5 -translate-x-1/2 text-[10px] font-bold text-primary font-mono"
        style={{ left: `${midLeft}%` }}
      >
        {mid.toFixed(1)}x
      </span>
      <span
        className="absolute -bottom-5 -translate-x-1/2 text-[10px] text-muted-foreground font-mono"
        style={{ left: `${toLeft(high)}%` }}
      >
        {high.toFixed(1)}x
      </span>
    </div>
  )
}

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, string> = {
    "High": "bg-destructive/10 text-destructive border-destructive/30",
    "Moderate": "bg-warning/10 text-warning border-warning/30",
    "Average": "bg-secondary text-muted-foreground border-border",
    "Low": "bg-success/10 text-success border-success/30",
    "Very Low": "bg-success/15 text-success border-success/40",
  }
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${map[risk] ?? "bg-secondary text-muted-foreground"}`}>
      {risk}
    </span>
  )
}

// ─── Auth gate ───────────────────────────────────────────────────────────────

function useAdminAuth() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      if (!token) { setAuthenticated(false); setChecking(false); return }
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", token }),
      })
      const data = await res.json()
      setAuthenticated(data.authenticated)
      if (!data.authenticated) localStorage.removeItem(ADMIN_TOKEN_KEY)
    } catch {
      setAuthenticated(false)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])

  const login = async (username: string, password: string) => {
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", username, password }),
    })
    const data = await res.json()
    if (data.success && data.token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token)
      setAuthenticated(true)
      return { success: true }
    }
    return { success: false, error: data.error || "Login failed" }
  }

  return { authenticated, checking, login }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MarketDataPage() {
  const { authenticated, checking, login } = useAdminAuth()

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <BarChart2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Market Data &amp; Deal Comps</h1>
          <p className="max-w-xs text-sm text-muted-foreground">
            This section is restricted to admin users. Sign in with your admin credentials to access deal benchmarks.
          </p>
        </div>
        <AdminLogin onLogin={login} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5">
          <BarChart2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Market Intelligence</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Agency M&amp;A Deal Comps
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-muted-foreground leading-relaxed">
          Benchmark your agency against real market data. These ranges reflect closed transactions
          in the independent P&amp;C insurance agency space and are updated as deals are recorded
          in our platform.
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            All multiples shown are revenue multiples applied to trailing 12-month commission &amp; fee
            income — not written premium. Industry data is sourced from broker reports, published
            transactions, and closed deals recorded on this platform. Ranges represent the 25th–75th
            percentile of observed outcomes.
          </p>
        </div>
      </div>

      {/* Key stat tiles */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KEY_METRICS.map((m) => (
          <Card key={m.label} className="border-border bg-card">
            <CardContent className="flex flex-col gap-3 p-5">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${m.accentBg}`}>
                <m.icon className={`h-4 w-4 ${m.accent}`} />
              </div>
              <p className={`text-2xl font-extrabold font-mono ${m.accent}`}>{m.value}</p>
              <div>
                <p className="text-sm font-semibold text-foreground">{m.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live deal comps panel */}
      <div className="mb-10">
        <MarketIntelPanel className="w-full" />
      </div>

      {/* Multiple by Agency Size */}
      <Card className="mb-8 border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <DollarSign className="h-5 w-5 text-primary" />
            Multiple Range by Agency Size
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Revenue multiples observed in closed transactions, segmented by annual commission revenue.
            The center line is the median; the bar shows the typical 25th–75th percentile range.
          </p>
        </CardHeader>
        <CardContent className="space-y-8 pb-8">
          {MULTIPLE_BY_SIZE.map((row) => (
            <div key={row.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-medium text-foreground">{row.label}</span>
                <span className="text-xs text-muted-foreground">
                  {row.low.toFixed(1)}x – {row.high.toFixed(1)}x
                </span>
              </div>
              <MultipleBar low={row.low} mid={row.mid} high={row.high} />
            </div>
          ))}
          <div className="flex items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-5 bg-primary rounded" />
              Median
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-5 rounded bg-primary/25" />
              25th–75th percentile range
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Multiple by Book Type */}
      <Card className="mb-8 border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <BarChart2 className="h-5 w-5 text-primary" />
            Multiple Range by Book Composition
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Commercial lines consistently command higher multiples due to stickier accounts,
            higher revenue per policy, and lower sensitivity to rate volatility.
          </p>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {MULTIPLE_BY_BOOK.map((row) => (
              <div key={row.label} className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-5 sm:items-center sm:gap-4">
                <div className="sm:col-span-2">
                  <p className="font-medium text-foreground text-sm">{row.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{row.note}</p>
                </div>
                <div className="sm:col-span-2 mt-4 sm:mt-0">
                  <MultipleBar low={row.low} mid={row.mid} high={row.high} />
                </div>
                <div className="sm:col-span-1 flex justify-end mt-5 sm:mt-0">
                  <span className="font-mono text-sm font-bold text-primary">
                    {row.mid.toFixed(1)}x median
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Retention impact table */}
      <Card className="mb-8 border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <TrendingUp className="h-5 w-5 text-primary" />
            Impact of Client Retention Rate on Multiple
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Retention rate is the single largest individual driver of valuation multiple.
            Each percentage point above 90% meaningfully increases buyer confidence.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-semibold text-muted-foreground">Retention Rate</th>
                  <th className="pb-2 font-semibold text-muted-foreground">Multiple Adjustment</th>
                  <th className="pb-2 font-semibold text-muted-foreground">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {RETENTION_IMPACT.map((row) => (
                  <tr key={row.label}>
                    <td className="py-3 font-mono font-medium text-foreground">{row.label}</td>
                    <td className={`py-3 font-mono font-semibold ${
                      row.adjustment.startsWith("+") ? "text-success" :
                      row.adjustment.startsWith("−") ? "text-destructive" :
                      "text-muted-foreground"
                    }`}>
                      {row.adjustment}
                    </td>
                    <td className="py-3">
                      <RiskBadge risk={row.risk} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Deal Structure breakdown */}
      <Card className="mb-10 border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Percent className="h-5 w-5 text-primary" />
            Typical Deal Structures
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            How closed agency acquisitions are structured. Understanding deal structure is critical —
            a higher headline number with a large earnout can be worth less than a lower all-cash offer.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {DEAL_STRUCTURE_BREAKDOWN.map((row) => (
            <div key={row.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{row.label}</span>
                <span className="font-mono font-bold text-primary">{row.pct}%</span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-primary/70 transition-all"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{row.note}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="rounded-lg border border-border bg-secondary/30 px-5 py-4 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Data Disclaimer:</strong> All multiple ranges are derived from
        publicly available broker reports, industry surveys, and deal data recorded on this platform.
        These are general market benchmarks — not a guarantee of any specific transaction outcome.
        Actual multiples will vary based on buyer type, deal terms, market conditions, and agency-specific
        factors. This data is for educational and planning purposes only and does not constitute financial
        or legal advice.
      </div>

      <FeedbackWidget
        prompt="Do you have deal data to contribute or a question about these benchmarks?"
        placeholder="Share a transaction insight, ask a question, or suggest additional data points..."
        category="market-data"
      />
    </div>
  )
}
