import Link from "next/link"
import { TrendingUp } from "lucide-react"

// Version bumped on each meaningful release
const APP_VERSION = "1.6.0"
const BUILD_DATE = "2026-03-06T09:00:00"

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
            <Link href="/quick-value" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Quick Value
            </Link>
            <Link href="/calculator" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Full Valuation
            </Link>
            <Link href="/carrier" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Carrier Report
            </Link>
            <Link href="/readiness" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Seller Scorecard
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-border pt-8">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
            <div>
              <p className="text-sm text-muted-foreground">
                This tool provides preliminary estimates for educational purposes only. It is not a binding offer or formal appraisal.
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                {"Agency Appraiser. All rights reserved."}
              </p>
            </div>
            <p className="shrink-0 font-mono text-[10px] text-muted-foreground/40" title="Build version and timestamp">
              v{APP_VERSION} &bull; {BUILD_DATE.replace("T", " ")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
