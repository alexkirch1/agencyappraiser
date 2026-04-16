"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AmsUpload } from "@/components/ams/ams-upload"
import { AmsForm } from "@/components/ams/ams-form"
import { AmsSidebar } from "@/components/ams/ams-sidebar"
import { FeedbackWidget } from "@/components/feedback-widget"
import {
  calculateAmsValuation,
  defaultAmsInputs,
  type AmsInputs,
} from "@/components/ams/ams-engine"
import { Database, FileSpreadsheet, PenLine, ChevronDown, ChevronUp } from "lucide-react"

export default function AmsPage() {
  const [inputs, setInputs] = useState<AmsInputs>(defaultAmsInputs)
  const [submitted, setSubmitted] = useState(false)
  const [showManual, setShowManual] = useState(false)

  const results = useMemo(() => {
    if (!submitted) return null
    return calculateAmsValuation(inputs)
  }, [inputs, submitted])

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
              AMS Analysis
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Agency Management System Valuation
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

      <FeedbackWidget
        prompt="Missing a metric or AMS system?"
        placeholder="Tell us what you'd like to see — e.g. Applied Epic support, additional fields..."
        category="ams-feedback"
      />
    </div>
  )
}
