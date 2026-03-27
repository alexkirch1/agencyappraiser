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

const SYSTEM_PROMPT = `You are an expert insurance commission statement data extractor.

You will receive an EZLynx Horizon commission statement PDF in one of two formats:

FORMAT A — "Commissions By Producer":
- Columns: Producer, Account Name, Master Company, Policy Number, LOB Code, Transaction Type, Premium - Written, Total Commission, Commission Split, Payee
- Transaction types: PRWL (renewal), PNBS (new business), PCR (cancel reinstate), PXL (cancel), PHBS (home new business)
- LOB and TRX may be fused: "AUTOPRWL" = Auto Renewal, "AUTOPNBS" = Auto New Business

FORMAT B — "Commission Detail":
- Columns: Producer, Account, Master Company, Policy, LOB, TRX, Eff Date, Premium, Comm, Split Comm
- Transaction types: NB (new business), RB (renewal/rewrite), MSC (misc)

RULES:
- Count UNIQUE policy numbers for totalPolicies (not total rows)
- Count UNIQUE account names for totalCustomers
- For newBusinessCount: NBS, PNBS, PHBS, NB transaction types = new business
- Skip subtotal rows, branch total rows, summary rows, header rows
- Written premium can be negative (cancellations) — include in the sum
- Return null if you cannot determine a value with confidence
- For carrierBreakdown: group by "Master Company" field`

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
              text: "Extract all commission statement metrics from this EZLynx Horizon PDF. Count unique policies and customers carefully. Return null for any field you cannot determine with confidence.",
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
