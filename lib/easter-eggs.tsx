"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"

// ── Master list of all easter eggs ────────────────────────────────────────────
export const EASTER_EGGS = [
  {
    id: "invert",
    label: "The Matrix",
    hint: "Press ← ← → → ↑ anywhere on the page",
    description: "Inverts the colors of the entire site",
    icon: "🌀",
  },
  {
    id: "konami",
    label: "Money Rain",
    hint: "↑ ↑ ↓ ↓ ← → ← → B A",
    description: "Triggers a money confetti explosion",
    icon: "💸",
  },
  {
    id: "ticker",
    label: "To The Moon",
    hint: "Press $ five times fast",
    description: "Launches a full-screen stock ticker overlay",
    icon: "📈",
  },
  {
    id: "logo-flip",
    label: "Upside Down",
    hint: "Triple-click the AgencyAppraiser logo",
    description: "Flips the logo upside down for 2 seconds",
    icon: "🙃",
  },
  {
    id: "changelog",
    label: "Honest Changelog",
    hint: "Click the version number in the footer 5 times",
    description: "Reveals the secret (and honest) build changelog",
    icon: "📜",
  },
] as const

export type EasterEggId = typeof EASTER_EGGS[number]["id"]

const STORAGE_KEY = "agency-appraiser-found-eggs"
const TOTAL = EASTER_EGGS.length

// ── Context ───────────────────────────────────────────────────────────────────
interface EasterEggsContextType {
  found: Set<EasterEggId>
  foundCount: number
  total: number
  markFound: (id: EasterEggId) => void
  allFound: boolean
}

const EasterEggsContext = createContext<EasterEggsContextType>({
  found: new Set(),
  foundCount: 0,
  total: TOTAL,
  markFound: () => {},
  allFound: false,
})

export function EasterEggsProvider({
  children,
  onNewFind,
}: {
  children: React.ReactNode
  onNewFind: (id: EasterEggId, allFound: boolean, count: number) => void
}) {
  const [found, setFound] = useState<Set<EasterEggId>>(() => {
    if (typeof window === "undefined") return new Set()
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? new Set(JSON.parse(stored) as EasterEggId[]) : new Set()
    } catch { return new Set() }
  })

  // Persist to localStorage whenever found changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...found]))
    } catch { /* quota */ }
  }, [found])

  const onNewFindRef = useRef(onNewFind)
  useEffect(() => { onNewFindRef.current = onNewFind }, [onNewFind])

  const markFound = useCallback((id: EasterEggId) => {
    setFound((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      const allFound = next.size === TOTAL
      // Fire callback after state settles
      setTimeout(() => onNewFindRef.current(id, allFound, next.size), 0)
      return next
    })
  }, [])

  return (
    <EasterEggsContext.Provider
      value={{
        found,
        foundCount: found.size,
        total: TOTAL,
        markFound,
        allFound: found.size === TOTAL,
      }}
    >
      {children}
    </EasterEggsContext.Provider>
  )
}

export function useEasterEggs() {
  return useContext(EasterEggsContext)
}
