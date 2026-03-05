"use client"

import { useState, useRef, useEffect } from "react"
import { Info } from "lucide-react"

interface InfoTipProps {
  text: string
}

export function InfoTip({ text }: InfoTipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    document.addEventListener("touchstart", handler)
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("touchstart", handler)
    }
  }, [open])

  return (
    <span className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-muted-foreground focus:outline-none"
        aria-label="More info"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2.5 text-xs leading-relaxed text-popover-foreground shadow-lg">
          {text}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-border" />
        </div>
      )}
    </span>
  )
}
