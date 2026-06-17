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
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Easter Eggs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hidden surprises scattered across the site. This panel shows which ones have been discovered by the current browser.
        </p>
      </div>

      {/* Progress card */}
      <div className={`rounded-xl border p-5 flex items-center gap-5 ${allFound ? "border-yellow-400/50 bg-yellow-50/50 dark:bg-yellow-950/20" : "border-border bg-card"}`}>
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl ${allFound ? "bg-yellow-100 dark:bg-yellow-900/40" : "bg-secondary"}`}>
          {allFound ? <Trophy className="h-7 w-7 text-yellow-500" /> : <span className="font-bold text-lg text-muted-foreground">{foundCount}/{total}</span>}
        </div>
        <div>
          {allFound ? (
            <>
              <p className="font-bold text-yellow-800 dark:text-yellow-300">All easter eggs found!</p>
              <p className="text-sm text-yellow-700/80 dark:text-yellow-400/80">You clearly have excellent taste and too much free time.</p>
            </>
          ) : (
            <>
              <p className="font-bold text-foreground">{foundCount} of {total} discovered</p>
              <p className="text-sm text-muted-foreground">{total - foundCount} still hiding. Hints below.</p>
            </>
          )}
        </div>
      </div>

      {/* Egg list */}
      <div className="grid gap-3 sm:grid-cols-2">
        {EASTER_EGGS.map((egg) => {
          const isFound = found.has(egg.id)
          return (
            <div
              key={egg.id}
              className={`rounded-xl border p-4 transition-all ${
                isFound
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card opacity-70"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none mt-0.5" aria-hidden>{egg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold text-sm ${isFound ? "text-foreground" : "text-muted-foreground"}`}>
                      {egg.label}
                    </p>
                    {isFound
                      ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      : <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    }
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{egg.description}</p>
                  <p className={`mt-2 font-mono text-[11px] rounded-md px-2 py-1 inline-block ${
                    isFound
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {isFound ? egg.hint : "??? — not yet found"}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground/50">
        Discovery status is tracked per-browser using localStorage. Clearing site data will reset progress.
      </p>
    </div>
  )
}
