"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Building2, BookOpen, Zap, Calculator, Upload } from "lucide-react"

type Step = 1 | 2

interface Choice {
  icon: React.ElementType
  label: string
  sub: string
}

const step1Choices: Choice[] = [
  {
    icon: Building2,
    label: "An entire insurance agency (or book of business)",
    sub: "Get a full M&A-grade valuation for your agency",
  },
  {
    icon: BookOpen,
    label: "A specific carrier's portfolio (e.g., Travelers, Progressive)",
    sub: "Value a single carrier book by line and retention",
  },
]

const step2Choices: Choice[] = [
  {
    icon: Upload,
    label: "Upload an EZLynx report for instant extraction",
    sub: "Connect your AMS and we parse the data automatically",
  },
  {
    icon: Zap,
    label: "Answer 5 quick questions for a 60-second ballpark range",
    sub: "Fast estimate — ideal if you just want a number to start with",
  },
  {
    icon: Calculator,
    label: "Complete a comprehensive 7-category risk scorecard",
    sub: "Full weighted analysis covering retention, risk, operations, and deal structure",
  },
]

const step2Routes = ["/ams", "/quick-value", "/calculator"]

export function ValuationWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const handleStep1 = (index: number) => {
    if (index === 1) {
      router.push("/carrier")
      return
    }
    setStep(2)
  }

  const handleStep2 = (index: number) => {
    router.push(step2Routes[index])
  }

  const choices = step === 1 ? step1Choices : step2Choices
  const handleChoice = step === 1 ? handleStep1 : handleStep2

  return (
    <section className="mx-auto w-full max-w-2xl px-5 py-12 lg:px-8">
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-3">
        {[1, 2].map((n) => (
          <div key={n} className="flex items-center gap-3">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                step === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : step > n
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {n}
            </div>
            {n < 2 && (
              <div
                className={`h-px w-8 transition-colors ${
                  step > 1 ? "bg-primary/40" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Question */}
      <div className="mb-6 text-center">
        {step === 2 && (
          <button
            onClick={() => setStep(1)}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>
        )}
        <h2 className="text-balance text-xl font-bold text-foreground sm:text-2xl">
          {step === 1
            ? "What are you looking to value today?"
            : "How would you like to run your valuation?"}
        </h2>
      </div>

      {/* Choice buttons */}
      <div className="flex flex-col gap-3">
        {choices.map((choice, i) => {
          const Icon = choice.icon
          const isHovered = hoveredIndex === i
          return (
            <button
              key={i}
              onClick={() => handleChoice(i)}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`group flex w-full items-start gap-4 rounded-xl border px-5 py-4 text-left transition-all duration-150 ${
                isHovered
                  ? "border-primary/60 bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isHovered ? "bg-primary/15" : "bg-muted"
                }`}
              >
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isHovered ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold leading-snug transition-colors ${
                    isHovered ? "text-primary" : "text-foreground"
                  }`}
                >
                  {choice.label}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {choice.sub}
                </p>
              </div>

              <ArrowRight
                className={`mt-1.5 h-4 w-4 shrink-0 transition-all duration-150 ${
                  isHovered
                    ? "translate-x-0.5 text-primary"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          )
        })}
      </div>
    </section>
  )
}
