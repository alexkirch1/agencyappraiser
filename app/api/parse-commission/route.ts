import { generateText, Output } from "ai"
import { z } from "zod"

const CommissionSchema = z.object({
  totalWrittenPremium: z.number().nullable().describe("Total written premium across all rows — sum of all Premium/Written Premium values ($)"),
  totalSplitCommission: z.number().nullable().describe("Total split commission earned ($) — the agent's share after split"),
  totalPolicies: z.number().nullable().describe("Count of unique policy numbers in the statement"),
  totalCustomers: z.number().nullable().describe("Count of unique account/customer names"),
  newBusinessCount: z.number().nullable().describe("Count of New Business (NB) transactions"),
  renewalCount: z.number().nullable().describe("Count of renewal transactions (RWL, RB, PCR, etc.)"),
  book_avg_premium_per_policy: z.number().nullable().describe("Average written premium per policy = totalWrittenPremium / totalPolicies"),
  book_new_business_pct: z.number().nullable().describe("New business percentage = (newBusinessCount / total transaction count) * 100"),
  book_policies_per_customer: z.number().nullable().describe("Average policies per customer = totalPolicies / totalCustomers"),
  statementMonth: z.string().nullable().describe("Statement period/month if shown (e.g. 'October 2025')"),
  carrierBreakdown: z.array(z.object({
    carrier: z.string().describe("Carrier/company name"),
    writtenPremium: z.number().describe("Total written premium for this carrier ($)"),
    splitCommission: z.number().describe("Total split commission for this carrier ($)"),
    policyCount: z.number().describe("Number of policies for this carrier"),
    newBusinessCount: z.number().describe("Number of new business policies for this carrier"),
  })).describe("Breakdown of metrics by carrier/company"),
})

const SYSTEM_PROMPT = `You are an expert insurance book of business data extractor.

You will receive an EZLynx Book of Business Detail report PDF. This report lists all active policies for an agency.

TYPICAL COLUMNS (may vary):
- Customer / Account Name
- Carrier / Company
- Policy Number
- Line of Business (LOB): Auto, Home, Commercial, Life, etc.
- Policy Status: Active, Cancelled, etc.
- Effective Date / Expiration Date
- Written Premium / Annual Premium
- Policy Type: New Business (NB) or Renewal

The report may also be a commission statement with columns like:
- Producer, Account Name, Master Company, Policy Number, LOB Code, Transaction Type, Premium Written, Commission

EXTRACTION RULES:
- totalWrittenPremium: sum ALL written/annual premium values (active policies only if status shown)
- totalPolicies: count UNIQUE policy numbers
- totalCustomers: count UNIQUE customer/account names
- newBusinessCount: count policies marked as New Business, NB, or equivalent
- renewalCount: count policies marked as Renewal, RWL, RB, or equivalent
- book_avg_premium_per_policy: totalWrittenPremium / totalPolicies
- book_new_business_pct: (newBusinessCount / (newBusinessCount + renewalCount)) * 100
- book_policies_per_customer: totalPolicies / totalCustomers
- statementMonth: the report date or period shown (e.g. "March 2026")
- carrierBreakdown: group by carrier/company name, summing premium and counting policies
- Skip header rows, subtotal rows, grand total rows, blank rows
- Return null for any field you cannot determine with confidence`

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return Response.json({ error: "Missing file" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    const { output } = await generateText({
      model: "anthropic/claude-opus-4.6",
      output: Output.object({ schema: CommissionSchema }),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all book of business metrics from this EZLynx PDF. Count unique policies and customers carefully. Sum all written premiums. Return null for any field you cannot determine with confidence.",
            },
            {
              type: "file",
              data: base64,
              mediaType: "application/pdf",
            },
          ],
        },
      ],
    })

    if (!output) {
      return Response.json({ error: "AI returned no output" }, { status: 500 })
    }

    return Response.json({ parsed: output })
  } catch (err) {
    console.error("[parse-commission] Error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
