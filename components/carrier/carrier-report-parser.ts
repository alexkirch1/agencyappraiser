// =====================================================
// Carrier Report PDF Parser
// Extracts carrier-specific fields from uploaded PDF reports
// =====================================================

import type { CarrierInputs, CarrierName } from "./carrier-engine"

function num(s: string | undefined): number | null {
  if (!s) return null
  const cleaned = s.replace(/[$,%\s]/g, "").replace(/,/g, "")
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

/**
 * Parse text extracted from a PDF and return partial CarrierInputs
 * based on the selected carrier.
 */
export function parseCarrierReport(
  text: string,
  carrier: CarrierName
): Partial<CarrierInputs> {
  switch (carrier) {
    case "progressive":
      return parseProgressive(text)
    case "safeco":
      return parseSafeco(text)
    case "hartford":
      return parseHartford(text)
    case "travelers":
      return parseTravelers(text)
    case "msa":
      return parseMSA(text)
    default:
      return {}
  }
}

// -------------------------------------------------------------------
// Progressive: Account Production Report
// -------------------------------------------------------------------
function parseProgressive(text: string): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}

  // Personal Lines: "Total Personal Lines",,"\$XXX","\$XXX","PIF","XX%"
  const plMatch = text.match(
    /Total Personal Lines[",\s]*\$?([\d,]+)[",\s]*\$?[\d,]*[",\s]*(\d+)[",\s]*(\d+)%/i
  )
  if (plMatch) {
    result.prog_pl_premium = num(plMatch[1])
    result.prog_pl_pif = num(plMatch[2])
    result.prog_pl_loss_ratio = num(plMatch[3])
  }

  // Alt pattern: look for lines with "Personal Lines" and dollar amounts
  if (!plMatch) {
    const plAlt = text.match(/Personal\s*Lines[\s\S]{0,200}?\$\s*([\d,]+)/i)
    if (plAlt) result.prog_pl_premium = num(plAlt[1])

    const plPif = text.match(/Personal\s*Lines[\s\S]{0,200}?PIF[:\s]*(\d+)/i)
    if (plPif) result.prog_pl_pif = num(plPif[1])

    const plLr = text.match(/Personal\s*Lines[\s\S]{0,200}?Loss\s*Ratio[:\s]*([\d.]+)/i)
    if (plLr) result.prog_pl_loss_ratio = num(plLr[1])
  }

  // Commercial Lines
  const clMatch = text.match(
    /Commercial\s*Lines[",\s]*\d*[",\s]*\$?([\d,]+)[",\s]*\$?[\d,]*[",\s]*(\d+)[",\s]*(\d+)%/i
  )
  if (clMatch) {
    result.prog_cl_premium = num(clMatch[1])
    result.prog_cl_pif = num(clMatch[2])
    result.prog_cl_loss_ratio = num(clMatch[3])
  }

  if (!clMatch) {
    const clAlt = text.match(/Commercial\s*Lines[\s\S]{0,200}?\$\s*([\d,]+)/i)
    if (clAlt) result.prog_cl_premium = num(clAlt[1])

    const clPif = text.match(/Commercial\s*Lines[\s\S]{0,200}?PIF[:\s]*(\d+)/i)
    if (clPif) result.prog_cl_pif = num(clPif[1])

    const clLr = text.match(/Commercial\s*Lines[\s\S]{0,200}?Loss\s*Ratio[:\s]*([\d.]+)/i)
    if (clLr) result.prog_cl_loss_ratio = num(clLr[1])
  }

  // Bundle Rate
  const bundleMatch = text.match(/Bundle\s*Rate[",\s]*\d*%?[",\s]*\d*%?[",\s]*\d*%?[",\s]*(\d+)%/i)
  if (bundleMatch) result.prog_bundle_rate = num(bundleMatch[1])
  if (!bundleMatch) {
    const bundleAlt = text.match(/Bundle\s*Rate[:\s]*([\d.]+)/i)
    if (bundleAlt) result.prog_bundle_rate = num(bundleAlt[1])
  }

  // YTD Apps
  const appsMatch = text.match(/YTD\s*App[s]?[:\s]*(\d+)/i)
  if (appsMatch) result.prog_ytd_apps = num(appsMatch[1])
  if (!appsMatch) {
    const appsAlt = text.match(/Total\s*Personal\s*Lines[\s\S]{0,200}?(\d+)\s*$/im)
    if (appsAlt) result.prog_ytd_apps = num(appsAlt[1])
  }

  return result
}

// -------------------------------------------------------------------
// Safeco
// -------------------------------------------------------------------
function parseSafeco(text: string): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}

  // DWP / Total Written Premium
  const dwp = text.match(/(?:Total|Direct)\s*(?:Written|DWP)[:\s]*\$?\s*([\d,]+)/i)
  if (dwp) result.safeco_total_dwp = num(dwp[1])

  // PIF
  const pif = text.match(/(?:Policies?\s*in\s*Force|PIF)[:\s]*([\d,]+)/i)
  if (pif) result.safeco_pif = num(pif[1])

  // Loss Ratio
  const lr = text.match(/Loss\s*Ratio[:\s]*([\d.]+)/i)
  if (lr) result.safeco_loss_ratio = num(lr[1])

  // Retention
  const ret = text.match(/Retention[:\s]*([\d.]+)/i)
  if (ret) result.safeco_retention = num(ret[1])

  // New Business Count
  const nb = text.match(/(?:New\s*Business|NB)\s*(?:Count)?[:\s]*([\d,]+)/i)
  if (nb) result.safeco_nb_count = num(nb[1])

  return result
}

// -------------------------------------------------------------------
// Hartford
// -------------------------------------------------------------------
function parseHartford(text: string): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}

  // Personal Lines TWP (in thousands)
  const plTwp = text.match(/Personal\s*Lines[\s\S]{0,200}?(?:TWP|Written\s*Premium)[:\s]*\$?\s*([\d,]+)/i)
  if (plTwp) {
    const val = num(plTwp[1])
    // If value > 100000 it's in dollars, convert to thousands
    result.hartford_pl_twp = val && val > 100000 ? Math.round(val / 1000) : val
  }

  const plLr = text.match(/Personal\s*Lines[\s\S]{0,200}?Loss\s*Ratio[:\s]*([\d.]+)/i)
  if (plLr) result.hartford_pl_lr = num(plLr[1])

  const plRet = text.match(/Personal\s*Lines[\s\S]{0,200}?Retention[:\s]*([\d.]+)/i)
  if (plRet) result.hartford_pl_retention = num(plRet[1])

  // Commercial / Small Commercial
  const clTwp = text.match(/(?:Commercial|Small\s*Commercial)[\s\S]{0,200}?(?:TWP|Written\s*Premium)[:\s]*\$?\s*([\d,]+)/i)
  if (clTwp) {
    const val = num(clTwp[1])
    result.hartford_cl_twp = val && val > 100000 ? Math.round(val / 1000) : val
  }

  const clLr = text.match(/(?:Commercial|Small\s*Commercial)[\s\S]{0,200}?Loss\s*Ratio[:\s]*([\d.]+)/i)
  if (clLr) result.hartford_cl_lr = num(clLr[1])

  const clRet = text.match(/(?:Commercial|Small\s*Commercial)[\s\S]{0,200}?Retention[:\s]*([\d.]+)/i)
  if (clRet) result.hartford_cl_retention = num(clRet[1])

  return result
}

// -------------------------------------------------------------------
// Travelers
// -------------------------------------------------------------------
function parseTravelers(text: string): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}

  // Auto
  const autoWp = text.match(/Auto[\s\S]{0,200}?(?:Written\s*Premium|WP)[:\s]*\$?\s*([\d,]+)/i)
  if (autoWp) {
    const val = num(autoWp[1])
    result.travelers_auto_wp = val && val > 100000 ? Math.round(val / 1000) : val
  }

  const autoLr = text.match(/Auto[\s\S]{0,200}?Loss\s*Ratio[:\s]*([\d.]+)/i)
  if (autoLr) result.travelers_auto_lr = num(autoLr[1])

  const autoRet = text.match(/Auto[\s\S]{0,200}?Retention[:\s]*([\d.]+)/i)
  if (autoRet) result.travelers_auto_retention = num(autoRet[1])

  // Homeowners
  const homeWp = text.match(/(?:Home|Homeowner)[\s\S]{0,200}?(?:Written\s*Premium|WP)[:\s]*\$?\s*([\d,]+)/i)
  if (homeWp) {
    const val = num(homeWp[1])
    result.travelers_home_wp = val && val > 100000 ? Math.round(val / 1000) : val
  }

  const homeLr = text.match(/(?:Home|Homeowner)[\s\S]{0,200}?Loss\s*Ratio[:\s]*([\d.]+)/i)
  if (homeLr) result.travelers_home_lr = num(homeLr[1])

  const homeRet = text.match(/(?:Home|Homeowner)[\s\S]{0,200}?Retention[:\s]*([\d.]+)/i)
  if (homeRet) result.travelers_home_retention = num(homeRet[1])

  return result
}

// -------------------------------------------------------------------
// MSA
// -------------------------------------------------------------------
function parseMSA(text: string): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}

  const dwp = text.match(/(?:Total|Direct)\s*(?:Written|DWP)[:\s]*\$?\s*([\d,]+)/i)
  if (dwp) result.msa_total_dwp = num(dwp[1])

  const pif = text.match(/(?:Policies?\s*in\s*Force|PIF)[:\s]*([\d,]+)/i)
  if (pif) result.msa_pif = num(pif[1])

  const lr = text.match(/Loss\s*Ratio[:\s]*([\d.]+)/i)
  if (lr) result.msa_loss_ratio = num(lr[1])

  const ret = text.match(/Retention[:\s]*([\d.]+)/i)
  if (ret) result.msa_retention = num(ret[1])

  const nb = text.match(/(?:New\s*Business|NB)\s*(?:Premium)?[:\s]*\$?\s*([\d,]+)/i)
  if (nb) result.msa_nb_premium = num(nb[1])

  return result
}
