"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from "lucide-react"
import type { ValuationResults } from "./valuation-engine"
import { formatCurrency } from "./valuation-engine"
import { InfoTip } from "@/components/ui/info-tip"

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
      {/* Offer Range */}
      <Card className="border-primary/30 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Estimated Value Range
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Low</span>
              <span className="text-xl font-bold text-success sm:text-2xl">
                {formatCurrency(results.lowOffer)}
              </span>
            </div>
            <span className="mb-1 text-lg text-muted-foreground">—</span>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">High</span>
              <span className="text-xl font-bold text-success sm:text-2xl">
                {formatCurrency(results.highOffer)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Grade + Multiple side by side */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${gradeColorBorder(riskAudit.grade)}`}>
              <span className={`text-xl font-bold ${riskAudit.gradeColor}`}>{riskAudit.grade}</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-foreground">Risk Grade</p>
            <p className="mt-0.5 text-center text-xs text-muted-foreground leading-tight">{riskAudit.summaryText}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-5">
            <span className="text-3xl font-bold text-primary">
              {results.calculatedMultiple.toFixed(2)}x
            </span>
            <div className="mt-2 flex items-center gap-0.5">
              <p className="text-xs font-semibold text-foreground">Final Multiple</p>
              <InfoTip text="The Final Multiple is applied to your SDE/EBITDA to produce the valuation range. It starts from a base of 2.0x–3.0x for independent agencies and is adjusted up or down based on 7 factors: retention rate, book composition (commercial vs. personal), client concentration, carrier diversification, revenue growth trend, operational health, and transition risk. Industry benchmark: 1.5x–3.5x for independent agencies." />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className={results.riskLevel.color}>{results.riskLevel.text}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Valuation Breakdown */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Valuation Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Primary metrics */}
          <div className="flex flex-col divide-y divide-border">
            <MetricRow
              label="Core Score"
              value={`${results.coreScore.toFixed(2)}x`}
              tip="Your weighted score across 7 risk categories before deal-structure adjustments are applied."
            />
            <MetricRow
              label="Transaction Multiplier"
              value={`${results.transactionMultiplier.toFixed(2)}x`}
              tip="Adjusts the core score based on deal type (full agency vs. book purchase), closing timeline, and seller transition length."
            />
            <MetricRow
              label="Final Multiple"
              value={<span className="font-bold text-primary">{results.calculatedMultiple.toFixed(2)}x</span>}
              tip="The Final Multiple is applied to your SDE/EBITDA to calculate the offer range. Higher retention, strong growth, and commercial-heavy books push this up."
            />
          </div>

          {/* Secondary metrics */}
          <div className="mt-4 rounded-md bg-secondary/40 px-3 py-3 flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Reference Ranges</p>
            <MetricRow label="Revenue Range" value={results.revenueRange} small />
            <MetricRow label="SDE Range" value={results.sdeRange} small />
            <MetricRow label="CAGR" value={isNaN(results.cagr) ? "---" : `${results.cagr.toFixed(2)}%`} small />
            <MetricRow label="Longevity Adj." value={results.longevityAdjustment} small />
          </div>
        </CardContent>
      </Card>

      {/* Completeness note */}
      {results.completenessNote && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Incomplete data.</span>{" "}
            {results.completenessNote}
          </p>
        </div>
      )}

      {/* Scroll hint */}
      <p className="text-center text-xs text-muted-foreground">
        Scroll down for the Deal Simulator and full Risk Audit report.
      </p>
    </div>
  )
}

function gradeColorBorder(grade: string) {
  switch (grade) {
    case "A": return "border-success"
    case "B": return "border-warning"
    case "C": return "border-warning"
    case "D": return "border-destructive"
    default: return "border-border"
  }
}

function MetricRow({ label, value, small, tip }: { label: string; value: React.ReactNode; small?: boolean; tip?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`${small ? "text-xs" : "text-sm"} text-muted-foreground flex items-center`}>
        {label}
        {tip && <InfoTip text={tip} />}
      </span>
      <span className={`${small ? "text-xs" : "text-sm"} font-medium text-foreground`}>{value}</span>
    </div>
  )
}
