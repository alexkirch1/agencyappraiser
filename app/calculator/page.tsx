"use client"

import { useState, useMemo } from "react"
import { ValuationForm } from "@/components/calculator/valuation-form"
import { ValuationSidebar } from "@/components/calculator/valuation-sidebar"
import { LeadCaptureModal } from "@/components/lead-capture-modal"
import { calculateValuation, runRiskAudit, type ValuationInputs } from "@/components/calculator/valuation-engine"
import { Button } from "@/components/ui/button"
import { Lock, Unlock } from "lucide-react"

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
  const [submitted, setSubmitted] = useState(false)
  const [showLeadCapture, setShowLeadCapture] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  const results = useMemo(() => {
    if (!submitted) return null
    return calculateValuation(inputs)
  }, [inputs, submitted])

  const riskAudit = useMemo(() => {
    if (!submitted) return { items: [], grade: "?", gradeColor: "text-muted-foreground", summaryText: "Submit your data to see results." }
    return runRiskAudit(inputs)
  }, [inputs, submitted])

  const handleSubmit = () => {
    if (unlocked) {
      setSubmitted(true)
    } else {
      setShowLeadCapture(true)
    }
  }

  const handleLeadSubmit = () => {
    setUnlocked(true)
    setShowLeadCapture(false)
    setSubmitted(true)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Agency Valuation Calculator</h1>
        <p className="mt-2 text-muted-foreground">
          Our weighted scorecard analyzes 7 risk categories to calculate a data-driven valuation multiple.
          Fill in your details and submit to see your results.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Form (left) */}
        <div className="w-full lg:w-[60%]">
          <ValuationForm inputs={inputs} onChange={(newInputs) => {
            setInputs(newInputs)
            if (submitted) setSubmitted(false)
          }} />

          {/* Submit Button */}
          <div className="mt-6">
            <Button onClick={handleSubmit} size="lg" className="w-full gap-2 text-base">
              {unlocked ? (
                <>
                  <Unlock className="h-5 w-5" />
                  Calculate Valuation
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Submit & Unlock Valuation
                </>
              )}
            </Button>
            {!unlocked && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                You will be asked for your name and email to view results.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar (right) */}
        <div className="w-full lg:sticky lg:top-24 lg:w-[40%] lg:self-start">
          <ValuationSidebar results={results} riskAudit={riskAudit} />
        </div>
      </div>

      {showLeadCapture && (
        <LeadCaptureModal
          onSubmit={handleLeadSubmit}
          title="Unlock Your Agency Valuation"
          description="Enter your details to view your complete valuation report with risk audit and deal simulator."
        />
      )}
    </div>
  )
}
