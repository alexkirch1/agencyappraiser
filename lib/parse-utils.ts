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
// We keep leading zeros in a controlled way: if the string is pure digits we
// strip leading zeros for matching consistency, but if it starts with letters
// followed by zeros (e.g. "CPP0012345") we keep them so the prefix is intact.
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

/**
 * Parse a single PDF text row and extract commission data.
 *
 * Strategy:
 *  1. Find all money amounts and mark their positions.
 *  2. Find the best policy-number candidate and mark its position.
 *  3. Find all date tokens and mark their positions.
 *  4. Everything that remains (not money, not policy#, not date) is candidate
 *     name text.  We take the longest contiguous run of alpha-only words as
 *     the client name -- this avoids grabbing LOB codes, carrier abbrevs, etc.
 *     that tend to be single short tokens.
 *
 * Returns null if the row doesn't contain commission data.
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
    /^\s*[-=]{3,}\s*$/.test(lineStr)
  ) return null

  // --- 1. Find money amounts ---
  const moneyPattern = /[(-]?\$?\s*(\d{1,3}(?:[,\s]?\d{3})*)\.\d{2}\s*[)CR-]*/gi
  const moneyMatches = [...lineStr.matchAll(moneyPattern)]
  const moneyCandidates = moneyMatches
    .map((match) => ({
      val: cleanNum(match[0]),
      raw: match[0],
      abs: Math.abs(cleanNum(match[0])),
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    }))
    .filter((m) => m.val !== 0 && m.abs < 500000 && m.abs >= 0.01)

  if (moneyCandidates.length === 0) return null

  // Commission heuristic: last amount on line. Premium: first (if 2+).
  let commAmount = moneyCandidates[moneyCandidates.length - 1]
  let premAmount: typeof moneyCandidates[0] | null = null
  if (moneyCandidates.length >= 2) {
    const sorted = [...moneyCandidates].sort((a, b) => a.start - b.start)
    commAmount = sorted[sorted.length - 1]
    premAmount = sorted[0]
    if (commAmount.abs > premAmount.abs * 3 && premAmount.abs > 0) {
      const temp = commAmount
      commAmount = premAmount
      premAmount = temp
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

  // --- 3. Classify each segment ---
  let foundPol: string | null = null
  let polConfidence = 0
  const candidateNameSegments: string[] = []

  for (const seg of segments) {
    const words = seg.split(/\s+/)

    // Check if any word in this segment is a policy number
    let segHasPolicy = false
    const remainingWords: string[] = []
    for (const w of words) {
      const wClean = w.replace(/^[.,\-:()]+|[.,\-:()]+$/g, "")
      if (!foundPol) {
        const { likely, confidence } = isLikelyPolicyNumber(wClean)
        if (likely) {
          foundPol = normalizePolicy(wClean)
          polConfidence = confidence
          segHasPolicy = true
          continue // skip this word but keep processing others in same segment
        }
      }
      remainingWords.push(w)
    }

    // If the segment was ONLY a policy number, skip it entirely
    if (segHasPolicy && remainingWords.length === 0) continue

    // Use remaining words if we stripped the policy out of a multi-word segment
    const segToUse = segHasPolicy ? remainingWords.join(" ") : seg
    const wordsToCheck = segToUse.split(/\s+/)

    // Skip date-only segments
    const isDateSeg = wordsToCheck.every(w =>
      /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(w) ||
      /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(w) ||
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(w)
    )
    if (isDateSeg) continue

    // Skip segments that are just numbers or percentages
    if (wordsToCheck.every(w => /^\d+\.?\d*%?$/.test(w))) continue

    // This segment is a candidate for the client name
    if (segToUse.trim()) candidateNameSegments.push(segToUse.trim())
  }

  // --- 4. Pick the best client name ---
  // Strategy: score each candidate segment. The client name is typically the
  // segment with the most alphabetic words in the 2-4 word "First Last" or
  // "Last, First" pattern. We keep all the original words (not just filtered
  // alpha words) to preserve names like "O'Brien" or "St. James".
  let bestName = ""
  let bestScore = -1

  for (const seg of candidateNameSegments) {
    const words = seg.split(/\s+/)
    const alphaWords = words.filter(w => isLikelyNameWord(w))

    if (alphaWords.length === 0) continue

    let score = 0
    const nameRatio = alphaWords.length / words.length

    // High ratio of name-like words = likely a name field
    score += nameRatio * 30

    // Sweet spot: 2-4 words is ideal for a person/business name
    if (alphaWords.length >= 2 && alphaWords.length <= 4) score += 35
    else if (alphaWords.length === 1 && alphaWords[0].length >= 3) score += 15
    else if (alphaWords.length > 4) score += 10

    // Prefer longer text (full names vs single abbreviations)
    score += Math.min(seg.length, 25)

    // Comma pattern bonus ("Last, First")
    if (seg.includes(",")) score += 15

    // Penalize segments with LOB/carrier jargon
    const lowerSeg = seg.toLowerCase()
    const jargonHits = ["auto", "home", "fire", "bop", "gl", "wc", "liability",
      "property", "umbrella", "dwelling", "flood", "commercial", "personal"]
      .filter(j => lowerSeg.includes(j)).length
    score -= jargonHits * 8

    if (score > bestScore) {
      bestScore = score
      // Keep the original segment text (preserving formatting like commas,
      // apostrophes, etc.) but cap at 4 words
      bestName = words.slice(0, 4).join(" ")
    }
  }

  if (!foundPol || commAmount.val === 0) return null

  return {
    policy_number: foundPol,
    commission: commAmount.val,
    premium: premAmount ? premAmount.val : 0,
    client_name: bestName,
    month: fileDate,
    file: fileName,
    raw_line: lineStr,
    producer: "-",
    carrier: "-",
    lob: "-",
    trans_type: "-",
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
