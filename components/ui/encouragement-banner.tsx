"use client"

import { useEffect, useState, useRef } from "react"
import { Sparkles } from "lucide-react"
import { useEncouragement, type EncouragementContext } from "@/hooks/use-encouragement"

interface Props {
  ctx: EncouragementContext
}

export function EncouragementBanner({ ctx }: Props) {
  const message = useEncouragement(ctx)
  const [visible, setVisible] = useState(false)
  const [displayed, setDisplayed] = useState<typeof message>(null)
  const prevKey = useRef<string>("")

  useEffect(() => {
    if (!message) {
      setVisible(false)
      return
    }
    const key = message.text
    if (key === prevKey.current) return
    prevKey.current = key

    // Fade out then swap message then fade in
    setVisible(false)
    const swap = setTimeout(() => {
      setDisplayed(message)
      setVisible(true)
    }, 200)
    return () => clearTimeout(swap)
  }, [message])

  if (!displayed) return null

  return (
    <div
      className={`mt-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      }`}
      aria-live="polite"
    >
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div>
        <p className="text-sm font-medium text-foreground leading-snug">{displayed.text}</p>
        {displayed.sub && (
          <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{displayed.sub}</p>
        )}
      </div>
    </div>
  )
}
