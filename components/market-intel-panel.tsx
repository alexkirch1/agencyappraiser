"use client"

import { TrendingUp, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMarketIntel } from "@/lib/use-market-intel"

interface MarketIntelPanelProps {
  /** Pass the model's calculated multiple so we can compute the suggested adjustment */
  modelMultiple?: number
  /** Narrow by deal type */
  dealType?: "full" | "book"
  className?: string
}

export function MarketIntelPanel({ modelMultiple, dealType, className }: MarketIntelPanelProps) {
  const { intel, isLoading } = useMarketIntel(modelMultiple)

  if (isLoading) return null
  if (intel.sampleSize === 0) return null

  const relevantMedian =
    dealType === "full"
      ? intel.byType.full.medianMultiple
      : dealType === "book"
      ? intel.byType.book.medianMultiple
      : intel.medianMultiple

  const relevantCount =
    dealType === "full"
      ? intel.byType.full.count
      : dealType === "book"
      ? intel.byType.book.count
      : intel.sampleSize

  // Don't show if there's no relevant data for the selected type
  if (relevantCount === 0) return null

  const adj = intel.suggestedMultipleAdjustment

  return (
    <Card className={`border-primary/20 bg-primary/5 ${className ?? ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-primary">
          <TrendingUp className="h-4 w-4" />
          Market Intelligence — Based on {relevantCount} Closed Deal{relevantCount !== 1 ? "s" : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Key stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {relevantMedian != null && (
            <Stat label="Median Closed Multiple" value={`${relevantMedian.toFixed(2)}x`} />
          )}
          {intel.medianMultiple != null && relevantMedian !== intel.medianMultiple && (
            <Stat label="Overall Median Multiple" value={`${intel.medianMultiple.toFixed(2)}x`} />
          )}
          {intel.earnoutRate != null && intel.earnoutRate > 0 && (
            <Stat label="Deals with Earnout" value={`${Math.round(intel.earnoutRate * 100)}%`} />
          )}
          {intel.medianSellerStay != null && (
            <Stat label="Median Seller Stay" value={`${intel.medianSellerStay} mo`} />
          )}
          {intel.avgOfferToEstimate != null && (
            <Stat
              label="Avg Offer vs Estimate"
              value={`${Math.round(intel.avgOfferToEstimate * 100)}%`}
            />
          )}
        </div>

        {/* Suggested adjustment callout */}
        {modelMultiple != null && Math.abs(adj) > 0.04 && (
          <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-xs">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="text-foreground">
              Based on closed deals, market multiples are running{" "}
              <strong>{adj > 0 ? "+" : ""}{adj.toFixed(2)}x</strong> vs your model estimate.
              This is informational only — your model's inputs remain the primary driver.
            </span>
          </div>
        )}

        {/* Insight lines */}
        <ul className="space-y-1">
          {intel.insights.slice(0, 4).map((line, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              {line}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-bold text-foreground">{value}</p>
    </div>
  )
}
