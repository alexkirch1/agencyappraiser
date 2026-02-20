"use client"

import { useState, useMemo } from "react"
import { ValuationForm } from "@/components/calculator/valuation-form"
import { ValuationSidebar } from "@/components/calculator/valuation-sidebar"
import { calculateValuation, runRiskAudit, type ValuationInputs } from "@/components/calculator/valuation-engine"

const defaultInputs: ValuationInputs = {
  scopeOfSale: 1.0,
  yearEstablished: null,
  primaryState: "",
  employeeCount: null,
  officeStructure: "",
  agencyDescription: "",
  eoClaims: 0,
  producerAgreements: "",
  revenueLTM: null,
  revenueY2: null,
  revenueY3: null,
  sdeEbitda: null,
  retentionRate: null,
  policyMix: null,
  clientConcentration: null,
  carrierDiversification: null,
  revenuePerEmployee: null,
  topCarriers: "",
  closingTimeline: "",
  annualPayrollCost: null,
  ownerCompensation: null,
  staffRetentionRisk: "",
  newBusinessValue: null,
  avgClientTenure: null,
}

export default function CalculatorPage() {
  const [inputs, setInputs] = useState<ValuationInputs>(defaultInputs)

  const results = useMemo(() => calculateValuation(inputs), [inputs])
  const riskAudit = useMemo(() => runRiskAudit(inputs), [inputs])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Agency Valuation Calculator</h1>
        <p className="mt-2 text-muted-foreground">
          Our weighted scorecard analyzes 7 risk categories to calculate a data-driven valuation multiple.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Form (left) */}
        <div className="w-full lg:w-[60%]">
          <ValuationForm inputs={inputs} onChange={setInputs} />
        </div>

        {/* Sidebar (right) */}
        <div className="w-full lg:sticky lg:top-24 lg:w-[40%] lg:self-start">
          <ValuationSidebar results={results} riskAudit={riskAudit} />
        </div>
      </div>
    </div>
  )
}
