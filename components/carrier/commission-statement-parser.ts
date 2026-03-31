/**
 * EZLynx Book of Business Detail Report — CSV Parser
 *
 * Parses the CSV export from EZLynx (EZ Links → Book of Business Detail Report).
 *
 * Key columns used:
 *   Account Name            — customer identifier
 *   Policy Number           — unique policy identifier
 *   Master Company          — carrier name
 *   Line Of Business        — LOB label
 *   Total Annualized Premium / TotalWrittenPremium
 *   LOB Origination Date    — date this LOB was first written; equals Policy Effective Date for new business
 *   Policy Effective Date   — current term effective date
 *   ExpiringPolicies        — 1 if this policy is expiring/up for renewal
 *   TotalCustomers, Total Policies, Average Policies Per Customer — pre-aggregated per row
 *
 * New business detection:
 *   A policy is "new business" when LOB Origination Date === Policy Effective Date
 *   (meaning it was first written in the current term, not a renewal)
 */

export interface CommissionParseResult {
  book_avg_premium_per_policy: number | null
  book_new_business_pct: number | null
  book_policies_per_customer: number | null
  book_monoline_pct: number | null          // % of customers with only 1 policy
  totalWrittenPremium: number | null
  totalSplitCommission: number | null
  totalPolicies: number | null
  totalCustomers: number | null
  newBusinessCount: number | null
  totalTransactions: number | null
  carrierBreakdown: CarrierBreakdown[]
  statementMonth: string | null
  format: "CSV" | "unknown"
}

export interface CarrierBreakdown {
  carrier: string
  writtenPremium: number
  splitCommission: number
  policyCount: number
  newBusinessCount: number
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

/**
 * Parse a single CSV line respecting quoted fields (handles commas inside quotes).
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'; i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

function parseDollar(s: string): number {
  if (!s) return 0
  const neg = s.includes("(") || s.trimStart().startsWith("-")
  const clean = s.replace(/[$(),\s]/g, "").replace(/-/g, "")
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : neg ? -n : n
}

function normaliseCarrier(raw: string): string {
  if (!raw || raw === "Unknown") return "Unknown Carrier"
  const r = raw.toLowerCase()
  if (r.includes("progressive"))              return "Progressive"
  if (r.includes("hartford"))                 return "The Hartford"
  if (r.includes("travelers"))                return "Travelers"
  if (r.includes("allstate"))                 return "Allstate"
  if (r.includes("safeco"))                   return "Safeco"
  if (r.includes("nationwide"))               return "Nationwide"
  if (r.includes("liberty mutual"))           return "Liberty Mutual"
  if (r.includes("ohio security"))            return "Liberty Mutual"
  if (r.includes("ohio cas"))                 return "Liberty Mutual"
  if (r.includes("american fire"))            return "Liberty Mutual"
  if (r.includes("west amer"))                return "Liberty Mutual"
  if (r.includes("general ins co of amer"))   return "Liberty Mutual"
  if (r.includes("first natl ins co of amer")) return "Liberty Mutual"
  if (r.includes("safeco ins co of or"))      return "Liberty Mutual"
  if (r.includes("state auto"))               return "State Auto"
  if (r.includes("employers"))                return "Employers"
  if (r.includes("cna"))                      return "CNA"
  if (r.includes("markel"))                   return "Markel"
  if (r.includes("applied underwriters"))     return "Applied Underwriters"
  return raw.trim()
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseCommissionStatement(csvText: string): CommissionParseResult {
  const lines = csvText.split(/\r?\n/).filter(Boolean)

  if (lines.length < 2) {
    return emptyResult()
  }

  // Find header row (first row containing "Account Name" or "Policy Number")
  let headerIdx = -1
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (/account.?name/i.test(lines[i]) && /policy.?number/i.test(lines[i])) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return emptyResult()

  const headers = parseCSVLine(lines[headerIdx]).map(h => h.toLowerCase().replace(/\s+/g, " ").trim())

  const col = (name: string): number => {
    const idx = headers.findIndex(h => h.includes(name.toLowerCase()))
    return idx
  }

  const iAccountName        = col("account name")
  const iPolicyNumber       = col("policy number")
  const iMasterCompany      = col("master company")
  const iLineOfBusiness     = col("line of business")
  const iTotalAnnPremium    = col("total annualized premium")
  const iTotalWrittenPrem   = col("totalwrittenpremium")
  const iLOBOriginationDate = col("lob origination date")
  const iPolicyEffDate      = col("policy effective date")
  const iExpiringPolicies   = col("expiringpolicies")
  const iPolicyStatus       = col("policy status")

  // Prefer TotalWrittenPremium, fall back to Total Annualized Premium
  const iPremium = iTotalWrittenPrem >= 0 ? iTotalWrittenPrem : iTotalAnnPremium

  if (iAccountName < 0 || iPolicyNumber < 0 || iPremium < 0) {
    return emptyResult()
  }

  // ── Parse rows ──────────────────────────────────────────────────────────────
  interface Row {
    customer: string
    policy: string
    carrier: string
    lob: string
    premium: number
    isNewBusiness: boolean
    isExpiring: boolean
  }

  const rows: Row[] = []

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const fields = parseCSVLine(line)
    if (fields.length < headers.length - 5) continue // allow a few missing cols

    const status = iPolicyStatus >= 0 ? fields[iPolicyStatus] ?? "" : "Active"
    // Skip cancelled/lapsed policies
    if (/cancel|lapsed|expired/i.test(status)) continue

    const customer    = fields[iAccountName]   ?? ""
    const policy      = fields[iPolicyNumber]  ?? ""
    const carrier     = fields[iMasterCompany] ?? ""
    const lob         = iLineOfBusiness >= 0 ? (fields[iLineOfBusiness] ?? "") : ""
    const premium     = parseDollar(fields[iPremium] ?? "0")

    // New business: origination date == effective date (first-time write)
    let isNewBusiness = false
    if (iLOBOriginationDate >= 0 && iPolicyEffDate >= 0) {
      const origDate = fields[iLOBOriginationDate]?.trim() ?? ""
      const effDate  = fields[iPolicyEffDate]?.trim() ?? ""
      isNewBusiness = origDate.length > 0 && origDate === effDate
    }

    const isExpiring = iExpiringPolicies >= 0
      ? parseInt(fields[iExpiringPolicies] ?? "0", 10) > 0
      : false

    if (!customer && !policy) continue
    if (Math.abs(premium) < 0.01) continue

    rows.push({ customer, policy, carrier, lob, premium, isNewBusiness, isExpiring })
  }

  if (rows.length === 0) return emptyResult()

  // ── Aggregate ───────────────────────────────────────────────────────────────
  // Track unique policies (by policy number) to avoid double-counting rows
  // that share a policy number (e.g. multiple LOBs on same policy)
  const policyPremium    = new Map<string, number>()  // policyNum → premium
  const policyIsNewBiz   = new Map<string, boolean>() // policyNum → isNewBusiness
  const policyCarrier    = new Map<string, string>()  // policyNum → carrier
  const customerPolicies = new Map<string, Set<string>>() // customer → Set<policyNum>
  const carrierMap       = new Map<string, CarrierBreakdown>()
  const carrierPolicies  = new Map<string, Set<string>>()

  for (const row of rows) {
    const key = row.policy || `${row.customer}__${row.lob}`

    // Accumulate premium per unique policy key
    policyPremium.set(key, (policyPremium.get(key) ?? 0) + row.premium)

    // A policy is new business if ANY row for it is flagged as new
    if (row.isNewBusiness) policyIsNewBiz.set(key, true)
    else if (!policyIsNewBiz.has(key)) policyIsNewBiz.set(key, false)

    // Associate carrier with policy (first wins)
    if (!policyCarrier.has(key)) policyCarrier.set(key, row.carrier)

    // Track policies per customer
    if (row.customer) {
      if (!customerPolicies.has(row.customer)) customerPolicies.set(row.customer, new Set())
      customerPolicies.get(row.customer)!.add(key)
    }
  }

  // Now aggregate over unique policies
  let totalPremium = 0
  let nbCount      = 0

  for (const [key, premium] of policyPremium) {
    totalPremium += premium
    if (policyIsNewBiz.get(key)) nbCount++

    const carrier = normaliseCarrier(policyCarrier.get(key) ?? "")
    if (!carrierMap.has(carrier)) {
      carrierMap.set(carrier, { carrier, writtenPremium: 0, splitCommission: 0, policyCount: 0, newBusinessCount: 0 })
    }
    const cb = carrierMap.get(carrier)!
    cb.writtenPremium += premium
    if (policyIsNewBiz.get(key)) cb.newBusinessCount++

    if (!carrierPolicies.has(carrier)) carrierPolicies.set(carrier, new Set())
    carrierPolicies.get(carrier)!.add(key)
  }

  for (const [carrier, pols] of carrierPolicies) {
    const cb = carrierMap.get(carrier)
    if (cb) cb.policyCount = pols.size
  }

  const breakdown      = Array.from(carrierMap.values()).sort((a, b) => b.writtenPremium - a.writtenPremium)
  const totalPolicies  = policyPremium.size
  const totalCustomers = customerPolicies.size

  // avg premium = total premium ÷ unique policy count
  const avgPremPerPol = totalPolicies > 0
    ? Math.round(totalPremium / totalPolicies)
    : null

  // new business % = new business unique policies ÷ total unique policies
  const newBizPct = totalPolicies > 0
    ? parseFloat(((nbCount / totalPolicies) * 100).toFixed(1))
    : null

  // policies per customer = total unique policies ÷ unique customers
  const polsPerCx = totalCustomers > 0
    ? parseFloat((totalPolicies / totalCustomers).toFixed(2))
    : null

  // monoline % = customers with exactly 1 policy ÷ total customers
  let monolineCount = 0
  for (const pols of customerPolicies.values()) {
    if (pols.size === 1) monolineCount++
  }
  const monolinePct = totalCustomers > 0
    ? parseFloat(((monolineCount / totalCustomers) * 100).toFixed(1))
    : null

  // Extract a month label from any date field in the first data row
  let statementMonth: string | null = null
  if (rows.length > 0 && iPolicyEffDate >= 0) {
    const firstFields = parseCSVLine(lines[headerIdx + 1] ?? "")
    const dateStr = firstFields[iPolicyEffDate] ?? ""
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) {
      const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
      statementMonth = `${months[parseInt(m[2], 10) - 1]} ${m[1]}`
    }
  }

  return {
    book_avg_premium_per_policy:  avgPremPerPol,
    book_new_business_pct:        newBizPct,
    book_policies_per_customer:   polsPerCx,
    book_monoline_pct:            monolinePct,
    totalWrittenPremium:          Math.round(totalPremium),
    totalSplitCommission:         null, // CSV does not include commission split
    totalPolicies,
    totalCustomers,
    newBusinessCount:             nbCount,
    totalTransactions:            rows.length,
    carrierBreakdown:             breakdown,
    statementMonth,
    format:                       "CSV",
  }
}

function emptyResult(): CommissionParseResult {
  return {
    book_avg_premium_per_policy:  null,
    book_new_business_pct:        null,
    book_policies_per_customer:   null,
    book_monoline_pct:            null,
    totalWrittenPremium:          null,
    totalSplitCommission:         null,
    totalPolicies:                null,
    totalCustomers:               null,
    newBusinessCount:             null,
    totalTransactions:            null,
    carrierBreakdown:             [],
    statementMonth:               null,
    format:                       "unknown",
  }
}
