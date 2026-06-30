import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Insurance Agency AMS Valuation Report — EZLynx Upload",
  description:
    "Upload your EZLynx or AMS export to get a full agency-level valuation breakdown. Analyze your entire book of business by carrier, line, retention, and growth to produce a detailed M&A report.",
  keywords: [
    "EZLynx agency valuation",
    "AMS insurance agency report",
    "insurance agency book analysis",
    "EZLynx export valuation",
    "agency management system valuation",
  ],
  alternates: { canonical: "https://www.agencyappraiser.com/ams" },
  openGraph: {
    title: "Insurance Agency AMS Valuation Report — EZLynx Upload",
    description:
      "Upload your EZLynx export for a full agency valuation broken down by carrier, line, retention, and growth. Built for independent P&C agencies.",
    url: "https://www.agencyappraiser.com/ams",
  },
}

export default function AmsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
