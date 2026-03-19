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
  // Revenue inputs for trajectory projection
  revenueLTM?: number | null
  revenueY2?: number | null
  revenueY3?: number | null
  revenueGrowthTrend?: string
}

type Strategy = "allcash" | "blend" | "structured" | "allearnout"

// Earnout commission rate: max 75%, in increments of 5%
const MAX_EARNOUT_COMMISSION_RATE = 0.75
const EARNOUT_YEARS_OPTIONS = [1, 2]

const strategies: { key: Strategy; label: string; cash: number; description: string }[] = [
  { key: "allcash",    label: "All Cash",       cash: 100, description: "100% Cash at Close. Full payout on day one — no performance risk." },
  { key: "blend",      label: "Cash + Earnout", cash: 75,  description: "75% Cash at Close / 25% Earnout. A balanced structure that reduces buyer risk while maximizing seller upside." },
  { key: "structured", label: "Mostly Earnout", cash: 25,  description: "25% Cash / 75% Earnout. Higher total potential payout; earnout paid as a percentage of projected annual commissions." },
  { key: "allearnout", label: "Full Earnout",   cash: 0,   description: "100% Earnout. Maximum potential total value; paid as a percentage of projected commissions over 1–2 years." },
]

/**
 * Projects the next year's commission revenue based on the current trajectory.
 * This is based on *current* commission run-rate direction — not completed time.
 */
function projectCommissions(
  revLTM: number | null | undefined,
  revY2: number | null | undefined,
  revY3: number | null | undefined,
  growthTrend: string | undefined
): { projected: number; growthLabel: string; growthPct: number } {
  const ltm = revLTM ?? 0
  if (ltm <= 0) return { projected: 0, growthLabel: "Unknown", growthPct: 0 }

  // If we have multiple years of data, calculate actual trajectory
  if (revY2 && revY2 > 0) {
    const yoyGrowth = (ltm - revY2) / revY2
    const projected = ltm * (1 + yoyGrowth)
    const label = yoyGrowth >= 0.08 ? "Strong Growth" : yoyGrowth >= 0.02 ? "Moderate Growth" : yoyGrowth >= -0.02 ? "Flat" : "Declining"
    return { projected: Math.max(ltm * 0.7, projected), growthLabel: label, growthPct: yoyGrowth * 100 }
  }

  // Fall back to manual trend selection
  const trendMap: Record<string, { pct: number; label: string }> = {
    strong:   { pct: 0.10, label: "Strong Growth (est. +10%/yr)" },
    moderate: { pct: 0.05, label: "Moderate Growth (est. +5%/yr)" },
    flat:     { pct: 0.00, label: "Flat (est. 0% change)" },
    declining:{ pct:-0.07, label: "Declining (est. -7%/yr)" },
  }
  const trend = trendMap[growthTrend ?? ""] ?? { pct: 0, label: "Flat (assumed)" }
  return { projected: ltm * (1 + trend.pct), growthLabel: trend.label, growthPct: trend.pct * 100 }
}

export function DealSimulator({ highOffer, coreScore, revenueLTM, revenueY2, revenueY3, revenueGrowthTrend }: Props) {
  const [cashPct, setCashPct] = useState(75)
  const [activeStrategy, setActiveStrategy] = useState<Strategy>("blend")
  const [earnoutYears, setEarnoutYears] = useState(1)
  // Earnout commission rate: 5–75% in increments of 5
  const [commissionRate, setCommissionRate] = useState(MAX_EARNOUT_COMMISSION_RATE)

  const earnoutPct = 100 - cashPct

  const { projected, growthLabel, growthPct } = useMemo(
    () => projectCommissions(revenueLTM, revenueY2, revenueY3, revenueGrowthTrend),
    [revenueLTM, revenueY2, revenueY3, revenueGrowthTrend]
  )

  const adjustedValue = useMemo(() => {
    const adjustmentFactor = earnoutPct === 0 ? 1 : 1 + earnoutPct * 0.001
    return highOffer * adjustmentFactor
  }, [highOffer, earnoutPct])

  const cashAmount = adjustedValue * (cashPct / 100)
  const earnoutTotal = adjustedValue * (earnoutPct / 100)

  // Earnout per year is calculated from projected commissions × commission rate
  // (not just earnoutTotal / years — this is the commission-based model)
  const annualCommissionPayment = projected * commissionRate
  const earnoutPerYear = earnoutYears > 0 ? Math.min(annualCommissionPayment, earnoutTotal / earnoutYears) : 0
  const commissionBasedTotal = annualCommissionPayment * earnoutYears

  const handleStrategyClick = (strategy: Strategy) => {
    setActiveStrategy(strategy)
    const s = strategies.find((x) => x.key === strategy)!
    setCashPct(s.cash)
  }

  const handleSliderChange = (value: number[]) => {
    const newCash = value[0]
    setCashPct(newCash)
    if (newCash === 100) setActiveStrategy("allcash")
    else if (newCash >= 60) setActiveStrategy("blend")
    else if (newCash > 0) setActiveStrategy("structured")
    else setActiveStrategy("allearnout")
  }

  const currentStrat = strategies.find((s) => s.key === activeStrategy)
  const commissionRatePct = Math.round(commissionRate * 100)

  return (
    <div className="flex flex-col gap-4">
      {/* Gross valuation display */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Gross Payout</p>
          <p className="text-3xl font-bold text-[hsl(var(--success))]">{formatCurrency(adjustedValue)}</p>
          {earnoutPct > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Includes earnout upside — actual total depends on book performance
            </p>
          )}
        </CardContent>
      </Card>

      {/* Strategy quick-select */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {strategies.map((s) => (
          <Button
            key={s.key}
            variant={activeStrategy === s.key ? "default" : "outline"}
            size="sm"
            onClick={() => handleStrategyClick(s.key)}
            className="text-xs"
          >
            {s.label}
          </Button>
        ))}
      </div>

      {/* Current structure explanation */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3">
          <p className="text-sm font-semibold text-primary">{currentStrat?.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{currentStrat?.description}</p>
        </CardContent>
      </Card>

      {/* Slider: 0% cash (full earnout) → 100% cash */}
      <div>
        <div className="mb-3 flex items-center justify-between text-xs font-semibold text-foreground">
          <span>Full Earnout</span>
          <span>All Cash</span>
        </div>
        <Slider value={[cashPct]} onValueChange={handleSliderChange} min={0} max={100} step={5} />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>0% Cash</span>
          <span className="font-medium text-foreground">{cashPct}% Cash / {earnoutPct}% Earnout</span>
          <span>100% Cash</span>
        </div>
      </div>

      {/* Waterfall bar */}
      <div className="flex h-5 w-full overflow-hidden rounded-md">
        <div className="bg-[hsl(var(--success))] transition-all" style={{ width: `${cashPct}%` }} />
        <div className="bg-[hsl(var(--chart-5))] transition-all" style={{ width: `${earnoutPct}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">
          Cash at Close: <span className="font-semibold text-foreground">{formatCurrency(cashAmount)}</span>
        </span>
        {earnoutPct > 0 && (
          <span className="text-muted-foreground">
            Earnout: <span className="font-semibold text-foreground">{formatCurrency(earnoutTotal)}</span>
          </span>
        )}
      </div>

      {/* Earnout breakdown (only shown when there is an earnout) */}
      {earnoutPct > 0 && (
        <Card className="border-border bg-secondary/30">
          <CardContent className="py-4 flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Earnout Structure</p>

            {/* Commission rate slider */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Commission rate on projected book:</span>
                <span className="font-bold text-foreground font-mono">{commissionRatePct}%</span>
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

            {/* Year selector */}
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

            {/* Projected commission revenue */}
            {projected > 0 && (
              <div className="rounded-md border border-border bg-card px-3 py-2.5 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Projected Year 1 Commissions</span>
                  <span className="font-semibold text-foreground">{formatCurrency(projected)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Trajectory</span>
                  <span className={`font-medium ${growthPct >= 5 ? "text-[hsl(var(--success))]" : growthPct < -2 ? "text-destructive" : "text-muted-foreground"}`}>
                    {growthLabel} {growthPct !== 0 ? `(${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(1)}%)` : ""}
                  </span>
                </div>
              </div>
            )}

            {/* Per-year breakdown */}
            <div className="rounded-md bg-card border border-border divide-y divide-border">
              {Array.from({ length: earnoutYears }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-muted-foreground">Year {i + 1} earnout payment</span>
                  <span className="text-sm font-semibold text-foreground">{formatCurrency(earnoutPerYear)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 bg-primary/5">
                <span className="text-xs font-semibold text-foreground">Est. Total Earnout</span>
                <span className="text-sm font-bold text-primary">{formatCurrency(Math.min(earnoutTotal, commissionBasedTotal))}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Based on <span className="font-semibold text-foreground">{commissionRatePct}% of projected annual commissions</span> from the acquired book, paid over {earnoutYears} {earnoutYears === 1 ? "year" : "years"}.
            </p>

            {/* Disclaimer warning */}
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/8 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">These are estimates only.</span> Actual earnout amounts will depend on final commission rates negotiated, actual book retention post-acquisition, carrier terms, and deal structure. These figures should not be relied upon as a guarantee of payment.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
