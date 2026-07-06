import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Insurance Agency Readiness Quiz — Are You Ready to Sell?",
  description:
    "Take our free quiz to find out if your insurance agency is ready for an M&A transaction. Answer 10 questions about your financials, operations, retention, and succession plan to get a readiness score.",
  alternates: { canonical: "https://www.agencyappraiser.com/quiz" },
  openGraph: {
    title: "Insurance Agency Readiness Quiz — Are You Ready to Sell?",
    description:
      "Free 10-question quiz for independent insurance agency owners. Find out your M&A readiness score before going to market.",
    url: "https://www.agencyappraiser.com/quiz",
  },
}

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
