// =====================================================
// Carrier Report PDF Parser — Travelers, Progressive, Hartford
// =====================================================

import type { CarrierInputs, CarrierName } from "./carrier-engine"

/** Strip $, commas, %; handle (neg) accounting notation */
function num(s: string | undefined | null): number | null {
  if (!s) return null
  const trimmed = s.trim()
  const neg = /^\(.*\)$/.test(trimmed)
  const cleaned = trimmed.replace(/[$,%\s]/g, "").replace(/[()]/g, "")
  const n = parseFloat(cleaned)
  if (isNaN(n)) return null
  return neg ? -n : n
}

/** Split line on whitespace */
function tok(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean)
}

/**
 * Tokenise keeping parenthetical groups (including spaces inside) as one token.
 * "(0.7%)" → one token; "(131.0 pts)" → one token; "0.4 pts" → two tokens
 */
function accountingTok(s: string): string[] {
  const out: string[] = []
  let buf = ""
  let depth = 0
  for (const ch of s) {
    if (ch === "(") { depth++; buf += ch }
    else if (ch === ")") { depth--; buf += ch; if (depth === 0) { out.push(buf); buf = "" } }
    else if (/\s/.test(ch) && depth === 0) { if (buf) { out.push(buf); buf = "" } }
    else { buf += ch }
  }
  if (buf) out.push(buf)
  return out.filter(Boolean)
}

/** Parse numeric values from token list */
function numsFromToks(tokens: string[]): number[] {
  return tokens.map(t => num(t)).filter((v): v is number => v !== null)
}

/** Parse all numerics from a raw line */
function nums(line: string): number[] {
  return numsFromToks(tok(line))
}

export function parseCarrierReport(
  text: string,
  carrier: CarrierName
): Partial<CarrierInputs> {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  if (carrier === "travelers")   return parseTravelers(lines)
  if (carrier === "progressive") return parseProgressive(lines)
  if (carrier === "hartford")    return parseHartford(lines)
  if (carrier === "safeco")      return parseSafeco(lines)
  if (carrier === "berkshire")   return parseBerkshire(lines)
  return {}
}

// =====================================================
// TRAVELERS — PI Production Report
// =====================================================
// Confirmed column layout from real Feb 2026 report:
//
// "Actual to Prior Year" table (after stripping LOB label):
//   t[0]=PYTD_Q  t[1]=CYTD_Q  t[2]=Var_Q  t[3]=%VarQ
//   t[4]=PYTD_NB t[5]=CYTD_NB t[6]=Var_NB t[7]=%VarNB
//   t[8]=PYE_PIF t[9]=CYTD_PIF t[10]=Var_PIF t[11]=%VarPIF
//   t[12]=PYE_Ret t[13]=YTD_Ret t[14]=Var_Ret
//   t[15]=PYTD_LR t[16]=YTD_LR t[17]=Var_LR
//
// "WP (,000)" section data rows:
//   13 monthly cols | YTD | PYTD | %Var | YE_MRY | YE_PREV
//   Annual WP = n[n.length - 2]
//
// "PIF Count" section data rows (same structure):
//   Current PIF = n[13]
// =====================================================

type TravSection = "actuals" | "wp" | "pif" | "nb" | null

function parseTravelers(lines: string[]): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}
  let section: TravSection = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (/actual\s*to\s*prior\s*year/i.test(line))                     { section = "actuals"; continue }
    if (/^wp\s*[\(（,]|^written\s*prem/i.test(line))                  { section = "wp";      continue }
    if (/^pif\s*count|^policies?\s*in\s*force\s*count/i.test(line))  { section = "pif";     continue }
    if (/^booked\s*nb|^new\s*business\b/i.test(line))                 { section = "nb";      continue }
    if (/^13\s*month|^feb\s+2\d{3}\s+mar/i.test(line))                { continue }

    const lobMatch = line.match(/^(AUTO|HOME|OTHER|TOTAL)\b/i)
    if (!lobMatch) continue

    const lob  = lobMatch[1].toUpperCase() as "AUTO" | "HOME" | "TOTAL"
    const rest = line.slice(lobMatch[0].length).trim()

    if (section === "actuals") {
      const t = accountingTok(rest)
      if (t.length >= 14) {
        const cytdPif = num(t[9])
        const ytdRet  = num(t[13])
        const ytdLr   = t.length >= 17 ? num(t[16]) : null
        if (lob === "AUTO") {
          if (cytdPif !== null) result.travelers_auto_pif       = cytdPif
          if (ytdRet  !== null) result.travelers_auto_retention = ytdRet
          if (ytdLr   !== null) result.travelers_auto_lr        = ytdLr
        } else if (lob === "HOME") {
          if (cytdPif !== null) result.travelers_home_pif       = cytdPif
          if (ytdRet  !== null) result.travelers_home_retention = ytdRet
          if (ytdLr   !== null) result.travelers_home_lr        = ytdLr
        }
      }
    } else if (section === "wp") {
      const n = nums(rest)
      if (n.length >= 16) {
        const annualWp = n[n.length - 2]
        if (lob === "AUTO") result.travelers_auto_wp = annualWp
        else if (lob === "HOME") result.travelers_home_wp = annualWp
      }
    } else if (section === "pif") {
      const n = nums(rest)
      if (n.length >= 14) {
        const currentPif = n[13]
        if (lob === "AUTO") result.travelers_auto_pif = currentPif
        else if (lob === "HOME") result.travelers_home_pif = currentPif
      }
    }
  }

  return result
}

// =====================================================
// PROGRESSIVE — Account Production Report
// =====================================================
function parseProgressive(lines: string[]): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}
  type Lob = "pl" | "cl" | null
  let lob: Lob = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const n = line.toLowerCase().replace(/\s+/g, " ").trim()

    if (/personal\s*lines?|^pl\b|personal\s*auto/.test(n) && !/commercial/.test(n)) lob = "pl"
    else if (/commercial\s*lines?|^cl\b|commercial\s*auto/.test(n)) lob = "cl"

    const firstNum = (): number | null => {
      const v = nums(line)[0] ?? null
      if (v !== null) return v
      return nums(lines[i + 1] ?? "")[0] ?? null
    }

    if (/written\s*premium|^wp\b/.test(n)) {
      const v = firstNum()
      if (v !== null) {
        if (lob === "pl") result.prog_pl_premium = v
        else if (lob === "cl") result.prog_cl_premium = v
        else if (!result.prog_pl_premium) result.prog_pl_premium = v
      }
    }
    if (/policies?\s*in\s*force|\bpif\b/.test(n)) {
      const v = firstNum()
      if (v !== null) {
        if (lob === "pl") result.prog_pl_pif = v
        else if (lob === "cl") result.prog_cl_pif = v
        else if (!result.prog_pl_pif) result.prog_pl_pif = v
      }
    }
    if (/loss\s*ratio|l\/r|\blr\b/.test(n)) {
      const v = firstNum()
      if (v !== null) {
        if (lob === "pl") result.prog_pl_loss_ratio = v
        else if (lob === "cl") result.prog_cl_loss_ratio = v
        else if (!result.prog_pl_loss_ratio) result.prog_pl_loss_ratio = v
      }
    }
    if (/bundle\s*rate|bundled|multi.?policy/.test(n)) {
      const v = firstNum()
      if (v !== null) result.prog_bundle_rate = v
    }
    if (/ytd\s*(?:new\s*)?app|new\s*business\s*(?:app|count)/.test(n)) {
      const v = firstNum()
      if (v !== null) result.prog_ytd_apps = v
    }
  }

  return result
}

// =====================================================
// HARTFORD — Partner Breakdown Report (Mastercode)
// =====================================================
//
// Pages: "Personal Lines", "Small Commercial", "Middle and Large Commercial", "Global Specialty"
// Sections on each page: "Production & Growth", "Financials", "Profitability", "Retention", "Flow"
//
// Production & Growth column layout (confirmed from real report):
//   Row: All Auto / All Home / Total
//   After stripping label, tokens are:
//   NWP cols: [YTD, MRY, Prev1, Prev2, YTD%, 3yr%]   (6 values)
//   TWP cols: [YTD, MRY, Prev1, Prev2, YTD%, 3yr%]   (6 values)
//   PremRet cols: [YTD, MRY]                           (2 values)
//   Total: 14 values. Indices (0-based):
//     NWP_MRY=1, NWP_MRY_growth=5
//     TWP_YTD=6, TWP_MRY=7, TWP_MRY_growth=11
//     PremRet_YTD=12, PremRet_MRY=13
//
// Financials / Flow section (Policy Inforce):
//   "Flow" section row: "All Auto 2,569 42 1.6" = [PIF_2025YE, NP_YTD, NB_rate]
//   So PIF = n[0] on the Flow section All Auto / All Home rows
//   This is the most reliable source for PIF (large integer, clearly labeled)
//
// Profitability (Personal Lines page):
//   Row: "All Auto earned_prem incurred_loss CYLR_YTD CYLR_MRY CYLR_P1 CYLR_P2 AYLR_..."
//   CYLR_MRY = n[3]   (e.g. 32.9 for Auto, 20.4 for Home)
//
// Profitability (Small Commercial page):
//   Row: "Total YTD_CYLR MRY_CYLR P1_CYLR P2_CYLR"
//   CYLR_MRY = n[1]   (e.g. -11.6 for Small Comm total)
//
// Retention (Small Commercial page):
//   Row: "Total PRR_YTD PRR_MRY PCR_YTD PCR_MRY"
//   PRR_MRY = n[1]    (e.g. 73.9)
// =====================================================

type HartfordSection = "prod" | "profitability" | "financials" | "retention" | "flow" | null
type HartfordPage    = "global" | "personal" | "commercial" | "small_commercial" | null

function parseHartford(lines: string[]): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}
  let section: HartfordSection = null
  let page: HartfordPage = null

  for (let i = 0; i < lines.length; i++) {
    const raw  = lines[i]

    // ---- Page detection (standalone segment headers) ----
    if (/^personal lines\s*$/i.test(raw))              { page = "personal";        section = null; continue }
    if (/^small commercial\s*$/i.test(raw))             { page = "small_commercial"; section = null; continue }
    if (/^middle and large commercial\s*$/i.test(raw))  { page = "commercial";       section = null; continue }
    if (/^global specialty\s*$/i.test(raw))             { page = "global";           section = null; continue }

    // ---- Section headers ----
    if (/production\s*(?:&|and)\s*growth/i.test(raw))  { section = "prod";          continue }
    if (/^profitability\b/i.test(raw))                  { section = "profitability"; continue }
    if (/^financials\b/i.test(raw))                     { section = "financials";    continue }
    if (/^retention\b/i.test(raw))                      { section = "retention";     continue }
    if (/^flow\b/i.test(raw))                           { section = "flow";          continue }

    // Skip header/label rows
    if (/^segment\b|^lob\b|twp.*growth|nwp.*growth|cylr|prrpcr/i.test(raw)) continue
    if (/^2026\s*ytd\s*2025|^ytd\s*2023/i.test(raw)) continue

    // ====== PERSONAL LINES ======

    if (page === "personal") {

      // -- Production & Growth: extract TWP MRY + Premium Retention MRY --
      if (section === "prod") {
        const extractProdRow = (label: RegExp) => {
          if (!label.test(raw)) return null
          const rest = raw.replace(label, "").trim()
          const t = accountingTok(rest)
          const n = numsFromToks(t)
          // n[7]=TWP_MRY, n[12]=PremRet_YTD, n[13]=PremRet_MRY
          // Guard: PremRet must be 0-100 range; TWP_MRY is the positive value we want
          return n.length >= 8 ? n : null
        }

        const autoN = extractProdRow(/^all auto\s*/i)
        if (autoN) {
          if (autoN[7]  !== undefined) result.hartford_pl_auto_twp       = autoN[7]
          // PremRet_MRY is at index 13 — but only if it's a plausible retention %
          const retMRY = autoN[13]
          if (retMRY !== undefined && retMRY > 0 && retMRY <= 110) {
            result.hartford_pl_auto_retention = retMRY
          } else if (autoN[12] !== undefined && autoN[12] > 0 && autoN[12] <= 110) {
            result.hartford_pl_auto_retention = autoN[12]
          }
        }

        const homeN = extractProdRow(/^all home\s*/i)
        if (homeN) {
          if (homeN[7] !== undefined) result.hartford_pl_home_twp = homeN[7]
          const retMRY = homeN[13]
          if (retMRY !== undefined && retMRY > 0 && retMRY <= 110) {
            result.hartford_pl_home_retention = retMRY
          } else if (homeN[12] !== undefined && homeN[12] > 0 && homeN[12] <= 110) {
            result.hartford_pl_home_retention = homeN[12]
          }
        }
      }

      // -- Flow: extract Policy Inforce (most reliable PIF source) --
      // Format: "All Auto 2,569 42 1.6"  → n[0] = 2025 YE total PIF
      if (section === "flow") {
        if (/^all auto\b/i.test(raw)) {
          const rest = raw.replace(/^all auto\s*/i, "")
          const n = nums(rest)
          // First integer > 200 is the YE total PIF
          const pif = n.find(v => v > 200 && Number.isInteger(v))
          if (pif !== undefined) result.hartford_pl_auto_pif = pif
        }
        if (/^all home\b/i.test(raw)) {
          const rest = raw.replace(/^all home\s*/i, "")
          const n = nums(rest)
          const pif = n.find(v => v > 200 && Number.isInteger(v))
          if (pif !== undefined) result.hartford_pl_home_pif = pif
        }
      }

      // -- Profitability: CYLR most-recent-year --
      // Format: "All Auto 463,936 284,044 61.2 32.9 24.6 3.3 ..."
      //   n[0]=EarnedPrem, n[1]=IncurredLoss, n[2]=CYLR_YTD, n[3]=CYLR_MRY
      if (section === "profitability") {
        if (/^all auto\b/i.test(raw)) {
          const rest = raw.replace(/^all auto\s*/i, "")
          const n = nums(rest)
          if (n.length >= 4) result.hartford_pl_auto_lr = n[3]
        }
        if (/^all home\b/i.test(raw)) {
          const rest = raw.replace(/^all home\s*/i, "")
          const n = nums(rest)
          if (n.length >= 4) result.hartford_pl_home_lr = n[3]
        }
      }
    }

    // ====== SMALL COMMERCIAL ======

    if (page === "small_commercial") {

      // -- Production & Growth Total: TWP MRY --
      if (section === "prod" && /^total\b/i.test(raw)) {
        const rest = raw.replace(/^total\s*/i, "")
        const t = accountingTok(rest)
        const n = numsFromToks(t)
        if (n.length >= 8) result.hartford_cl_twp = n[7]
      }

      // -- Profitability Total: CYLR MRY --
      // Format: "Total 24.7 (11.6) 13.1 11.7" → n[0]=CYLR_YTD, n[1]=CYLR_MRY (may be negative)
      if (section === "profitability" && /^total\b/i.test(raw)) {
        const rest = raw.replace(/^total\s*/i, "")
        const t = accountingTok(rest)
        const n = numsFromToks(t)
        if (n.length >= 2) result.hartford_cl_lr = n[1]
      }

      // -- Retention Total: PRR MRY --
      // Format: "Total PRR_YTD PRR_MRY PCR_YTD PCR_MRY"
      //   PRR_MRY = n[1]    (e.g. 73.9)
      if (section === "retention" && /^total\b/i.test(raw)) {
        const rest = raw.replace(/^total\s*/i, "")
        const t = accountingTok(rest)
        const n = numsFromToks(t)
        if (n.length >= 2) result.hartford_cl_retention = n[1]
      }
    }
  }

  return result
}

// =====================================================
// SAFECO — Agency Development Profile (ADP)
// =====================================================
//
// The ADP PDF renders each product row as a single concatenated string, e.g.:
//   "Auto$6,645,555$1,218,70128.1%49.1%2,48539.0%69.3%$5,981,415$1,064,95532.6%$787,69874.0%72.7%"
//
// DWP table column order (indices into nums() output after stripping product label):
//   0: R12 DWP          ← primary "rolling 12" premium we use for valuation
//   1: YTD DWP
//   2: YTD DWP Growth%
//   3: YTD Mix%
//   4: Current PIF      ← policy count
//   5: YTD PIF Growth%
//   6: PIF Retention%   ← retention
//   7: R12 EP
//   8: YTD EP
//   9: YTD EP Growth%
//   10: YTD Inc Losses
//   11: YTD Loss Ratio% ← primary LR
//   12: YTD Ex-CAT LR%
//
// New Business table (second occurrence of product rows):
//   0: MTD NB DWP  1: YTD NB DWP  2: YTD NB Growth%  3: R12 NB DWP
//   4: MTD NB Cts  5: YTD NB Cts  ...
//
// Cross Sell section contains a line like:
//   "Auto 701 360 75.3% 62.6%"  →  monoline, invalid, total%, valid%
//   "Home/Condo/Rent 1,582 623 56.8% 39.8%"
//
// Right Track section:
//   "167 45 26.9%"  →  YTD Auto Issues, YTD RT Issues, RT %
//
// Gold Service: header line contains "Gold Service" followed by "Y" or "N"
// =====================================================

function parseSafeco(lines: string[]): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}

  // Track whether we've seen the first DWP table (product data rows)
  // vs the second page repeated header (hierarchy-adjusted numbers —
  // we prefer the first/non-adjusted table which is the main ADP table)
  let dwpTableCount   = 0
  let nbTableCount    = 0
  let inCrossSell     = false
  let inRightTrack    = false
  let inNewBusiness   = false

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]

    // Gold Service — appears in header: "N Gold Service" or "Y Gold Service" or "Gold Service N/A Y"
    if (/gold\s*service/i.test(raw)) {
      result.safeco_gold_service = /\bY\b/.test(raw)
    }

    // Section markers
    if (/^direct\s*written\s*premium.*dwp/i.test(raw) || /^dwp\s*$/i.test(raw)) {
      dwpTableCount++
      inCrossSell = false; inRightTrack = false; inNewBusiness = false
      continue
    }
    if (/^new\s*business\s*direct\s*written\s*premium/i.test(raw)) {
      nbTableCount++
      inCrossSell = false; inRightTrack = false; inNewBusiness = true
      continue
    }
    if (/^cross\s*sell/i.test(raw)) {
      inCrossSell = true; inRightTrack = false; inNewBusiness = false
      continue
    }
    if (/^right\s*track|^auto\s*term\s*length/i.test(raw)) {
      inRightTrack = true; inCrossSell = false; inNewBusiness = false
      continue
    }
    // Skip header rows
    if (/^product\b|^r12\s*ytd|^p3y\s*dwp|^p3y\s*loss/i.test(raw)) continue
    if (/^total\s*$|^safeco\s*agency/i.test(raw)) continue

    // ── DWP table (first encounter = primary; ignore second/hierarchy-adjusted) ──
    if (dwpTableCount === 1) {
      const prodMatch = raw.match(/^(Auto|Home|Condo|Renters|Umbrella|Landlord\s*Protection\s*Policy|Motorcycle|Watercraft|Total)\b/i)
      if (prodMatch) {
        const label = prodMatch[1].toLowerCase().replace(/\s+/g, " ")
        const rest  = raw.slice(prodMatch[0].length)
        const n     = nums(rest)
        // Need at least 12 values: [R12DWP, YTDDWP, YTDGrowth%, YTDMix%, PIF, PIFGrowth%, PIFRet%, R12EP, YTDEP, YTDEPGrowth%, IncLosses, LR%]
        if (n.length >= 12) {
          const r12dwp  = n[0]
          const pif     = n[4]
          const pifRet  = n[6]
          const lossRat = n[11]

          if (label === "auto") {
            result.safeco_auto_dwp       = r12dwp
            result.safeco_auto_pif       = pif
            result.safeco_auto_retention = pifRet
            result.safeco_auto_lr        = lossRat
          } else if (label === "home") {
            result.safeco_home_dwp       = r12dwp
            result.safeco_home_pif       = pif
            result.safeco_home_retention = pifRet
            result.safeco_home_lr        = lossRat
          } else if (label === "total") {
            // Use total R12 DWP to cross-check; don't overwrite individual lines
          } else {
            // Condo / Renters / Umbrella / Landlord / Motorcycle / Watercraft → "other"
            result.safeco_other_dwp = (result.safeco_other_dwp ?? 0) + r12dwp
            // Accumulate a weighted-average retention and LR for other lines
            // We'll do a simple sum for now; post-loop we can't divide easily
            // so store as direct value for first other line found, blend later
            if (result.safeco_other_lr === null || result.safeco_other_lr === undefined) {
              result.safeco_other_lr        = lossRat
              result.safeco_other_retention = pifRet
            }
          }
        }
      }
    }

    // ── New Business DWP table (first encounter) ──
    if (inNewBusiness && nbTableCount === 1) {
      const totalMatch = raw.match(/^Total\b/i)
      if (totalMatch) {
        const rest = raw.slice(totalMatch[0].length)
        const n    = nums(rest)
        // cols: [MTD NB DWP, YTD NB DWP, ...]
        if (n.length >= 2) {
          result.safeco_nb_dwp = n[1]  // YTD NB DWP total
        }
        inNewBusiness = false
      }
    }

    // ── Cross Sell ──
    if (inCrossSell) {
      // "Home/Condo/Rent 1,582 623 56.8% 39.8%"  → valid cross sell % = last value
      if (/home.*condo|condo.*rent/i.test(raw)) {
        const n = nums(raw)
        // n[3] = total%, n[4] = valid%  OR n[2] = total%, n[3] = valid%
        // Valid% is the smaller of the last two percentage values (both ≤ 100)
        const pcts = n.filter(v => v <= 100 && v > 0)
        if (pcts.length >= 2) result.safeco_cross_sell_pct = pcts[pcts.length - 1]
        inCrossSell = false
      }
    }

    // ── Right Track ──
    if (inRightTrack) {
      // "167 45 26.9%"  →  YTD Auto Issues, YTD RT Issues, RT %
      const n = nums(raw)
      if (n.length >= 3) {
        const rtPct = n[2]
        if (rtPct > 0 && rtPct <= 100) {
          result.safeco_right_track_pct = rtPct
          inRightTrack = false
        }
      }
    }
  }

  return result
}

// =====================================================
// BERKSHIRE HATHAWAY GUARD — Producer Activity Report (PAR)
// =====================================================
//
// REAL EXTRACTED TEXT STRUCTURE (from pdfjs Y-grouped rows):
//
// The PDF renderer groups all text items on the same Y-position into one line,
// separated by spaces. This means section headers, row labels, and data values
// often appear on the SAME line. Key observations from real 03/26/2026 PAR:
//
// Written Premium:
//   "Written Premium: (Calendar Year Basis)"         ← section header
//   "New Renewal 14 21,160 112 85,876 23 725 245 353,219"  ← New row + start of Renewal
//   "35 100,320 208 659,670 33 98,719 314 927,875"         ← rest of Renewal row
//   "Total 49 121,480 320 745,546 56 99,444 559 1,281,094" ← Total row (8 values: Pol,Prem x 4 periods)
//   → Total row: n[0]=CurrYTD_Pol, n[1]=CurrYTD_Prem, n[2]=CurrR12_Pol, n[3]=CurrR12_Prem ...
//   → New row (same line as "New Renewal"): first 4 nums before Renewal values
//     We pick n[0]=New_CurrYTD_Pol, n[2]=New_CurrR12_Pol
//
// Hit Ratio:
//   "Hit Ratio: New (Policy Year Basis) Renewal =WP/Quoted) Total" ← all labels on one line
//   "60.87% 36.48% 59.57% 23.80% 60.53% 14.20% 43.79% 25.40%"    ← New row: 8 pct values
//   "83.33% 93.35% 82.75% 84.42% 82.50% 87.58% 86.03% 83.98%"    ← Renewal row: 8 pct values
//   "75.38% 70.44% 72.91% 59.35% 71.79% 51.45% 60.39% 51.94%"    ← Total row: 8 pct values
//   → New CurrYTD hit ratio = first value of New row = 60.87%
//   → Renewal CurrYTD hit ratio = first value of Renewal row = 83.33%
//
// Yield Ratio:
//   "Yield Ratio: New (Policy Year Basis) Renewal =WP/Submitted Total"
//   "41.18% 17.53% 44.98% 7.06% ..."   ← New row
//   "76.09% 99.57% ..."                 ← Renewal row
//   "61.25% 50.39% 46.08% 24.78% ..."  ← Total row: CurrYTD_Pol%, CurrYTD_Prem%, ...
//   → Total CurrYTD = 61.25% (first value) — use as overall yield indicator
//
// Direct Loss Ratios:
//   "Direct Loss Ratios:"
//   "1983-2020 2021 2022 2023 2024 2025 01/01/2026-02/28/2026" ← year headers (one combined line!)
//   "Incurred Direct Accident Year Calendar Year Calendar Year" ← sub-header
//   "Earned Incurred Loss Ratio"                                ← column header
//   "SUBTOTAL 38,639.39 10,160.82 10,160.82 26.30%"           ← 1983-2020 subtotal
//   "622,377.94 1,401,275.63 968,410.61 155.60%"              ← 2021 data (no SUBTOTAL label? sometimes)
//   "1,159,684.50 831,535.92 854,714.25 73.70%"               ← 2022
//   "1,759,363.27 2,141,457.21 2,175,894.47 123.68%"          ← 2023
//   "SUBTOTAL 3,541,425.71 4,374,268.76 3,999,019.33 112.92%" ← 2024 subtotal
//   "1,585,981.16 1,421,459.64 1,725,257.11 108.78%"          ← 2025
//   "954,283.52 373,405.22 543,424.07 56.95%"                 ← 2026 YTD
//   "100,184.14 60,000.00 -38,566.89 -38.50%"                 ← additional YTD line
//   "SUBTOTAL 2,640,448.82 1,854,864.86 2,230,114.29 84.46%"  ← recent years subtotal
//   "GRAND TOTAL 6,220,513.92 6,239,294.44 6,239,294.44 100.30%"
//
// KEY INSIGHT: Year headers all appear on ONE line (because same Y position in PDF).
// We must detect loss ratio data by line position after "Direct Loss Ratios:" header,
// counting SUBTOTAL occurrences to map to year groups.
// =====================================================

function parseBerkshire(lines: string[]): Partial<CarrierInputs> {
  // ─────────────────────────────────────────────────────────────────────────
  // Real line-by-line structure from pdfjs text extraction (verified against
  // actual 03/26/2026 BH Guard PAR report OCR output):
  //
  // "Written Premium:"                               ← section header
  // "(Calendar Year Basis)"                          ← sub-label (separate line)
  // "New"                                            ← row label only
  // "Renewal"                                        ← row label only  (sometimes merged w/ New data)
  // "14 21,160 112 85,876 23 725 245 353,219"        ← New row data (8 values)
  // "35 100,320 208 659,670 33 98,719 314 927,875"   ← Renewal row data (8 values)
  // "Total"                                          ← row label only
  // "49 121,480 320 745,546 56 99,444 559 1,281,094" ← Total row data (8 values)
  //   → values: CurrYTD_Pol, CurrYTD_Prem, CurrR12_Pol, CurrR12_Prem, ...
  //
  // "Hit Ratio:"                                     ← section header
  // "New"                                            ← label
  // "(Policy Year Basis)"                            ← label
  // "Renewal"                                        ← label
  // "=WP/Quoted)"                                    ← label
  // "Total"                                          ← label
  // "60.87% 36.48% 59.57% 23.80% ..."               ← New data row (8 pct values)
  // "83.33% 93.35% 82.75% 84.42% ..."               ← Renewal data row
  // "75.38% 70.44% 72.91% 59.35% ..."               ← Total data row
  //
  // "Yield Ratio:"                                   ← section header (same label structure)
  // "New" / "(Policy Year Basis)" / etc.             ← labels
  // "41.18% 17.53% 44.98% 7.06% ..."                ← New data row
  // "76.09% 99.57% ..."                              ← Renewal data row
  // "61.25% 50.39% 46.08% 24.78% ..."               ← Total data row
  //
  // "Direct Loss Ratios:"                            ← section header
  // "1983-2020 2021 2022 2023 2024 2025 01/01/2026-02/28/2026" ← year header line
  // "Incurred Direct Accident Year ..."              ← skip
  // "Earned Incurred Loss Ratio"                     ← skip
  // "SUBTOTAL 38,639.39 10,160.82 10,160.82 26.30%" ← 1st SUBTOTAL = 1983-2020 LR
  // "622,377.94 1,401,275.63 968,410.61 155.60%"    ← 2021 row (no SUBTOTAL label)
  // "1,159,684.50 831,535.92 854,714.25 73.70%"     ← 2022 row
  // "1,759,363.27 2,141,457.21 2,175,894.47 123.68%" ← 2023 row
  // "SUBTOTAL 3,541,425.71 ... 112.92%"             ← 2nd SUBTOTAL = 2024 LR
  // "1,585,981.16 ... 108.78%"                      ← 2025 row
  // "954,283.52 ... 56.95%"                         ← 2026 YTD row 1
  // "100,184.14 ... -38.50%"                        ← 2026 YTD row 2
  // "SUBTOTAL 2,640,448.82 ... 84.46%"              ← 3rd SUBTOTAL (recent combined)
  // "GRAND TOTAL 6,220,513.92 ... 100.30%"          ← Grand Total
  // ─────────────────────────────────────────────────────────────────────────

  const result: Partial<CarrierInputs> = {}

  type BHSection = "written_premium" | "hit_ratio" | "yield_ratio" | "loss_ratios" | "skip" | null
  let section: BHSection = null

  // Written premium: track whether next pure-numeric line is New, Renewal, or Total
  // We use a row counter that advances when we see the row-label lines
  let wpRowLabel: "new" | "renewal" | "total" | null = null

  // Hit/Yield ratio: count data rows seen (numeric lines with %-like values)
  let hitDataRows  = 0
  let yieldDataRows = 0

  // Loss ratios
  let lossYearHeaderSeen = false
  let subtotalCount = 0
  // Secondary counters for rows between SUBTOTALs
  let rowsAfterSub1 = 0
  let rowsAfterSub2 = 0

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim()
    if (!raw) continue

    // ── Section detection ─────────────────────────────────────────────────
    if (/^written\s+premium\s*:/i.test(raw)) {
      section = "written_premium"
      wpRowLabel = null
      continue
    }
    if (/^submitted\s*:/i.test(raw) || /^submitted\s*$/i.test(raw)) {
      section = "skip"; continue
    }
    if (/^quoted\s*:/i.test(raw) || /^quoted\s*$/i.test(raw)) {
      section = "skip"; continue
    }
    if (/^issued\s+premium\s*:/i.test(raw)) {
      section = "skip"; continue
    }
    if (/^quoted\s+ratio\s*:/i.test(raw)) {
      section = "skip"; continue
    }
    if (/^yield\s+ratio\s*:/i.test(raw)) {
      section = "yield_ratio"
      yieldDataRows = 0
      continue
    }
    if (/^hit\s+ratio\s*:/i.test(raw)) {
      section = "hit_ratio"
      hitDataRows = 0
      continue
    }
    if (/direct\s+loss\s+ratio/i.test(raw)) {
      section = "loss_ratios"
      lossYearHeaderSeen = false
      subtotalCount = 0
      rowsAfterSub1 = 0
      rowsAfterSub2 = 0
      continue
    }

    // ── Skip lines ────────────────────────────────────────────────────────
    if (/^\(calendar\s+year/i.test(raw)) continue
    if (/^\(policy\s+year/i.test(raw))   continue
    if (/^=wp\//i.test(raw))             continue
    if (/^=quoted\//i.test(raw))         continue
    if (/^current\s+(ytd|rolling)/i.test(raw)) continue
    if (/^prev\s+(ytd|rolling)/i.test(raw))    continue
    if (/^policies\s+premium/i.test(raw))       continue
    if (/^report\s+parameters/i.test(raw))      continue
    if (/^note:/i.test(raw))                    continue
    if (/ay\s+loss\s+ratio/i.test(raw))         continue
    if (/^incurred\s+direct/i.test(raw))        continue
    if (/^earned\s+incurred/i.test(raw))        continue
    if (/^current\s+annual\s+goal/i.test(raw))  continue
    if (/^page\s+\d/i.test(raw))                continue
    if (/^prepared:/i.test(raw))                continue
    if (/^berkshire|^guard\s+insurance|^home\s+agency/i.test(raw)) continue

    if (section === "skip") continue

    // ── WRITTEN PREMIUM ───────────────────────────────────────────────────
    if (section === "written_premium") {
      // Row label lines (no numbers)
      if (/^new\s*$/i.test(raw))     { wpRowLabel = "new";     continue }
      if (/^renewal\s*$/i.test(raw)) { wpRowLabel = "renewal"; continue }
      if (/^total\s*$/i.test(raw))   { wpRowLabel = "total";   continue }

      // Sometimes "New" and "Renewal" share a line with early data
      // e.g. "New Renewal 14 21,160 112 85,876 23 725 245 353,219"
      if (/\bnew\b/i.test(raw) && /\brenewal\b/i.test(raw)) {
        const n = nums(raw)
        if (n.length >= 1) result.bh_new_policies_ytd = n[0]
        // Renewal data will be on the next pure-numeric line — set label
        wpRowLabel = "renewal"
        continue
      }

      const n = nums(raw)
      if (n.length >= 4) {
        // Pure numeric line — 8 values: CurrYTD_Pol, CurrYTD_Prem, CurrR12_Pol, CurrR12_Prem, ...
        if (wpRowLabel === "new") {
          result.bh_new_policies_ytd = n[0]
          wpRowLabel = "renewal"   // next label expected
        } else if (wpRowLabel === "renewal") {
          result.bh_renewal_policies_ytd = n[0]
          wpRowLabel = "total"
        } else if (wpRowLabel === "total" || wpRowLabel === null) {
          // Total row or unlabelled — pick up premium values
          if (n.length >= 4) {
            result.bh_written_premium_ytd = n[1]   // CurrYTD Premium ($)
            result.bh_written_premium_r12 = n[3]   // CurrR12 Premium ($)
          }
        }
      } else if (n.length >= 2 && wpRowLabel === "total") {
        result.bh_written_premium_ytd = n[1]
        result.bh_written_premium_r12 = n[3] ?? null
      }
    }

    // ── HIT RATIO ─────────────────────────────────────────────────────────
    if (section === "hit_ratio") {
      // Skip pure label lines
      if (/^new\s*$|^renewal\s*$|^total\s*$/i.test(raw)) continue

      const n = nums(raw)
      // Data rows have >=4 values all between 0–100 (percentages)
      if (n.length >= 4 && n.every(v => v >= 0 && v <= 100)) {
        // hitDataRows: 0=New, 1=Renewal, 2=Total
        // Each row: [CurrYTD_Pol%, CurrYTD_Prem%, CurrR12_Pol%, CurrR12_Prem%, PrevYTD_Pol%, ...]
        // We want CurrYTD policy-basis hit ratio = n[0]
        if (hitDataRows === 0) result.bh_hit_ratio_new     = n[0]
        if (hitDataRows === 1) result.bh_hit_ratio_renewal = n[0]
        hitDataRows++
      }
    }

    // ── YIELD RATIO ───────────────────────────────────────────────────────
    if (section === "yield_ratio") {
      if (/^new\s*$|^renewal\s*$|^total\s*$/i.test(raw)) continue
      if (/^=wp\//i.test(raw)) continue

      const n = nums(raw)
      if (n.length >= 4 && n.every(v => v >= 0 && v <= 100)) {
        // yieldDataRows: 0=New, 1=Renewal, 2=Total
        // Total row: n[0]=CurrYTD policy-basis yield, n[1]=CurrYTD premium-basis yield
        if (yieldDataRows === 2) {
          result.bh_yield_ratio_total = n.length >= 2 ? n[1] : n[0]
        }
        yieldDataRows++
      }
    }

    // ── DIRECT LOSS RATIOS ────────────────────────────────────────────────
    if (section === "loss_ratios") {
      // Year header line — e.g. "1983-2020 2021 2022 2023 2024 2025 01/01/2026-..."
      if (/1983/i.test(raw)) {
        lossYearHeaderSeen = true
        continue
      }
      if (!lossYearHeaderSeen) continue

      // Skip sub-headers
      if (/^incurred\s+direct/i.test(raw) || /^earned\s+incurred/i.test(raw)) continue

      // GRAND TOTAL row
      if (/grand\s+total/i.test(raw)) {
        const n = nums(raw)
        if (n.length >= 1) result.bh_grand_total_loss_ratio = n[n.length - 1]
        continue
      }

      // SUBTOTAL rows — appear between year groups
      // Order: SUBTOTAL 1 = 1983-2020, SUBTOTAL 2 = 2024 block, SUBTOTAL 3 = recent combined
      if (/^subtotal\b/i.test(raw)) {
        const n = nums(raw)
        const lr = n.length >= 1 ? n[n.length - 1] : null
        subtotalCount++
        if (lr !== null) {
          if (subtotalCount === 1) result.bh_loss_ratio_1983_2020 = lr
          else if (subtotalCount === 2) result.bh_loss_ratio_2024 = lr
        }
        continue
      }

      // Pure numeric data rows (no SUBTOTAL/GRAND label) — map by position between SUBTOTALs
      const n = nums(raw)
      if (n.length >= 3) {
        const lr = n[n.length - 1]

        if (subtotalCount === 1) {
          // Between SUBTOTAL 1 (1983-2020) and SUBTOTAL 2 (2024):
          // rows appear in year order: 2021, 2022, 2023
          rowsAfterSub1++
          if (rowsAfterSub1 === 1) { /* 2021 — skip, not in our fields */ }
          else if (rowsAfterSub1 === 2) result.bh_loss_ratio_2022 = lr
          else if (rowsAfterSub1 === 3) result.bh_loss_ratio_2023 = lr

        } else if (subtotalCount === 2) {
          // After SUBTOTAL 2 (2024): rows are 2025, then 2026 YTD (possibly 2 YTD rows)
          rowsAfterSub2++
          if (rowsAfterSub2 === 1) result.bh_loss_ratio_2025 = lr
          else if (rowsAfterSub2 === 2) result.bh_loss_ratio_ytd = lr
        }
      }
    }
  }

  return result
}
