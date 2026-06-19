"use client"

import Link from "next/link"
import { TrendingUp } from "lucide-react"
import { useState, useRef, useCallback } from "react"
import { useEasterEggs } from "@/lib/easter-eggs"

// Version bumped on each meaningful release
const APP_VERSION = "2.1.0"
const BUILD_DATE = "2026-06-17T00:00:00"

const FAKE_CHANGELOG = [
  { v: "v2.0.0", note: "Added easter eggs. Productivity: -12%." },
  { v: "v1.9.0", note: "Email drip system. Agencies now receive unsolicited wisdom." },
  { v: "v1.8.3", note: "Fixed bug where $0 agencies were valued at $0. Still correct." },
  { v: "v1.4.0", note: "Added dark mode. Agents prefer brooding in darkness." },
  { v: "v0.9.0", note: "Removed the feature that insulted low retention rates. Professionally." },
  { v: "v0.3.1", note: "Convinced calculator that 3x multiples are real." },
  { v: "v0.0.1", note: "Invented insurance. You're welcome." },
]

export function Footer() {
  const [changelogOpen, setChangelogOpen] = useState(false)
  const { markFound, foundCount, total, allFound } = useEasterEggs()
  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleVersionClick = useCallback(() => {
    clickCountRef.current += 1
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    clickTimerRef.current = setTimeout(() => { clickCountRef.current = 0 }, 800)

    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0
      markFound("changelog")
      setChangelogOpen((prev) => !prev)
    }
  }, [markFound])

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
            <Link href="/ams" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              AMS Report
            </Link>
            <Link href="/my-valuations" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              My Valuations
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
                {"© 2026 Agency Appraiser. All rights reserved."}
              </p>
            </div>
            <div className="relative shrink-0">
              <button
                onClick={handleVersionClick}
                className="font-mono text-[10px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors cursor-default select-none"
                title="Build version and timestamp"
                suppressHydrationWarning
              >
                v{APP_VERSION} {" • "} {BUILD_DATE.replace("T", " ")}
                {" • "}
                {allFound
                  ? `all ${total} easter eggs found`
                  : foundCount > 0
                    ? `${foundCount}/${total} easter eggs found`
                    : `${total} easter eggs hidden`
                }
              </button>

              {/* Secret changelog popover */}
              {changelogOpen && (
                <div className="absolute bottom-6 right-0 z-50 w-72 rounded-xl border border-border bg-card p-4 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Honest Changelog</span>
                    <button
                      onClick={() => setChangelogOpen(false)}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      close
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {FAKE_CHANGELOG.map((entry) => (
                      <li key={entry.v} className="text-left">
                        <span className="font-mono text-[10px] font-bold text-primary">{entry.v}</span>
                        <span className="ml-2 text-[11px] text-muted-foreground">{entry.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
