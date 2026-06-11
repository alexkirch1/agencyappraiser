"use client"

import { useMemo } from "react"

export interface EncouragementContext {
  revenue?: number | null
  retention?: string | null
  growth?: string | null
  bookType?: string | null
  customers?: number | null
  policies?: number | null
  retention_rate?: number | null
  years_in_business?: number | null
  fieldsCompleted?: number
}

interface EncouragementMessage {
  text: string
  sub?: string
  emoji: string
}

export function useEncouragement(ctx: EncouragementContext): EncouragementMessage | null {
  return useMemo(() => {
    const {
      revenue, retention, growth, bookType,
      customers, retention_rate, years_in_business, fieldsCompleted = 0,
    } = ctx

    // Revenue milestones — most specific first
    if (revenue && revenue >= 5_000_000)
      return {
        emoji: "🏆",
        text: "Top 1% territory.",
        sub: "Agencies this size attract institutional buyers and command elite multiples.",
      }
    if (revenue && revenue >= 2_000_000)
      return {
        emoji: "🚀",
        text: "You have built something serious here.",
        sub: "Books over $2M open the door to strategic acquirers with deep pockets.",
      }
    if (revenue && revenue >= 1_000_000)
      return {
        emoji: "💎",
        text: "Seven figures. That is a real business.",
        sub: "Million-dollar books attract serious, competitive offers.",
      }
    if (revenue && revenue >= 500_000)
      return {
        emoji: "📈",
        text: "Sweet spot for acquirers.",
        sub: "This size is exactly what most strategic buyers are hunting for.",
      }
    if (revenue && revenue >= 250_000)
      return {
        emoji: "💪",
        text: "Solid foundation.",
        sub: "You are in the range where buyers start paying real multiples.",
      }
    if (revenue && revenue > 0 && revenue < 200_000)
      return {
        emoji: "🌱",
        text: "Every great agency started somewhere.",
        sub: "Small books with great retention still command strong multiples.",
      }

    // Retention + growth combo — higher priority than either alone
    if ((retention === "high" || (retention_rate != null && retention_rate >= 92)) && growth === "growing")
      return {
        emoji: "🔥",
        text: "High retention AND growing? That is a rare combo.",
        sub: "Buyers will fight over this. Very few agencies tick both boxes.",
      }

    // High retention alone
    if (retention === "high" || (retention_rate != null && retention_rate >= 92))
      return {
        emoji: "🧲",
        text: "Exceptional retention — that is your #1 value driver.",
        sub: "Sticky books sleep at night. Buyers pay a serious premium for them.",
      }

    // Growth trend
    if (growth === "growing")
      return {
        emoji: "📊",
        text: "Growth trend = money in the bank.",
        sub: "A growing book tells buyers the value will be higher tomorrow than today.",
      }
    if (growth === "declining")
      return {
        emoji: "🛠️",
        text: "Declining trend noted — but this is fixable.",
        sub: "Buyers often price in upside if the fundamentals are otherwise solid.",
      }

    // Book type
    if (bookType === "commercial")
      return {
        emoji: "🏢",
        text: "Commercial books trade at higher multiples. Full stop.",
        sub: "Harder to move, harder to replace — buyers know it.",
      }
    if (bookType === "personal")
      return {
        emoji: "🏡",
        text: "Personal lines: a massive, liquid market.",
        sub: "Lots of buyers = competitive bidding for well-retained books.",
      }

    // Customer count milestones
    if (customers && customers >= 2000)
      return {
        emoji: "🌐",
        text: "That is a diversified book.",
        sub: "2,000+ clients means no single loss tanks your valuation.",
      }
    if (customers && customers >= 1000)
      return {
        emoji: "👥",
        text: "1,000+ clients is a genuine asset.",
        sub: "Diversification de-risks the book and buyers know it.",
      }

    // Years in business
    if (years_in_business && years_in_business >= 20)
      return {
        emoji: "🎖️",
        text: "Twenty years in this business. That is rare.",
        sub: "Long tenure = deep client relationships = sticky book.",
      }
    if (years_in_business && years_in_business >= 10)
      return {
        emoji: "⏳",
        text: "A decade of history adds real credibility.",
        sub: "Buyers value proven, long-standing agencies.",
      }

    // Progress nudges
    if (fieldsCompleted === 1)
      return {
        emoji: "👋",
        text: "Great start — keep going.",
        sub: "Each field you fill in sharpens the accuracy of your number.",
      }
    if (fieldsCompleted >= 3 && fieldsCompleted < 6)
      return {
        emoji: "⚡",
        text: "Halfway there — looking good.",
        sub: "The more detail you add, the tighter your valuation range gets.",
      }
    if (fieldsCompleted >= 6)
      return {
        emoji: "🎯",
        text: "Almost done — great detail so far.",
        sub: "This level of input produces the most accurate valuation we can give.",
      }

    return null
  }, [ctx.revenue, ctx.retention, ctx.growth, ctx.bookType, ctx.customers, ctx.retention_rate, ctx.years_in_business, ctx.fieldsCompleted])
}
