"use client"

import { BarChart2, TrendingUp, DollarSign, Percent, Building2, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MarketIntelPanel } from "@/components/market-intel-panel"
import { FeedbackWidget } from "@/components/feedback-widget"

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

// ─── Sub-components ──────────────────────────────────────────────────────────

function MultipleBar({ low, mid, high }: { low: number; mid: number; high: number }) {
  const min = 0.75
  const max = 3.2
  const range = max - min
  const toLeft = (v: number) => ((v - min) / range) * 100

  return (
    <div className="relative h-5 w-full rounded-full bg-secondary">
      <div
        className="absolute top-0 h-full rounded-full bg-primary/25"
        style={{ left: `${toLeft(low)}%`, width: `${toLeft(high) - toLeft(low)}%` }}
      />
      <div
        className="absolute top-0 h-full w-0.5 rounded-full bg-primary"
        style={{ left: `${toLeft(mid)}%` }}
      />
      <span
        className="absolute -bottom-5 -translate-x-1/2 font-mono text-[10px] text-muted-foreground"
        style={{ left: `${toLeft(low)}%` }}
      >
        {low.toFixed(1)}x
      </span>
      <span
        className="absolute -top-5 -translate-x-1/2 font-mono text-[10px] font-bold text-primary"
        style={{ left: `${toLeft(mid)}%` }}
      >
        {mid.toFixed(1)}x
      </span>
      <span
        className="absolute -bottom-5 -translate-x-1/2 font-mono text-[10px] text-muted-foreground"
        style={{ left: `${toLeft(high)}%` }}
      >
        {high.toFixed(1)}x
      </span>
    </div>
  )
}

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, string> = {
    High: "bg-destructive/10 text-destructive border-destructive/30",
    Moderate: "bg-warning/10 text-warning border-warning/30",
    Average: "bg-secondary text-muted-foreground border-border",
    Low: "bg-success/10 text-success border-success/30",
    "Very Low": "bg-success/15 text-success border-success/40",
  }
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${map[risk] ?? "bg-secondary text-muted-foreground"}`}>
      {risk}
    </span>
  )
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

export function MarketDataTab() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Agency M&amp;A Deal Comps
        </h2>
        <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
          Benchmark your agency against real market data. These ranges reflect closed transactions
          in the independent P&amp;C insurance agency space and are updated as deals are recorded
          in our platform.
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            All multiples shown are revenue multiples applied to trailing 12-month commission &amp; fee
            income — not written premium. Ranges represent the 25th–75th percentile of observed outcomes.
          </p>
        </div>
      </div>

      {/* Key stat tiles */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KEY_METRICS.map((m) => (
          <Card key={m.label} className="border-border bg-card">
            <CardContent className="flex flex-col gap-3 p-5">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${m.accentBg}`}>
                <m.icon className={`h-4 w-4 ${m.accent}`} />
              </div>
              <p className={`font-mono text-2xl font-extrabold ${m.accent}`}>{m.value}</p>
              <div>
                <p className="text-sm font-semibold text-foreground">{m.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live deal comps panel */}
      <div className="mb-8">
        <MarketIntelPanel className="w-full" />
      </div>

      {/* Multiple by Agency Size */}
      <Card className="mb-6 border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <DollarSign className="h-5 w-5 text-primary" />
            Multiple Range by Agency Size
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Revenue multiples observed in closed transactions, segmented by annual commission revenue.
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
              <span className="inline-block h-0.5 w-5 rounded bg-primary" />
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
      <Card className="mb-6 border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <BarChart2 className="h-5 w-5 text-primary" />
            Multiple Range by Book Composition
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Commercial lines consistently command higher multiples due to stickier accounts and higher revenue per policy.
          </p>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {MULTIPLE_BY_BOOK.map((row) => (
              <div key={row.label} className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-5 sm:items-center sm:gap-4">
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-foreground">{row.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{row.note}</p>
                </div>
                <div className="mt-4 sm:col-span-2 sm:mt-0">
                  <MultipleBar low={row.low} mid={row.mid} high={row.high} />
                </div>
                <div className="mt-5 flex justify-end sm:col-span-1 sm:mt-0">
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
      <Card className="mb-6 border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <TrendingUp className="h-5 w-5 text-primary" />
            Impact of Client Retention Rate on Multiple
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Retention rate is the single largest individual driver of valuation multiple.
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
      <Card className="mb-8 border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Percent className="h-5 w-5 text-primary" />
            Typical Deal Structures
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            How closed agency acquisitions are structured — a higher headline number with a large earnout can be worth less than a lower all-cash offer.
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
      <div className="mb-6 rounded-lg border border-border bg-secondary/30 px-5 py-4 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Data Disclaimer:</strong> All multiple ranges are derived from
        publicly available broker reports, industry surveys, and deal data recorded on this platform.
        These are general market benchmarks — not a guarantee of any specific transaction outcome.
        This data is for educational and planning purposes only and does not constitute financial or legal advice.
      </div>

      <FeedbackWidget
        prompt="Do you have deal data to contribute or a question about these benchmarks?"
        placeholder="Share a transaction insight, ask a question, or suggest additional data points..."
        category="market-data"
      />
    </div>
  )
}
