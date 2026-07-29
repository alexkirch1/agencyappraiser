"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import type { MarketIntel } from "@/lib/use-market-intel"

function fmt(num: number): string {
  return "$" + num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtX(n: number): string {
  return n.toFixed(2) + "x"
}

// ── Factor definitions ────────────────────────────────────────────────────────

export interface ValuationFactors {
  // Book quality
  totalPolicies: number | null
  totalCustomers: number | null
  lossRatio: number | null          // percentage, e.g. 45
  retention: number | null          // percentage, e.g. 88
  avgPremium: number | null         // dollars per policy
  matchConfidence: number | null    // 0–100 — commission statement match rate %
  // Agency quality
  commercialMix: number | null      // 0–100 (% commercial)
  carrierConcentration: number | null // % in single carrier
  revenueGrowth: "strong" | "moderate" | "flat" | "declining" | ""
  agencyAge: number | null          // years
  sellerTransition: number | null   // months committed
}

/**
 * Pure factor engine — starts at 1.0x and adjusts up/down based on factors.
 * Returns an object with each factor delta and the final suggested multiple.
 */
export interface FactorBreakdown {
  base: number
  // individual deltas (positive = adds value, negative = reduces)
  fLossRatio: number
  fRetention: number
  fMatchConfidence: number
  fPoliciesPerCx: number
  fTotalPolicies: number
  fAvgPremium: number
  fCommercialMix: number
  fCarrierConcentration: number
  fRevenueGrowth: number
  fAgencyAge: number
  fSellerTransition: number
  // learned adjustment from market data
  fLearned: number
  // computed
  subtotal: number       // base + all factors (before clamp)
  suggested: number      // clamped to 0.5–4.0
}

export function computeFactors(
  f: ValuationFactors,
  learnedAdj: number = 0
): FactorBreakdown {
  // Industry baseline: 1.80x annual commission revenue
  const base = 1.80

  // 1. Loss ratio ±
  let fLossRatio = 0
  if (f.lossRatio !== null) {
    if (f.lossRatio < 45)       fLossRatio = +0.25
    else if (f.lossRatio < 55)  fLossRatio = +0.10
    else if (f.lossRatio < 65)  fLossRatio = 0
    else if (f.lossRatio < 75)  fLossRatio = -0.15
    else                         fLossRatio = -0.35
  }

  // 2. Retention ± (spec thresholds)
  let fRetention = 0
  if (f.retention !== null) {
    if (f.retention >= 90)        fRetention = +0.30   // Excellent
    else if (f.retention >= 85)   fRetention = +0.15   // Solid
    else if (f.retention >= 80)   fRetention = 0       // Baseline
    else if (f.retention >= 70)   fRetention = -0.15   // Below average
    else                           fRetention = -0.30   // Weak
  }

  // 3. Match confidence (commission statement data quality) ±
  let fMatchConfidence = 0
  if (f.matchConfidence !== null && f.matchConfidence !== undefined) {
    if (f.matchConfidence >= 85)  fMatchConfidence = +0.10
    else if (f.matchConfidence < 60) fMatchConfidence = -0.10
    // 60–84: no adjustment
  }

  // 4. Policies-per-customer ratio ±
  let fPoliciesPerCx = 0
  if (f.totalCustomers && f.totalPolicies && f.totalCustomers > 0) {
    const ratio = f.totalPolicies / f.totalCustomers
    if (ratio >= 2.5)       fPoliciesPerCx = +0.25
    else if (ratio >= 2.0)  fPoliciesPerCx = +0.15
    else if (ratio >= 1.75) fPoliciesPerCx = +0.08
    else if (ratio >= 1.5)  fPoliciesPerCx = 0
    else if (ratio >= 1.25) fPoliciesPerCx = -0.08
    else                     fPoliciesPerCx = -0.20
  }

  // 4. Total policies (scale / stickiness proxy) ±
  let fTotalPolicies = 0
  if (f.totalPolicies !== null) {
    if (f.totalPolicies >= 5000)        fTotalPolicies = +0.20
    else if (f.totalPolicies >= 2500)   fTotalPolicies = +0.10
    else if (f.totalPolicies >= 1000)   fTotalPolicies = +0.05
    else if (f.totalPolicies >= 500)    fTotalPolicies = 0
    else if (f.totalPolicies >= 250)    fTotalPolicies = -0.05
    else                                 fTotalPolicies = -0.15
  }

  // 5. Average premium per policy (account size proxy) ± (spec thresholds)
  let fAvgPremium = 0
  if (f.avgPremium !== null) {
    if (f.avgPremium >= 1500)       fAvgPremium = +0.15   // High policy size
    else if (f.avgPremium >= 600)   fAvgPremium = 0       // Average
    else                             fAvgPremium = -0.10   // Low policy size
  }

  // 6. Commercial mix ± (more commercial = stickier = higher multiple)
  let fCommercialMix = 0
  if (f.commercialMix !== null) {
    if (f.commercialMix >= 60)       fCommercialMix = +0.15
    else if (f.commercialMix >= 40)  fCommercialMix = +0.08
    else if (f.commercialMix >= 20)  fCommercialMix = 0
    else                              fCommercialMix = -0.05
  }

  // 7. Carrier concentration ± (higher concentration = more risk)
  let fCarrierConcentration = 0
  if (f.carrierConcentration !== null) {
    if (f.carrierConcentration <= 25)       fCarrierConcentration = +0.10
    else if (f.carrierConcentration <= 40)  fCarrierConcentration = +0.05
    else if (f.carrierConcentration <= 55)  fCarrierConcentration = 0
    else if (f.carrierConcentration <= 70)  fCarrierConcentration = -0.10
    else                                     fCarrierConcentration = -0.20
  }

  // 8. Revenue growth trend ±
  let fRevenueGrowth = 0
  if (f.revenueGrowth === "strong")        fRevenueGrowth = +0.20
  else if (f.revenueGrowth === "moderate") fRevenueGrowth = +0.10
  else if (f.revenueGrowth === "flat")     fRevenueGrowth = 0
  else if (f.revenueGrowth === "declining") fRevenueGrowth = -0.20

  // 9. Agency age ±
  let fAgencyAge = 0
  if (f.agencyAge !== null) {
    if (f.agencyAge >= 25)       fAgencyAge = +0.15
    else if (f.agencyAge >= 15)  fAgencyAge = +0.10
    else if (f.agencyAge >= 8)   fAgencyAge = +0.05
    else if (f.agencyAge >= 3)   fAgencyAge = 0
    else                          fAgencyAge = -0.10
  }

  // 10. Seller transition commitment ±
  let fSellerTransition = 0
  if (f.sellerTransition !== null) {
    if (f.sellerTransition >= 24)      fSellerTransition = +0.15
    else if (f.sellerTransition >= 12) fSellerTransition = +0.08
    else if (f.sellerTransition >= 6)  fSellerTransition = +0.03
    else if (f.sellerTransition === 0) fSellerTransition = -0.15
  }

  const fLearned = parseFloat(learnedAdj.toFixed(2))

  const subtotal =
    base +
    fLossRatio + fRetention + fMatchConfidence + fPoliciesPerCx + fTotalPolicies +
    fAvgPremium + fCommercialMix + fCarrierConcentration +
    fRevenueGrowth + fAgencyAge + fSellerTransition +
    fLearned

  const suggested = parseFloat(Math.max(0.5, Math.min(4.0, subtotal)).toFixed(2))

  return {
    base,
    fLossRatio,
    fRetention,
    fMatchConfidence,
    fPoliciesPerCx,
    fTotalPolicies,
    fAvgPremium,
    fCommercialMix,
    fCarrierConcentration,
    fRevenueGrowth,
    fAgencyAge,
    fSellerTransition,
    fLearned,
    subtotal,
    suggested,
  }
}

// ── Component ────────────────────────────────────────────────────────────────

type Strategy = "quick" | "balanced" | "growth"

export const OVERRIDE_REASONS = [
  "Relationship / trust premium",
  "Seller urgency — discounted",
  "Strategic acquisition",
  "Exceptional growth trajectory",
  "High carrier concentration risk",
  "Key-man dependency concern",
  "Geographic expansion value",
  "Competing offer — matched",
  "Data incomplete / adjusted conservatively",
  "Other",
] as const

export type OverrideReason = typeof OVERRIDE_REASONS[number] | ""

interface ValuationReportProps {
  baseRevenue: number
  currentValuation: number
  valuationMultiple: number
  onMultipleChange: (val: number) => void
  // legacy factor dropdowns (kept for backward compat — map into new engine)
  factorLoss: number
  onFactorLossChange: (val: number) => void
  factorCarrier: number
  onFactorCarrierChange: (val: number) => void
  // NEW: rich factor inputs
  factors?: Partial<ValuationFactors>
  onFactorsChange?: (f: Partial<ValuationFactors>) => void
  // NEW: override
  overrideReason?: OverrideReason
  onOverrideReasonChange?: (r: OverrideReason) => void
  isOverridden?: boolean
  onIsOverriddenChange?: (v: boolean) => void
  // NEW: market intel for AI suggestions
  intel?: MarketIntel
}

export function ValuationReport({
  baseRevenue,
  currentValuation,
  valuationMultiple,
  onMultipleChange,
  factorLoss,
  onFactorLossChange,
  factorCarrier,
  onFactorCarrierChange,
  factors = {},
  onFactorsChange,
  overrideReason = "",
  onOverrideReasonChange,
  isOverridden = false,
  onIsOverriddenChange,
  intel,
}: ValuationReportProps) {
  const [strategy, setStrategy] = useState<Strategy>("balanced")
  const [cashPct, setCashPct] = useState(85)
  const [showFactors, setShowFactors] = useState(true)

  const learnedAdj = intel?.learnedMultipleAdjustment ?? 0

  // Compute the model-suggested multiple from factors
  const breakdown = computeFactors(
    {
      totalPolicies: factors.totalPolicies ?? null,
      totalCustomers: factors.totalCustomers ?? null,
      lossRatio: factors.lossRatio ?? null,
      retention: factors.retention ?? null,
      avgPremium: factors.avgPremium ?? null,
      matchConfidence: factors.matchConfidence ?? null,
      commercialMix: factors.commercialMix ?? null,
      carrierConcentration: factors.carrierConcentration ?? null,
      revenueGrowth: factors.revenueGrowth ?? "",
      agencyAge: factors.agencyAge ?? null,
      sellerTransition: factors.sellerTransition ?? null,
    },
    learnedAdj
  )

  const modelMultiple = breakdown.suggested

  // Sync slider to model suggestion when not overridden
  useEffect(() => {
    if (!isOverridden) {
      onMultipleChange(modelMultiple)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelMultiple, isOverridden])

  const cashAmt = currentValuation * (cashPct / 100)
  const remainder = currentValuation - cashAmt

  const applyStrategy = useCallback((strat: Strategy) => {
    setStrategy(strat)
    if (strat === "quick") setCashPct(100)
    else if (strat === "balanced") setCashPct(85)
    else setCashPct(60)
  }, [])

  function handleSliderChange(val: number) {
    onMultipleChange(val)
    if (val !== modelMultiple && !isOverridden) {
      onIsOverriddenChange?.(true)
    }
  }

  function handleClearOverride() {
    onIsOverriddenChange?.(false)
    onOverrideReasonChange?.("")
    onMultipleChange(modelMultiple)
  }

  // Deal structure suggestion based on comps
  const structureSuggestion = buildDealStructureSuggestion(intel, modelMultiple, currentValuation)

  const delta = valuationMultiple - modelMultiple
  const deltaSign = delta > 0.01 ? "+" : ""

  return (
    <div>
      {/* Step header */}
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          5
        </span>
        <h3 className="text-lg font-bold text-foreground">Consolidated Valuation</h3>
      </div>

      {/* ── Factor inputs (collapsible) ───────────────────────────────── */}
      <div className="mb-5 rounded-lg border border-border bg-card">
        <button
          type="button"
          onClick={() => setShowFactors((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-secondary/30 transition-colors rounded-lg"
        >
          <span>Book Quality Factors</span>
          <span className="text-xs text-muted-foreground">{showFactors ? "Hide" : "Expand to improve accuracy"}</span>
        </button>

        {showFactors && (
          <div className="border-t border-border px-4 pb-4 pt-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Total policies */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Total Active Policies
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 1200"
                  value={factors.totalPolicies ?? ""}
                  onChange={(e) => onFactorsChange?.({ ...factors, totalPolicies: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              {/* Total customers */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Total Active Customers
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 800"
                  value={factors.totalCustomers ?? ""}
                  onChange={(e) => onFactorsChange?.({ ...factors, totalCustomers: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
                {factors.totalPolicies && factors.totalCustomers && factors.totalCustomers > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {(factors.totalPolicies / factors.totalCustomers).toFixed(2)} policies/customer
                  </p>
                )}
              </div>
              {/* Loss ratio */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Loss Ratio (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  step={0.5}
                  placeholder="e.g. 52"
                  value={factors.lossRatio ?? ""}
                  onChange={(e) => onFactorsChange?.({ ...factors, lossRatio: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              {/* Retention */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Client Retention Rate (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  placeholder="e.g. 88"
                  value={factors.retention ?? ""}
                  onChange={(e) => onFactorsChange?.({ ...factors, retention: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              {/* Avg premium */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Avg Premium per Policy ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  placeholder="e.g. 1400"
                  value={factors.avgPremium ?? ""}
                  onChange={(e) => onFactorsChange?.({ ...factors, avgPremium: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              {/* Commercial mix */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Commercial Mix (% of book)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  placeholder="e.g. 35"
                  value={factors.commercialMix ?? ""}
                  onChange={(e) => onFactorsChange?.({ ...factors, commercialMix: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              {/* Carrier concentration */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Top Carrier Concentration (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  placeholder="e.g. 40"
                  value={factors.carrierConcentration ?? ""}
                  onChange={(e) => onFactorsChange?.({ ...factors, carrierConcentration: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              {/* Revenue growth */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Revenue Growth Trend
                </label>
                <select
                  value={factors.revenueGrowth ?? ""}
                  onChange={(e) => onFactorsChange?.({ ...factors, revenueGrowth: e.target.value as ValuationFactors["revenueGrowth"] })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">— Not specified —</option>
                  <option value="strong">Strong (10%+ YoY)</option>
                  <option value="moderate">Moderate (3–10% YoY)</option>
                  <option value="flat">Flat (&lt;3% YoY)</option>
                  <option value="declining">Declining</option>
                </select>
              </div>
              {/* Agency age */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Agency Age (years)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="e.g. 12"
                  value={factors.agencyAge ?? ""}
                  onChange={(e) => onFactorsChange?.({ ...factors, agencyAge: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              {/* Seller transition */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Seller Transition Commitment (months)
                </label>
                <select
                  value={factors.sellerTransition ?? ""}
                  onChange={(e) => onFactorsChange?.({ ...factors, sellerTransition: e.target.value !== "" ? parseInt(e.target.value) : null })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">— Not specified —</option>
                  <option value="0">0 — No commitment</option>
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                  <option value="24">24 months</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Factor breakdown panel ────────────────────────────────────── */}
      <div className="mb-5 rounded-lg border border-border bg-card p-4">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Model Calculation
        </h4>

        {/* Suggested multiple headline */}
        <div className="mb-3 flex items-center justify-between rounded-lg bg-primary/8 px-3 py-2">
          <span className="text-sm font-semibold text-foreground">Suggested Multiple</span>
          <span className="text-xl font-extrabold text-primary">{fmtX(modelMultiple)}</span>
        </div>

        {/* Quality adjustment pills */}
        {(() => {
          const pills: { label: string; delta: number }[] = []
          if (breakdown.fRetention !== 0) {
            const label = breakdown.fRetention > 0
              ? (breakdown.fRetention >= 0.30 ? "Excellent Retention" : "Solid Retention")
              : (breakdown.fRetention <= -0.30 ? "Weak Retention" : "Below-Avg Retention")
            pills.push({ label, delta: breakdown.fRetention })
          }
          if (breakdown.fMatchConfidence !== 0) {
            pills.push({
              label: breakdown.fMatchConfidence > 0 ? "High Match Confidence" : "Low Match Confidence",
              delta: breakdown.fMatchConfidence,
            })
          }
          if (breakdown.fAvgPremium !== 0) {
            pills.push({
              label: breakdown.fAvgPremium > 0 ? "High Policy Size" : "Low Policy Size",
              delta: breakdown.fAvgPremium,
            })
          }
          if (breakdown.fLossRatio !== 0) {
            pills.push({
              label: breakdown.fLossRatio > 0 ? "Low Loss Ratio" : "High Loss Ratio",
              delta: breakdown.fLossRatio,
            })
          }
          if (breakdown.fCommercialMix !== 0) pills.push({ label: "Commercial Mix", delta: breakdown.fCommercialMix })
          if (breakdown.fCarrierConcentration !== 0) pills.push({ label: "Carrier Concentration", delta: breakdown.fCarrierConcentration })
          if (breakdown.fRevenueGrowth !== 0) pills.push({ label: "Revenue Growth", delta: breakdown.fRevenueGrowth })
          if (breakdown.fAgencyAge !== 0) pills.push({ label: "Agency Longevity", delta: breakdown.fAgencyAge })
          if (breakdown.fPoliciesPerCx !== 0) pills.push({ label: "Policies / Customer", delta: breakdown.fPoliciesPerCx })
          if (breakdown.fTotalPolicies !== 0) pills.push({ label: "Book Scale", delta: breakdown.fTotalPolicies })
          if (breakdown.fSellerTransition !== 0) pills.push({ label: "Seller Transition", delta: breakdown.fSellerTransition })
          if (breakdown.fLearned !== 0) pills.push({ label: "Market Data", delta: breakdown.fLearned })

          if (pills.length === 0) return (
            <p className="mb-3 text-xs text-muted-foreground">No quality factors entered yet — fill in Book Quality Factors above to refine this estimate.</p>
          )
          return (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {pills.map((p, i) => (
                <span
                  key={i}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                    p.delta > 0
                      ? "bg-success/15 text-success"
                      : "bg-destructive/15 text-destructive"
                  )}
                >
                  {p.delta > 0 ? "+" : ""}{p.delta.toFixed(2)}x {p.label}
                </span>
              ))}
            </div>
          )
        })()}

        <div className="space-y-1.5 text-sm">
          <FactorRow label="1.80x Industry Baseline" value={breakdown.base} isBase />
          {breakdown.fRetention !== 0 && (
            <FactorRow label="Retention rate" value={breakdown.fRetention} />
          )}
          {breakdown.fMatchConfidence !== 0 && (
            <FactorRow label="Match confidence" value={breakdown.fMatchConfidence} />
          )}
          {breakdown.fLossRatio !== 0 && (
            <FactorRow label="Loss ratio" value={breakdown.fLossRatio} />
          )}
          {breakdown.fPoliciesPerCx !== 0 && (
            <FactorRow label="Policies / customer" value={breakdown.fPoliciesPerCx} />
          )}
          {breakdown.fTotalPolicies !== 0 && (
            <FactorRow label="Book scale (total policies)" value={breakdown.fTotalPolicies} />
          )}
          {breakdown.fAvgPremium !== 0 && (
            <FactorRow label="Avg premium / policy" value={breakdown.fAvgPremium} />
          )}
          {breakdown.fCommercialMix !== 0 && (
            <FactorRow label="Commercial mix" value={breakdown.fCommercialMix} />
          )}
          {breakdown.fCarrierConcentration !== 0 && (
            <FactorRow label="Carrier concentration" value={breakdown.fCarrierConcentration} />
          )}
          {breakdown.fRevenueGrowth !== 0 && (
            <FactorRow label="Revenue growth" value={breakdown.fRevenueGrowth} />
          )}
          {breakdown.fAgencyAge !== 0 && (
            <FactorRow label="Agency longevity" value={breakdown.fAgencyAge} />
          )}
          {breakdown.fSellerTransition !== 0 && (
            <FactorRow label="Seller transition" value={breakdown.fSellerTransition} />
          )}
          {breakdown.fLearned !== 0 && (
            <FactorRow label="Learned (market data)" value={breakdown.fLearned} isLearned />
          )}
          <div className="flex items-center justify-between border-t border-border pt-2 font-bold">
            <span className="text-foreground">Model suggested</span>
            <span className="text-base text-primary">{fmtX(modelMultiple)}</span>
          </div>
        </div>
      </div>

      {/* ── Deal Structure Suggestion ─────────────────────────────────── */}
      {structureSuggestion && (
        <div className="mb-5 rounded-lg border border-primary/25 bg-primary/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Suggested Deal Structure
            </p>
            <span className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
              structureSuggestion.type === "all-cash"   && "bg-green-500/15 text-green-600 dark:text-green-400",
              structureSuggestion.type === "cash-split" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
              structureSuggestion.type === "growth"     && "bg-purple-500/15 text-purple-600 dark:text-purple-400",
            )}>
              {structureSuggestion.label}
            </span>
          </div>

          {/* Cash breakdown bar */}
          <div className="mb-3">
            <div className="mb-1.5 flex justify-between text-xs font-semibold">
              <span className="text-green-600 dark:text-green-400">Cash at Close — {structureSuggestion.cashPct}%</span>
              <span className="text-purple-600 dark:text-purple-400">
                {structureSuggestion.cashPct < 100 ? `Deferred — ${100 - structureSuggestion.cashPct}%` : ""}
              </span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${structureSuggestion.cashPct}%` }}
              />
              {structureSuggestion.cashPct < 100 && (
                <div
                  className="h-full bg-purple-500 transition-all duration-500"
                  style={{ width: `${100 - structureSuggestion.cashPct}%` }}
                />
              )}
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>{fmt(currentValuation * structureSuggestion.cashPct / 100)} cash</span>
              {structureSuggestion.cashPct < 100 && (
                <span>{fmt(currentValuation * (100 - structureSuggestion.cashPct) / 100)} {structureSuggestion.deferredLabel}</span>
              )}
            </div>
          </div>

          {/* Two-sided rationale */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-background/60 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Our Side</p>
              <p className="text-xs text-foreground">{structureSuggestion.ourRationale}</p>
            </div>
            <div className="rounded-md bg-background/60 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Their Side</p>
              <p className="text-xs text-foreground">{structureSuggestion.theirRationale}</p>
            </div>
          </div>

          {/* Apply suggestion button */}
          <button
            type="button"
            onClick={() => {
              setCashPct(structureSuggestion.cashPct)
              applyStrategy(structureSuggestion.strategy)
            }}
            className="mt-3 w-full rounded-md bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            Apply this structure to deal
          </button>

          {intel && intel.sampleSize > 0 && (
            <p className="mt-2 text-center text-[10px] text-muted-foreground/60">
              Based on {intel.sampleSize} closed deal{intel.sampleSize > 1 ? "s" : ""}
              {intel.medianMultiple != null ? ` — median multiple ${intel.medianMultiple.toFixed(2)}x` : ""}
            </p>
          )}
        </div>
      )}

      {/* ── Manual override toggle ───────────────────────────────────── */}
      <div className="mb-5 rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Manual Override</p>
            <p className="text-xs text-muted-foreground">Adjust the multiple from the model suggestion.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !isOverridden
              onIsOverriddenChange?.(next)
              if (!next) handleClearOverride()
            }}
            className={cn(
              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
              isOverridden ? "bg-primary" : "bg-border"
            )}
            role="switch"
            aria-checked={isOverridden}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
                isOverridden ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {isOverridden && (
          <div className="space-y-3">
            {/* Slider */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">Revenue Multiple</span>
                <span className="flex items-center gap-2">
                  <span className="text-lg font-extrabold text-primary">{fmtX(valuationMultiple)}</span>
                  {Math.abs(delta) > 0.01 && (
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      delta > 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    )}>
                      {deltaSign}{delta.toFixed(2)}x from model
                    </span>
                  )}
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.05"
                value={valuationMultiple}
                onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                <span>0.5x</span>
                <span>1.0x</span>
                <span>2.0x</span>
                <span>3.0x</span>
                <span>4.0x</span>
              </div>
            </div>

            {/* Override reason */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Override Reason (required — feeds learning model)
              </label>
              <select
                value={overrideReason}
                onChange={(e) => onOverrideReasonChange?.(e.target.value as OverrideReason)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">— Select a reason —</option>
                {OVERRIDE_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Override reasons improve future model accuracy for similar deals.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClearOverride}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Reset to model suggestion ({fmtX(modelMultiple)})
            </button>
          </div>
        )}

        {!isOverridden && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-primary">{fmtX(modelMultiple)}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Model</span>
            </div>
            <p className="text-xs text-muted-foreground">Toggle override to adjust manually.</p>
          </div>
        )}
      </div>

      {/* ── Final Valuation Display ───────────────────────────────────── */}
      <div className="mb-8 rounded-xl border-2 border-success bg-success/5 p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-success">
          Estimated Agency Value
        </p>
        <p className="mt-1 text-4xl font-extrabold text-success">
          {fmt(currentValuation)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Based on {fmt(baseRevenue)} revenue &times; {fmtX(valuationMultiple)}
          {isOverridden && overrideReason ? ` (manual — ${overrideReason})` : ""}
        </p>
      </div>

      {/* ── Deal Strategy ─────────────────────────────────────────────── */}
      <div className="rounded-xl bg-[#1e293b] p-6 text-white">
        <h4 className="mb-1 text-lg font-bold">Deal Structure Strategy</h4>
        <p className="mb-6 text-xs text-[#94a3b8]">Choose a strategy template, then fine-tune.</p>

        <div className="mb-6 grid grid-cols-3 gap-3">
          {([
            { id: "quick" as const, label: "Quick Exit", desc: "100% Cash at Close", color: "border-[#22c55e] shadow-[0_0_0_1px_#22c55e]" },
            { id: "balanced" as const, label: "Balanced", desc: "85% Cash / 15% Holdback", color: "border-[#f59e0b] shadow-[0_0_0_1px_#f59e0b]" },
            { id: "growth" as const, label: "Growth", desc: "60% Cash / 40% Earnout", color: "border-[#a855f7] shadow-[0_0_0_1px_#a855f7]" },
          ]).map((s) => (
            <button
              key={s.id}
              onClick={() => applyStrategy(s.id)}
              className={cn(
                "rounded-lg border bg-[#334155] p-4 text-left transition-all hover:-translate-y-0.5",
                strategy === s.id ? s.color : "border-white/10"
              )}
            >
              <p className="text-sm font-bold">{s.label}</p>
              <p className="text-xs text-[#cbd5e1]">{s.desc}</p>
            </button>
          ))}
        </div>

        <div className="mb-6 rounded-lg border border-white/10 bg-black/20 p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-[#94a3b8]">Gross Valuation</p>
          <p className="text-3xl font-extrabold text-[#38bdf8]">{fmt(currentValuation)}</p>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold">Cash at Close</span>
            <span className="font-bold text-[#22c55e]">{cashPct}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={cashPct}
            onChange={(e) => setCashPct(parseInt(e.target.value))}
            className="w-full accent-[#22c55e]"
          />
        </div>

        <div className="rounded-lg border border-white/5 bg-[#334155] p-5">
          <p className="mb-1 text-xs text-[#38bdf8] font-bold">Liquid Cash at Close</p>
          <p className="mb-4 text-2xl font-extrabold text-[#22c55e]">{fmt(cashAmt)}</p>

          <div className="mb-3 flex h-8 w-full overflow-hidden rounded-md bg-[#1e293b]">
            <div className="h-full bg-[#22c55e] transition-all" style={{ width: `${cashPct}%` }} />
            <div className="h-full bg-[#a855f7] transition-all" style={{ width: `${100 - cashPct}%` }} />
          </div>

          <div className="flex justify-between border-t border-white/10 pt-3 text-xs text-[#cbd5e1]">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
              Cash: {fmt(cashAmt)}
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#a855f7]" />
              Deferred: {fmt(remainder)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helper subcomponents ──────────────────────────────────────────────────────

function FactorRow({
  label,
  value,
  isBase = false,
  isLearned = false,
}: {
  label: string
  value: number
  isBase?: boolean
  isLearned?: boolean
}) {
  const positive = value > 0
  const neutral = value === 0

  return (
    <div className="flex items-center justify-between text-sm">
      <span className={cn(
        "text-muted-foreground",
        isBase && "font-semibold text-foreground",
        isLearned && "italic"
      )}>
        {label}
      </span>
      <span className={cn(
        "font-mono font-semibold",
        isBase ? "text-foreground" :
        neutral ? "text-muted-foreground" :
        positive ? "text-success" : "text-destructive"
      )}>
        {isBase ? fmtX(value) : `${positive ? "+" : ""}${value.toFixed(2)}x`}
      </span>
    </div>
  )
}

// ── Deal structure suggestion builder ────────────────────────────────────────

interface DealStructureSuggestion {
  type: "all-cash" | "cash-split" | "growth"
  strategy: Strategy
  label: string
  cashPct: number
  deferredLabel: string
  ourRationale: string
  theirRationale: string
}

function buildDealStructureSuggestion(
  intel: MarketIntel | undefined,
  modelMultiple: number,
  totalValue: number,
): DealStructureSuggestion | null {
  // Always show a suggestion — use intel to calibrate, fall back to book-quality proxy
  const earnoutRate   = intel?.earnoutRate ?? 0          // 0–1
  const medianStay    = intel?.medianSellerStay ?? null  // months
  const medianMultiple = intel?.medianMultiple ?? null

  // Determine deal type recommendation based on three signals:
  // 1. If market rarely uses earnouts (<20%) → All Cash
  // 2. If earnout rate is high (>50%) OR value is high (>2.5x) → Growth/Earnout
  // 3. Otherwise → Cash Split
  const highValue = modelMultiple >= 2.5
  const highRetentionRisk = medianMultiple != null && modelMultiple > medianMultiple + 0.3

  let type: DealStructureSuggestion["type"]
  let cashPct: number
  let deferredLabel: string

  if (earnoutRate < 0.2 && !highValue) {
    // Market strongly prefers cash, book quality looks clean
    type = "all-cash"
    cashPct = 100
    deferredLabel = ""
  } else if (earnoutRate >= 0.5 || highValue) {
    // Market frequently uses earnout, or high multiple warrants performance protection
    type = "growth"
    // Higher multiple = more deferred to protect downside
    cashPct = highValue ? 60 : 70
    deferredLabel = "earnout"
  } else {
    // Middle ground — balanced split
    type = "cash-split"
    cashPct = 80
    deferredLabel = "holdback/earnout"
  }

  const strategyMap: Record<DealStructureSuggestion["type"], Strategy> = {
    "all-cash":   "quick",
    "cash-split": "balanced",
    "growth":     "growth",
  }

  const labelMap = {
    "all-cash":   "All Cash at Close",
    "cash-split": `${cashPct}% Cash / ${100 - cashPct}% Holdback`,
    "growth":     `${cashPct}% Cash / ${100 - cashPct}% Earnout`,
  }

  // Our-side rationale (de-risk, protect against retention/performance drop)
  const ourRationale = (() => {
    if (type === "all-cash") {
      return "Clean exit with no performance risk. Market data shows most comparable deals closed all-cash — low earnout exposure needed here."
    }
    if (type === "growth") {
      const pct = 100 - cashPct
      return `${pct}% deferred as earnout protects against post-close retention drops. At ${fmtX(modelMultiple)} this is above the market median — tying ${pct}% to performance reduces our downside.${highRetentionRisk ? " Model multiple exceeds market median; earnout provides key protection." : ""}`
    }
    return `${100 - cashPct}% holdback gives us a 12–18 month retention window. If the book performs, we pay it out — if it doesn't, we're protected.`
  })()

  // Their-side rationale (seller incentives, comfort, upside)
  const theirRationale = (() => {
    if (type === "all-cash") {
      return "Seller receives the full amount immediately — maximum certainty and liquidity. No transition performance risk on their end."
    }
    if (type === "growth") {
      const pct = 100 - cashPct
      const upside = totalValue * (pct / 100)
      return `Earnout gives the seller upside if the book performs well post-close. The ${pct}% deferred (${fmt(upside)}) is achievable if retention holds — they benefit from a strong handoff.${medianStay != null ? ` Market median seller stay is ${medianStay} months, suggesting sellers are comfortable with transition commitments.` : ""}`
    }
    const holdbackAmt = totalValue * ((100 - cashPct) / 100)
    return `Seller receives ${cashPct}% immediately (${fmt(totalValue * cashPct / 100)}) with the ${100 - cashPct}% holdback (${fmt(holdbackAmt)}) paid after the retention window. Predictable timeline with clear payout terms.`
  })()

  return {
    type,
    strategy: strategyMap[type],
    label: labelMap[type],
    cashPct,
    deferredLabel,
    ourRationale,
    theirRationale,
  }
}
