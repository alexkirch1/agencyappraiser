"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SmartInput } from "@/components/ui/smart-input"
import { Label } from "@/components/ui/label"
import type { AmsInputs } from "./ams-engine"

interface Props {
  inputs: AmsInputs
  onChange: (patch: Partial<AmsInputs>) => void
}

function BenchmarkBadge({
  value,
  config,
}: {
  value: number | null
  config: { good: number; poor: number; direction: "lower-better" | "higher-better"; goodLabel?: string; poorLabel?: string }
}) {
  if (value === null || value === undefined) return null
  const { good, poor, direction } = config
  let tier: "good" | "caution" | "poor"
  if (direction === "lower-better") {
    tier = value <= good ? "good" : value >= poor ? "poor" : "caution"
  } else {
    tier = value >= good ? "good" : value <= poor ? "poor" : "caution"
  }
  const styles = {
    good:    "bg-success/10 text-success border-success/30",
    caution: "bg-warning/10 text-warning border-warning/30",
    poor:    "bg-destructive/10 text-destructive border-destructive/30",
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
      {hint && <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  )
}

export function AmsForm({ inputs, onChange }: Props) {
  const set = (key: keyof AmsInputs) => (val: number | null) => onChange({ [key]: val })

  return (
    <div className="flex flex-col gap-4">

      {/* Book Overview */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-foreground">Book Overview</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Total Policies in Force" hint="All active policies across all lines">
              <SmartInput
                inputType="count"
                value={inputs.total_pif}
                onValueChange={set("total_pif")}
                placeholder="e.g. 1,200"
              />
            </Field>
            <Field label="Total Written Premium" hint="Gross annual written premium">
              <SmartInput
                inputType="currency"
                value={inputs.total_premium}
                onValueChange={set("total_premium")}
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
                inputType="percent"
                value={inputs.personal_lines_pct}
                onValueChange={set("personal_lines_pct")}
                placeholder="e.g. 65"
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
                inputType="percent"
                value={inputs.commercial_lines_pct}
                onValueChange={set("commercial_lines_pct")}
                placeholder="e.g. 35"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Retention */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-foreground">Retention</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label="Overall Retention Rate"
              badge={
                <BenchmarkBadge
                  value={inputs.overall_retention}
                  config={{ good: 90, poor: 75, direction: "higher-better", goodLabel: "Excellent", poorLabel: "Poor" }}
                />
              }
            >
              <SmartInput
                inputType="percent"
                value={inputs.overall_retention}
                onValueChange={set("overall_retention")}
                placeholder="e.g. 88"
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
                inputType="percent"
                value={inputs.pl_retention}
                onValueChange={set("pl_retention")}
                placeholder="e.g. 87"
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
                inputType="percent"
                value={inputs.cl_retention}
                onValueChange={set("cl_retention")}
                placeholder="e.g. 91"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* New Business */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-foreground">New Business</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="New Business Premium" hint="Annual new business written premium">
              <SmartInput
                inputType="currency"
                value={inputs.new_business_premium}
                onValueChange={set("new_business_premium")}
                placeholder="e.g. $320,000"
              />
            </Field>
            <Field label="New Policies Written" hint="Count of new policies written in period">
              <SmartInput
                inputType="count"
                value={inputs.new_business_policies}
                onValueChange={set("new_business_policies")}
                placeholder="e.g. 145"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Loss Ratios */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2 pt-4 px-4">
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
                inputType="percent"
                value={inputs.overall_loss_ratio}
                onValueChange={set("overall_loss_ratio")}
                placeholder="e.g. 62"
              />
            </Field>
            <Field
              label="Personal Lines Loss Ratio"
              badge={
                <BenchmarkBadge
                  value={inputs.pl_loss_ratio}
                  config={{ good: 60, poor: 85, direction: "lower-better" }}
                />
              }
            >
              <SmartInput
                inputType="percent"
                value={inputs.pl_loss_ratio}
                onValueChange={set("pl_loss_ratio")}
                placeholder="e.g. 68"
              />
            </Field>
            <Field
              label="Commercial Lines Loss Ratio"
              badge={
                <BenchmarkBadge
                  value={inputs.cl_loss_ratio}
                  config={{ good: 55, poor: 78, direction: "lower-better" }}
                />
              }
            >
              <SmartInput
                inputType="percent"
                value={inputs.cl_loss_ratio}
                onValueChange={set("cl_loss_ratio")}
                placeholder="e.g. 54"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Agency Revenue */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-foreground">Agency Revenue</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Revenue — Last 12 Months" hint="Total commissions and fees earned (LTM)">
              <SmartInput
                inputType="currency"
                value={inputs.revenue_ltm}
                onValueChange={set("revenue_ltm")}
                placeholder="e.g. $480,000"
              />
            </Field>
            <Field label="Revenue — Prior Year" hint="Prior year revenue for growth calculation">
              <SmartInput
                inputType="currency"
                value={inputs.revenue_prior_year}
                onValueChange={set("revenue_prior_year")}
                placeholder="e.g. $430,000"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Agency Profile */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-foreground">Agency Profile</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Producers / CSRs" hint="Total number of revenue-generating staff">
              <SmartInput
                inputType="count"
                value={inputs.producer_count}
                onValueChange={set("producer_count")}
                placeholder="e.g. 4"
              />
            </Field>
            <Field label="Years in Business">
              <SmartInput
                inputType="count"
                value={inputs.years_in_business}
                onValueChange={set("years_in_business")}
                placeholder="e.g. 18"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
