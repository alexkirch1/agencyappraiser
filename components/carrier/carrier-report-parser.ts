// =====================================================
// Carrier Report PDF Parser — Travelers, Progressive, Hartford
// =====================================================

import type { CarrierInputs, CarrierName } from "./carrier-engine"

/** Strip $, commas, %, spaces; handle (neg) accounting notation */
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
 * Tokenise a string keeping parenthetical groups (including spaces inside) as one token.
 * "(0.7%)" → ["(0.7%)"], "0.4 pts" → ["0.4","pts"], "(131.0 pts)" → ["(131.0 pts)"]
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

/** Parse all numeric values from a token list, in order */
function numsFromToks(tokens: string[]): number[] {
  return tokens.map(t => num(t)).filter((v): v is number => v !== null)
}

/** Parse all numeric values from a raw line */
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
  return {}
}

// =====================================================
// TRAVELERS — PI Production Report
// =====================================================
// Column layout (confirmed from real Feb 2026 report):
//
// "Actual to Prior Year" table — after stripping LOB label:
//   t[0]=PYTD_Q  t[1]=CYTD_Q  t[2]=Var_Q  t[3]=%VarQ
//   t[4]=PYTD_NB t[5]=CYTD_NB t[6]=Var_NB t[7]=%VarNB
//   t[8]=PYE_PIF t[9]=CYTD_PIF t[10]=Var_PIF t[11]=%VarPIF
//   t[12]=PYE_Ret t[13]=YTD_Ret t[14]=Var_Ret
//   t[15]=PYTD_LR t[16]=YTD_LR t[17]=Var_LR
//
// "WP (,000)" section — AUTO/HOME data rows:
//   13 monthly cols (0-12) | YTD(13) | PYTD(14) | %Var(15) | YE2025(16) | YE2024(17)
//   Annual WP = n[n.length - 2]  (in $000s)
//
// "PIF Count" section:
//   13 monthly cols (0-12) | YTD(13) | PYTD(14) | %Var(15) | YE2025(16) | YE2024(17)
//   Current PIF = n[13]
// =====================================================

type TravSection = "actuals" | "wp" | "pif" | "nb" | null

function parseTravelers(lines: string[]): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}
  let section: TravSection = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect section headers
    if (/actual\s*to\s*prior\s*year/i.test(line))                      { section = "actuals"; continue }
    if (/^wp\s*[\(（,]|^written\s*prem/i.test(line))                   { section = "wp";      continue }
    if (/^pif\s*count|^policies?\s*in\s*force\s*count/i.test(line))   { section = "pif";     continue }
    if (/^booked\s*nb|^new\s*business\b/i.test(line))                  { section = "nb";      continue }
    // Skip 13-month column header rows
    if (/^13\s*month|^feb\s+2\d{3}\s+mar/i.test(line))                 { continue }

    // Only process LOB data rows
    const lobMatch = line.match(/^(AUTO|HOME|OTHER|TOTAL)\b/i)
    if (!lobMatch) continue

    const lob  = lobMatch[1].toUpperCase() as "AUTO" | "HOME" | "TOTAL"
    const rest = line.slice(lobMatch[0].length).trim()

    // ---- Actuals table ----
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
    }

    // ---- WP section ($000s) ----
    else if (section === "wp") {
      const n = nums(rest)
      if (n.length >= 16) {
        const annualWp = n[n.length - 2]
        if (lob === "AUTO") result.travelers_auto_wp = annualWp
        else if (lob === "HOME") result.travelers_home_wp = annualWp
      }
    }

    // ---- PIF Count section ----
    else if (section === "pif") {
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
// Key sections in the actual report:
//
// "Production & Growth" table — Personal Lines page:
//   Rows: "All Auto", "All Home", "Total"
//   Cols: NWP($k) [2026YTD, 2025, 2024, 2023, YTD%Var, 2023-2025%Var]
//         TWP($k) [same cols]
//         Premium Retention(%) [2026YTD, 2025]
//   In the raw pdfjs text, each row is one long line with all columns merged.
//   Example: "All Auto1181,99152581(55.2)999.03722,88574916212.7999.077.0119.4"
//   After whitespace normalisation: "All Auto 118 1,991 525 81 (55.2) 999.0 372 2,885 749 162 12.7 999.0 77.0 119.4"
//   Columns (0-indexed after stripping label):
//     0=NWP_YTD  1=NWP_2025  2=NWP_2024  3=NWP_2023  4=NWP_YTD%  5=NWP_2023-2025%
//     6=TWP_YTD  7=TWP_2025  8=TWP_2024  9=TWP_2023  10=TWP_YTD% 11=TWP_2023-2025%
//     12=PremRet_YTD  13=PremRet_2025
//
// "Policy Counts" / "Financials" table:
//   Rows: "All Auto", "All Home", "Total"
//   Contains Total Policy Inforce and New Policy Counts
//
// "Profitability" table:
//   Rows: segment names
//   Contains Calendar Year Loss Ratio [2026YTD, 2025, 2024, 2023]
//   Example: "Personal Lines44.424.977.553.6"
//   → n[0]=2026YTD_LR, n[1]=2025_LR, n[2]=2024_LR, n[3]=2023_LR
//
// "Retention" table (Small Commercial):
//   Contains PRR (Premium Retention Rate) and PCR columns
//   Row: "Total102.273.979.469.9" → n[0]=PRR_2026YTD, n[1]=PRR_2025, n[2]=PCR_2026YTD, n[3]=PCR_2025
// =====================================================

type HartfordSection = "prod" | "profitability" | "financials" | "retention" | "flow" | null
type HartfordPage = "global" | "personal" | "commercial" | "small_commercial" | null

function parseHartford(lines: string[]): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}
  let section: HartfordSection = null
  let page: HartfordPage = null

  for (let i = 0; i < lines.length; i++) {
    const raw  = lines[i]
    const line = raw.toLowerCase().replace(/\s+/g, " ").trim()

    // ---- Page / segment detection ----
    if (/^personal lines\s*$/i.test(raw))        { page = "personal";       section = null; continue }
    if (/^small commercial\s*$/i.test(raw))       { page = "small_commercial"; section = null; continue }
    if (/^middle and large commercial\s*$/i.test(raw)) { page = "commercial"; section = null; continue }
    if (/^global specialty\s*$/i.test(raw))       { page = "global";         section = null; continue }

    // ---- Section headers ----
    if (/production\s*&\s*growth|production and growth/i.test(raw))  { section = "prod";          continue }
    if (/^profitability\b/i.test(raw))                                { section = "profitability"; continue }
    if (/^financials\b/i.test(raw))                                   { section = "financials";    continue }
    if (/^retention\b/i.test(raw))                                    { section = "retention";     continue }
    if (/^flow\b|new business flow/i.test(raw))                       { section = "flow";          continue }

    // Skip header rows
    if (/^segment\b|^lob\b|twp.*growth|nwp.*growth|cylr|prrpcr|2026\s*ytd\s*2025/i.test(raw)) continue

    // ---- Personal Lines — Production & Growth ----
    if (page === "personal" && section === "prod") {
      // "All Auto" row
      if (/^all auto\b/i.test(raw)) {
        const rest  = raw.replace(/^all auto\s*/i, "")
        const t     = accountingTok(rest)
        const n     = numsFromToks(t)
        // n[1]=NWP_2025  n[7]=TWP_2025  n[13]=PremRet_2025
        // Layout: NWP(YTD 2025 2024 2023 %YTD %2023-2025) TWP(YTD 2025 2024 2023 %YTD %2023-2025) Ret(YTD 2025)
        if (n.length >= 8)  result.hartford_pl_auto_twp       = n[7]   // TWP 2025 ($k)
        if (n.length >= 14) result.hartford_pl_auto_retention = n[13]  // Premium Retention 2025
      }
      // "All Home" row
      if (/^all home\b/i.test(raw)) {
        const rest = raw.replace(/^all home\s*/i, "")
        const t    = accountingTok(rest)
        const n    = numsFromToks(t)
        if (n.length >= 8)  result.hartford_pl_home_twp       = n[7]
        if (n.length >= 14) result.hartford_pl_home_retention = n[13]
      }
    }

    // ---- Personal Lines — Financials (Policy Inforce) ----
    if (page === "personal" && section === "financials") {
      // "All Auto" row — contains new policy counts + total policy inforce
      // "All Auto 46 11 382 394 84 219 627 1.5 70.2 78.3" — layout varies
      // Safer: look for the "All Auto ... 2025 YE Total" column = large number
      if (/^all auto\b/i.test(raw)) {
        const rest = raw.replace(/^all auto\s*/i, "")
        const n = nums(rest)
        // Columns: NP_YTD NP_2025YTD [Total PIF cols...] Ret%
        // From real report: "46 11 382 394 84 21 962 71.5 70.2 78.3"
        // 2025 YE Total PIF is the largest integer value
        const pifCandidates = n.filter(v => v > 100 && Number.isInteger(v))
        if (pifCandidates.length > 0) result.hartford_pl_auto_pif = Math.max(...pifCandidates)
      }
      if (/^all home\b/i.test(raw)) {
        const rest = raw.replace(/^all home\s*/i, "")
        const n = nums(rest)
        const pifCandidates = n.filter(v => v > 100 && Number.isInteger(v))
        if (pifCandidates.length > 0) result.hartford_pl_home_pif = Math.max(...pifCandidates)
      }
    }

    // ---- Personal Lines — Profitability (Loss Ratio) ----
    if (page === "personal" && section === "profitability") {
      // "All Auto 463,936 284,044 61.2 32.9 24.6 3.3 11.9 30.2 24.6 22.6"
      // We want CYLR 2025 — for All Auto row, n[3] after stripping label and earned/incurred premium
      if (/^all auto\b/i.test(raw)) {
        const rest = raw.replace(/^all auto\s*/i, "")
        const n = nums(rest)
        // n[0]=Earned_Prem, n[1]=Incurred_Losses, n[2]=CYLR_YTD, n[3]=CYLR_2025
        if (n.length >= 4) result.hartford_pl_auto_lr = n[3]
      }
      if (/^all home\b/i.test(raw)) {
        const rest = raw.replace(/^all home\s*/i, "")
        const n = nums(rest)
        if (n.length >= 4) result.hartford_pl_home_lr = n[3]
      }
    }

    // ---- Small Commercial — Production & Growth ----
    if (page === "small_commercial" && section === "prod") {
      if (/^total\b/i.test(raw)) {
        const rest = raw.replace(/^total\s*/i, "")
        const t = accountingTok(rest)
        const n = numsFromToks(t)
        // n[7] = TWP 2025 annual
        if (n.length >= 8) result.hartford_cl_twp = n[7]
      }
    }

    // ---- Small Commercial — Profitability ----
    if (page === "small_commercial" && section === "profitability") {
      if (/^total\b/i.test(raw)) {
        const rest = raw.replace(/^total\s*/i, "")
        const n = nums(rest)
        // n[1] = CYLR 2025
        if (n.length >= 2) result.hartford_cl_lr = n[1]
      }
    }

    // ---- Small Commercial — Retention ----
    if (page === "small_commercial" && section === "retention") {
      if (/^total\b/i.test(raw)) {
        const rest = raw.replace(/^total\s*/i, "")
        const n = nums(rest)
        // n[1] = PRR 2025
        if (n.length >= 2) result.hartford_cl_retention = n[1]
      }
    }
  }

  return result
}
