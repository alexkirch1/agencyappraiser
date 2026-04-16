import { generateText, Output } from "ai"
import { z } from "zod"

const AmsDataSchema = z.object({
  // Book overview
  total_pif:              z.number().nullable().describe("Total policies in force (all lines combined)"),
  total_premium:          z.number().nullable().describe("Total gross written premium in dollars (all lines combined)"),
  personal_lines_pct:     z.number().nullable().describe("Percentage of book that is personal lines (%)"),
  commercial_lines_pct:   z.number().nullable().describe("Percentage of book that is commercial lines (%)"),

  // Retention
  overall_retention:      z.number().nullable().describe("Overall book retention rate (%)"),
  pl_retention:           z.number().nullable().describe("Personal lines retention rate (%)"),
  cl_retention:           z.number().nullable().describe("Commercial lines retention rate (%)"),

  // New business
  new_business_premium:   z.number().nullable().describe("Total new business written premium in dollars for the period"),
  new_business_policies:  z.number().nullable().describe("Total new business policy count for the period"),

  // Loss ratios
  overall_loss_ratio:     z.number().nullable().describe("Overall loss ratio (%)"),
  pl_loss_ratio:          z.number().nullable().describe("Personal lines loss ratio (%)"),
  cl_loss_ratio:          z.number().nullable().describe("Commercial lines loss ratio (%)"),

  // Revenue
  revenue_ltm:            z.number().nullable().describe("Agency commissions/fees earned in the last 12 months in dollars"),
  revenue_prior_year:     z.number().nullable().describe("Agency commissions/fees earned in prior year in dollars"),

  // Operations
  producer_count:         z.number().nullable().describe("Number of active producers or CSRs"),
  years_in_business:      z.number().nullable().describe("Number of years the agency has been in business"),
})

type AmsData = z.infer<typeof AmsDataSchema>

const SYSTEM_PROMPT = `You are an expert insurance agency data extractor specializing in EZLynx agency management system reports.

CRITICAL RULES:
- Return null for any field not found in the document
- Do NOT guess or estimate — only extract values explicitly stated in the report
- For dollar amounts: return actual dollar values (not thousands or millions)
- For percentages: return the number only (e.g. "88.3%" → 88.3)
- For policy counts: return as plain integers
- Loss ratios and retention rates are percentages
- EZLynx reports may include: Agency Summary, Production Summary, Book of Business Report, Retention Report, Loss Analysis
- "PIF" = Policies in Force
- "NB" or "New Business" = new policies written
- Retention rate may appear as "Policy Retention" or "Premium Retention"
- Revenue/commissions may appear as "Agency Revenue", "Commission Income", or "Earned Commission"
- If both personal lines and commercial lines breakdowns exist, extract them separately
- If only a combined/overall figure exists, put it in the "overall_" field and leave PL/CL as null`

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return Response.json({ error: "Missing file" }, { status: 400 })
    }

    if (file.size > 20 * 1024 * 1024) {
      return Response.json({ error: "File too large (max 20MB)" }, { status: 400 })
    }

    const isCSV = file.name.toLowerCase().endsWith(".csv")
    const arrayBuffer = await file.arrayBuffer()

    let messageContent: Parameters<typeof generateText>[0]["messages"][0]["content"]

    if (isCSV) {
      const text = new TextDecoder().decode(arrayBuffer)
      messageContent = [
        {
          type: "text",
          text: `This is an EZLynx CSV export. Extract all available agency metrics from it.\n\n${text.slice(0, 15000)}`,
        },
      ]
    } else {
      const base64 = Buffer.from(arrayBuffer).toString("base64")
      messageContent = [
        {
          type: "text",
          text: "This is an EZLynx agency management system report (PDF). Extract all available agency metrics from it.",
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
    })

    if (!output) {
      return Response.json({ error: "AI returned no output" }, { status: 500 })
    }

    const parsed: Record<string, number> = {}
    for (const [key, value] of Object.entries(output as AmsData)) {
      if (value !== null && value !== undefined) {
        parsed[key] = value as number
      }
    }

    const fieldsFound = Object.keys(parsed).length
    return Response.json({ parsed, fieldsFound })
  } catch (err) {
    console.error("[parse-ams-report] Error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
