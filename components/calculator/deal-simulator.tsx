"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { AlertTriangle, Info } from "lucide-react"
import { formatCurrency } from "./valuation-engine"

interface Props {
  highOffer: number
  coreScore: number
  revenueLTM?: number | null
  revenueY2?: number | null
  revenueY3?: number | null
  revenueGrowthTrend?: string
}

type Strategy = "allcash" | "blend" | "allearnout"

// ─── Revenue projection helper ──────────────────────────────────────────────
function projectGrowthRate(
  revLTM: number | null | undefined,
  revY2: number | null | undefined,
  growthTrend: string | undefined
): { growthRate: number; growthLabel: string } {
  const ltm = revLTM ?? 0
  if (ltm <= 0) return { growthRate: 0, growthLabel: "Unknown" }

  if (revY2 && revY2 > 0) {
    const yoy = (ltm - revY2) / revY2
    const label =
      yoy >= 0.08 ? "Strong Growth" :
      yoy >= 0.02 ? "Moderate Growth" :
      yoy >= -0.02 ? "Flat" : "Declining"
    return { growthRate: yoy, growthLabel: label }
  }

  const trendMap: Record<string, { rate: number; label: string }> = {
    strong:    { rate: 0.10, label: "Strong Growth (~+10%/yr)" },
    moderate:  { rate: 0.05, label: "Moderate Growth (~+5%/yr)" },
    flat:      { rate: 0.00, label: "Flat (~0%/yr)" },
    declining: { rate: -0.07, label: "Declining (~-7%/yr)" },
  }
  const t = trendMap[growthTrend ?? ""] ?? { rate: 0, label: "Flat (assumed)" }
  return { growthRate: t.rate, growthLabel: t.label }
}

// ─── Smart Full-Earnout defaults based on agency financials ──────────────────
// Rules:
//  - Larger agencies (LTM > $500k) → buyers more likely to offer 2 years
//  - Strong growth → higher commission rate (up to 75%)
//  - Declining revenue → cap at 50%, 1 year only
//  - Mid-range: 60%, 1-2 years depending on size
function smartEarnoutDefaults(
  highOffer: number,
  revLTM: number,
  growthRate: number
): { pct: number; years: number; rationale: string } {
  const isLarge = revLTM > 500_000
  const isGrowth = growthRate >= 0.05
  const isDeclining = growthRate < -0.02

  if (isDeclining) {
    return {
      pct: 50,
      years: 1,
      rationale: "Declining revenue limits earnout offers — buyers protect against continued book erosion.",
    }
  }
  if (isGrowth && isLarge) {
    return {
      pct: 75,
      years: 2,
      rationale: "Strong growth and size support a maximum earnout. Buyers are comfortable with 2-year exposure.",
    }
  }
  if (isGrowth && !isLarge) {
    return {
      pct: 65,
      years: 1,
      rationale: "Healthy growth but smaller book — buyers typically offer 1 year at a strong commission rate.",
    }
  }
  if (isLarge) {
    return {
      pct: 60,
      years: 2,
      rationale: "Larger stable book supports a 2-year earnout at a moderate commission rate.",
    }
  }
  return {
    pct: 55,
    years: 1,
    rationale: "Flat/stable revenue and moderate size — a conservative 1-year earnout is most realistic.",
  }
}

export function DealSimulator({
  highOffer,
  coreScore,
  revenueLTM,
  revenueY2,
  revenueY3,
  revenueGrowthTrend,
}: Props) {
  const ltmRevenue = revenueLTM ?? 0

  const { growthRate, growthLabel } = useMemo(
    () => projectGrowthRate(revenueLTM, revenueY2, revenueGrowthTrend),
    [revenueLTM, revenueY2, revenueGrowthTrend]
  )

  const smartDefaults = useMemo(
    () => smartEarnoutDefaults(highOffer, ltmRevenue, growthRate),
    [highOffer, ltmRevenue, growthRate]
  )

  const [activeStrategy, setActiveStrategy] = useState<Strategy>("allcash")

  // Cash+Earnout sliders (10–90 each, must sum to 100)
  const [blendCashPct, setBlendCashPct] = useState(60)
  const blendEarnoutPct = 100 - blendCashPct

  // Blend earnout settings
  const [blendEarnoutCommPct, setBlendEarnoutCommPct] = useState(50)
  const [blendEarnoutYears, setBlendEarnoutYears] = useState(1)

  // Full earnout — start from smart defaults
  const [fullEarnoutPct, setFullEarnoutPct] = useState(smartDefaults.pct)
  const [fullEarnoutYears, setFullEarnoutYears] = useState(smartDefaults.years)

  // ─── CALCULATIONS ────────────────────────────────────────────────────────

  // Baseline: All Cash = highOffer (no discount, this IS the valuation)
  const allCashValue = highOffer

  // Per-year projected revenue
  function projectedRevenue(year: number) {
    return ltmRevenue > 0 ? ltmRevenue * Math.pow(1 + growthRate, year) : 0
  }

  // Cash + Earnout
  // Cash at close = highOffer × (blendCashPct / 100)   — proportional slice of valuation
  // Per-year earnout = that year's projected revenue × (blendEarnoutCommPct / 100)
  // Guard: if earnout total > (highOffer × blendEarnoutPct/100 × 1.5) it's unrealistic
  const blendCashAtClose = highOffer * (blendCashPct / 100)
  const blendYearlyPayments = Array.from({ length: blendEarnoutYears }, (_, i) =>
    projectedRevenue(i + 1) * (blendEarnoutCommPct / 100)
  )
  const blendEarnoutTotal = blendYearlyPayments.reduce((a, b) => a + b, 0)

  // Warn if earnout is overly optimistic (>2x the earnout share of valuation)
  const blendEarnoutCeiling = highOffer * (blendEarnoutPct / 100) * 2
  const blendEarnoutOverflow = blendEarnoutTotal > blendEarnoutCeiling

  const blendTotalValue = blendCashAtClose + blendEarnoutTotal

  // Full Earnout
  // No cash at close. Annual payment = projectedRevenue × (fullEarnoutPct / 100)
  const fullYearlyPayments = Array.from({ length: fullEarnoutYears }, (_, i) =>
    projectedRevenue(i + 1) * (fullEarnoutPct / 100)
  )
  const fullEarnoutTotal = fullYearlyPayments.reduce((a, b) => a + b, 0)
  const fullTotalValue = fullEarnoutTotal

  // Active values
  const activeTotal =
    activeStrategy === "allcash" ? allCashValue :
    activeStrategy === "blend" ? blendTotalValue :
    fullTotalValue

  const activeCash =
    activeStrategy === "allcash" ? allCashValue :
    activeStrategy === "blend" ? blendCashAtClose :
    0

  const activeEarnout =
    activeStrategy === "blend" ? blendEarnoutTotal :
    activeStrategy === "allearnout" ? fullEarnoutTotal :
    0

  // ─── UI ──────────────────────────────────────────────────────────────────

  const strategies: { key: Strategy; label: string; description: string }[] = [
    {
      key: "allcash",
      label: "All Cash",
      description:
        "100% of the agreed value paid at closing. Simplest and most certain — this is your baseline number.",
    },
    {
      key: "blend",
      label: "Cash + Earnout",
      description:
        "Part of the value paid at close, remainder earned over 1–2 years via commission percentage. You control the split.",
    },
    {
      key: "allearnout",
      label: "Full Earnout",
      description:
        "No cash at close — all value comes from a percentage of annual commissions over 1–2 years. Highest potential total, zero upfront certainty.",
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Total payout display */}
      <div className="rounded-lg border border-border bg-secondary/30 px-4 py-4 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Total Payout</p>
        <p className="text-3xl font-bold text-success">{formatCurrency(activeTotal)}</p>
        {activeStrategy !== "allcash" ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrency(activeCash)} cash + {formatCurrency(activeEarnout)} earnout
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">100% cash at close — baseline valuation</p>
        )}
      </div>

      {/* Strategy tabs */}
      <div className="grid grid-cols-3 gap-2">
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
        <p className="text-sm font-semibold text-primary">
          {strategies.find((s) => s.key === activeStrategy)?.label}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {strategies.find((s) => s.key === activeStrategy)?.description}
        </p>
      </div>

      {/* ── ALL CASH ── */}
      {activeStrategy === "allcash" && (
        <div className="rounded-lg border border-border bg-secondary/30 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              All Cash is your <span className="font-semibold text-foreground">baseline valuation</span> — the full agreed value paid at closing, no contingencies. All other structures are calculated relative to this number.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card divide-y divide-border">
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs text-muted-foreground">Cash at Close</span>
              <span className="text-sm font-bold text-success">{formatCurrency(allCashValue)}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs text-muted-foreground">Earnout</span>
              <span className="text-sm text-muted-foreground">None</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 bg-primary/5">
              <span className="text-xs font-semibold text-foreground">Total</span>
              <span className="text-sm font-bold text-primary">{formatCurrency(allCashValue)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── CASH + EARNOUT ── */}
      {activeStrategy === "blend" && (
        <div className="rounded-lg border border-border bg-secondary/30 p-4 flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Structure Your Split
          </p>

          {/* Cash/Earnout split slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Cash at Close</span>
              <span className="font-bold font-mono text-foreground">{blendCashPct}%</span>
            </div>
            <Slider
              value={[blendCashPct]}
              onValueChange={([v]) => setBlendCashPct(v)}
              min={10}
              max={90}
              step={5}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>10% cash</span>
              <span>90% cash</span>
            </div>
          </div>

          {/* Split visual bar */}
          <div className="flex flex-col gap-1">
            <div className="flex h-5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="bg-success transition-all duration-200"
                style={{ width: `${blendCashPct}%` }}
              />
              <div
                className="bg-chart-5 transition-all duration-200"
                style={{ width: `${blendEarnoutPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-success font-medium">Cash {blendCashPct}% — {formatCurrency(blendCashAtClose)}</span>
              <span className="text-chart-5 font-medium">Earnout {blendEarnoutPct}% — {formatCurrency(blendEarnoutTotal)}</span>
            </div>
          </div>

          {/* Earnout commission rate */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Earnout — Commission Rate on Annual Revenue</span>
              <span className="font-bold font-mono text-foreground">{blendEarnoutCommPct}%</span>
            </div>
            <Slider
              value={[blendEarnoutCommPct]}
              onValueChange={([v]) => setBlendEarnoutCommPct(v)}
              min={10}
              max={75}
              step={5}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>10% (min)</span>
              <span>75% (max)</span>
            </div>
          </div>

          {/* Payout period */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Earnout over:</span>
            {[1, 2].map((y) => (
              <Button
                key={y}
                size="sm"
                variant={blendEarnoutYears === y ? "default" : "outline"}
                className="h-7 px-3 text-xs"
                onClick={() => setBlendEarnoutYears(y)}
              >
                {y} {y === 1 ? "Year" : "Years"}
              </Button>
            ))}
          </div>

          {/* Per-year breakdown */}
          <div className="rounded-md bg-card border border-border divide-y divide-border">
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs text-muted-foreground">Cash at Close</span>
              <span className="text-sm font-semibold text-success">{formatCurrency(blendCashAtClose)}</span>
            </div>
            {blendYearlyPayments.map((payment, i) => (
              <div key={i} className="flex flex-col px-3 py-2.5 gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Year {i + 1} earnout
                    {i > 0 && <span className="ml-1 text-[10px] text-muted-foreground/60">(projected)</span>}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{formatCurrency(payment)}</span>
                </div>
                <span className="text-[11px] text-muted-foreground/70">
                  {formatCurrency(Math.round(projectedRevenue(i + 1)))} est. revenue × {blendEarnoutCommPct}%
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-2 bg-primary/5">
              <span className="text-xs font-semibold text-foreground">Total Payout</span>
              <span className="text-sm font-bold text-primary">{formatCurrency(blendTotalValue)}</span>
            </div>
          </div>

          {/* Overflow warning */}
          {blendEarnoutOverflow && (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Projected earnout may be unrealistic.</span>{" "}
                The earnout total exceeds a realistic ceiling for this deal. Consider reducing the commission rate or switching to 1 year.
              </p>
            </div>
          )}

          {growthRate !== 0 && (
            <p className="text-[10px] text-muted-foreground">
              Year 2 applies your {growthRate > 0 ? "+" : ""}{(growthRate * 100).toFixed(0)}% revenue trend ({growthLabel}).
            </p>
          )}
        </div>
      )}

      {/* ── FULL EARNOUT ── */}
      {activeStrategy === "allearnout" && (
        <div className="rounded-lg border border-border bg-secondary/30 p-4 flex flex-col gap-4">
          {/* Smart defaults badge */}
          <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">Smart Estimate Applied</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                {smartDefaults.rationale}
              </p>
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Earnout Terms
          </p>

          {/* Commission % slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Commission Rate on Annual Revenue</span>
              <span className="font-bold font-mono text-foreground">{fullEarnoutPct}%</span>
            </div>
            <Slider
              value={[fullEarnoutPct]}
              onValueChange={([v]) => setFullEarnoutPct(v)}
              min={10}
              max={75}
              step={5}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>10%</span>
              <span className="text-muted-foreground/60">75% max (rarely offered)</span>
            </div>
          </div>

          {/* Year selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Payout period:</span>
            {[1, 2].map((y) => (
              <Button
                key={y}
                size="sm"
                variant={fullEarnoutYears === y ? "default" : "outline"}
                className="h-7 px-3 text-xs"
                onClick={() => setFullEarnoutYears(y)}
              >
                {y} {y === 1 ? "Year" : "Years"}
              </Button>
            ))}
          </div>

          {/* Year-by-year breakdown */}
          <div className="rounded-md bg-card border border-border divide-y divide-border">
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs text-muted-foreground">Cash at Close</span>
              <span className="text-sm text-muted-foreground">None</span>
            </div>
            {fullYearlyPayments.map((payment, i) => (
              <div key={i} className="flex flex-col px-3 py-2.5 gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Year {i + 1} earnout
                    {i > 0 && <span className="ml-1 text-[10px] text-muted-foreground/60">(projected)</span>}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{formatCurrency(payment)}</span>
                </div>
                <span className="text-[11px] text-muted-foreground/70">
                  {formatCurrency(Math.round(projectedRevenue(i + 1)))} est. revenue × {fullEarnoutPct}%
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-2 bg-primary/5">
              <span className="text-xs font-semibold text-foreground">
                Total ({fullEarnoutYears} {fullEarnoutYears === 1 ? "year" : "years"})
              </span>
              <span className="text-sm font-bold text-primary">{formatCurrency(fullEarnoutTotal)}</span>
            </div>
          </div>

          {growthRate !== 0 && (
            <p className="text-[10px] text-muted-foreground">
              Year 2 projections apply your {growthRate > 0 ? "+" : ""}{(growthRate * 100).toFixed(0)}% revenue trend ({growthLabel}).
            </p>
          )}

          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Not guaranteed.</span> Full earnout offers are rare and depend heavily on book retention, negotiated commission rates, and carrier terms. The 2-year / 75% scenario is best-case — most sellers receive less.
            </p>
          </div>
        </div>
      )}

      {/* ── STRATEGY COMPARISON ── */}
      <div className="rounded-md border border-border bg-card divide-y divide-border">
        <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Strategy Comparison
        </p>
        {(
          [
            { key: "allcash" as Strategy,    label: "All Cash",       val: allCashValue,   badge: null },
            { key: "blend" as Strategy,      label: "Cash + Earnout", val: blendTotalValue, badge: null },
            { key: "allearnout" as Strategy, label: "Full Earnout",   val: fullTotalValue,  badge: "Best" },
          ] as { key: Strategy; label: string; val: number; badge: string | null }[]
        ).map(({ key, label, val, badge }) => (
          <div
            key={key}
            className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
              activeStrategy === key ? "bg-primary/5" : "hover:bg-secondary/50"
            }`}
            onClick={() => setActiveStrategy(key)}
          >
            <span
              className={`text-xs ${activeStrategy === key ? "font-semibold text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-bold ${activeStrategy === key ? "text-success" : "text-muted-foreground"}`}
              >
                {formatCurrency(val)}
              </span>
              {badge && (
                <span className="text-[10px] font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5">
                  {badge}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Estimates only.</span> Final deal terms depend on due diligence, negotiated commission rates, book retention, and carrier agreements.
        </p>
      </div>
    </div>
  )
}
