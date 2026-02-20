"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { ArrowRight, Calculator, Zap } from "lucide-react"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function QuickValuePage() {
  const [revenue, setRevenue] = useState<number | null>(null)
  const [retention, setRetention] = useState<string>("")
  const [bookType, setBookType] = useState<string>("")
  const [multiplier, setMultiplier] = useState(1.75)

  const estimate = useMemo(() => {
    if (!revenue || revenue <= 0) return null

    // Suggest a multiplier based on inputs
    let suggested = 1.75
    if (retention === "high") suggested += 0.35
    else if (retention === "low") suggested -= 0.3

    if (bookType === "commercial") suggested += 0.25
    else if (bookType === "personal") suggested -= 0.1

    suggested = Math.max(0.75, Math.min(3.0, suggested))

    const value = revenue * multiplier
    const lowValue = revenue * Math.max(0.75, multiplier - 0.25)
    const highValue = revenue * Math.min(3.0, multiplier + 0.25)

    return { value, lowValue, highValue, suggested }
  }, [revenue, retention, bookType, multiplier])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5">
          <Zap className="h-4 w-4 text-[hsl(var(--warning))]" />
          <span className="text-xs font-medium text-muted-foreground">60-Second Estimate</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Quick Agency Valuation</h1>
        <p className="mt-2 text-muted-foreground">
          Get a fast ballpark estimate of your agency&apos;s value. Answer 3 questions and adjust the multiplier.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Revenue */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              What is your annual revenue?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="quickRevenue" className="text-sm text-muted-foreground">
              Total Annual Revenue ($)
            </Label>
            <Input
              id="quickRevenue"
              type="number"
              placeholder="e.g. 1,500,000"
              value={revenue ?? ""}
              onChange={(e) => {
                const val = e.target.value
                setRevenue(val === "" ? null : parseFloat(val))
              }}
              className="mt-1.5 text-lg"
            />
          </CardContent>
        </Card>

        {/* Retention */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              How is your client retention?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={retention}
              onValueChange={setRetention}
              className="flex flex-col gap-2 sm:flex-row sm:gap-4"
            >
              {[
                { value: "high", label: "Excellent (90%+)" },
                { value: "average", label: "Average (80-89%)" },
                { value: "low", label: "Below Average (<80%)" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-3 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5"
                >
                  <RadioGroupItem value={opt.value} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Book Type */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              What does your book primarily consist of?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={bookType}
              onValueChange={setBookType}
              className="flex flex-col gap-2 sm:flex-row sm:gap-4"
            >
              {[
                { value: "commercial", label: "Mostly Commercial" },
                { value: "mixed", label: "Mixed" },
                { value: "personal", label: "Mostly Personal" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-3 text-sm text-foreground transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5"
                >
                  <RadioGroupItem value={opt.value} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Multiplier Slider */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              Adjust Your Multiplier
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Drag the slider to adjust the revenue multiple.
              {estimate?.suggested && (
                <> Our suggestion based on your inputs:{" "}
                  <button
                    type="button"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                    onClick={() => setMultiplier(estimate.suggested)}
                  >
                    {estimate.suggested.toFixed(2)}x
                  </button>
                </>
              )}
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">0.75x</span>
              <span className="text-2xl font-bold text-primary font-mono">{multiplier.toFixed(2)}x</span>
              <span className="text-sm text-muted-foreground">3.00x</span>
            </div>
            <Slider
              value={[multiplier]}
              onValueChange={([v]) => setMultiplier(v)}
              min={0.75}
              max={3.0}
              step={0.05}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Result */}
        {estimate && (
          <Card className="border-primary/30 bg-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground mb-2">Estimated Agency Value</p>
                <p className="text-4xl font-bold text-[hsl(var(--success))]">
                  {formatCurrency(estimate.value)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Range: {formatCurrency(estimate.lowValue)} - {formatCurrency(estimate.highValue)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Based on {formatCurrency(revenue ?? 0)} revenue x {multiplier.toFixed(2)} multiple
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA to detailed valuation */}
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Calculator className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Want a More Accurate Valuation?
                </h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Our full valuation calculator analyzes 7 risk categories including retention, legal compliance,
                  book quality, and operational efficiency to calculate a precise, data-driven multiple.
                </p>
              </div>
              <Button asChild size="lg" className="gap-2">
                <Link href="/calculator">
                  Get Your Detailed Valuation
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
