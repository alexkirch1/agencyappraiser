import Link from "next/link"
import { TrendingUp } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <TrendingUp className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">
              Agency<span className="text-primary">Appraiser</span>
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/calculator" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Valuation Calculator
            </Link>
            <Link href="/carrier" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Carrier Calculator
            </Link>
            <Link href="/quiz" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Readiness Quiz
            </Link>
            <Link href="/readiness" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Seller Scorecard
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-border pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            This tool provides preliminary estimates for educational purposes only. It is not a binding offer or formal appraisal.
          </p>
          <p className="mt-2 text-xs text-muted-foreground/60">
            {"Agency Appraiser. All rights reserved."}
          </p>
        </div>
      </div>
    </footer>
  )
}
