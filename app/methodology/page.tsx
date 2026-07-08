import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BarChart2, BookOpen, ShieldCheck, TrendingUp, Users, Layers, DollarSign, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Our Methodology | Agency Appraiser",
  description:
    "Learn how Agency Appraiser calculates insurance agency valuations — 7 scoring categories built from real M&A transaction data, covering financial performance, book quality, and operational risk.",
}

const CATEGORIES = [
  {
    icon: DollarSign,
    title: "Financial Performance",
    impact: "Highest impact",
    description:
      "Buyers underwrite acquisitions on cash flow, not gross revenue. The financial category examines your last 12 months of revenue, multi-year growth trend, and owner earnings (SDE/EBITDA). A consistently profitable agency with rising revenue is the single most powerful signal a seller can show a buyer.",
    benchmarks: [
      "Healthy owner earnings margin is the foundation every buyer starts with",
      "Consistent multi-year revenue growth meaningfully strengthens the offer",
      "Books above $1M in revenue access a significantly deeper buyer pool",
    ],
  },
  {
    icon: Users,
    title: "Client Retention & Concentration",
    impact: "High impact",
    description:
      "Retention rate is the closest thing to a guaranteed income stream that exists in an insurance book. Buyers and lenders scrutinize it heavily because post-close attrition directly erodes the return on their investment. Client concentration matters equally — if one account represents a disproportionate share of revenue, the buyer is pricing in the risk that they lose it at renewal.",
    benchmarks: [
      "High retention rates signal a sticky, relationship-driven book buyers will pay a premium for",
      "Low client concentration means no single account can crater the deal value post-close",
      "Low retention is one of the most consistent drivers of downward offer pressure in our data",
    ],
  },
  {
    icon: Layers,
    title: "Book Composition",
    impact: "Meaningful impact",
    description:
      "Commercial lines books are valued higher than personal lines books because they carry larger average premiums, longer policy relationships, and meaningfully lower churn. Buyers also look at lines of business mix, average premium per policy, and specialty exposure — high-risk commercial lines like trucking carry their own discount due to volatile loss ratios and limited carrier options post-close.",
    benchmarks: [
      "Commercial-dominant books attract the strongest buyers and the widest bid range",
      "Mixed books are the most common profile and serve as the neutral baseline",
      "High-risk specialty lines are evaluated separately and typically discounted",
    ],
  },
  {
    icon: BarChart2,
    title: "Revenue Growth Trend",
    impact: "Meaningful impact",
    description:
      "Buyers pay for momentum. An agency growing consistently — even at a modest rate — signals that the book will continue to expand under new ownership. Declining revenue is the single most disqualifying signal in a P&C agency transaction. It forces buyers to model attrition into every year of their hold, which compresses the offer at every step.",
    benchmarks: [
      "Strong multi-year growth is the clearest sign of a healthy, scalable platform",
      "Moderate steady growth is viewed positively and protects the valuation floor",
      "Declining books require significant due diligence and almost always result in discounted offers",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Operational Health & Risk",
    impact: "Moderate impact",
    description:
      "Operations tells buyers how difficult the agency will be to run after they close. E&O claims history, producer agreement structures, carrier relationships, and key-person dependency all get scrutinized. An agency where the principal is the only relationship-holder introduces significant transition risk. Documented processes, strong producer agreements, and a streamlined carrier mix are all hallmarks of a high-quality operational profile.",
    benchmarks: [
      "Clean E&O history removes a significant legal risk concern from buyer due diligence",
      "Strong producer agreements protect the book from walking out the door post-sale",
      "A streamlined carrier mix signals operational efficiency and an easier post-close transition",
    ],
  },
  {
    icon: Clock,
    title: "Transition & Deal Structure",
    impact: "Moderate impact",
    description:
      "The mechanics of how you sell matter as much as what you are selling. Buyers place significant value on seller transition length — a longer, well-supported handover de-risks the deal and gives the buyer confidence that clients will not leave simply because the owner did. The scope of the sale (full agency transfer vs. book-only purchase) and how urgently the seller needs to close both directly affect the final offer.",
    benchmarks: [
      "An extended transition period is one of the clearest signals of a cooperative, low-risk seller",
      "Full agency sales open more deal structures and buyer types than book-only transfers",
      "Seller urgency reduces the buyer's sense of competition and typically compresses the price",
    ],
  },
  {
    icon: TrendingUp,
    title: "Market Position & Longevity",
    impact: "Supporting factor",
    description:
      "Agency age, office structure, and employee profile signal institutional durability. A 20-year-old agency with a diversified staff is viewed as a platform acquisition — not a roll-up risk. Virtual and hybrid operations score well because they represent lower post-close overhead. Newer agencies are not penalized by age alone, but they carry less proven track record for buyers to underwrite.",
    benchmarks: [
      "Established agencies with deep community roots signal lower client flight risk",
      "Virtual and hybrid models signal lower overhead and geographic flexibility",
      "Newer agencies can still command strong multiples if the book quality and financials are strong",
    ],
  },
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
          Agency Appraiser uses a 7-category scoring model built from real insurance agency M&A
          transaction data. Every factor in the model maps directly to what buyers and lenders
          actually underwrite when evaluating an independent agency acquisition.
        </p>
      </div>

      {/* 7 Categories */}
      <section className="mb-12">
        <h2 className="mb-2 text-2xl font-bold text-foreground">The 7 Scoring Categories</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Each category drives a directional adjustment to your final valuation — some factors carry
          more weight than others based on how buyers and lenders actually underwrite agency acquisitions.
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
                  <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {cat.impact}
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
            Valuations are based on observed independent agency transactions. Captive agents, surplus lines specialists, and specialty MGAs may fall outside this model.
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
