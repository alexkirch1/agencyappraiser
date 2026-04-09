"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SmartInput } from "@/components/ui/smart-input"
import type { SmartInputType } from "@/components/ui/smart-input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { ReportUpload } from "./report-upload"
import { CommissionUpload } from "./commission-upload"
import { defaultCarrierInputs } from "./carrier-engine"
import type { CarrierInputs, CarrierName, BookType } from "./carrier-engine"

// ─── Benchmark badge ──────────────────────────────────────────────────────────
// Thresholds: { good: value is >= or <= good threshold, caution: middle, poor: bad end }
// direction: "lower-better" (loss ratio) | "higher-better" (retention, premium)

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
    good:    config.goodLabel  ?? "Good",
    caution: "Caution",
    poor:    config.poorLabel  ?? "Poor",
  }
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none ${styles[tier]}`}>
      {labels[tier]}
    </span>
  )
}

// ─── Completeness bar ─────────────────────────────────────────────────────────

function countFilledFields(inputs: CarrierInputs): { filled: number; total: number } {
  const carrier = inputs.carrier
  const bt = inputs.bookType
  const fields: (number | boolean | null | undefined)[] = []

  if (carrier === "progressive") {
    const pl = bt === "personal" || bt === "both"
    const cl = bt === "commercial" || bt === "both"
    if (pl) fields.push(inputs.prog_pl_premium, inputs.prog_pl_pif, inputs.prog_pl_loss_ratio)
    if (cl) fields.push(inputs.prog_cl_premium, inputs.prog_cl_pif, inputs.prog_cl_loss_ratio)
    fields.push(inputs.prog_bundle_rate, inputs.prog_ytd_apps)
  } else if (carrier === "travelers") {
    const sa = bt === "auto" || bt === "both"
    const sh = bt === "home" || bt === "both"
    if (sa) fields.push(inputs.travelers_auto_wp, inputs.travelers_auto_pif, inputs.travelers_auto_lr, inputs.travelers_auto_retention)
    if (sh) fields.push(inputs.travelers_home_wp, inputs.travelers_home_pif, inputs.travelers_home_lr, inputs.travelers_home_retention)
  } else if (carrier === "hartford") {
    const pl = bt === "personal" || bt === "both"
    const cl = bt === "commercial" || bt === "both"
    if (pl) fields.push(inputs.hartford_pl_auto_twp, inputs.hartford_pl_auto_pif, inputs.hartford_pl_auto_lr, inputs.hartford_pl_auto_retention,
                        inputs.hartford_pl_home_twp, inputs.hartford_pl_home_pif, inputs.hartford_pl_home_lr, inputs.hartford_pl_home_retention)
    if (cl) fields.push(inputs.hartford_cl_twp, inputs.hartford_cl_lr, inputs.hartford_cl_retention)
  } else if (carrier === "safeco") {
    const sa = bt === "auto" || bt === "both"
    const sh = bt === "home" || bt === "both"
    if (sa) fields.push(inputs.safeco_auto_dwp, inputs.safeco_auto_pif, inputs.safeco_auto_lr, inputs.safeco_auto_retention)
    if (sh) fields.push(inputs.safeco_home_dwp, inputs.safeco_home_pif, inputs.safeco_home_lr, inputs.safeco_home_retention)
    if (bt === "both") fields.push(inputs.safeco_other_dwp, inputs.safeco_cross_sell_pct, inputs.safeco_right_track_pct)
    fields.push(inputs.safeco_nb_dwp)
  } else if (carrier === "berkshire") {
    fields.push(inputs.bh_written_premium_r12, inputs.bh_new_policies_ytd, inputs.bh_renewal_policies_ytd,
                inputs.bh_hit_ratio_renewal, inputs.bh_hit_ratio_new, inputs.bh_grand_total_loss_ratio)
  } else if (carrier === "libertymutual") {
    fields.push(inputs.lm_dwp_r12, inputs.lm_pif, inputs.lm_nb_dwp_ytd, inputs.lm_loss_ratio_ytd,
                inputs.lm_loss_ratio_2yr, inputs.lm_premium_retention)
  }

  const total  = fields.length
  const filled = fields.filter(f => f !== null && f !== undefined && f !== "").length
  return { filled, total }
}

function CompletenessBar({ inputs }: { inputs: CarrierInputs }) {
  const { filled, total } = countFilledFields(inputs)
  if (total === 0) return null
  const pct = Math.round((filled / total) * 100)
  const color = pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-muted-foreground/40"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{filled}/{total} fields</span>
    </div>
  )
}

interface Props {
  inputs: CarrierInputs
  onChange: (inputs: CarrierInputs) => void
}

const carriers: { value: CarrierName; label: string; description: string }[] = [
  {
    value: "travelers",
    label: "Travelers",
    description: "Auto & Homeowners personal lines",
  },
  {
    value: "progressive",
    label: "Progressive",
    description: "Personal and commercial auto & specialty",
  },
  {
    value: "hartford",
    label: "The Hartford",
    description: "Personal Lines, Small Commercial & specialty",
  },
  {
    value: "safeco",
    label: "Safeco",
    description: "Auto, Home, Condo, Renters, Umbrella & Landlord",
  },
  {
    value: "libertymutual",
    label: "Liberty Mutual CL",
    description: "Commercial Lines — BOP, WC, GL & Auto",
  },
  {
    value: "employers",
    label: "Employers",
    description: "Workers Compensation — Agency Summary Report",
  },
]

const comingSoonCarriers: string[] = [
  "Homeowners of America",
  "Johnson & Johnson",
  "Kemper Infinity",
  "Kemper Personal",
  "Kemper Specialty",
  "Lemonade",

  "Local Edge",
  "Markel",
  "Mendota",
  "Mercury",
  "Mile Auto",
  "National General (P&C)",
  "Nationwide",
  "Neptune Flood",
  "Open Road",
  "Openly",
  "Orchid",
  "PIE (CL)",
  "Personal Umbrella",
  "Pinnacol Assurance",
  "Reinsurepro",
  "The General",
  "Tower Hill",
  "Trexis",
]

export function CarrierForm({ inputs, onChange }: Props) {
  const update = (partial: Partial<CarrierInputs>) => {
    onChange({ ...inputs, ...partial })
  }

  const resetAndSetCarrier = (v: CarrierName) => {
    onChange({ ...defaultCarrierInputs, ...defaultFieldReset, carrier: v, bookType: "" })
  }

  const carrier  = inputs.carrier
  const bookType = inputs.bookType
  const bookTypeOptions = getBookTypeOptions(carrier)
  const showMetrics = carrier && bookType

  const stepOffset = 2  // step 1 = carrier, step 2 = book type, step 3 = metrics

  return (
    <div className="flex flex-col gap-6">

      {/* Step 1 — Carrier Selection */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">1. Select Carrier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {carriers.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => resetAndSetCarrier(c.value)}
                className={`flex flex-col items-start rounded-lg border p-4 text-left transition-colors ${
                  carrier === c.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border bg-background hover:border-muted-foreground/40 hover:bg-secondary/30"
                }`}
              >
                <span className="font-semibold text-foreground">{c.label}</span>
                <span className="mt-0.5 text-xs text-muted-foreground">{c.description}</span>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Coming Soon
            </p>
            <div className="flex flex-wrap gap-2">
              {comingSoonCarriers.map((name) => (
                <span
                  key={name}
                  className="inline-flex cursor-default items-center rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Report */}
      {carrier && (
        <ReportUpload
          carrier={carrier}
          onParsed={(parsed) => onChange({ ...inputs, ...parsed })}
        />
      )}

      {/* Step 2 — Book Type */}
      {carrier && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">2. Book Type</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={bookType}
              onValueChange={(v) => update({ bookType: v as BookType })}
              className="flex flex-wrap gap-2"
            >
              {bookTypeOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5"
                >
                  <RadioGroupItem value={opt.value} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Metrics */}
      {showMetrics && (
        <>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground">
                  {stepOffset + 1}. Carrier Metrics
                </CardTitle>
                <CompletenessBar inputs={inputs} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {carrier === "progressive" && (
                <ProgressiveFields inputs={inputs} update={update} bookType={bookType as BookType} />
              )}
              {carrier === "travelers" && (
                <TravelersFields inputs={inputs} update={update} bookType={bookType as BookType} />
              )}
              {carrier === "hartford" && (
                <HartfordFields inputs={inputs} update={update} bookType={bookType as BookType} />
              )}
              {carrier === "safeco" && (
                <SafecoFields inputs={inputs} update={update} bookType={bookType as BookType} />
              )}
              {carrier === "berkshire" && (
                <BerkshireFields inputs={inputs} update={update} />
              )}
              {carrier === "libertymutual" && (
                <LibertyMutualFields inputs={inputs} update={update} />
              )}
              {carrier === "employers" && (
                <EmployersFields inputs={inputs} update={update} />
              )}
            </CardContent>
          </Card>

          {/* Book Quality — sourced from commission statements & active policy list */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  {stepOffset + 2}. Book Quality <span className="text-xs font-normal text-muted-foreground ml-1">(optional — EZLynx Book of Business Detail CSV)</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <CommissionUpload
                onParsed={(fields) => update(fields)}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumField
                  label="Preferred / Standard Book (%)"
                  value={inputs.book_preferred_pct}
                  onChange={(v) => update({ book_preferred_pct: v })}
                  placeholder="e.g. 75"
                  type="percent"
                  hint="% of policies in preferred or standard tier (vs non-standard/high-risk)"
                  benchmark={{ good: 80, poor: 45, direction: "higher-better", goodLabel: "Strong", poorLabel: "Weak" }}
                />
                <NumField
                  label="Policies per Customer"
                  value={inputs.book_policies_per_customer}
                  onChange={(v) => update({ book_policies_per_customer: v })}
                  placeholder="e.g. 1.8"
                  type="number"
                  hint="Total policies ÷ total customers — higher means stronger multi-line"
                  benchmark={{ good: 2.2, poor: 1.3, direction: "higher-better", goodLabel: "Multi-line", poorLabel: "Thin" }}
                />
                <NumField
                  label="Avg Premium per Policy ($)"
                  value={inputs.book_avg_premium_per_policy}
                  onChange={(v) => update({ book_avg_premium_per_policy: v })}
                  placeholder="e.g. 1,100"
                  type="currency"
                  hint="Total written premium ÷ total policies in force"
                  benchmark={{ good: 1500, poor: 500, direction: "higher-better", goodLabel: "High Value", poorLabel: "Low" }}
                />
                <NumField
                  label="New Business % (last 12 mo)"
                  value={inputs.book_new_business_pct}
                  onChange={(v) => update({ book_new_business_pct: v })}
                  placeholder="e.g. 18"
                  type="percent"
                  hint="New policies written in past 12 months ÷ total PIF — from Book of Business Detail Report"
                  benchmark={{ good: 10, poor: 30, direction: "lower-better", goodLabel: "Stable", poorLabel: "High Churn" }}
                />
                <NumField
                  label="Monoline Customers (%)"
                  value={inputs.book_monoline_pct}
                  onChange={(v) => update({ book_monoline_pct: v })}
                  placeholder="e.g. 45"
                  type="percent"
                  hint="% of customers with only one policy — lower is better (multi-line = stickier)"
                  benchmark={{ good: 30, poor: 65, direction: "lower-better", goodLabel: "Multi-line", poorLabel: "High Risk" }}
                />
                <NumField
                  label="Paperless / e-Docs (%)"
                  value={inputs.book_digital_docs_pct}
                  onChange={(v) => update({ book_digital_docs_pct: v })}
                  placeholder="e.g. 60"
                  type="percent"
                  hint="% of customers enrolled in paperless — higher engagement = lower lapse rate"
                  benchmark={{ good: 70, poor: 35, direction: "higher-better", goodLabel: "Strong", poorLabel: "Low" }}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------
const defaultFieldReset: Partial<CarrierInputs> = {
  prog_pl_premium: null, prog_pl_pif: null, prog_pl_loss_ratio: null,
  prog_cl_premium: null, prog_cl_pif: null, prog_cl_loss_ratio: null,
  prog_bundle_rate: null, prog_ytd_apps: null, prog_diamond_status: false,
  travelers_auto_wp: null, travelers_auto_lr: null, travelers_auto_retention: null, travelers_auto_pif: null,
  travelers_home_wp: null, travelers_home_lr: null, travelers_home_retention: null, travelers_home_pif: null,
  hartford_pl_auto_twp: null, hartford_pl_auto_pif: null, hartford_pl_auto_lr: null, hartford_pl_auto_retention: null,
  hartford_pl_home_twp: null, hartford_pl_home_pif: null, hartford_pl_home_lr: null, hartford_pl_home_retention: null,
  hartford_cl_twp: null, hartford_cl_lr: null, hartford_cl_retention: null,
  safeco_auto_dwp: null, safeco_auto_pif: null, safeco_auto_lr: null, safeco_auto_retention: null,
  safeco_home_dwp: null, safeco_home_pif: null, safeco_home_lr: null, safeco_home_retention: null,
  safeco_other_dwp: null, safeco_other_lr: null, safeco_other_retention: null,
  safeco_cross_sell_pct: null, safeco_right_track_pct: null, safeco_nb_dwp: null, safeco_gold_service: false,
  bh_written_premium_r12: null, bh_written_premium_ytd: null,
  bh_new_policies_ytd: null, bh_renewal_policies_ytd: null,
  bh_hit_ratio_renewal: null, bh_hit_ratio_new: null, bh_yield_ratio_total: null,
  bh_loss_ratio_1983_2020: null, bh_loss_ratio_2022: null, bh_loss_ratio_2023: null,
  bh_loss_ratio_2024: null, bh_loss_ratio_2025: null, bh_loss_ratio_ytd: null,
  bh_grand_total_loss_ratio: null, bh_annual_goal: null,
  lm_dwp_ytd: null, lm_dwp_pytd: null, lm_dwp_r12: null, lm_nb_dwp_ytd: null, lm_pif: null,
  lm_loss_ratio_ytd: null, lm_loss_ratio_2yr: null,
  lm_premium_retention: null, lm_plif_renewal: null,
  emp_written_premium: null, emp_earned_premium_ytd: null, emp_policy_count: null, emp_loss_ratio: null,
  book_preferred_pct: null, book_policies_per_customer: null, book_avg_premium_per_policy: null,
  book_new_business_pct: null, book_monoline_pct: null, book_digital_docs_pct: null,
}

function getBookTypeOptions(carrier: string) {
  if (carrier === "travelers") {
    return [
      { value: "auto",     label: "Auto" },
      { value: "home",     label: "Homeowners" },
      { value: "both",     label: "Both" },
    ]
  }
  if (carrier === "hartford") {
    return [
      { value: "personal",    label: "Personal Lines" },
      { value: "commercial",  label: "Small Commercial" },
      { value: "both",        label: "Both" },
    ]
  }
  if (carrier === "safeco") {
    return [
      { value: "auto",  label: "Auto Only" },
      { value: "home",  label: "Home Only" },
      { value: "both",  label: "Auto + Home + Other" },
    ]
  }
  if (carrier === "berkshire") {
    return [
      { value: "commercial", label: "Commercial Lines" },
    ]
  }
  if (carrier === "libertymutual") {
    return [
      { value: "commercial", label: "Commercial Lines" },
    ]
  }
  if (carrier === "employers") {
    return [
      { value: "commercial", label: "Workers Compensation" },
    ]
  }
  // Progressive
  return [
    { value: "personal",   label: "Personal Lines" },
    { value: "commercial", label: "Commercial Lines" },
    { value: "both",       label: "Both" },
  ]
}

// -----------------------------------------------------------------------
// Progressive Fields
// -----------------------------------------------------------------------
function ProgressiveFields({
  inputs, update, bookType,
}: { inputs: CarrierInputs; update: (p: Partial<CarrierInputs>) => void; bookType: BookType }) {
  const showPL = bookType === "personal" || bookType === "both"
  const showCL = bookType === "commercial" || bookType === "both"
  return (
    <>
      {showPL && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Personal Lines</p>
          <NumField
            label="Current Book Written Premium ($)"
            value={inputs.prog_pl_premium}
            onChange={(v) => update({ prog_pl_premium: v })}
            placeholder="e.g. 750,000"
            type="currency"
            hint="Total PL Written Premium from the Account Production Report (ADP) — Current Book column"
          />
          <NumField
            label="Policies in Force (PIF)"
            value={inputs.prog_pl_pif}
            onChange={(v) => update({ prog_pl_pif: v })}
            placeholder="e.g. 350"
            type="count"
            hint="Total PL PIF — sum of Auto + Property + Special Lines + Umbrella rows"
          />
          <NumField
            label="Loss Ratio (Trailing 12, %)"
            value={inputs.prog_pl_loss_ratio}
            onChange={(v) => update({ prog_pl_loss_ratio: v })}
            placeholder="e.g. 52"
            type="percent"
            hint="Most recent trailing 12-month PL Loss Ratio from the Loss Ratio section of the ADP"
            benchmark={{ good: 40, poor: 62, direction: "lower-better", goodLabel: "Good", poorLabel: "High" }}
          />
        </div>
      )}
      {showCL && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Commercial Lines</p>
          <NumField
            label="Current Book Written Premium ($)"
            value={inputs.prog_cl_premium}
            onChange={(v) => update({ prog_cl_premium: v })}
            placeholder="e.g. 300,000"
            type="currency"
            hint="Total CL Written Premium from the ADP — Current Book column"
          />
          <NumField
            label="Policies in Force (PIF)"
            value={inputs.prog_cl_pif}
            onChange={(v) => update({ prog_cl_pif: v })}
            placeholder="e.g. 45"
            type="count"
            hint="Total CL PIF from the ADP — Commercial Lines row"
          />
          <NumField
            label="Loss Ratio (Trailing 12, %)"
            value={inputs.prog_cl_loss_ratio}
            onChange={(v) => update({ prog_cl_loss_ratio: v })}
            placeholder="e.g. 38"
            type="percent"
            hint="Most recent trailing 12-month CL Loss Ratio from the Loss Ratio section of the ADP"
            benchmark={{ good: 35, poor: 58, direction: "lower-better", goodLabel: "Good", poorLabel: "High" }}
          />
        </div>
      )}
      <NumField
        label="PIF Bundle Rate (%)"
        value={inputs.prog_bundle_rate}
        onChange={(v) => update({ prog_bundle_rate: v })}
        placeholder="e.g. 58"
        type="percent"
        hint="PIF Bundle Rate from the Property Quality section — Auto + Home/Condo/MH customers ÷ total HO/CO/MH PIFs"
        benchmark={{ good: 65, poor: 45, direction: "higher-better", goodLabel: "Strong", poorLabel: "Low" }}
      />
      <NumField
        label="YTD New Applications (Total)"
        value={inputs.prog_ytd_apps}
        onChange={(v) => update({ prog_ytd_apps: v })}
        placeholder="e.g. 85"
        type="count"
        hint="YTD Apps column — Total Personal Lines + Commercial Lines new applications from the New Business section"
        benchmark={{ good: 50, poor: 20, direction: "higher-better", goodLabel: "Active", poorLabel: "Low" }}
      />
      <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Diamond / Preferred Program Status</p>
          <p className="text-xs text-muted-foreground">Agency has Diamond or top-tier program status</p>
        </div>
        <Switch checked={inputs.prog_diamond_status} onCheckedChange={(v) => update({ prog_diamond_status: v })} />
      </div>
    </>
  )
}

// -----------------------------------------------------------------------
// Travelers Fields
// -----------------------------------------------------------------------
function TravelersFields({
  inputs, update, bookType,
}: { inputs: CarrierInputs; update: (p: Partial<CarrierInputs>) => void; bookType: BookType }) {
  const showAuto = bookType === "auto" || bookType === "both"
  const showHome = bookType === "home" || bookType === "both"
  return (
    <>
      {showAuto && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Auto</p>
          <NumField label="Annual Written Premium ($k)" value={inputs.travelers_auto_wp} onChange={(v) => update({ travelers_auto_wp: v })} placeholder="e.g. 400" type="currency" hint="From WP (,000) YE column — e.g. 400 = $400k" />
          <NumField label="Policies in Force (PIF)" value={inputs.travelers_auto_pif} onChange={(v) => update({ travelers_auto_pif: v })} placeholder="e.g. 120" type="count" />
          <NumField label="Calendar Year Loss Ratio (%)" value={inputs.travelers_auto_lr} onChange={(v) => update({ travelers_auto_lr: v })} placeholder="e.g. 72.0" type="percent" benchmark={{ good: 65, poor: 85, direction: "lower-better", goodLabel: "Good", poorLabel: "High" }} />
          <NumField label="Retention (%)" value={inputs.travelers_auto_retention} onChange={(v) => update({ travelers_auto_retention: v })} placeholder="e.g. 76.0" type="percent" benchmark={{ good: 75, poor: 60, direction: "higher-better", goodLabel: "Good", poorLabel: "Low" }} />
        </div>
      )}
      {showHome && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Homeowners</p>
          <NumField label="Annual Written Premium ($k)" value={inputs.travelers_home_wp} onChange={(v) => update({ travelers_home_wp: v })} placeholder="e.g. 500" type="currency" hint="From WP (,000) YE column — e.g. 500 = $500k" />
          <NumField label="Policies in Force (PIF)" value={inputs.travelers_home_pif} onChange={(v) => update({ travelers_home_pif: v })} placeholder="e.g. 150" type="count" />
          <NumField label="Calendar Year Loss Ratio (%)" value={inputs.travelers_home_lr} onChange={(v) => update({ travelers_home_lr: v })} placeholder="e.g. 68.0" type="percent" benchmark={{ good: 75, poor: 105, direction: "lower-better", goodLabel: "Good", poorLabel: "High" }} />
          <NumField label="Retention (%)" value={inputs.travelers_home_retention} onChange={(v) => update({ travelers_home_retention: v })} placeholder="e.g. 82.0" type="percent" benchmark={{ good: 80, poor: 65, direction: "higher-better", goodLabel: "Good", poorLabel: "Low" }} />
        </div>
      )}
    </>
  )
}

// -----------------------------------------------------------------------
// Hartford Fields
// -----------------------------------------------------------------------
function HartfordFields({
  inputs, update, bookType,
}: { inputs: CarrierInputs; update: (p: Partial<CarrierInputs>) => void; bookType: BookType }) {
  const showPL = bookType === "personal" || bookType === "both"
  const showCL = bookType === "commercial" || bookType === "both"
  return (
    <>
      {showPL && (
        <>
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <p className="text-sm font-semibold text-foreground">Personal Lines — Auto</p>
            <NumField label="Total Written Premium ($k)" value={inputs.hartford_pl_auto_twp} onChange={(v) => update({ hartford_pl_auto_twp: v })} placeholder="e.g. 1,500" type="currency" hint="All Auto TWP — most recent full year column in Production & Growth" />
            <NumField label="Policies in Force (Year-End)" value={inputs.hartford_pl_auto_pif} onChange={(v) => update({ hartford_pl_auto_pif: v })} placeholder="e.g. 1,800" type="count" hint="Total Policy Inforce — All Auto YE Total from Flow section" />
            <NumField label="Calendar Year Loss Ratio (%)" value={inputs.hartford_pl_auto_lr} onChange={(v) => update({ hartford_pl_auto_lr: v })} placeholder="e.g. 72.0" type="percent" hint="CYLR most recent year — All Auto row in Profitability" benchmark={{ good: 75, poor: 95, direction: "lower-better", goodLabel: "Good", poorLabel: "High" }} />
            <NumField label="Premium Retention (%)" value={inputs.hartford_pl_auto_retention} onChange={(v) => update({ hartford_pl_auto_retention: v })} placeholder="e.g. 76.0" type="percent" hint="Premium Retention % most recent year — All Auto row" benchmark={{ good: 72, poor: 55, direction: "higher-better", goodLabel: "Good", poorLabel: "Low" }} />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <p className="text-sm font-semibold text-foreground">Personal Lines — Home</p>
            <NumField label="Total Written Premium ($k)" value={inputs.hartford_pl_home_twp} onChange={(v) => update({ hartford_pl_home_twp: v })} placeholder="e.g. 2,800" type="currency" hint="All Home TWP — most recent full year column in Production & Growth" />
            <NumField label="Policies in Force (Year-End)" value={inputs.hartford_pl_home_pif} onChange={(v) => update({ hartford_pl_home_pif: v })} placeholder="e.g. 1,200" type="count" hint="Total Policy Inforce — All Home YE Total from Flow section" />
            <NumField label="Calendar Year Loss Ratio (%)" value={inputs.hartford_pl_home_lr} onChange={(v) => update({ hartford_pl_home_lr: v })} placeholder="e.g. 65.0" type="percent" hint="CYLR most recent year — All Home row in Profitability" benchmark={{ good: 65, poor: 90, direction: "lower-better", goodLabel: "Good", poorLabel: "High" }} />
            <NumField label="Premium Retention (%)" value={inputs.hartford_pl_home_retention} onChange={(v) => update({ hartford_pl_home_retention: v })} placeholder="e.g. 74.0" type="percent" hint="Premium Retention % most recent year — All Home row" benchmark={{ good: 72, poor: 55, direction: "higher-better", goodLabel: "Good", poorLabel: "Low" }} />
          </div>
        </>
      )}
      {showCL && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Small Commercial</p>
          <NumField label="Total Written Premium ($k)" value={inputs.hartford_cl_twp} onChange={(v) => update({ hartford_cl_twp: v })} placeholder="e.g. 1,500" type="currency" hint="Small Commercial Total TWP — most recent full year, Production & Growth" />
          <NumField label="Calendar Year Loss Ratio (%)" value={inputs.hartford_cl_lr} onChange={(v) => update({ hartford_cl_lr: v })} placeholder="e.g. 48.0" type="percent" hint="CYLR most recent year — Small Commercial Total row (negative = profitable)" benchmark={{ good: 50, poor: 78, direction: "lower-better", goodLabel: "Good", poorLabel: "High" }} />
          <NumField label="Retention (%)" value={inputs.hartford_cl_retention} onChange={(v) => update({ hartford_cl_retention: v })} placeholder="e.g. 76.0" type="percent" hint="Premium Retention Rate (PRR) most recent year — Total row in Retention table" benchmark={{ good: 75, poor: 58, direction: "higher-better", goodLabel: "Good", poorLabel: "Low" }} />
        </div>
      )}
    </>
  )
}

// -----------------------------------------------------------------------
// Safeco Fields — keyed to Safeco Agency Development Profile (ADP)
// -----------------------------------------------------------------------
function SafecoFields({
  inputs, update, bookType,
}: { inputs: CarrierInputs; update: (p: Partial<CarrierInputs>) => void; bookType: BookType }) {
  const showAuto  = bookType === "auto"  || bookType === "both"
  const showHome  = bookType === "home"  || bookType === "both"
  const showOther = bookType === "both"
  return (
    <>
      {showAuto && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Auto</p>
          <NumField label="R12 Auto DWP ($)" value={inputs.safeco_auto_dwp} onChange={(v) => update({ safeco_auto_dwp: v })} placeholder="e.g. 2,500,000" type="currency" hint="Rolling 12 Direct Written Premium — Auto row in the DWP table on your ADP" />
          <NumField label="Current Auto PIF" value={inputs.safeco_auto_pif} onChange={(v) => update({ safeco_auto_pif: v })} placeholder="e.g. 900" type="count" hint="Current Policy Inforce — Auto row, Current PIF column" />
          <NumField label="Auto YTD Loss Ratio (%)" value={inputs.safeco_auto_lr} onChange={(v) => update({ safeco_auto_lr: v })} placeholder="e.g. 68.0" type="percent" hint="YTD Loss Ratio — Auto row in Profitability section of ADP" benchmark={{ good: 65, poor: 82, direction: "lower-better", goodLabel: "Good", poorLabel: "High" }} />
          <NumField label="Auto PIF Retention (%)" value={inputs.safeco_auto_retention} onChange={(v) => update({ safeco_auto_retention: v })} placeholder="e.g. 72.0" type="percent" hint="PIF Retention — Auto row, YTD column in DWP table" benchmark={{ good: 75, poor: 60, direction: "higher-better", goodLabel: "Good", poorLabel: "Low" }} />
        </div>
      )}
      {showHome && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Homeowners</p>
          <NumField label="R12 Home DWP ($)" value={inputs.safeco_home_dwp} onChange={(v) => update({ safeco_home_dwp: v })} placeholder="e.g. 2,000,000" type="currency" hint="Rolling 12 Direct Written Premium — Home row in the DWP table" />
          <NumField label="Current Home PIF" value={inputs.safeco_home_pif} onChange={(v) => update({ safeco_home_pif: v })} placeholder="e.g. 750" type="count" hint="Current Policy Inforce — Home row, Current PIF column" />
          <NumField label="Home YTD Loss Ratio (%)" value={inputs.safeco_home_lr} onChange={(v) => update({ safeco_home_lr: v })} placeholder="e.g. 58.0" type="percent" hint="YTD Loss Ratio — Home row in Profitability section (can be negative = very profitable)" benchmark={{ good: 60, poor: 85, direction: "lower-better", goodLabel: "Good", poorLabel: "High" }} />
          <NumField label="Home PIF Retention (%)" value={inputs.safeco_home_retention} onChange={(v) => update({ safeco_home_retention: v })} placeholder="e.g. 74.0" type="percent" hint="PIF Retention — Home row, YTD column in DWP table" benchmark={{ good: 75, poor: 60, direction: "higher-better", goodLabel: "Good", poorLabel: "Low" }} />
        </div>
      )}
      {showOther && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Other Lines (Condo + Renters + Umbrella + Landlord)</p>
          <NumField label="Combined Other DWP ($)" value={inputs.safeco_other_dwp} onChange={(v) => update({ safeco_other_dwp: v })} placeholder="e.g. 500,000" type="currency" hint="Sum of R12 DWP for Condo, Renters, Umbrella, and Landlord rows" />
          <NumField label="Blended Other Loss Ratio (%)" value={inputs.safeco_other_lr} onChange={(v) => update({ safeco_other_lr: v })} placeholder="e.g. 42.0" type="percent" hint="Blended YTD Loss Ratio across the other product lines" />
          <NumField label="Blended Other Retention (%)" value={inputs.safeco_other_retention} onChange={(v) => update({ safeco_other_retention: v })} placeholder="e.g. 72.0" type="percent" hint="Average PIF Retention across other lines" />
        </div>
      )}
      {/* Cross-sell & engagement metrics */}
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <p className="text-sm font-semibold text-foreground">Engagement & Program</p>
        <NumField label="Valid Cross-Sell % (Home/Condo/Rent)" value={inputs.safeco_cross_sell_pct} onChange={(v) => update({ safeco_cross_sell_pct: v })} placeholder="e.g. 42.0" type="percent" hint="Valid Cross Sell % for Home/Condo/Rent — from Cross Sell section of ADP" />
        <NumField label="Right Track Participation (%)" value={inputs.safeco_right_track_pct} onChange={(v) => update({ safeco_right_track_pct: v })} placeholder="e.g. 25.0" type="percent" hint="RT % of Auto — YTD RT Issues ÷ YTD Auto Issues from Auto Term Length section" />
        <NumField label="YTD New Business DWP ($)" value={inputs.safeco_nb_dwp} onChange={(v) => update({ safeco_nb_dwp: v })} placeholder="e.g. 400,000" type="currency" hint="YTD Total New Business DWP — Total row, YTD NB DWP column in ADP" />
        <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Gold Service Designation</p>
            <p className="text-xs text-muted-foreground">Agency has earned Safeco Gold Service status — shows as "Y" on ADP header</p>
          </div>
          <Switch checked={inputs.safeco_gold_service} onCheckedChange={(v) => update({ safeco_gold_service: v })} />
        </div>
      </div>
    </>
  )
}

// -----------------------------------------------------------------------
// Berkshire Hathaway Guard Fields
// -----------------------------------------------------------------------
function BerkshireFields({
  inputs, update,
}: { inputs: CarrierInputs; update: (p: Partial<CarrierInputs>) => void }) {
  return (
    <>
      {/* Written Premium */}
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <p className="text-sm font-semibold text-foreground">Written Premium</p>
        <p className="text-xs text-muted-foreground">From the Written Premium (Calendar Year Basis) section of your PAR report.</p>
        <NumField
          label="Rolling 12-Month Written Premium ($)"
          value={inputs.bh_written_premium_r12}
          onChange={(v) => update({ bh_written_premium_r12: v })}
          placeholder="e.g. 800,000"
          type="currency"
          hint="Current Rolling 12 Months — Total row, Premium column. Most accurate for valuation."
        />
        <NumField
          label="Current YTD Written Premium ($)"
          value={inputs.bh_written_premium_ytd}
          onChange={(v) => update({ bh_written_premium_ytd: v })}
          placeholder="e.g. 450,000"
          type="currency"
          hint="Current YTD (01/01/xxxx–xx/xx/xxxx) — Total row, Premium column"
        />
        <div className="grid grid-cols-2 gap-3">
          <NumField
            label="YTD New Policies"
            value={inputs.bh_new_policies_ytd}
            onChange={(v) => update({ bh_new_policies_ytd: v })}
            placeholder="e.g. 30"
            type="count"
            hint="New row — Current YTD Policies column"
          />
          <NumField
            label="YTD Renewal Policies"
            value={inputs.bh_renewal_policies_ytd}
            onChange={(v) => update({ bh_renewal_policies_ytd: v })}
            placeholder="e.g. 95"
            type="count"
            hint="Renewal row — Current YTD Policies column"
          />
        </div>
      </div>

      {/* Conversion Ratios */}
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <p className="text-sm font-semibold text-foreground">Conversion & Activity Ratios</p>
        <p className="text-xs text-muted-foreground">From the Hit Ratio and Yield Ratio sections of your PAR report.</p>
        <div className="grid grid-cols-2 gap-3">
          <NumField
            label="Renewal Hit Ratio (%)"
            value={inputs.bh_hit_ratio_renewal}
            onChange={(v) => update({ bh_hit_ratio_renewal: v })}
            placeholder="e.g. 80"
            type="percent"
            hint="Renewal row — Current YTD % (WP/Quoted). Strong renewal hit = high book retention."
            benchmark={{ good: 85, poor: 60, direction: "higher-better", goodLabel: "Strong", poorLabel: "Weak" }}
          />
          <NumField
            label="New Business Hit Ratio (%)"
            value={inputs.bh_hit_ratio_new}
            onChange={(v) => update({ bh_hit_ratio_new: v })}
            placeholder="e.g. 55"
            type="percent"
            hint="New row — Current YTD % (WP/Quoted)"
            benchmark={{ good: 55, poor: 28, direction: "higher-better", goodLabel: "Strong", poorLabel: "Weak" }}
          />
        </div>
        <NumField
          label="Total Yield Ratio (%)"
          value={inputs.bh_yield_ratio_total}
          onChange={(v) => update({ bh_yield_ratio_total: v })}
          placeholder="e.g. 50"
          type="percent"
          hint="Total row — Current YTD Premium % (WP/Submitted). Measures overall submission-to-bind efficiency."
        />
      </div>

      {/* Loss Ratios */}
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <p className="text-sm font-semibold text-foreground">Direct Loss Ratios</p>
        <p className="text-xs text-muted-foreground">From the Direct Loss Ratios section. Each value is the Incurred Loss Ratio % for that year&apos;s SUBTOTAL row.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumField
            label="Legacy (1983–2020) LR %"
            value={inputs.bh_loss_ratio_1983_2020}
            onChange={(v) => update({ bh_loss_ratio_1983_2020: v })}
            placeholder="e.g. 40"
            type="percent"
            hint="SUBTOTAL row for 1983-2020 block"
          />
          <NumField
            label="2022 Loss Ratio %"
            value={inputs.bh_loss_ratio_2022}
            onChange={(v) => update({ bh_loss_ratio_2022: v })}
            placeholder="e.g. 75"
            type="percent"
            hint="2022 SUBTOTAL Incurred Loss Ratio"
          />
          <NumField
            label="2023 Loss Ratio %"
            value={inputs.bh_loss_ratio_2023}
            onChange={(v) => update({ bh_loss_ratio_2023: v })}
            placeholder="e.g. 95"
            type="percent"
            hint="2023 SUBTOTAL Incurred Loss Ratio"
          />
          <NumField
            label="2024 Loss Ratio %"
            value={inputs.bh_loss_ratio_2024}
            onChange={(v) => update({ bh_loss_ratio_2024: v })}
            placeholder="e.g. 90"
            type="percent"
            hint="2024 SUBTOTAL Incurred Loss Ratio"
          />
          <NumField
            label="2025 Loss Ratio %"
            value={inputs.bh_loss_ratio_2025}
            onChange={(v) => update({ bh_loss_ratio_2025: v })}
            placeholder="e.g. 85"
            type="percent"
            hint="2025 SUBTOTAL Incurred Loss Ratio"
          />
          <NumField
            label="Current YTD Loss Ratio %"
            value={inputs.bh_loss_ratio_ytd}
            onChange={(v) => update({ bh_loss_ratio_ytd: v })}
            placeholder="e.g. 60"
            type="percent"
            hint="Current partial-year SUBTOTAL from the last block in the Loss Ratio section"
          />
        </div>
        <NumField
          label="Grand Total Blended Loss Ratio (%)"
          value={inputs.bh_grand_total_loss_ratio}
          onChange={(v) => update({ bh_grand_total_loss_ratio: v })}
          placeholder="e.g. 88"
          type="percent"
          hint="GRAND TOTAL row — all years combined. This is the primary underwriting quality signal."
          benchmark={{ good: 90, poor: 115, direction: "lower-better", goodLabel: "Strong", poorLabel: "Elevated" }}
        />
      </div>
    </>
  )
}

// -----------------------------------------------------------------------
// Liberty Mutual Commercial Lines Fields
// -----------------------------------------------------------------------
function LibertyMutualFields({
  inputs, update,
}: { inputs: CarrierInputs; update: (p: Partial<CarrierInputs>) => void }) {
  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <p className="text-sm font-semibold text-foreground">Written Premium</p>
        <p className="text-xs text-muted-foreground">From your CL ADP or CL ADP Summary report. Upload either PDF to auto-fill these fields.</p>
        <NumField
          label="Rolling 12 DWP ($)"
          value={inputs.lm_dwp_r12}
          onChange={(v) => update({ lm_dwp_r12: v })}
          placeholder="e.g. 600,000"
          type="currency"
          hint="Rolling 12 months Direct Written Premium — most accurate for valuation"
        />
        <div className="grid grid-cols-2 gap-3">
          <NumField
            label="YTD DWP ($)"
            value={inputs.lm_dwp_ytd}
            onChange={(v) => update({ lm_dwp_ytd: v })}
            placeholder="e.g. 320,000"
            type="currency"
            hint="Year-to-date Direct Written Premium"
          />
          <NumField
            label="Prior YTD DWP ($)"
            value={inputs.lm_dwp_pytd}
            onChange={(v) => update({ lm_dwp_pytd: v })}
            placeholder="e.g. 290,000"
            type="currency"
            hint="Prior year-to-date DWP — for growth comparison"
          />
        </div>
        <NumField
          label="New Business DWP YTD ($)"
          value={inputs.lm_nb_dwp_ytd}
          onChange={(v) => update({ lm_nb_dwp_ytd: v })}
          placeholder="e.g. 80,000"
          type="currency"
          hint="New Business DWP YTD"
        />
        <NumField
          label="Policies in Force (PIF)"
          value={inputs.lm_pif}
          onChange={(v) => update({ lm_pif: v })}
          placeholder="e.g. 175"
          type="count"
          hint="Current PIF count"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <p className="text-sm font-semibold text-foreground">Retention & Loss Ratios</p>
        <NumField
          label="Premium Retention (%)"
          value={inputs.lm_premium_retention}
          onChange={(v) => update({ lm_premium_retention: v })}
          placeholder="e.g. 70"
          type="percent"
          hint="Premium Retention % from the Renewal section"
          benchmark={{ good: 80, poor: 60, direction: "higher-better", goodLabel: "Strong", poorLabel: "Weak" }}
        />
        <NumField
          label="YTD Loss Ratio (%)"
          value={inputs.lm_loss_ratio_ytd}
          onChange={(v) => update({ lm_loss_ratio_ytd: v })}
          placeholder="e.g. 65"
          type="percent"
          hint="YTD Loss Ratio"
          benchmark={{ good: 65, poor: 95, direction: "lower-better", goodLabel: "Strong", poorLabel: "Elevated" }}
        />
        <NumField
          label="2 Years + YTD Loss Ratio (%)"
          value={inputs.lm_loss_ratio_2yr}
          onChange={(v) => update({ lm_loss_ratio_2yr: v })}
          placeholder="e.g. 85"
          type="percent"
          hint="2 Years + YTD blended loss ratio — the primary underwriting quality signal"
          benchmark={{ good: 75, poor: 100, direction: "lower-better", goodLabel: "Strong", poorLabel: "Elevated" }}
        />
      </div>
    </>
  )
}

// -----------------------------------------------------------------------
// Employers Fields
// -----------------------------------------------------------------------
function EmployersFields({
  inputs, update,
}: { inputs: CarrierInputs; update: (p: Partial<CarrierInputs>) => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Workers Compensation Book</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Upload the report below or enter the figures manually from the report footer.</p>
      </div>

      {/* Step-by-step instructions */}
      <div className="rounded-md border border-border bg-muted/40 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">How to get this report</p>
        <ol className="flex flex-col gap-1.5">
          {[
            "Log in to your Employers agent portal at eaccess.employers.com",
            "In the top navigation, click \"Agency Summary\"",
            "In the filter/status dropdown, select \"Active\"",
            "Click the \"PDF\" button to download the report",
            "Upload the PDF using the upload button above, or enter the footer totals manually below",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">
          The footer row labeled <span className="font-mono font-medium text-foreground">Total Accounts</span> contains all the figures needed below.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumField
          label="Total Annual Written Premium / EAP ($)"
          value={inputs.emp_written_premium}
          onChange={(v) => update({ emp_written_premium: v })}
          placeholder="e.g. 177,578"
          type="currency"
          hint="Total EAP (Estimated Annual Premium) from the report footer — all active policies"
          benchmark={{ good: 500000, poor: 50000, direction: "higher-better", goodLabel: "Strong Book", poorLabel: "Small Book" }}
        />
        <NumField
          label="Total Earned Premium YTD ($)"
          value={inputs.emp_earned_premium_ytd}
          onChange={(v) => update({ emp_earned_premium_ytd: v })}
          placeholder="e.g. 87,464"
          type="currency"
          hint="Earned Premium column total from report footer — portion of premium earned so far this year"
        />
        <NumField
          label="Active Policy Count"
          value={inputs.emp_policy_count}
          onChange={(v) => update({ emp_policy_count: v })}
          placeholder="e.g. 65"
          type="number"
          hint="Total Accounts / Total Policies from the report footer"
          benchmark={{ good: 100, poor: 15, direction: "higher-better", goodLabel: "Established", poorLabel: "Small" }}
        />
        <NumField
          label="Loss Ratio (%)"
          value={inputs.emp_loss_ratio}
          onChange={(v) => update({ emp_loss_ratio: v })}
          placeholder="e.g. 0"
          type="percent"
          hint="Overall loss ratio from report footer — 0% is common for newer/clean books"
          benchmark={{ good: 65, poor: 95, direction: "lower-better", goodLabel: "Clean", poorLabel: "Elevated" }}
        />
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------
// Shared numeric input
// -----------------------------------------------------------------------
function NumField({
  label, value, onChange, placeholder, type, hint, benchmark,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  placeholder: string
  type: SmartInputType
  hint?: string
  benchmark?: BenchmarkConfig
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Label className="text-sm text-muted-foreground">{label}</Label>
        {benchmark && <BenchmarkBadge value={value} config={benchmark} />}
      </div>
      <SmartInput
        inputType={type}
        placeholder={placeholder}
        value={value}
        onValueChange={onChange}
      />
      {hint && <p className="mt-0.5 text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  )
}
