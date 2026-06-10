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
  const sequenceRef = useRef<string[]>([])

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

  // Easter egg: ArrowLeft ArrowLeft ArrowRight ArrowRight ArrowUp inverts colors
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ignore keypresses inside inputs/textareas
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      sequenceRef.current = [...sequenceRef.current, e.key].slice(-EASTER_EGG_SEQUENCE.length)

      if (sequenceRef.current.join(",") === EASTER_EGG_SEQUENCE.join(",")) {
        sequenceRef.current = []
        setInverted((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  useEffect(() => {
    document.documentElement.style.filter = inverted ? "invert(1) hue-rotate(180deg)" : ""
    // Images and videos look bad fully inverted — counter-rotate them back
    const mediaSelector = "img, video, canvas, [data-no-invert]"
    const els = document.querySelectorAll<HTMLElement>(mediaSelector)
    els.forEach((el) => {
      el.style.filter = inverted ? "invert(1) hue-rotate(180deg)" : ""
    })
  }, [inverted])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
