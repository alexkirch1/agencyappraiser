"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ValuationResults, RiskAuditResult } from "./valuation-engine"
import { formatCurrency } from "./valuation-engine"
import { DealSimulator } from "./deal-simulator"
import { RiskAudit } from "./risk-audit"

interface Props {
  results: ValuationResults | null
  riskAudit: RiskAuditResult
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
            Fill in your agency details on the left to see your real-time valuation estimate.
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

      {/* Tabs */}
      <Tabs defaultValue="valuation" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="valuation">Valuation</TabsTrigger>
          <TabsTrigger value="deal">Deal Sim</TabsTrigger>
          <TabsTrigger value="risk">Risk Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="valuation" className="mt-4">
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col gap-3 pt-6">
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
        </TabsContent>

        <TabsContent value="deal" className="mt-4">
          <DealSimulator highOffer={results.highOffer} coreScore={results.coreScore} />
        </TabsContent>

        <TabsContent value="risk" className="mt-4">
          <RiskAudit data={riskAudit} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MetricRow({ label, value, small }: { label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${small ? "text-xs" : "text-sm"} text-muted-foreground`}>{label}</span>
      <span className={`${small ? "text-xs" : "text-sm"} font-medium text-foreground`}>{value}</span>
    </div>
  )
}
