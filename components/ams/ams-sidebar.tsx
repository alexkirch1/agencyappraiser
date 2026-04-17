"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react"
import type { AmsValuationResult } from "./ams-engine"
import { formatCurrency } from "./ams-engine"

interface Props {
  results: AmsValuationResult | null
}

export function AmsSidebar({ results }: Props) {
  if (!results) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No valuation yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload an EZLynx report or fill in the fields below to see your agency value.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { lowOffer, midOffer, highOffer, adjustedMultiple, revenueBasis, adjustments, dataCompleteness } = results

  return (
    <div className="flex flex-col gap-4">
      {/* Main value card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Estimated Agency Value
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Low</span>
              <span className="text-xl font-bold text-success sm:text-2xl">{formatCurrency(lowOffer)}</span>
            </div>
            <span className="mb-1 text-lg text-muted-foreground">—</span>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">High</span>
              <span className="text-xl font-bold text-success sm:text-2xl">{formatCurrency(highOffer)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Mid-Point</span>
              <span className="text-lg font-semibold text-foreground">{formatCurrency(midOffer)}</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Multiple</span>
              <span className="text-lg font-semibold text-foreground">{adjustedMultiple.toFixed(2)}x</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Revenue Basis</span>
              <span className="text-lg font-semibold text-foreground">{formatCurrency(revenueBasis)}</span>
            </div>
          </div>

          {/* Data completeness */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Data completeness</span>
              <span className="font-medium text-foreground">{dataCompleteness}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all ${
                  dataCompleteness >= 70 ? "bg-success" :
                  dataCompleteness >= 40 ? "bg-warning" :
                  "bg-destructive"
                }`}
                style={{ width: `${dataCompleteness}%` }}
              />
            </div>
            {dataCompleteness < 60 && (
              <p className="text-[11px] text-muted-foreground">
                Add more data for a more accurate valuation.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Adjustments */}
      {adjustments.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Multiple Adjustments
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex flex-col gap-2">
            {adjustments.map((adj) => (
              <div key={adj.label} className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {adj.direction === "up" && <TrendingUp className="h-3.5 w-3.5 shrink-0 text-success" />}
                  {adj.direction === "down" && <TrendingDown className="h-3.5 w-3.5 shrink-0 text-destructive" />}
                  {adj.direction === "neutral" && <Minus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  <span className="text-xs font-medium text-foreground truncate">{adj.label}</span>
                </div>
                <span className="text-[11px] text-muted-foreground text-right shrink-0">{adj.note}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        This estimate is based on the data provided and standard insurance agency M&A benchmarks.
        It does not constitute a formal appraisal or offer of purchase.
      </p>
    </div>
  )
}
