"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Lock, Calculator, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ReadinessScorecard } from "@/components/readiness/readiness-scorecard"

export default function ReadinessPage() {
  const [hasAccess, setHasAccess] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const completed = sessionStorage.getItem("fullCalcCompleted")
    setHasAccess(completed === "true")
    setChecking(false)
  }, [])

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md border-border">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Lock className="h-7 w-7 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Seller Scorecard Locked</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Complete the Full Valuation Calculator first to unlock the Seller Readiness Scorecard.
            </p>
            <Button asChild className="mt-6 gap-2">
              <Link href="/calculator">
                <Calculator className="h-4 w-4" />
                Go to Full Valuation
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Seller Readiness Scorecard</h1>
        <p className="mt-2 text-muted-foreground">
          Walk through every preparation item a buyer will evaluate. Check off items as you complete them to track your readiness.
        </p>
      </div>
      <ReadinessScorecard />
    </div>
  )
}
