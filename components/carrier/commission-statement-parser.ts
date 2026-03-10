/**
 * Commission Statement Parser
 *
 * Handles two Horizon Agency Systems EZLynx report formats:
 *
 * FORMAT A — "Commissions By Producer" (older layout, Apr–Sep 2025)
 *   Header: ProducerAccount NameMaster CompanyPolicy NumberLOB CodeTransaction TypePremium - WrittenTotal CommissionCommission SplitPayee
 *   Key quirks:
 *     - LOB and TRX are often fused into one token: "AUTOPRWL", "AUTOPNBS", "HOMERWL", "HOMEPCR", "AUTOPXL"
 *     - Allstate rows embed the policy number inside the carrier field with spaces:
 *         "Allstate                 436468877                HOME  RWL  ..."
 *     - The Hartford policy numbers have trailing spaces: "34RBC782137            "
 *     - Payee name (same as producer) appears AFTER the 3 money columns
 *
 * FORMAT B — "Commission Detail" (newer layout, Oct 2025 onward)
 *   Header: ProducerAccountMaster CompanyPolicyLOBTRXEff DatePremiumCommSplit Comm
 *   Key quirks:
 *     - LOB column is often absent from data rows
 *     - TRX values: NB, RB, MSC (not PRWL/PCH etc.)
 *     - Subtotal / Branch Total lines must be skipped
 *     - Commission Summary carrier rows must be skipped (only 2 text cols + 2 money cols)
 *
 * Extracted fields (map to CarrierInputs book quality fields):
 *   - book_avg_premium_per_policy    (total written premium / unique policy count)
 *   - book_new_business_pct          (NB transactions / total transactions × 100)
 *   - book_policies_per_customer     (unique policies / unique customers)
 *   - totalWrittenPremium            (net sum of all premium rows)
 *   - totalSplitCommission           (net split commission earned)
 *   - carrierBreakdown               (premium by carrier for cross-reference)
 */

export interface CommissionParseResult {
  book_avg_premium_per_policy: number | null
  book_new_business_pct: number | null
  book_policies_per_customer: number | null
  totalWrittenPremium: number | null
  totalSplitCommission: number | null
  totalPolicies: number | null
  totalCustomers: number | null
  newBusinessCount: number | null
  totalTransactions: number | null
  carrierBreakdown: CarrierBreakdown[]
  statementMonth: string | null
  format: "A" | "B" | "unknown"
}

export interface CarrierBreakdown {
  carrier: string
  writtenPremium: number
  splitCommission: number
  policyCount: number
  newBusinessCount: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDollar(s: string): number {
  const neg = s.includes("(") || s.trimStart().startsWith("-")
  const clean = s.replace(/[$(),\s]/g, "").replace(/-/g, "")
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : neg ? -n : n
}

function isMoneyToken(s: string): boolean {
  // matches: $1,234.56  ($1,234.56)  -$234  1234.56  -1234.56
  return /^-?\(?\$?[\d,]+\.?\d*\)?$/.test(s.trim())
}

/** Normalise carrier name to a short canonical form */
function normaliseCarrier(raw: string): string {
  const r = raw.toLowerCase()
  if (r.includes("progressive"))       return "Progressive"
  if (r.includes("hartford"))          return "The Hartford"
  if (r.includes("travelers"))         return "Travelers"
  if (r.includes("allstate"))          return "Allstate"
  if (r.includes("hallmark"))          return "American Hallmark"
  if (r.includes("permanent general")) return "Permanent General"
  if (r.includes("safeco"))            return "Safeco"
  if (r.includes("nationwide"))        return "Nationwide"
  if (r.includes("liberty mutual"))    return "Liberty Mutual"
  // Fallback: first two meaningful words
  return raw.trim().split(/\s+/).slice(0, 2).join(" ")
}

// Known producer names in these statements — used to strip payee from end of Format A lines
const KNOWN_PRODUCERS = ["Michael Turner", "ZZ-Jill ZZ-Turner", "Jill Turner"]

/**
 * Detect whether a fused LOB+TRX token contains a new-business code.
 * Handles: NBS, NB, NRWL, PNBS, BNBS, AUTOPNBS, HOMEPNBS, as well as standalone NB
 */
function isNewBusiness(token: string): boolean {
  const t = token.toUpperCase()
  // Format B standalone codes
  if (t === "NB" || t === "NBS" || t === "NRWL") return true
  // Format A fused codes contain NBS or NB at the end
  if (/NB(S)?$/.test(t)) return true
  return false
}

/**
 * Split a fused LOB+TRX token like "AUTOPRWL", "AUTOPNBS", "HOMERWL", "AUTOPXL"
 * into { lob, trx } parts.
 *
 * Pattern: (AUTO|HOME|BOAT|MOTO|UMBR|MC|LIFE)(P|B)?(RWL|NBS|NB|PCH|XLC|XLN|PAD|PCR|PRWL|PRWQ|RWQ|PX|BS|WL|REI|POL|CAN|XL|RE)
 * The leading letter after the base LOB (e.g. "P" in "AUTOP") is a sub-type prefix kept with the TRX.
 */
function splitLobTrx(token: string): { lob: string; trx: string } {
  const t = token.toUpperCase()
  const m = t.match(/^(AUTO|HOME|BOAT|MOTO|UMBR|MC|LIFE|BUSS)([A-Z]*)$/)
  if (!m) return { lob: "", trx: token }
  return { lob: m[1], trx: m[2] || "" }
}

/** True if token looks like an EZLynx policy number (alphanumeric, 5+ chars, no spaces) */
function isPolicyNumber(s: string): boolean {
  return /^[A-Z0-9\-]{5,}$/i.test(s.trim())
}

/** True if a token is a known carrier indicator */
function isCarrierKeyword(s: string): boolean {
  return /insurance|hallmark|hartford|allstate|safeco|travelers|nationwide|permanent|liberty|progressive/i.test(s)
}

// ─── Format detection ─────────────────────────────────────────────────────────

function detectFormat(lines: string[]): "A" | "B" | "unknown" {
  for (const line of lines.slice(0, 40)) {
    if (/commissions?\s+by\s+producer/i.test(line)) return "A"
    if (/commission\s+detail/i.test(line)) return "B"
    if (/lob\s+code.*transaction\s+type.*premium\s*-\s*written/i.test(line)) return "A"
    if (/lob\s+trx.*eff\s+date.*premium/i.test(line)) return "B"
  }
  return "unknown"
}

function extractMonth(lines: string[]): string | null {
  for (const line of lines.slice(0, 20)) {
    const m = line.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i)
    if (m) return `${m[1]} ${m[2]}`
  }
  return null
}

// ─── Row model ────────────────────────────────────────────────────────────────

interface PolicyRow {
  customer: string
  carrier: string
  policy: string
  lob: string
  trx: string
  premium: number
  totalComm: number
  splitComm: number
}

// ─── FORMAT A parser ──────────────────────────────────────────────────────────

/**
 * FORMAT A — "Commissions By Producer"
 *
 * After pdfjs row-grouping, each data line is roughly:
 *   Producer  Customer  Carrier  PolicyNo  LOB+TRX(fused)  $premium  $totalComm  $splitComm  Payee
 *
 * Special cases handled:
 *  1. Fused LOB+TRX tokens (AUTOPRWL, AUTOPNBS, HOMERWL, etc.)
 *  2. Allstate rows where carrier+policy are in one messy token with spaces:
 *       "Allstate                 436468877                HOME  RWL"
 *     → we clean up by collapsing internal whitespace in the raw line first
 *  3. The Hartford padded policy numbers: "34RBC782137            " → stripped
 *  4. Payee name at end (mirrors producer) — stripped before money search
 *  5. Producer-subtotal lines like "Michael Turner  $40,930.57  $4,143.42  $3,521.96" — skipped
 */
function parseFormatA(lines: string[]): PolicyRow[] {
  const rows: PolicyRow[] = []
  let inData = false

  for (const rawLine of lines) {
    // Detect section start/end
    if (/lob\s+code.*transaction\s+type.*premium/i.test(rawLine) ||
        /policy\s+number.*lob\s+code/i.test(rawLine)) {
      inData = true
      continue
    }
    if (/^page\s+\d+\s+of\s+\d+/i.test(rawLine) ||
        /filter\s+values/i.test(rawLine) ||
        /mvr\s+report/i.test(rawLine) ||
        /data\s+refreshed/i.test(rawLine)) {
      inData = false
      continue
    }
    if (!inData) continue

    // Collapse multiple internal spaces to double-space to normalise Allstate rows
    const line = rawLine.replace(/\s{3,}/g, "  ").trim()

    // Tokenise on 2+ spaces or tab
    let tokens = line.split(/\s{2,}|\t/).map(t => t.trim()).filter(Boolean)
    if (tokens.length < 4) continue

    // Strip trailing payee token (matches a known producer name)
    const lastTok = tokens[tokens.length - 1]
    if (KNOWN_PRODUCERS.some(p => lastTok.toLowerCase().includes(p.toLowerCase().split(" ")[0]))) {
      tokens = tokens.slice(0, tokens.length - 1)
    }

    // Find 3 rightmost money tokens: premium, totalComm, splitComm
    const moneyIdxs: number[] = []
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (isMoneyToken(tokens[i])) {
        moneyIdxs.unshift(i)
        if (moneyIdxs.length === 3) break
      }
    }
    if (moneyIdxs.length < 3) continue

    const [piIdx, tcIdx, scIdx] = moneyIdxs
    const premium   = parseDollar(tokens[piIdx])
    const totalComm = parseDollar(tokens[tcIdx])
    const splitComm = parseDollar(tokens[scIdx])

    // Skip producer subtotal rows (only money after 1 token — no customer/carrier)
    const before = tokens.slice(0, piIdx)
    if (before.length < 3) continue

    // Walk right-to-left through `before` to extract: fused LOB+TRX, policy, carrier, customer, producer
    let bi = before.length - 1

    // 1. LOB+TRX: fused or separate
    let lob = ""
    let trx = ""
    const tok = before[bi]

    // Check for fused LOB+TRX token (e.g. AUTOPRWL, HOMERWL, AUTOPNBS, BOAT)
    if (/^(AUTO|HOME|BOAT|MOTO|UMBR|LIFE|BUSS)/i.test(tok)) {
      const split = splitLobTrx(tok)
      lob = split.lob
      trx = split.trx
      bi--
      // Occasionally the TRX is the very next separate token (e.g. lob="AUTOP" trx="RWL" as two tokens)
    } else if (bi > 0 && /^(AUTO|HOME|BOAT|MOTO|UMBR|LIFE|BUSS)/i.test(before[bi - 1])) {
      trx = tok; bi--
      const split = splitLobTrx(before[bi])
      lob = split.lob; bi--
    }

    // 2. Policy number
    let policy = ""
    if (bi >= 0 && isPolicyNumber(before[bi]) && !isCarrierKeyword(before[bi])) {
      policy = before[bi--].trim()
    }

    // 3. Everything from index 1..bi is carrier + customer
    //    Producer is always index 0 (e.g. "Michael Turner" or "ZZ-Jill ZZ-Turner")
    const rest = before.slice(1, bi + 1)

    let carrier  = ""
    let customer = ""

    if (rest.length === 0) continue

    // Find where the carrier name starts (first token containing a carrier keyword)
    let carrierStart = -1
    for (let i = 0; i < rest.length; i++) {
      if (isCarrierKeyword(rest[i])) { carrierStart = i; break }
    }

    if (carrierStart === 0) {
      // No customer tokens before carrier — the customer might be before the producer or missing
      carrier  = rest.join(" ")
      customer = ""
    } else if (carrierStart > 0) {
      customer = rest.slice(0, carrierStart).join(" ")
      carrier  = rest.slice(carrierStart).join(" ")
    } else {
      // No carrier keyword found — heuristic: last token is carrier, rest is customer
      carrier  = rest[rest.length - 1]
      customer = rest.slice(0, rest.length - 1).join(" ")
    }

    if (!carrier) continue

    rows.push({
      customer: customer.trim(),
      carrier:  normaliseCarrier(carrier),
      policy:   policy,
      lob,
      trx,
      premium,
      totalComm,
      splitComm,
    })
  }
  return rows
}

// ─── FORMAT B parser ──────────────────────────────────────────────────────────

/**
 * FORMAT B — "Commission Detail"
 *
 * After pdfjs row-grouping, each data line is roughly:
 *   Producer  Customer  Carrier  Policy  [LOB]  TRX  EffDate  $premium  $comm  $splitComm
 *
 * Lines to skip:
 *  - Header row (ProducerAccountMaster Company…)
 *  - Subtotal lines: "Subtotal: Michael Turner  $x  $x  $x"
 *  - Branch Total:   "Branch Total  $x  $x  $x"
 *  - Commission Summary carrier rows: only 2 non-money text tokens + 2 money tokens (no policy/customer)
 *  - Balance register / descriptor rows
 */
function parseFormatB(lines: string[]): PolicyRow[] {
  const rows: PolicyRow[] = []
  let inDetail = false

  for (const rawLine of lines) {
    if (/commission\s+detail/i.test(rawLine)) { inDetail = true; continue }
    if (/^page\s+\d+\s+of\s+\d+/i.test(rawLine) ||
        /trx\s+type\s+key/i.test(rawLine) ||
        /mvr\s+report/i.test(rawLine)) {
      inDetail = false; continue
    }
    if (!inDetail) continue

    // Skip known non-data lines
    if (/producer.*account.*master\s*company/i.test(rawLine)) continue
    if (/^subtotal\s*:/i.test(rawLine) || /^branch\s+total/i.test(rawLine)) continue
    if (/overall\s+branch\s+total/i.test(rawLine)) continue
    if (/commission\s+type|balance\s+register|trx\s+type/i.test(rawLine)) continue
    if (/totals?\s+by\s+(producer|carrier)/i.test(rawLine)) continue

    const tokens = rawLine.trim().split(/\s{2,}|\t/).map(t => t.trim()).filter(Boolean)
    if (tokens.length < 5) continue

    // Find 3 rightmost money tokens
    const moneyIdxs: number[] = []
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (isMoneyToken(tokens[i])) {
        moneyIdxs.unshift(i)
        if (moneyIdxs.length === 3) break
      }
    }
    if (moneyIdxs.length < 3) continue

    const [piIdx, tcIdx, scIdx] = moneyIdxs
    const premium   = parseDollar(tokens[piIdx])
    const totalComm = parseDollar(tokens[tcIdx])
    const splitComm = parseDollar(tokens[scIdx])

    const before = tokens.slice(0, piIdx)
    // Need at least: producer, customer, carrier, policy, trx
    if (before.length < 4) continue

    // Skip carrier-summary rows: they look like "Progressive Insurance  $28,763.93  $2,453.60"
    // i.e. only 1-2 text tokens before 2 money columns (not 3) — but we already have 3 money cols,
    // so a summary row with 2 money cols won't reach here. Safe.
    // Extra guard: skip rows where producer token is not a known name variant
    const producerToken = before[0]
    const looksLikeProducer = KNOWN_PRODUCERS.some(p =>
      producerToken.toLowerCase().includes(p.toLowerCase().split(" ")[0])
    )
    if (!looksLikeProducer) continue

    let bi = before.length - 1

    // Eff date: YYYY-MM-DD
    if (bi >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(before[bi])) bi--

    // TRX code: 1–4 uppercase letters (NB, RB, MSC, etc.)
    let trx = ""
    if (bi >= 0 && /^[A-Z]{1,4}$/i.test(before[bi]) && before[bi].length <= 4 && !isPolicyNumber(before[bi])) {
      trx = before[bi--]
    }

    // Optional LOB (AUTO, HOME, etc.) — often absent in Format B
    let lob = ""
    if (bi >= 0 && /^(AUTO|HOME|BOAT|MOTO|UMBR|MC|LIFE)/i.test(before[bi])) {
      const split = splitLobTrx(before[bi])
      lob = split.lob; bi--
    }

    // Policy number
    let policy = ""
    if (bi >= 0 && isPolicyNumber(before[bi]) && !isCarrierKeyword(before[bi])) {
      policy = before[bi--]
    }

    // Rest: producer (index 0), customer, carrier
    const rest = before.slice(0, bi + 1)
    if (rest.length < 2) continue

    let carrierStart = -1
    for (let i = 1; i < rest.length; i++) {
      if (isCarrierKeyword(rest[i])) { carrierStart = i; break }
    }

    let customer = ""
    let carrier  = ""

    if (carrierStart > 0) {
      customer = rest.slice(1, carrierStart).join(" ")
      carrier  = rest.slice(carrierStart).join(" ")
    } else {
      // Carrier not identified by keyword — everything after producer is customer+carrier
      // Try: last token is carrier, middle tokens are customer
      customer = rest.slice(1, rest.length - 1).join(" ")
      carrier  = rest[rest.length - 1] || ""
    }

    if (!carrier) continue

    rows.push({
      customer: customer.trim(),
      carrier:  normaliseCarrier(carrier),
      policy:   policy.trim(),
      lob,
      trx,
      premium,
      totalComm,
      splitComm,
    })
  }
  return rows
}

// ─── Aggregate ────────────────────────────────────────────────────────────────

function aggregate(rows: PolicyRow[]): CommissionParseResult {
  const carrierMap        = new Map<string, CarrierBreakdown>()
  const carrierPolicies   = new Map<string, Set<string>>()
  const customerPolicies  = new Map<string, Set<string>>()
  const uniquePolicies    = new Set<string>()

  let totalPremium = 0
  let totalSplit   = 0
  let nbCount      = 0

  for (const row of rows) {
    // Skip rows with no meaningful premium (fees, $0 adjustment rows)
    if (Math.abs(row.premium) < 0.01) continue

    totalPremium += row.premium
    totalSplit   += row.splitComm

    // New-business detection works on the fused LOB+TRX combined or separate trx
    const fullTrx = row.lob + row.trx
    if (isNewBusiness(row.trx) || isNewBusiness(fullTrx)) nbCount++

    if (row.policy) uniquePolicies.add(row.policy)

    // Customer → policies
    if (row.customer && row.policy) {
      if (!customerPolicies.has(row.customer)) customerPolicies.set(row.customer, new Set())
      customerPolicies.get(row.customer)!.add(row.policy)
    }

    // Carrier stats
    if (!carrierMap.has(row.carrier)) {
      carrierMap.set(row.carrier, { carrier: row.carrier, writtenPremium: 0, splitCommission: 0, policyCount: 0, newBusinessCount: 0 })
    }
    const cb = carrierMap.get(row.carrier)!
    cb.writtenPremium  += row.premium
    cb.splitCommission += row.splitComm

    const fullTrxForCb = row.lob + row.trx
    if (isNewBusiness(row.trx) || isNewBusiness(fullTrxForCb)) cb.newBusinessCount++

    if (row.policy) {
      if (!carrierPolicies.has(row.carrier)) carrierPolicies.set(row.carrier, new Set())
      carrierPolicies.get(row.carrier)!.add(row.policy)
    }
  }

  // Set unique policy counts per carrier
  for (const [carrier, pols] of carrierPolicies) {
    const cb = carrierMap.get(carrier)
    if (cb) cb.policyCount = pols.size
  }

  const breakdown      = Array.from(carrierMap.values()).sort((a, b) => b.writtenPremium - a.writtenPremium)
  const totalPolicies  = uniquePolicies.size
  const totalCustomers = customerPolicies.size
  const totalTrx       = rows.filter(r => Math.abs(r.premium) >= 0.01).length

  const avgPremPerPol = totalPolicies > 0 ? Math.round(totalPremium / totalPolicies) : null
  const newBizPct     = totalTrx > 0 ? parseFloat(((nbCount / totalTrx) * 100).toFixed(1)) : null
  const polsPerCx     = totalCustomers > 0 ? parseFloat((totalPolicies / totalCustomers).toFixed(2)) : null

  return {
    book_avg_premium_per_policy: avgPremPerPol,
    book_new_business_pct:       newBizPct,
    book_policies_per_customer:  polsPerCx,
    totalWrittenPremium:         Math.round(totalPremium),
    totalSplitCommission:        Math.round(totalSplit),
    totalPolicies,
    totalCustomers,
    newBusinessCount:            nbCount,
    totalTransactions:           totalTrx,
    carrierBreakdown:            breakdown,
    statementMonth:              null,
    format:                      "unknown",
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function parseCommissionStatement(text: string): CommissionParseResult {
  const lines  = text.split("\n").map(l => l.trim()).filter(Boolean)
  const format = detectFormat(lines)
  const month  = extractMonth(lines)

  let rows: PolicyRow[]
  if (format === "A") {
    rows = parseFormatA(lines)
  } else if (format === "B") {
    rows = parseFormatB(lines)
  } else {
    // Unknown — try both and pick whichever yields more rows
    const rowsA = parseFormatA(lines)
    const rowsB = parseFormatB(lines)
    rows = rowsA.length >= rowsB.length ? rowsA : rowsB
  }

  const result         = aggregate(rows)
  result.statementMonth = month
  result.format        = rows.length > 0 ? (format === "unknown" ? "A" : format) : "unknown"
  return result
}

export interface CarrierBreakdown {
  carrier: string
  writtenPremium: number
  splitCommission: number
  policyCount: number
  newBusinessCount: number
}

// ─── Normalise helpers ───────────────────────────────────────────────────────

function parseDollar(s: string): number {
  // handles "$1,234.56", "($234.56)", "-$234.56", "1234.56"
  const neg = s.includes("(") || s.startsWith("-")
  const clean = s.replace(/[$(),\s]/g, "").replace(/-/g, "")
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : (neg ? -n : n)
}

function isMoneyToken(s: string): boolean {
  return /^-?\(?\$?[\d,]+\.?\d*\)?$/.test(s.trim())
}

/** Short carrier name from raw "Master Company" text */
function normaliseCarrier(raw: string): string {
  const r = raw.toLowerCase()
  if (r.includes("progressive"))          return "Progressive"
  if (r.includes("hartford"))             return "The Hartford"
  if (r.includes("travelers"))            return "Travelers"
  if (r.includes("allstate"))             return "Allstate"
  if (r.includes("hallmark"))             return "American Hallmark"
  if (r.includes("permanent general"))    return "Permanent General"
  if (r.includes("safeco"))               return "Safeco"
  if (r.includes("nationwide"))           return "Nationwide"
  if (r.includes("liberty mutual"))       return "Liberty Mutual"
  return raw.split(/\s+/).slice(0, 2).join(" ")  // first two words as fallback
}

/** Detect new business transaction types */
function isNewBusiness(trx: string): boolean {
  return /^(NB|NBS|NRWL)$/i.test(trx.trim())
}

// ─── Format detection ────────────────────────────────────────────────────────

function detectFormat(lines: string[]): "A" | "B" | "unknown" {
  for (const line of lines.slice(0, 30)) {
    if (/commission\s+by\s+producer|commissions\s+by\s+producer/i.test(line)) return "A"
    if (/commission\s+detail/i.test(line)) return "B"
    // Column header fingerprints
    if (/lob\s+code.*transaction\s+type.*premium\s*-\s*written/i.test(line)) return "A"
    if (/lob\s+trx.*eff\s+date.*premium/i.test(line)) return "B"
  }
  return "unknown"
}

/** Extract statement month from header area */
function extractMonth(lines: string[]): string | null {
  for (const line of lines.slice(0, 15)) {
    // "July 2025" or "December 2025"
    const m = line.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i)
    if (m) return `${m[1]} ${m[2]}`
  }
  return null
}

// ─── Row parsers ─────────────────────────────────────────────────────────────

interface PolicyRow {
  customer: string
  carrier: string
  policy: string
  lob: string
  trx: string
  premium: number
  totalComm: number
  splitComm: number
}

/**
 * FORMAT A — "Commissions By Producer"
 * The pdfjs row-grouper produces lines like:
 *   "Michael Turner  Scott & amy rosenthal  Progressive Insurance  976185671  AUTOP  RWL  $3,068.00  $306.80  $260.78  Michael Turner"
 * Columns (after pdfjs joins): producer  customer  carrier  policy  lob  trx  premium  total_comm  split_comm  payee
 *
 * Tricky cases:
 *  - Carrier name may be multi-word and wrap across pdfjs items (already joined by our extractor)
 *  - LOB code may be "AUTOP", "HOME", "BOAT", etc.
 *  - TRX may be "PRWL", "PCH", "NBS", "PRWQ", "XLC", "NBS", "XLN", "RWL" etc.
 *  - Last three money columns + payee at end
 */
function parseFormatA(lines: string[]): PolicyRow[] {
  const rows: PolicyRow[] = []
  let inData = false

  for (const line of lines) {
    // Start of data after column header row
    if (/lob\s+code.*transaction\s+type.*premium/i.test(line) ||
        /policy\s+number.*lob\s+code/i.test(line)) {
      inData = true
      continue
    }
    // End markers
    if (/^page\s+\d+\s+of\s+\d+/i.test(line) || /filter\s+values/i.test(line) || /mvr\s+report/i.test(line)) {
      inData = false
      continue
    }
    if (!inData) continue

    // Split into tokens — money tokens are identifiable
    // Find the 3 money columns: premium, total_comm, split_comm
    // They are the last 3 money-shaped tokens before the payee name at the end
    const tokens = line.trim().split(/\s{2,}|\t/).map(t => t.trim()).filter(Boolean)
    if (tokens.length < 5) continue

    // Find money token indices (right-to-left: splitComm, totalComm, premium)
    const moneyIdxs: number[] = []
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (isMoneyToken(tokens[i])) {
        moneyIdxs.unshift(i)
        if (moneyIdxs.length === 3) break
      }
    }
    if (moneyIdxs.length < 3) continue

    const [piIdx, tcIdx, scIdx] = moneyIdxs
    const premium   = parseDollar(tokens[piIdx])
    const totalComm = parseDollar(tokens[tcIdx])
    const splitComm = parseDollar(tokens[scIdx])

    // Tokens before the first money column: producer, customer, carrier, policy, lob, trx
    const before = tokens.slice(0, piIdx)
    if (before.length < 4) continue

    // TRX is the token immediately before premium that matches a transaction code pattern
    // LOB is the token before TRX
    // Policy number is alphanumeric, often before LOB
    // Carrier name is everything between customer and policy
    let trx = ""
    let lob = ""
    let policy = ""
    let carrier = ""
    let customer = ""
    // Producer is first token (known name)
    // Walk right-to-left through before[] to find trx, lob, policy
    let bi = before.length - 1
    if (/^[A-Z]{2,6}(RWL|NBS|NB|PCH|XLC|XLN|PRWL|PRWQ|PRWQ|RWQ|WQL|WQ|PX|WL|BS|PNB)?$/i.test(before[bi])) {
      trx = before[bi--]
    }
    // LOB code: starts with AUTO, HOME, BOAT, MOTO, etc. possibly with suffix
    if (bi >= 0 && /^(AUTO|HOME|BOAT|MOTO|UMBR|LIFE|BUSS|MC)/i.test(before[bi])) {
      lob = before[bi--]
    } else {
      // combined LOBCode+TRX sometimes e.g. "AUTOP" where P is TRX suffix
      if (bi >= 0 && /^AUTO|HOME|BOAT/i.test(before[bi])) {
        lob = before[bi--]
      }
    }
    // Policy: alphanumeric, may have letters/numbers
    if (bi >= 0 && /^[A-Z0-9\-]+$/i.test(before[bi]) && before[bi].length >= 5) {
      policy = before[bi--]
    }
    // Everything from index 1 to bi is carrier + customer split somewhere
    // Carrier usually contains "Insurance", "Hallmark", etc.
    // Customer is often 2-4 words
    const rest = before.slice(1, bi + 1)  // exclude producer (index 0)
    // Find carrier token span (contains carrier keyword)
    let carrierStart = -1
    for (let i = 0; i < rest.length; i++) {
      if (/insurance|hallmark|hartford|allstate|safeco|travelers|nationwide|permanent/i.test(rest[i])) {
        carrierStart = i
        break
      }
    }
    if (carrierStart > 0) {
      customer = rest.slice(0, carrierStart).join(" ")
      carrier  = rest.slice(carrierStart).join(" ")
    } else {
      // Fallback: last token of rest is carrier, rest is customer
      customer = rest.slice(0, -1).join(" ")
      carrier  = rest[rest.length - 1] || ""
    }

    if (!carrier || premium === 0) continue

    rows.push({
      customer: customer.trim(),
      carrier:  normaliseCarrier(carrier),
      policy:   policy.trim(),
      lob:      lob.trim(),
      trx:      trx.trim(),
      premium,
      totalComm,
      splitComm,
    })
  }
  return rows
}

/**
 * FORMAT B — "Commission Detail"
 * pdfjs row-grouper produces lines like:
 *   "Michael Turner  Rebecka Dornford  Permanent General Assurance Corp  TX6490273  RB  2025-10-05  $360.53  $28.87  $24.54"
 * Columns: producer  customer  carrier  policy  lob(optional)  trx  eff_date  premium  comm  split_comm
 */
function parseFormatB(lines: string[]): PolicyRow[] {
  const rows: PolicyRow[] = []
  let inDetail = false

  for (const line of lines) {
    if (/commission\s+detail/i.test(line)) { inDetail = true; continue }
    if (/^page\s+\d+\s+of\s+\d+/i.test(line) || /trx\s+type\s+key/i.test(line)) {
      inDetail = false; continue
    }
    if (!inDetail) continue

    // Header row — skip
    if (/producer.*account.*master.*company/i.test(line) ||
        /producer.*account.*master\s*company.*policy.*lob.*trx.*eff/i.test(line)) continue

    const tokens = line.trim().split(/\s{2,}|\t/).map(t => t.trim()).filter(Boolean)
    if (tokens.length < 5) continue

    // Find 3 money columns from right
    const moneyIdxs: number[] = []
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (isMoneyToken(tokens[i])) {
        moneyIdxs.unshift(i)
        if (moneyIdxs.length === 3) break
      }
    }
    if (moneyIdxs.length < 3) continue

    const [piIdx, tcIdx, scIdx] = moneyIdxs
    const premium   = parseDollar(tokens[piIdx])
    const totalComm = parseDollar(tokens[tcIdx])
    const splitComm = parseDollar(tokens[scIdx])

    const before = tokens.slice(0, piIdx)
    if (before.length < 3) continue

    // Walk right-to-left: eff_date, trx, policy, carrier spans, customer, producer
    let bi = before.length - 1

    // Eff date: YYYY-MM-DD
    if (bi >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(before[bi])) bi--

    // TRX: short code
    let trx = ""
    if (bi >= 0 && /^[A-Z]{1,4}$/i.test(before[bi]) && before[bi].length <= 4) {
      trx = before[bi--]
    }

    // LOB: AUTO, HOME, etc. (optional in Format B — often omitted)
    let lob = ""
    if (bi >= 0 && /^(AUTO|HOME|BOAT|MOTO|UMBR|MC)/i.test(before[bi])) {
      lob = before[bi--]
    }

    // Policy
    let policy = ""
    if (bi >= 0 && /^[A-Z0-9\-]+$/i.test(before[bi]) && before[bi].length >= 5) {
      policy = before[bi--]
    }

    // Remaining: producer, customer, carrier
    const rest = before.slice(0, bi + 1)
    let carrierStart = -1
    for (let i = 0; i < rest.length; i++) {
      if (/insurance|hallmark|hartford|allstate|safeco|travelers|nationwide|permanent/i.test(rest[i])) {
        carrierStart = i
        break
      }
    }
    let customer = ""
    let carrier  = ""
    if (carrierStart > 0) {
      customer = rest.slice(1, carrierStart).join(" ")    // skip producer (index 0)
      carrier  = rest.slice(carrierStart).join(" ")
    } else {
      customer = rest[1] || ""
      carrier  = rest.slice(2).join(" ")
    }

    if (!carrier || premium === 0) continue

    rows.push({
      customer: customer.trim(),
      carrier:  normaliseCarrier(carrier),
      policy:   policy.trim(),
      lob:      lob.trim(),
      trx:      trx.trim(),
      premium,
      totalComm,
      splitComm,
    })
  }
  return rows
}

// ─── Aggregate ────────────────────────────────────────────────────────────────

function aggregate(rows: PolicyRow[]): CommissionParseResult {
  // Carriers
  const carrierMap = new Map<string, CarrierBreakdown>()
  // Unique customers → policies per customer
  const customerPolicies = new Map<string, Set<string>>()
  // Totals
  let totalPremium     = 0
  let totalSplit       = 0
  let nbCount          = 0
  const uniquePolicies = new Set<string>()

  for (const row of rows) {
    // Skip zero / tiny amounts (MVR charges, report fees)
    if (Math.abs(row.premium) < 1) continue

    totalPremium += row.premium
    totalSplit   += row.splitComm
    if (isNewBusiness(row.trx)) nbCount++
    if (row.policy) uniquePolicies.add(row.policy)

    // Customer → policies mapping
    if (row.customer && row.policy) {
      if (!customerPolicies.has(row.customer)) {
        customerPolicies.set(row.customer, new Set())
      }
      customerPolicies.get(row.customer)!.add(row.policy)
    }

    // Carrier breakdown
    if (!carrierMap.has(row.carrier)) {
      carrierMap.set(row.carrier, { carrier: row.carrier, writtenPremium: 0, splitCommission: 0, policyCount: 0, newBusinessCount: 0 })
    }
    const cb = carrierMap.get(row.carrier)!
    cb.writtenPremium   += row.premium
    cb.splitCommission  += row.splitComm
    if (row.policy && !cb.policyCount) cb.policyCount = 0
    if (isNewBusiness(row.trx)) cb.newBusinessCount++
  }

  // Policy count per carrier (unique policies)
  const carrierPolicies = new Map<string, Set<string>>()
  for (const row of rows) {
    if (!row.policy) continue
    if (!carrierPolicies.has(row.carrier)) carrierPolicies.set(row.carrier, new Set())
    carrierPolicies.get(row.carrier)!.add(row.policy)
  }
  for (const [carrier, pols] of carrierPolicies) {
    const cb = carrierMap.get(carrier)
    if (cb) cb.policyCount = pols.size
  }

  const breakdown = Array.from(carrierMap.values())
    .sort((a, b) => b.writtenPremium - a.writtenPremium)

  const totalPolicies   = uniquePolicies.size
  const totalCustomers  = customerPolicies.size
  const totalTrx        = rows.filter(r => Math.abs(r.premium) >= 1).length

  // Book quality derivations
  const avgPremPerPol   = totalPolicies > 0 ? Math.round(totalPremium / totalPolicies) : null
  const newBizPct       = totalTrx > 0 ? parseFloat(((nbCount / totalTrx) * 100).toFixed(1)) : null
  const polsPerCx       = totalCustomers > 0
    ? parseFloat((totalPolicies / totalCustomers).toFixed(2))
    : null

  return {
    book_avg_premium_per_policy: avgPremPerPol,
    book_new_business_pct:       newBizPct,
    book_policies_per_customer:  polsPerCx,
    totalWrittenPremium:         Math.round(totalPremium),
    totalSplitCommission:        Math.round(totalSplit),
    totalPolicies,
    totalCustomers,
    newBusinessCount:            nbCount,
    totalTransactions:           totalTrx,
    carrierBreakdown:            breakdown,
    statementMonth:              null,   // set by caller
    format:                      "unknown", // set by caller
  }
}

// ─── Public entry point ��──────────────────────────────────────────────────────

export function parseCommissionStatement(text: string): CommissionParseResult {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  const format = detectFormat(lines)
  const month  = extractMonth(lines)

  let rows: PolicyRow[] = []
  if (format === "A") {
    rows = parseFormatA(lines)
  } else if (format === "B") {
    rows = parseFormatB(lines)
  } else {
    // Try both and take whichever yields more rows
    const rowsA = parseFormatA(lines)
    const rowsB = parseFormatB(lines)
    rows = rowsA.length >= rowsB.length ? rowsA : rowsB
  }

  const result = aggregate(rows)
  result.statementMonth = month
  result.format = rows.length > 0 ? (format === "unknown" ? "A" : format) : "unknown"
  return result
}
