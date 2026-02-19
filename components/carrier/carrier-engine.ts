// =====================================================
// Carrier Valuation Engine – ported from PHP/JS
// =====================================================

export type CarrierName = "progressive" | "safeco" | "hartford" | "travelers" | "msa"
export type BookType = "personal" | "commercial" | "both" | "auto" | "home"

export interface CarrierInputs {
  carrier: CarrierName | ""
  bookType: BookType | ""
  // Progressive
  prog_pl_premium: number | null
  prog_pl_pif: number | null
  prog_pl_loss_ratio: number | null
  prog_cl_premium: number | null
  prog_cl_pif: number | null
  prog_cl_loss_ratio: number | null
  prog_bundle_rate: number | null
  prog_ytd_apps: number | null
  prog_diamond_status: boolean
  // Safeco
  safeco_total_dwp: number | null
  safeco_pif: number | null
  safeco_loss_ratio: number | null
  safeco_retention: number | null
  safeco_nb_count: number | null
  // Hartford
  hartford_pl_twp: number | null
  hartford_pl_lr: number | null
  hartford_pl_retention: number | null
  hartford_cl_twp: number | null
  hartford_cl_lr: number | null
  hartford_cl_retention: number | null
  // Travelers
  travelers_auto_wp: number | null
  travelers_auto_lr: number | null
  travelers_auto_retention: number | null
  travelers_home_wp: number | null
  travelers_home_lr: number | null
  travelers_home_retention: number | null
  // MSA
  msa_total_dwp: number | null
  msa_pif: number | null
  msa_loss_ratio: number | null
  msa_retention: number | null
  msa_nb_premium: number | null
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
        if (pl_loss_ratio < 40) finalMultiple += 0.15
        else if (pl_loss_ratio > 55) finalMultiple -= 0.15
        if (cl_loss_ratio < 10) finalMultiple += 0.2
        else if (cl_loss_ratio > 55) finalMultiple -= 0.1
      }
    } else if (bookType === "personal") {
      basePremium = pl_premium
      if (basePremium > 0) {
        if (pl_loss_ratio < 40) finalMultiple += 0.25
        else if (pl_loss_ratio > 55) finalMultiple -= 0.2
      }
    } else if (bookType === "commercial") {
      basePremium = cl_premium
      if (basePremium > 0) {
        if (cl_loss_ratio < 10) finalMultiple += 0.3
        else if (cl_loss_ratio > 55) finalMultiple -= 0.15
      }
    }
    if (basePremium > 0) {
      if (bundle_rate > 65) finalMultiple += 0.1
      if (ytd_apps > 50) finalMultiple += 0.05
      if (is_diamond) finalMultiple += 0.05
    }
  } else if (carrier === "safeco") {
    basePremium = inputs.safeco_total_dwp ?? 0
    const loss_ratio = inputs.safeco_loss_ratio ?? 100
    const retention = inputs.safeco_retention ?? 0
    if (basePremium > 0) {
      if (loss_ratio < 45) finalMultiple += 0.25
      else if (loss_ratio > 60) finalMultiple -= 0.2
      if (retention > 70) finalMultiple += 0.15
      else if (retention < 60) finalMultiple -= 0.1
    }
  } else if (carrier === "hartford") {
    const bookType = inputs.bookType
    if (!bookType) return null

    const pl_twp = (inputs.hartford_pl_twp ?? 0) * 1000
    const pl_lr = inputs.hartford_pl_lr ?? 100
    const pl_retention = inputs.hartford_pl_retention ?? 0
    const cl_twp = (inputs.hartford_cl_twp ?? 0) * 1000
    const cl_lr = inputs.hartford_cl_lr ?? 100
    const cl_retention = inputs.hartford_cl_retention ?? 0

    if (bookType === "both") {
      basePremium = pl_twp + cl_twp
      if (basePremium > 0) {
        if (pl_lr < 30) finalMultiple += 0.2
        else if (pl_lr > 55) finalMultiple -= 0.15
        if (cl_lr < 20) finalMultiple += 0.2
        else if (cl_lr > 55) finalMultiple -= 0.15
      }
    } else if (bookType === "personal") {
      basePremium = pl_twp
      if (basePremium > 0) {
        if (pl_lr < 30) finalMultiple += 0.3
        else if (pl_lr > 55) finalMultiple -= 0.2
      }
    } else if (bookType === "commercial") {
      basePremium = cl_twp
      if (basePremium > 0) {
        if (cl_lr < 20) finalMultiple += 0.3
        else if (cl_lr > 55) finalMultiple -= 0.2
      }
    }
    if (basePremium > 0) {
      if (pl_retention > 75 || cl_retention > 70) finalMultiple += 0.1
    }
  } else if (carrier === "travelers") {
    const bookType = inputs.bookType
    if (!bookType) return null

    const auto_wp = (inputs.travelers_auto_wp ?? 0) * 1000
    const auto_lr = inputs.travelers_auto_lr ?? 100
    const auto_retention = inputs.travelers_auto_retention ?? 0
    const home_wp = (inputs.travelers_home_wp ?? 0) * 1000
    const home_lr = inputs.travelers_home_lr ?? 100
    const home_retention = inputs.travelers_home_retention ?? 0

    if (bookType === "both") {
      basePremium = auto_wp + home_wp
      if (basePremium > 0) {
        if (auto_lr < 65) finalMultiple += 0.1
        else if (auto_lr > 80) finalMultiple -= 0.1
        if (home_lr < 80) finalMultiple += 0.1
        else if (home_lr > 105) finalMultiple -= 0.2
      }
    } else if (bookType === "auto") {
      basePremium = auto_wp
      if (basePremium > 0) {
        if (auto_lr < 65) finalMultiple += 0.2
        else if (auto_lr > 80) finalMultiple -= 0.2
      }
    } else if (bookType === "home") {
      basePremium = home_wp
      if (basePremium > 0) {
        if (home_lr < 80) finalMultiple += 0.2
        else if (home_lr > 105) finalMultiple -= 0.3
      }
    }
    if (basePremium > 0) {
      if (auto_retention > 70 || home_retention > 75) finalMultiple += 0.1
    }
  } else if (carrier === "msa") {
    basePremium = inputs.msa_total_dwp ?? 0
    const loss_ratio = inputs.msa_loss_ratio ?? 100
    const retention = inputs.msa_retention ?? 0
    if (basePremium > 0) {
      if (loss_ratio < 45) finalMultiple += 0.2
      else if (loss_ratio > 60) finalMultiple -= 0.15
      if (retention > 88) finalMultiple += 0.1
      else if (retention < 80) finalMultiple -= 0.1
    }
  }

  finalMultiple = Math.max(0.75, Math.min(3.0, finalMultiple))

  let highOffer = 0
  let lowOffer = 0
  if (basePremium > 0) {
    highOffer = basePremium * finalMultiple
    lowOffer = basePremium * (finalMultiple - 0.25)
  }
  lowOffer = Math.max(0, lowOffer)
  if (lowOffer > highOffer) lowOffer = highOffer * 0.9

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
  safeco_total_dwp: null,
  safeco_pif: null,
  safeco_loss_ratio: null,
  safeco_retention: null,
  safeco_nb_count: null,
  hartford_pl_twp: null,
  hartford_pl_lr: null,
  hartford_pl_retention: null,
  hartford_cl_twp: null,
  hartford_cl_lr: null,
  hartford_cl_retention: null,
  travelers_auto_wp: null,
  travelers_auto_lr: null,
  travelers_auto_retention: null,
  travelers_home_wp: null,
  travelers_home_lr: null,
  travelers_home_retention: null,
  msa_total_dwp: null,
  msa_pif: null,
  msa_loss_ratio: null,
  msa_retention: null,
  msa_nb_premium: null,
}
