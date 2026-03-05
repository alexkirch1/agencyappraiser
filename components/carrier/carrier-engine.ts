// =====================================================
// Carrier Valuation Engine — Travelers & Progressive
// =====================================================

export type CarrierName = "progressive" | "travelers"
export type BookType = "personal" | "commercial" | "both" | "auto" | "home"

export interface CarrierInputs {
  carrier: CarrierName | ""
  bookType: BookType | ""
  // Progressive
  prog_pl_premium: number | null   // Personal Lines T12 Written Premium ($)
  prog_pl_pif: number | null       // PL Policies in Force
  prog_pl_loss_ratio: number | null
  prog_cl_premium: number | null   // Commercial Lines T12 Written Premium ($)
  prog_cl_pif: number | null
  prog_cl_loss_ratio: number | null
  prog_bundle_rate: number | null  // %
  prog_ytd_apps: number | null
  prog_diamond_status: boolean
  // Travelers
  travelers_auto_wp: number | null      // Auto Written Premium ($k)
  travelers_auto_lr: number | null      // Auto Loss Ratio %
  travelers_auto_retention: number | null
  travelers_auto_pif: number | null
  travelers_home_wp: number | null      // Homeowners Written Premium ($k)
  travelers_home_lr: number | null
  travelers_home_retention: number | null
  travelers_home_pif: number | null
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

    const pl_premium = inputs.prog_pl_premium ?? 0
    const pl_loss_ratio = inputs.prog_pl_loss_ratio ?? 100
    const cl_premium = inputs.prog_cl_premium ?? 0
    const cl_loss_ratio = inputs.prog_cl_loss_ratio ?? 100
    const bundle_rate = inputs.prog_bundle_rate ?? 0
    const ytd_apps = inputs.prog_ytd_apps ?? 0
    const is_diamond = inputs.prog_diamond_status

    if (bookType === "both") {
      basePremium = pl_premium + cl_premium
      if (basePremium > 0) {
        // PL: excellent <40%, poor >55%
        if (pl_loss_ratio < 40) finalMultiple += 0.18
        else if (pl_loss_ratio > 55) finalMultiple -= 0.17
        // CL: excellent <35%, poor >55%
        if (cl_loss_ratio < 35) finalMultiple += 0.22
        else if (cl_loss_ratio > 55) finalMultiple -= 0.12
      }
    } else if (bookType === "personal") {
      basePremium = pl_premium
      if (basePremium > 0) {
        if (pl_loss_ratio < 40) finalMultiple += 0.27
        else if (pl_loss_ratio > 55) finalMultiple -= 0.22
      }
    } else if (bookType === "commercial") {
      basePremium = cl_premium
      if (basePremium > 0) {
        if (cl_loss_ratio < 35) finalMultiple += 0.32
        else if (cl_loss_ratio > 55) finalMultiple -= 0.18
      }
    }

    if (basePremium > 0) {
      // Bundle rate bonus: >65% is strong
      if (bundle_rate > 65) finalMultiple += 0.12
      else if (bundle_rate < 45) finalMultiple -= 0.06
      // Growth signal via YTD apps
      if (ytd_apps > 50) finalMultiple += 0.07
      // Diamond/preferred status
      if (is_diamond) finalMultiple += 0.06
      // Volume tier bonus
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

    // Convert $k to $ for calculations
    const auto_wp = (inputs.travelers_auto_wp ?? 0) * 1000
    const auto_lr = inputs.travelers_auto_lr ?? 100
    const auto_ret = inputs.travelers_auto_retention ?? 0
    const home_wp = (inputs.travelers_home_wp ?? 0) * 1000
    const home_lr = inputs.travelers_home_lr ?? 100
    const home_ret = inputs.travelers_home_retention ?? 0

    if (bookType === "both") {
      basePremium = auto_wp + home_wp
      if (basePremium > 0) {
        // Travelers auto: excellent <65%, poor >80%
        if (auto_lr < 65) finalMultiple += 0.12
        else if (auto_lr > 80) finalMultiple -= 0.14
        // Home: excellent <75%, poor >100%
        if (home_lr < 75) finalMultiple += 0.14
        else if (home_lr > 100) finalMultiple -= 0.22
      }
    } else if (bookType === "auto") {
      basePremium = auto_wp
      if (basePremium > 0) {
        if (auto_lr < 65) finalMultiple += 0.22
        else if (auto_lr > 80) finalMultiple -= 0.22
      }
    } else if (bookType === "home") {
      basePremium = home_wp
      if (basePremium > 0) {
        if (home_lr < 75) finalMultiple += 0.24
        else if (home_lr > 100) finalMultiple -= 0.30
      }
    }

    if (basePremium > 0) {
      // Retention bonuses
      if (auto_ret > 75) finalMultiple += 0.08
      else if (auto_ret > 0 && auto_ret < 65) finalMultiple -= 0.07
      if (home_ret > 80) finalMultiple += 0.09
      else if (home_ret > 0 && home_ret < 70) finalMultiple -= 0.07
      // Volume tier
      if (basePremium > 3_000_000) finalMultiple += 0.08
      else if (basePremium > 1_000_000) finalMultiple += 0.04
    }
  }

  finalMultiple = Math.max(0.75, Math.min(3.0, parseFloat(finalMultiple.toFixed(2))))

  if (basePremium <= 0) {
    return { lowOffer: 0, highOffer: 0, premium: 0, finalMultiple }
  }

  const highOffer = Math.round(basePremium * finalMultiple)
  const lowOffer = Math.max(0, Math.round(basePremium * (finalMultiple - 0.22)))

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
}
