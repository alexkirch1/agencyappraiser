"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SmartInput } from "@/components/ui/smart-input"
import { Label } from "@/components/ui/label"
import type { AmsInputs } from "./ams-engine"

interface Props {
  inputs: AmsInputs
  onChange: (patch: Partial<AmsInputs>) => void
}

interface BenchmarkConfig {
  good: number
  poor: number
  direction: "lower-better" | "higher-better"
  goodLabel?: string
  poorLabel?: string
}

function BenchmarkBadge({ value, config }: { value: number | null; config: BenchmarkConfig }) {
  if (value === null || value === undefined) return null
  const { good, poor, direction } = config
  let tier: "good" | "caution" | "poor"
  if (direction === "lower-better") {
    tier = value <= good ? "good" : value >= poor ? "poor" : "caution"
  } else {
    tier = value >= good ? "good" : value <= poor ? "poor" : "caution"
  }
  const styles = {
    good:    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    caution: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    poor:    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
  }
  const labels = {
    good:    config.goodLabel ?? "Strong",
    caution: "Average",
    poor:    config.poorLabel ?? "Weak",
  }
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none ${styles[tier]}`}>
      {labels[tier]}
    </span>
  )
}

function Field({
  label,
  hint,
  children,
  badge,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        {badge}
      </div>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function AmsForm({ inputs, onChange }: Props) {
  const set = (key: keyof AmsInputs) => (val: number | null) => onChange({ [key]: val })

  return (
    <div className="flex flex-col gap-4">

      {/* Book Overview */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-foreground">Book Overview</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Total Policies in Force" hint="All active policies across all lines">
              <SmartInput
                type="integer"
                value={inputs.total_pif}
                onChange={set("total_pif")}
                placeholder="e.g. 1,200"
              />
            </Field>
            <Field label="Total Written Premium" hint="Gross annual written premium ($)">
              <SmartInput
                type="currency"
                value={inputs.total_premium}
                onChange={set("total_premium")}
                placeholder="e.g. $2,400,000"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Personal Lines %"
              hint="% of total premium that is personal lines"
              badge={
                <BenchmarkBadge
                  value={inputs.personal_lines_pct}
                  config={{ good: 40, poor: 80, direction: "lower-better", goodLabel: "CL-Heavy", poorLabel: "PL-Heavy" }}
                />
              }
            >
              <SmartInput
                type="percent"
                value={inputs.personal_lines_pct}
                onChange={set("personal_lines_pct")}
                placeholder="e.g. 65%"
              />
            </Field>
            <Field
              label="Commercial Lines %"
              hint="% of total premium that is commercial lines"
              badge={
                <BenchmarkBadge
                  value={inputs.commercial_lines_pct}
                  config={{ good: 60, poor: 20, direction: "higher-better", goodLabel: "Premium", poorLabel: "Low" }}
                />
              }
            >
              <SmartInput
                type="percent"
                value={inputs.commercial_lines_pct}
                onChange={set("commercial_lines_pct")}
                placeholder="e.g. 35%"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Retention */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-foreground">Retention</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label="Overall Retention"
              badge={
                <BenchmarkBadge
                  value={inputs.overall_retention}
                  config={{ good: 90, poor: 75, direction: "higher-better", goodLabel: "Excellent", poorLabel: "Poor" }}
                />
              }
            >
              <SmartInput
                type="percent"
                value={inputs.overall_retention}
                onChange={set("overall_retention")}
                placeholder="e.g. 88%"
              />
            </Field>
            <Field
              label="Personal Lines Retention"
              badge={
                <BenchmarkBadge
                  value={inputs.pl_retention}
                  config={{ good: 88, poor: 75, direction: "higher-better" }}
                />
              }
            >
              <SmartInput
                type="percent"
                value={inputs.pl_retention}
                onChange={set("pl_retention")}
                placeholder="e.g. 87%"
              />
            </Field>
            <Field
              label="Commercial Lines Retention"
              badge={
                <BenchmarkBadge
                  value={inputs.cl_retention}
                  config={{ good: 90, poor: 78, direction: "higher-better" }}
                />
              }
            >
              <SmartInput
                type="percent"
                value={inputs.cl_retention}
                onChange={set("cl_retention")}
                placeholder="e.g. 91%"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* New Business */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-foreground">New Business</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="New Business Premium" hint="Annual new business written premium ($)">
              <SmartInput
                type="currency"
                value={inputs.new_business_premium}
                onChange={set("new_business_premium")}
                placeholder="e.g. $320,000"
              />
            </Field>
            <Field label="New Business Policies" hint="Count of new policies written in period">
              <SmartInput
                type="integer"
                value={inputs.new_business_policies}
                onChange={set("new_business_policies")}
                placeholder="e.g. 145"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Loss Ratios */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-foreground">Loss Ratios</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label="Overall Loss Ratio"
              badge={
                <BenchmarkBadge
                  value={inputs.overall_loss_ratio}
                  config={{ good: 55, poor: 80, direction: "lower-better", goodLabel: "Excellent", poorLabel: "Elevated" }}
                />
              }
            >
              <SmartInput
                type="percent"
                value={inputs.overall_loss_ratio}
                onChange={set("overall_loss_ratio")}
                placeholder="e.g. 62%"
              />
            </Field>
            <Field
              label="PL Loss Ratio"
              badge={
                <BenchmarkBadge
                  value={inputs.pl_loss_ratio}
                  config={{ good: 60, poor: 85, direction: "lower-better" }}
                />
              }
            >
              <SmartInput
                type="percent"
                value={inputs.pl_loss_ratio}
                onChange={set("pl_loss_ratio")}
                placeholder="e.g. 68%"
              />
            </Field>
            <Field
              label="CL Loss Ratio"
              badge={
                <BenchmarkBadge
                  value={inputs.cl_loss_ratio}
                  config={{ good: 55, poor: 78, direction: "lower-better" }}
                />
              }
            >
              <SmartInput
                type="percent"
                value={inputs.cl_loss_ratio}
                onChange={set("cl_loss_ratio")}
                placeholder="e.g. 54%"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Revenue */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-foreground">Agency Revenue</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Revenue — Last 12 Months" hint="Total agency commissions / fees earned (LTM)">
              <SmartInput
                type="currency"
                value={inputs.revenue_ltm}
                onChange={set("revenue_ltm")}
                placeholder="e.g. $480,000"
              />
            </Field>
            <Field label="Revenue — Prior Year" hint="Prior year revenue for growth calculation">
              <SmartInput
                type="currency"
                value={inputs.revenue_prior_year}
                onChange={set("revenue_prior_year")}
                placeholder="e.g. $430,000"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Agency Profile */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-foreground">Agency Profile</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Producers / CSRs" hint="Total number of revenue-generating staff">
              <SmartInput
                type="integer"
                value={inputs.producer_count}
                onChange={set("producer_count")}
                placeholder="e.g. 4"
              />
            </Field>
            <Field label="Years in Business" hint="How long the agency has been operating">
              <SmartInput
                type="integer"
                value={inputs.years_in_business}
                onChange={set("years_in_business")}
                placeholder="e.g. 18"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
