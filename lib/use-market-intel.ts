import useSWR from "swr"

export interface CompletedDeal {
  id: number
  deal_name: string
  deal_type: "full" | "book"
  premium_base: number | null
  appraised_low: number | null
  appraised_high: number | null
  final_offer: number
  final_multiple: number
  deal_structure: string | null
  earnout_pct: number | null
  seller_stay_months: number | null
  retention_rate: number | null
  loss_ratio: number | null
  policies_per_cx: number | null
  primary_state: string | null
  carrier: string | null
  notes: string | null
  closed_at: string | null
  created_at: string
}

export interface MarketIntel {
  /** Number of completed deals used for benchmarks */
  sampleSize: number
  /** Median final multiple across all completed deals */
  medianMultiple: number | null
  /** Average final multiple */
  avgMultiple: number | null
  /** Median earnout % (0 if cash-only) */
  medianEarnout: number | null
  /** % of deals that had any earnout component */
  earnoutRate: number | null
  /** Median seller stay-on months */
  medianSellerStay: number | null
  /** Avg offer-to-estimate ratio (final_offer / estimated_valuation) */
  avgOfferToEstimate: number | null
  /** Deals grouped by deal type */
  byType: {
    full: { count: number; medianMultiple: number | null }
    book: { count: number; medianMultiple: number | null }
  }
  /** Suggested multiple adjustment based on comp data vs model estimate */
  suggestedMultipleAdjustment: number
  /** Human-readable insight lines to show in the UI */
  insights: string[]
  /** Raw deals for display in admin */
  deals: CompletedDeal[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function median(nums: number[]): number | null {
  if (!nums.length) return null
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function buildIntel(deals: CompletedDeal[], modelMultiple?: number): MarketIntel {
  if (!deals.length) {
    return {
      sampleSize: 0,
      medianMultiple: null,
      avgMultiple: null,
      medianEarnout: null,
      earnoutRate: null,
      medianSellerStay: null,
      avgOfferToEstimate: null,
      byType: { full: { count: 0, medianMultiple: null }, book: { count: 0, medianMultiple: null } },
      suggestedMultipleAdjustment: 0,
      insights: ["No completed deals on record yet — benchmarks will appear after your first closed deal."],
      deals: [],
    }
  }

  const multiples = deals.map((d) => d.final_multiple).filter((m) => m > 0)
  const earnouts = deals.map((d) => d.earnout_pct ?? 0)
  const stays = deals.filter((d) => d.seller_stay_months != null).map((d) => d.seller_stay_months as number)
  const ratios = deals
    .filter((d) => (d.appraised_low ?? 0) > 0 && d.final_offer > 0)
    .map((d) => d.final_offer / ((d.appraised_low! + (d.appraised_high ?? d.appraised_low!)) / 2))

  const fullDeals = deals.filter((d) => d.deal_type === "full")
  const bookDeals = deals.filter((d) => d.deal_type === "book")

  const medMult = median(multiples)
  const avgMult = avg(multiples)
  const earnoutRate = earnouts.filter((e) => e > 0).length / deals.length

  // Suggested adjustment: if model multiple is provided, nudge toward market median
  let suggestedAdj = 0
  if (modelMultiple != null && medMult != null) {
    const diff = medMult - modelMultiple
    // Blend at 30% weight so model still dominates
    suggestedAdj = parseFloat((diff * 0.3).toFixed(2))
  }

  // Build insights
  const insights: string[] = []
  if (medMult != null)
    insights.push(`Median closed multiple across ${deals.length} deal${deals.length > 1 ? "s" : ""}: ${medMult.toFixed(2)}x`)
  if (earnoutRate > 0)
    insights.push(`${Math.round(earnoutRate * 100)}% of completed deals included an earnout component`)
  const medStay = median(stays)
  if (medStay != null)
    insights.push(`Median seller stay-on: ${medStay} months`)
  const avgRatio = avg(ratios)
  if (avgRatio != null)
    insights.push(`Avg final offer was ${Math.round(avgRatio * 100)}% of the model estimate`)
  if (suggestedAdj > 0.05)
    insights.push(`Market data suggests your model may be underpricing by ~${suggestedAdj.toFixed(2)}x`)
  else if (suggestedAdj < -0.05)
    insights.push(`Market data suggests your model may be overpricing by ~${Math.abs(suggestedAdj).toFixed(2)}x`)

  return {
    sampleSize: deals.length,
    medianMultiple: medMult,
    avgMultiple: avgMult,
    medianEarnout: median(earnouts.filter((e) => e > 0)),
    earnoutRate: earnoutRate || null,
    medianSellerStay: medStay,
    avgOfferToEstimate: avgRatio,
    byType: {
      full: {
        count: fullDeals.length,
        medianMultiple: median(fullDeals.map((d) => d.final_multiple).filter((m) => m > 0)),
      },
      book: {
        count: bookDeals.length,
        medianMultiple: median(bookDeals.map((d) => d.final_multiple).filter((m) => m > 0)),
      },
    },
    suggestedMultipleAdjustment: suggestedAdj,
    insights,
    deals,
  }
}

export function useMarketIntel(modelMultiple?: number) {
  const { data, error, isLoading, mutate } = useSWR<{ deals: CompletedDeal[] }>(
    "/api/completed-deal",
    fetcher,
    { revalidateOnFocus: false }
  )

  const intel = buildIntel(data?.deals ?? [], modelMultiple)

  return { intel, isLoading, error, mutate }
}
