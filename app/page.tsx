import Link from "next/link"
import { ArrowRight, Calculator, BarChart3, ClipboardCheck, CheckCircle2, Shield, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const tools = [
  {
    href: "/calculator",
    icon: Calculator,
    title: "Valuation Calculator",
    description:
      "Get a full agency valuation with our 7-category weighted scorecard. Analyze revenue, retention, risk, and more to determine your true market multiple.",
    accent: "text-primary",
    accentBg: "bg-primary/10",
  },
  {
    href: "/carrier",
    icon: BarChart3,
    title: "Carrier Book Calculator",
    description:
      "Value a specific carrier book of business. Supports Progressive, Safeco, Hartford, Travelers, and MSA with carrier-specific metrics.",
    accent: "text-[hsl(var(--success))]",
    accentBg: "bg-[hsl(var(--success))]/10",
  },
  {
    href: "/quiz",
    icon: Target,
    title: "Readiness Quiz",
    description:
      "Take a 10-question scored assessment to see if you and your agency are truly ready for an exit. Get a grade and actionable recommendations.",
    accent: "text-[hsl(var(--warning))]",
    accentBg: "bg-[hsl(var(--warning))]/10",
  },
  {
    href: "/readiness",
    icon: ClipboardCheck,
    title: "Seller Scorecard",
    description:
      "Walk through a comprehensive preparation checklist covering financials, legal, operations, and transition planning before you go to market.",
    accent: "text-[hsl(var(--chart-5))]",
    accentBg: "bg-[hsl(var(--chart-5))]/10",
  },
]

const steps = [
  {
    number: "01",
    title: "Enter Your Data",
    description: "Fill in your agency's financial metrics, book details, and operational profile.",
  },
  {
    number: "02",
    title: "Get Your Valuation",
    description: "Our weighted scorecard analyzes 7 risk categories to calculate a data-driven multiple.",
  },
  {
    number: "03",
    title: "Plan Your Exit",
    description: "Use the deal simulator, risk audit, and readiness tools to prepare for a successful sale.",
  },
]

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center lg:px-8 lg:py-36">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              Insurance M&A Valuation Tools
            </span>
          </div>

          <h1 className="max-w-4xl text-balance text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Know Your Agency&apos;s{" "}
            <span className="text-primary">True Value</span>
          </h1>

          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Our proprietary valuation model goes beyond simple revenue multiples.
            We analyze retention, book quality, legal risk, and operational
            efficiency to give you a data-driven estimate of what buyers will
            actually pay.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/calculator">
                Start Your Valuation
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/quiz">Take the Readiness Quiz</Link>
            </Button>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
              <span>7-Category Scorecard</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
              <span>Deal Structure Simulator</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
              <span>14-Point Risk Audit</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Powerful Tools for Agency M&A
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything you need to value, evaluate, and prepare your agency for a
            successful transaction.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href} className="group">
              <Card className="h-full border-border bg-card transition-colors hover:border-primary/40">
                <CardContent className="flex flex-col gap-4 p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${tool.accentBg}`}>
                    <tool.icon className={`h-6 w-6 ${tool.accent}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {tool.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
                    <span>Get started</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              How It Works
            </h2>
            <p className="mt-3 text-muted-foreground">
              Three steps to a data-driven agency valuation.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5">
                  <span className="text-2xl font-bold text-primary">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 md:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.06),transparent_60%)]" />
            <div className="relative flex flex-col items-center text-center">
              <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Ready to Find Out What Your Agency Is Worth?
              </h2>
              <p className="mt-4 max-w-xl text-pretty text-muted-foreground">
                Join hundreds of agency owners who have used our tools to understand
                their true market value before entering negotiations.
              </p>
              <Button asChild size="lg" className="mt-8 gap-2">
                <Link href="/calculator">
                  Start Free Valuation
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
