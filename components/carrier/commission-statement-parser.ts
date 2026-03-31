/**
 * EZLynx Book of Business Detail Report — CSV Parser
 *
 * Parses the CSV export from EZLynx (EZ Links → Book of Business Detail Report).
 *
 * Key columns used:
 *   Account Name            — customer identifier
 *   Policy Number           — unique policy identifier
 *   Policy Type             — "Personal" | "Commercial"
 *   Master Company          — carrier name
 *   Line Of Business        — LOB label
 *   TotalWrittenPremium / Total Annualized Premium
 *   LOB Origination Date    — equals Policy Effective Date for new business
 *   Policy Effective Date   — current term effective date
 *   ExpiringPolicies        — 1 if this policy is expiring/up for renewal
 *
 * New business detection:
 *   A policy is "new business" when LOB Origination Date === Policy Effective Date
 */

import type { CarrierName, BookType } from "./carrier-engine"

export interface LobBreakdown {
  auto: number          // Personal Auto premium
  home: number          // Home / Condo / Renters / Dwelling premium
  commercial: number    // BOP / GL / Comm Pkg / Comm Prpty / Inland Marine / Crime / CPP premium
  wc: number            // Workers Comp premium
  other: number         // Umbrella / Excess / Flood / Other premium
}

export interface CommissionParseResult {
  // ── Detected context ──────────────────────────────────────────────────────
  detectedCarrier:   CarrierName | null
  detectedBookType:  BookType    | null

  // ── LOB premium breakdown ─────────────────────────────────────────────────
  lobBreakdown: LobBreakdown

  // ── Book quality (used by Book Quality section) ───────────────────────────
  book_avg_premium_per_policy: number | null
  book_new_business_pct:       number | null
  book_policies_per_customer:  number | null
  book_monoline_pct:           number | null   // % customers with only 1 policy

  // ── Aggregates ────────────────────────────────────────────────────────────
  totalWrittenPremium:  number | null
  newBusinessPremium:   number | null          // premium attributable to new biz policies
  totalSplitCommission: number | null
  totalPolicies:        number | null          // unique policy count (PIF proxy)
  totalCustomers:       number | null
  newBusinessCount:     number | null
  expiringCount:        number | null          // policies flagged as expiring
  totalTransactions:    number | null          // raw row count
  carrierBreakdown:     CarrierBreakdown[]
  statementMonth:       string | null
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

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim()); current = ""
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

// ─── Carrier normalisation ────────────────────────────────────────────────────

function normaliseCarrierDisplay(raw: string): string {
  if (!raw || raw === "Unknown") return "Unknown Carrier"
  const r = raw.toLowerCase()
  if (r.includes("progressive"))               return "Progressive"
  if (r.includes("hartford"))                  return "The Hartford"
  if (r.includes("travelers"))                 return "Travelers"
  if (r.includes("allstate"))                  return "Allstate"
  if (r.includes("safeco"))                    return "Safeco"
  if (r.includes("nationwide"))                return "Nationwide"
  if (
    r.includes("liberty mutual") ||
    r.includes("ohio security") ||
    r.includes("ohio cas") ||
    r.includes("american fire") ||
    r.includes("west amer") ||
    r.includes("general ins co of amer") ||
    r.includes("first natl ins co of amer") ||
    r.includes("safeco ins co of or")
  ) return "Liberty Mutual"
  if (r.includes("state auto"))                return "State Auto"
  if (r.includes("employers"))                 return "Employers"
  if (r.includes("cna"))                       return "CNA"
  if (r.includes("markel"))                    return "Markel"
  if (r.includes("berkshire") || r.includes("bh guard") || r.includes("guard insurance"))
    return "Berkshire / BH Guard"
  if (r.includes("applied underwriters"))      return "Applied Underwriters"
  return raw.trim()
}

/** Maps display name → CarrierName engine key */
function toCarrierKey(display: string): CarrierName | null {
  switch (display) {
    case "Progressive":             return "progressive"
    case "The Hartford":            return "hartford"
    case "Travelers":               return "travelers"
    case "Safeco":                  return "safeco"
    case "Liberty Mutual":          return "libertymutual"
    case "Berkshire / BH Guard":    return "berkshire"
    default:                        return null
  }
}

// ─── LOB grouping ─────────────────────────────────────────────────────────────

type LobGroup = keyof LobBreakdown

function classifyLob(lob: string, policyType?: string): LobGroup {
  const l = lob.toLowerCase()
  const isPersonal = /personal/i.test(policyType ?? "")
  const isCommercial = /commercial/i.test(policyType ?? "")

  // Workers Comp — always its own bucket
  if (l.includes("workers comp") || l.includes("work comp") || l.includes("wc"))
    return "wc"

  // Auto — personal or commercial
  if (
    l.includes("auto (personal)") || l.includes("private passenger") ||
    (l.includes("auto") && isPersonal)
  ) return "auto"

  if (l.includes("auto (commercial)") || (l.includes("auto") && isCommercial))
    return "commercial"

  // Catch motorcycle/watercraft — personal = "other" bucket (Special Lines)
  if (l.includes("motorcycle") || l.includes("watercraft") || l.includes("boat"))
    return "other"

  // Home / personal property
  if (
    l.includes("homeowner") || l.includes("home owner") || l.includes("dwelling") ||
    l.includes("condo") || l.includes("renters") || l.includes("tenant") ||
    l.includes("landlord") || l.includes("mobile home")
  ) return "home"

  // Umbrella / Excess — keep in "other" (PL umbrella not CL)
  if (l.includes("umbrella") || l.includes("excess liability"))
    return "other"

  // Commercial lines (BOP, GL, Pkg, Prpty, Inland Marine, Crime, CPP, Flood, Artisan)
  if (
    l.includes("bop") || l.includes("business owner") || l.includes("genl liab") ||
    l.includes("general liab") || l.includes("commercial") || l.includes("inland marine") ||
    l.includes("crime") || l.includes("cpp") || l.includes("flood") || l.includes("surety") ||
    l.includes("professional") || l.includes("artisan") || l.includes("truckers")
  ) return "commercial"

  // Catch-all
  return "other"
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseCommissionStatement(csvText: string): CommissionParseResult {
  const lines = csvText.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return emptyResult()

  // Find header row
  let headerIdx = -1
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (/account.?name/i.test(lines[i]) && /policy.?number/i.test(lines[i])) {
      headerIdx = i; break
    }
  }
  if (headerIdx === -1) return emptyResult()

  const headers = parseCSVLine(lines[headerIdx]).map(h =>
    h.toLowerCase().replace(/\s+/g, " ").trim()
  )
  const col = (name: string) =>
    headers.findIndex(h => h.includes(name.toLowerCase()))

  const iAccountName        = col("account name")
  const iPolicyNumber       = col("policy number")
  const iPolicyType         = col("policy type")
  const iMasterCompany      = col("master company")
  const iWritingCompany     = col("writing company")
  const iLineOfBusiness     = col("line of business")
  const iTotalAnnPremium    = col("total annualized premium")
  const iTotalWrittenPrem   = col("totalwrittenpremium")
  const iLOBOriginationDate = col("lob origination date")
  const iPolicyEffDate      = col("policy effective date")
  const iExpiringPolicies   = col("expiringpolicies")
  const iPolicyStatus       = col("policy status")

  // Use annualized premium — this normalises 6-month policies to annual,
  // matching what carriers show in their production reports (e.g. Progressive ADP).
  // Fall back to written premium if annualized not present.
  const iPremium = iTotalAnnPremium >= 0 ? iTotalAnnPremium : iTotalWrittenPrem

  if (iAccountName < 0 || iPolicyNumber < 0 || iPremium < 0) return emptyResult()

  // ── Parse rows ──────────────────────────────────────────────────────────────
  interface Row {
    customer: string
    policy: string
    carrier: string           // normalised display name
    policyType: string        // "Personal" | "Commercial"
    lob: string
    lobGroup: LobGroup
    premium: number
    isNewBusiness: boolean
    isExpiring: boolean
  }

  const rows: Row[] = []

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const fields = parseCSVLine(line)
    if (fields.length < headers.length - 8) continue

    const status = iPolicyStatus >= 0 ? fields[iPolicyStatus] ?? "" : "Active"
    if (/cancel|lapsed|expired/i.test(status)) continue

    const customer   = fields[iAccountName]    ?? ""
    const policy     = fields[iPolicyNumber]   ?? ""
    const policyType = iPolicyType >= 0 ? (fields[iPolicyType] ?? "") : ""
    const lob        = iLineOfBusiness >= 0 ? (fields[iLineOfBusiness] ?? "") : ""
    const premium    = parseDollar(fields[iPremium] ?? "0")

    // Prefer Master Company; fall back to Writing Company
    const masterCo  = iMasterCompany  >= 0 ? (fields[iMasterCompany]  ?? "") : ""
    const writingCo = iWritingCompany >= 0 ? (fields[iWritingCompany] ?? "") : ""
    const rawCarrier = masterCo || writingCo
    const carrier    = normaliseCarrierDisplay(rawCarrier)

    let isNewBusiness = false
    if (iLOBOriginationDate >= 0 && iPolicyEffDate >= 0) {
      const orig = fields[iLOBOriginationDate]?.trim() ?? ""
      const eff  = fields[iPolicyEffDate]?.trim() ?? ""
      isNewBusiness = orig.length > 0 && orig === eff
    }

    const isExpiring = iExpiringPolicies >= 0
      ? parseInt(fields[iExpiringPolicies] ?? "0", 10) > 0
      : false

    if (!customer && !policy) continue
    if (Math.abs(premium) < 0.01) continue

    rows.push({
      customer, policy, carrier, policyType, lob,
      lobGroup: classifyLob(lob, policyType),
      premium, isNewBusiness, isExpiring,
    })
  }

  if (rows.length === 0) return emptyResult()

  // ── Detect carrier & book type from majority of rows ──────────────────────
  const carrierVotes = new Map<string, number>()
  let personalCount = 0, commercialCount = 0

  for (const row of rows) {
    carrierVotes.set(row.carrier, (carrierVotes.get(row.carrier) ?? 0) + 1)
    if (/personal/i.test(row.policyType))   personalCount++
    if (/commercial/i.test(row.policyType)) commercialCount++
  }

  const topCarrierDisplay = [...carrierVotes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""
  const detectedCarrier   = toCarrierKey(topCarrierDisplay)

  let detectedBookType: BookType | null = null
  if (personalCount > 0 && commercialCount > 0)         detectedBookType = "both"
  else if (personalCount > 0 && commercialCount === 0)  detectedBookType = "personal"
  else if (commercialCount > 0 && personalCount === 0)  detectedBookType = "commercial"

  // ── Aggregate over unique policy keys ────────────────────────────────────
  const policyPremium    = new Map<string, number>()
  const policyIsNewBiz   = new Map<string, boolean>()
  const policyIsExpiring = new Map<string, boolean>()
  const policyCarrier    = new Map<string, string>()
  const policyLobGroup   = new Map<string, LobGroup>()
  const customerPolicies = new Map<string, Set<string>>()
  const carrierMap       = new Map<string, CarrierBreakdown>()
  const carrierPolicies  = new Map<string, Set<string>>()

  for (const row of rows) {
    const key = row.policy || `${row.customer}__${row.lob}`
    policyPremium.set(key, (policyPremium.get(key) ?? 0) + row.premium)
    if (row.isNewBusiness) policyIsNewBiz.set(key, true)
    else if (!policyIsNewBiz.has(key)) policyIsNewBiz.set(key, false)
    if (row.isExpiring) policyIsExpiring.set(key, true)
    else if (!policyIsExpiring.has(key)) policyIsExpiring.set(key, false)
    if (!policyCarrier.has(key))  policyCarrier.set(key, row.carrier)
    if (!policyLobGroup.has(key)) policyLobGroup.set(key, row.lobGroup)
    if (row.customer) {
      if (!customerPolicies.has(row.customer)) customerPolicies.set(row.customer, new Set())
      customerPolicies.get(row.customer)!.add(key)
    }
  }

  let totalPremium = 0
  let nbCount = 0
  let nbPremium = 0
  let expiringCount = 0
  const lob: LobBreakdown = { auto: 0, home: 0, commercial: 0, wc: 0, other: 0 }

  for (const [key, premium] of policyPremium) {
    totalPremium += premium
    const isNB  = policyIsNewBiz.get(key) ?? false
    const isExp = policyIsExpiring.get(key) ?? false
    if (isNB) { nbCount++; nbPremium += premium }
    if (isExp) expiringCount++

    const lobGroup = policyLobGroup.get(key) ?? "other"
    lob[lobGroup] += premium

    const carrier = normaliseCarrierDisplay(policyCarrier.get(key) ?? "")
    if (!carrierMap.has(carrier)) {
      carrierMap.set(carrier, { carrier, writtenPremium: 0, splitCommission: 0, policyCount: 0, newBusinessCount: 0 })
    }
    const cb = carrierMap.get(carrier)!
    cb.writtenPremium += premium
    if (isNB) cb.newBusinessCount++
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

  const avgPremPerPol = totalPolicies > 0 ? Math.round(totalPremium / totalPolicies) : null
  const newBizPct     = totalPolicies > 0 ? parseFloat(((nbCount / totalPolicies) * 100).toFixed(1)) : null
  const polsPerCx     = totalCustomers > 0 ? parseFloat((totalPolicies / totalCustomers).toFixed(2)) : null

  let monolineCount = 0
  for (const pols of customerPolicies.values()) { if (pols.size === 1) monolineCount++ }
  const monolinePct = totalCustomers > 0 ? parseFloat(((monolineCount / totalCustomers) * 100).toFixed(1)) : null

  // Round LOB values to nearest dollar
  ;(Object.keys(lob) as LobGroup[]).forEach(k => { lob[k] = Math.round(lob[k]) })

  // Statement month from first data row effective date
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
    detectedCarrier,
    detectedBookType,
    lobBreakdown:              lob,
    book_avg_premium_per_policy: avgPremPerPol,
    book_new_business_pct:       newBizPct,
    book_policies_per_customer:  polsPerCx,
    book_monoline_pct:           monolinePct,
    totalWrittenPremium:         Math.round(totalPremium),
    newBusinessPremium:          Math.round(nbPremium),
    totalSplitCommission:        null,
    totalPolicies,
    totalCustomers,
    newBusinessCount:            nbCount,
    expiringCount,
    totalTransactions:           rows.length,
    carrierBreakdown:            breakdown,
    statementMonth,
    format:                      "CSV",
  }
}

function emptyResult(): CommissionParseResult {
  return {
    detectedCarrier:             null,
    detectedBookType:            null,
    lobBreakdown:                { auto: 0, home: 0, commercial: 0, wc: 0, other: 0 },
    book_avg_premium_per_policy: null,
    book_new_business_pct:       null,
    book_policies_per_customer:  null,
    book_monoline_pct:           null,
    totalWrittenPremium:         null,
    newBusinessPremium:          null,
    totalSplitCommission:        null,
    totalPolicies:               null,
    totalCustomers:              null,
    newBusinessCount:            null,
    expiringCount:               null,
    totalTransactions:           null,
    carrierBreakdown:            [],
    statementMonth:              null,
    format:                      "unknown",
  }
}
