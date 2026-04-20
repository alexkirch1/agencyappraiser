"use client"

import { useState, useMemo, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AmsUpload } from "@/components/ams/ams-upload"
import { AmsForm } from "@/components/ams/ams-form"
import { AmsSidebar } from "@/components/ams/ams-sidebar"
import { FeedbackWidget } from "@/components/feedback-widget"
import { LeadCaptureModal } from "@/components/lead-capture-modal"
import {
  calculateAmsValuation,
  defaultAmsInputs,
  formatCurrency,
  type AmsInputs,
} from "@/components/ams/ams-engine"
import { Database, FileSpreadsheet, PenLine, ChevronDown, ChevronUp } from "lucide-react"

export default function AmsPage() {
  const [inputs, setInputs] = useState<AmsInputs>(defaultAmsInputs)
  const [submitted, setSubmitted] = useState(false)
  const [showManual, setShowManual] = useState(true)
  const [showLeadCapture, setShowLeadCapture] = useState(false)
  const [leadCaptured, setLeadCaptured] = useState(false)
  const hasShownModal = useRef(false)

  const results = useMemo(() => {
    if (!submitted) return null
    return calculateAmsValuation(inputs)
  }, [inputs, submitted])

  // Show lead modal the first time results appear
  useMemo(() => {
    if (results && !hasShownModal.current && !leadCaptured) {
      hasShownModal.current = true
      setShowLeadCapture(true)
    }
  }, [results, leadCaptured])

  const handleParsed = (fields: Partial<AmsInputs>) => {
    setInputs((prev) => ({ ...prev, ...fields, ams: "ezlynx" }))
    setShowManual(true)
    setSubmitted(true)
  }

  const handleChange = (patch: Partial<AmsInputs>) => {
    setInputs((prev) => ({ ...prev, ...patch }))
    setSubmitted(true)
  }

  const hasRevenue = inputs.revenue_ltm && inputs.revenue_ltm > 0

  const valuationSummary = results
    ? `AMS System: ${inputs.ams || "Manual Entry"}
Revenue (LTM): ${formatCurrency(inputs.revenue_ltm ?? 0)}
Total PIF: ${inputs.total_pif?.toLocaleString() ?? "N/A"}
Total Premium: ${inputs.total_premium ? formatCurrency(inputs.total_premium) : "N/A"}
Retention Rate: ${inputs.overall_retention != null ? `${inputs.overall_retention}%` : "N/A"}
Loss Ratio: ${inputs.overall_loss_ratio != null ? `${inputs.overall_loss_ratio}%` : "N/A"}
Adjusted Multiple: ${results.adjustedMultiple.toFixed(2)}x
Low Offer: ${formatCurrency(results.lowOffer)}
Mid Offer: ${formatCurrency(results.midOffer)}
High Offer: ${formatCurrency(results.highOffer)}`
    : ""

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">

        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Agency Management System
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Agency Management System Report
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Upload an EZLynx report for automatic data extraction, or fill in your agency metrics
            manually. We use your book data to estimate your agency&apos;s market value.
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">

          {/* Left — form column */}
          <div className="flex flex-1 flex-col gap-6 min-w-0">

            {/* EZLynx upload */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">EZLynx Report Upload</h2>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Automatic
                </span>
              </div>
              <AmsUpload onParsed={handleParsed} />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or enter manually</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Manual form toggle */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowManual((p) => !p)}
                className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
              >
                <PenLine className="h-4 w-4 text-primary" />
                Manual Entry
                {showManual
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
              </button>

              {showManual && (
                <AmsForm inputs={inputs} onChange={handleChange} />
              )}
            </div>

            {/* Submit button (manual mode) */}
            {showManual && (
              <Card className="border-border bg-card">
                <CardContent className="px-4 py-4 flex flex-col gap-3">
                  {!hasRevenue && (
                    <p className="text-xs text-muted-foreground">
                      Enter your agency revenue (Last 12 Months) to generate a valuation.
                    </p>
                  )}
                  <Button
                    onClick={() => setSubmitted(true)}
                    disabled={!hasRevenue}
                    className="w-full sm:w-auto"
                  >
                    Calculate Agency Value
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Info note about other AMS systems */}
            <Card className="border-border bg-secondary/30">
              <CardContent className="px-4 py-3 flex items-start gap-3">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs font-semibold text-foreground">More AMS systems coming soon</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Automatic parsing is currently supported for EZLynx. Support for Applied Epic,
                    HawkSoft, QQ Catalyst, and other systems is in development. Use manual entry
                    in the meantime.
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right — results sidebar */}
          <div className={`w-full lg:sticky lg:top-24 lg:w-[38%] lg:self-start ${results ? "order-first lg:order-last" : ""}`}>
            <AmsSidebar results={results} />
          </div>

        </div>
      </div>

      {showLeadCapture && (
        <LeadCaptureModal
          onClose={() => setShowLeadCapture(false)}
          onSubmit={(_data, _leadId) => {
            setLeadCaptured(true)
            setShowLeadCapture(false)
          }}
          title="Get Your Full AMS Valuation"
          description="Enter your contact info to save your results and have our team follow up with a more detailed breakdown."
          toolUsed="Agency Management System"
          valuationSummary={valuationSummary}
          estimatedValue={results?.midOffer ?? 0}
          valuationData={{
            revenueLTM: inputs.revenue_ltm,
            retentionRate: inputs.overall_retention,
            policyMix: inputs.commercial_lines_pct,
            primaryState: inputs.primary_state,
            employees: inputs.employee_count,
            totalPIF: inputs.total_pif,
            totalPremium: inputs.total_premium,
            lossRatio: inputs.overall_loss_ratio,
          }}
        />
      )}

      <FeedbackWidget
        prompt="Missing a metric or AMS system?"
        placeholder="Tell us what you'd like to see — e.g. Applied Epic support, additional fields..."
        category="ams-feedback"
      />
    </div>
  )
}
