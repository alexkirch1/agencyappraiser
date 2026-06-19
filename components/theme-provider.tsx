"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import confetti from "canvas-confetti"
import { EasterEggsProvider, useEasterEggs, type EasterEggId } from "@/lib/easter-eggs"

type Theme = "dark" | "light"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
})

const INVERT_SEQUENCE = ["ArrowLeft", "ArrowLeft", "ArrowRight", "ArrowRight", "ArrowUp"]
const KONAMI_SEQUENCE = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"]
const DOLLAR_SEQUENCE = ["$","$","$","$","$"]

function fireMoneyConfetti() {
  const duration = 3000
  const end = Date.now() + duration
  const colors = ["#22c55e", "#16a34a", "#4ade80", "#86efac", "#fde047"]
  const frame = () => {
    confetti({ particleCount: 6, angle: 60,  spread: 55, origin: { x: 0 }, colors, shapes: ["square"], scalar: 1.4 })
    confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors, shapes: ["square"], scalar: 1.4 })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

// ── Inner provider — has access to EasterEggsContext ─────────────────────────
function ThemeProviderInner({ children }: { children: React.ReactNode }) {
  const [theme, setTheme]       = useState<Theme>("light")
  const [mounted, setMounted]   = useState(false)
  const [inverted, setInverted] = useState(false)
  const [toast, setToast]       = useState<string | null>(null)
  const [tickerOn, setTickerOn] = useState(false)
  const sequenceRef             = useRef<string[]>([])
  const toastTimerRef           = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickerTimerRef          = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { markFound }           = useEasterEggs()

  useEffect(() => {
    const stored = localStorage.getItem("agency-appraiser-theme") as Theme | null
    if (stored === "light" || stored === "dark") setTheme(stored)
    else localStorage.setItem("agency-appraiser-theme", "light")
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    theme === "dark" ? root.classList.add("dark") : root.classList.remove("dark")
    localStorage.setItem("agency-appraiser-theme", theme)
  }, [theme, mounted])

  const showToast = useCallback((msg: string, ms = 2500) => {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), ms)
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable) return

      const maxLen = Math.max(INVERT_SEQUENCE.length, KONAMI_SEQUENCE.length, DOLLAR_SEQUENCE.length)
      sequenceRef.current = [...sequenceRef.current, e.key].slice(-maxLen)
      const seq = sequenceRef.current

      // ← ← → → ↑
      if (seq.slice(-INVERT_SEQUENCE.length).join(",") === INVERT_SEQUENCE.join(",")) {
        sequenceRef.current = []
        markFound("invert")
        setInverted((prev) => {
          const next = !prev
          document.documentElement.style.filter = next ? "invert(1) hue-rotate(180deg)" : ""
          requestAnimationFrame(() => {
            document.querySelectorAll<HTMLElement>("img, video, canvas, [data-no-invert]").forEach((el) => {
              el.style.filter = next ? "invert(1) hue-rotate(180deg)" : ""
            })
          })
          showToast(next ? "Colors inverted — ← ← → → ↑ to restore" : "Colors restored")
          return next
        })
      }

      // Konami
      if (seq.slice(-KONAMI_SEQUENCE.length).join(",") === KONAMI_SEQUENCE.join(",")) {
        sequenceRef.current = []
        markFound("konami")
        fireMoneyConfetti()
        showToast("It's raining money!", 3200)
      }

      // $$$$$
      if (seq.slice(-DOLLAR_SEQUENCE.length).join(",") === DOLLAR_SEQUENCE.join(",")) {
        sequenceRef.current = []
        markFound("ticker")
        setTickerOn(true)
        showToast("To the moon!", 2000)
        if (tickerTimerRef.current) clearTimeout(tickerTimerRef.current)
        tickerTimerRef.current = setTimeout(() => setTickerOn(false), 5000)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [showToast, markFound])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}

      {/* Toast */}
      <div
        aria-live="polite"
        style={{ filter: inverted ? "invert(1) hue-rotate(180deg)" : "" }}
        className={`fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground shadow-xl transition-all duration-300 ${
          toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
        }`}
      >
        {toast}
      </div>

      {/* Stock ticker overlay */}
      {tickerOn && (
        <div
          aria-hidden
          style={{ filter: inverted ? "invert(1) hue-rotate(180deg)" : "" }}
          className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <TickerRow key={i} delay={i * 0.4} />
          ))}
        </div>
      )}
    </ThemeContext.Provider>
  )
}

function TickerRow({ delay }: { delay: number }) {
  const items = ["AGCY +14.2%","BOB +5.8M","INSR +22%","APPR +99%","APPR +8.4%","MULTI 3.2x","RETEN 94%","COMM +18%"]
  const text = [...items, ...items].join("   ·   ")
  return (
    <div
      className="absolute w-full font-mono text-2xl font-black text-primary/20 whitespace-nowrap animate-ticker"
      style={{ top: `${8 + delay * 8}%`, animationDelay: `${delay * 0.3}s` }}
    >
      {text}   {text}
    </div>
  )
}

// ── "Found all" celebration toast ─────────────────────────────────────────────
function AllFoundToast({ children }: { children: React.ReactNode }) {
  const [show, setShow]   = useState(false)
  const [count, setCount] = useState(0)
  const shownRef          = useRef<Set<string>>(new Set())

  const handleNewFind = useCallback((id: EasterEggId, allFound: boolean, total: number) => {
    if (shownRef.current.has(id)) return
    shownRef.current.add(id)
    setCount(total)

    if (allFound) {
      setShow(true)
      // Big confetti burst for finding them all
      confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 }, colors: ["#f59e0b","#22c55e","#3b82f6","#ec4899"] })
      setTimeout(() => setShow(false), 5000)
    }
  }, [])

  return (
    <EasterEggsProvider onNewFind={handleNewFind}>
      <ThemeProviderInner>
        {children}
        <div
          aria-live="assertive"
          className={`fixed top-6 left-1/2 z-[10000] -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-yellow-400/40 bg-yellow-50 px-6 py-3 shadow-2xl dark:bg-yellow-950/80 transition-all duration-500 ${
            show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-sm font-bold text-yellow-900 dark:text-yellow-200">You found all {count} easter eggs!</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400">Seriously impressive. You have too much time on your hands.</p>
          </div>
        </div>
        {/* Count badge — always visible once any egg found */}
        <EggCountBadge />
      </ThemeProviderInner>
    </EasterEggsProvider>
  )
}

function EggCountBadge() {
  const { foundCount, total, allFound } = useEasterEggs()
  return (
    <div
      aria-label={allFound ? `All ${total} easter eggs found!` : `${foundCount} of ${total} easter eggs found — keep looking`}
      title={allFound ? `All ${total} easter eggs found!` : `${foundCount} of ${total} easter eggs found`}
      className={`fixed bottom-6 right-6 z-[9997] flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur-sm transition-all duration-300 cursor-default select-none ${
        allFound
          ? "border-yellow-400/60 bg-yellow-400/20 text-yellow-700 dark:text-yellow-300"
          : "border-border bg-background/80 text-muted-foreground"
      }`}
    >
      <span className="text-base leading-none" aria-hidden>🥚</span>
      {allFound
        ? `All ${total} found!`
        : foundCount > 0
          ? `${foundCount}/${total} easter eggs`
          : `${total} easter eggs hidden`
      }
    </div>
  )
}

// ── Public exports ────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <AllFoundToast>{children}</AllFoundToast>
}

export function useTheme() {
  return useContext(ThemeContext)
}
