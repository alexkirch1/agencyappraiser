"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SmartInput } from "@/components/ui/smart-input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ValuationInputs } from "./valuation-engine"

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY"
]

interface Props {
  inputs: ValuationInputs
  onChange: (inputs: ValuationInputs) => void
  invalidFields?: string[]
}

export function ValuationForm({ inputs, onChange, invalidFields = [] }: Props) {
  const update = (partial: Partial<ValuationInputs>) => {
    onChange({ ...inputs, ...partial })
  }

  const numOrNull = (val: string): number | null => {
    if (val === "") return null
    const n = parseFloat(val)
    return isNaN(n) ? null : n
  }

  const isFullAgency = inputs.scopeOfSale === 1.0

  const isInvalid = (key: string) => invalidFields.includes(key)

  const fieldBorder = (key: string) =>
    isInvalid(key) ? "ring-2 ring-destructive border-destructive" : ""

  const requiredStar = (label: string) => (
    <span>{label} <span className="text-destructive">*</span></span>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Transaction Structure */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            1. Transaction Structure & Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="mb-3 block text-sm text-muted-foreground">Scope of Sale</Label>
          <RadioGroup
            value={String(inputs.scopeOfSale)}
            onValueChange={(v) => update({ scopeOfSale: parseFloat(v) })}
            className="flex flex-col gap-2 sm:flex-row sm:gap-4"
          >
            {[
              { value: "1", label: "Full Agency (1.0x)" },
              { value: "0.95", label: "Book Purchase (0.95x)" },
              { value: "0.9", label: "Fragmented (0.9x)" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/10"
              >
                <RadioGroupItem value={opt.value} />
                {opt.label}
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 2. Book Longevity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            2. Book Longevity Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="yearEstablished" className="text-sm text-muted-foreground">Year Established</Label>
          <SmartInput
            id="yearEstablished"
            inputType="year"
            placeholder="e.g. 1998"
            value={inputs.yearEstablished}
            onValueChange={(v) => update({ yearEstablished: v })}
            className="mt-1.5"
          />
        </CardContent>
      </Card>

      {/* 3. Demographic & Operational Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            3. Agency Demographic & Operational Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">Primary State</Label>
            <Select value={inputs.primaryState} onValueChange={(v) => update({ primaryState: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="empCount" className="text-sm text-muted-foreground">Number of Employees</Label>
            <SmartInput id="empCount" inputType="count" placeholder="e.g. 5" value={inputs.employeeCount} onValueChange={(v) => update({ employeeCount: v })} className="mt-1.5" />
          </div>
          <div>
            <Label className="mb-2 block text-sm text-muted-foreground">Office Structure</Label>
            <RadioGroup value={inputs.officeStructure} onValueChange={(v) => update({ officeStructure: v })} className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              {["Virtual", "Hybrid", "BrickAndMortar"].map((opt) => (
                <label key={opt} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/10">
                  <RadioGroupItem value={opt} />
                  {opt === "BrickAndMortar" ? "Brick & Mortar" : opt}
                </label>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="desc" className="text-sm text-muted-foreground">Agency Description (Optional)</Label>
            <Textarea id="desc" placeholder="Brief description of your agency..." value={inputs.agencyDescription} onChange={(e) => update({ agencyDescription: e.target.value })} className="mt-1.5" rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* 4. Legal & Compliance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            4. Legal & Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="eoClaims" className="text-sm text-muted-foreground">{"E&O Claims (Past 3 Years)"}</Label>
            <SmartInput id="eoClaims" inputType="count" placeholder="0" value={inputs.eoClaims} onValueChange={(v) => update({ eoClaims: v ?? 0 })} className="mt-1.5" />
          </div>
          <div>
            <Label className="mb-2 block text-sm text-muted-foreground">Producer Agreements</Label>
            <RadioGroup value={inputs.producerAgreements} onValueChange={(v) => update({ producerAgreements: v })} className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              {[
                { value: "strong", label: "Strong (Non-Compete/Solicit)" },
                { value: "weak", label: "Weak / Informal" },
                { value: "none", label: "None" },
              ].map((opt) => (
                <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/10">
                  <RadioGroupItem value={opt.value} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* 5. Financial & Valuation Benchmarks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            5. Financial & Valuation Benchmarks
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div id="field-revenueLTM">
            <Label htmlFor="revLTM" className="text-sm text-muted-foreground">{requiredStar("Annual Revenue (LTM)")}</Label>
            <SmartInput id="revLTM" inputType="currency" placeholder="e.g. 1500000" value={inputs.revenueLTM} onValueChange={(v) => update({ revenueLTM: v })} className={`mt-1.5 ${fieldBorder("revenueLTM")}`} />
            {isInvalid("revenueLTM") && <p className="mt-1 text-xs text-destructive">Revenue is required for valuation</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="revY2" className="text-sm text-muted-foreground">Revenue Y-2</Label>
              <SmartInput id="revY2" inputType="currency" placeholder="Prior year" value={inputs.revenueY2} onValueChange={(v) => update({ revenueY2: v })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="revY3" className="text-sm text-muted-foreground">Revenue Y-3</Label>
              <SmartInput id="revY3" inputType="currency" placeholder="2 years ago" value={inputs.revenueY3} onValueChange={(v) => update({ revenueY3: v })} className="mt-1.5" />
            </div>
          </div>
          <div id="field-sdeEbitda">
            <Label htmlFor="sde" className="text-sm text-muted-foreground">{requiredStar("SDE / EBITDA")}</Label>
            <SmartInput id="sde" inputType="currency" placeholder="e.g. 400000" value={inputs.sdeEbitda} onValueChange={(v) => update({ sdeEbitda: v })} className={`mt-1.5 ${fieldBorder("sdeEbitda")}`} />
            <p className="mt-1 text-xs text-muted-foreground/70">
              {"Net Income + Owner Comp + Non-Recurring Expenses + Depreciation"}
            </p>
            {isInvalid("sdeEbitda") && <p className="mt-0.5 text-xs text-destructive">SDE/EBITDA is required for valuation</p>}
          </div>
        </CardContent>
      </Card>

      {/* 6. Book of Business Quality */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            6. Book of Business Quality
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div id="field-retentionRate">
            <Label htmlFor="retention" className="text-sm text-muted-foreground">{requiredStar("Retention Rate (%)")}</Label>
            <SmartInput id="retention" inputType="percent" placeholder="e.g. 92" value={inputs.retentionRate} onValueChange={(v) => update({ retentionRate: v })} className={`mt-1.5 ${fieldBorder("retentionRate")}`} />
            {isInvalid("retentionRate") && <p className="mt-1 text-xs text-destructive">Retention rate is required</p>}
          </div>
          <div id="field-policyMix">
            <Label htmlFor="policyMix" className="text-sm text-muted-foreground">{requiredStar("Commercial Lines Mix (%)")}</Label>
            <SmartInput id="policyMix" inputType="percent" placeholder="e.g. 60" value={inputs.policyMix} onValueChange={(v) => update({ policyMix: v })} className={`mt-1.5 ${fieldBorder("policyMix")}`} />
            <p className="mt-1 text-xs text-muted-foreground/70">% of premium that is Commercial Lines</p>
            {isInvalid("policyMix") && <p className="mt-0.5 text-xs text-destructive">Policy mix is required</p>}
          </div>
          <div id="field-clientConcentration">
            <Label htmlFor="concentration" className="text-sm text-muted-foreground">{requiredStar("Client Concentration (%)")}</Label>
            <SmartInput id="concentration" inputType="percent" placeholder="e.g. 15" value={inputs.clientConcentration} onValueChange={(v) => update({ clientConcentration: v })} className={`mt-1.5 ${fieldBorder("clientConcentration")}`} />
            <p className="mt-1 text-xs text-muted-foreground/70">% of revenue from your top 10 clients</p>
            {isInvalid("clientConcentration") && <p className="mt-0.5 text-xs text-destructive">Client concentration is required</p>}
          </div>
        </CardContent>
      </Card>

      {/* 7. Operational / Transferability */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            7. Operational / Transferability
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="carrierDiv" className="text-sm text-muted-foreground">Carrier Diversification (%)</Label>
            <SmartInput id="carrierDiv" inputType="percent" placeholder="% from top carrier" value={inputs.carrierDiversification} onValueChange={(v) => update({ carrierDiversification: v })} className="mt-1.5" />
            <p className="mt-1 text-xs text-muted-foreground/70">% of premium from your single largest carrier</p>
          </div>
          <div>
            <Label htmlFor="rpe" className="text-sm text-muted-foreground">Revenue Per Employee ($)</Label>
            <SmartInput id="rpe" inputType="currency" placeholder="e.g. 175000" value={inputs.revenuePerEmployee} onValueChange={(v) => update({ revenuePerEmployee: v })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="topCarriers" className="text-sm text-muted-foreground">Top 5 Carriers (Optional)</Label>
            <Textarea id="topCarriers" placeholder="e.g. Progressive, Safeco, Hartford..." value={inputs.topCarriers} onChange={(e) => update({ topCarriers: e.target.value })} className="mt-1.5" rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Conditional: Full Agency Due Diligence */}
      {isFullAgency && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-primary">
              Full Agency Due Diligence
            </CardTitle>
            <p className="text-xs text-muted-foreground">Additional fields for Full Agency transactions</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <Label className="mb-2 block text-sm text-muted-foreground">Closing Timeline</Label>
              <RadioGroup value={inputs.closingTimeline} onValueChange={(v) => update({ closingTimeline: v })} className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                {[
                  { value: "urgent", label: "Urgent (<60 days)" },
                  { value: "standard", label: "Standard (3-6 months)" },
                  { value: "long", label: "Long (6+ months)" },
                ].map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/10">
                    <RadioGroupItem value={opt.value} />
                    {opt.label}
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="payroll" className="text-sm text-muted-foreground">Annual Payroll Cost ($)</Label>
                <SmartInput id="payroll" inputType="currency" placeholder="e.g. 200000" value={inputs.annualPayrollCost} onValueChange={(v) => update({ annualPayrollCost: v })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="ownerComp" className="text-sm text-muted-foreground">Owner Compensation ($)</Label>
                <SmartInput id="ownerComp" inputType="currency" placeholder="e.g. 120000" value={inputs.ownerCompensation} onValueChange={(v) => update({ ownerCompensation: v })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-sm text-muted-foreground">Staff Retention Risk</Label>
              <RadioGroup value={inputs.staffRetentionRisk} onValueChange={(v) => update({ staffRetentionRisk: v })} className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                {[
                  { value: "secure", label: "Secure (Contracts)" },
                  { value: "moderate", label: "Moderate" },
                  { value: "high", label: "High Risk" },
                ].map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/10">
                    <RadioGroupItem value={opt.value} />
                    {opt.label}
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="newBiz" className="text-sm text-muted-foreground">Monthly New Business Value ($)</Label>
                <SmartInput id="newBiz" inputType="currency" placeholder="e.g. 25000" value={inputs.newBusinessValue} onValueChange={(v) => update({ newBusinessValue: v })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="clientTenure" className="text-sm text-muted-foreground">Avg Client Tenure (years)</Label>
                <SmartInput id="clientTenure" inputType="count" placeholder="e.g. 8" value={inputs.avgClientTenure} onValueChange={(v) => update({ avgClientTenure: v })} className="mt-1.5" max={99} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
