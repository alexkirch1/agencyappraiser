import { generateText, Output } from "ai"
import { z } from "zod"

// ─── Deterministic Book of Business Detail CSV parser ─────────────────────────
// Works with EZLynx "Book of Business Detail" exports which are row-per-policy.
// Columns identified from real export:
//   Applicant ID, Account Name, Assigned Producer, CSR, Branch, Lead Source,
//   Policy Type, Line Of Business, SubLOB, Master Company, Billing Company,
//   Policy Number, Policy Term, Policy Effective Date, LOB Origination Date,
//   Service Team, Address - City/Line1/etc., Address - State, Address - Zip,
//   Writing Company, Rating State, Policy Status, Producer Code, ...
//   Department, Last Modified Date, Policy Expiration Date, Cancellation Date,
//   Change Date, Download Date, Total Annualized Premium, TotalWrittenPremium,
//   Average Annualized Premium, Average Written Premium, Total Policies,
//   TotalCustomers, ExpiringPolicies, Average Policies Per Customer

function parseAmount(val: string): number {
  if (!val) return 0
  return parseFloat(val.replace(/[$,"\s]/g, "")) || 0
}

function splitCSVRow(line: string): string[] {
  const cols: string[] = []
  let current = ""
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === "," && !inQuotes) { cols.push(current.trim()); current = "" }
    else { current += ch }
  }
  cols.push(current.trim())
  return cols
}

function mostCommon(arr: string[]): string | null {
  if (!arr.length) return null
  const counts: Record<string, number> = {}
  for (const v of arr) if (v) counts[v] = (counts[v] || 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function isBookOfBusinessCSV(headers: string[]): boolean {
  const h = headers.map((h) => h.toLowerCase())
  return (
    h.some((x) => x.includes("policy type")) &&
    h.some((x) => x.includes("total annualized premium")) &&
    h.some((x) => x.includes("expiring"))
  )
}

function computeFromBookOfBusiness(csv: string): Record<string, unknown> | null {
  const lines = csv.split("\n").filter((l) => l.trim())
  if (lines.length < 2) return null

  // Find header row (first line that matches our signature)
  const headerIdx = lines.findIndex((l) => {
    const lower = l.toLowerCase()
    return lower.includes("policy type") && lower.includes("total annualized premium")
  })
  if (headerIdx === -1) return null

  const headers = splitCSVRow(lines[headerIdx])
  const col = (name: string) =>
    headers.findIndex((h) => h.toLowerCase().replace(/[^a-z]/g, "").includes(name.toLowerCase().replace(/[^a-z]/g, "")))

  const iType       = col("PolicyType")
  const iDept       = col("Department")
  const iStatus     = col("PolicyStatus")
  const iAnnual     = col("TotalAnnualizedPremium")
  const iWritten    = col("TotalWrittenPremium")
  const iPolicies   = col("TotalPolicies")
  const iExpiring   = col("ExpiringPolicies")
  const iBranch     = col("Branch")
  const iState      = col("RatingState")
  const iLOB        = col("LineOfBusiness")
  const iProducer   = col("AssignedProducer")
  const iOrigDate   = col("LOBOriginationDate")

  // Parse all active policy rows
  type Row = {
    policyType: string; dept: string; lob: string
    annualized: number; written: number
    policies: number; expiring: number
    branch: string; state: string; producer: string
    originDate: string
  }

  const rows: Row[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = splitCSVRow(lines[i])
    if (cols.length < 5) continue

    const status = (cols[iStatus] ?? "").toLowerCase()
    if (!status.startsWith("active")) continue

    rows.push({
      policyType:  cols[iType]     ?? "",
      dept:        cols[iDept]     ?? "",
      lob:         cols[iLOB]      ?? "",
      annualized:  parseAmount(cols[iAnnual]  ?? ""),
      written:     parseAmount(cols[iWritten] ?? ""),
      policies:    parseFloat(cols[iPolicies] ?? "1") || 1,
      expiring:    parseFloat(cols[iExpiring] ?? "0") || 0,
      branch:      cols[iBranch]   ?? "",
      state:       cols[iState]    ?? "",
      producer:    cols[iProducer] ?? "",
      originDate:  cols[iOrigDate] ?? "",
    })
  }

  if (rows.length === 0) return null

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalPIF       = rows.reduce((s, r) => s + r.policies, 0)
  const totalAnnual    = rows.reduce((s, r) => s + r.annualized, 0)
  const totalWritten   = rows.reduce((s, r) => s + r.written, 0)
  const totalExpiring  = rows.reduce((s, r) => s + r.expiring, 0)

  // ── PL / CL split ─────────────────────────────────────────────────────────
  const isPersonal = (r: Row) =>
    r.dept.toLowerCase().includes("personal") || r.policyType.toLowerCase() === "personal"
  const isCommercial = (r: Row) =>
    r.dept.toLowerCase().includes("commercial") || r.policyType.toLowerCase() === "commercial"

  const plRows = rows.filter(isPersonal)
  const clRows = rows.filter(isCommercial)
  const plAnnual  = plRows.reduce((s, r) => s + r.annualized, 0)
  const clAnnual  = clRows.reduce((s, r) => s + r.annualized, 0)
  const plPolicies = plRows.reduce((s, r) => s + r.policies, 0)
  const clPolicies = clRows.reduce((s, r) => s + r.policies, 0)

  const personalPct   = totalAnnual > 0 ? Math.round((plAnnual / totalAnnual) * 100) : null
  const commercialPct = totalAnnual > 0 ? Math.round((clAnnual / totalAnnual) * 100) : null

  // ── Retention ─────────────────────────────────────────────────────────────
  // ExpiringPolicies=1 means this policy had a prior term expiring — if it's
  // still Active, it renewed. Retention = renewed / total that were expiring.
  const renewedCount = rows.filter((r) => r.expiring >= 1).length
  const retention = totalExpiring > 0
    ? Math.round((renewedCount / totalExpiring) * 1000) / 10
    : null

  // ── New business ──────────────────────────────────────────────────────────
  // ExpiringPolicies=0 on an active policy = new business (no prior term)
  const newBizRows     = rows.filter((r) => r.expiring === 0)
  const newBizPolicies = newBizRows.reduce((s, r) => s + r.policies, 0)
  const newBizPremium  = newBizRows.reduce((s, r) => s + r.annualized, 0)

  // ── Agency / state info ───────────────────────────────────────────────────
  const agencyName  = mostCommon(rows.map((r) => r.branch).filter(Boolean))
  const primaryState = mostCommon(rows.map((r) => r.state).filter(Boolean))

  // ── Unique producers ──────────────────────────────────────────────────────
  const producers = new Set(
    rows.map((r) => r.producer).filter((p) => p && !p.toLowerCase().startsWith("zz-") && p.toLowerCase() !== "unknown")
  )
  const producerCount = producers.size || null

  // ── Revenue estimate ─────────────────────────────────────────────────────
  // Commission rates: PL auto ~10-12%, PL home ~12-15%, CL ~8-10%
  // Use blended 11% PL, 9% CL as conservative estimate
  const estimatedRevenue = Math.round(plAnnual * 0.11 + clAnnual * 0.09)

  // ── LOB breakdown ─────────────────────────────────────────────────────────
  const lobCounts: Record<string, number> = {}
  for (const r of rows) if (r.lob) lobCounts[r.lob] = (lobCounts[r.lob] || 0) + r.policies
  const topLobs = Object.entries(lobCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)

  return {
    agency_name:          agencyName,
    primary_state:        primaryState,
    producer_count:       producerCount,
    total_pif:            Math.round(totalPIF),
    total_premium:        Math.round(totalAnnual),
    personal_lines_pct:   personalPct,
    commercial_lines_pct: commercialPct,
    overall_retention:    retention,
    new_business_premium: Math.round(newBizPremium),
    new_business_policies: Math.round(newBizPolicies),
    revenue_ltm:          estimatedRevenue > 0 ? estimatedRevenue : null,
    _meta: {
      source:               "book_of_business_detail",
      active_rows:          rows.length,
      pl_policies:          Math.round(plPolicies),
      cl_policies:          Math.round(clPolicies),
      pl_premium:           Math.round(plAnnual),
      cl_premium:           Math.round(clAnnual),
      total_written_premium: Math.round(totalWritten),
      renewed_count:        renewedCount,
      total_expiring:       Math.round(totalExpiring),
      new_biz_count:        Math.round(newBizPolicies),
      top_lobs:             topLobs.map(([lob, count]) => `${lob}: ${count}`),
      revenue_is_estimated: true,
    },
  }
}

// ─── AI schema (fallback for PDFs / other report types) ───────────────────────

const AmsDataSchema = z.object({
  agency_name:           z.string().nullable(),
  primary_state:         z.string().nullable(),
  employee_count:        z.number().nullable(),
  producer_count:        z.number().nullable(),
  years_in_business:     z.number().nullable(),
  total_pif:             z.number().nullable(),
  total_premium:         z.number().nullable(),
  personal_lines_pct:    z.number().nullable(),
  commercial_lines_pct:  z.number().nullable(),
  overall_retention:     z.number().nullable(),
  pl_retention:          z.number().nullable(),
  cl_retention:          z.number().nullable(),
  new_business_premium:  z.number().nullable(),
  new_business_policies: z.number().nullable(),
  overall_loss_ratio:    z.number().nullable(),
  pl_loss_ratio:         z.number().nullable(),
  cl_loss_ratio:         z.number().nullable(),
  revenue_ltm:           z.number().nullable(),
  revenue_prior_year:    z.number().nullable(),
})

type AmsData = z.infer<typeof AmsDataSchema>

const SYSTEM_PROMPT = `You are a specialist in extracting data from EZLynx insurance agency management system reports.
Return null for any field not found. Dollar amounts as full numbers. Percentages as numbers (88.3% → 88.3). Loss ratios: decimal 0.72 → 72.
Revenue is agency commission earned, NOT total premium.`

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) return Response.json({ error: "Missing file" }, { status: 400 })
    if (file.size > 25 * 1024 * 1024) return Response.json({ error: "File too large (max 25MB)" }, { status: 400 })

    const isCSV = file.name.toLowerCase().endsWith(".csv")
    const arrayBuffer = await file.arrayBuffer()

    // ── CSV: try deterministic parser first ──────────────────────────────────
    if (isCSV) {
      const raw = new TextDecoder().decode(arrayBuffer)
      const lines = raw.split("\n").filter((l) => l.trim())
      const firstHeaders = splitCSVRow(lines[0] ?? "")

      if (isBookOfBusinessCSV(firstHeaders)) {
        const computed = computeFromBookOfBusiness(raw)
        if (computed) {
          const { _meta, ...parsed } = computed as Record<string, unknown>
          const fieldsFound = Object.values(parsed).filter((v) => v !== null && v !== undefined).length
          const coreFields = ["total_pif", "total_premium", "overall_retention", "commercial_lines_pct"]
          const coreFound = coreFields.filter((f) => parsed[f] != null).length
          const confidence = Math.round((coreFound / coreFields.length) * 75 + Math.min(fieldsFound / 10, 1) * 25)
          return Response.json({ parsed, fieldsFound, confidence, meta: _meta })
        }
      }

      // Fallback: send to AI for other CSV report types
      const processed = raw.slice(0, 20000)
      const { output } = await generateText({
        model: "anthropic/claude-opus-4.6",
        output: Output.object({ schema: AmsDataSchema }),
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `EZLynx CSV export:\n\n${processed}` }],
        maxTokens: 1500,
      })

      if (!output) return Response.json({ error: "Could not parse this report format" }, { status: 422 })

      const parsed: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(output as AmsData)) {
        if (v !== null && v !== undefined) parsed[k] = v
      }
      const fieldsFound = Object.keys(parsed).length
      return Response.json({ parsed, fieldsFound, confidence: Math.min(60, fieldsFound * 8) })
    }

    // ── PDF: AI extraction ───────────────────────────────────────────────────
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const { output } = await generateText({
      model: "anthropic/claude-opus-4.6",
      output: Output.object({ schema: AmsDataSchema }),
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "EZLynx report PDF. Extract all agency metrics. Focus on totals, retention rates, commissions, and PL/CL breakdown." },
          { type: "file", data: base64, mediaType: "application/pdf" },
        ],
      }],
      maxTokens: 1500,
    })

    if (!output) return Response.json({ error: "AI returned no output" }, { status: 500 })

    const parsed: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(output as AmsData)) {
      if (v !== null && v !== undefined) parsed[k] = v
    }
    const fieldsFound = Object.keys(parsed).length
    const coreFields = ["total_pif", "total_premium", "overall_retention", "revenue_ltm", "commercial_lines_pct"]
    const coreFound = coreFields.filter((f) => parsed[f] != null).length
    const confidence = Math.round((coreFound / coreFields.length) * 70 + (fieldsFound / 12) * 30)

    return Response.json({ parsed, fieldsFound, confidence })

  } catch (err) {
    console.error("[parse-ams-report]", err)
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
