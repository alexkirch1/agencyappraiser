"use client"

import { ReadinessScorecard } from "@/components/readiness/readiness-scorecard"

export default function ReadinessPage() {
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
