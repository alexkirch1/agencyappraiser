"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { CarrierInputs, CarrierName, BookType } from "./carrier-engine"

interface Props {
  inputs: CarrierInputs
  onChange: (inputs: CarrierInputs) => void
}

const carriers: { value: CarrierName; label: string }[] = [
  { value: "progressive", label: "Progressive" },
  { value: "safeco", label: "Safeco" },
  { value: "hartford", label: "Hartford" },
  { value: "travelers", label: "Travelers" },
  { value: "msa", label: "MSA" },
]

export function CarrierForm({ inputs, onChange }: Props) {
  const update = (partial: Partial<CarrierInputs>) => {
    onChange({ ...inputs, ...partial })
  }

  const numOrNull = (val: string): number | null => {
    if (val === "") return null
    const n = parseFloat(val)
    return isNaN(n) ? null : n
  }

  const carrier = inputs.carrier
  const bookType = inputs.bookType

  const needsBookType = carrier === "progressive" || carrier === "hartford" || carrier === "travelers"
  const bookTypeOptions = getBookTypeOptions(carrier)
  const showForm = carrier && (!needsBookType || bookType)

  return (
    <div className="flex flex-col gap-6">
      {/* Step 1: Carrier Selection */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">1. Select Carrier</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={carrier}
            onValueChange={(v) =>
              update({
                carrier: v as CarrierName,
                bookType: "",
                // Reset all carrier-specific fields
                prog_pl_premium: null, prog_pl_pif: null, prog_pl_loss_ratio: null,
                prog_cl_premium: null, prog_cl_pif: null, prog_cl_loss_ratio: null,
                prog_bundle_rate: null, prog_ytd_apps: null, prog_diamond_status: false,
                safeco_total_dwp: null, safeco_pif: null, safeco_loss_ratio: null, safeco_retention: null, safeco_nb_count: null,
                hartford_pl_twp: null, hartford_pl_lr: null, hartford_pl_retention: null,
                hartford_cl_twp: null, hartford_cl_lr: null, hartford_cl_retention: null,
                travelers_auto_wp: null, travelers_auto_lr: null, travelers_auto_retention: null,
                travelers_home_wp: null, travelers_home_lr: null, travelers_home_retention: null,
                msa_total_dwp: null, msa_pif: null, msa_loss_ratio: null, msa_retention: null, msa_nb_premium: null,
              })
            }
          >
            <SelectTrigger><SelectValue placeholder="Choose a carrier" /></SelectTrigger>
            <SelectContent>
              {carriers.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Step 2: Book Type (if applicable) */}
      {carrier && needsBookType && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">2. Book Type</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={bookType}
              onValueChange={(v) => update({ bookType: v as BookType })}
              className="flex flex-col gap-2 sm:flex-row sm:gap-4"
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

      {/* Step 3: Metrics Form */}
      {showForm && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              {needsBookType ? "3" : "2"}. {getCarrierLabel(carrier)} Book Details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {carrier === "progressive" && (
              <ProgressiveFields inputs={inputs} update={update} numOrNull={numOrNull} bookType={bookType as BookType} />
            )}
            {carrier === "safeco" && (
              <SafecoFields inputs={inputs} update={update} numOrNull={numOrNull} />
            )}
            {carrier === "hartford" && (
              <HartfordFields inputs={inputs} update={update} numOrNull={numOrNull} bookType={bookType as BookType} />
            )}
            {carrier === "travelers" && (
              <TravelersFields inputs={inputs} update={update} numOrNull={numOrNull} bookType={bookType as BookType} />
            )}
            {carrier === "msa" && (
              <MSAFields inputs={inputs} update={update} numOrNull={numOrNull} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function getBookTypeOptions(carrier: string) {
  if (carrier === "travelers") {
    return [
      { value: "auto", label: "Auto" },
      { value: "home", label: "Home" },
      { value: "both", label: "Both" },
    ]
  }
  return [
    { value: "personal", label: "Personal Lines" },
    { value: "commercial", label: "Commercial Lines" },
    { value: "both", label: "Both" },
  ]
}

function getCarrierLabel(carrier: string) {
  return carriers.find((c) => c.value === carrier)?.label ?? carrier
}

// --- Carrier-specific field sets ---
type FieldProps = {
  inputs: CarrierInputs
  update: (partial: Partial<CarrierInputs>) => void
  numOrNull: (val: string) => number | null
  bookType?: BookType
}

function ProgressiveFields({ inputs, update, numOrNull, bookType }: FieldProps) {
  const showPL = bookType === "personal" || bookType === "both"
  const showCL = bookType === "commercial" || bookType === "both"

  return (
    <>
      {showPL && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Personal Lines</p>
          <NumField label="PL T12 Written Premium ($)" value={inputs.prog_pl_premium} onChange={(v) => update({ prog_pl_premium: v })} numOrNull={numOrNull} placeholder="e.g. 2500000" />
          <NumField label="PL PIF" value={inputs.prog_pl_pif} onChange={(v) => update({ prog_pl_pif: v })} numOrNull={numOrNull} placeholder="e.g. 1200" />
          <NumField label="PL T12 Loss Ratio (%)" value={inputs.prog_pl_loss_ratio} onChange={(v) => update({ prog_pl_loss_ratio: v })} numOrNull={numOrNull} placeholder="e.g. 42.5" />
        </div>
      )}
      {showCL && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Commercial Lines</p>
          <NumField label="CL T12 Written Premium ($)" value={inputs.prog_cl_premium} onChange={(v) => update({ prog_cl_premium: v })} numOrNull={numOrNull} placeholder="e.g. 800000" />
          <NumField label="CL PIF" value={inputs.prog_cl_pif} onChange={(v) => update({ prog_cl_pif: v })} numOrNull={numOrNull} placeholder="e.g. 500" />
          <NumField label="CL T12 Loss Ratio (%)" value={inputs.prog_cl_loss_ratio} onChange={(v) => update({ prog_cl_loss_ratio: v })} numOrNull={numOrNull} placeholder="e.g. 8.0" />
        </div>
      )}
      <NumField label="Bundle Rate (%)" value={inputs.prog_bundle_rate} onChange={(v) => update({ prog_bundle_rate: v })} numOrNull={numOrNull} placeholder="e.g. 68" />
      <NumField label="YTD Apps" value={inputs.prog_ytd_apps} onChange={(v) => update({ prog_ytd_apps: v })} numOrNull={numOrNull} placeholder="e.g. 55" />
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">Diamond / Program Status</Label>
        <Switch checked={inputs.prog_diamond_status} onCheckedChange={(v) => update({ prog_diamond_status: v })} />
      </div>
    </>
  )
}

function SafecoFields({ inputs, update, numOrNull }: FieldProps) {
  return (
    <>
      <NumField label="Total DWP (YTD) ($)" value={inputs.safeco_total_dwp} onChange={(v) => update({ safeco_total_dwp: v })} numOrNull={numOrNull} placeholder="e.g. 3000000" />
      <NumField label="PIF (YTD)" value={inputs.safeco_pif} onChange={(v) => update({ safeco_pif: v })} numOrNull={numOrNull} placeholder="e.g. 1500" />
      <NumField label="Loss Ratio (YTD %)" value={inputs.safeco_loss_ratio} onChange={(v) => update({ safeco_loss_ratio: v })} numOrNull={numOrNull} placeholder="e.g. 42.0" />
      <NumField label="Retention (YTD %)" value={inputs.safeco_retention} onChange={(v) => update({ safeco_retention: v })} numOrNull={numOrNull} placeholder="e.g. 85.0" />
      <NumField label="NB Count (YTD)" value={inputs.safeco_nb_count} onChange={(v) => update({ safeco_nb_count: v })} numOrNull={numOrNull} placeholder="e.g. 120" />
    </>
  )
}

function HartfordFields({ inputs, update, numOrNull, bookType }: FieldProps) {
  const showPL = bookType === "personal" || bookType === "both"
  const showCL = bookType === "commercial" || bookType === "both"

  return (
    <>
      {showPL && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Personal Lines</p>
          <NumField label="PL TWP ($k)" value={inputs.hartford_pl_twp} onChange={(v) => update({ hartford_pl_twp: v })} numOrNull={numOrNull} placeholder="e.g. 1200" hint="In thousands ($k)" />
          <NumField label="PL Loss Ratio (%)" value={inputs.hartford_pl_lr} onChange={(v) => update({ hartford_pl_lr: v })} numOrNull={numOrNull} placeholder="e.g. 28.0" />
          <NumField label="PL Retention (%)" value={inputs.hartford_pl_retention} onChange={(v) => update({ hartford_pl_retention: v })} numOrNull={numOrNull} placeholder="e.g. 80.0" />
        </div>
      )}
      {showCL && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Small Commercial</p>
          <NumField label="SC TWP ($k)" value={inputs.hartford_cl_twp} onChange={(v) => update({ hartford_cl_twp: v })} numOrNull={numOrNull} placeholder="e.g. 800" hint="In thousands ($k)" />
          <NumField label="SC Loss Ratio (%)" value={inputs.hartford_cl_lr} onChange={(v) => update({ hartford_cl_lr: v })} numOrNull={numOrNull} placeholder="e.g. 18.0" />
          <NumField label="SC Retention (%)" value={inputs.hartford_cl_retention} onChange={(v) => update({ hartford_cl_retention: v })} numOrNull={numOrNull} placeholder="e.g. 72.0" />
        </div>
      )}
    </>
  )
}

function TravelersFields({ inputs, update, numOrNull, bookType }: FieldProps) {
  const showAuto = bookType === "auto" || bookType === "both"
  const showHome = bookType === "home" || bookType === "both"

  return (
    <>
      {showAuto && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Auto</p>
          <NumField label="Auto WP ($k)" value={inputs.travelers_auto_wp} onChange={(v) => update({ travelers_auto_wp: v })} numOrNull={numOrNull} placeholder="e.g. 3500" hint="In thousands ($k)" />
          <NumField label="Auto Loss Ratio (%)" value={inputs.travelers_auto_lr} onChange={(v) => update({ travelers_auto_lr: v })} numOrNull={numOrNull} placeholder="e.g. 62.0" />
          <NumField label="Auto Retention (%)" value={inputs.travelers_auto_retention} onChange={(v) => update({ travelers_auto_retention: v })} numOrNull={numOrNull} placeholder="e.g. 75.0" />
        </div>
      )}
      {showHome && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Homeowners</p>
          <NumField label="Home WP ($k)" value={inputs.travelers_home_wp} onChange={(v) => update({ travelers_home_wp: v })} numOrNull={numOrNull} placeholder="e.g. 4500" hint="In thousands ($k)" />
          <NumField label="Home Loss Ratio (%)" value={inputs.travelers_home_lr} onChange={(v) => update({ travelers_home_lr: v })} numOrNull={numOrNull} placeholder="e.g. 40.0" />
          <NumField label="Home Retention (%)" value={inputs.travelers_home_retention} onChange={(v) => update({ travelers_home_retention: v })} numOrNull={numOrNull} placeholder="e.g. 88.0" />
        </div>
      )}
    </>
  )
}

function MSAFields({ inputs, update, numOrNull }: FieldProps) {
  return (
    <>
      <NumField label="Total DWP (YTD) ($)" value={inputs.msa_total_dwp} onChange={(v) => update({ msa_total_dwp: v })} numOrNull={numOrNull} placeholder="e.g. 2500000" />
      <NumField label="PIF (YTD)" value={inputs.msa_pif} onChange={(v) => update({ msa_pif: v })} numOrNull={numOrNull} placeholder="e.g. 1200" />
      <NumField label="Loss Ratio (YTD %)" value={inputs.msa_loss_ratio} onChange={(v) => update({ msa_loss_ratio: v })} numOrNull={numOrNull} placeholder="e.g. 42.5" />
      <NumField label="Retention (%)" value={inputs.msa_retention} onChange={(v) => update({ msa_retention: v })} numOrNull={numOrNull} placeholder="e.g. 88.0" />
      <NumField label="New Business Premium (YTD) ($)" value={inputs.msa_nb_premium} onChange={(v) => update({ msa_nb_premium: v })} numOrNull={numOrNull} placeholder="e.g. 450000" />
    </>
  )
}

function NumField({
  label,
  value,
  onChange,
  numOrNull,
  placeholder,
  hint,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  numOrNull: (val: string) => number | null
  placeholder: string
  hint?: string
}) {
  return (
    <div>
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <Input
        type="number"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(numOrNull(e.target.value))}
        className="mt-1"
      />
      {hint && <p className="mt-0.5 text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  )
}
