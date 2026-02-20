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

type Strategy = "quick" | "blend" | "structured"

const strategies: { key: Strategy; label: string; cash: number; description: string }[] = [
  { key: "quick", label: "Quick Payout", cash: 100, description: "100% Cash at Close. Best for clean exits." },
  { key: "blend", label: "Balanced", cash: 85, description: "85% Cash / 15% Holdback. Standard structure." },
  { key: "structured", label: "Growth", cash: 70, description: "70% Cash / 30% Earnout. Maximizes total value." },
]

export function DealSimulator({ highOffer, coreScore }: Props) {
  const [cashPct, setCashPct] = useState(85)
  const [activeStrategy, setActiveStrategy] = useState<Strategy>("blend")

  const earnoutPct = 100 - cashPct

  const adjustedValue = useMemo(() => {
    const adjustmentFactor = 1 + (earnoutPct - 20) * 0.0025
    return highOffer * adjustmentFactor
  }, [highOffer, earnoutPct])

  const cashAmount = adjustedValue * (cashPct / 100)
  const earnoutAmount = adjustedValue * (earnoutPct / 100)

  const percentChange = (((1 + (earnoutPct - 20) * 0.0025) - 1) * 100).toFixed(1)

  const handleStrategyClick = (strategy: Strategy) => {
    setActiveStrategy(strategy)
    const s = strategies.find((x) => x.key === strategy)!
    setCashPct(s.cash)
  }

  const handleSliderChange = (value: number[]) => {
    const newCash = value[0]
    setCashPct(newCash)
    if (newCash === 100) setActiveStrategy("quick")
    else if (newCash === 85) setActiveStrategy("blend")
    else if (newCash === 70) setActiveStrategy("structured")
    else setActiveStrategy("blend")
  }

  const currentStrat = strategies.find((s) => s.key === activeStrategy)

  return (
    <div className="flex flex-col gap-4">
      {/* Adjusted valuation */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6 text-center">
          <p className="text-xs text-muted-foreground">Gross Valuation</p>
          <p className="text-2xl font-bold text-[hsl(var(--success))]">{formatCurrency(adjustedValue)}</p>
          {parseFloat(percentChange) > 0 && (
            <p className="text-xs text-[hsl(var(--success))]">(+{percentChange}% Potential Upside)</p>
          )}
          {parseFloat(percentChange) < 0 && (
            <p className="text-xs text-muted-foreground">({percentChange}% Liquidity Trade-off)</p>
          )}
        </CardContent>
      </Card>

      {/* Strategy buttons */}
      <div className="grid grid-cols-3 gap-2">
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

      {/* Explanation */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3">
          <p className="text-sm font-medium text-primary">{currentStrat?.label}</p>
          <p className="text-xs text-muted-foreground">{currentStrat?.description}</p>
        </CardContent>
      </Card>

      {/* Sliders */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Cash at Closing</span>
            <span className="text-xs font-semibold text-foreground">{cashPct}%</span>
          </div>
          <Slider value={[cashPct]} onValueChange={handleSliderChange} min={50} max={100} step={5} />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Earn-out Potential</span>
            <span className="text-xs font-semibold text-foreground">{earnoutPct}%</span>
          </div>
          <Slider value={[earnoutPct]} min={0} max={50} step={5} disabled className="opacity-60" />
        </div>
      </div>

      {/* Waterfall bar */}
      <div className="flex h-6 w-full overflow-hidden rounded-md">
        <div className="bg-[hsl(var(--success))] transition-all" style={{ width: `${cashPct}%` }} />
        <div className="bg-[hsl(var(--chart-5))] transition-all" style={{ width: `${earnoutPct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Cash: {formatCurrency(cashAmount)}</span>
        <span>Earnout: {formatCurrency(earnoutAmount)}</span>
      </div>
    </div>
  )
}
