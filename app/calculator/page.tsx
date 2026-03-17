"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ValuationForm } from "@/components/calculator/valuation-form"
import { ValuationSidebar } from "@/components/calculator/valuation-sidebar"
import { LeadCaptureModal } from "@/components/lead-capture-modal"
import { ValuationDisclaimerModal } from "@/components/valuation-disclaimer-modal"
import { DealSimulator } from "@/components/calculator/deal-simulator"
import { RiskAudit } from "@/components/calculator/risk-audit"
import { calculateValuation, runRiskAudit, type ValuationInputs } from "@/components/calculator/valuation-engine"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, Unlock, AlertCircle, ClipboardCheck, ArrowRight, Pencil, Download } from "lucide-react"
import Link from "next/link"
import { downloadValuationPDF } from "@/lib/generate-pdf"
import { MarketIntelPanel } from "@/components/market-intel-panel"
import { BenchmarkComparison } from "@/components/calculator/benchmark-comparison"
import { FeedbackWidget } from "@/components/feedback-widget"

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
  revenueGrowthTrend: "",
  activeCustomers: null,
  activePolicies: null,
  lossRatio: null,
  avgPremiumPerPolicy: null,
  totalWrittenPremium: null,
  sellerTransitionMonths: null,
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

function CalculatorContent() {
  const searchParams = useSearchParams()
  const [inputs, setInputs] = useState<ValuationInputs>(() => {
    const rev = searchParams.get("rev")
    if (rev) {
      const n = parseFloat(rev)
      if (!isNaN(n) && n > 0) return { ...defaultInputs, revenueLTM: n }
    }
    return defaultInputs
  })
  const [submitted, setSubmitted] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showLeadCapture, setShowLeadCapture] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [triedSubmit, setTriedSubmit] = useState(false)
  const [leadId, setLeadId] = useState<number | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  // Pre-fill revenue from URL param if navigated from quick-value
  useEffect(() => {
    const rev = searchParams.get("rev")
    if (rev) {
      const n = parseFloat(rev)
      if (!isNaN(n) && n > 0) {
        setInputs(prev => prev.revenueLTM ? prev : { ...prev, revenueLTM: n })
      }
    }
  }, [searchParams])

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
      // Already unlocked (first submit or resubmit after edit)
      setShowDisclaimer(true)
    } else {
      setShowLeadCapture(true)
    }
  }

  const saveFullValuation = async (id: number | null, calcResults: ReturnType<typeof calculateValuation> | null) => {
    try {
      await fetch("/api/save-full-valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: id,
          inputs,
          results: calcResults ? {
            lowOffer: calcResults.lowOffer,
            highOffer: calcResults.highOffer,
            coreScore: calcResults.coreScore,
            calculatedMultiple: calcResults.calculatedMultiple,
            riskGrade: calcResults.riskLevel?.text ?? null,
          } : null,
        }),
      })
    } catch (err) {
      console.error("[v0] save-full-valuation failed:", err)
    }
  }

  const handleLeadSubmit = async (_leadData: { name: string; email: string; phone: string; agencyName: string }, returnedLeadId?: number | null) => {
    setUnlocked(true)
    setShowLeadCapture(false)
    if (returnedLeadId) setLeadId(returnedLeadId)
    try { sessionStorage.setItem("fullCalcCompleted", "true") } catch {}
    setShowDisclaimer(true)
  }

  const handleDisclaimerContinue = async () => {
    setShowDisclaimer(false)
    setSubmitted(true)
    setEditing(false)
    // Calculate results then save to DB
    const calcResults = calculateValuation(inputs)
    const currentLeadId = leadId
    saveFullValuation(currentLeadId, calcResults)
    setTimeout(() => {
      const el = document.getElementById("valuation-results")
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }

  const invalidKeys = (triedSubmit && (!submitted || editing)) ? getInvalidFieldKeys(inputs) : []

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

          {/* Submitted + locked banner */}
          {submitted && !editing && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3">
              <p className="text-sm text-muted-foreground">Your inputs are locked. Edit to make changes and resubmit.</p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0 ml-4"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            </div>
          )}

          <div className={submitted && !editing ? "pointer-events-none opacity-60 select-none" : ""}>
            <ValuationForm
              inputs={inputs}
              onChange={(newInputs) => {
                setInputs(newInputs)
                if (triedSubmit) {
                  const stillMissing = getMissingFields(newInputs)
                  setValidationErrors(stillMissing)
                }
              }}
              invalidFields={invalidKeys}
            />
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && editing && (
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

          {/* Validation errors on first submit (before unlocked) */}
          {validationErrors.length > 0 && !submitted && (
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

          {/* Submit / Resubmit Button */}
          {(!submitted || editing) && (
            <div className="mt-6">
              <Button onClick={handleSubmit} size="lg" className="w-full gap-2 text-base">
                {editing ? (
                  <>
                    <Unlock className="h-5 w-5" />
                    Resubmit Valuation
                  </>
                ) : unlocked ? (
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
              {!unlocked && !editing && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  You will be asked for your name and email to view results.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar (right) */}
        <div className="w-full lg:sticky lg:top-24 lg:w-[40%] lg:self-start">
          <ValuationSidebar results={results} riskAudit={riskAudit} />
        </div>
      </div>

      {/* Deal Simulator & Risk Audit -- shown below after valuation is complete */}
      {results && (
        <div id="valuation-results" className="mt-12 border-t border-border pt-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Deep Dive: Deal Simulator & Risk Audit
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              disabled={pdfLoading}
              onClick={async () => {
                if (!results) return
                setPdfLoading(true)
                try {
                  await downloadValuationPDF(inputs, results, riskAudit)
                } finally {
                  setPdfLoading(false)
                }
              }}
            >
              <Download className="h-4 w-4" />
              {pdfLoading ? "Generating..." : "Download PDF Report"}
            </Button>
          </div>
          <div className="grid gap-8 mb-8 lg:grid-cols-2">
            <MarketIntelPanel
              modelMultiple={results?.calculatedMultiple}
              dealType="full"
            />
            <BenchmarkComparison inputs={inputs} />
          </div>
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



      <FeedbackWidget
        prompt="Have a suggestion for the valuation calculator?"
        placeholder="Tell us what would make this more useful — missing inputs, questions, or anything else..."
        category="calculator-feedback"
      />

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

export default function CalculatorPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8 lg:px-8"><p className="text-muted-foreground">Loading calculator...</p></div>}>
      <CalculatorContent />
    </Suspense>
  )
}
