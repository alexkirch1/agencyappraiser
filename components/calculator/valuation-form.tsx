"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
}

export function ValuationForm({ inputs, onChange }: Props) {
  const update = (partial: Partial<ValuationInputs>) => {
    onChange({ ...inputs, ...partial })
  }

  const numOrNull = (val: string): number | null => {
    if (val === "") return null
    const n = parseFloat(val)
    return isNaN(n) ? null : n
  }

  const isFullAgency = inputs.scopeOfSale === 1.0

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Transaction Structure */}
      <Card className="border-border bg-card">
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
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5"
              >
                <RadioGroupItem value={opt.value} />
                {opt.label}
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 2. Book Longevity */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            2. Book Longevity Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="yearEstablished" className="text-sm text-muted-foreground">Year Established</Label>
          <Input
            id="yearEstablished"
            type="number"
            placeholder="e.g. 1998"
            value={inputs.yearEstablished ?? ""}
            onChange={(e) => update({ yearEstablished: numOrNull(e.target.value) })}
            className="mt-1.5"
          />
        </CardContent>
      </Card>

      {/* 3. Demographic & Operational Profile */}
      <Card className="border-border bg-card">
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
            <Input id="empCount" type="number" placeholder="e.g. 5" value={inputs.employeeCount ?? ""} onChange={(e) => update({ employeeCount: numOrNull(e.target.value) })} className="mt-1.5" />
          </div>
          <div>
            <Label className="mb-2 block text-sm text-muted-foreground">Office Structure</Label>
            <RadioGroup value={inputs.officeStructure} onValueChange={(v) => update({ officeStructure: v })} className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              {["Virtual", "Hybrid", "BrickAndMortar"].map((opt) => (
                <label key={opt} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5">
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
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            4. Legal & Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="eoClaims" className="text-sm text-muted-foreground">E&O Claims (Past 3 Years)</Label>
            <Input id="eoClaims" type="number" placeholder="0" value={inputs.eoClaims ?? ""} onChange={(e) => update({ eoClaims: numOrNull(e.target.value) ?? 0 })} className="mt-1.5" />
          </div>
          <div>
            <Label className="mb-2 block text-sm text-muted-foreground">Producer Agreements</Label>
            <RadioGroup value={inputs.producerAgreements} onValueChange={(v) => update({ producerAgreements: v })} className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              {[
                { value: "strong", label: "Strong (Non-Compete/Solicit)" },
                { value: "weak", label: "Weak / Informal" },
                { value: "none", label: "None" },
              ].map((opt) => (
                <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5">
                  <RadioGroupItem value={opt.value} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* 5. Financial & Valuation Benchmarks */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            5. Financial & Valuation Benchmarks
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="revLTM" className="text-sm text-muted-foreground">Annual Revenue (LTM) *</Label>
            <Input id="revLTM" type="number" placeholder="e.g. 1500000" value={inputs.revenueLTM ?? ""} onChange={(e) => update({ revenueLTM: numOrNull(e.target.value) })} className="mt-1.5" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="revY2" className="text-sm text-muted-foreground">Revenue Y-2</Label>
              <Input id="revY2" type="number" placeholder="Prior year" value={inputs.revenueY2 ?? ""} onChange={(e) => update({ revenueY2: numOrNull(e.target.value) })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="revY3" className="text-sm text-muted-foreground">Revenue Y-3</Label>
              <Input id="revY3" type="number" placeholder="2 years ago" value={inputs.revenueY3 ?? ""} onChange={(e) => update({ revenueY3: numOrNull(e.target.value) })} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="sde" className="text-sm text-muted-foreground">SDE / EBITDA *</Label>
            <Input id="sde" type="number" placeholder="e.g. 400000" value={inputs.sdeEbitda ?? ""} onChange={(e) => update({ sdeEbitda: numOrNull(e.target.value) })} className="mt-1.5" />
            <p className="mt-1 text-xs text-muted-foreground/70">
              {"Net Income + Owner Comp + Non-Recurring Expenses + Depreciation"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 6. Book of Business Quality */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            6. Book of Business Quality
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="retention" className="text-sm text-muted-foreground">Retention Rate (%) *</Label>
            <Input id="retention" type="number" placeholder="e.g. 92" value={inputs.retentionRate ?? ""} onChange={(e) => update({ retentionRate: numOrNull(e.target.value) })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="policyMix" className="text-sm text-muted-foreground">Commercial Lines Mix (%) *</Label>
            <Input id="policyMix" type="number" placeholder="e.g. 60" value={inputs.policyMix ?? ""} onChange={(e) => update({ policyMix: numOrNull(e.target.value) })} className="mt-1.5" />
            <p className="mt-1 text-xs text-muted-foreground/70">% of premium that is Commercial Lines</p>
          </div>
          <div>
            <Label htmlFor="concentration" className="text-sm text-muted-foreground">Client Concentration (%) *</Label>
            <Input id="concentration" type="number" placeholder="e.g. 15" value={inputs.clientConcentration ?? ""} onChange={(e) => update({ clientConcentration: numOrNull(e.target.value) })} className="mt-1.5" />
            <p className="mt-1 text-xs text-muted-foreground/70">% of revenue from your top 10 clients</p>
          </div>
        </CardContent>
      </Card>

      {/* 7. Operational / Transferability */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            7. Operational / Transferability
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="carrierDiv" className="text-sm text-muted-foreground">Carrier Diversification (%)</Label>
            <Input id="carrierDiv" type="number" placeholder="% from top carrier" value={inputs.carrierDiversification ?? ""} onChange={(e) => update({ carrierDiversification: numOrNull(e.target.value) })} className="mt-1.5" />
            <p className="mt-1 text-xs text-muted-foreground/70">% of premium from your single largest carrier</p>
          </div>
          <div>
            <Label htmlFor="rpe" className="text-sm text-muted-foreground">Revenue Per Employee ($)</Label>
            <Input id="rpe" type="number" placeholder="e.g. 175000" value={inputs.revenuePerEmployee ?? ""} onChange={(e) => update({ revenuePerEmployee: numOrNull(e.target.value) })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="topCarriers" className="text-sm text-muted-foreground">Top 5 Carriers (Optional)</Label>
            <Textarea id="topCarriers" placeholder="e.g. Progressive, Safeco, Hartford..." value={inputs.topCarriers} onChange={(e) => update({ topCarriers: e.target.value })} className="mt-1.5" rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Conditional: Full Agency Due Diligence */}
      {isFullAgency && (
        <Card className="border-primary/30 bg-card">
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
                  <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5">
                    <RadioGroupItem value={opt.value} />
                    {opt.label}
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="payroll" className="text-sm text-muted-foreground">Annual Payroll Cost ($)</Label>
                <Input id="payroll" type="number" placeholder="e.g. 200000" value={inputs.annualPayrollCost ?? ""} onChange={(e) => update({ annualPayrollCost: numOrNull(e.target.value) })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="ownerComp" className="text-sm text-muted-foreground">Owner Compensation ($)</Label>
                <Input id="ownerComp" type="number" placeholder="e.g. 120000" value={inputs.ownerCompensation ?? ""} onChange={(e) => update({ ownerCompensation: numOrNull(e.target.value) })} className="mt-1.5" />
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
                  <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5">
                    <RadioGroupItem value={opt.value} />
                    {opt.label}
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="newBiz" className="text-sm text-muted-foreground">Monthly New Business Value ($)</Label>
                <Input id="newBiz" type="number" placeholder="e.g. 25000" value={inputs.newBusinessValue ?? ""} onChange={(e) => update({ newBusinessValue: numOrNull(e.target.value) })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="clientTenure" className="text-sm text-muted-foreground">Avg Client Tenure (years)</Label>
                <Input id="clientTenure" type="number" placeholder="e.g. 8" value={inputs.avgClientTenure ?? ""} onChange={(e) => update({ avgClientTenure: numOrNull(e.target.value) })} className="mt-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
