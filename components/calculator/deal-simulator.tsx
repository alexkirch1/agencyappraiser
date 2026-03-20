"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { AlertTriangle } from "lucide-react"
import { formatCurrency } from "./valuation-engine"

interface Props {
  highOffer: number
  coreScore: number
  revenueLTM?: number | null
  revenueY2?: number | null
  revenueY3?: number | null
  revenueGrowthTrend?: string
}

type Strategy = "allcash" | "blend" | "structured" | "allearnout"

const EARNOUT_YEARS_OPTIONS = [1, 2]

// Each strategy has a cash% and a total value multiplier relative to highOffer.
// Full Earnout = 100% of value (the ideal). More cash = lower total (buyer discount).
const strategies: {
  key: Strategy
  label: string
  cashPct: number
  valueFactor: number // multiplier on highOffer for total payout
  description: string
}[] = [
  {
    key: "allcash",
    label: "All Cash",
    cashPct: 100,
    valueFactor: 0.85, // 15% discount — buyer takes all the risk upfront
    description: "100% Cash at Close. Simplest structure, but buyers pay a premium for certainty — expect a lower total offer.",
  },
  {
    key: "blend",
    label: "Cash + Earnout",
    cashPct: 70,
    valueFactor: 0.92, // 8% discount — partial risk sharing
    description: "70% Cash / 30% Earnout. A balanced structure. Some upfront certainty with modest earnout upside.",
  },
  {
    key: "structured",
    label: "Mostly Earnout",
    cashPct: 20,
    valueFactor: 0.97, // 3% discount — near full value, small cash anchor
    description: "20% Cash / 80% Earnout. Near full value potential. Small cash upfront with majority paid via annual commissions.",
  },
  {
    key: "allearnout",
    label: "Full Earnout",
    cashPct: 0,
    valueFactor: 1.0, // 100% of value — buyer takes no upfront risk
    description: "100% Earnout. Maximum total value. Paid entirely as a percentage of annual commissions over 1–2 years.",
  },
]

function projectCommissions(
  revLTM: number | null | undefined,
  revY2: number | null | undefined,
  revY3: number | null | undefined,
  growthTrend: string | undefined
): { projected: number; growthLabel: string; growthPct: number } {
  const ltm = revLTM ?? 0
  if (ltm <= 0) return { projected: 0, growthLabel: "Unknown", growthPct: 0 }

  if (revY2 && revY2 > 0) {
    const yoyGrowth = (ltm - revY2) / revY2
    const projected = ltm * (1 + yoyGrowth)
    const label = yoyGrowth >= 0.08 ? "Strong Growth" : yoyGrowth >= 0.02 ? "Moderate Growth" : yoyGrowth >= -0.02 ? "Flat" : "Declining"
    return { projected: Math.max(ltm * 0.7, projected), growthLabel: label, growthPct: yoyGrowth * 100 }
  }

  const trendMap: Record<string, { pct: number; label: string }> = {
    strong:    { pct: 0.10, label: "Strong Growth (est. +10%/yr)" },
    moderate:  { pct: 0.05, label: "Moderate Growth (est. +5%/yr)" },
    flat:      { pct: 0.00, label: "Flat (est. 0% change)" },
    declining: { pct: -0.07, label: "Declining (est. -7%/yr)" },
  }
  const trend = trendMap[growthTrend ?? ""] ?? { pct: 0, label: "Flat (assumed)" }
  return { projected: ltm * (1 + trend.pct), growthLabel: trend.label, growthPct: trend.pct * 100 }
}

export function DealSimulator({ highOffer, coreScore, revenueLTM, revenueY2, revenueY3, revenueGrowthTrend }: Props) {
  const [activeStrategy, setActiveStrategy] = useState<Strategy>("blend")
  const [earnoutYears, setEarnoutYears] = useState(1)
  const [commissionRate, setCommissionRate] = useState(0.75)

  const strat = strategies.find((s) => s.key === activeStrategy)!

  const { growthLabel, growthPct } = useMemo(
    () => projectCommissions(revenueLTM, revenueY2, revenueY3, revenueGrowthTrend),
    [revenueLTM, revenueY2, revenueY3, revenueGrowthTrend]
  )

  // Total payout scales with strategy — Full Earnout = highOffer × 1.0, All Cash = × 0.85
  const totalValue = highOffer * strat.valueFactor
  const cashAmount = totalValue * (strat.cashPct / 100)
  const earnoutTotal = totalValue * ((100 - strat.cashPct) / 100)

  // Per-year earnout: each year's payment = that year's projected revenue × commission rate
  const ltmRevenue = revenueLTM ?? 0
  const growthRate = growthPct / 100
  const perYearPayments: number[] = Array.from({ length: earnoutYears }, (_, i) => {
    const yearRevenue = ltmRevenue * Math.pow(1 + growthRate, i + 1)
    return yearRevenue * commissionRate
  })
  const commissionBasedTotal = perYearPayments.reduce((a, b) => a + b, 0)
  const commissionRatePct = Math.round(commissionRate * 100)

  // Slider position (0 = full earnout, 100 = all cash) — read-only, driven by strategy buttons
  const cashPct = strat.cashPct
  const earnoutPct = 100 - cashPct

  return (
    <div className="flex flex-col gap-4">
      {/* Total payout display */}
      <div className="rounded-lg border border-border bg-secondary/30 px-4 py-4 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Total Payout</p>
        <p className="text-3xl font-bold text-[hsl(var(--success))]">{formatCurrency(totalValue)}</p>
        {earnoutPct > 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrency(cashAmount)} cash + {formatCurrency(earnoutTotal)} earnout
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">100% cash at close</p>
        )}
      </div>

      {/* Strategy quick-select */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {strategies.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveStrategy(s.key)}
            className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
              activeStrategy === s.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-secondary"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Strategy description */}
      <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
        <p className="text-sm font-semibold text-primary">{strat.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{strat.description}</p>
      </div>

      {/* Cash vs Earnout bar */}
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-secondary">
        <div className="bg-[hsl(var(--success))] transition-all duration-300" style={{ width: `${cashPct}%` }} />
        <div className="bg-[hsl(var(--chart-5))] transition-all duration-300" style={{ width: `${earnoutPct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Cash: <span className="font-semibold text-foreground">{formatCurrency(cashAmount)}</span></span>
        {earnoutPct > 0 && (
          <span>Earnout: <span className="font-semibold text-foreground">{formatCurrency(earnoutTotal)}</span></span>
        )}
      </div>

      {/* Value comparison across strategies */}
      <div className="rounded-md border border-border bg-card divide-y divide-border">
        {strategies.map((s) => {
          const val = highOffer * s.valueFactor
          const isActive = s.key === activeStrategy
          return (
            <div
              key={s.key}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${isActive ? "bg-primary/5" : "hover:bg-secondary/50"}`}
              onClick={() => setActiveStrategy(s.key)}
            >
              <span className={`text-xs ${isActive ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isActive ? "text-[hsl(var(--success))]" : "text-muted-foreground"}`}>{formatCurrency(val)}</span>
                {s.key === "allearnout" && <span className="text-[10px] font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5">Best</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Earnout breakdown — only when there's an earnout component */}
      {earnoutPct > 0 && (
        <div className="rounded-lg border border-border bg-secondary/30 p-4 flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Earnout Structure</p>

          {/* Commission rate */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Commission rate on annual revenue:</span>
              <span className="font-bold font-mono text-foreground">{commissionRatePct}%</span>
            </div>
            <Slider
              value={[commissionRatePct]}
              onValueChange={([v]) => setCommissionRate(v / 100)}
              min={5}
              max={75}
              step={5}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>5% (min)</span>
              <span>75% (max)</span>
            </div>
          </div>

          {/* Payout period */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Payout over:</span>
            {EARNOUT_YEARS_OPTIONS.map((y) => (
              <Button
                key={y}
                size="sm"
                variant={earnoutYears === y ? "default" : "outline"}
                className="h-7 px-3 text-xs"
                onClick={() => setEarnoutYears(y)}
              >
                {y} {y === 1 ? "Year" : "Years"}
              </Button>
            ))}
          </div>

          {/* Per-year breakdown */}
          <div className="rounded-md bg-card border border-border divide-y divide-border">
            {perYearPayments.map((payment, i) => {
              const yearRevenue = ltmRevenue * Math.pow(1 + growthRate, i + 1)
              return (
                <div key={i} className="flex flex-col px-3 py-2.5 gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Year {i + 1} payment</span>
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(payment)}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground/70">
                    {formatCurrency(yearRevenue)} revenue × {commissionRatePct}%
                    {growthPct !== 0 && i > 0 && (
                      <span className={`ml-2 ${growthPct > 0 ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                        ({growthPct > 0 ? "+" : ""}{growthPct.toFixed(1)}% trajectory)
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
            <div className="flex items-center justify-between px-3 py-2 bg-primary/5">
              <span className="text-xs font-semibold text-foreground">Est. Commission-Based Total</span>
              <span className="text-sm font-bold text-primary">{formatCurrency(commissionBasedTotal)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/8 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Estimates only.</span> Final earnout depends on negotiated commission rates, actual book retention, and carrier terms.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
