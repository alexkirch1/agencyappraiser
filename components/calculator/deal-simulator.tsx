"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { formatCurrency } from "./valuation-engine"

interface Props {
  highOffer: number
  coreScore: number
}

type Strategy = "allcash" | "blend" | "structured" | "allearnout"

// Earnout cap: 75% of annual commissions per year, typically 1–2 years
const EARNOUT_COMMISSION_RATE = 0.75
const EARNOUT_YEARS_OPTIONS = [1, 2]

const strategies: { key: Strategy; label: string; cash: number; description: string }[] = [
  { key: "allcash",    label: "All Cash",       cash: 100, description: "100% Cash at Close. Full payout on day one — no performance risk." },
  { key: "blend",      label: "Cash + Earnout", cash: 75,  description: "75% Cash at Close / 25% Earnout. A balanced structure that reduces buyer risk while maximizing seller upside." },
  { key: "structured", label: "Mostly Earnout", cash: 25,  description: "25% Cash / 75% Earnout. Higher total potential payout; earnout paid as 75% of annual commissions over 1–2 years." },
  { key: "allearnout", label: "Full Earnout",   cash: 0,   description: "100% Earnout. Maximum potential total value; paid at 75% of annual commissions — typically collected in 1–2 years." },
]

export function DealSimulator({ highOffer, coreScore }: Props) {
  const [cashPct, setCashPct] = useState(75)
  const [activeStrategy, setActiveStrategy] = useState<Strategy>("blend")
  const [earnoutYears, setEarnoutYears] = useState(1)

  const earnoutPct = 100 - cashPct

  const adjustedValue = useMemo(() => {
    // Slight upside for earnout-heavy deals (buyer takes less risk upfront)
    const adjustmentFactor = earnoutPct === 0 ? 1 : 1 + earnoutPct * 0.001
    return highOffer * adjustmentFactor
  }, [highOffer, earnoutPct])

  const cashAmount = adjustedValue * (cashPct / 100)
  const earnoutTotal = adjustedValue * (earnoutPct / 100)
  const earnoutPerYear = earnoutYears > 0 ? earnoutTotal / earnoutYears : 0

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
          <CardContent className="py-4 flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Earnout Structure</p>

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

            {/* Per-year breakdown */}
            <div className="rounded-md bg-card border border-border divide-y divide-border">
              {Array.from({ length: earnoutYears }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-muted-foreground">Year {i + 1} payment</span>
                  <span className="text-sm font-semibold text-foreground">{formatCurrency(earnoutPerYear)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 bg-primary/5">
                <span className="text-xs font-semibold text-foreground">Total Earnout</span>
                <span className="text-sm font-bold text-primary">{formatCurrency(earnoutTotal)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Earnout is paid at <span className="font-semibold text-foreground">{Math.round(EARNOUT_COMMISSION_RATE * 100)}% of annual commissions</span> from the acquired book. Most deals settle within 1–2 years.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
