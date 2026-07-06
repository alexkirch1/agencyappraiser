import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Insurance Agency Valuation Calculator — Full 7-Category Scorecard",
  description:
    "Run a full insurance agency valuation with our 7-category weighted scorecard. Analyze financial performance, retention, book composition, growth, operations, deal structure, and market factors to get a defensible M&A multiple.",
  keywords: [
    "insurance agency valuation calculator",
    "how much is my insurance agency worth",
    "insurance agency M&A multiple",
    "P&C agency scorecard",
    "sell insurance agency calculator",
  ],
  alternates: { canonical: "https://www.agencyappraiser.com/calculator" },
  openGraph: {
    title: "Insurance Agency Valuation Calculator",
    description:
      "Full 7-category weighted scorecard for independent P&C insurance agencies. Get a defensible valuation multiple based on real M&A transaction data.",
    url: "https://www.agencyappraiser.com/calculator",
  },
}

export default function CalculatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
