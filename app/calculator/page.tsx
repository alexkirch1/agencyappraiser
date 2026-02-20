"use client"

import { useState, useMemo } from "react"
import { ValuationForm } from "@/components/calculator/valuation-form"
import { ValuationSidebar } from "@/components/calculator/valuation-sidebar"
import { LeadCaptureModal } from "@/components/lead-capture-modal"
import { calculateValuation, runRiskAudit, type ValuationInputs } from "@/components/calculator/valuation-engine"
import { Button } from "@/components/ui/button"
import { Lock, Unlock, AlertCircle } from "lucide-react"

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

const REQUIRED_FIELDS: { key: keyof ValuationInputs; label: string }[] = [
  { key: "revenueLTM", label: "Annual Revenue (LTM)" },
  { key: "sdeEbitda", label: "SDE / EBITDA" },
  { key: "retentionRate", label: "Retention Rate" },
  { key: "policyMix", label: "Commercial Lines Mix" },
  { key: "clientConcentration", label: "Client Concentration" },
]

function getMissingFields(inputs: ValuationInputs): string[] {
  return REQUIRED_FIELDS.filter(({ key }) => {
    const val = inputs[key]
    return val === null || val === "" || val === 0
  }).map(({ label }) => label)
}

function getInvalidFieldKeys(inputs: ValuationInputs): string[] {
  return REQUIRED_FIELDS.filter(({ key }) => {
    const val = inputs[key]
    return val === null || val === "" || val === 0
  }).map(({ key }) => key)
}

export default function CalculatorPage() {
  const [inputs, setInputs] = useState<ValuationInputs>(defaultInputs)
  const [submitted, setSubmitted] = useState(false)
  const [showLeadCapture, setShowLeadCapture] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [triedSubmit, setTriedSubmit] = useState(false)

  const results = useMemo(() => {
    if (!submitted) return null
    return calculateValuation(inputs)
  }, [inputs, submitted])

  const riskAudit = useMemo(() => {
    if (!submitted) return { items: [], grade: "?", gradeColor: "text-muted-foreground", summaryText: "Submit your data to see results." }
    return runRiskAudit(inputs)
  }, [inputs, submitted])

  const handleSubmit = () => {
    setTriedSubmit(true)
    const missing = getMissingFields(inputs)
    if (missing.length > 0) {
      setValidationErrors(missing)
      // Scroll to first missing field
      const firstKey = getInvalidFieldKeys(inputs)[0]
      const el = document.getElementById(`field-${firstKey}`)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    setValidationErrors([])
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

  const invalidKeys = triedSubmit ? getInvalidFieldKeys(inputs) : []

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Agency Valuation Calculator</h1>
        <p className="mt-2 text-muted-foreground">
          Our weighted scorecard analyzes 7 risk categories to calculate a data-driven valuation multiple.
          Fill in the required fields and submit to see your results.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Form (left) */}
        <div className="w-full lg:w-[60%]">
          <ValuationForm
            inputs={inputs}
            onChange={(newInputs) => {
              setInputs(newInputs)
              // Clear submitted so recalculation requires re-submit
              if (submitted) setSubmitted(false)
              // Clear validation errors as user types
              if (triedSubmit) {
                const stillMissing = getMissingFields(newInputs)
                setValidationErrors(stillMissing)
              }
            }}
            invalidFields={invalidKeys}
          />

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Please fill in the following required fields:</p>
                  <ul className="mt-1.5 list-inside list-disc text-sm text-destructive/80">
                    {validationErrors.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

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
          onClose={() => setShowLeadCapture(false)}
          title="Unlock Your Agency Valuation"
          description="Enter your details to view your complete valuation report with risk audit and deal simulator."
        />
      )}
    </div>
  )
}
