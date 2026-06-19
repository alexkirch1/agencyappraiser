"use client"

import { EASTER_EGGS } from "@/lib/easter-eggs"
import { useEffect, useState } from "react"
import { CheckCircle2, Circle, Trophy } from "lucide-react"

const STORAGE_KEY = "agency-appraiser-found-eggs"

export function EasterEggsTab() {
  const [found, setFound] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setFound(new Set(JSON.parse(stored)))
    } catch { /* ignore */ }
  }, [])

  const foundCount = found.size
  const total      = EASTER_EGGS.length
  const allFound   = foundCount === total

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Easter Eggs — Admin Key</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Full list of all hidden easter eggs, their triggers, and discovery status for this browser.
        </p>
      </div>

      {/* Progress */}
      <div className={`flex items-center gap-4 rounded-xl border p-5 ${allFound ? "border-yellow-400/50 bg-yellow-50/50 dark:bg-yellow-950/20" : "border-border bg-card"}`}>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold ${allFound ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" : "bg-secondary text-muted-foreground"}`}>
          {allFound ? <Trophy className="h-6 w-6 text-yellow-500" /> : `${foundCount}/${total}`}
        </div>
        <div>
          <p className="font-semibold text-foreground">
            {allFound ? "All easter eggs discovered" : `${foundCount} of ${total} discovered in this browser`}
          </p>
          <p className="text-sm text-muted-foreground">
            {allFound ? "You clearly have too much free time." : `${total - foundCount} still unfound here — try the hints below.`}
          </p>
        </div>
      </div>

      {/* Cheat sheet — always shows full hints */}
      <div className="grid gap-3 sm:grid-cols-2">
        {EASTER_EGGS.map((egg) => {
          const isFound = found.has(egg.id)
          return (
            <div
              key={egg.id}
              className={`rounded-xl border p-4 ${isFound ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-2xl leading-none" aria-hidden>{egg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{egg.label}</p>
                    {isFound
                      ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      : <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    }
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{egg.description}</p>
                  {/* Hint always visible in admin */}
                  <p className="mt-2 inline-block rounded-md bg-secondary px-2 py-1 font-mono text-[11px] text-foreground">
                    {egg.hint}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground/50">
        Discovery status is tracked per-browser via localStorage. Clearing site data resets progress.
      </p>
    </div>
  )
}
