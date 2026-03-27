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
  if (carrier === "berkshire")     return parseBerkshire(lines)
  if (carrier === "libertymutual") return parseLibertyMutual(lines)
  if (carrier === "travelers")     return parseTravelers(lines)
  if (carrier === "progressive")   return parseProgressive(lines)
  if (carrier === "hartford")      return parseHartford(lines)
  if (carrier === "safeco")        return parseSafeco(lines)
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
// LIBERTY MUTUAL — CL ADP Summary
// =====================================================
//
// Verified real text structure (from CL ADP Summary PDF, 03/2026):
//
//   "Direct Written Premium"
//   "YTD  PYTD% Growth"
//   "$0.11M$0.08M33.9%"          ← YTD, PYTD, Growth% on one line
//   "New Business DWP"
//   "YTDPYTDGrowth %"
//   "$0.1M$0.0M12.4%"
//   "PIF"
//   "YTD  PYTDGrowth %"
//   "10,5448,31426.8%"           ← current PIF, prior PIF, growth
//   "Renewal"
//   "PLIF Renewal  Premium Retention"
//   "6,49269.6%"                 ← PLIF renewal count, premium retention %
//   "Loss Ratio"
//   "YTDPYTD% Growth"
//   "65.0%12.5%418.9%"           ← YTD LR, PYTD LR, growth
//   "2 Years + YTD Loss Ratio"
//   "YTDPYTD% Growth"
//   "99.3%204.2%-51.4%"          ← 2yr+YTD LR, prior, growth
//
// Key: values are concatenated without spaces (e.g. "$0.11M$0.08M33.9%")
// We split on $ and % boundaries then parse each token.
// =====================================================

function parseLibertyMutual(lines: string[]): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}

  // Parse a dollar-M value like "$0.11M" → 0.11 (in $M)
  function parseDollarM(s: string): number | null {
    const m = s.match(/\$(-?\d+(?:\.\d+)?)M/i)
    return m ? parseFloat(m[1]) : null
  }

  // Parse a plain percentage like "65.0%" or "-51.4%" → number
  function parsePct(s: string): number | null {
    const m = s.match(/(-?\d+(?:\.\d+)?)%/)
    return m ? parseFloat(m[1]) : null
  }

  // Parse large integer like "10,544" → 10544
  function parseCount(s: string): number | null {
    const clean = s.replace(/,/g, "")
    const n = parseFloat(clean)
    return isNaN(n) ? null : n
  }

  type LMSection = "dwp" | "nb_dwp" | "pif" | "renewal" | "loss_ratio" | "loss_ratio_2yr" | null
  let section: LMSection = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Section headers
    if (/^Direct Written Premium/i.test(line)) { section = "dwp"; continue }
    if (/^New Business DWP/i.test(line))        { section = "nb_dwp"; continue }
    if (/^Earned Premium/i.test(line))           { section = null; continue }
    if (/^PIF$/i.test(line))                     { section = "pif"; continue }
    if (/^Renewal$/i.test(line))                 { section = "renewal"; continue }
    if (/^2 Years? \+ YTD Loss Ratio/i.test(line)) { section = "loss_ratio_2yr"; continue }
    if (/^Loss Ratio$/i.test(line))              { section = "loss_ratio"; continue }

    // Skip header rows like "YTDPYTDGrowth %"
    if (/^YTD|^PYTD|growth/i.test(line) && !line.includes("$") && !line.includes("%")) continue
    if (/click here/i.test(line)) continue

    // ── DWP: "$0.11M$0.08M33.9%" ──
    if (section === "dwp") {
      const ytd  = parseDollarM(line.split("$")[1] ? "$" + line.split("$")[1] : "")
      const pytd = parseDollarM(line.split("$")[2] ? "$" + line.split("$")[2] : "")
      if (ytd  !== null) result.lm_dwp_ytd  = ytd
      if (pytd !== null) result.lm_dwp_pytd = pytd
      section = null
      continue
    }

    // ── New Business DWP: "$0.1M$0.0M12.4%" ──
    if (section === "nb_dwp") {
      const parts = line.split("$").filter(Boolean)
      if (parts[0]) {
        const v = parseDollarM("$" + parts[0])
        if (v !== null) result.lm_nb_dwp_ytd = v
      }
      section = null
      continue
    }

    // ── PIF: "10,5448,31426.8%" — two counts concatenated ──
    if (section === "pif") {
      // Extract all digit sequences (with commas) — first is current PIF
      const numParts = line.replace(/%[\d.]+%?/, "").split(/(?<=\d)(?=[A-Z,\d]{4,})/g)
      // Simpler: extract first large number
      const m = line.match(/^([\d,]+)/)
      if (m) {
        const pif = parseCount(m[1])
        if (pif !== null) result.lm_pif = pif
      }
      section = null
      continue
    }

    // ── Renewal: "6,49269.6%" — PLIF count + premium retention % ──
    if (section === "renewal") {
      // Skip sub-header lines
      if (/PLIF|Premium Retention/i.test(line)) continue
      const pctM = line.match(/(-?\d{1,3}(?:\.\d+)?)%/)
      if (pctM) result.lm_premium_retention = parseFloat(pctM[1])
      const countM = line.match(/^([\d,]+)/)
      if (countM) {
        const c = parseCount(countM[1])
        if (c !== null) result.lm_plif_renewal = c
      }
      section = null
      continue
    }

    // ── Loss Ratio: "65.0%12.5%418.9%" — YTD, PYTD, Growth ──
    if (section === "loss_ratio") {
      const pcts = [...line.matchAll(/(-?\d{1,3}(?:\.\d+)?)%/g)].map(m => parseFloat(m[1]))
      if (pcts[0] !== undefined) result.lm_loss_ratio_ytd = pcts[0]
      section = null
      continue
    }

    // ── 2yr + YTD Loss Ratio: "99.3%204.2%-51.4%" ──
    if (section === "loss_ratio_2yr") {
      const pcts = [...line.matchAll(/(-?\d{1,3}(?:\.\d+)?)%/g)].map(m => parseFloat(m[1]))
      if (pcts[0] !== undefined) result.lm_loss_ratio_2yr = pcts[0]
      section = null
      continue
    }
  }

  return result
}

// =====================================================
// BERKSHIRE HATHAWAY GUARD — Producer Activity Report (PAR)
// =====================================================
//
// VERIFIED REAL TEXT (OCR from 03/26/2026 PAR, each token = one line or one word):
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
  // CONFIRMED REAL PDF TEXT (each entry below = one line after pdfjs extraction):
  //
  //  "Written Premium:"
  //  "(Calendar Year Basis)"
  //  "New"                     ← label
  //  "Renewal"                 ← label
  //  "14"                      ← New CurrYTD_Pol
  //  "21,160"                  ← New CurrYTD_Prem
  //  "112"                     ← New CurrR12_Pol
  //  "85,876"                  ← New CurrR12_Prem
  //  "23"  "725"  "245"  "353,219"   ← New PrevYTD, PrevR12
  //  "35"  "100,320"  "208"  "659,670"  "33"  "98,719"  "314"  "927,875"  ← Renewal 8 vals
  //  "Total"                   ← label
  //  "49"  "121,480"  "320"  "745,546"  "56"  "99,444"  "559"  "1,281,094"
  //
  //  "Yield Ratio:"            ← Note: Yield comes BEFORE Hit in this PDF!
  //  "New"  "(Policy Year Basis)"  "Renewal"  "=WP/Submitted"  "Total"
  //  "41.18%"  "17.53%"  ...  (New row — 8 values, each own line)
  //  "76.09%"  ...             (Renewal row)
  //  "61.25%"  ...             (Total row)
  //
  //  "Hit Ratio:"
  //  "New"  "(Policy Year Basis)"  "Renewal"  "=WP/Quoted)"  "Total"
  //  "60.87%"  "36.48%"  ...   (New row — 8 values)
  //  "83.33%"  ...             (Renewal row)
  //  "75.38%"  ...             (Total row)
  //
  //  "Direct Loss Ratios:"
  //  "1983-2020"  "2021"  "2022"  "2023"  "2024"  "2025"  "01/01/2026-02/28/2026"
  //  "Incurred"  "Direct Accident Year Calendar Year Calendar Year"
  //  "Earned"  "Incurred Loss Ratio"
  //  "SUBTOTAL"
  //  "38,639.39"  "10,160.82"  "10,160.82"  "26.30%"   ← 1983-2020 data
  //  "622,377.94"  "1,401,275.63"  "968,410.61"  "155.60%"  ← 2021
  //  "1,159,684.50"  "831,535.92"  "854,714.25"  "73.70%"   ← 2022
  //  "1,759,363.27"  "2,141,457.21"  "2,175,894.47"  "123.68%"  ← 2023
  //  "SUBTOTAL"
  //  "3,541,425.71"  ...  "112.92%"                          ← 2024
  //  "1,585,981.16"  ...  "108.78%"                          ← 2025
  //  "954,283.52"  ...  "56.95%"                             ← 2026 YTD1
  //  "100,184.14"  ...  "-38.50%"                            ← 2026 YTD2
  //  "SUBTOTAL"
  //  "2,640,448.82"  ...  "84.46%"                           ← recent combined
  //  "GRAND TOTAL"
  //  "6,220,513.92"  ...  "100.30%"
  //
  // KEY INSIGHT: Every number/% is its OWN LINE. Row labels (New, Renewal, Total)
  // are also their own lines. SUBTOTAL and GRAND TOTAL are their own lines with
  // data following on subsequent lines. We track state with simple counters.
  // ─────────────────────────────────────────────────────────────────────────

  const result: Partial<CarrierInputs> = {}

  // Parse a single-token line to a number (handles "21,160", "26.30%", "-38.50%")
  function parseNum(line: string): number | null {
    const clean = line.trim().replace(/[$,%\s]/g, "").replace(/[()]/g, "")
    const n = parseFloat(clean)
    return isNaN(n) ? null : (/^\(/.test(line.trim()) ? -n : n)
  }

  // Is this line a pure number (possibly with commas, %, $, parens)?
  function isNumLine(line: string): boolean {
    return parseNum(line) !== null && !/[a-zA-Z]/.test(line.replace(/[eE]/, ""))
  }

  // ── State ──
  type Section = "wp" | "yield" | "hit" | "loss" | "skip" | null
  let section: Section = null

  // Written Premium: which row label we last saw
  type WPRow = "new" | "renewal" | "total" | null
  let wpRow: WPRow = null
  // Collect 8 values per row (each value arrives on its own line)
  const wp: Record<"new" | "renewal" | "total", number[]> = { new: [], renewal: [], total: [] }

  // Hit / Yield: collect all % lines in order, 8 per row
  // Row order in PDF: New(0), Renewal(1), Total(2)
  // But row labels appear as their OWN lines in the section header block
  // We detect the transition by counting % values collected (8 per row)
  const hitPcts:   number[] = []
  const yieldPcts: number[] = []

  // Loss ratios: state machine
  let lossDataStarted = false  // true after we pass the year-header line ("1983-2020 ...")
  let subtotalCount   = 0       // how many SUBTOTAL labels we've seen
  let waitingForGrandTotal = false
  // Between SUBTOTAL 1 and 2: data rows are 2021, 2022, 2023
  // Between SUBTOTAL 2 and 3: data rows are 2025, YTD1, YTD2
  // Each group tracked by rowsAfterSub
  let rowsAfterSub: number[] = []
  // For each data block, we need the LAST % in the 4-value group (Earned, Inc, IncCalc, LR%)
  // Since each value is its own line, we track a 4-value accumulator
  let lossDataBuf: number[] = []
  let nextIsGrandTotal = false

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // ── Section transitions ──────────────────────────────────────────────
    if (/^Written Premium/i.test(line)) {
      section = "wp"; wpRow = null; continue
    }
    if (/^Yield Ratio/i.test(line)) {
      section = "yield"; continue
    }
    if (/^Hit Ratio/i.test(line)) {
      section = "hit"; continue
    }
    if (/^Direct Loss Ratios/i.test(line)) {
      section = "loss"; lossDataStarted = false; subtotalCount = 0
      rowsAfterSub = []; lossDataBuf = []; nextIsGrandTotal = false
      continue
    }
    if (/^Submitted\b|^Quoted\b|^Issued Premium\b|^Quoted Ratio\b/i.test(line)) {
      section = "skip"; continue
    }
    if (/^Current Annual Goal/i.test(line)) { section = "skip"; continue }
    if (/^NOTE:/i.test(line)) { section = "skip"; continue }

    // Skip global header/footer lines regardless of section
    if (/Calendar Year Basis|Policy Year Basis/i.test(line)) continue
    if (/^=WP\/|^=Quoted\//i.test(line)) continue
    if (/Current YTD|Prev YTD|Current Rolling|Prev Rolling/i.test(line)) continue
    if (/^Policies\s+Premium/i.test(line)) continue
    if (/Incurred Direct Accident|Earned\s+Incurred\s+Loss/i.test(line)) continue
    if (/^Prepared:|^Page \d|^RMWI/i.test(line)) continue
    if (/Berkshire Hathaway|GUARD Companies|guard\.com/i.test(line)) continue
    if (section === "skip") continue

    // ── WRITTEN PREMIUM ─────────────────────────────────────────────────
    if (section === "wp") {
      // Row labels (their own lines)
      if (/^New$/i.test(line))     { wpRow = "new";     continue }
      if (/^Renewal$/i.test(line)) { wpRow = "renewal"; continue }
      if (/^Total$/i.test(line))   { wpRow = "total";   continue }
      // Skip column headers
      if (/^Policies$|^Premium$/i.test(line)) continue

      if (wpRow && isNumLine(line)) {
        const n = parseNum(line)!
        if (wp[wpRow].length < 8) wp[wpRow].push(n)
      }
      continue
    }

    // ── YIELD RATIO ─────────────────────────────────────────────────────
    // Collect all % lines in order: New[0..7], Renewal[8..15], Total[16..23]
    if (section === "yield") {
      // Skip label lines
      if (/^New$|^Renewal$|^Total$/i.test(line)) continue
      if (/%/.test(line) && isNumLine(line)) {
        const n = parseNum(line)
        if (n !== null) yieldPcts.push(n)
      }
      continue
    }

    // ── HIT RATIO ───────────────────────────────────────────────────────
    if (section === "hit") {
      if (/^New$|^Renewal$|^Total$/i.test(line)) continue
      if (/%/.test(line) && isNumLine(line)) {
        const n = parseNum(line)
        if (n !== null) hitPcts.push(n)
      }
      continue
    }

    // ── DIRECT LOSS RATIOS ───────────────────────────────────────────────
    if (section === "loss") {
      // Year header line — marks start of data
      if (/1983/.test(line)) { lossDataStarted = true; continue }
      if (!lossDataStarted) continue

      if (/^GRAND TOTAL$/i.test(line)) { nextIsGrandTotal = true; lossDataBuf = []; continue }
      if (/^SUBTOTAL$/i.test(line)) {
        // Flush any pending data buf (shouldn't be needed but safety)
        lossDataBuf = []
        // subtotalCount already tracks what we've seen
        subtotalCount++
        rowsAfterSub = []
        continue
      }

      // Pure number or % line — accumulate into current 4-value data block
      if (isNumLine(line)) {
        const n = parseNum(line)!
        lossDataBuf.push(n)

        // Each data block = 4 values: Earned, Incurred, IncurredCalc, LR%
        // The 4th value (index 3) is the Loss Ratio %
        if (lossDataBuf.length === 4) {
          const lr = lossDataBuf[3]
          lossDataBuf = []

          if (nextIsGrandTotal) {
            result.bh_grand_total_loss_ratio = lr
            nextIsGrandTotal = false
          } else if (subtotalCount === 1) {
            // First SUBTOTAL block = 1983-2020
            result.bh_loss_ratio_1983_2020 = lr
          } else if (subtotalCount === 2) {
            // 2nd SUBTOTAL block = 2024
            result.bh_loss_ratio_2024 = lr
          } else if (subtotalCount === 3) {
            // 3rd SUBTOTAL block = recent combined — skip (not in our fields)
          } else {
            // Rows between subtotals
            rowsAfterSub.push(lr)
            if (subtotalCount === 0) {
              // Should not happen (data before first SUBTOTAL label)
            }
            // After subtotal 1 (1983-2020 done): rows are 2021, 2022, 2023
            // But subtotalCount increments ON the SUBTOTAL label, so after
            // seeing "SUBTOTAL" once, subtotalCount=1, then we see 2021,2022,2023 rows
            // Wait — the loop above has the logic inverted. Let's re-check:
            // Line "SUBTOTAL" → subtotalCount becomes 1, rowsAfterSub=[]
            // Next 4 lines = 1983-2020 data → lossDataBuf fills → lr = 26.30%
            // But subtotalCount is 1 at that point → stored as bh_loss_ratio_1983_2020 ✓
            // Then lines for 2021 row → subtotalCount still 1, rowsAfterSub grows
            // Actually no — after storing the SUBTOTAL data we fall through to rowsAfterSub
            // This logic is broken. See below for corrected approach.
          }
        }
      }
      continue
    }
  }

  // ── Assign Written Premium ──────────────────────────────────────────────
  // wp.new:     [CurrYTD_Pol(0), CurrYTD_Prem(1), CurrR12_Pol(2), CurrR12_Prem(3), ...]
  if (wp.new.length >= 1)     result.bh_new_policies_ytd     = wp.new[0]
  if (wp.renewal.length >= 1) result.bh_renewal_policies_ytd = wp.renewal[0]
  if (wp.total.length >= 2)   result.bh_written_premium_ytd  = wp.total[1]
  if (wp.total.length >= 4)   result.bh_written_premium_r12  = wp.total[3]

  // ── Assign Hit Ratio ────────────────────────────────────────────────────
  // 8 values per row, flat array: New[0..7], Renewal[8..15], Total[16..23]
  if (hitPcts[0] !== undefined) result.bh_hit_ratio_new     = hitPcts[0]
  if (hitPcts[8] !== undefined) result.bh_hit_ratio_renewal = hitPcts[8]

  // ── Assign Yield Ratio ──────────────────────────────────────────────────
  // Total row starts at index 16: [CurrYTD_Pol%, CurrYTD_Prem%, ...]
  if (yieldPcts[17] !== undefined)      result.bh_yield_ratio_total = yieldPcts[17]
  else if (yieldPcts[16] !== undefined) result.bh_yield_ratio_total = yieldPcts[16]

  // ── Loss Ratios — delegated to parseBerkshireLoss ──────────────────────
  const lossResult = parseBerkshireLoss(lines)
  Object.assign(result, lossResult)

  return result
}

// ─── BH Loss Ratio helper (called after the main pass) ───────────────────────
// The loss ratio section in BH PAR has this structure:
//   SUBTOTAL (label line)
//   38,639.39  ← Earned
//   10,160.82  ← Incurred
//   10,160.82  ← Incurred (calc)
//   26.30%     ← Loss Ratio   → this is the value we want for 1983-2020
//   [then 2021 data: 4 lines, then 2022: 4 lines, then 2023: 4 lines]
//   SUBTOTAL   ← 2nd subtotal
//   [2024 data: 4 lines]
//   [2025 data: 4 lines]
//   [YTD1: 4 lines]
//   [YTD2: 4 lines]
//   SUBTOTAL   ← 3rd subtotal
//   [combined recent: 4 lines]
//   GRAND TOTAL
//   [total: 4 lines]
//
// The parseBerkshire function above handles this correctly:
// - subtotalCount=0 before any SUBTOTAL → SUBTOTAL label → subtotalCount=1
// - Next 4 lines = 1983-2020 data block → 4th line = 26.30% → stored as bh_loss_ratio_1983_2020
// - Lines for 2021 (4 lines) → subtotalCount still 1 but NOT in the SUBTOTAL branch
//   The issue: after storing the SUBTOTAL block we need to handle subsequent year blocks
//   which are NOT preceded by a SUBTOTAL label.
// The corrected approach uses a different tracking strategy — see parseBerkshireLoss below.

function parseBerkshireLoss(lines: string[]): Pick<
  Partial<CarrierInputs>,
  | "bh_loss_ratio_1983_2020" | "bh_loss_ratio_2022" | "bh_loss_ratio_2023"
  | "bh_loss_ratio_2024"      | "bh_loss_ratio_2025" | "bh_loss_ratio_ytd"
  | "bh_grand_total_loss_ratio"
> {
  const result: ReturnType<typeof parseBerkshireLoss> = {}

  let inLoss = false
  let dataStarted = false
  let subtotalIdx  = 0   // how many SUBTOTAL labels seen so far
  let nextIsGT     = false
  // We collect data 4-at-a-time; each set of 4 = one year block
  let buf: number[] = []
  // Within each subtotal region, track how many year blocks we've completed
  let blocksInRegion = 0

  function parseNum(line: string): number | null {
    const clean = line.trim().replace(/[$,%\s]/g, "").replace(/[()]/g, "")
    const n = parseFloat(clean)
    return isNaN(n) || /[a-df-zA-DF-Z]/.test(line.trim()) ? null : n
  }

  function isDataLine(line: string): boolean {
    return parseNum(line) !== null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (/^Direct Loss Ratios/i.test(line)) { inLoss = true; continue }
    if (!inLoss) continue

    // End of section
    if (/^(Submitted|Quoted|Issued Premium|Yield Ratio|Hit Ratio)\b/i.test(line)) break

    // Year header
    if (/1983/.test(line)) { dataStarted = true; continue }
    if (!dataStarted) continue

    // Skip column headers
    if (/Incurred Direct|Earned\s+Incurred/i.test(line)) continue

    if (/^GRAND TOTAL$/i.test(line)) { nextIsGT = true; buf = []; continue }

    if (/^SUBTOTAL$/i.test(line)) {
      subtotalIdx++
      blocksInRegion = 0
      buf = []
      continue
    }

    if (isDataLine(line)) {
      buf.push(parseNum(line)!)
      if (buf.length === 4) {
        const lr = buf[3]
        buf = []
        blocksInRegion++

        if (nextIsGT) {
          result.bh_grand_total_loss_ratio = lr
          nextIsGT = false

        } else if (subtotalIdx === 1 && blocksInRegion === 1) {
          // First data block after 1st SUBTOTAL = 1983-2020
          result.bh_loss_ratio_1983_2020 = lr

        } else if (subtotalIdx === 1 && blocksInRegion === 2) {
          // 2nd block after 1st SUBTOTAL = 2021 (skip — not in our fields)

        } else if (subtotalIdx === 1 && blocksInRegion === 3) {
          result.bh_loss_ratio_2022 = lr

        } else if (subtotalIdx === 1 && blocksInRegion === 4) {
          result.bh_loss_ratio_2023 = lr

        } else if (subtotalIdx === 2 && blocksInRegion === 1) {
          // First block after 2nd SUBTOTAL = 2024
          result.bh_loss_ratio_2024 = lr

        } else if (subtotalIdx === 2 && blocksInRegion === 2) {
          result.bh_loss_ratio_2025 = lr

        } else if (subtotalIdx === 2 && blocksInRegion === 3) {
          result.bh_loss_ratio_ytd = lr
        }
      }
    }
  }

  return result
}
