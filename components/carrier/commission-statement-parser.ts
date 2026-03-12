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
 *   - book_new_business_pct          (NB transactions / total transactions x 100)
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
  return raw.trim().split(/\s+/).slice(0, 2).join(" ")
}

// Known producer names — used to strip payee from end of Format A lines
const KNOWN_PRODUCERS = ["Michael Turner", "ZZ-Jill ZZ-Turner", "Jill Turner"]

/**
 * Detect whether a fused LOB+TRX token contains a new-business code.
 * Handles: NBS, NB, NRWL, PNBS, BNBS, AUTOPNBS, HOMEPNBS, as well as standalone NB
 */
function isNewBusiness(token: string): boolean {
  const t = token.toUpperCase()
  if (t === "NB" || t === "NBS" || t === "NRWL") return true
  if (/NB(S)?$/.test(t)) return true
  return false
}

/**
 * Split a fused LOB+TRX token like "AUTOPRWL", "AUTOPNBS", "HOMERWL", "AUTOPXL"
 * into { lob, trx } parts.
 */
function splitLobTrx(token: string): { lob: string; trx: string } {
  const t = token.toUpperCase()
  const m = t.match(/^(AUTO|HOME|BOAT|MOTO|UMBR|MC|LIFE|BUSS)([A-Z]*)$/)
  if (!m) return { lob: "", trx: token }
  return { lob: m[1], trx: m[2] || "" }
}

function isPolicyNumber(s: string): boolean {
  return /^[A-Z0-9\-]{5,}$/i.test(s.trim())
}

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
 * After pdfjs row-grouping each data line is roughly:
 *   Producer  Customer  Carrier  PolicyNo  LOB+TRX(fused)  $premium  $totalComm  $splitComm  Payee
 *
 * Special cases handled:
 *  1. Fused LOB+TRX tokens (AUTOPRWL, AUTOPNBS, HOMERWL, etc.)
 *  2. Allstate rows where carrier+policy are in one messy field with internal spaces
 *  3. The Hartford padded policy numbers — stripped by trim()
 *  4. Payee name at end (mirrors producer) — stripped before money search
 *  5. Producer-subtotal lines (only money after 1 token) — skipped
 */
function parseFormatA(lines: string[]): PolicyRow[] {
  const rows: PolicyRow[] = []
  let inData = false

  for (const rawLine of lines) {
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

    // Collapse 3+ internal spaces to 2 to normalise Allstate rows
    const line = rawLine.replace(/\s{3,}/g, "  ").trim()

    let tokens = line.split(/\s{2,}|\t/).map(t => t.trim()).filter(Boolean)
    if (tokens.length < 4) continue

    // Strip trailing payee token (matches a known producer first name)
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

    const before = tokens.slice(0, piIdx)
    if (before.length < 3) continue

    let bi = before.length - 1

    // 1. LOB+TRX: fused or separate
    let lob = ""
    let trx = ""
    const tok = before[bi]

    if (/^(AUTO|HOME|BOAT|MOTO|UMBR|LIFE|BUSS)/i.test(tok)) {
      const split = splitLobTrx(tok)
      lob = split.lob
      trx = split.trx
      bi--
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
    //    Producer is always index 0
    const rest = before.slice(1, bi + 1)
    let carrier  = ""
    let customer = ""

    if (rest.length === 0) continue

    let carrierStart = -1
    for (let i = 0; i < rest.length; i++) {
      if (isCarrierKeyword(rest[i])) { carrierStart = i; break }
    }

    if (carrierStart === 0) {
      carrier  = rest.join(" ")
      customer = ""
    } else if (carrierStart > 0) {
      customer = rest.slice(0, carrierStart).join(" ")
      carrier  = rest.slice(carrierStart).join(" ")
    } else {
      carrier  = rest[rest.length - 1]
      customer = rest.slice(0, rest.length - 1).join(" ")
    }

    if (!carrier) continue

    rows.push({
      customer: customer.trim(),
      carrier:  normaliseCarrier(carrier),
      policy,
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
 * After pdfjs row-grouping each data line is roughly:
 *   Producer  Customer  Carrier  Policy  [LOB]  TRX  EffDate  $premium  $comm  $splitComm
 *
 * Lines to skip:
 *  - Header rows
 *  - Subtotal lines: "Subtotal: Michael Turner  $x  $x  $x"
 *  - Branch Total / Overall Branch Total
 *  - Commission Summary carrier rows (only 1-2 text tokens before money cols)
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
    if (before.length < 4) continue

    // Guard: producer token must look like a known producer
    const producerToken = before[0]
    const looksLikeProducer = KNOWN_PRODUCERS.some(p =>
      producerToken.toLowerCase().includes(p.toLowerCase().split(" ")[0])
    )
    if (!looksLikeProducer) continue

    let bi = before.length - 1

    // Eff date: YYYY-MM-DD
    if (bi >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(before[bi])) bi--

    // TRX code: 1-4 uppercase letters (NB, RB, MSC, etc.)
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
  const carrierMap       = new Map<string, CarrierBreakdown>()
  const carrierPolicies  = new Map<string, Set<string>>()
  const customerPolicies = new Map<string, Set<string>>()
  const uniquePolicies   = new Set<string>()

  let totalPremium = 0
  let totalSplit   = 0
  let nbCount      = 0

  for (const row of rows) {
    if (Math.abs(row.premium) < 0.01) continue

    totalPremium += row.premium
    totalSplit   += row.splitComm

    const fullTrx = row.lob + row.trx
    if (isNewBusiness(row.trx) || isNewBusiness(fullTrx)) nbCount++

    if (row.policy) uniquePolicies.add(row.policy)

    if (row.customer && row.policy) {
      if (!customerPolicies.has(row.customer)) customerPolicies.set(row.customer, new Set())
      customerPolicies.get(row.customer)!.add(row.policy)
    }

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
    const rowsA = parseFormatA(lines)
    const rowsB = parseFormatB(lines)
    rows = rowsA.length >= rowsB.length ? rowsA : rowsB
  }

  const result          = aggregate(rows)
  result.statementMonth = month
  result.format         = rows.length > 0 ? (format === "unknown" ? "A" : format) : "unknown"
  return result
}
