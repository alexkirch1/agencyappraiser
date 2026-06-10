"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"

type Theme = "dark" | "light"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
})

const EASTER_EGG_SEQUENCE = ["ArrowLeft", "ArrowLeft", "ArrowRight", "ArrowRight", "ArrowUp"]

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)
  const [inverted, setInverted] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const sequenceRef = useRef<string[]>([])
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("agency-appraiser-theme") as Theme | null
    if (stored === "light" || stored === "dark") {
      setTheme(stored)
    } else {
      localStorage.setItem("agency-appraiser-theme", "light")
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    localStorage.setItem("agency-appraiser-theme", theme)
  }, [theme, mounted])

  // Easter egg: ← ← → → ↑  inverts the whole site
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      // Ignore when typing in any interactive element
      if (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        el.isContentEditable
      ) return

      sequenceRef.current = [...sequenceRef.current, e.key].slice(-EASTER_EGG_SEQUENCE.length)

      if (sequenceRef.current.join(",") === EASTER_EGG_SEQUENCE.join(",")) {
        sequenceRef.current = []
        setInverted((prev) => {
          const next = !prev
          // Apply filter directly so it's instant
          document.documentElement.style.filter = next ? "invert(1) hue-rotate(180deg)" : ""
          // Counter-rotate media elements so they don't look broken
          requestAnimationFrame(() => {
            document.querySelectorAll<HTMLElement>("img, video, canvas, [data-no-invert]").forEach((el) => {
              el.style.filter = next ? "invert(1) hue-rotate(180deg)" : ""
            })
          })
          return next
        })
        // Show toast
        setToastVisible(true)
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        toastTimerRef.current = setTimeout(() => setToastVisible(false), 2200)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
      {/* Easter egg toast — rendered outside invert so it always reads correctly */}
      <div
        aria-live="polite"
        style={{ filter: inverted ? "invert(1) hue-rotate(180deg)" : "" }}
        className={`fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground shadow-xl transition-all duration-300 ${
          toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
        }`}
      >
        {inverted ? "Colors inverted — ← ← → → ↑ to restore" : "Colors restored"}
      </div>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
