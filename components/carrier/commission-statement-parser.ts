/**
 * Commission Statement Parser
 *
 * Handles two Horizon Agency Systems EZLynx report formats:
 *
 * FORMAT A — "Commissions By Producer" (older layout)
 *   Header row: ProducerAccount NameMaster CompanyPolicy NumberLOB CodeTransaction TypePremium - WrittenTotal CommissionCommission SplitPayee
 *   Data rows : Michael Turner  Allstate  436468877  HOME  NBS  $2,305.18  $345.78  $293.91  Michael Turner
 *
 * FORMAT B — "Commission Detail" (newer layout)
 *   Header row: ProducerAccountMaster CompanyPolicyLOBTRXEff DatePremiumCommSplit Comm
 *   Data rows : Michael Turner  Rebecka Dornford  Permanent General...  TX6490273  RB  2025-10-05  $360.53  $28.87  $24.54
 *
 * Extracted fields (map to CarrierInputs book quality fields):
 *   - book_avg_premium_per_policy    (total written premium / policy count)
 *   - book_new_business_pct          (NB/NBS transactions / total transactions)
 *   - book_policies_per_customer     (unique policies / unique customers)
 *   - totalWrittenPremium            (sum of all premium - written, $)
 *   - totalSplitCommission           (net split commission earned)
 *   - carrierBreakdown               (premium by carrier for cross-reference)
 */

export interface CommissionParseResult {
  // Book quality fields
  book_avg_premium_per_policy: number | null
  book_new_business_pct: number | null
  book_policies_per_customer: number | null
  // Summary metrics (for display)
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

// ─── Public entry point ───────────────────────────────────────────────────────

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
