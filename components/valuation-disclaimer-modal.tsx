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
    const duration = 3000
    const interval = 30
    const step = (interval / duration) * 100
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step
        if (next >= 100) {
          clearInterval(timer)
          setReady(true)
          return 100
        }
        return next
      })
    }, interval)
    return () => clearInterval(timer)
  }, [])

  const messages = [
    "Analyzing revenue data...",
    "Scoring risk categories...",
    "Calculating multiples...",
    "Building your valuation...",
  ]
  const messageIndex = Math.min(Math.floor(progress / 25), messages.length - 1)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-2xl">
        <CardContent className="flex flex-col items-center p-8 text-center">
          {/* Mountain Goat */}
          <div className="relative mb-6 h-32 w-32 overflow-hidden rounded-full border-2 border-primary/20 bg-secondary">
            <Image
              src="/images/mountain-goat.jpg"
              alt="Mountain goat mascot"
              fill
              className="object-cover"
            />
          </div>

          {/* Progress */}
          <div className="mb-4 w-full">
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm font-medium text-primary">{messages[messageIndex]}</p>
          </div>

          {/* Disclaimer */}
          {ready && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="rounded-lg border border-border bg-secondary/50 p-4 text-left">
                <p className="text-sm leading-relaxed text-foreground">
                  <span className="font-semibold">Please Note:</span> This figure is a preliminary
                  estimate for educational purposes only. It is not a binding offer.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  A member of our team may review this data to discuss a formal valuation based on
                  these details.
                </p>
              </div>
              <Button onClick={onContinue} size="lg" className="w-full gap-2 text-base">
                I Understand &mdash; Show My Valuation
              </Button>
              <p className="text-xs text-muted-foreground">
                By clicking this button, you acknowledge the above disclaimer.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
