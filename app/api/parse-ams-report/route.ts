import { generateText, Output } from "ai"
import { z } from "zod"

// ─── Schema ───────────────────────────────────────────────────────────────────

const AmsDataSchema = z.object({
  // Agency info
  agency_name:            z.string().nullable().describe("Name of the insurance agency as shown on the report"),
  primary_state:          z.string().nullable().describe("Primary state of operation (2-letter abbreviation preferred)"),
  employee_count:         z.number().nullable().describe("Total number of employees or staff"),
  producer_count:         z.number().nullable().describe("Number of active licensed producers or CSRs"),
  years_in_business:      z.number().nullable().describe("Number of years the agency has been in business"),

  // Book overview
  total_pif:              z.number().nullable().describe("Total policies in force across ALL lines — look for 'Total PIF', 'Total Policies', 'Active Policies', 'Policy Count'"),
  total_premium:          z.number().nullable().describe("Total gross written premium in dollars across ALL lines — look for 'Total Premium', 'Total GWP', 'Written Premium', 'Total Book'"),
  personal_lines_pct:     z.number().nullable().describe("Percentage of book that is personal lines (0-100). Derive from PL premium / total premium if not stated directly"),
  commercial_lines_pct:   z.number().nullable().describe("Percentage of book that is commercial lines (0-100). Derive from CL premium / total premium if not stated directly"),

  // Retention
  overall_retention:      z.number().nullable().describe("Overall/combined retention rate as a percentage (0-100) — look for 'Retention Rate', 'Policy Retention', 'Premium Retention', 'Retention %'"),
  pl_retention:           z.number().nullable().describe("Personal lines retention rate (%) — look for 'PL Retention', 'Personal Lines Retention'"),
  cl_retention:           z.number().nullable().describe("Commercial lines retention rate (%) — look for 'CL Retention', 'Commercial Lines Retention'"),

  // New business
  new_business_premium:   z.number().nullable().describe("New business written premium in dollars — look for 'New Business', 'NB Premium', 'New Written Premium'"),
  new_business_policies:  z.number().nullable().describe("New business policy count — look for 'New Policies', 'NB Count', 'New Business Count'"),

  // Loss ratios
  overall_loss_ratio:     z.number().nullable().describe("Overall loss ratio as a percentage (0-100+) — look for 'Loss Ratio', 'Combined Loss Ratio'. Note: some reports show as decimal (0.65) — convert to percent (65)"),
  pl_loss_ratio:          z.number().nullable().describe("Personal lines loss ratio (%)"),
  cl_loss_ratio:          z.number().nullable().describe("Commercial lines loss ratio (%)"),

  // Revenue / commissions
  revenue_ltm:            z.number().nullable().describe("Agency commission/fee revenue for the most recent 12 months in dollars — look for 'Commission Income', 'Agency Revenue', 'Earned Commission', 'Total Commission', 'Net Commission'. This is what the AGENCY earns, not total premium"),
  revenue_prior_year:     z.number().nullable().describe("Agency commission/fee revenue for prior year in dollars — look for prior year column of commission income"),
})

type AmsData = z.infer<typeof AmsDataSchema>

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a specialist in extracting data from EZLynx agency management system reports for insurance agencies.

EZLynx REPORT TYPES YOU MAY ENCOUNTER:
- Agency Summary / Executive Dashboard: high-level book stats, PIF, premium totals
- Production Report / Production Summary: new business counts and premium by producer or line
- Book of Business Report: full policy listing with premium, carrier, line of business
- Retention Report: renewal vs. lapse analysis, retention rate by line
- Commission Report / Commission Income: agency earned commissions by period
- Loss Ratio Report / Loss Analysis: loss ratios by line, carrier, or period

EZLYNX-SPECIFIC COLUMN NAMES TO LOOK FOR:
- PIF / Total PIF / Active Policies / Policy Count
- Gross Written Premium / GWP / Written Premium / Total Premium
- Commission / Net Commission / Earned Commission / Agency Commission
- Retention Rate / Policy Retention % / Premium Retention %
- Loss Ratio / Combined Ratio / Incurred Loss Ratio
- New Business / NB Policies / New Written / New Business Premium
- Personal Lines / PL / Home / Auto / Umbrella (personal)
- Commercial Lines / CL / BOP / Commercial Auto / GL / WC (commercial)
- Prior Year / PY / Previous Year / Year Ago

CRITICAL EXTRACTION RULES:
1. Return null for any field not explicitly found or derivable — do NOT guess
2. Dollar amounts: always return as full dollars (e.g. "$1,234,567" → 1234567, "$1.2M" → 1200000)
3. Percentages: return the number only (e.g. "88.3%" → 88.3, "0.883" shown as a ratio → 88.3)
4. Loss ratios: if shown as decimal like 0.72 → return 72; if shown as 72% → return 72
5. If a report shows PL and CL breakdowns, derive overall as weighted average if not stated
6. If personal_lines_pct or commercial_lines_pct are missing but PL/CL premium values exist, calculate the percentage
7. Revenue (commission) is what the AGENCY earns — NOT the total premium collected by carriers
8. "Retention" typically means (Renewed Policies) / (Renewed + Lapsed) × 100
9. If you see a table with multiple periods, use the most recent 12-month period for LTM fields
10. Do not hallucinate — if you are uncertain, return null`

// ─── CSV preprocessing ────────────────────────────────────────────────────────

function preprocessCSV(raw: string): string {
  const lines = raw.split("\n")
  const totalLines = lines.length

  // Find and prioritize header rows and summary rows
  const summaryKeywords = /total|summary|overall|retention|commission|loss.ratio|new.business|pif|premium|revenue/i
  const priorityLines: string[] = []
  const otherLines: string[] = []

  for (const line of lines) {
    if (summaryKeywords.test(line)) {
      priorityLines.push(line)
    } else {
      otherLines.push(line)
    }
  }

  // Build context: priority lines first, then fill remaining budget
  const maxChars = 25000
  let result = `[EZLynx CSV Export — ${totalLines} rows total]\n\n`
  result += `=== SUMMARY/KEY ROWS ===\n${priorityLines.slice(0, 200).join("\n")}\n\n`
  result += `=== FULL DATA (first rows) ===\n`

  const remaining = maxChars - result.length
  result += otherLines.join("\n").slice(0, remaining)

  return result
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return Response.json({ error: "Missing file" }, { status: 400 })
    }

    if (file.size > 25 * 1024 * 1024) {
      return Response.json({ error: "File too large (max 25MB)" }, { status: 400 })
    }

    const isCSV = file.name.toLowerCase().endsWith(".csv")
    const arrayBuffer = await file.arrayBuffer()

    let messageContent: Parameters<typeof generateText>[0]["messages"][0]["content"]

    if (isCSV) {
      const raw = new TextDecoder().decode(arrayBuffer)
      const processed = preprocessCSV(raw)
      messageContent = [
        {
          type: "text",
          text: `This is an EZLynx CSV export. Carefully extract all available agency metrics.\n\n${processed}`,
        },
      ]
    } else {
      // PDF — send as file attachment for vision-capable model
      const base64 = Buffer.from(arrayBuffer).toString("base64")
      messageContent = [
        {
          type: "text",
          text: `This is an EZLynx agency management system report exported as a PDF.
Carefully read every table, section header, and summary row.
Extract all available agency metrics. Pay special attention to:
- Any summary rows showing totals across all lines
- Period/date labels to identify the most recent 12-month data
- Both personal lines and commercial lines breakdowns if present
- Commission or revenue tables separate from premium tables`,
        },
        {
          type: "file",
          data: base64,
          mediaType: "application/pdf",
        },
      ]
    }

    const { output } = await generateText({
      model: "anthropic/claude-opus-4.6",
      output: Output.object({ schema: AmsDataSchema }),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: messageContent }],
      maxTokens: 2000,
    })

    if (!output) {
      return Response.json({ error: "AI returned no output" }, { status: 500 })
    }

    // Separate agency_name (string) from numeric fields for the response
    const parsed: Record<string, number | string> = {}
    const data = output as AmsData

    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        parsed[key] = value as number | string
      }
    }

    // Count non-string fields found (numeric data quality metric)
    const numericFields = Object.entries(parsed).filter(
      ([k, v]) => k !== "agency_name" && k !== "primary_state" && typeof v === "number"
    )
    const fieldsFound = numericFields.length

    // Confidence: based on how many of the high-value fields were extracted
    const coreFields = ["total_pif","total_premium","overall_retention","revenue_ltm","overall_loss_ratio","commercial_lines_pct"]
    const coreFound = coreFields.filter((f) => parsed[f] != null).length
    const confidence = Math.round((coreFound / coreFields.length) * 70 + (fieldsFound / 12) * 30)

    return Response.json({ parsed, fieldsFound, confidence })
  } catch (err) {
    console.error("[parse-ams-report] Error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
