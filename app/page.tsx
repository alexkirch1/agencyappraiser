import Link from "next/link"
import { ArrowRight, Calculator, Shield, Target, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FeedbackWidget } from "@/components/feedback-widget"

// The three-step path a user takes through the tools
const steps = [
  {
    n: "01",
    href: "/quick-value",
    icon: Zap,
    label: "Quick Estimate",
    time: "60 seconds",
    description:
      "Enter a few numbers and get an instant ballpark range. Best place to start if you have no idea what your agency is worth.",
    cta: "Start here",
    primary: true,
  },
  {
    n: "02",
    href: "/calculator",
    icon: Calculator,
    label: "Full Valuation",
    time: "10–15 minutes",
    description:
      "7-category weighted scorecard covering revenue, retention, risk, operations, and more. Includes a deal structure simulator and downloadable PDF.",
    cta: "Run the calculator",
    primary: false,
  },
  {
    n: "03",
    href: "/carrier",
    icon: Target,
    label: "Carrier or AMS Report",
    time: "Upload or enter data",
    description:
      "Value a specific carrier book or upload your EZLynx export to get a line-by-line breakdown of your agency's book.",
    cta: "Go deeper",
    primary: false,
  },
]


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
            What is your agency{" "}
            <span className="text-primary">actually worth?</span>
          </h1>

          <p className="mt-4 max-w-xl text-pretty text-[0.95rem] leading-relaxed text-muted-foreground sm:text-base md:text-lg">
            Most agencies are priced on gut feel. Our tools analyze retention, book quality,
            risk, and operations to show you what buyers will actually pay.
          </p>

          <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="w-full gap-2 sm:w-auto">
              <Link href="/quick-value">
                Get a quick estimate
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/calculator">Full valuation calculator</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Path ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-4xl px-5 py-12 lg:px-8">
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Three steps — start wherever makes sense
        </p>

        <div className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <Link
              key={step.href}
              href={step.href}
              className={`group flex items-start gap-4 rounded-xl border p-5 transition-colors hover:border-primary/50 ${
                step.primary
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              {/* Icon */}
              <div className={`mt-0.5 shrink-0 flex h-10 w-10 items-center justify-center rounded-lg ${
                step.primary ? "bg-primary/15" : "bg-muted"
              }`}>
                <step.icon className={`h-5 w-5 ${step.primary ? "text-primary" : "text-muted-foreground"}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary/40">{step.n}</span>
                  <h2 className={`text-[0.95rem] font-semibold leading-snug transition-colors group-hover:text-primary ${
                    step.primary ? "text-primary" : "text-foreground"
                  }`}>
                    {step.label}
                  </h2>
                  {i === 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Start here
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[0.8rem] leading-relaxed text-muted-foreground sm:text-sm">
                  {step.description}
                </p>
                <p className="mt-2 text-[11px] font-medium text-primary/60 group-hover:text-primary transition-colors">
                  {step.cta} →
                </p>
              </div>

              {/* Arrow — desktop only */}
              <ArrowRight className="mt-3 hidden h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-1 group-hover:text-primary sm:block" />
            </Link>
          ))}
        </div>
      </section>

      <FeedbackWidget
        prompt="Have a suggestion or want to see something new?"
        placeholder="Tell us what tools, features, or carriers you'd like to see added..."
        category="general"
      />
    </div>
  )
}
