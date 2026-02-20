"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ValuationResults } from "./valuation-engine"
import { formatCurrency } from "./valuation-engine"

interface Props {
  results: ValuationResults | null
  riskAudit: { grade: string; gradeColor: string; summaryText: string }
}

export function ValuationSidebar({ results, riskAudit }: Props) {
  if (!results) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <span className="text-2xl text-muted-foreground">$</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground">Enter Your Data</h3>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Fill in your agency details on the left, then click Submit to see your valuation.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Offer Display */}
      <Card className="border-primary/30 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Value Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[hsl(var(--success))]">
              {formatCurrency(results.lowOffer)}
            </span>
            <span className="text-muted-foreground">-</span>
            <span className="text-2xl font-bold text-[hsl(var(--success))]">
              {formatCurrency(results.highOffer)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Card */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Valuation Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <MetricRow label="Risk Level" value={<span className={results.riskLevel.color}>{results.riskLevel.text}</span>} />
          <MetricRow label="Core Score" value={`${results.coreScore.toFixed(2)}x`} />
          <MetricRow label="Transaction Multiplier" value={`${results.transactionMultiplier.toFixed(2)}x`} />
          <MetricRow label="Final Multiple" value={<span className="font-bold text-primary">{results.calculatedMultiple.toFixed(2)}x</span>} />
          <div className="my-2 border-t border-border" />
          <MetricRow label="Revenue Range (0.75x-3.0x)" value={results.revenueRange} small />
          <MetricRow label="SDE Range (5x-9x)" value={results.sdeRange} small />
          <MetricRow label="CAGR" value={isNaN(results.cagr) ? "---" : `${results.cagr.toFixed(2)}%`} small />
          <MetricRow label="Longevity Adj." value={results.longevityAdjustment} small />
        </CardContent>
      </Card>

      {/* Risk Grade Badge */}
      <Card className="border-border bg-card">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${gradeColorBorder(riskAudit.grade)}`}>
            <span className={`text-2xl font-bold ${riskAudit.gradeColor}`}>{riskAudit.grade}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Risk Grade</p>
            <p className="text-xs text-muted-foreground">{riskAudit.summaryText}</p>
          </div>
        </CardContent>
      </Card>

      {/* Scroll hint */}
      <p className="text-center text-xs text-muted-foreground">
        Scroll down for the Deal Simulator and full Risk Audit report.
      </p>
    </div>
  )
}

function gradeColorBorder(grade: string) {
  switch (grade) {
    case "A": return "border-[hsl(var(--success))]"
    case "B": return "border-[hsl(var(--warning))]"
    case "C": return "border-[hsl(var(--warning))]"
    case "D": return "border-destructive"
    default: return "border-border"
  }
}

function MetricRow({ label, value, small }: { label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${small ? "text-xs" : "text-sm"} text-muted-foreground`}>{label}</span>
      <span className={`${small ? "text-xs" : "text-sm"} font-medium text-foreground`}>{value}</span>
    </div>
  )
}
