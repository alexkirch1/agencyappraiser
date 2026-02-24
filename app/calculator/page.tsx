"use client"

import { useState, useMemo } from "react"
import { ValuationForm } from "@/components/calculator/valuation-form"
import { ValuationSidebar } from "@/components/calculator/valuation-sidebar"
import { LeadCaptureModal } from "@/components/lead-capture-modal"
import { ValuationDisclaimerModal } from "@/components/valuation-disclaimer-modal"
import { DealSimulator } from "@/components/calculator/deal-simulator"
import { RiskAudit } from "@/components/calculator/risk-audit"
import { calculateValuation, runRiskAudit, type ValuationInputs } from "@/components/calculator/valuation-engine"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, Unlock, AlertCircle } from "lucide-react"

const defaultInputs: ValuationInputs = {
  scopeOfSale: null,
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
  { key: "scopeOfSale", label: "Scope of Sale" },
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
  const [showDisclaimer, setShowDisclaimer] = useState(false)
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
      const firstKey = getInvalidFieldKeys(inputs)[0]
      const el = document.getElementById(`field-${firstKey}`)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    setValidationErrors([])
    if (unlocked) {
      // Already unlocked: show disclaimer loading, then results
      setShowDisclaimer(true)
    } else {
      setShowLeadCapture(true)
    }
  }

  const handleLeadSubmit = () => {
    setUnlocked(true)
    setShowLeadCapture(false)
    // Show disclaimer after lead capture
    setShowDisclaimer(true)
  }

  const handleDisclaimerContinue = () => {
    setShowDisclaimer(false)
    setSubmitted(true)
    // Scroll to results
    setTimeout(() => {
      const el = document.getElementById("valuation-results")
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
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
              if (submitted) setSubmitted(false)
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

      {/* Deal Simulator & Risk Audit -- shown below after valuation is complete */}
      {results && (
        <div id="valuation-results" className="mt-12 border-t border-border pt-10">
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground">
            Deep Dive: Deal Simulator & Risk Audit
          </h2>
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Deal Simulator */}
            <div>
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-foreground">Deal Structure Simulator</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Explore different deal structures and see how cash vs. earnout affects your total payout.
                  </p>
                </CardHeader>
                <CardContent>
                  <DealSimulator highOffer={results.highOffer} coreScore={results.coreScore} />
                </CardContent>
              </Card>
            </div>

            {/* Risk Audit */}
            <div>
              <Card className="border-border bg-card p-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-foreground">Risk Audit Report</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    A detailed breakdown of risks and strengths identified from your inputs.
                  </p>
                </CardHeader>
                <CardContent>
                  <RiskAudit data={riskAudit} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showLeadCapture && (
        <LeadCaptureModal
          onSubmit={handleLeadSubmit}
          onClose={() => setShowLeadCapture(false)}
          title="Unlock Your Agency Valuation"
          description="Enter your details to view your complete valuation report with risk audit and deal simulator."
          toolUsed="Agency Valuation Calculator"
          valuationSummary={`Revenue (LTM): $${inputs.revenueLTM?.toLocaleString() ?? "N/A"}\nSDE/EBITDA: $${inputs.sdeEbitda?.toLocaleString() ?? "N/A"}\nRetention Rate: ${inputs.retentionRate ?? "N/A"}%\nCommercial Mix: ${inputs.policyMix ?? "N/A"}%\nClient Concentration: ${inputs.clientConcentration ?? "N/A"}%\nCarrier Diversification: ${inputs.carrierDiversification ?? "N/A"}%\nYear Established: ${inputs.yearEstablished ?? "N/A"}\nState: ${inputs.primaryState || "N/A"}\nEmployees: ${inputs.employeeCount ?? "N/A"}`}
          estimatedValue={inputs.revenueLTM ?? 0}
          valuationData={{
            revenueLTM: inputs.revenueLTM,
            sdeEbitda: inputs.sdeEbitda,
            retentionRate: inputs.retentionRate,
            policyMix: inputs.policyMix,
            clientConcentration: inputs.clientConcentration,
            carrierDiversification: inputs.carrierDiversification,
            yearEstablished: inputs.yearEstablished,
            primaryState: inputs.primaryState,
            employeeCount: inputs.employeeCount,
            scopeOfSale: inputs.scopeOfSale,
          }}
        />
      )}
      {showDisclaimer && (
        <ValuationDisclaimerModal onContinue={handleDisclaimerContinue} />
      )}
    </div>
  )
}
