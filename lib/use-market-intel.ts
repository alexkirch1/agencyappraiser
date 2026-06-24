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
  // Learning model fields
  model_multiple: number | null
  override_reason: string | null
  total_policies: number | null
  total_customers: number | null
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
  /**
   * Suggested multiple adjustment based on comp data vs model estimate.
   * 30% weighted nudge toward market median — legacy field kept for compat.
   */
  suggestedMultipleAdjustment: number
  /**
   * Learned adjustment from the learning model.
   * Derived from the avg delta between final_multiple and model_multiple
   * across completed deals (weighted by recency). This is the value the
   * factor engine adds as fLearned to the base multiple.
   */
  learnedMultipleAdjustment: number
  /** Learning model quality metadata */
  learningModel: {
    /** How many deals had both model_multiple and final_multiple (training data) */
    trainingSize: number
    /** Average override delta (positive = market closes above model) */
    avgOverrideDelta: number | null
    /** Median override delta */
    medianOverrideDelta: number | null
    /** Most common override reason */
    topOverrideReason: string | null
    /** How much the model has been nudged (human-readable) */
    nudgeDescription: string
  }
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

/**
 * Learning model: derive a blended adjustment to add to the base 1.0x multiple.
 *
 * The model looks at every completed deal where both model_multiple and
 * final_multiple are recorded, computes the delta (final - model) per deal,
 * then weights more recent deals 2x vs older ones.
 *
 * The learned adjustment is capped at ±0.5x to prevent runaway drift.
 */
function computeLearnedAdjustment(deals: CompletedDeal[]): {
  adjustment: number
  trainingSize: number
  avgDelta: number | null
  medianDelta: number | null
  topReason: string | null
  nudgeDescription: string
} {
  const trainingDeals = deals.filter(
    (d) => d.model_multiple != null && d.final_multiple > 0
  )

  if (!trainingDeals.length) {
    return {
      adjustment: 0,
      trainingSize: 0,
      avgDelta: null,
      medianDelta: null,
      topReason: null,
      nudgeDescription: "No training data yet — model adjusts automatically as deals close.",
    }
  }

  // Sort by created_at ascending so newer deals get higher weight
  const sorted = [...trainingDeals].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const n = sorted.length
  let weightedSum = 0
  let weightTotal = 0
  const rawDeltas: number[] = []

  sorted.forEach((d, i) => {
    const delta = d.final_multiple - d.model_multiple!
    rawDeltas.push(delta)
    // Recency weight: older deals = 1, newer = up to 2
    const weight = 1 + (i / Math.max(n - 1, 1))
    weightedSum += delta * weight
    weightTotal += weight
  })

  const weightedAvg = weightTotal > 0 ? weightedSum / weightTotal : 0

  // Blend at 40% so base model still dominates; cap at ±0.5
  const rawAdj = weightedAvg * 0.40
  const adjustment = parseFloat(Math.max(-0.5, Math.min(0.5, rawAdj)).toFixed(3))

  // Most common override reason
  const reasonCounts: Record<string, number> = {}
  trainingDeals.forEach((d) => {
    if (d.override_reason) {
      reasonCounts[d.override_reason] = (reasonCounts[d.override_reason] ?? 0) + 1
    }
  })
  const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const avgD = avg(rawDeltas)
  const medD = median(rawDeltas)

  let nudgeDescription = "Model is calibrated."
  if (adjustment > 0.05) {
    nudgeDescription = `Market closes ${adjustment.toFixed(2)}x above model on average — base nudged up.`
  } else if (adjustment < -0.05) {
    nudgeDescription = `Market closes ${Math.abs(adjustment).toFixed(2)}x below model on average — base nudged down.`
  }

  return {
    adjustment,
    trainingSize: trainingDeals.length,
    avgDelta: avgD != null ? parseFloat(avgD.toFixed(3)) : null,
    medianDelta: medD != null ? parseFloat(medD.toFixed(3)) : null,
    topReason,
    nudgeDescription,
  }
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
      learnedMultipleAdjustment: 0,
      learningModel: {
        trainingSize: 0,
        avgOverrideDelta: null,
        medianOverrideDelta: null,
        topOverrideReason: null,
        nudgeDescription: "No training data yet — model adjusts automatically as deals close.",
      },
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

  // Legacy: suggested adjustment (30% nudge toward median)
  let suggestedAdj = 0
  if (modelMultiple != null && medMult != null) {
    suggestedAdj = parseFloat(((medMult - modelMultiple) * 0.3).toFixed(2))
  }

  // New: learning model
  const learned = computeLearnedAdjustment(deals)

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
  if (learned.adjustment > 0.05)
    insights.push(`Learning model: market closes ${learned.adjustment.toFixed(2)}x above model average — base nudged up`)
  else if (learned.adjustment < -0.05)
    insights.push(`Learning model: market closes ${Math.abs(learned.adjustment).toFixed(2)}x below model average — base nudged down`)

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
    learnedMultipleAdjustment: learned.adjustment,
    learningModel: {
      trainingSize: learned.trainingSize,
      avgOverrideDelta: learned.avgDelta,
      medianOverrideDelta: learned.medianDelta,
      topOverrideReason: learned.topReason,
      nudgeDescription: learned.nudgeDescription,
    },
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
