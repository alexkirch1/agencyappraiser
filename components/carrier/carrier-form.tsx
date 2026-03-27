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
    value: "berkshire",
    label: "BH Guard",
    description: "WC, BOP, Comm. Auto, Umbrella & Specialty",
  },
]

const comingSoonCarriers: string[] = [
  "AmTrust",
  "American Modern",
  "Attune",
  "Berkshire Hathaway Homestate",
  "BiBERK",
  "Builders & Tradesmen (BTIS)",
  "CNA",
  "Cabrillo / Pacific Coastal",
  "Chubb Commercial Lines",
  "Chubb Personal Lines",
  "Clearcover",
  "Commonwealth Casualty",
  "Coterie",
  "Crump Life",
  "Dairyland",
  "Employers",
  "Foremost - Bristol West",
  "Foremost Choice / Specialty",
  "Gainsco",
  "Geico",
  "Hagerty",
  "Homeowners of America",
  "Johnson & Johnson",
  "Kemper Infinity",
  "Kemper Personal",
  "Kemper Specialty",
  "Lemonade",
  "Liberty Mutual Commercial Lines",
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
              {carrier === "safeco" && (
                <SafecoFields inputs={inputs} update={update} bookType={bookType as BookType} />
              )}
              {carrier === "berkshire" && (
                <BerkshireFields inputs={inputs} update={update} />
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
          <NumField label="R12 Auto DWP ($)" value={inputs.safeco_auto_dwp} onChange={(v) => update({ safeco_auto_dwp: v })} placeholder="e.g. 6,645,555" type="currency" hint="Rolling 12 Direct Written Premium — Auto row in the DWP table on your ADP" />
          <NumField label="Current Auto PIF" value={inputs.safeco_auto_pif} onChange={(v) => update({ safeco_auto_pif: v })} placeholder="e.g. 2,485" type="count" hint="Current Policy Inforce — Auto row, Current PIF column" />
          <NumField label="Auto YTD Loss Ratio (%)" value={inputs.safeco_auto_lr} onChange={(v) => update({ safeco_auto_lr: v })} placeholder="e.g. 74.0" type="percent" hint="YTD Loss Ratio — Auto row in Profitability section of ADP" />
          <NumField label="Auto PIF Retention (%)" value={inputs.safeco_auto_retention} onChange={(v) => update({ safeco_auto_retention: v })} placeholder="e.g. 69.3" type="percent" hint="PIF Retention — Auto row, YTD column in DWP table" />
        </div>
      )}
      {showHome && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Homeowners</p>
          <NumField label="R12 Home DWP ($)" value={inputs.safeco_home_dwp} onChange={(v) => update({ safeco_home_dwp: v })} placeholder="e.g. 5,931,825" type="currency" hint="Rolling 12 Direct Written Premium — Home row in the DWP table" />
          <NumField label="Current Home PIF" value={inputs.safeco_home_pif} onChange={(v) => update({ safeco_home_pif: v })} placeholder="e.g. 2,375" type="count" hint="Current Policy Inforce — Home row, Current PIF column" />
          <NumField label="Home YTD Loss Ratio (%)" value={inputs.safeco_home_lr} onChange={(v) => update({ safeco_home_lr: v })} placeholder="e.g. -4.4" type="percent" hint="YTD Loss Ratio — Home row in Profitability section (can be negative = very profitable)" />
          <NumField label="Home PIF Retention (%)" value={inputs.safeco_home_retention} onChange={(v) => update({ safeco_home_retention: v })} placeholder="e.g. 73.2" type="percent" hint="PIF Retention — Home row, YTD column in DWP table" />
        </div>
      )}
      {showOther && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Other Lines (Condo + Renters + Umbrella + Landlord)</p>
          <NumField label="Combined Other DWP ($)" value={inputs.safeco_other_dwp} onChange={(v) => update({ safeco_other_dwp: v })} placeholder="e.g. 1,986,255" type="currency" hint="Sum of R12 DWP for Condo, Renters, Umbrella, and Landlord rows" />
          <NumField label="Blended Other Loss Ratio (%)" value={inputs.safeco_other_lr} onChange={(v) => update({ safeco_other_lr: v })} placeholder="e.g. 31.0" type="percent" hint="Blended YTD Loss Ratio across the other product lines" />
          <NumField label="Blended Other Retention (%)" value={inputs.safeco_other_retention} onChange={(v) => update({ safeco_other_retention: v })} placeholder="e.g. 71.0" type="percent" hint="Average PIF Retention across other lines" />
        </div>
      )}
      {/* Cross-sell & engagement metrics */}
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <p className="text-sm font-semibold text-foreground">Engagement & Program</p>
        <NumField label="Valid Cross-Sell % (Home/Condo/Rent)" value={inputs.safeco_cross_sell_pct} onChange={(v) => update({ safeco_cross_sell_pct: v })} placeholder="e.g. 39.8" type="percent" hint="Valid Cross Sell % for Home/Condo/Rent — from Cross Sell section of ADP" />
        <NumField label="Right Track Participation (%)" value={inputs.safeco_right_track_pct} onChange={(v) => update({ safeco_right_track_pct: v })} placeholder="e.g. 26.9" type="percent" hint="RT % of Auto — YTD RT Issues ÷ YTD Auto Issues from Auto Term Length section" />
        <NumField label="YTD New Business DWP ($)" value={inputs.safeco_nb_dwp} onChange={(v) => update({ safeco_nb_dwp: v })} placeholder="e.g. 722,941" type="currency" hint="YTD Total New Business DWP — Total row, YTD NB DWP column in ADP" />
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
          placeholder="e.g. 600,000"
          type="currency"
          hint="Current Rolling 12 Months — Total row, Premium column. Most accurate for valuation."
        />
        <NumField
          label="Current YTD Written Premium ($)"
          value={inputs.bh_written_premium_ytd}
          onChange={(v) => update({ bh_written_premium_ytd: v })}
          placeholder="e.g. 100,000"
          type="currency"
          hint="Current YTD (01/01/xxxx–xx/xx/xxxx) — Total row, Premium column"
        />
        <div className="grid grid-cols-2 gap-3">
          <NumField
            label="YTD New Policies"
            value={inputs.bh_new_policies_ytd}
            onChange={(v) => update({ bh_new_policies_ytd: v })}
            placeholder="e.g. 20"
            type="count"
            hint="New row — Current YTD Policies column"
          />
          <NumField
            label="YTD Renewal Policies"
            value={inputs.bh_renewal_policies_ytd}
            onChange={(v) => update({ bh_renewal_policies_ytd: v })}
            placeholder="e.g. 80"
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
          />
          <NumField
            label="New Business Hit Ratio (%)"
            value={inputs.bh_hit_ratio_new}
            onChange={(v) => update({ bh_hit_ratio_new: v })}
            placeholder="e.g. 55"
            type="percent"
            hint="New row — Current YTD % (WP/Quoted)"
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
        />
      </div>
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
