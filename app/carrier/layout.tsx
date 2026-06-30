import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Insurance Carrier Book of Business Valuation Tool",
  description:
    "Value a single insurance carrier book of business. Enter premiums, retention, loss ratio, and growth metrics to see what a carrier-specific book is worth to potential buyers.",
  keywords: [
    "insurance carrier book valuation",
    "book of business value",
    "sell insurance book of business",
    "carrier book M&A",
    "P&C book of business worth",
  ],
  alternates: { canonical: "https://www.agencyappraiser.com/carrier" },
  openGraph: {
    title: "Insurance Carrier Book of Business Valuation Tool",
    description:
      "Value a single insurance carrier book of business based on premiums, retention, loss ratio, and growth. Built for independent P&C agents.",
    url: "https://www.agencyappraiser.com/carrier",
  },
}

export default function CarrierLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
