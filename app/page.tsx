import Link from "next/link"
import {
  ArrowRight,
  Calculator,
  BarChart3,
  ClipboardCheck,
  CheckCircle2,
  Shield,
  Target,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const tools = [
  {
    href: "/quick-value",
    icon: Zap,
    title: "Quick Valuation",
    description: "Get a ballpark estimate in 60 seconds with just a few inputs and an adjustable multiplier.",
    accent: "text-[hsl(var(--warning))]",
    accentBg: "bg-[hsl(var(--warning))]/10",
    tag: "Start Here",
  },
  {
    href: "/calculator",
    icon: Calculator,
    title: "Full Valuation",
    description: "Our 7-category weighted scorecard covering revenue, retention, risk, operations, and more.",
    accent: "text-primary",
    accentBg: "bg-primary/10",
    tag: "Most Popular",
  },
  {
    href: "/carrier",
    icon: BarChart3,
    title: "Carrier Book Calc",
    description: "Value a specific carrier book. Supports Progressive, Safeco, Hartford, Travelers, and MSA.",
    accent: "text-[hsl(var(--success))]",
    accentBg: "bg-[hsl(var(--success))]/10",
    tag: null,
  },
  {
    href: "/quiz",
    icon: Target,
    title: "Readiness Quiz",
    description: "10-question scored assessment to evaluate if you and your agency are ready for an exit.",
    accent: "text-[hsl(var(--chart-4))]",
    accentBg: "bg-[hsl(var(--chart-4))]/10",
    tag: null,
  },
  {
    href: "/readiness",
    icon: ClipboardCheck,
    title: "Seller Scorecard",
    description: "Comprehensive checklist covering financials, legal, operations, and transition planning.",
    accent: "text-[hsl(var(--chart-5))]",
    accentBg: "bg-[hsl(var(--chart-5))]/10",
    tag: null,
  },
]

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-20 text-center lg:px-8 lg:py-28">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Insurance Agency M&A Tools</span>
          </div>

          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Know Your Agency&apos;s <span className="text-primary">True Value</span>
          </h1>

          <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Go beyond simple revenue multiples. Our valuation model analyzes retention,
            book quality, risk, and operations to estimate what buyers will actually pay.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/quick-value">
                Get a Quick Estimate
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/calculator">Full Valuation Calculator</Link>
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-muted-foreground">
            {["7-Category Scorecard", "Deal Structure Simulator", "14-Point Risk Audit"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 lg:px-8">
        <h2 className="mb-2 text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Valuation &amp; Readiness Tools
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-center text-sm text-muted-foreground">
          Everything you need to value, evaluate, and prepare your agency for a successful transaction.
        </p>

        {/* Top 2 featured cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {tools.slice(0, 2).map((tool) => (
            <Link key={tool.href} href={tool.href} className="group">
              <Card className="h-full border border-border bg-card transition-colors hover:border-primary/50">
                <CardContent className="flex flex-col gap-3 p-6">
                  <div className="flex items-center justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tool.accentBg}`}>
                      <tool.icon className={`h-5 w-5 ${tool.accent}`} />
                    </div>
                    {tool.tag && (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {tool.tag}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
                  <div className="mt-auto flex items-center gap-1 pt-1 text-sm font-medium text-primary">
                    <span>Get started</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Bottom 3 cards */}
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {tools.slice(2).map((tool) => (
            <Link key={tool.href} href={tool.href} className="group">
              <Card className="h-full border border-border bg-card transition-colors hover:border-primary/50">
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tool.accentBg}`}>
                    <tool.icon className={`h-4 w-4 ${tool.accent}`} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
                  <div className="mt-auto flex items-center gap-1 pt-1 text-sm font-medium text-primary">
                    <span>Get started</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-foreground">How It Works</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { n: "1", title: "Quick Estimate", desc: "Start with our 60-second Quick Valuation to see a ballpark range." },
              { n: "2", title: "Go Deeper", desc: "Run the full 7-category calculator with risk audit and deal simulator." },
              { n: "3", title: "Prepare to Sell", desc: "Use the readiness quiz and scorecard to get deal-ready." },
            ].map((step) => (
              <div key={step.n} className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-xl font-bold text-primary">
                  {step.n}
                </div>
                <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-16 lg:px-8">
          <Card className="border border-border bg-card">
            <CardContent className="flex flex-col items-center p-8 text-center md:p-12">
              <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Ready to Find Out What Your Agency Is Worth?
              </h2>
              <p className="mt-3 max-w-lg text-sm text-muted-foreground">
                Join agency owners who use our tools to understand their true market value before entering negotiations.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/quick-value">
                    Start With a Quick Estimate
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/calculator">Full Calculator</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
