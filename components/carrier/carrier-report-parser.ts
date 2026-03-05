// =====================================================
// Carrier Report PDF Parser — Travelers & Progressive
// =====================================================

import type { CarrierInputs, CarrierName } from "./carrier-engine"

// Strip $, commas, parentheses (negatives), %, spaces and parse float
function num(s: string | undefined | null): number | null {
  if (!s) return null
  // parentheses = negative in accounting notation
  const neg = /^\(.*\)$/.test(s.trim())
  const cleaned = s.replace(/[$,%()\s]/g, "")
  const n = parseFloat(cleaned)
  if (isNaN(n)) return null
  return neg ? -n : n
}

// Split a line into tokens, ignoring empty strings
function tokens(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean)
}

// Get all numeric tokens from a line (in order)
function numTokens(line: string): number[] {
  return tokens(line)
    .map(t => num(t))
    .filter((v): v is number => v !== null)
}

export function parseCarrierReport(
  text: string,
  carrier: CarrierName
): Partial<CarrierInputs> {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)

  switch (carrier) {
    case "progressive":
      return parseProgressive(lines)
    case "travelers":
      return parseTravelers(lines)
    default:
      return {}
  }
}

// =====================================================
// TRAVELERS — Production Data Summary
// =====================================================
//
// The report has named sections. Each section has a header
// line followed by LOB rows: AUTO, HOME, OTHER, TOTAL.
//
// Section: "Actual to Prior Year" table (top of report)
//   Columns: [PYTD_Quotes, CYTD_Quotes, Var, %Var,
//             PYTD_NB, CYTD_NB, Var, %Var,
//             PYE_PIF, CYTD_PIF, Var, %Var,
//             PYE_Retention, YTD_Retention, Var,
//             PYTD_LR, YTD_LR, Var]
//   Indices:   0          1                4    5
//              8          9                12   13      (15)
//                                          16   17
//
// Section: "WP (,000)" — 13-month + YTD + YE columns
//   Last two tokens are YE 2025 and YE 2024 (after the month cols)
//   Row looks like: AUTO $14 $39 ... $21 $20 5.5% $206 $233
//   The $206 is 2025 annual WP (in $000s)
//
// Section: "PIF Count"
//   Row: AUTO 80 81 ... 216 235  (13 months + YTD + PYTD + % + 2025 + 2024)
//   YTD PIF is 13th number (index 12), 2025 YE is second-to-last pure number
//
// =====================================================

type TravSection = "actuals" | "wp" | "pif" | "nb" | "quotes" | "sales" | null

function parseTravelers(lines: string[]): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}
  let section: TravSection = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lower = line.toLowerCase()

    // ---- Detect section by header ----
    if (/actual\s*to\s*prior\s*year/i.test(line)) {
      section = "actuals"; continue
    }
    if (/^wp\s*[\(（]/.test(line) || /written\s*premium\s*[\(（]/i.test(line)) {
      section = "wp"; continue
    }
    if (/^pif\s*count/i.test(line) || /policies?\s*in\s*force\s*count/i.test(line)) {
      section = "pif"; continue
    }
    if (/^booked\s*nb/i.test(line) || /^new\s*business/i.test(line)) {
      section = "nb"; continue
    }
    if (/^quotes$/i.test(line.trim())) {
      section = "quotes"; continue
    }
    if (/^sales\s*ratio/i.test(line)) {
      section = "sales"; continue
    }
    // Reset section on blank-ish header rows that don't match known sections
    if (/^13\s*month\s*trend/i.test(line)) {
      // Leave current section — data rows follow the 13-month header
      continue
    }

    // ---- Skip header/label rows within sections ----
    // (rows that don't start with AUTO, HOME, OTHER, TOTAL)
    const lobMatch = line.match(/^(AUTO|HOME|OTHER|TOTAL)\b/i)
    if (!lobMatch) continue

    const lob = lobMatch[1].toUpperCase() as "AUTO" | "HOME" | "OTHER" | "TOTAL"
    const nums = numTokens(line)

    if (nums.length === 0) continue

    switch (section) {
      case "actuals": {
        // Row format (18 values, see column map above):
        // [PYTD_Q, CYTD_Q, Var_Q, %Var_Q,
        //  PYTD_NB, CYTD_NB, Var_NB, %Var_NB,
        //  PYE_PIF, CYTD_PIF, Var_PIF, %Var_PIF,
        //  PYE_Ret, YTD_Ret, Var_Ret (pts),
        //  PYTD_LR, YTD_LR, Var_LR (pts)]
        // Note: parenthetical negatives like (43.4%) are parsed as negative numbers
        // We need indices: CYTD_PIF=9, YTD_Ret=13, YTD_LR=16
        // But parenthetical values expand the token count — use a smarter pass.

        // Re-tokenise treating parenthetical groups as single tokens
        const rawTokens = parseAccountingTokens(line.replace(/^(AUTO|HOME|OTHER|TOTAL)\s*/i, ""))

        // Positions (0-based after LOB label stripped):
        // 0: PYTD_Q  1: CYTD_Q  2: Var_Q  3: %Var_Q
        // 4: PYTD_NB 5: CYTD_NB 6: Var_NB 7: %Var_NB
        // 8: PYE_PIF 9: CYTD_PIF 10: Var_PIF 11: %Var_PIF
        // 12: PYE_Ret 13: YTD_Ret 14: Var_Ret(pts)
        // 15: PYTD_LR 16: YTD_LR 17: Var_LR
        if (rawTokens.length >= 17) {
          const cytdPif  = num(rawTokens[9])
          const ytdRet   = num(rawTokens[13])
          const ytdLr    = num(rawTokens[16])

          if (lob === "AUTO") {
            if (cytdPif !== null) result.travelers_auto_pif = cytdPif
            if (ytdRet !== null)  result.travelers_auto_retention = ytdRet
            if (ytdLr !== null)   result.travelers_auto_lr = ytdLr
          } else if (lob === "HOME") {
            if (cytdPif !== null) result.travelers_home_pif = cytdPif
            if (ytdRet !== null)  result.travelers_home_retention = ytdRet
            if (ytdLr !== null)   result.travelers_home_lr = ytdLr
          }
        }
        break
      }

      case "wp": {
        // Row: AUTO $14 $39 $10 $16 $7 $7 $17 $29 $28 $27 $5 $3 $18  $21 $20 5.5% $206 $233
        // Months: 13 values, then YTD, PYTD, %Var, YE2025, YE2024
        // We want: YE2025 = nums[nums.length - 2]  (in $000s already)
        // YTD WP  = nums[13]  (13th 0-based = 14th value)
        if (nums.length >= 16) {
          const ytdWp     = nums[13]   // YTD ($000s)
          const annualWp  = nums[nums.length - 2] // YE 2025 ($000s)
          if (lob === "AUTO") {
            result.travelers_auto_wp = annualWp  // use annual
          } else if (lob === "HOME") {
            result.travelers_home_wp = annualWp
          }
          void ytdWp
        }
        break
      }

      case "pif": {
        // Row: AUTO 80 81 81 79 ... 74 71 75  75 80 (6.2%) 74 79
        // 13 monthly values + YTD + PYTD + %Var + YE2025 + YE2024
        // YTD PIF = nums[13], YE2025 = nums[nums.length - 2]
        if (nums.length >= 15) {
          const currentPif = nums[13]  // YTD (current)
          if (lob === "AUTO") {
            result.travelers_auto_pif = currentPif
          } else if (lob === "HOME") {
            result.travelers_home_pif = currentPif
          }
        }
        break
      }

      case "nb": {
        // Booked New Business — YTD = nums[13]
        if (nums.length >= 14) {
          const ytdNb = nums[13]
          if (lob === "TOTAL" && !result.travelers_nb_premium) {
            result.travelers_nb_premium = ytdNb
          }
        }
        break
      }

      default:
        break
    }
  }

  // If actuals table gave us PIF, prefer pif section values (more explicit)
  // (already handled by section priority — actuals runs first, pif overwrites)

  return result
}

// =====================================================
// Tokeniser that keeps parenthetical groups as one token
// e.g. "(43.4%)" stays as one token instead of three
// =====================================================
function parseAccountingTokens(s: string): string[] {
  const out: string[] = []
  let buf = ""
  let depth = 0
  for (const ch of s) {
    if (ch === "(" ) { depth++; buf += ch }
    else if (ch === ")") { depth--; buf += ch; if (depth === 0) { out.push(buf); buf = "" } }
    else if (/\s/.test(ch) && depth === 0) {
      if (buf) { out.push(buf); buf = "" }
    } else {
      buf += ch
    }
  }
  if (buf) out.push(buf)
  return out.filter(Boolean)
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

    const getNum = (): number | null => {
      const v = numTokens(line)[0] ?? null
      if (v !== null) return v
      return numTokens(lines[i + 1] ?? "")[0] ?? null
    }

    if (/written\s*premium|^wp\b/.test(n)) {
      const v = getNum()
      if (v !== null) {
        if (lob === "pl") result.prog_pl_premium = v
        else if (lob === "cl") result.prog_cl_premium = v
        else if (!result.prog_pl_premium) result.prog_pl_premium = v
      }
    }

    if (/policies?\s*in\s*force|\bpif\b/.test(n)) {
      const v = getNum()
      if (v !== null) {
        if (lob === "pl") result.prog_pl_pif = v
        else if (lob === "cl") result.prog_cl_pif = v
        else if (!result.prog_pl_pif) result.prog_pl_pif = v
      }
    }

    if (/loss\s*ratio|l\/r|\blr\b/.test(n)) {
      const v = getNum()
      if (v !== null) {
        if (lob === "pl") result.prog_pl_loss_ratio = v
        else if (lob === "cl") result.prog_cl_loss_ratio = v
        else if (!result.prog_pl_loss_ratio) result.prog_pl_loss_ratio = v
      }
    }

    if (/bundle\s*rate|bundled|multi.?policy/.test(n)) {
      const v = getNum()
      if (v !== null) result.prog_bundle_rate = v
    }

    if (/ytd\s*(?:new\s*)?app|new\s*business\s*(?:app|count)/.test(n)) {
      const v = getNum()
      if (v !== null) result.prog_ytd_apps = v
    }
  }

  return result
}
