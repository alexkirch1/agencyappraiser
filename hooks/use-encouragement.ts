"use client"

import { useMemo } from "react"

export interface EncouragementContext {
  revenue?: number | null
  retention?: string | null        // "high" | "average" | "low"
  growth?: string | null           // "growing" | "stable" | "declining"
  bookType?: string | null         // "commercial" | "personal" | "mixed"
  customers?: number | null
  policies?: number | null
  retention_rate?: number | null   // 0-100 numeric (full calculator)
  years_in_business?: number | null
  fieldsCompleted?: number         // 0-N, drives progress messages
}

interface EncouragementMessage {
  text: string
  sub?: string
}

// Contextual, data-driven messages — ordered from most specific to least
export function useEncouragement(ctx: EncouragementContext): EncouragementMessage | null {
  return useMemo(() => {
    const { revenue, retention, growth, bookType, customers, retention_rate, years_in_business, fieldsCompleted = 0 } = ctx

    // Revenue milestones
    if (revenue && revenue >= 2_000_000)
      return { text: "That is a significant book of business.", sub: "Agencies at this revenue level typically command premium multiples." }
    if (revenue && revenue >= 1_000_000)
      return { text: "Seven figures — you have built something real here.", sub: "Million-dollar books attract serious buyers." }
    if (revenue && revenue >= 500_000)
      return { text: "Solid mid-market agency.", sub: "This size is the sweet spot for most strategic acquirers." }
    if (revenue && revenue > 0 && revenue < 200_000)
      return { text: "Every great agency started somewhere.", sub: "Smaller books can still command strong multiples with the right buyer." }

    // High retention
    if ((retention === "high" || (retention_rate != null && retention_rate >= 92)))
      return { text: "Exceptional retention — that is your biggest value driver.", sub: "Buyers pay a premium for sticky books." }

    // Retention + growth combo
    if (retention === "high" && growth === "growing")
      return { text: "High retention and growing? That is a top-tier profile.", sub: "Very few agencies tick both boxes." }

    // Growth trend
    if (growth === "growing")
      return { text: "Growth trend is a strong positive signal to buyers.", sub: "It suggests the book will be worth more tomorrow than today." }
    if (growth === "declining")
      return { text: "Declining trend noted — but this is fixable.", sub: "Buyers often price in upside if the fundamentals are otherwise solid." }

    // Book type
    if (bookType === "commercial")
      return { text: "Commercial books typically trade at higher multiples.", sub: "Less commoditized and harder for clients to move." }
    if (bookType === "personal")
      return { text: "Personal lines is a large, liquid market.", sub: "Lots of buyers means competitive pricing for well-retained books." }

    // Customer count milestones
    if (customers && customers >= 1000)
      return { text: "Over 1,000 clients is a real asset.", sub: "Diversification reduces concentration risk and supports valuation." }
    if (customers && customers >= 500)
      return { text: "Healthy client base.", sub: "Diversified books are less risky — and buyers know it." }

    // Years in business
    if (years_in_business && years_in_business >= 20)
      return { text: "Two decades in the business — that kind of tenure builds trust.", sub: "Long-standing agencies tend to have stickier client relationships." }
    if (years_in_business && years_in_business >= 10)
      return { text: "10+ years of history adds credibility to your book.", sub: "Buyers value proven, long-tenured agencies." }

    // Progress nudges based on fields completed
    if (fieldsCompleted === 1)
      return { text: "Good start — keep going.", sub: "Each field sharpens your valuation accuracy." }
    if (fieldsCompleted >= 3 && fieldsCompleted < 6)
      return { text: "You are about halfway there.", sub: "The more detail you add, the more precise your number." }
    if (fieldsCompleted >= 6)
      return { text: "Almost done — great detail so far.", sub: "This level of input produces a much tighter valuation range." }

    return null
  }, [ctx.revenue, ctx.retention, ctx.growth, ctx.bookType, ctx.customers, ctx.retention_rate, ctx.years_in_business, ctx.fieldsCompleted])
}
