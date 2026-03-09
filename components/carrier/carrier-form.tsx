"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SmartInput } from "@/components/ui/smart-input"
import type { SmartInputType } from "@/components/ui/smart-input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { ReportUpload } from "./report-upload"
import { CommissionUpload } from "./commission-upload"
import type { CarrierInputs, CarrierName, BookType } from "./carrier-engine"

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
          <div className="grid grid-cols-3 gap-3">
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
              <CardTitle className="text-base font-semibold text-foreground">
                {stepOffset + 1}. Carrier Metrics
              </CardTitle>
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
            </CardContent>
          </Card>

          {/* Book Quality — sourced from commission statements & active policy list */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  {stepOffset + 2}. Book Quality <span className="text-xs font-normal text-muted-foreground ml-1">(optional — from commission statements / active policy list)</span>
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
                  placeholder="e.g. 78"
                  type="percent"
                  hint="% of policies in preferred or standard tier (vs non-standard/high-risk)"
                />
                <NumField
                  label="Policies per Customer"
                  value={inputs.book_policies_per_customer}
                  onChange={(v) => update({ book_policies_per_customer: v })}
                  placeholder="e.g. 1.9"
                  type="number"
                  hint="Total policies ÷ total customers — higher means stronger multi-line"
                />
                <NumField
                  label="Avg Premium per Policy ($)"
                  value={inputs.book_avg_premium_per_policy}
                  onChange={(v) => update({ book_avg_premium_per_policy: v })}
                  placeholder="e.g. 1,200"
                  type="currency"
                  hint="Total written premium ÷ total policies in force"
                />
                <NumField
                  label="New Business % (last 12 mo)"
                  value={inputs.book_new_business_pct}
                  onChange={(v) => update({ book_new_business_pct: v })}
                  placeholder="e.g. 15"
                  type="percent"
                  hint="New policies written in past 12 months ÷ total PIF — from commission statement"
                />
                <NumField
                  label="Monoline Customers (%)"
                  value={inputs.book_monoline_pct}
                  onChange={(v) => update({ book_monoline_pct: v })}
                  placeholder="e.g. 42"
                  type="percent"
                  hint="% of customers with only one policy — lower is better (multi-line = stickier)"
                />
                <NumField
                  label="Paperless / e-Docs (%)"
                  value={inputs.book_digital_docs_pct}
                  onChange={(v) => update({ book_digital_docs_pct: v })}
                  placeholder="e.g. 65"
                  type="percent"
                  hint="% of customers enrolled in paperless — higher engagement = lower lapse rate"
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
          <NumField label="T12 Written Premium ($)" value={inputs.prog_pl_premium} onChange={(v) => update({ prog_pl_premium: v })} placeholder="e.g. 2,500,000" type="currency" />
          <NumField label="Policies in Force (PIF)" value={inputs.prog_pl_pif} onChange={(v) => update({ prog_pl_pif: v })} placeholder="e.g. 1,200" type="count" />
          <NumField label="T12 Loss Ratio (%)" value={inputs.prog_pl_loss_ratio} onChange={(v) => update({ prog_pl_loss_ratio: v })} placeholder="e.g. 42.5" type="percent" />
        </div>
      )}
      {showCL && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Commercial Lines</p>
          <NumField label="T12 Written Premium ($)" value={inputs.prog_cl_premium} onChange={(v) => update({ prog_cl_premium: v })} placeholder="e.g. 800,000" type="currency" />
          <NumField label="Policies in Force (PIF)" value={inputs.prog_cl_pif} onChange={(v) => update({ prog_cl_pif: v })} placeholder="e.g. 500" type="count" />
          <NumField label="T12 Loss Ratio (%)" value={inputs.prog_cl_loss_ratio} onChange={(v) => update({ prog_cl_loss_ratio: v })} placeholder="e.g. 8.0" type="percent" />
        </div>
      )}
      <NumField label="Bundle Rate (%)" value={inputs.prog_bundle_rate} onChange={(v) => update({ prog_bundle_rate: v })} placeholder="e.g. 68" type="percent" />
      <NumField label="YTD New Applications" value={inputs.prog_ytd_apps} onChange={(v) => update({ prog_ytd_apps: v })} placeholder="e.g. 55" type="count" />
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
          <NumField label="Annual Written Premium ($k)" value={inputs.travelers_auto_wp} onChange={(v) => update({ travelers_auto_wp: v })} placeholder="e.g. 3,500" type="currency" hint="From WP (,000) YE column — e.g. 206 = $206k" />
          <NumField label="Policies in Force (PIF)" value={inputs.travelers_auto_pif} onChange={(v) => update({ travelers_auto_pif: v })} placeholder="e.g. 75" type="count" />
          <NumField label="Calendar Year Loss Ratio (%)" value={inputs.travelers_auto_lr} onChange={(v) => update({ travelers_auto_lr: v })} placeholder="e.g. 77.2" type="percent" />
          <NumField label="Retention (%)" value={inputs.travelers_auto_retention} onChange={(v) => update({ travelers_auto_retention: v })} placeholder="e.g. 76.2" type="percent" />
        </div>
      )}
      {showHome && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Homeowners</p>
          <NumField label="Annual Written Premium ($k)" value={inputs.travelers_home_wp} onChange={(v) => update({ travelers_home_wp: v })} placeholder="e.g. 4,500" type="currency" hint="From WP (,000) YE column — e.g. 221 = $221k" />
          <NumField label="Policies in Force (PIF)" value={inputs.travelers_home_pif} onChange={(v) => update({ travelers_home_pif: v })} placeholder="e.g. 122" type="count" />
          <NumField label="Calendar Year Loss Ratio (%)" value={inputs.travelers_home_lr} onChange={(v) => update({ travelers_home_lr: v })} placeholder="e.g. 40.0" type="percent" />
          <NumField label="Retention (%)" value={inputs.travelers_home_retention} onChange={(v) => update({ travelers_home_retention: v })} placeholder="e.g. 88.0" type="percent" />
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
            <NumField label="Total Written Premium ($k)" value={inputs.hartford_pl_auto_twp} onChange={(v) => update({ hartford_pl_auto_twp: v })} placeholder="e.g. 1,991" type="currency" hint="All Auto TWP — most recent full year column in Production & Growth" />
            <NumField label="Policies in Force (Year-End)" value={inputs.hartford_pl_auto_pif} onChange={(v) => update({ hartford_pl_auto_pif: v })} placeholder="e.g. 2,569" type="count" hint="Total Policy Inforce — All Auto YE Total from Flow section" />
            <NumField label="Calendar Year Loss Ratio (%)" value={inputs.hartford_pl_auto_lr} onChange={(v) => update({ hartford_pl_auto_lr: v })} placeholder="e.g. 32.9" type="percent" hint="CYLR most recent year — All Auto row in Profitability" />
            <NumField label="Premium Retention (%)" value={inputs.hartford_pl_auto_retention} onChange={(v) => update({ hartford_pl_auto_retention: v })} placeholder="e.g. 77.0" type="percent" hint="Premium Retention % most recent year — All Auto row" />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <p className="text-sm font-semibold text-foreground">Personal Lines — Home</p>
            <NumField label="Total Written Premium ($k)" value={inputs.hartford_pl_home_twp} onChange={(v) => update({ hartford_pl_home_twp: v })} placeholder="e.g. 3,989" type="currency" hint="All Home TWP — most recent full year column in Production & Growth" />
            <NumField label="Policies in Force (Year-End)" value={inputs.hartford_pl_home_pif} onChange={(v) => update({ hartford_pl_home_pif: v })} placeholder="e.g. 1,442" type="count" hint="Total Policy Inforce — All Home YE Total from Flow section" />
            <NumField label="Calendar Year Loss Ratio (%)" value={inputs.hartford_pl_home_lr} onChange={(v) => update({ hartford_pl_home_lr: v })} placeholder="e.g. 20.4" type="percent" hint="CYLR most recent year — All Home row in Profitability" />
            <NumField label="Premium Retention (%)" value={inputs.hartford_pl_home_retention} onChange={(v) => update({ hartford_pl_home_retention: v })} placeholder="e.g. 68.0" type="percent" hint="Premium Retention % most recent year — All Home row" />
          </div>
        </>
      )}
      {showCL && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Small Commercial</p>
          <NumField label="Total Written Premium ($k)" value={inputs.hartford_cl_twp} onChange={(v) => update({ hartford_cl_twp: v })} placeholder="e.g. 2,043" type="currency" hint="Small Commercial Total TWP — most recent full year, Production & Growth" />
          <NumField label="Calendar Year Loss Ratio (%)" value={inputs.hartford_cl_lr} onChange={(v) => update({ hartford_cl_lr: v })} placeholder="e.g. 24.7" type="percent" hint="CYLR most recent year — Small Commercial Total row (negative = profitable)" />
          <NumField label="Retention (%)" value={inputs.hartford_cl_retention} onChange={(v) => update({ hartford_cl_retention: v })} placeholder="e.g. 73.9" type="percent" hint="Premium Retention Rate (PRR) most recent year — Total row in Retention table" />
        </div>
      )}
    </>
  )
}

// -----------------------------------------------------------------------
// Shared numeric input
// -----------------------------------------------------------------------
function NumField({
  label, value, onChange, placeholder, type, hint,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  placeholder: string
  type: SmartInputType
  hint?: string
}) {
  return (
    <div>
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <SmartInput
        inputType={type}
        placeholder={placeholder}
        value={value}
        onValueChange={onChange}
        className="mt-1"
      />
      {hint && <p className="mt-0.5 text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  )
}
