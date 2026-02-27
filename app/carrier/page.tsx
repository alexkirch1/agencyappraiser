"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CarrierForm } from "@/components/carrier/carrier-form"
import { LeadCaptureModal } from "@/components/lead-capture-modal"
import { ValuationDisclaimerModal } from "@/components/valuation-disclaimer-modal"
import { Button } from "@/components/ui/button"
import { Lock, Unlock, AlertCircle } from "lucide-react"
import {
  calculateCarrierValuation,
  formatCurrency,
  defaultCarrierInputs,
  type CarrierInputs,
} from "@/components/carrier/carrier-engine"

export default function CarrierPage() {
  const [inputs, setInputs] = useState<CarrierInputs>(defaultCarrierInputs)
  const [submitted, setSubmitted] = useState(false)
  const [showLeadCapture, setShowLeadCapture] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  const results = useMemo(() => {
    if (!submitted) return null
    return calculateCarrierValuation(inputs)
  }, [inputs, submitted])

  const [validationError, setValidationError] = useState("")

  const handleSubmit = () => {
    if (!inputs.carrier) {
      setValidationError("Please select a carrier first.")
      return
    }
    // Check if carrier requires bookType
    if (["progressive", "hartford", "travelers"].includes(inputs.carrier) && !inputs.bookType) {
      setValidationError("Please select a book type.")
      return
    }
    setValidationError("")
    if (unlocked) {
      setShowDisclaimer(true)
    } else {
      setShowLeadCapture(true)
    }
  }

  const handleLeadSubmit = () => {
    setUnlocked(true)
    setShowLeadCapture(false)
    setShowDisclaimer(true)
  }

  const handleDisclaimerContinue = () => {
    setShowDisclaimer(false)
    setSubmitted(true)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Carrier Book Calculator</h1>
        <p className="mt-2 text-muted-foreground">
          Value a specific carrier book of business using carrier-specific metrics and our valuation model.
          Fill in your carrier details and submit to see your valuation.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Form */}
        <div className="w-full lg:w-[60%]">
          <CarrierForm inputs={inputs} onChange={(newInputs) => {
            setInputs(newInputs)
            if (submitted) setSubmitted(false)
          }} />

          {/* Validation Error */}
          {validationError && (
            <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                <p className="text-sm font-medium text-destructive">{validationError}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-6">
            <Button onClick={handleSubmit} size="lg" className="w-full gap-2 text-base">
              {unlocked ? (
                <>
                  <Unlock className="h-5 w-5" />
                  Calculate Carrier Book Value
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

        {/* Sidebar */}
        <div className="w-full lg:sticky lg:top-24 lg:w-[40%] lg:self-start">
          <div className="flex flex-col gap-4">
            {/* Offer display */}
            <Card className="border-primary/30 bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Estimated Carrier Book Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                {results && results.premium > 0 ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[hsl(var(--success))]">
                        {formatCurrency(results.lowOffer)}
                      </span>
                      <span className="text-muted-foreground">-</span>
                      <span className="text-2xl font-bold text-[hsl(var(--success))]">
                        {formatCurrency(results.highOffer)}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Premium</span>
                        <span className="text-sm font-medium text-foreground">{formatCurrency(results.premium)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Calculated Multiple</span>
                        <span className="text-sm font-medium text-primary">{results.finalMultiple.toFixed(2)}x</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Carrier</span>
                        <span className="text-sm font-medium capitalize text-foreground">{inputs.carrier}</span>
                      </div>
                      {inputs.bookType && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Book Type</span>
                          <span className="text-sm font-medium capitalize text-foreground">{inputs.bookType}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                      <span className="text-xl text-muted-foreground">$</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {submitted ? "No data to calculate" : "Fill In & Submit"}
                    </p>
                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                      {submitted
                        ? "Make sure you have entered your carrier book metrics."
                        : "Choose a carrier, enter your book metrics, and click Submit to see your valuation."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info card */}
            <Card className="border-border bg-card">
              <CardContent className="pt-6">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  This tool values individual carrier books of business. Base multiple starts at 1.5x
                  and adjusts based on loss ratio, retention, premium volume, and carrier-specific factors.
                  The range is clamped between 0.75x and 3.0x.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showLeadCapture && (
        <LeadCaptureModal
          onSubmit={handleLeadSubmit}
          onClose={() => setShowLeadCapture(false)}
          title="Unlock Carrier Book Valuation"
          description="Enter your details to view your carrier-specific book valuation."
          toolUsed={`Carrier Calculator - ${inputs.carrier ? inputs.carrier.charAt(0).toUpperCase() + inputs.carrier.slice(1) : "Unknown"}`}
          valuationSummary={`Carrier: ${inputs.carrier || "N/A"}\nBook Type: ${inputs.bookType || "N/A"}\nEstimated Premium: $${results?.premium?.toLocaleString() ?? "N/A"}\nMultiple: ${results?.finalMultiple?.toFixed(2) ?? "N/A"}x\nLow Offer: $${results?.lowOffer?.toLocaleString() ?? "N/A"}\nHigh Offer: $${results?.highOffer?.toLocaleString() ?? "N/A"}`}
          estimatedValue={results?.premium ?? 0}
        />
      )}
      {showDisclaimer && (
        <ValuationDisclaimerModal onContinue={handleDisclaimerContinue} />
      )}
    </div>
  )
}
