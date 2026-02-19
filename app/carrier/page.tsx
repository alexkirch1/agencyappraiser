"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CarrierForm } from "@/components/carrier/carrier-form"
import {
  calculateCarrierValuation,
  formatCurrency,
  defaultCarrierInputs,
  type CarrierInputs,
} from "@/components/carrier/carrier-engine"

export default function CarrierPage() {
  const [inputs, setInputs] = useState<CarrierInputs>(defaultCarrierInputs)
  const results = useMemo(() => calculateCarrierValuation(inputs), [inputs])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Carrier Book Calculator</h1>
        <p className="mt-2 text-muted-foreground">
          Value a specific carrier book of business using carrier-specific metrics and our valuation model.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Form */}
        <div className="w-full lg:w-[60%]">
          <CarrierForm inputs={inputs} onChange={setInputs} />
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
                    <p className="text-sm font-medium text-foreground">Select a Carrier</p>
                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                      Choose a carrier and enter your book metrics to see a real-time valuation estimate.
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
    </div>
  )
}
