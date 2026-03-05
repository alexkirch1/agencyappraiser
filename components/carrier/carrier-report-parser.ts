// =====================================================
// Carrier Report PDF Parser — Travelers & Progressive
// =====================================================
// Strategy: extract text preserving row structure, then
// scan line by line for known label patterns. This is
// far more robust than single-regex full-text matching
// because pdfjs outputs items in visual/column order.
// =====================================================

import type { CarrierInputs, CarrierName } from "./carrier-engine"

// Strip $, commas, %, leading/trailing whitespace and parse float
function num(s: string | undefined | null): number | null {
  if (!s) return null
  const cleaned = s.replace(/[$,%()\s]/g, "")
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

// Find the first number-like token in a string
function firstNumber(s: string): number | null {
  const m = s.match(/([\d,]+(?:\.\d+)?)/)
  return m ? num(m[1]) : null
}

// Find the first percentage-like token (e.g. "42.5" or "42.5%")
function firstPercent(s: string): number | null {
  const m = s.match(/([\d]+(?:\.\d+)?)\s*%/)
  if (m) return num(m[1])
  // also accept bare decimals that look like a ratio (< 200)
  const m2 = s.match(/([\d]+\.\d+)/)
  if (m2) {
    const v = parseFloat(m2[1])
    return v < 200 ? v : null
  }
  return null
}

// Normalise a string for label comparison — lowercase, collapse spaces
function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim()
}

export function parseCarrierReport(
  text: string,
  carrier: CarrierName
): Partial<CarrierInputs> {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  console.log("[v0] Parser got", lines.length, "lines for carrier:", carrier)
  console.log("[v0] First 40 lines:", lines.slice(0, 40))

  switch (carrier) {
    case "progressive":
      return parseProgressive(lines)
    case "travelers":
      return parseTravelers(lines, text)
    default:
      return {}
  }
}

// =====================================================
// TRAVELERS — Agency Results Report
// =====================================================
// Travelers reports are tabular. The left column has the
// label, the right column(s) have values. Because pdfjs
// extracts by row, a line might look like:
//   "Written Premium 1,234,567"  — label + value on same line
// OR the label and value end up on adjacent lines if the
// columns are widely spaced.
//
// We use two passes:
//   1. Same-line: does this line contain a known label AND a number?
//   2. Next-line: does the NEXT line contain a bare number?
// =====================================================
function parseTravelers(lines: string[], fullText: string): Partial<CarrierInputs> {
  const result: Partial<CarrierInputs> = {}

  // Track which LOB context we're in as we scan lines
  type Lob = "auto" | "home" | null
  let lob: Lob = null

  // Helper: convert raw WP value — Travelers sometimes reports in $000s
  const wpVal = (v: number | null): number | null => {
    if (v === null) return null
    // If value looks like thousands denomination (< 10,000 but plausible as $k)
    // leave as-is; if it's clearly full dollars (> 50,000) convert to $k
    return v > 50_000 ? Math.round(v / 1_000) : v
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const n = norm(line)
    const next = lines[i + 1] ? norm(lines[i + 1]) : ""

    // ---- Detect LOB section ----
    if (/\b(auto(mobile)?|private passenger)\b/.test(n) && !/homeowner|home owner/.test(n)) {
      lob = "auto"
      console.log("[v0] Travelers: switched to AUTO at line", i, ":", line)
    } else if (/\b(home(owner)?s?|ho|property)\b/.test(n) && !/auto/.test(n)) {
      lob = "home"
      console.log("[v0] Travelers: switched to HOME at line", i, ":", line)
    }

    // ---- Written Premium ----
    if (/written\s*premium|direct\s*written|^wp\b/.test(n)) {
      const v = firstNumber(line) ?? firstNumber(lines[i + 1] ?? "")
      if (v !== null) {
        const converted = wpVal(v)
        if (lob === "auto") { result.travelers_auto_wp = converted; console.log("[v0] T: auto WP =", converted) }
        else if (lob === "home") { result.travelers_home_wp = converted; console.log("[v0] T: home WP =", converted) }
      }
    }

    // ---- Earned Premium (fallback for WP) ----
    if (/earned\s*premium/.test(n) && !result.travelers_auto_wp && !result.travelers_home_wp) {
      const v = firstNumber(line) ?? firstNumber(lines[i + 1] ?? "")
      if (v !== null) {
        const converted = wpVal(v)
        if (lob === "auto") result.travelers_auto_wp = converted
        else if (lob === "home") result.travelers_home_wp = converted
      }
    }

    // ---- Loss Ratio ----
    if (/loss\s*ratio|l\/r|\blr\b/.test(n)) {
      const v = firstPercent(line) ?? firstPercent(lines[i + 1] ?? "")
      if (v !== null) {
        if (lob === "auto") { result.travelers_auto_lr = v; console.log("[v0] T: auto LR =", v) }
        else if (lob === "home") { result.travelers_home_lr = v; console.log("[v0] T: home LR =", v) }
        else {
          // No LOB context yet — assign to both as fallback
          if (!result.travelers_auto_lr) result.travelers_auto_lr = v
          else if (!result.travelers_home_lr) result.travelers_home_lr = v
        }
      }
    }

    // ---- Retention ----
    if (/\bretention\b/.test(n)) {
      const v = firstPercent(line) ?? firstPercent(lines[i + 1] ?? "")
      if (v !== null) {
        if (lob === "auto") { result.travelers_auto_retention = v; console.log("[v0] T: auto ret =", v) }
        else if (lob === "home") { result.travelers_home_retention = v; console.log("[v0] T: home ret =", v) }
        else {
          if (!result.travelers_auto_retention) result.travelers_auto_retention = v
          else if (!result.travelers_home_retention) result.travelers_home_retention = v
        }
      }
    }

    // ---- PIF / Policies in Force ----
    if (/policies?\s*in\s*force|\bpif\b|policy\s*count/.test(n)) {
      const v = firstNumber(line) ?? firstNumber(lines[i + 1] ?? "")
      if (v !== null) {
        if (lob === "auto") { result.travelers_auto_pif = v; console.log("[v0] T: auto PIF =", v) }
        else if (lob === "home") { result.travelers_home_pif = v; console.log("[v0] T: home PIF =", v) }
      }
    }

    // ---- New Business Premium ----
    if (/new\s*business|new\s*written/.test(n)) {
      const v = firstNumber(line) ?? firstNumber(lines[i + 1] ?? "")
      if (v !== null) {
        if (!result.travelers_nb_premium) {
          result.travelers_nb_premium = wpVal(v)
          console.log("[v0] T: NB premium =", result.travelers_nb_premium)
        }
      }
    }

    // ---- Combined ratio ----
    if (/combined\s*ratio/.test(n)) {
      const v = firstPercent(line) ?? firstPercent(lines[i + 1] ?? "")
      if (v !== null && !result.travelers_combined_ratio) {
        result.travelers_combined_ratio = v
        console.log("[v0] T: combined ratio =", v)
      }
    }

    void next // suppress unused warning
  }

  // ---- Fallback: if no LOB detected, try full-text patterns ----
  if (!result.travelers_auto_wp) {
    const m = fullText.match(/auto(?:mobile)?\s*(?:written\s*)?(?:premium|wp)[:\s$]*([\d,]+)/i)
    if (m) result.travelers_auto_wp = wpVal(num(m[1]))
  }
  if (!result.travelers_home_wp) {
    const m = fullText.match(/home(?:owner)?s?\s*(?:written\s*)?(?:premium|wp)[:\s$]*([\d,]+)/i)
    if (m) result.travelers_home_wp = wpVal(num(m[1]))
  }

  console.log("[v0] Travelers parsed result:", result)
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
    const n = norm(line)

    // ---- LOB context ----
    if (/personal\s*lines?|^pl\b|personal\s*auto/.test(n) && !/commercial/.test(n)) lob = "pl"
    else if (/commercial\s*lines?|^cl\b|commercial\s*auto/.test(n)) lob = "cl"

    // ---- Written Premium ----
    if (/written\s*premium|^wp\b/.test(n)) {
      const v = firstNumber(line) ?? firstNumber(lines[i + 1] ?? "")
      if (v !== null) {
        if (lob === "pl") result.prog_pl_premium = v
        else if (lob === "cl") result.prog_cl_premium = v
        else if (!result.prog_pl_premium) result.prog_pl_premium = v
      }
    }

    // ---- PIF ----
    if (/policies?\s*in\s*force|\bpif\b/.test(n)) {
      const v = firstNumber(line) ?? firstNumber(lines[i + 1] ?? "")
      if (v !== null) {
        if (lob === "pl") result.prog_pl_pif = v
        else if (lob === "cl") result.prog_cl_pif = v
        else if (!result.prog_pl_pif) result.prog_pl_pif = v
      }
    }

    // ---- Loss Ratio ----
    if (/loss\s*ratio|l\/r|\blr\b/.test(n)) {
      const v = firstPercent(line) ?? firstPercent(lines[i + 1] ?? "")
      if (v !== null) {
        if (lob === "pl") result.prog_pl_loss_ratio = v
        else if (lob === "cl") result.prog_cl_loss_ratio = v
        else if (!result.prog_pl_loss_ratio) result.prog_pl_loss_ratio = v
      }
    }

    // ---- Bundle Rate ----
    if (/bundle\s*rate|bundled|multi.?policy/.test(n)) {
      const v = firstPercent(line) ?? firstPercent(lines[i + 1] ?? "")
      if (v !== null) result.prog_bundle_rate = v
    }

    // ---- YTD Apps ----
    if (/ytd\s*(?:new\s*)?app|new\s*business\s*(?:app|count)/.test(n)) {
      const v = firstNumber(line) ?? firstNumber(lines[i + 1] ?? "")
      if (v !== null) result.prog_ytd_apps = v
    }
  }

  console.log("[v0] Progressive parsed result:", result)
  return result
}
