import type { Metadata } from "next"


export const metadata: Metadata = {
  title: "Insurance Agency Valuation Tools — Free Calculator & Instant Estimate",
  description:
    "What is your insurance agency worth? Get a free instant estimate in 60 seconds or run our full 7-category valuation scorecard. Built for independent P&C agents and brokers ready to sell, buy, or benchmark.",
  alternates: { canonical: "https://www.agencyappraiser.com" },
  openGraph: {
    title: "Insurance Agency Valuation Tools — Free Calculator & Instant Estimate",
    description:
      "What is your insurance agency worth? Free tools for independent P&C agents and brokers — instant estimate, full scorecard, carrier book valuation, and AMS upload.",
    url: "https://www.agencyappraiser.com",
  },
}
import { Shield } from "lucide-react"
import { FeedbackWidget } from "@/components/feedback-widget"
import { ValuationWizard } from "@/components/valuation-wizard"


export default function HomePage() {
  return (
    <div className="flex flex-col font-sans">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-5 py-14 text-center lg:px-8 lg:py-24">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Insurance Agency M&A Tools</span>
          </div>

          <h1 className="text-balance text-[2rem] font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
            What is your insurance agency{" "}
            <span className="text-primary">actually worth?</span>
          </h1>

          <p className="mt-4 max-w-xl text-pretty text-[0.95rem] leading-relaxed text-muted-foreground sm:text-base md:text-lg">
            Most independent insurance agencies are priced on gut feel. Our tools analyze your retention, book quality, risk, and carrier mix to show you what buyers will actually pay.
          </p>

          <p className="mt-6 text-xs font-medium text-muted-foreground">
            Select what you want to value below to get started
          </p>
        </div>
      </section>

      {/* ── Wizard ───────────────────────────────────────────────────────── */}
      <ValuationWizard />

      <FeedbackWidget
        prompt="Have a suggestion or want to see something new?"
        placeholder="Tell us what tools, features, or carriers you'd like to see added..."
        category="general"
      />
    </div>
  )
}
