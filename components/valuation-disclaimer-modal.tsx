"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  onContinue: () => void
}

export function ValuationDisclaimerModal({ onContinue }: Props) {
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const duration = 3500
    const interval = 30
    const step = (interval / duration) * 100
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step
        if (next >= 100) {
          clearInterval(timer)
          setTimeout(() => setReady(true), 200)
          return 100
        }
        return next
      })
    }, interval)
    return () => clearInterval(timer)
  }, [])

  const messages = [
    "Climbing the data peaks...",
    "Analyzing revenue streams...",
    "Scoring risk categories...",
    "Crunching the numbers...",
    "Almost at the summit...",
  ]
  const messageIndex = Math.min(Math.floor(progress / 20), messages.length - 1)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-2xl overflow-hidden">
        <CardContent className="flex flex-col items-center p-8 text-center">
          {/* Mountain Goat */}
          <div
            className="relative mb-6"
            style={{
              animation: ready ? "none" : "goat-bob 2s ease-in-out infinite",
            }}
          >
            <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-border bg-secondary">
              <Image
                src="/images/mountain-goat.jpg"
                alt="Mountain goat mascot"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* Progress bar and message */}
          {!ready && (
            <div className="mb-2 w-full">
              <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-100 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm font-medium text-primary animate-pulse">{messages[messageIndex]}</p>
              <p className="mt-1 text-xs text-muted-foreground">{Math.round(progress)}%</p>
            </div>
          )}

          {/* Disclaimer content */}
          {ready && (
            <div className="flex flex-col gap-4" style={{ animation: "fade-up 0.4s ease-out" }}>
              <div className="rounded-lg border border-border bg-secondary/50 p-4 text-left">
                <p className="text-sm leading-relaxed text-foreground">
                  <span className="font-bold">Please Note:</span> This figure is a preliminary
                  estimate for educational purposes only. It is not a binding offer.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  A member of our team may review this data to discuss a formal valuation based on
                  these details.
                </p>
              </div>
              <Button onClick={onContinue} size="lg" className="w-full text-base">
                I Understand &mdash; Show My Valuation
              </Button>
              <p className="text-xs text-muted-foreground">
                By clicking this button, you acknowledge the above disclaimer.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes goat-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes fade-up {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
