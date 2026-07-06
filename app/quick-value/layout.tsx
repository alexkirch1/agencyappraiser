import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Quick Insurance Agency Value Estimate — 60-Second Tool",
  description:
    "Get a free insurance agency valuation estimate in under 60 seconds. Enter your annual premium revenue, retention rate, and a few key details to see what buyers are paying for agencies like yours.",
  keywords: [
    "quick insurance agency valuation",
    "insurance agency estimate",
    "how much is my agency worth",
    "insurance agency sale price",
    "free agency valuation",
  ],
  alternates: { canonical: "https://www.agencyappraiser.com/quick-value" },
  openGraph: {
    title: "Quick Insurance Agency Value Estimate — 60-Second Tool",
    description:
      "Free instant insurance agency valuation estimate. Enter your premium revenue and retention rate to see what buyers pay for agencies like yours.",
    url: "https://www.agencyappraiser.com/quick-value",
  },
}

export default function QuickValueLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
