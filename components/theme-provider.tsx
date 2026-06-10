"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import confetti from "canvas-confetti"

type Theme = "dark" | "light"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
})

// Easter egg sequences
const INVERT_SEQUENCE  = ["ArrowLeft", "ArrowLeft", "ArrowRight", "ArrowRight", "ArrowUp"]
const KONAMI_SEQUENCE  = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"]
const DOLLAR_SEQUENCE  = ["$","$","$","$","$"]

// Konami confetti — money rain
function fireMoneyConfetti() {
  const duration = 3000
  const end = Date.now() + duration
  const colors = ["#22c55e", "#16a34a", "#4ade80", "#86efac", "#fde047"]

  const frame = () => {
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
      shapes: ["square"],
      scalar: 1.4,
    })
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
      shapes: ["square"],
      scalar: 1.4,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme]         = useState<Theme>("light")
  const [mounted, setMounted]     = useState(false)
  const [inverted, setInverted]   = useState(false)
  const [toast, setToast]         = useState<string | null>(null)
  const [tickerOn, setTickerOn]   = useState(false)
  const sequenceRef               = useRef<string[]>([])
  const toastTimerRef             = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickerTimerRef            = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Theme init ────────────────────────────────────────────────────
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

  // ── Toast helper ──────────────────────────────────────────────────
  const showToast = useCallback((msg: string, ms = 2500) => {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), ms)
  }, [])

  // ── Keyboard easter eggs ──────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable) return

      const maxLen = Math.max(INVERT_SEQUENCE.length, KONAMI_SEQUENCE.length, DOLLAR_SEQUENCE.length)
      sequenceRef.current = [...sequenceRef.current, e.key].slice(-maxLen)
      const seq = sequenceRef.current

      // ← ← → → ↑  — invert colors
      if (seq.slice(-INVERT_SEQUENCE.length).join(",") === INVERT_SEQUENCE.join(",")) {
        sequenceRef.current = []
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

      // Konami code — money confetti
      if (seq.slice(-KONAMI_SEQUENCE.length).join(",") === KONAMI_SEQUENCE.join(",")) {
        sequenceRef.current = []
        fireMoneyConfetti()
        showToast("It's raining money!", 3200)
      }

      // $$$$$  — stock ticker overlay
      if (seq.slice(-DOLLAR_SEQUENCE.length).join(",") === DOLLAR_SEQUENCE.join(",")) {
        sequenceRef.current = []
        setTickerOn(true)
        showToast("To the moon!", 2000)
        if (tickerTimerRef.current) clearTimeout(tickerTimerRef.current)
        tickerTimerRef.current = setTimeout(() => setTickerOn(false), 5000)
      }
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [showToast])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}

      {/* Toast notification */}
      <div
        aria-live="polite"
        style={{ filter: inverted ? "invert(1) hue-rotate(180deg)" : "" }}
        className={`fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground shadow-xl transition-all duration-300 ${
          toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
        }`}
      >
        {toast}
      </div>

      {/* $$$$$  stock ticker overlay */}
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

// Single scrolling ticker row
function TickerRow({ delay }: { delay: number }) {
  const items = [
    "AGCY +14.2%", "BOB +5.8M", "INSR +22%", "ROCKY +99%",
    "APPR +8.4%", "MULTI 3.2x", "RETEN 94%", "COMM +18%",
  ]
  const text = [...items, ...items].join("   ·   ")

  return (
    <div
      className="absolute w-full font-mono text-2xl font-black text-primary/20 whitespace-nowrap animate-ticker"
      style={{
        top: `${8 + delay * 8}%`,
        animationDelay: `${delay * 0.3}s`,
      }}
    >
      {text}   {text}
    </div>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
