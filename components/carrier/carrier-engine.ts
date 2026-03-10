// =====================================================
// Carrier Valuation Engine — Travelers, Progressive, Hartford
// =====================================================

export type CarrierName = "progressive" | "travelers" | "hartford" | "safeco"
export type BookType = "personal" | "commercial" | "both" | "auto" | "home"

export interface CarrierInputs {
  carrier: CarrierName | ""
  bookType: BookType | ""
  // ---- Progressive ----
  prog_pl_premium: number | null
  prog_pl_pif: number | null
  prog_pl_loss_ratio: number | null
  prog_cl_premium: number | null
  prog_cl_pif: number | null
  prog_cl_loss_ratio: number | null
  prog_bundle_rate: number | null
  prog_ytd_apps: number | null
  prog_diamond_status: boolean
  // ---- Travelers ----
  travelers_auto_wp: number | null       // $k
  travelers_auto_lr: number | null
  travelers_auto_retention: number | null
  travelers_auto_pif: number | null
  travelers_home_wp: number | null       // $k
  travelers_home_lr: number | null
  travelers_home_retention: number | null
  travelers_home_pif: number | null
  // ---- Hartford ----
  hartford_pl_auto_twp: number | null    // PL Auto TWP $k
  hartford_pl_auto_pif: number | null
  hartford_pl_auto_lr: number | null
  hartford_pl_auto_retention: number | null
  hartford_pl_home_twp: number | null    // PL Home TWP $k
  hartford_pl_home_pif: number | null
  hartford_pl_home_lr: number | null
  hartford_pl_home_retention: number | null
  hartford_cl_twp: number | null         // Small Commercial TWP $k
  hartford_cl_lr: number | null
  hartford_cl_retention: number | null
  // ---- Safeco ----
  safeco_auto_dwp: number | null          // R12 Auto DWP ($)
  safeco_auto_pif: number | null
  safeco_auto_lr: number | null           // YTD Loss Ratio %
  safeco_auto_retention: number | null    // PIF Retention %
  safeco_home_dwp: number | null          // R12 Home DWP ($)
  safeco_home_pif: number | null
  safeco_home_lr: number | null
  safeco_home_retention: number | null
  safeco_other_dwp: number | null         // Condo + Renters + Umbrella + Landlord combined ($)
  safeco_other_lr: number | null
  safeco_other_retention: number | null
  safeco_cross_sell_pct: number | null    // Cross-sell % (Home/Condo/Rent valid cross-sell %)
  safeco_right_track_pct: number | null   // Right Track participation % of auto policies
  safeco_nb_dwp: number | null            // YTD New Business DWP ($)
  safeco_gold_service: boolean            // Gold Service designation
  // ---- Book Quality (all carriers) — sourced from commission statements / active policy list ----

  book_preferred_pct: number | null      // % policies in preferred/standard tier (vs non-standard)
  book_policies_per_customer: number | null  // avg policies per customer (multi-line indicator)
  book_avg_premium_per_policy: number | null // avg premium per policy ($)
  book_new_business_pct: number | null   // % of book that is new business (last 12 months)
  book_monoline_pct: number | null       // % customers with only 1 policy (single-line risk)
  book_digital_docs_pct: number | null   // % customers on paperless/e-docs (stickiness indicator)
}

export interface CarrierResults {
  lowOffer: number
  highOffer: number
  premium: number
  finalMultiple: number
}

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatCurrency(value: number): string {
  return formatter.format(value)
}

export function calculateCarrierValuation(inputs: CarrierInputs): CarrierResults | null {
  const carrier = inputs.carrier
  if (!carrier) return null

  let basePremium = 0
  let finalMultiple = 1.5

  // -------------------------------------------------------
  // Progressive
  // -------------------------------------------------------
  if (carrier === "progressive") {
    const bookType = inputs.bookType
    if (!bookType) return null

    const pl_premium   = inputs.prog_pl_premium ?? 0
    const pl_loss_ratio = inputs.prog_pl_loss_ratio ?? 100
    const cl_premium   = inputs.prog_cl_premium ?? 0
    const cl_loss_ratio = inputs.prog_cl_loss_ratio ?? 100
    const bundle_rate  = inputs.prog_bundle_rate ?? 0
    const ytd_apps     = inputs.prog_ytd_apps ?? 0
    const is_diamond   = inputs.prog_diamond_status

    if (bookType === "both") {
      basePremium = pl_premium + cl_premium
      if (pl_loss_ratio < 40) finalMultiple += 0.18
      else if (pl_loss_ratio > 55) finalMultiple -= 0.17
      if (cl_loss_ratio < 35) finalMultiple += 0.22
      else if (cl_loss_ratio > 55) finalMultiple -= 0.12
    } else if (bookType === "personal") {
      basePremium = pl_premium
      if (pl_loss_ratio < 40) finalMultiple += 0.27
      else if (pl_loss_ratio > 55) finalMultiple -= 0.22
    } else if (bookType === "commercial") {
      basePremium = cl_premium
      if (cl_loss_ratio < 35) finalMultiple += 0.32
      else if (cl_loss_ratio > 55) finalMultiple -= 0.18
    }

    if (basePremium > 0) {
      if (bundle_rate > 65) finalMultiple += 0.12
      else if (bundle_rate < 45) finalMultiple -= 0.06
      if (ytd_apps > 50) finalMultiple += 0.07
      if (is_diamond) finalMultiple += 0.06
      if (basePremium > 3_000_000) finalMultiple += 0.08
      else if (basePremium > 1_000_000) finalMultiple += 0.04
    }
  }

  // -------------------------------------------------------
  // Travelers
  // -------------------------------------------------------
  else if (carrier === "travelers") {
    const bookType = inputs.bookType
    if (!bookType) return null

    const auto_wp  = (inputs.travelers_auto_wp ?? 0) * 1000
    const auto_lr  = inputs.travelers_auto_lr ?? 100
    const auto_ret = inputs.travelers_auto_retention ?? 0
    const home_wp  = (inputs.travelers_home_wp ?? 0) * 1000
    const home_lr  = inputs.travelers_home_lr ?? 100
    const home_ret = inputs.travelers_home_retention ?? 0

    if (bookType === "both") {
      basePremium = auto_wp + home_wp
      if (auto_lr < 65) finalMultiple += 0.12
      else if (auto_lr > 80) finalMultiple -= 0.14
      if (home_lr < 75) finalMultiple += 0.14
      else if (home_lr > 100) finalMultiple -= 0.22
    } else if (bookType === "auto") {
      basePremium = auto_wp
      if (auto_lr < 65) finalMultiple += 0.22
      else if (auto_lr > 80) finalMultiple -= 0.22
    } else if (bookType === "home") {
      basePremium = home_wp
      if (home_lr < 75) finalMultiple += 0.24
      else if (home_lr > 100) finalMultiple -= 0.30
    }

    if (basePremium > 0) {
      if (auto_ret > 75) finalMultiple += 0.08
      else if (auto_ret > 0 && auto_ret < 65) finalMultiple -= 0.07
      if (home_ret > 80) finalMultiple += 0.09
      else if (home_ret > 0 && home_ret < 70) finalMultiple -= 0.07
      if (basePremium > 3_000_000) finalMultiple += 0.08
      else if (basePremium > 1_000_000) finalMultiple += 0.04
    }
  }

  // -------------------------------------------------------
  // Hartford
  // -------------------------------------------------------
  else if (carrier === "hartford") {
    const bookType = inputs.bookType
    if (!bookType) return null

    // Convert $k → $
    const pl_auto_wp  = (inputs.hartford_pl_auto_twp ?? 0) * 1000
    const pl_home_wp  = (inputs.hartford_pl_home_twp ?? 0) * 1000
    const cl_wp       = (inputs.hartford_cl_twp ?? 0) * 1000

    const pl_auto_lr  = inputs.hartford_pl_auto_lr ?? 100
    const pl_home_lr  = inputs.hartford_pl_home_lr ?? 100
    const cl_lr       = inputs.hartford_cl_lr ?? 100

    const pl_auto_ret = inputs.hartford_pl_auto_retention ?? 0
    const pl_home_ret = inputs.hartford_pl_home_retention ?? 0
    const cl_ret      = inputs.hartford_cl_retention ?? 0

    if (bookType === "personal") {
      basePremium = pl_auto_wp + pl_home_wp
      // Hartford PL LR benchmarks: Auto good <75%, Home good <65%
      if (pl_auto_lr < 75) finalMultiple += 0.10
      else if (pl_auto_lr > 90) finalMultiple -= 0.12
      if (pl_home_lr < 65) finalMultiple += 0.12
      else if (pl_home_lr > 85) finalMultiple -= 0.14
    } else if (bookType === "commercial") {
      basePremium = cl_wp
      // Hartford Small Commercial: good LR <50%, poor >75%
      if (cl_lr < 50) finalMultiple += 0.22
      else if (cl_lr > 75) finalMultiple -= 0.15
    } else if (bookType === "both") {
      basePremium = pl_auto_wp + pl_home_wp + cl_wp
      if (pl_auto_lr < 75) finalMultiple += 0.08
      else if (pl_auto_lr > 90) finalMultiple -= 0.10
      if (pl_home_lr < 65) finalMultiple += 0.10
      else if (pl_home_lr > 85) finalMultiple -= 0.12
      if (cl_lr < 50) finalMultiple += 0.14
      else if (cl_lr > 75) finalMultiple -= 0.10
    }

    if (basePremium > 0) {
      // Retention bonuses (Hartford benchmarks slightly lower)
      if (pl_auto_ret > 72) finalMultiple += 0.07
      else if (pl_auto_ret > 0 && pl_auto_ret < 60) finalMultiple -= 0.07
      if (pl_home_ret > 72) finalMultiple += 0.08
      else if (pl_home_ret > 0 && pl_home_ret < 60) finalMultiple -= 0.07
      if (cl_ret > 75) finalMultiple += 0.06
      else if (cl_ret > 0 && cl_ret < 60) finalMultiple -= 0.05
      // Volume tier
      if (basePremium > 5_000_000) finalMultiple += 0.10
      else if (basePremium > 2_000_000) finalMultiple += 0.06
      else if (basePremium > 1_000_000) finalMultiple += 0.03
    }
  }

  // -------------------------------------------------------
  // Safeco
  // -------------------------------------------------------
  else if (carrier === "safeco") {
    const bookType = inputs.bookType
    if (!bookType) return null

    const auto_dwp  = inputs.safeco_auto_dwp ?? 0
    const auto_lr   = inputs.safeco_auto_lr ?? 100
    const auto_ret  = inputs.safeco_auto_retention ?? 0
    const home_dwp  = inputs.safeco_home_dwp ?? 0
    const home_lr   = inputs.safeco_home_lr ?? 100
    const home_ret  = inputs.safeco_home_retention ?? 0
    const other_dwp = inputs.safeco_other_dwp ?? 0
    const other_lr  = inputs.safeco_other_lr ?? 100
    const other_ret = inputs.safeco_other_retention ?? 0

    // Safeco benchmarks (from ADP data): Auto LR target <65%, Home <60%
    // Retention benchmark: ≥72% YTD (per ADP)
    if (bookType === "auto") {
      basePremium = auto_dwp
      if (auto_lr < 55)       finalMultiple += 0.25
      else if (auto_lr < 65)  finalMultiple += 0.12
      else if (auto_lr > 80)  finalMultiple -= 0.18
      else if (auto_lr > 70)  finalMultiple -= 0.08
    } else if (bookType === "home") {
      basePremium = home_dwp
      if (home_lr < 45)       finalMultiple += 0.28
      else if (home_lr < 60)  finalMultiple += 0.14
      else if (home_lr > 80)  finalMultiple -= 0.22
      else if (home_lr > 65)  finalMultiple -= 0.10
    } else if (bookType === "both") {
      basePremium = auto_dwp + home_dwp + other_dwp
      if (auto_lr < 65)       finalMultiple += 0.10
      else if (auto_lr > 80)  finalMultiple -= 0.14
      if (home_lr < 60)       finalMultiple += 0.12
      else if (home_lr > 80)  finalMultiple -= 0.16
      if (other_dwp > 0) {
        if (other_lr < 55)    finalMultiple += 0.06
        else if (other_lr > 75) finalMultiple -= 0.06
      }
    }

    if (basePremium > 0) {
      // Retention — Safeco benchmark 71.3% YTD, good ≥75%
      if (auto_ret >= 75)           finalMultiple += 0.09
      else if (auto_ret > 0 && auto_ret < 65) finalMultiple -= 0.08
      if (home_ret >= 75)           finalMultiple += 0.09
      else if (home_ret > 0 && home_ret < 65) finalMultiple -= 0.08
      if (bookType === "both" && other_ret >= 75) finalMultiple += 0.04

      // Cross-sell — valid cross-sell % benchmark: Auto monoline 75.3% (room to improve = risk)
      // Good cross-sell = Home valid % >50%
      const crossSell = inputs.safeco_cross_sell_pct ?? 0
      if (crossSell >= 55)     finalMultiple += 0.08
      else if (crossSell < 35) finalMultiple -= 0.06

      // Right Track telematics participation — higher = better risk data & stickiness
      const rightTrack = inputs.safeco_right_track_pct ?? 0
      if (rightTrack >= 35)    finalMultiple += 0.05
      else if (rightTrack >= 20) finalMultiple += 0.02

      // Gold Service designation
      if (inputs.safeco_gold_service) finalMultiple += 0.05

      // Volume tiers (R12 DWP)
      if (basePremium >= 10_000_000) finalMultiple += 0.10
      else if (basePremium >= 5_000_000) finalMultiple += 0.07
      else if (basePremium >= 2_000_000) finalMultiple += 0.04
      else if (basePremium >= 1_000_000) finalMultiple += 0.02
    }
  }

  // -------------------------------------------------------
  // Book Quality adjustments (apply to all carriers when data available)
  // -------------------------------------------------------
  if (basePremium > 0) {
    const preferredPct   = inputs.book_preferred_pct
    const policiesPerCx  = inputs.book_policies_per_customer
    const avgPremPerPol  = inputs.book_avg_premium_per_policy
    const newBizPct      = inputs.book_new_business_pct
    const monolinePct    = inputs.book_monoline_pct
    const digitalDocsPct = inputs.book_digital_docs_pct

    // Preferred/standard book tier
    if (preferredPct != null) {
      if (preferredPct >= 80)      finalMultiple += 0.12
      else if (preferredPct >= 65) finalMultiple += 0.06
      else if (preferredPct < 45)  finalMultiple -= 0.10
    }
    // Multi-line density — higher policies/customer = stickier book
    if (policiesPerCx != null) {
      if (policiesPerCx >= 2.2)      finalMultiple += 0.10
      else if (policiesPerCx >= 1.7) finalMultiple += 0.05
      else if (policiesPerCx < 1.3)  finalMultiple -= 0.07
    }
    // Average premium per policy — higher = more valuable commercial/preferred mix
    if (avgPremPerPol != null) {
      if (avgPremPerPol >= 1500)      finalMultiple += 0.06
      else if (avgPremPerPol >= 1000) finalMultiple += 0.03
      else if (avgPremPerPol < 500)   finalMultiple -= 0.04
    }
    // New business % — too high means volatile book
    if (newBizPct != null) {
      if (newBizPct > 30)      finalMultiple -= 0.08
      else if (newBizPct < 10) finalMultiple += 0.04
    }
    // Monoline % — high monoline = lower stickiness
    if (monolinePct != null) {
      if (monolinePct > 60)      finalMultiple -= 0.08
      else if (monolinePct < 30) finalMultiple += 0.07
    }
    // Digital docs — higher engagement = lower lapse rate
    if (digitalDocsPct != null) {
      if (digitalDocsPct >= 70) finalMultiple += 0.04
    }
  }

  finalMultiple = Math.max(0.75, Math.min(3.0, parseFloat(finalMultiple.toFixed(2))))

  if (basePremium <= 0) {
    return { lowOffer: 0, highOffer: 0, premium: 0, finalMultiple }
  }

  const highOffer = Math.round(basePremium * finalMultiple)
  const lowOffer  = Math.max(0, Math.round(basePremium * (finalMultiple - 0.22)))

  return { lowOffer, highOffer, premium: basePremium, finalMultiple }
}

export const defaultCarrierInputs: CarrierInputs = {
  carrier: "",
  bookType: "",
  prog_pl_premium: null,
  prog_pl_pif: null,
  prog_pl_loss_ratio: null,
  prog_cl_premium: null,
  prog_cl_pif: null,
  prog_cl_loss_ratio: null,
  prog_bundle_rate: null,
  prog_ytd_apps: null,
  prog_diamond_status: false,
  travelers_auto_wp: null,
  travelers_auto_lr: null,
  travelers_auto_retention: null,
  travelers_auto_pif: null,
  travelers_home_wp: null,
  travelers_home_lr: null,
  travelers_home_retention: null,
  travelers_home_pif: null,
  hartford_pl_auto_twp: null,
  hartford_pl_auto_pif: null,
  hartford_pl_auto_lr: null,
  hartford_pl_auto_retention: null,
  hartford_pl_home_twp: null,
  hartford_pl_home_pif: null,
  hartford_pl_home_lr: null,
  hartford_pl_home_retention: null,
  hartford_cl_twp: null,
  hartford_cl_lr: null,
  hartford_cl_retention: null,
  safeco_auto_dwp: null,
  safeco_auto_pif: null,
  safeco_auto_lr: null,
  safeco_auto_retention: null,
  safeco_home_dwp: null,
  safeco_home_pif: null,
  safeco_home_lr: null,
  safeco_home_retention: null,
  safeco_other_dwp: null,
  safeco_other_lr: null,
  safeco_other_retention: null,
  safeco_cross_sell_pct: null,
  safeco_right_track_pct: null,
  safeco_nb_dwp: null,
  safeco_gold_service: false,
  book_preferred_pct: null,
  book_policies_per_customer: null,
  book_avg_premium_per_policy: null,
  book_new_business_pct: null,
  book_monoline_pct: null,
  book_digital_docs_pct: null,
}
