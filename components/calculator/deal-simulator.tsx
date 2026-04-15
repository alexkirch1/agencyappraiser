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

// ─── Earnout model ────────────────────────────────────────────────────────────
//
// How insurance book earnouts actually work:
//   - Buyer pays a COMMISSION OVERRIDE on the book's annual premiums/revenue each year
//   - Seller earns a % of the book's LTM revenue per year for N years
//   - The total can EXCEED the all-cash offer because the buyer is betting on retention
//
// Formula:
//   Annual earnout payment  = LTM Revenue × commissionPct
//   Full Earnout total      = annualPayment × years
//
// For Full Earnout to exceed All Cash (highOffer), we need:
//   LTM Revenue × commissionPct × years > highOffer
//   commissionPct > highOffer / (LTM Revenue × years)
//
// Example: highOffer = $480k, LTM = $480k, years = 2
//   Need commPct > 480k / (480k × 2) = 50%
//   At 60% × 2 years = 120% of LTM = $576k total (beats $480k cash by 20%)
//
// Defaults: target Full Earnout total at 110–130% of highOffer.
function smartEarnoutDefaults(
  highOffer: number,
  revLTM: number,
  growthRate: number
): { commPct: number; years: number; rationale: string } {
  const isLarge = revLTM > 500_000
  const isGrowth = growthRate >= 0.05
  const isDeclining = growthRate < -0.02

  // Calculate minimum commPct needed to BEAT cash offer
  // Formula: commPct × years × LTM > highOffer
  // So: minCommPct = highOffer / (LTM × years) / premium
  // We want to exceed cash by 10–30%, so we multiply by 1.1–1.3
  const ltm = revLTM > 0 ? revLTM : highOffer

  if (isDeclining) {
    // 2 years, target 110% of cash
    const minPct = (highOffer * 1.10) / (ltm * 2) * 100
    const targetPct = Math.min(80, Math.max(40, Math.round(minPct / 5) * 5))
    return {
      commPct: targetPct,
      years: 2,
      rationale: `Declining revenue means cautious earnout terms. At ${targetPct}% commission over 2 years, your total still exceeds the all-cash offer — rewarding you for retention.`,
    }
  }
  if (isGrowth && isLarge) {
    // 2 years, target 130% of cash
    const minPct = (highOffer * 1.30) / (ltm * 2) * 100
    const targetPct = Math.min(80, Math.max(50, Math.round(minPct / 5) * 5))
    return {
      commPct: targetPct,
      years: 2,
      rationale: `Strong growth and size command premium terms. At ${targetPct}% commission over 2 years, your total payout exceeds all-cash by ~30%.`,
    }
  }
  if (isGrowth && !isLarge) {
    // 2 years, target 125% of cash
    const minPct = (highOffer * 1.25) / (ltm * 2) * 100
    const targetPct = Math.min(80, Math.max(50, Math.round(minPct / 5) * 5))
    return {
      commPct: targetPct,
      years: 2,
      rationale: `Growing book supports solid earnout. At ${targetPct}% commission over 2 years, total payout exceeds all-cash by ~25%.`,
    }
  }
  if (isLarge) {
    // 2 years, target 120% of cash
    const minPct = (highOffer * 1.20) / (ltm * 2) * 100
    const targetPct = Math.min(80, Math.max(50, Math.round(minPct / 5) * 5))
    return {
      commPct: targetPct,
      years: 2,
      rationale: `Large stable book. At ${targetPct}% commission over 2 years, total exceeds all-cash by ~20%.`,
    }
  }
  // Default: flat/stable — 2 years, target 115% of cash
  const minPct = (highOffer * 1.15) / (ltm * 2) * 100
  const targetPct = Math.min(75, Math.max(45, Math.round(minPct / 5) * 5))
  return {
    commPct: targetPct,
    years: 2,
    rationale: `Stable book, standard terms. At ${targetPct}% commission over 2 years, total exceeds all-cash by ~15%.`,
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

  // Cash+Earnout sliders
  const suggestedBlendCashPct = 60
  const [blendCashPct, setBlendCashPct] = useState(suggestedBlendCashPct)
  const blendEarnoutPct = 100 - blendCashPct
  // Blend earnout comm% starts at ~80% of full earnout rate (less aggressive since seller gets cash too)
  const blendCommDefault = Math.max(20, Math.round(smartDefaults.commPct * 0.8 / 5) * 5)
  const suggestedBlendCommPct = blendCommDefault
  const [blendCommPct, setBlendCommPct] = useState(suggestedBlendCommPct)
  const [blendEarnoutYears, setBlendEarnoutYears] = useState(Math.max(1, smartDefaults.years - 1))

  // Full earnout — commission % of LTM revenue paid each year
  const suggestedFullCommPct = smartDefaults.commPct
  const [fullCommPct, setFullCommPct] = useState(suggestedFullCommPct)
  const [fullEarnoutYears, setFullEarnoutYears] = useState(smartDefaults.years)

  // ─── CALCULATIONS ────────────────────────────────────────────────────────

  // Baseline: All Cash = highOffer
  const allCashValue = highOffer

  // Annual earnout payment = LTM Revenue × commissionPct
  // This models real insurance book earnouts: seller earns a commission override
  // on the book's annual revenue for N years.
  const annualFullPayment = ltmRevenue > 0 ? ltmRevenue * (fullCommPct / 100) : highOffer * 0.35
  const annualBlendPayment = ltmRevenue > 0 ? ltmRevenue * (blendCommPct / 100) : highOffer * 0.25

  // Cash + Earnout
  const blendCashAtClose = highOffer * (blendCashPct / 100)
  const blendYearlyPayments = Array.from({ length: blendEarnoutYears }, () => annualBlendPayment)
  const blendEarnoutTotal = blendYearlyPayments.reduce((a, b) => a + b, 0)
  const blendTotalValue = blendCashAtClose + blendEarnoutTotal

  // Warn if total earnout payout exceeds 2.5× highOffer (unrealistic)
  const blendEarnoutOverflow = blendTotalValue > highOffer * 2.5

  // Full Earnout — no cash at close, pure commission income over N years
  const fullYearlyPayments = Array.from({ length: fullEarnoutYears }, () => annualFullPayment)
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {strategies.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveStrategy(s.key)}
            className={`rounded-md border px-3 py-2.5 text-sm font-medium transition-colors sm:px-2 sm:py-2 sm:text-xs ${
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
          <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">Suggested Numbers Applied</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                Starting point: <span className="font-medium text-foreground">{blendCashPct}% cash at close</span>, earnout at <span className="font-medium text-foreground">{blendCommPct}% commission</span> on LTM revenue over <span className="font-medium text-foreground">{blendEarnoutYears} {blendEarnoutYears === 1 ? "year" : "years"}</span> — based on your agency profile. Adjust sliders to explore.
              </p>
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Structure Your Split
          </p>

          {/* Cash/Earnout split slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Cash at Close</span>
              <div className="flex items-center gap-2">
                {blendCashPct !== suggestedBlendCashPct && (
                  <span className="text-[10px] text-muted-foreground">Suggested: <span className="font-medium text-foreground">{suggestedBlendCashPct}%</span></span>
                )}
                <span className="font-bold font-mono text-foreground">{blendCashPct}%</span>
              </div>
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
              <span className="text-[10px] text-primary font-medium">Suggested: {suggestedBlendCashPct}%</span>
              <span>90% cash</span>
            </div>
            {blendCashPct > suggestedBlendCashPct && (
              <div className="flex items-start gap-1.5 rounded border border-warning/30 bg-warning/10 px-2.5 py-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Above suggested cash split.</span> A higher upfront cash percentage increases buyer risk — deals with {blendCashPct}%+ cash at close are less common and may be harder to negotiate.
                </p>
              </div>
            )}
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

          {/* Earnout commission % on LTM revenue */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Commission % on Annual Revenue per Year</span>
              <div className="flex items-center gap-2">
                {blendCommPct !== suggestedBlendCommPct && (
                  <span className="text-[10px] text-muted-foreground">Suggested: <span className="font-medium text-foreground">{suggestedBlendCommPct}%</span></span>
                )}
                <span className="font-bold font-mono text-foreground">{blendCommPct}%</span>
              </div>
            </div>
            <Slider
              value={[blendCommPct]}
              onValueChange={([v]) => setBlendCommPct(v)}
              min={10}
              max={80}
              step={5}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>10% (conservative)</span>
              <span className="text-[10px] text-primary font-medium">Suggested: {suggestedBlendCommPct}%</span>
              <span>80% (aggressive)</span>
            </div>
            {blendCommPct > suggestedBlendCommPct && (
              <div className="flex items-start gap-1.5 rounded border border-warning/30 bg-warning/10 px-2.5 py-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Above suggested commission rate.</span> At {blendCommPct}%, the earnout may be unrealistic to negotiate — buyers typically cap commission overrides in the {suggestedBlendCommPct}%–{Math.min(80, suggestedBlendCommPct + 10)}% range.
                </p>
              </div>
            )}
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
                  {ltmRevenue > 0 ? formatCurrency(Math.round(ltmRevenue)) : "LTM"} revenue × {blendCommPct}% commission
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

          {/* Commission % on LTM revenue */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Commission % on Annual Revenue per Year</span>
              <div className="flex items-center gap-2">
                {fullCommPct !== suggestedFullCommPct && (
                  <span className="text-[10px] text-muted-foreground">Suggested: <span className="font-medium text-foreground">{suggestedFullCommPct}%</span></span>
                )}
                <span className="font-bold font-mono text-foreground">{fullCommPct}%</span>
              </div>
            </div>
            <Slider
              value={[fullCommPct]}
              onValueChange={([v]) => setFullCommPct(v)}
              min={10}
              max={100}
              step={5}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>10% (conservative)</span>
              <span className="text-[10px] text-primary font-medium">Suggested: {suggestedFullCommPct}%</span>
              <span className="text-muted-foreground/60">100% (max)</span>
            </div>
            {fullCommPct > suggestedFullCommPct && (
              <div className="flex items-start gap-1.5 rounded border border-warning/30 bg-warning/10 px-2.5 py-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Above suggested rate.</span> At {fullCommPct}% commission, this earnout exceeds typical negotiated terms for your agency profile. Buyers may counter at {suggestedFullCommPct}% — use this as a ceiling reference, not a starting point.
                </p>
              </div>
            )}
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
                  {ltmRevenue > 0 ? formatCurrency(Math.round(ltmRevenue)) : "LTM"} revenue × {fullCommPct}% commission
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
      {(() => {
        const maxVal = Math.max(allCashValue, blendTotalValue, fullTotalValue)
        const rows: { key: Strategy; label: string; val: number }[] = [
          { key: "allcash",    label: "All Cash",       val: allCashValue    },
          { key: "blend",      label: "Cash + Earnout", val: blendTotalValue },
          { key: "allearnout", label: "Full Earnout",   val: fullTotalValue  },
        ]
        return (
          <div className="rounded-md border border-border bg-card divide-y divide-border">
            <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Strategy Comparison
            </p>
            {rows.map(({ key, label, val }) => {
              const isBest = val === maxVal && val > 0
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                    activeStrategy === key ? "bg-primary/5" : "hover:bg-secondary/50"
                  }`}
                  onClick={() => setActiveStrategy(key)}
                >
                  <span className={`text-xs ${activeStrategy === key ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${activeStrategy === key ? "text-success" : "text-muted-foreground"}`}>
                      {formatCurrency(val)}
                    </span>
                    {isBest && (
                      <span className="text-[10px] font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5">
                        Best
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

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
