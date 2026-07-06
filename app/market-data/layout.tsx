import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Insurance Agency M&A Market Data — Closed Deal Multiples",
  description:
    "Browse real closed insurance agency M&A transaction data. See median multiples, deal structures, earnout rates, and market trends for independent P&C agency sales.",
  keywords: [
    "insurance agency M&A data",
    "insurance agency sale multiples",
    "P&C agency deal data",
    "insurance agency transaction database",
    "agency acquisition multiples",
  ],
  alternates: { canonical: "https://www.agencyappraiser.com/market-data" },
  openGraph: {
    title: "Insurance Agency M&A Market Data — Closed Deal Multiples",
    description:
      "Real closed insurance agency M&A transaction data. Median multiples, deal structures, and market trends for independent P&C agencies.",
    url: "https://www.agencyappraiser.com/market-data",
  },
}

export default function MarketDataLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
