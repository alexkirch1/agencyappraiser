"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SmartInput } from "@/components/ui/smart-input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { ValuationDisclaimerModal } from "@/components/valuation-disclaimer-modal"
import { ArrowRight, Calculator, Zap, DollarSign, AlertTriangle, TrendingUp, ShieldAlert } from "lucide-react"
import { InfoTip } from "@/components/ui/info-tip"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Round to the nearest "natural" interval so values look precise but not exact.
// e.g. $1,847,000 not $1,850,000 and not $1,847,312
function naturalRound(value: number): number {
  if (value >= 1_000_000) return Math.round(value / 23_000) * 23_000
  if (value >= 500_000)   return Math.round(value / 11_000) * 11_000
  if (value >= 100_000)   return Math.round(value / 3_700)  * 3_700
  return Math.round(value / 1_300) * 1_300
}

type Tier = "high" | "average" | "below"

function getTier(retention: string, bookType: string, revenue: number | null): Tier {
  let score = 0
  if (retention === "high") score += 2
  else if (retention === "average") score += 1
  if (bookType === "commercial") score += 2
  else if (bookType === "mixed") score += 1
  if (revenue && revenue > 1_000_000) score += 1
  if (score >= 4) return "high"
  if (score >= 2) return "average"
  return "below"
}

const TIER_MESSAGES: Record<Tier, { icon: React.ReactNode; color: string; bg: string; border: string; text: string }> = {
  high: {
    icon: <TrendingUp className="h-4 w-4" />,
    color: "text-[hsl(var(--success))]",
    bg: "bg-[hsl(var(--success))]/8",
    border: "border-[hsl(var(--success))]/30",
    text: "High-Value Potential Detected. Your agency may qualify for a premium multiplier. Use the Detailed Valuation to unlock a higher precision score.",
  },
  average: {
    icon: <Calculator className="h-4 w-4" />,
    color: "text-primary",
    bg: "bg-primary/8",
    border: "border-primary/30",
    text: "Want to increase this number? Our full audit identifies the 7 key areas buyers look for to pay top dollar.",
  },
  below: {
    icon: <ShieldAlert className="h-4 w-4" />,
    color: "text-[hsl(var(--warning))]",
    bg: "bg-[hsl(var(--warning))]/8",
    border: "border-[hsl(var(--warning))]/30",
    text: "Risk factors detected. See exactly what is dragging down your valuation in our Full Readiness Report.",
  },
}

// How much more detail the full valuation adds -- expressed as a percentage
// based on how many of the 7 categories the quick inputs touch.
function getFullValGap(retention: string, bookType: string): number {
  // Quick val covers ~2 of 7 categories (revenue + book quality/retention).
  // Each answer the user gave narrows the gap slightly.
  let covered = 2
  if (retention) covered += 0.5
  if (bookType)  covered += 0.5
  const gap = Math.round(((7 - covered) / 7) * 100)
  return gap // e.g. 71%
}

export default function QuickValuePage() {
  const [revenue, setRevenue] = useState<number | null>(null)
  const [retention, setRetention] = useState<string>("")
  const [bookType, setBookType] = useState<string>("")
  const [multiplier, setMultiplier] = useState(1.95)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [resultsVisible, setResultsVisible] = useState(false)

  const estimate = useMemo(() => {
    if (!revenue || revenue <= 0) return null

    // Build suggested multiplier with realistic fractional offsets
    let suggested = 1.83
    if (retention === "high") suggested += 0.38
    else if (retention === "average") suggested += 0.09
    else if (retention === "low") suggested -= 0.27
    if (bookType === "commercial") suggested += 0.22
    else if (bookType === "mixed") suggested += 0.06
    else if (bookType === "personal") suggested -= 0.13
    // Small revenue-tier offset so it never snaps to a round number
    const revTier = revenue > 2_000_000 ? 0.07 : revenue > 500_000 ? 0.03 : -0.04
    suggested += revTier
    suggested = Math.max(0.75, Math.min(3.0, parseFloat(suggested.toFixed(2))))

    // Central value -- natural rounding so it looks precise, not manufactured
    const value = naturalRound(revenue * multiplier)

    // Asymmetric range that varies by revenue
    const lowSpread  = 0.17 + ((revenue % 13) / 13) * 0.05
    const highSpread = 0.21 + ((revenue % 11) / 11) * 0.07
    const lowValue   = naturalRound(value * (1 - lowSpread))
    const highValue  = naturalRound(value * (1 + highSpread))

    const tier = getTier(retention, bookType, revenue)
    const gap  = getFullValGap(retention, bookType)

    return { value, lowValue, highValue, suggested, tier, gap }
  }, [revenue, retention, bookType, multiplier])

  const tierInfo = estimate ? TIER_MESSAGES[estimate.tier] : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5">
          <Zap className="h-4 w-4 text-[hsl(var(--warning))]" />
          <span className="text-xs font-medium text-muted-foreground">60-Second Estimate</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Quick Agency Valuation</h1>
        <p className="mt-2 max-w-xl mx-auto text-muted-foreground">
          Get a fast ballpark estimate of your agency&apos;s value. Answer 3 questions, adjust the multiplier, and see your result instantly.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Inputs */}
        <div className="flex flex-col gap-5 lg:col-span-3">
          {/* Revenue */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">
                1. What is your annual revenue?<InfoTip text="Your total commission and fee income for the last 12 months. Include all revenue sources -- this is the number your multiple gets applied to." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="quickRevenue" className="text-sm text-muted-foreground">
                Total Annual Revenue ($)
              </Label>
              <SmartInput
                id="quickRevenue"
                inputType="currency"
                placeholder="e.g. 1500000"
                value={revenue}
                onValueChange={setRevenue}
                className="mt-1.5 text-lg"
              />
            </CardContent>
          </Card>

          {/* Retention */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">
                2. How is your client retention?<InfoTip text="What percentage of your clients renew each year? Check your management system for your actual renewal rate." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={retention}
                onValueChange={setRetention}
                className="flex flex-col gap-2 sm:flex-row sm:gap-3"
              >
                {[
                  { value: "high", label: "Excellent (90%+)" },
                  { value: "average", label: "Average (80-89%)" },
                  { value: "low", label: "Below Average (<80%)" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm text-foreground transition-colors hover:border-muted-foreground/40 has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5"
                  >
                    <RadioGroupItem value={opt.value} />
                    {opt.label}
                  </label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Book Type */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">
                3. What does your book primarily consist of?<InfoTip text="Is the majority of your premium in commercial policies, personal lines, or a mix of both?" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={bookType}
                onValueChange={setBookType}
                className="flex flex-col gap-2 sm:flex-row sm:gap-3"
              >
                {[
                  { value: "commercial", label: "Mostly Commercial" },
                  { value: "mixed", label: "Mixed" },
                  { value: "personal", label: "Mostly Personal" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm text-foreground transition-colors hover:border-muted-foreground/40 has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5"
                  >
                    <RadioGroupItem value={opt.value} />
                    {opt.label}
                  </label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Multiplier Slider */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">
                Adjust Your Multiplier<InfoTip text="The revenue multiple applied to your annual revenue. Most P&C agencies trade between 1.5x and 2.5x depending on book quality." />
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Drag to adjust. 
                {estimate?.suggested && (
                  <> Suggested for your inputs:{" "}
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
                onValueChange={([v]) => setMultiplier(parseFloat(v.toFixed(2)))}
                min={0.75}
                max={3.0}
                step={0.01}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Get Estimate Button */}
          {!resultsVisible && (
            <Button
              onClick={() => {
                if (!revenue || revenue <= 0) return
                setShowDisclaimer(true)
              }}
              size="lg"
              className="w-full gap-2 text-base"
              disabled={!revenue || revenue <= 0}
            >
              <DollarSign className="h-5 w-5" />
              Get My Quick Estimate
            </Button>
          )}
        </div>

        {/* Right: Sticky Results */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-24 flex flex-col gap-4">
            {/* Value Display */}
            <Card className={`border bg-card transition-colors ${resultsVisible && estimate ? "border-primary/40" : "border-border"}`}>
              <CardContent className="p-6">
                {resultsVisible && estimate ? (
                  <div className="flex flex-col items-center text-center gap-2">
                    {/* Range is the headline */}
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Estimated Value Range</p>
                    <p className="text-3xl font-extrabold text-foreground font-mono leading-tight">
                      {formatCurrency(estimate.lowValue)}
                      <span className="text-muted-foreground/50 mx-1.5">&ndash;</span>
                      {formatCurrency(estimate.highValue)}
                    </p>

                    {/* Midpoint as secondary */}
                    <div className="mt-1 rounded-md bg-secondary/60 px-4 py-2 text-center w-full">
                      <p className="text-[11px] text-muted-foreground">Midpoint estimate</p>
                      <p className="text-xl font-bold text-[hsl(var(--success))] font-mono">
                        {formatCurrency(estimate.value)}
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(revenue ?? 0)} &times; {multiplier.toFixed(2)}x
                    </p>

                    {/* Contextual message */}
                    {tierInfo && (
                      <div className={`w-full mt-2 rounded-lg border px-3 py-2.5 text-left ${tierInfo.bg} ${tierInfo.border}`}>
                        <div className={`flex items-start gap-2 ${tierInfo.color}`}>
                          <span className="mt-0.5 shrink-0">{tierInfo.icon}</span>
                          <p className="text-xs leading-relaxed">{tierInfo.text}</p>
                        </div>
                      </div>
                    )}

                    {/* Full val gap nudge */}
                    <div className="w-full mt-1 rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
                      <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        The Full Valuation covers{" "}
                        <span className="font-semibold text-foreground">{estimate.gap}% more</span>{" "}
                        of your agency than this estimate.
                      </p>
                      <Button asChild size="sm" variant="outline" className="w-full mt-2 gap-1.5 text-xs">
                        <Link href="/calculator">
                          Run Full Valuation <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                      <DollarSign className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Estimated Value Range</p>
                    <p className="text-4xl font-bold text-muted-foreground/30 font-mono">$--,---</p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {revenue && revenue > 0
                        ? "Click \"Get My Quick Estimate\" to see your valuation."
                        : "Enter your revenue above to get started."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CTA to detailed valuation -- only show when results NOT visible */}
            {!resultsVisible && (
              <Card className="border border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Calculator className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Want a More Accurate Valuation?</h3>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        Our full calculator analyzes 7 risk categories for a precise, defensible number.
                      </p>
                    </div>
                    <Button asChild className="w-full gap-2" size="sm">
                      <Link href="/calculator">
                        Detailed Valuation <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {showDisclaimer && (
        <ValuationDisclaimerModal
          onContinue={() => {
            setShowDisclaimer(false)
            setResultsVisible(true)
          }}
        />
      )}
    </div>
  )
}
