// ─── AMS Types ────────────────────────────────────────────────────────────────

export type AmsName = "ezlynx" | "manual"

export interface AmsInputs {
  ams: AmsName | ""

  // Book overview
  total_pif: number | null            // Total policies in force
  total_premium: number | null        // Total written premium ($)
  personal_lines_pct: number | null   // % of book that is personal lines
  commercial_lines_pct: number | null // % of book that is commercial lines

  // Retention
  overall_retention: number | null    // Overall retention rate (%)
  pl_retention: number | null         // Personal lines retention (%)
  cl_retention: number | null         // Commercial lines retention (%)

  // New business
  new_business_premium: number | null // New business written premium ($)
  new_business_policies: number | null // New business policy count

  // Loss ratios
  overall_loss_ratio: number | null   // Overall loss ratio (%)
  pl_loss_ratio: number | null        // Personal lines loss ratio (%)
  cl_loss_ratio: number | null        // Commercial lines loss ratio (%)

  // Revenue / growth
  revenue_ltm: number | null          // Agency revenue / commission LTM ($)
  revenue_prior_year: number | null   // Prior year revenue ($)

  // Staff & operations
  producer_count: number | null       // Number of producers / CSRs
  years_in_business: number | null    // Years agency has been operating
}

export const defaultAmsInputs: AmsInputs = {
  ams: "",
  total_pif: null,
  total_premium: null,
  personal_lines_pct: null,
  commercial_lines_pct: null,
  overall_retention: null,
  pl_retention: null,
  cl_retention: null,
  new_business_premium: null,
  new_business_policies: null,
  overall_loss_ratio: null,
  pl_loss_ratio: null,
  cl_loss_ratio: null,
  revenue_ltm: null,
  revenue_prior_year: null,
  producer_count: null,
  years_in_business: null,
}

// ─── Valuation result ─────────────────────────────────────────────────────────

export interface AmsValuationResult {
  baseMultiple: number
  adjustedMultiple: number
  lowOffer: number
  midOffer: number
  highOffer: number
  revenueBasis: number
  adjustments: { label: string; direction: "up" | "down" | "neutral"; note: string }[]
  dataCompleteness: number // 0-100
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function calculateAmsValuation(inputs: AmsInputs): AmsValuationResult | null {
  const revenue = inputs.revenue_ltm
  if (!revenue || revenue <= 0) return null

  const priorRevenue = inputs.revenue_prior_year
  const retention   = inputs.overall_retention ?? inputs.pl_retention
  const lossRatio   = inputs.overall_loss_ratio
  const clPct       = inputs.commercial_lines_pct

  let multiple = 2.0
  const adjustments: AmsValuationResult["adjustments"] = []

  // Retention
  if (retention !== null) {
    if (retention >= 90) {
      multiple += 0.3
      adjustments.push({ label: "Retention", direction: "up", note: `${retention}% — exceptional` })
    } else if (retention >= 85) {
      multiple += 0.15
      adjustments.push({ label: "Retention", direction: "up", note: `${retention}% — strong` })
    } else if (retention < 75) {
      multiple -= 0.3
      adjustments.push({ label: "Retention", direction: "down", note: `${retention}% — below threshold` })
    } else {
      adjustments.push({ label: "Retention", direction: "neutral", note: `${retention}% — average` })
    }
  }

  // Revenue growth
  if (priorRevenue && priorRevenue > 0) {
    const growth = ((revenue - priorRevenue) / priorRevenue) * 100
    if (growth >= 10) {
      multiple += 0.25
      adjustments.push({ label: "Revenue Growth", direction: "up", note: `+${growth.toFixed(1)}% YoY — strong momentum` })
    } else if (growth >= 3) {
      multiple += 0.1
      adjustments.push({ label: "Revenue Growth", direction: "up", note: `+${growth.toFixed(1)}% YoY — moderate` })
    } else if (growth < 0) {
      multiple -= 0.25
      adjustments.push({ label: "Revenue Growth", direction: "down", note: `${growth.toFixed(1)}% YoY — declining` })
    } else {
      adjustments.push({ label: "Revenue Growth", direction: "neutral", note: `${growth.toFixed(1)}% YoY — flat` })
    }
  }

  // Book composition
  if (clPct !== null) {
    if (clPct >= 60) {
      multiple += 0.2
      adjustments.push({ label: "Book Composition", direction: "up", note: `${clPct}% commercial — premium` })
    } else if (clPct <= 20) {
      multiple -= 0.1
      adjustments.push({ label: "Book Composition", direction: "down", note: `${clPct}% commercial — personal-heavy` })
    } else {
      adjustments.push({ label: "Book Composition", direction: "neutral", note: `${clPct}% commercial — mixed` })
    }
  }

  // Loss ratio
  if (lossRatio !== null) {
    if (lossRatio <= 55) {
      multiple += 0.1
      adjustments.push({ label: "Loss Ratio", direction: "up", note: `${lossRatio}% — excellent` })
    } else if (lossRatio >= 80) {
      multiple -= 0.2
      adjustments.push({ label: "Loss Ratio", direction: "down", note: `${lossRatio}% — elevated` })
    } else {
      adjustments.push({ label: "Loss Ratio", direction: "neutral", note: `${lossRatio}% — acceptable` })
    }
  }

  // Longevity
  const years = inputs.years_in_business
  if (years !== null) {
    if (years >= 20) {
      multiple += 0.1
      adjustments.push({ label: "Agency Longevity", direction: "up", note: `${years} years — established` })
    } else if (years < 5) {
      multiple -= 0.1
      adjustments.push({ label: "Agency Longevity", direction: "down", note: `${years} years — early stage` })
    }
  }

  // Clamp
  multiple = Math.max(0.75, Math.min(3.5, multiple))

  const mid  = revenue * multiple
  const low  = mid * 0.88
  const high = mid * 1.15

  // Data completeness
  const fields = Object.values(inputs).filter((v) => v !== null && v !== "" && v !== undefined)
  const total  = Object.keys(defaultAmsInputs).length - 1 // exclude ams field
  const completeness = Math.min(100, Math.round((fields.length / total) * 100))

  return {
    baseMultiple: 2.0,
    adjustedMultiple: multiple,
    lowOffer: Math.round(low),
    midOffer: Math.round(mid),
    highOffer: Math.round(high),
    revenueBasis: revenue,
    adjustments,
    dataCompleteness: completeness,
  }
}

export function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}
