"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SmartInput } from "@/components/ui/smart-input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InfoTip } from "@/components/ui/info-tip"
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

  const isFullAgency = inputs.scopeOfSale === 1.0 || inputs.scopeOfSale === null

  const isInvalid = (key: string) => invalidFields.includes(key)

  const fieldBorder = (key: string) =>
    isInvalid(key) ? "ring-2 ring-destructive border-destructive" : ""

  const requiredStar = (label: string) => (
    <span>{label} <span className="text-destructive">*</span></span>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* 0. Agency Type */}
      <Card className={inputs.agencyType === "captive" ? "border-destructive/50 bg-destructive/5" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            Is this a Captive or Independent Agency?
            <InfoTip text="A captive agency is contracted exclusively with one carrier (e.g. State Farm, Allstate, Farmers). An independent agency can place business with multiple carriers. This is the single most important structural question for a buyer." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={inputs.agencyType}
            onValueChange={(v) => update({ agencyType: v as "independent" | "captive" })}
            className="flex flex-col gap-2 sm:flex-row sm:gap-4"
          >
            {[
              { value: "independent", label: "Independent Agency", sub: "Multi-carrier, can place anywhere" },
              { value: "captive", label: "Captive Agency", sub: "Tied to one carrier (State Farm, Allstate, etc.)" },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex flex-1 cursor-pointer items-start gap-3 rounded-md border px-4 py-3 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/10 ${
                  opt.value === "captive" && inputs.agencyType === "captive"
                    ? "border-destructive/50 bg-destructive/5 has-[data-state=checked]:border-destructive has-[data-state=checked]:bg-destructive/10"
                    : "border-border"
                }`}
              >
                <RadioGroupItem value={opt.value} className="mt-0.5 shrink-0" />
                <span>
                  <span className="block font-medium">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.sub}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
          {inputs.agencyType === "captive" && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5">
              <span className="mt-0.5 shrink-0 text-destructive">&#9888;</span>
              <p className="text-xs text-destructive leading-relaxed">
                <span className="font-semibold">Captive agencies receive a 35% valuation discount.</span>{" "}
                Carrier restrictions prevent free transfer of the book, require carrier approval on any sale, and significantly limit the pool of qualified buyers. Most acquirers prefer independent books.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 1. Transaction Structure */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            1. Transaction Structure & Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="mb-3 block text-sm text-muted-foreground">{requiredStar("Scope of Sale")}<InfoTip text="Are you selling the entire agency (staff, brand, systems, and book), just a book of business, or select accounts? Full agency sales include everything." /></Label>
          <RadioGroup
            value={inputs.scopeOfSale != null ? String(inputs.scopeOfSale) : ""}
            onValueChange={(v) => update({ scopeOfSale: parseFloat(v) })}
            className="flex flex-col gap-2 sm:flex-row sm:gap-4"
          >
            {[
              { value: "1", label: "Full Agency" },
              { value: "0.95", label: "Book Purchase" },
              { value: "0.9", label: "Fragmented" },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2.5 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/10 ${
                  isInvalid("scopeOfSale") ? "border-destructive" : "border-border"
                }`}
              >
                <RadioGroupItem value={opt.value} />
                {opt.label}
              </label>
            ))}
          </RadioGroup>
          {isInvalid("scopeOfSale") && <p className="mt-1 text-xs text-destructive">Please select a scope of sale</p>}
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
          <Label htmlFor="yearEstablished" className="text-sm text-muted-foreground">Year Established<InfoTip text="The year your agency first began operating. Longer track records signal stability to buyers." /></Label>
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
            <Label className="text-sm text-muted-foreground">Primary State<InfoTip text="The state where your agency is primarily licensed and operates. Regional markets vary in demand." /></Label>
            <Select value={inputs.primaryState} onValueChange={(v) => update({ primaryState: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="empCount" className="text-sm text-muted-foreground">Number of Employees<InfoTip text="Total headcount including the owner, full-time staff, and part-time (count part-time as 0.5). This helps measure operational efficiency." /></Label>
            <SmartInput id="empCount" inputType="count" placeholder="e.g. 5" value={inputs.employeeCount} onValueChange={(v) => update({ employeeCount: v })} className="mt-1.5" />
          </div>
          <div>
            <Label className="mb-2 block text-sm text-muted-foreground">Office Structure<InfoTip text="How does your team work day-to-day? Virtual means fully remote, Hybrid is a mix, Brick & Mortar is a physical office." /></Label>
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
            <Label htmlFor="eoClaims" className="text-sm text-muted-foreground">{"E&O Claims (Past 3 Years)"}<InfoTip text="How many Errors & Omissions claims have been filed against your agency in the last 3 years? Zero is ideal -- claims can raise concerns during due diligence." /></Label>
            <SmartInput id="eoClaims" inputType="count" placeholder="0" value={inputs.eoClaims} onValueChange={(v) => update({ eoClaims: v ?? 0 })} className="mt-1.5" />
          </div>
          <div>
            <Label className="mb-2 block text-sm text-muted-foreground">Producer Agreements<InfoTip text="Do your producers have signed non-compete or non-solicitation agreements? These protect the book from leaving with staff after a sale." /></Label>
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
            <Label htmlFor="revLTM" className="text-sm text-muted-foreground">{requiredStar("Annual Revenue (LTM)")}<InfoTip text="Your total commission and fee income for the last 12 months. Include all revenue sources. This is the number your valuation multiple gets applied to." /></Label>
            <SmartInput id="revLTM" inputType="currency" placeholder="e.g. 1500000" value={inputs.revenueLTM} onValueChange={(v) => update({ revenueLTM: v })} className={`mt-1.5 ${fieldBorder("revenueLTM")}`} />
            {isInvalid("revenueLTM") && <p className="mt-1 text-xs text-destructive">Revenue is required for valuation</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="revY2" className="text-sm text-muted-foreground">Revenue Y-2<InfoTip text="Your total revenue from the year before last. Used alongside current revenue to calculate your growth trend." /></Label>
              <SmartInput id="revY2" inputType="currency" placeholder="Prior year" value={inputs.revenueY2} onValueChange={(v) => update({ revenueY2: v })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="revY3" className="text-sm text-muted-foreground">Revenue Y-3</Label>
              <SmartInput id="revY3" inputType="currency" placeholder="2 years ago" value={inputs.revenueY3} onValueChange={(v) => update({ revenueY3: v })} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label className="mb-2 block text-sm text-muted-foreground">
              Revenue Growth Trend (Last 3 Years)
              <InfoTip text="If you do not have the exact Y-2/Y-3 numbers above, select the best description of your revenue trajectory. This will be used in your risk audit and valuation scoring." />
            </Label>
            <RadioGroup
              value={inputs.revenueGrowthTrend}
              onValueChange={(v) => update({ revenueGrowthTrend: v })}
              className="flex flex-col gap-2"
            >
              {[
                { value: "strong",    label: "Strong Growth",    sub: "10%+ per year" },
                { value: "moderate",  label: "Moderate Growth",  sub: "3–9% per year" },
                { value: "flat",      label: "Flat",             sub: "Roughly the same" },
                { value: "declining", label: "Declining",        sub: "Revenue has decreased" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-4 py-2.5 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/10"
                >
                  <RadioGroupItem value={opt.value} />
                  <span className="flex-1">
                    <span className="font-medium">{opt.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{opt.sub}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div id="field-sdeEbitda">
            <Label htmlFor="sde" className="text-sm text-muted-foreground">{requiredStar("SDE / EBITDA")}<InfoTip text="Seller's Discretionary Earnings: net income plus owner compensation, non-recurring expenses, and depreciation. It shows what an owner actually takes home from the business." /></Label>
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
            <Label htmlFor="retention" className="text-sm text-muted-foreground">{requiredStar("Retention Rate (%)")}<InfoTip text="The percentage of clients who renew each year. Check your management system for your actual renewal rate. This is one of the most heavily weighted factors in your valuation." /></Label>
            <SmartInput id="retention" inputType="percent" placeholder="e.g. 92" value={inputs.retentionRate} onValueChange={(v) => update({ retentionRate: v })} className={`mt-1.5 ${fieldBorder("retentionRate")}`} />
            {isInvalid("retentionRate") && <p className="mt-1 text-xs text-destructive">Retention rate is required</p>}
          </div>
          <div id="field-policyMix">
            <Label htmlFor="policyMix" className="text-sm text-muted-foreground">{requiredStar("Commercial Lines Mix (%)")}<InfoTip text="What percentage of your total written premium comes from commercial lines vs. personal lines? Enter as a whole number (e.g. 60 for 60% commercial)." /></Label>
            <SmartInput id="policyMix" inputType="percent" placeholder="e.g. 60" value={inputs.policyMix} onValueChange={(v) => update({ policyMix: v })} className={`mt-1.5 ${fieldBorder("policyMix")}`} />
            <p className="mt-1 text-xs text-muted-foreground/70">% of premium that is Commercial Lines</p>
            {isInvalid("policyMix") && <p className="mt-0.5 text-xs text-destructive">Policy mix is required</p>}
          </div>
          <div id="field-clientConcentration">
            <Label htmlFor="concentration" className="text-sm text-muted-foreground">{requiredStar("Client Concentration (%)")}<InfoTip text="What share of your total revenue comes from your 10 largest clients? High concentration means more risk if a key account leaves." /></Label>
            <SmartInput id="concentration" inputType="percent" placeholder="e.g. 15" value={inputs.clientConcentration} onValueChange={(v) => update({ clientConcentration: v })} className={`mt-1.5 ${fieldBorder("clientConcentration")}`} />
            <p className="mt-1 text-xs text-muted-foreground/70">% of revenue from your top 10 clients</p>
            {isInvalid("clientConcentration") && <p className="mt-0.5 text-xs text-destructive">Client concentration is required</p>}
          </div>
          <div>
            <Label className="mb-1.5 block text-sm text-muted-foreground">
              Active Customers &amp; Policies
              <InfoTip text="Total active customers (households or accounts) and total active policies. We calculate your policies-per-customer ratio, which signals how well-rounded and sticky your book is." />
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="activeCustomers" className="text-xs text-muted-foreground">Active Customers</Label>
                <SmartInput
                  id="activeCustomers"
                  inputType="count"
                  placeholder="e.g. 850"
                  value={inputs.activeCustomers}
                  onValueChange={(v) => update({ activeCustomers: v })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="activePolicies" className="text-xs text-muted-foreground">Active Policies</Label>
                <SmartInput
                  id="activePolicies"
                  inputType="count"
                  placeholder="e.g. 1420"
                  value={inputs.activePolicies}
                  onValueChange={(v) => update({ activePolicies: v })}
                  className="mt-1"
                />
              </div>
            </div>
            {inputs.activeCustomers && inputs.activePolicies && inputs.activeCustomers > 0 && (
              <div className="mt-2 flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
                <span className="text-xs text-muted-foreground">Policies per customer</span>
                <span className="font-mono text-sm font-bold text-foreground">
                  {(inputs.activePolicies / inputs.activeCustomers).toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="lossRatio" className="text-sm text-muted-foreground">
              Loss Ratio (%)
              <InfoTip text="Your book's loss ratio from carrier reports — total claims paid divided by total premium. Lower is better. Under 50% is excellent, 50-65% is average, over 65% is a red flag for buyers." />
            </Label>
            <SmartInput
              id="lossRatio"
              inputType="percent"
              placeholder="e.g. 45"
              value={inputs.lossRatio}
              onValueChange={(v) => update({ lossRatio: v })}
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground/70">Claims paid ÷ premium earned</p>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm text-muted-foreground">
              Average Premium Per Policy
              <InfoTip text="Your total written premium divided by total policies. Higher average premiums (e.g., $2,000+) signal larger, stickier accounts. Enter your total premium and we'll calculate it, or enter the average directly." />
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="totalWrittenPremium" className="text-xs text-muted-foreground">Total Written Premium</Label>
                <SmartInput
                  id="totalWrittenPremium"
                  inputType="currency"
                  placeholder="e.g. 3500000"
                  value={inputs.totalWrittenPremium}
                  onValueChange={(v) => update({ totalWrittenPremium: v })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="avgPremiumPerPolicy" className="text-xs text-muted-foreground">Avg Premium (or override)</Label>
                <SmartInput
                  id="avgPremiumPerPolicy"
                  inputType="currency"
                  placeholder="e.g. 2100"
                  value={inputs.avgPremiumPerPolicy}
                  onValueChange={(v) => update({ avgPremiumPerPolicy: v })}
                  className="mt-1"
                />
              </div>
            </div>
            {inputs.totalWrittenPremium && inputs.activePolicies && inputs.activePolicies > 0 && !inputs.avgPremiumPerPolicy && (
              <div className="mt-2 flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
                <span className="text-xs text-muted-foreground">Calculated avg premium</span>
                <span className="font-mono text-sm font-bold text-foreground">
                  ${Math.round(inputs.totalWrittenPremium / inputs.activePolicies).toLocaleString()}
                </span>
              </div>
            )}
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
            <Label htmlFor="carrierDiv" className="text-sm text-muted-foreground">Carrier Diversification (%)<InfoTip text="What percentage of your total premium is placed with your single largest carrier? Lower means a more diversified book." /></Label>
            <SmartInput id="carrierDiv" inputType="percent" placeholder="% from top carrier" value={inputs.carrierDiversification} onValueChange={(v) => update({ carrierDiversification: v })} className="mt-1.5" />
            <p className="mt-1 text-xs text-muted-foreground/70">% of premium from your single largest carrier</p>
          </div>
          <div>
            <Label htmlFor="rpe" className="text-sm text-muted-foreground">Revenue Per Employee ($)<InfoTip text="Your annual revenue divided by your employee count. If you entered both above, we can calculate this for you. Industry average is around $150K-$200K." /></Label>
            <SmartInput id="rpe" inputType="currency" placeholder="e.g. 175000" value={inputs.revenuePerEmployee} onValueChange={(v) => update({ revenuePerEmployee: v })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="topCarriers" className="text-sm text-muted-foreground">Top 5 Carriers (Optional)</Label>
            <Textarea id="topCarriers" placeholder="e.g. Progressive, Safeco, Hartford..." value={inputs.topCarriers} onChange={(e) => update({ topCarriers: e.target.value })} className="mt-1.5" rows={2} />
          </div>
          <div>
            <Label className="mb-2 block text-sm text-muted-foreground">
              How soon would you like to sell?
              <InfoTip text="Your desired sale timeline affects buyer urgency and deal structuring. Buyers value certainty — a clear timeline helps them plan financing and integration." />
            </Label>
            <RadioGroup
              value={inputs.sellerTransitionMonths != null ? String(inputs.sellerTransitionMonths) : ""}
              onValueChange={(v) => update({ sellerTransitionMonths: parseInt(v) })}
              className="flex flex-col gap-2"
            >
              {[
                { value: "0",  label: "As Soon As Possible",  sub: "Ready to close within 60 days" },
                { value: "6",  label: "Within 6 Months",      sub: "Actively looking to sell soon" },
                { value: "12", label: "Within 12 Months",     sub: "Planning ahead, not urgent" },
                { value: "24", label: "1–2 Years Out",        sub: "Exploring options early" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-4 py-2.5 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/10"
                >
                  <RadioGroupItem value={opt.value} />
                  <span className="flex-1">
                    <span className="font-medium">{opt.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{opt.sub}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
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
              <Label className="mb-2 block text-sm text-muted-foreground">Closing Timeline<InfoTip text="How quickly are you looking to complete the sale? Urgent means under 60 days, Standard is 3-6 months, Long is 6+ months." /></Label>
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
              <Label className="mb-2 block text-sm text-muted-foreground">Staff Retention Risk<InfoTip text="How likely is your staff to stay through and after a transition? Secure means they have employment contracts, High Risk means key people may leave." /></Label>
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
                <Label htmlFor="newBiz" className="text-sm text-muted-foreground">Monthly New Business Value ($)<InfoTip text="Average monthly premium from brand new policies written. This shows whether the agency is actively growing or just maintaining renewals." /></Label>
                <SmartInput id="newBiz" inputType="currency" placeholder="e.g. 25000" value={inputs.newBusinessValue} onValueChange={(v) => update({ newBusinessValue: v })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="clientTenure" className="text-sm text-muted-foreground">Avg Client Tenure (years)<InfoTip text="On average, how many years have your clients been with your agency? Longer tenure suggests loyalty and lower churn risk." /></Label>
                <SmartInput id="clientTenure" inputType="count" placeholder="e.g. 8" value={inputs.avgClientTenure} onValueChange={(v) => update({ avgClientTenure: v })} className="mt-1.5" max={99} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
