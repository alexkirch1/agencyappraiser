// =====================================================
// Carrier Report PDF Parser — Travelers & Progressive
// =====================================================
// Built against the ACTUAL pdfjs-extracted text from
// a real Travelers PI Production Report (Feb 2026).
//
// Extracted line format (single page, Y-sorted rows):
//   Section headers appear on their own lines.
//   Data rows: "LOB val1 val2 ... valN"
// =====================================================

import type { CarrierInputs, CarrierName } from "./carrier-engine"

/** Strip $, commas, %, spaces; handle (neg) accounting notation */
function num(s: string | undefined | null): number | null {
  if (!s) return null
  const neg = /^\(.*\)$/.test(s.trim())
  const cleaned = s.replace(/[$,%\s]/g, "").replace(/[()]/g, "")
  const n = parseFloat(cleaned)
  if (isNaN(n)) return null
  return neg ? -n : n
}

/** Split line on whitespace */
function tok(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean)
}

/**
 * Tokenise a string keeping parenthetical groups (incl. spaces inside) as one token.
 * e.g. "(0.7%)" → ["(0.7%)"], "0.4 pts" → ["0.4","pts"], "(131.0 pts)" → ["(131.0 pts)"]
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

/** Parse all numeric values from a line, in order */
function nums(line: string): number[] {
  return tok(line).map(t => num(t)).filter((v): v is number => v !== null)
}

export function parseCarrierReport(
  text: string,
  carrier: CarrierName
): Partial<CarrierInputs> {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  if (carrier === "travelers") return parseTravelers(lines)
  if (carrier === "progressive") return parseProgressive(lines)
  return {}
}

// =====================================================
// TRAVELERS
// =====================================================
//
// Actual to Prior Year table row (after stripping LOB label):
//   PYTD_Q CYTD_Q Var_Q %Var_Q  PYTD_NB CYTD_NB Var_NB %Var_NB
//   PYE_PIF CYTD_PIF Var_PIF %Var_PIF
//   PYE_Ret YTD_Ret Var_Ret(pts) [pts]
//   PYTD_LR YTD_LR Var_LR(pts)
//
// From the real report (AUTO row after label stripped):
//   143 81 (62) (43.4%)  3 4 1 33.3%  74 75 1 1.4%  77.2% 76.2% (1.0 pts) [pts omitted - inside paren]  239.5% (60.4%) (300.0 pts)
// accountingTok gives:
//   idx 0:143  1:81  2:(62)  3:(43.4%)  4:3  5:4  6:1  7:33.3%
//   idx 8:74   9:75  10:1   11:1.4%    12:77.2%  13:76.2%  14:(1.0 pts)
//   idx 15:239.5%  16:(60.4%)  17:(300.0 pts)
// So: CYTD_PIF=idx9, YTD_Retention=idx12 (PYE), CYTD_Retention=idx13 (YTD actual)
//
// Wait — column headers say: PYE | YTD | Variance | PYTD | YTD | to PY
// So for Retention: PYE_Ret=idx12, YTD_Ret=idx13
// The YTD (current year) retention = idx13
//
// WP (,000) row:
//   AUTO $14 $39 $10 $16 $7 $7 $17 $29 $28 $27 $5 $3 $18  $21 $20 5.5% $206 $233
//   13 months(0-12) | YTD(13) | PYTD(14) | %Var(15) | YE2025(16) | YE2024(17)
//   Annual WP = nums[16]  (in $000s)
//
// PIF Count row:
//   AUTO 80 81 81 79 77 77 78 77 77 75 74 71 75  75 80 (6.2%) 74 79
//   13 months(0-12) | YTD(13) | PYTD(14) | %Var(15) | YE2025(16) | YE2024(17)
//   Current PIF = nums[13]
// =====================================================

type TravSection = "actuals" | "wp" | "pif" | "nb" | "quotes" | "sales" | null

function parseTravelers(lines: string[]): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}
  let section: TravSection = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // ---- Detect section headers ----
    if (/actual\s*to\s*prior\s*year/i.test(line))          { section = "actuals"; continue }
    if (/^wp\s*\(|^written\s*prem/i.test(line))            { section = "wp";      continue }
    if (/^pif\s*count|^policies?\s*in\s*force\s*count/i.test(line)) { section = "pif"; continue }
    if (/^booked\s*nb|^new\s*business\b/i.test(line))      { section = "nb";      continue }
    if (/^quotes\s*$/i.test(line))                         { section = "quotes";  continue }
    if (/^sales\s*ratio/i.test(line))                      { section = "sales";   continue }
    // Skip the 13-month header row
    if (/^13\s*month|^feb\s*2\d{3}\s*mar/i.test(line))     { continue }

    // ---- Only process LOB data rows ----
    const lobMatch = line.match(/^(AUTO|HOME|OTHER|TOTAL)\b/i)
    if (!lobMatch) continue

    const lob = lobMatch[1].toUpperCase() as "AUTO" | "HOME" | "OTHER" | "TOTAL"
    // Data portion after the LOB label
    const rest = line.slice(lobMatch[0].length).trim()

    if (section === "actuals") {
      // Use accounting tokeniser to keep (neg) groups together
      const t = accountingTok(rest)
      // idx: 0=PYTD_Q 1=CYTD_Q 2=Var_Q 3=%VarQ
      //      4=PYTD_NB 5=CYTD_NB 6=Var_NB 7=%VarNB
      //      8=PYE_PIF 9=CYTD_PIF 10=Var_PIF 11=%VarPIF
      //      12=PYE_Ret 13=YTD_Ret 14=Var_Ret
      //      15=PYTD_LR 16=YTD_LR 17=Var_LR
      if (t.length >= 14) {
        const cytdPif = num(t[9])
        const ytdRet  = num(t[13])  // current year YTD retention %
        const pytdLr  = t.length >= 16 ? num(t[15]) : null
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

    else if (section === "wp") {
      // Strip $ signs then parse numbers
      const n = nums(rest)
      // Need at least 17 values (13 months + YTD + PYTD + %Var + YE2025 + YE2024)
      // but %Var may be negative: (0.7%) → still 1 token in our nums() function
      // All dollar values are in $000s
      if (n.length >= 16) {
        const annualWp = n[n.length - 2]  // second-to-last = YE2025
        if (lob === "AUTO") result.travelers_auto_wp = annualWp
        else if (lob === "HOME") result.travelers_home_wp = annualWp
      }
    }

    else if (section === "pif") {
      const n = nums(rest)
      // 13 months(0-12) + YTD(13) + PYTD(14) + %Var(15) + YE2025(16) + YE2024(17)
      if (n.length >= 14) {
        const currentPif = n[13]
        if (lob === "AUTO") result.travelers_auto_pif = currentPif
        else if (lob === "HOME") result.travelers_home_pif = currentPif
      }
    }

    else if (section === "nb") {
      const n = nums(rest)
      // 13 months + YTD(13) + PYTD(14) + %Var(15) + Annual2025(16) + Annual2024(17)
      if (n.length >= 14 && lob === "TOTAL") {
        result.travelers_nb_premium = n[16] ?? n[13]
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
