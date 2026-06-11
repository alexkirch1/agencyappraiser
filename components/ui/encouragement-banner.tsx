"use client"

import { useEffect, useState, useRef } from "react"
import { useEncouragement, type EncouragementContext } from "@/hooks/use-encouragement"

interface Props {
  ctx: EncouragementContext
}

export function EncouragementBanner({ ctx }: Props) {
  const message = useEncouragement(ctx)
  const [visible, setVisible] = useState(false)
  const [displayed, setDisplayed] = useState<typeof message>(null)
  const prevKey = useRef<string>("")
  const [bounce, setBounce] = useState(false)

  useEffect(() => {
    if (!message) {
      setVisible(false)
      return
    }
    const key = message.text
    if (key === prevKey.current) return
    prevKey.current = key

    setVisible(false)
    const swap = setTimeout(() => {
      setDisplayed(message)
      setVisible(true)
      setBounce(true)
      setTimeout(() => setBounce(false), 600)
    }, 180)
    return () => clearTimeout(swap)
  }, [message])

  if (!displayed) return null

  return (
    <div
      aria-live="polite"
      className={`
        mt-4 relative overflow-hidden rounded-2xl px-5 py-4
        border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent
        shadow-[0_0_24px_0px_hsl(var(--primary)/0.15)]
        transition-all duration-300 ease-out
        ${visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}
      `}
    >
      {/* Animated glow pulse in corner */}
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary/20 blur-2xl" />

      <div className="flex items-start gap-3">
        <span
          className={`text-2xl leading-none select-none transition-transform duration-300 ${bounce ? "scale-150" : "scale-100"}`}
          aria-hidden
        >
          {displayed.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">
            {displayed.text}
          </p>
          {displayed.sub && (
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              {displayed.sub}
            </p>
          )}
        </div>
      </div>

      {/* Subtle shimmer bar at bottom */}
      <div
        className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent"
        style={{ width: "100%", animation: "shimmer 2.5s ease-in-out infinite" }}
      />

      <style jsx>{`
        @keyframes shimmer {
          0%   { opacity: 0.3; transform: scaleX(0.4); }
          50%  { opacity: 1;   transform: scaleX(1); }
          100% { opacity: 0.3; transform: scaleX(0.4); }
        }
      `}</style>
    </div>
  )
}
