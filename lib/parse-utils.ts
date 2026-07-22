/**
 * Shared parsing utilities used across the site for commission statements,
 * policy lists, and carrier reports.
 */

// ----- Currency / number cleaning -----
export function cleanNum(val: unknown): number {
  if (typeof val === "number") return val
  let s = String(val || "").trim()
  if (!s) return 0
  let isNeg = false
  if (s.includes("(") && s.includes(")")) isNeg = true
  if (s.endsWith("-") || s.endsWith("CR")) isNeg = true
  if (s.startsWith("-")) isNeg = true
  s = s.replace(/\s+/g, "").replace(/[^0-9.]/g, "")
  const num = parseFloat(s)
  if (isNaN(num)) return 0
  if (num > 500000) return 0
  return isNeg ? -num : num
}

// ----- Policy number normalization -----
// Handles policy numbers that may contain spaces, dashes, or dots.
// Examples: "BOP 1234567" → "BOP1234567", "CPP-001234" → "CPP001234",
//           "00987654" → "987654"
export function normalizePolicy(val: unknown): string {
  let s = String(val || "").trim().toUpperCase()
  // Strip everything except letters, digits
  s = s.replace(/[^A-Z0-9]/g, "")
  // Only strip leading zeros on pure-digit strings (so "00987654" → "987654")
  // but keep "CPP0012345" intact
  if (/^\d+$/.test(s)) {
    s = s.replace(/^0+/, "") || "0"
  }
  return s
}

/**
 * Try to merge adjacent words that together form a policy number.
 * Common patterns:
 *   "BOP 1234567"  → "BOP1234567"
 *   "HO 12345"     → "HO12345"
 *   "CPP 001234"   → "CPP001234"
 *   "BA 12 345 67" → "BA1234567" (multiple fragments)
 *
 * Returns a new list of words where policy-number fragments are merged.
 */
function mergeSpacedPolicyTokens(words: string[]): string[] {
  if (words.length < 2) return words

  const result: string[] = []
  let i = 0

  while (i < words.length) {
    const cur = words[i].replace(/^[.,\-:()]+|[.,\-:()]+$/g, "")

    // Check if current word is 1-4 letters (potential policy prefix)
    if (/^[A-Za-z]{1,4}$/.test(cur) && i + 1 < words.length) {
      const next = words[i + 1].replace(/^[.,\-:()]+|[.,\-:()]+$/g, "")
      // Next word starts with or is all digits
      if (/^\d/.test(next)) {
        // This looks like "BOP 1234567" -- merge them
        let merged = cur + next
        let j = i + 2
        // Keep merging if more digit-only fragments follow
        while (j < words.length) {
          const frag = words[j].replace(/^[.,\-:()]+|[.,\-:()]+$/g, "")
          if (/^\d+$/.test(frag) && frag.length <= 4) {
            merged += frag
            j++
          } else {
            break
          }
        }
        result.push(merged)
        i = j
        continue
      }
    }

    // Check if current word is digits and next word is also digits (fragmented number)
    // e.g. "12 345 67" → "1234567" -- but only if surrounded by a letter prefix we already merged,
    // or if the total looks like a policy number
    result.push(words[i])
    i++
  }

  return result
}

export function formatCurrency(num: number): string {
  return "$" + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ----- Date extraction from filenames -----
export function extractDateFromFilename(filename: string): string | null {
  const match = filename.match(
    /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-_]*20[2-3]\d|20[2-3]\d[\s\-_]*(?:0[1-9]|1[0-2])/i
  )
  if (match) {
    const d = new Date(match[0])
    if (!isNaN(d.getTime())) {
      const y = d.getUTCFullYear()
      const m = d.getUTCMonth() + 1
      return `${y}-${String(m).padStart(2, "0")}`
    }
  }
  const yearFirst = filename.match(/(20[2-3]\d)[.\-_](0[1-9]|1[0-2])/)
  if (yearFirst) return `${yearFirst[1]}-${yearFirst[2]}`
  const simpleMatch = filename.match(/(0[1-9]|1[0-2])[.\-_](20[2-3]\d)/)
  if (simpleMatch) return `${simpleMatch[2]}-${simpleMatch[1]}`
  return null
}

// ----- Parse confidence scoring -----
export type ConfidenceLevel = "high" | "medium" | "low"

export interface ParseConfidence {
  level: ConfidenceLevel
  score: number        // 0-100
  reasons: string[]
}

/**
 * Words that are definitely NOT client names -- only the most unambiguous ones.
 * Keeps the list tight to avoid rejecting real surnames like West, Bond, Long, etc.
 */
const DEFINITE_NON_NAME = new Set([
  // Transaction / status codes
  "new", "renewal", "renew", "rewrite", "cancel", "cancellation", "endorsement",
  "reinstatement", "audit", "flat", "return", "nb", "ren", "rwrt", "canc",
  // Industry jargon that is never a person's name
  "premium", "commission", "subtotal", "total", "balance", "payment",
  "effective", "expiration", "inception",
  // Role titles
  "producer", "agent", "csr",
])

/**
 * Check if a token could plausibly be part of a client name.
 * We only reject tokens that are definitely NOT names -- we err on the side
 * of inclusion to avoid stripping real client names.
 */
function isLikelyNameWord(token: string): boolean {
  const clean = token.replace(/[.,\-:;()"']/g, "").trim()
  if (clean.length < 2) return false
  if (/\d/.test(clean)) return false
  if (DEFINITE_NON_NAME.has(clean.toLowerCase())) return false
  // All-caps single-letter abbreviations like "A" "B" -- skip
  if (clean.length === 1) return false
  return true
}

/**
 * Detect if a token is likely a policy number.
 * Insurance policy numbers are typically:
 * - 6-15 chars long
 * - Mix of letters and digits (e.g., "HO3456789", "CPP0012345")
 * - Or pure digits 5+ long (e.g., "9876543")
 * - Sometimes have dashes or spaces (stripped by normalization)
 *
 * NOT a policy number:
 * - Dates (01/15/2024)
 * - Percentages (15%)
 * - Pure 1-3 digit numbers (ages, counts)
 * - Common words
 */
export function isLikelyPolicyNumber(token: string): { likely: boolean; confidence: number } {
  const tClean = token.replace(/^[.,\-:()]+|[.,\-:()]+$/g, "")
  if (!tClean || tClean.length < 3) return { likely: false, confidence: 0 }

  const hasDigit = /\d/.test(tClean)
  const hasLetter = /[a-zA-Z]/.test(tClean)

  // Skip dates  (e.g. 01/15/2024, 2024-01-15, 1/5/24)
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(tClean)) return { likely: false, confidence: 0 }
  if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(tClean)) return { likely: false, confidence: 0 }
  // Skip percentages
  if (/^\d+\.?\d*%$/.test(tClean)) return { likely: false, confidence: 0 }
  // Skip very short pure numbers (1-3 digits only -- ages, counts, page numbers)
  if (/^\d{1,3}$/.test(tClean)) return { likely: false, confidence: 0 }
  // Skip 4-digit numbers that look like years (19xx, 20xx)
  if (/^(19|20)\d{2}$/.test(tClean)) return { likely: false, confidence: 0 }

  if (!hasDigit) return { likely: false, confidence: 0 }

  let conf = 40

  // Mixed alphanumeric = very likely a policy number
  if (hasLetter && hasDigit) conf += 30

  // Pure digits: 4 digits okay (lower conf), 5+ digits = strong signal
  if (!hasLetter && /^\d{4}$/.test(tClean)) conf += 15   // 4-digit pure number (not year)
  if (!hasLetter && tClean.length >= 5) conf += 25        // 5+ digit pure number
  if (!hasLetter && tClean.length >= 7) conf += 10        // 7+ digit pure number = very strong

  // Longer = more confident
  if (tClean.length >= 6) conf += 5
  if (tClean.length >= 8) conf += 5
  if (tClean.length >= 10) conf += 5

  // Starts with 1-4 letters then digits = common policy format (e.g., BOP1234567, HO12345)
  if (/^[A-Za-z]{1,4}\d+/.test(tClean)) conf += 15

  // Contains a dash in the original token (common in policy numbers like "CPP-001234")
  if (token.includes("-") && hasDigit) conf += 5

  return { likely: conf >= 50, confidence: Math.min(conf, 100) }
}

/**
 * Score confidence of a parsed commission row.
 */
export function scoreCommissionRow(row: {
  policy_number: string
  commission: number
  premium: number
  client_name: string
  raw_line: string
  policyConfidence: number
}): ParseConfidence {
  const reasons: string[] = []
  let score = 50 // Base score

  // Policy number quality
  if (row.policyConfidence >= 80) {
    score += 20
    reasons.push("Strong policy number match")
  } else if (row.policyConfidence >= 60) {
    score += 10
    reasons.push("Moderate policy number confidence")
  } else {
    score -= 10
    reasons.push("Weak policy number detection")
  }

  // Commission amount sanity
  const absComm = Math.abs(row.commission)
  if (absComm >= 1 && absComm <= 50000) {
    score += 10
    reasons.push("Commission in typical range")
  } else if (absComm < 1) {
    score -= 15
    reasons.push("Very small commission amount")
  }

  // Premium present and reasonable
  if (row.premium > 0 && row.premium > absComm) {
    score += 10
    reasons.push("Premium > commission (normal)")
  } else if (row.premium > 0 && row.premium < absComm) {
    score -= 5
    reasons.push("Premium < commission (unusual)")
  }

  // Client name quality
  if (row.client_name && row.client_name.split(" ").length >= 2) {
    score += 5
    reasons.push("Multi-word client name")
  } else if (!row.client_name) {
    score -= 5
    reasons.push("No client name found")
  }

  // Clamp
  score = Math.max(0, Math.min(100, score))

  const level: ConfidenceLevel = score >= 70 ? "high" : score >= 45 ? "medium" : "low"
  return { level, score, reasons }
}

/**
 * Score confidence for a policy list parse.
 */
export function scorePolicyParse(opts: {
  totalRows: number
  mappedColumns: number
  totalPossibleColumns: number
  hasPolicyCol: boolean
  hasPremiumCol: boolean
}): ParseConfidence {
  const reasons: string[] = []
  let score = 40

  if (opts.hasPolicyCol) {
    score += 25
    reasons.push("Policy column detected")
  } else {
    score -= 20
    reasons.push("No policy column found")
  }

  if (opts.hasPremiumCol) {
    score += 15
    reasons.push("Premium column detected")
  }

  const colRatio = opts.mappedColumns / opts.totalPossibleColumns
  if (colRatio > 0.6) {
    score += 15
    reasons.push(`${opts.mappedColumns}/${opts.totalPossibleColumns} columns mapped`)
  } else if (colRatio > 0.3) {
    score += 5
    reasons.push(`${opts.mappedColumns}/${opts.totalPossibleColumns} columns mapped`)
  }

  if (opts.totalRows > 10) {
    score += 5
    reasons.push(`${opts.totalRows} rows parsed`)
  }

  score = Math.max(0, Math.min(100, score))
  const level: ConfidenceLevel = score >= 70 ? "high" : score >= 45 ? "medium" : "low"
  return { level, score, reasons }
}

// ─── Statement-level format context ─────────────────────────────────────────
// Exported so horizon-tab.tsx can set it once per file and clear after.
// "unknown" = fall back to generic heuristic.
export type CommStatementFormat = "horizon_a" | "horizon_b" | "generic"
let _currentStatementFormat: CommStatementFormat = "generic"

/** Call once when you detect the statement format for the current file. */
export function setCommStatementFormat(fmt: CommStatementFormat): void {
  _currentStatementFormat = fmt
}
/** Call after finishing a file to reset to safe default. */
export function resetCommStatementFormat(): void {
  _currentStatementFormat = "generic"
}

/**
 * Detect the Horizon EZLynx statement format from the first ~30 lines of text.
 *
 * FORMAT A — "Commissions By Producer" (older layout)
 *   Columns (L→R): Producer  Customer  Carrier  Policy  LOB  TRX  WrittenPrem  TotalComm  SplitComm  Payee
 *
 * FORMAT B — "Commission Detail" (newer layout)
 *   Columns (L→R): Producer  Customer  Carrier  Policy  LOB(optional)  TRX  EffDate  WrittenPrem  TotalComm  SplitComm
 *
 * For both formats the column order for money is:  [WrittenPrem, TotalComm, SplitComm]
 * The SPLIT COMMISSION is what we want as `commission` (what the agent actually earns).
 */
export function detectCommStatementFormat(text: string): CommStatementFormat {
  const lines = text.split("\n").slice(0, 30)
  for (const line of lines) {
    if (/commissions?\s+by\s+producer/i.test(line)) return "horizon_a"
    if (/commission\s+detail/i.test(line))            return "horizon_b"
    // Column header fingerprints
    if (/lob\s+code.*transaction\s+type.*premium\s*[-–]\s*written/i.test(line)) return "horizon_a"
    if (/lob.*trx.*eff.*date.*premium/i.test(line))   return "horizon_b"
    if (/split\s+comm/i.test(line))                   return "horizon_a" // both have "Split Comm" header
  }
  return "generic"
}

/**
 * Parse a single PDF text row and extract commission data.
 *
 * Supports three layouts:
 *
 *  horizon_a / horizon_b — Horizon EZLynx reports with 3 money columns:
 *    [Written Premium]  [Total Commission]  [Split Commission]
 *    We use Split Commission as `commission` and Written Premium as `premium`.
 *    Double-check: splitComm < totalComm < writtenPrem (with tolerance for
 *    unusual splits / carrier overrides).
 *
 *  generic — fall back to: last money = commission, first money = premium.
 *
 * Also extracts carrier, LOB, trans_type, and producer from Horizon rows
 * by recognising known carrier keywords and short-code patterns.
 *
 * Returns null if the row doesn't contain usable commission data.
 */
export function parsePdfCommissionRow(
  lineStr: string,
  pageNum: number,
  fileDate: string,
  fileName: string
): (Omit<CommissionRow, "id"> & { policyConfidence: number }) | null {
  if (lineStr.length < 10) return null

  // --- Skip headers, totals, footers ---
  const lower = lineStr.toLowerCase()
  if (
    (lower.includes("page ") && lower.includes(" of ")) ||
    lower.includes("statement date") ||
    (lower.includes("commission") && lower.includes("policy") && lower.includes("premium")) ||
    /^(total|subtotal|grand total|sum|net total)/i.test(lineStr.trim()) ||
    (lower.startsWith("report") && lower.includes("date")) ||
    /^\s*[-=]{3,}\s*$/.test(lineStr) ||
    // Horizon-specific header / footer lines
    /^producer\s+account/i.test(lineStr.trim()) ||
    /filter\s+values/i.test(lineStr) ||
    /trx\s+type\s+key/i.test(lineStr)
  ) return null

  // --- 1. Find money amounts (L→R order) ---
  const moneyPattern = /\(?\$?\s*(\d{1,3}(?:[,]\d{3})*|\d+)\.\d{2}\s*\)?/gi
  const moneyMatches = [...lineStr.matchAll(moneyPattern)]
  const moneyCandidates = moneyMatches
    .map((match) => ({
      val: cleanNum(match[0]),
      raw: match[0],
      abs: Math.abs(cleanNum(match[0])),
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    }))
    .filter((m) => m.val !== 0 && m.abs < 500_000 && m.abs >= 0.01)

  if (moneyCandidates.length === 0) return null

  // Sort left to right
  const sorted = [...moneyCandidates].sort((a, b) => a.start - b.start)

  let commAmount = sorted[sorted.length - 1]
  let premAmount: typeof sorted[0] | null = null

  const fmt = _currentStatementFormat

  if ((fmt === "horizon_a" || fmt === "horizon_b") && sorted.length >= 3) {
    // Horizon layout: [WrittenPrem, TotalComm, SplitComm]
    // Take last 3 money values. SplitComm = last, WrittenPrem = first of the three.
    const last3 = sorted.slice(-3)
    const writtenPrem  = last3[0]
    const totalComm    = last3[1]
    const splitComm    = last3[2]

    // Sanity check: splitComm ≤ totalComm ≤ writtenPrem (allow some slack for overrides)
    const looksValid =
      splitComm.abs <= totalComm.abs * 1.05 &&
      totalComm.abs <= writtenPrem.abs * 1.05

    if (looksValid) {
      commAmount = splitComm
      premAmount = writtenPrem
    } else if (sorted.length >= 2) {
      // Fallback: last = comm, first = prem
      commAmount = sorted[sorted.length - 1]
      premAmount = sorted[0]
    }
  } else if ((fmt === "horizon_a" || fmt === "horizon_b") && sorted.length === 2) {
    // Only TotalComm and SplitComm present (no written prem on this row) —
    // use the smaller as split comm
    const [a, b] = sorted
    commAmount = a.abs <= b.abs ? a : b
    premAmount = a.abs <= b.abs ? b : a
  } else {
    // Generic: last amount = commission, first = premium (when 2+)
    commAmount = sorted[sorted.length - 1]
    if (sorted.length >= 2) {
      premAmount = sorted[0]
      // Sanity: if the supposed commission is >3x the supposed premium, swap
      if (commAmount.abs > premAmount.abs * 3 && premAmount.abs > 0) {
        const temp = commAmount; commAmount = premAmount; premAmount = temp
      }
    }
  }

  // Build a "used positions" map to blank out money from the line
  const usedRanges: [number, number][] = moneyCandidates.map(m => [m.start, m.end])

  // --- 2. Blank out money, then split into whitespace-separated segments ---
  let workLine = lineStr
  // Replace money spans with spaces (preserve positions)
  for (const [s, e] of usedRanges) {
    workLine = workLine.substring(0, s) + " ".repeat(e - s) + workLine.substring(e)
  }

  // Split into segments by 2+ spaces or tabs (preserves multi-word groups)
  const segments = workLine
    .split(/\s{2,}|\t/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  // --- 3. First pass: merge spaced policy tokens, then find ALL candidates ---
  type PolCandidate = {
    normalized: string
    confidence: number
    segIndex: number
    wordIndex: number
    /** How many original words this candidate consumed (1 for normal, 2+ for merged) */
    wordSpan: number
  }
  const polCandidates: PolCandidate[] = []

  // Pre-process: for each segment, merge spaced policy tokens
  const mergedSegments: { original: string; mergedWords: string[]; originalWords: string[] }[] = []
  for (let si = 0; si < segments.length; si++) {
    const originalWords = segments[si].split(/\s+/)
    const mergedWords = mergeSpacedPolicyTokens(originalWords)
    mergedSegments.push({ original: segments[si], mergedWords, originalWords })
  }

  for (let si = 0; si < mergedSegments.length; si++) {
    const { mergedWords } = mergedSegments[si]
    for (let wi = 0; wi < mergedWords.length; wi++) {
      const wClean = mergedWords[wi].replace(/^[.,\-:()]+|[.,\-:()]+$/g, "")
      if (!wClean) continue
      const { likely, confidence } = isLikelyPolicyNumber(wClean)
      if (likely) {
        // Determine how many original words this merged token spans
        const wasMerged = !mergedSegments[si].originalWords.includes(mergedWords[wi])
        polCandidates.push({
          normalized: normalizePolicy(wClean),
          confidence: wasMerged ? confidence + 5 : confidence, // bonus for merged (more likely real)
          segIndex: si,
          wordIndex: wi,
          wordSpan: wasMerged ? 2 : 1, // approximate
        })
      }
    }
  }

  // Pick the best policy candidate (highest confidence)
  polCandidates.sort((a, b) => b.confidence - a.confidence)
  const bestPol = polCandidates.length > 0 ? polCandidates[0] : null
  const foundPol = bestPol?.normalized ?? null
  const polConfidence = bestPol?.confidence ?? 0

  // --- 4. Second pass: collect name candidates (skip policy segment, dates, numbers) ---
  const candidateNameSegments: string[] = []

  for (let si = 0; si < mergedSegments.length; si++) {
    const { mergedWords } = mergedSegments[si]

    // If this segment contained the winning policy number, strip that word out
    let segWords = mergedWords
    if (bestPol && bestPol.segIndex === si) {
      segWords = mergedWords.filter((_, wi) => wi !== bestPol.wordIndex)
      if (segWords.length === 0) continue
    }

    const segToUse = segWords.join(" ").trim()
    if (!segToUse) continue

    // Skip date-only segments
    const isDateSeg = segWords.every(w =>
      /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(w) ||
      /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(w) ||
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(w)
    )
    if (isDateSeg) continue

    // Skip segments that are just numbers or percentages
    if (segWords.every(w => /^\d+\.?\d*%?$/.test(w))) continue

    candidateNameSegments.push(segToUse)
  }

  // Known carrier / company keywords to strip from the end of a name segment.
  // These appear when a truncated name runs into the carrier column in the PDF.
  const CARRIER_TAIL_WORDS = new Set([
    "allied", "travelers", "safeco", "progressive", "hartford", "nationwide",
    "liberty", "mutual", "state", "farm", "allstate", "usaa", "chubb",
    "zurich", "markel", "employers", "amtrust", "guard", "merchants",
    "westfield", "erie", "grange", "motorists", "cincinnati", "hanover",
    "preferred", "encompass", "auto-owners", "owners", "acuity", "sentry",
    "shelter", "grinnell", "pekin", "island", "donegal", "selective",
    "utica", "central", "continental", "general", "american", "national",
    "federal", "standard", "united", "heritage", "horizon", "meridian",
    "insurance", "ins", "co", "corp", "inc", "llc", "ltd",
  ])

  // --- 4. Pick the best client name ---
  // Score each candidate segment. Prefer segments that:
  //  - Have multiple alpha words (person/business name pattern)
  //  - Come before the policy number position in the line
  //  - Are NOT carrier names or jargon
  let bestName = ""
  let bestScore = -1

  // Find the approximate character position of the policy number in the original line
  const polPos = foundPol ? lineStr.indexOf(bestPol!.normalized.slice(0, 5)) : lineStr.length

  for (const seg of candidateNameSegments) {
    const words = seg.split(/\s+/)
    const alphaWords = words.filter(w => isLikelyNameWord(w))

    if (alphaWords.length === 0) continue

    let score = 0
    const nameRatio = alphaWords.length / words.length

    // High ratio of name-like words = likely a name field
    score += nameRatio * 30

    // 2-6 words is ideal for a name (includes business names)
    if (alphaWords.length >= 2 && alphaWords.length <= 6) score += 35
    else if (alphaWords.length === 1 && alphaWords[0].length >= 4) score += 10
    else if (alphaWords.length > 6) score += 15

    // Prefer longer text (full names vs abbreviations)
    score += Math.min(seg.length, 30)

    // Comma pattern bonus ("Last, First")
    if (seg.includes(",")) score += 15

    // Bonus if this segment appears before the policy number
    const segPos = lineStr.indexOf(seg.slice(0, Math.min(8, seg.length)))
    if (segPos >= 0 && segPos < polPos) score += 20

    // Penalize LOB / line-of-business jargon
    const lowerSeg = seg.toLowerCase()
    const jobHits = ["auto", "home", "fire", "bop", "gl", "wc", "liability",
      "property", "umbrella", "dwelling", "flood", "commercial", "personal",
      "homeowners", "renters", "motorcycle", "boat", "farm"]
      .filter(j => lowerSeg.includes(j)).length
    score -= jobHits * 10

    // Penalize if this is clearly a single known carrier name
    if (alphaWords.length === 1 && CARRIER_TAIL_WORDS.has(alphaWords[0].toLowerCase())) {
      score -= 40
    }

    if (score > bestScore) {
      bestScore = score
      // Strip trailing carrier keywords that bled in from an adjacent column
      let nameWords = [...words]
      while (nameWords.length > 1 && CARRIER_TAIL_WORDS.has(nameWords[nameWords.length - 1].toLowerCase())) {
        nameWords = nameWords.slice(0, -1)
      }
      // Cap at 6 words -- handles long business names while avoiding runaway text
      bestName = nameWords.slice(0, 6).join(" ").trim()
    }
  }

  if (!foundPol || commAmount.val === 0) return null

  // --- 5. Extract carrier, LOB, trans_type, producer from Horizon rows ---
  // Horizon rows always start with the producer name, and carrier appears as a
  // recognisable keyword. LOB is a short code (AUTOP, HOME, BOAT, UMBR, etc.)
  // and TRX is a short code (NBS, RWL, PCH, XLC, PRWL, etc.).
  let detectedCarrier  = "-"
  let detectedLob      = "-"
  let detectedTransType = "-"
  let detectedProducer = "-"

  const fmt2 = _currentStatementFormat
  if (fmt2 === "horizon_a" || fmt2 === "horizon_b") {
    // Carrier detection from raw line (before money tokens are stripped)
    const carrierMap: [RegExp, string][] = [
      [/progressive/i,       "Progressive"],
      [/travelers/i,         "Travelers"],
      [/hartford/i,          "The Hartford"],
      [/safeco/i,            "Safeco"],
      [/allstate/i,          "Allstate"],
      [/nationwide/i,        "Nationwide"],
      [/liberty mutual/i,    "Liberty Mutual"],
      [/permanent general/i, "Permanent General"],
      [/hallmark/i,          "American Hallmark"],
      [/state farm/i,        "State Farm"],
    ]
    for (const [re, name] of carrierMap) {
      if (re.test(lineStr)) { detectedCarrier = name; break }
    }

    // LOB: scan segments for known LOB codes
    const lobPattern = /\b(AUTOP?|HOME|BOAT|MOTO|UMBR|LIFE|BUSS|COMM|MC|RB|DWELL|FLOOD|FARM|RENTR?)\b/i
    const lobMatch = lineStr.match(lobPattern)
    if (lobMatch) detectedLob = lobMatch[1].toUpperCase()

    // TRX: short transaction code (NBS, RWL, PCH, XLC, PRWL, PRWQ, RWQ, NB, XLN, etc.)
    const trxPattern = /\b(NBS|NRWL|NB|RWL|PCH|XLC|XLN|PRWL|PRWQ|RWQ|WQL|WQ|PX|WL|BS|PNB|REWR|CANC|ENDO|INVR|INVN|AUDX|FLT)\b/i
    const trxMatch = lineStr.match(trxPattern)
    if (trxMatch) detectedTransType = trxMatch[1].toUpperCase()

    // Producer: first segment before customer (first alpha run before a name-like segment)
    // In Horizon PDFs the producer name is always the first column; grab from segments
    if (candidateNameSegments.length > 0) {
      // Try to grab first all-alpha segment that looks like a person's name
      const firstSeg = segments[0] ?? ""
      const firstWords = firstSeg.split(/\s+/).filter(w => /^[A-Za-z]/.test(w))
      if (firstWords.length >= 2 && firstWords.length <= 4) {
        detectedProducer = firstWords.join(" ")
      }
    }
  }

  const polScore = Math.round(polConfidence * 100)
  return {
    policy_number: foundPol,
    commission: commAmount.val,
    premium: premAmount ? premAmount.val : 0,
    client_name: bestName,
    month: fileDate,
    file: fileName,
    raw_line: lineStr,
    producer: detectedProducer,
    carrier: detectedCarrier,
    lob: detectedLob,
    trans_type: detectedTransType,
    confidence: {
      level: polScore >= 70 ? "high" : polScore >= 45 ? "medium" : "low",
      score: polScore,
      reasons: [],
    },
    policyConfidence: polConfidence,
  }
}

export interface CommissionRow {
  id: string
  policy_number: string
  commission: number
  premium: number
  client_name: string
  month: string
  file: string
  raw_line: string
  producer: string
  carrier: string
  lob: string
  trans_type: string
  confidence: ParseConfidence
}
