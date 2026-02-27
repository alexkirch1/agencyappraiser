"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

function formatCurrency(num: number): string {
  return "$" + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type Strategy = "quick" | "balanced" | "growth"

interface ValuationReportProps {
  baseRevenue: number
  currentValuation: number
  valuationMultiple: number
  onMultipleChange: (val: number) => void
  factorLoss: number
  onFactorLossChange: (val: number) => void
  factorCarrier: number
  onFactorCarrierChange: (val: number) => void
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
}: ValuationReportProps) {
  const [strategy, setStrategy] = useState<Strategy>("balanced")
  const [cashPct, setCashPct] = useState(85)

  // Computed AI logic
  const baseMultiple = 1.5
  const suggestedMultiple = baseMultiple + factorLoss + factorCarrier

  const cashAmt = currentValuation * (cashPct / 100)
  const remainder = currentValuation - cashAmt

  const applyStrategy = useCallback((strat: Strategy) => {
    setStrategy(strat)
    if (strat === "quick") setCashPct(100)
    else if (strat === "balanced") setCashPct(85)
    else setCashPct(60)
  }, [])

  // Sync suggested multiple to slider
  useEffect(() => {
    const clamped = Math.max(0, suggestedMultiple)
    onMultipleChange(parseFloat(clamped.toFixed(2)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedMultiple])

  return (
    <div>
      {/* Valuation Logic */}
      <div className="mb-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            5
          </span>
          <h3 className="text-lg font-bold text-foreground">Consolidated Valuation</h3>
        </div>

        {/* Valuation Logic Panel */}
        <div className="mb-6 rounded-lg border border-success bg-success/5 p-5">
          <h4 className="mb-3 text-sm font-bold text-success">Valuation Logic</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground">Base Multiple</span>
              <span className="font-bold text-foreground">{baseMultiple.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground">Risk Profile Adjustment</span>
              <span className="font-bold text-foreground">
                {factorLoss > 0 ? "+" : ""}
                {factorLoss.toFixed(2)}x
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="font-bold text-primary">Suggested Multiple</span>
              <span className="text-base font-extrabold text-primary">
                {suggestedMultiple.toFixed(2)}x
              </span>
            </div>
          </div>
        </div>

        {/* Valuation Multipliers */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">
              Loss Ratio / Risk
            </label>
            <select
              value={factorLoss}
              onChange={(e) => onFactorLossChange(parseFloat(e.target.value))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="0">Standard</option>
              <option value="0.1">Excellent / Improving [+0.1x]</option>
              <option value="-0.4">Trend: Deteriorating [-0.4x]</option>
              <option value="-0.3">High Loss Ratio [-0.3x]</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">
              Carrier Mix
            </label>
            <select
              value={factorCarrier}
              onChange={(e) => onFactorCarrierChange(parseFloat(e.target.value))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="0">Balanced</option>
              <option value="0.1">Preferred Carriers [+0.1x]</option>
              <option value="-0.1">Non-Standard [-0.1x]</option>
            </select>
          </div>
        </div>

        {/* Manual Slider */}
        <div className="mb-6">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold text-foreground">Revenue Multiple</span>
            <span className="text-lg font-extrabold text-primary">
              {valuationMultiple.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="5.0"
            step="0.05"
            value={valuationMultiple}
            onChange={(e) => onMultipleChange(parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Adjust manually or let factors calculate automatically.
          </p>
        </div>

        {/* Final Valuation Display */}
        <div className="mb-8 rounded-xl border-2 border-success bg-success/5 p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-success">
            Estimated Agency Value
          </p>
          <p className="mt-1 text-4xl font-extrabold text-success">
            {formatCurrency(currentValuation)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Based on {formatCurrency(baseRevenue)} revenue x{" "}
            {valuationMultiple.toFixed(2)}x multiple
          </p>
        </div>
      </div>

      {/* Deal Strategy UI */}
      <div className="rounded-xl bg-[#1e293b] p-6 text-white">
        <h4 className="mb-1 text-lg font-bold">Deal Structure Strategy</h4>
        <p className="mb-6 text-xs text-[#94a3b8]">
          Choose a strategy template, then fine-tune.
        </p>

        {/* Strategy Cards */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {([
            {
              id: "quick" as const,
              label: "Quick Exit",
              desc: "100% Cash at Close",
              color: "border-[#22c55e] shadow-[0_0_0_1px_#22c55e]",
            },
            {
              id: "balanced" as const,
              label: "Balanced",
              desc: "85% Cash / 15% Holdback",
              color: "border-[#f59e0b] shadow-[0_0_0_1px_#f59e0b]",
            },
            {
              id: "growth" as const,
              label: "Growth",
              desc: "60% Cash / 40% Earnout",
              color: "border-[#a855f7] shadow-[0_0_0_1px_#a855f7]",
            },
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

        {/* Gross Valuation */}
        <div className="mb-6 rounded-lg border border-white/10 bg-black/20 p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-[#94a3b8]">Gross Valuation</p>
          <p className="text-3xl font-extrabold text-[#38bdf8]">
            {formatCurrency(currentValuation)}
          </p>
        </div>

        {/* Cash Slider */}
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
            onChange={(e) => {
              setCashPct(parseInt(e.target.value))
            }}
            className="w-full accent-[#22c55e]"
          />
        </div>

        {/* Waterfall Visualization */}
        <div className="rounded-lg border border-white/5 bg-[#334155] p-5">
          <p className="mb-1 text-xs text-[#38bdf8] font-bold">Liquid Cash at Close</p>
          <p className="mb-4 text-2xl font-extrabold text-[#22c55e]">
            {formatCurrency(cashAmt)}
          </p>

          <div className="mb-3 flex h-8 w-full overflow-hidden rounded-md bg-[#1e293b]">
            <div
              className="h-full bg-[#22c55e] transition-all"
              style={{ width: `${cashPct}%` }}
            />
            <div
              className="h-full bg-[#a855f7] transition-all"
              style={{ width: `${100 - cashPct}%` }}
            />
          </div>

          <div className="flex justify-between border-t border-white/10 pt-3 text-xs text-[#cbd5e1]">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
              Cash: {formatCurrency(cashAmt)}
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#a855f7]" />
              Deferred: {formatCurrency(remainder)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
