// =====================================================
// Carrier Report PDF Parser — Travelers & Progressive
// =====================================================
// PDF text comes out as a single string where whitespace
// is inconsistent. We normalise whitespace, then run
// targeted regex patterns that match what each carrier's
// actual report looks like after pdfjs extraction.
// =====================================================

import type { CarrierInputs, CarrierName } from "./carrier-engine"

// Strip currency symbols, commas, % signs and parse float
function num(s: string | undefined | null): number | null {
  if (!s) return null
  const cleaned = s.replace(/[$,%\s]/g, "")
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

// Collapse multiple spaces / line breaks to single space for easier matching
function normalise(text: string): string {
  return text.replace(/\r?\n/g, " ").replace(/\s{2,}/g, " ").trim()
}

export function parseCarrierReport(
  text: string,
  carrier: CarrierName
): Partial<CarrierInputs> {
  const t = normalise(text)
  switch (carrier) {
    case "progressive":
      return parseProgressive(t, text)
    case "travelers":
      return parseTravelers(t, text)
    default:
      return {}
  }
}

// =====================================================
// Progressive — Account Production Report
// =====================================================
// The report has labelled rows like:
//   "Personal Lines Written Premium 2,541,893 ..."
//   "Loss Ratio 42.5 %"
//   "Bundle Rate 68 %"
//   "Commercial Lines Written Premium 834,211 ..."
//   "PIF 1,234"
//   "YTD Apps 87"
// =====================================================
function parseProgressive(t: string, raw: string): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}

  // ---- Personal Lines Written Premium ----
  // Variations: "Personal Lines Written Premium", "PL Written Premium", "PL WP"
  const plWp =
    firstMatch(t, /(?:Personal\s*Lines?\s*(?:Written\s*)?Premium|PL\s*(?:Written\s*)?(?:Premium|WP))\s*\$?\s*([\d,]+)/i) ||
    firstMatch(t, /(?:Personal|PL)\s*\n?\s*(?:Auto|Lines?)?\s*(?:Written\s*)?(?:Premium|WP)[:\s]*([\d,]+)/i)
  if (plWp) result.prog_pl_premium = num(plWp)

  // ---- PL PIF ----
  const plPif =
    firstMatch(t, /Personal\s*Lines?[\s\S]{0,80}?PIF[:\s]*([\d,]+)/i) ||
    firstMatch(t, /(?:PL|Personal)\s*(?:Policies?\s*in\s*Force|PIF)[:\s]*([\d,]+)/i) ||
    firstMatch(raw, /PIF[:\s]*([\d,]+)/i)
  if (plPif) result.prog_pl_pif = num(plPif)

  // ---- PL Loss Ratio ----
  // "Loss Ratio" near Personal Lines section; also "L\/R" abbreviation
  const plLr =
    firstMatch(t, /Personal\s*Lines?[\s\S]{0,200}?(?:Loss\s*Ratio|L\/R)[:\s]*([\d.]+)\s*%?/i) ||
    firstMatch(t, /(?:PL|Personal)\s*(?:Loss\s*Ratio|L\/R)[:\s]*([\d.]+)/i)
  if (plLr) result.prog_pl_loss_ratio = num(plLr)

  // ---- Commercial Lines Written Premium ----
  const clWp =
    firstMatch(t, /(?:Commercial\s*Lines?\s*(?:Written\s*)?Premium|CL\s*(?:Written\s*)?(?:Premium|WP))\s*\$?\s*([\d,]+)/i) ||
    firstMatch(t, /(?:Commercial|CL)\s*(?:Lines?)?\s*(?:Written\s*)?(?:Premium|WP)[:\s]*([\d,]+)/i)
  if (clWp) result.prog_cl_premium = num(clWp)

  // ---- CL PIF ----
  const clPif =
    firstMatch(t, /Commercial\s*Lines?[\s\S]{0,80}?PIF[:\s]*([\d,]+)/i) ||
    firstMatch(t, /(?:CL|Commercial)\s*(?:Policies?\s*in\s*Force|PIF)[:\s]*([\d,]+)/i)
  if (clPif) result.prog_cl_pif = num(clPif)

  // ---- CL Loss Ratio ----
  const clLr =
    firstMatch(t, /Commercial\s*Lines?[\s\S]{0,200}?(?:Loss\s*Ratio|L\/R)[:\s]*([\d.]+)\s*%?/i) ||
    firstMatch(t, /(?:CL|Commercial)\s*(?:Loss\s*Ratio|L\/R)[:\s]*([\d.]+)/i)
  if (clLr) result.prog_cl_loss_ratio = num(clLr)

  // ---- Bundle Rate ----
  // Common labels: "Bundle Rate", "Bundled %", "Multi-Policy Rate"
  const bundle =
    firstMatch(t, /(?:Bundle\s*Rate|Bundled\s*%|Multi.?Policy\s*(?:Rate|%)?)[:\s]*([\d.]+)\s*%?/i)
  if (bundle) result.prog_bundle_rate = num(bundle)

  // ---- YTD Apps ----
  const apps =
    firstMatch(t, /YTD\s*(?:New\s*)?App(?:lication)?s?[:\s]*([\d,]+)/i) ||
    firstMatch(t, /New\s*Business\s*(?:App(?:lication)?s?|Count)[:\s]*([\d,]+)/i)
  if (apps) result.prog_ytd_apps = num(apps)

  return result
}

// =====================================================
// Travelers — Agency Results Report
// =====================================================
// The report is usually structured in sections:
//   AUTOMOBILE section with "Written Premium", "Loss Ratio", "Retention"
//   HOMEOWNERS section with same fields
//   Numbers are often in $k (thousands) on this report
// =====================================================
function parseTravelers(t: string, raw: string): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}

  // ---- AUTO section ----
  // Travelers labels: "Automobile", "Auto", "Private Passenger Auto"
  const autoSection = sectionAfter(t, /(?:Automobile|Private\s*Passenger\s*Auto|Auto(?:mobile)?)\b/i, 600)

  if (autoSection) {
    const autoWp =
      firstMatch(autoSection, /(?:Written\s*Premium|WP|Earned\s*Premium|Direct\s*Written)[:\s]*\$?\s*([\d,]+)/i) ||
      firstMatch(autoSection, /([\d,]{4,})\s*(?:Written|WP)/i)
    if (autoWp) {
      const v = num(autoWp)
      // If value > 50,000 assume already in dollars, convert to $k; else it's already $k
      result.travelers_auto_wp = v && v > 50_000 ? Math.round(v / 1000) : v
    }

    const autoLr =
      firstMatch(autoSection, /(?:Loss\s*Ratio|L\/R|LR)[:\s]*([\d.]+)\s*%?/i)
    if (autoLr) result.travelers_auto_lr = num(autoLr)

    const autoRet =
      firstMatch(autoSection, /Retention[:\s]*([\d.]+)\s*%?/i)
    if (autoRet) result.travelers_auto_retention = num(autoRet)

    const autoPif =
      firstMatch(autoSection, /(?:Policies?\s*in\s*Force|PIF|Policy\s*Count)[:\s]*([\d,]+)/i)
    if (autoPif) result.travelers_auto_pif = num(autoPif)
  }

  // ---- HOMEOWNERS section ----
  const homeSection = sectionAfter(t, /(?:Homeowner|Home\s*Owner|HO|Property)\b/i, 600)

  if (homeSection) {
    const homeWp =
      firstMatch(homeSection, /(?:Written\s*Premium|WP|Earned\s*Premium|Direct\s*Written)[:\s]*\$?\s*([\d,]+)/i) ||
      firstMatch(homeSection, /([\d,]{4,})\s*(?:Written|WP)/i)
    if (homeWp) {
      const v = num(homeWp)
      result.travelers_home_wp = v && v > 50_000 ? Math.round(v / 1000) : v
    }

    const homeLr =
      firstMatch(homeSection, /(?:Loss\s*Ratio|L\/R|LR)[:\s]*([\d.]+)\s*%?/i)
    if (homeLr) result.travelers_home_lr = num(homeLr)

    const homeRet =
      firstMatch(homeSection, /Retention[:\s]*([\d.]+)\s*%?/i)
    if (homeRet) result.travelers_home_retention = num(homeRet)

    const homePif =
      firstMatch(homeSection, /(?:Policies?\s*in\s*Force|PIF|Policy\s*Count)[:\s]*([\d,]+)/i)
    if (homePif) result.travelers_home_pif = num(homePif)
  }

  // ---- Fallback: scan entire text if section split missed ----
  if (!result.travelers_auto_wp && !result.travelers_home_wp) {
    // Look for any dollar amounts near "auto" and "home" labels in full text
    const anyAutoWp = firstMatch(t, /Auto(?:mobile)?\s*(?:Written\s*)?(?:Premium|WP)[:\s]*\$?\s*([\d,]+)/i)
    if (anyAutoWp) {
      const v = num(anyAutoWp)
      result.travelers_auto_wp = v && v > 50_000 ? Math.round(v / 1000) : v
    }
    const anyHomeWp = firstMatch(t, /(?:Home(?:owner)?s?)\s*(?:Written\s*)?(?:Premium|WP)[:\s]*\$?\s*([\d,]+)/i)
    if (anyHomeWp) {
      const v = num(anyHomeWp)
      result.travelers_home_wp = v && v > 50_000 ? Math.round(v / 1000) : v
    }
    // Retention / LR fallback
    if (!result.travelers_auto_lr) {
      const lr = firstMatch(t, /Auto(?:mobile)?\s*(?:Loss\s*Ratio|LR)[:\s]*([\d.]+)/i)
      if (lr) result.travelers_auto_lr = num(lr)
    }
    if (!result.travelers_home_lr) {
      const lr = firstMatch(t, /(?:Home(?:owner)?s?)\s*(?:Loss\s*Ratio|LR)[:\s]*([\d.]+)/i)
      if (lr) result.travelers_home_lr = num(lr)
    }
  }

  return result
}

// =====================================================
// Utilities
// =====================================================

/** Return the first capture group of the first match, or null */
function firstMatch(text: string, re: RegExp): string | null {
  const m = text.match(re)
  return m ? (m[1] ?? null) : null
}

/** Return the substring starting just after `headerPattern` up to `length` chars */
function sectionAfter(text: string, headerPattern: RegExp, length: number): string | null {
  const m = text.search(headerPattern)
  if (m === -1) return null
  return text.slice(m, m + length)
}
