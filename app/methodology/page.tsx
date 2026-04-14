import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BarChart2, BookOpen, ShieldCheck, TrendingUp, Users, Layers, DollarSign, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Our Methodology | Agency Appraiser",
  description:
    "Learn how Agency Appraiser calculates insurance agency valuations using a weighted 7-category scorecard, industry benchmarks, and real M&A transaction data.",
}

const CATEGORIES = [
  {
    icon: DollarSign,
    title: "Financial Performance",
    weight: "30%",
    description:
      "Revenue (LTM, Y-1, Y-2), SDE / EBITDA, and CAGR form the foundation. We use EBITDA as the base and apply a multiple rather than a simple revenue multiple, because profitability tells buyers how much they actually take home.",
    benchmarks: [
      "EBITDA margin > 25% — strong",
      "CAGR 10%+ over 3 years — premium signal",
      "Revenue > $1M — institutional buyer eligible",
    ],
  },
  {
    icon: Users,
    title: "Client Retention & Concentration",
    weight: "20%",
    description:
      "Retention rate (85%+ is strong, 90%+ is exceptional) and client concentration are the two most scrutinized metrics in any P&C agency transaction. A single client accounting for more than 10% of revenue is a material risk flag.",
    benchmarks: [
      "Retention > 90% — +0.25x multiplier boost",
      "Top client < 5% of revenue — ideal",
      "Retention < 75% — significant discount",
    ],
  },
  {
    icon: Layers,
    title: "Book Composition",
    weight: "15%",
    description:
      "Commercial lines books command higher multiples than personal lines because they carry larger average premiums, longer relationships, and lower churn. A 70%+ commercial book is considered premium.",
    benchmarks: [
      "> 70% commercial — +0.30x",
      "Mixed (40–70% commercial) — neutral",
      "< 30% commercial — moderate discount",
    ],
  },
  {
    icon: BarChart2,
    title: "Revenue Growth Trend",
    weight: "15%",
    description:
      "Buyers pay for momentum. Three consecutive years of growth — even moderate growth — meaningfully increase the multiple. Declining revenue is the single biggest red flag in a transaction, often reducing the multiple by 0.5x or more.",
    benchmarks: [
      "Strong growth (10%+ / yr) — +0.20x",
      "Moderate growth (3–9% / yr) — +0.10x",
      "Flat — neutral",
      "Declining — -0.25x to -0.50x",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Operational Health & Risk",
    weight: "10%",
    description:
      "E&O claims history, producer agreement structure, carrier diversification, and staff retention risk all factor in. An agency with documented processes, no E&O history, and strong producer agreements is far easier for a buyer to integrate.",
    benchmarks: [
      "Zero E&O claims — +0.10x",
      "No single carrier > 25% of revenue — healthy",
      "Documented processes + low staff risk — premium",
    ],
  },
  {
    icon: Clock,
    title: "Transition & Deal Structure",
    weight: "5%",
    description:
      "Seller transition length (0–6 months, 6–12 months, 12–24 months), closing urgency, and scope of sale (full agency vs. book-only) all adjust the final multiple. A longer, well-supported transition de-risks the deal for buyers and increases offer value.",
    benchmarks: [
      "12–24 month transition — +0.10x",
      "Full agency sale — scope multiplier 1.0x",
      "Book-only sale — scope multiplier 0.95x",
    ],
  },
  {
    icon: TrendingUp,
    title: "Market & Longevity",
    weight: "5%",
    description:
      "Agency age (longevity), primary state market conditions, and employee count signal stability and scalability. Agencies established 10+ years with diversified staff are viewed as durable platforms rather than one-person operations.",
    benchmarks: [
      "25+ years established — premium tier",
      "10–24 years — strong",
      "< 5 years — early stage discount",
    ],
  },
]

const MULTIPLE_TABLE = [
  { label: "Personal Lines Dominant, Small", range: "1.0x – 1.8x", color: "text-destructive" },
  { label: "Mixed Book, Average Retention", range: "1.8x – 2.5x", color: "text-warning" },
  { label: "Strong Commercial, Good Growth", range: "2.5x – 3.2x", color: "text-success" },
  { label: "Premium Commercial, High Retention, Growing", range: "3.2x – 4.0x+", color: "text-primary" },
]

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8">

      {/* Hero */}
      <div className="mb-12">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <BookOpen className="h-3.5 w-3.5" />
          How It Works
        </div>
        <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground">
          Our Valuation Methodology
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Agency Appraiser uses a weighted 7-category scorecard modeled on real insurance agency M&A
          transactions. Every multiplier adjustment maps to a factor that buyers and lenders actually
          underwrite when placing a bid.
        </p>
      </div>

      {/* How the formula works */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-foreground">The Core Formula</h2>
        <Card className="border-primary/20 bg-card">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex-1 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Base</p>
                <p className="mt-1 text-xl font-bold text-foreground">SDE / EBITDA</p>
              </div>
              <span className="text-center text-2xl font-bold text-muted-foreground">×</span>
              <div className="flex-1 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-wide text-primary">Multiplier</p>
                <p className="mt-1 text-xl font-bold text-primary">1.0x – 4.0x+</p>
              </div>
              <span className="text-center text-2xl font-bold text-muted-foreground">=</span>
              <div className="flex-1 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-wide text-success">Valuation</p>
                <p className="mt-1 text-xl font-bold text-success">Offer Range</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              We use SDE (Seller Discretionary Earnings) or EBITDA as the base — not gross revenue —
              because buyers finance acquisitions based on cash flow. The multiple is then built up
              category by category from a neutral baseline of{" "}
              <span className="font-semibold text-foreground">2.0x</span>, with positive and negative
              adjustments applied for each scored factor.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Industry benchmark multiples */}
      <section className="mb-12">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Industry Benchmark Multiples</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Based on observed transaction data for independent insurance agencies in the United States.
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Agency Profile</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">EBITDA Multiple Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MULTIPLE_TABLE.map((row) => (
                <tr key={row.label} className="bg-card hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{row.label}</td>
                  <td className={`px-4 py-3 text-right font-bold tabular-nums ${row.color}`}>{row.range}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Captive agents (State Farm, Allstate, etc.) are not included — captive books have very limited
          transferable value and are outside this model.
        </p>
      </section>

      {/* 7 Categories */}
      <section className="mb-12">
        <h2 className="mb-2 text-2xl font-bold text-foreground">The 7 Scoring Categories</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Each category contributes a weighted adjustment to your final multiple. The weights below reflect
          how heavily each category is weighted in observed buyer underwriting criteria.
        </p>
        <div className="flex flex-col gap-4">
          {CATEGORIES.map((cat) => (
            <Card key={cat.title} className="border-border bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <cat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base font-semibold text-foreground">{cat.title}</CardTitle>
                  </div>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                    {cat.weight}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm leading-relaxed text-muted-foreground">{cat.description}</p>
                <ul className="mt-3 flex flex-col gap-1">
                  {cat.benchmarks.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                      {b}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Confidence & disclaimers */}
      <section className="mb-12 rounded-xl border border-warning/30 bg-warning/5 p-6">
        <h2 className="mb-3 text-lg font-bold text-foreground">Important Notes on Accuracy</h2>
        <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
            This tool produces <span className="font-semibold text-foreground">preliminary estimates</span>, not formal appraisals. Final transaction values depend on buyer-specific synergies, deal structure, and market conditions at the time of sale.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
            Multiples shown are based on observed independent agency transactions. Captive agents, surplus lines specialists, and specialty MGAs may fall outside these ranges.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
            Carrier book valuations use a different model — commission revenue (not written premium) is used as the base, with loss ratio and retention as the primary drivers.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
            Results are confidential and used only to provide your valuation report. No data is sold or shared with third parties.
          </li>
        </ul>
      </section>

      {/* CTA */}
      <section className="text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Ready to see your number?</h2>
        <p className="mb-6 text-muted-foreground">
          Run the full 7-category calculator and get your personalized valuation range with a risk audit.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/calculator">
              Full Valuation Calculator <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link href="/quick-value">
              Quick Value Estimate <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

    </div>
  )
}
