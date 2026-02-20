"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    if (stored === "light" || stored === "dark") {
      setTheme(stored)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
      root.classList.remove("light")
    } else {
      root.classList.remove("dark")
      root.classList.add("light")
    }
    localStorage.setItem("theme", theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
