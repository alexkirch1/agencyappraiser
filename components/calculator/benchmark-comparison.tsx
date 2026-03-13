"use client"

import { TrendingUp, TrendingDown, Minus, Award } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ValuationInputs } from "./valuation-engine"

interface BenchmarkComparisonProps {
  inputs: ValuationInputs
  className?: string
}

// Industry benchmarks based on market data
const BENCHMARKS = {
  retention: { excellent: 92, good: 88, average: 85, poor: 80 },
  lossRatio: { excellent: 45, good: 55, average: 62, poor: 70 },
  avgPremium: { excellent: 2500, good: 1800, average: 1400, poor: 900 },
  policiesPerCustomer: { excellent: 2.0, good: 1.7, average: 1.5, poor: 1.2 },
  clientConcentration: { excellent: 10, good: 20, average: 30, poor: 45 },
  commercialMix: { excellent: 60, good: 40, average: 25, poor: 10 },
}

function getPercentile(value: number, benchmarks: { excellent: number; good: number; average: number; poor: number }, higherIsBetter: boolean = true): { percentile: number; label: string; color: string } {
  if (higherIsBetter) {
    if (value >= benchmarks.excellent) return { percentile: 95, label: "Top 5%", color: "text-green-600" }
    if (value >= benchmarks.good) return { percentile: 75, label: "Top 25%", color: "text-green-500" }
    if (value >= benchmarks.average) return { percentile: 50, label: "Average", color: "text-yellow-600" }
    if (value >= benchmarks.poor) return { percentile: 25, label: "Below Average", color: "text-orange-500" }
    return { percentile: 10, label: "Bottom 10%", color: "text-red-500" }
  } else {
    // Lower is better (e.g., loss ratio, concentration)
    if (value <= benchmarks.excellent) return { percentile: 95, label: "Top 5%", color: "text-green-600" }
    if (value <= benchmarks.good) return { percentile: 75, label: "Top 25%", color: "text-green-500" }
    if (value <= benchmarks.average) return { percentile: 50, label: "Average", color: "text-yellow-600" }
    if (value <= benchmarks.poor) return { percentile: 25, label: "Below Average", color: "text-orange-500" }
    return { percentile: 10, label: "Bottom 10%", color: "text-red-500" }
  }
}

function MetricBar({ label, value, unit, benchmark, higherIsBetter = true }: { 
  label: string
  value: number | null
  unit: string
  benchmark: { excellent: number; good: number; average: number; poor: number }
  higherIsBetter?: boolean
}) {
  if (value === null) return null
  
  const result = getPercentile(value, benchmark, higherIsBetter)
  const Icon = result.percentile >= 75 ? TrendingUp : result.percentile <= 25 ? TrendingDown : Minus
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-foreground">
            {unit === "$" ? `$${value.toLocaleString()}` : `${value}${unit}`}
          </span>
          <span className={`flex items-center gap-1 text-xs font-medium ${result.color}`}>
            <Icon className="h-3 w-3" />
            {result.label}
          </span>
        </div>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div 
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
          style={{ width: "100%" }}
        />
        <div 
          className="absolute top-0 h-full w-1 bg-foreground shadow-sm"
          style={{ left: `${Math.min(result.percentile, 100)}%`, transform: "translateX(-50%)" }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Poor</span>
        <span>Average</span>
        <span>Excellent</span>
      </div>
    </div>
  )
}

export function BenchmarkComparison({ inputs, className }: BenchmarkComparisonProps) {
  // Calculate policies per customer if we have the data
  const policiesPerCx = inputs.activeCustomers && inputs.activePolicies && inputs.activeCustomers > 0
    ? inputs.activePolicies / inputs.activeCustomers
    : null

  // Calculate avg premium if we have the data
  const avgPrem = inputs.avgPremiumPerPolicy ?? 
    (inputs.totalWrittenPremium && inputs.activePolicies && inputs.activePolicies > 0 
      ? inputs.totalWrittenPremium / inputs.activePolicies 
      : null)

  // Count how many metrics we have data for
  const metrics = [
    inputs.retentionRate,
    inputs.lossRatio,
    avgPrem,
    policiesPerCx,
    inputs.clientConcentration,
    inputs.policyMix,
  ].filter(v => v !== null)

  if (metrics.length < 2) return null

  // Calculate overall score
  const scores: number[] = []
  if (inputs.retentionRate) scores.push(getPercentile(inputs.retentionRate, BENCHMARKS.retention).percentile)
  if (inputs.lossRatio) scores.push(getPercentile(inputs.lossRatio, BENCHMARKS.lossRatio, false).percentile)
  if (avgPrem) scores.push(getPercentile(avgPrem, BENCHMARKS.avgPremium).percentile)
  if (policiesPerCx) scores.push(getPercentile(policiesPerCx, BENCHMARKS.policiesPerCustomer).percentile)
  if (inputs.clientConcentration) scores.push(getPercentile(inputs.clientConcentration, BENCHMARKS.clientConcentration, false).percentile)
  if (inputs.policyMix) scores.push(getPercentile(inputs.policyMix, BENCHMARKS.commercialMix).percentile)

  const overallPercentile = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  return (
    <Card className={`border-border bg-card ${className ?? ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Award className="h-5 w-5 text-primary" />
            How You Compare
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Overall:</span>
            <span className={`text-sm font-bold ${
              overallPercentile >= 75 ? "text-green-600" : 
              overallPercentile >= 50 ? "text-yellow-600" : 
              "text-orange-500"
            }`}>
              Top {100 - overallPercentile}% of agencies
            </span>
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          See how your agency metrics compare to industry benchmarks based on market data.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <MetricBar 
          label="Client Retention Rate"
          value={inputs.retentionRate}
          unit="%"
          benchmark={BENCHMARKS.retention}
          higherIsBetter={true}
        />
        <MetricBar 
          label="Loss Ratio"
          value={inputs.lossRatio}
          unit="%"
          benchmark={BENCHMARKS.lossRatio}
          higherIsBetter={false}
        />
        <MetricBar 
          label="Avg Premium Per Policy"
          value={avgPrem ? Math.round(avgPrem) : null}
          unit="$"
          benchmark={BENCHMARKS.avgPremium}
          higherIsBetter={true}
        />
        <MetricBar 
          label="Policies Per Customer"
          value={policiesPerCx ? parseFloat(policiesPerCx.toFixed(2)) : null}
          unit=""
          benchmark={BENCHMARKS.policiesPerCustomer}
          higherIsBetter={true}
        />
        <MetricBar 
          label="Client Concentration (Top 10)"
          value={inputs.clientConcentration}
          unit="%"
          benchmark={BENCHMARKS.clientConcentration}
          higherIsBetter={false}
        />
        <MetricBar 
          label="Commercial Lines Mix"
          value={inputs.policyMix}
          unit="%"
          benchmark={BENCHMARKS.commercialMix}
          higherIsBetter={true}
        />
      </CardContent>
    </Card>
  )
}
