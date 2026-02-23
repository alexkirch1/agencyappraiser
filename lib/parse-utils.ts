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
export function normalizePolicy(val: unknown): string {
  let s = String(val || "").trim().toUpperCase()
  // Strip everything except letters and digits
  s = s.replace(/[^A-Z0-9]/g, "")
  // Remove leading zeros
  s = s.replace(/^0+/, "")
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
 * Common words found on commission statements that are NOT client names.
 * Includes producer titles, carrier names, LOB codes, transaction types, etc.
 */
const NOISE_WORDS = new Set([
  // Transaction types
  "new", "renew", "renewal", "rewrite", "rewritten", "cancel", "cancellation",
  "endorse", "endorsement", "reinstate", "reinstatement", "audit", "flat",
  "return", "nb", "ren", "rwrt", "canc", "end", "rein",
  // LOB / coverage types
  "auto", "home", "fire", "gl", "bop", "wc", "workers", "comp", "commercial",
  "personal", "property", "liability", "umbrella", "excess", "inland", "marine",
  "bond", "surety", "epli", "cyber", "professional", "do", "eo",
  "homeowners", "dwelling", "condo", "renters", "flood", "earthquake",
  "package", "mono", "multi", "line", "monoline",
  // Common carrier abbreviations
  "progressive", "safeco", "hartford", "travelers", "nationwide", "allstate",
  "state", "farm", "liberty", "mutual", "usaa", "geico", "erie", "chubb",
  "aig", "zurich", "hanover", "kemper", "mercury", "bristol", "west",
  "amtrust", "employers", "guard", "pie", "next", "coterie", "biberk",
  // Producer / role words
  "producer", "agent", "agency", "csr", "account", "manager", "executive",
  "service", "rep", "representative", "assistant", "team", "dept", "department",
  // Other noise
  "premium", "commission", "comm", "rate", "total", "subtotal", "balance",
  "due", "paid", "payment", "amount", "net", "gross", "earned", "written",
  "effective", "expiration", "inception", "term", "policy", "number",
  "direct", "bill", "agency", "billed", "company",
])

/**
 * Check if a token looks like a person name vs a noise word.
 * Names: capitalized, 2+ chars, no digits, not a known noise word.
 */
function isLikelyName(token: string): boolean {
  const clean = token.replace(/[.,\-:()]/g, "").trim()
  if (clean.length < 2) return false
  if (/\d/.test(clean)) return false
  if (NOISE_WORDS.has(clean.toLowerCase())) return false
  // Single letter (initials) -- not a standalone name but okay as part of a name
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

  // Skip dates
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(tClean)) return { likely: false, confidence: 0 }
  if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(tClean)) return { likely: false, confidence: 0 }
  // Skip percentages
  if (/^\d+\.?\d*%$/.test(tClean)) return { likely: false, confidence: 0 }
  // Skip pure short numbers (1-4 digits with no letters)
  if (/^\d{1,4}$/.test(tClean)) return { likely: false, confidence: 0 }

  if (!hasDigit) return { likely: false, confidence: 0 }

  let conf = 50

  // Mixed alphanumeric = very likely a policy number
  if (hasLetter && hasDigit) conf += 30

  // Longer = more confident
  if (tClean.length >= 6) conf += 10
  if (tClean.length >= 8) conf += 5
  if (tClean.length >= 10) conf += 5

  // Starts with 1-3 letters then digits = common policy format (e.g., BOP1234567)
  if (/^[A-Za-z]{1,4}\d+/.test(tClean)) conf += 10

  // Pure digits 5+ long
  if (!hasLetter && tClean.length >= 5) conf += 15

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
 * Returns null if the row doesn't contain commission data.
 */
export function parsePdfCommissionRow(
  lineStr: string,
  pageNum: number,
  fileDate: string,
  fileName: string
): (Omit<CommissionRow, "id"> & { policyConfidence: number }) | null {
  if (lineStr.length < 10) return null

  // Skip header-like rows, totals, page footers
  const lower = lineStr.toLowerCase()
  if (
    (lower.includes("page ") && lower.includes(" of ")) ||
    lower.includes("statement date") ||
    (lower.includes("commission") && lower.includes("policy") && lower.includes("premium")) ||
    /^(total|subtotal|grand total|sum|net total)/i.test(lineStr.trim()) ||
    lower.startsWith("report") && lower.includes("date") ||
    /^\s*[-=]+\s*$/.test(lineStr)
  ) return null

  // Find all money values
  const moneyPattern = /[(-]?\$?\s*(\d{1,3}(?:[,\s]?\d{3})*)\.\d{2}\s*[)CR-]*/gi
  const moneyMatches = [...lineStr.matchAll(moneyPattern)]
  const moneyCandidates = moneyMatches
    .map((match) => ({
      val: cleanNum(match[0]),
      raw: match[0],
      abs: Math.abs(cleanNum(match[0])),
      index: match.index ?? 0,
    }))
    .filter((m) => m.val !== 0 && m.abs < 500000 && m.abs >= 0.01)

  if (moneyCandidates.length === 0) return null

  // Commission = last money value, premium = first (if multiple)
  let commAmount = moneyCandidates[moneyCandidates.length - 1]
  let premAmount: typeof moneyCandidates[0] | null = null

  if (moneyCandidates.length >= 2) {
    const sorted = [...moneyCandidates].sort((a, b) => a.index - b.index)
    commAmount = sorted[sorted.length - 1]
    premAmount = sorted[0]
    // If last is much bigger than first, swap (commission should be smaller)
    if (commAmount.abs > premAmount.abs * 3 && premAmount.abs > 0) {
      const temp = commAmount
      commAmount = premAmount
      premAmount = temp
    }
  }

  // Remove money values from line to analyze remaining tokens
  let cleanLine = lineStr
  moneyCandidates.forEach((m) => {
    cleanLine = cleanLine.replace(m.raw, "  ")
  })

  // Split into tokens
  const tokens = cleanLine.split(/\s{2,}|\t/).map(t => t.trim()).filter(Boolean)

  // First pass: find policy number candidates
  let foundPol: string | null = null
  let polConfidence = 0
  const nonPolicyTokens: string[] = []

  for (const token of tokens) {
    // A token might be multi-word (like "John Smith") from double-space splitting
    const subTokens = token.split(/\s+/)

    for (const t of subTokens) {
      const tClean = t.replace(/^[.,\-:()]+|[.,\-:()]+$/g, "")
      if (!tClean) continue

      if (!foundPol) {
        const { likely, confidence } = isLikelyPolicyNumber(tClean)
        if (likely) {
          foundPol = normalizePolicy(tClean)
          polConfidence = confidence
          continue
        }
      }
    }

    // Collect the full token (may be multi-word) for name extraction
    if (!foundPol || token !== tokens.find(t => t.includes(foundPol || "__NEVER__"))) {
      nonPolicyTokens.push(token)
    }
  }

  // Second pass on non-policy tokens: extract client name (skip noise words)
  const nameTokens: string[] = []
  for (const token of nonPolicyTokens) {
    const words = token.split(/\s+/)
    for (const w of words) {
      if (isLikelyName(w)) {
        nameTokens.push(w)
      }
    }
    // If this token looks like "Last, First" or "First Last" (2-3 words, all alpha)
    if (words.length >= 2 && words.length <= 4 && words.every(w => isLikelyName(w))) {
      // This is very likely a client name -- use as-is and stop
      break
    }
  }

  const foundName = nameTokens.slice(0, 3).join(" ")

  if (!foundPol || commAmount.val === 0) return null

  return {
    policy_number: foundPol,
    commission: commAmount.val,
    premium: premAmount ? premAmount.val : 0,
    client_name: foundName,
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
