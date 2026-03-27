import { generateText, Output } from "ai"
import { z } from "zod"

// Schema covers all carrier field names — null means not found in this report
const CarrierDataSchema = z.object({
  // Progressive
  prog_pl_premium: z.number().nullable().describe("Personal Lines total written premium ($)"),
  prog_pl_pif: z.number().nullable().describe("Personal Lines policies in force (count)"),
  prog_pl_loss_ratio: z.number().nullable().describe("Personal Lines loss ratio (%)"),
  prog_cl_premium: z.number().nullable().describe("Commercial Lines total written premium ($)"),
  prog_cl_pif: z.number().nullable().describe("Commercial Lines policies in force (count)"),
  prog_cl_loss_ratio: z.number().nullable().describe("Commercial Lines loss ratio (%)"),
  prog_bundle_rate: z.number().nullable().describe("Bundle/multi-policy rate (%)"),

  // Travelers
  travelers_auto_wp: z.number().nullable().describe("Auto written premium ($000s)"),
  travelers_auto_lr: z.number().nullable().describe("Auto loss ratio (%)"),
  travelers_auto_retention: z.number().nullable().describe("Auto retention (%)"),
  travelers_auto_pif: z.number().nullable().describe("Auto PIF count"),
  travelers_home_wp: z.number().nullable().describe("Home written premium ($000s)"),
  travelers_home_lr: z.number().nullable().describe("Home loss ratio (%)"),
  travelers_home_retention: z.number().nullable().describe("Home retention (%)"),
  travelers_home_pif: z.number().nullable().describe("Home PIF count"),

  // Hartford
  hartford_pl_auto_twp: z.number().nullable().describe("PL Auto total written premium ($000s)"),
  hartford_pl_auto_pif: z.number().nullable().describe("PL Auto PIF count"),
  hartford_pl_auto_lr: z.number().nullable().describe("PL Auto loss ratio (%)"),
  hartford_pl_auto_retention: z.number().nullable().describe("PL Auto retention (%)"),
  hartford_pl_home_twp: z.number().nullable().describe("PL Home total written premium ($000s)"),
  hartford_pl_home_pif: z.number().nullable().describe("PL Home PIF count"),
  hartford_pl_home_lr: z.number().nullable().describe("PL Home loss ratio (%)"),
  hartford_pl_home_retention: z.number().nullable().describe("PL Home retention (%)"),
  hartford_cl_twp: z.number().nullable().describe("Commercial Lines total written premium ($000s)"),
  hartford_cl_lr: z.number().nullable().describe("Commercial Lines loss ratio (%)"),
  hartford_cl_retention: z.number().nullable().describe("Commercial Lines retention (%)"),

  // Safeco
  safeco_auto_dwp: z.number().nullable().describe("Auto Rolling 12 Direct Written Premium ($)"),
  safeco_auto_pif: z.number().nullable().describe("Auto PIF count"),
  safeco_auto_lr: z.number().nullable().describe("Auto YTD loss ratio (%)"),
  safeco_auto_retention: z.number().nullable().describe("Auto PIF retention (%)"),
  safeco_home_dwp: z.number().nullable().describe("Home Rolling 12 DWP ($)"),
  safeco_home_pif: z.number().nullable().describe("Home PIF count"),
  safeco_home_lr: z.number().nullable().describe("Home YTD loss ratio (%)"),
  safeco_home_retention: z.number().nullable().describe("Home PIF retention (%)"),
  safeco_other_dwp: z.number().nullable().describe("Other lines combined DWP ($)"),
  safeco_other_lr: z.number().nullable().describe("Other lines loss ratio (%)"),
  safeco_other_retention: z.number().nullable().describe("Other lines retention (%)"),
  safeco_cross_sell_pct: z.number().nullable().describe("Cross-sell percentage (%)"),
  safeco_nb_dwp: z.number().nullable().describe("YTD New Business DWP ($)"),

  // Berkshire Hathaway Guard
  bh_written_premium_r12: z.number().nullable().describe("BH Guard Rolling 12 Written Premium ($)"),
  bh_written_premium_ytd: z.number().nullable().describe("BH Guard YTD Written Premium ($)"),
  bh_new_policies_ytd: z.number().nullable().describe("BH Guard YTD new policies count"),
  bh_renewal_policies_ytd: z.number().nullable().describe("BH Guard YTD renewal policies count"),
  bh_hit_ratio_new: z.number().nullable().describe("BH Guard new business hit ratio (%)"),
  bh_hit_ratio_renewal: z.number().nullable().describe("BH Guard renewal hit ratio (%)"),
  bh_yield_ratio_total: z.number().nullable().describe("BH Guard total yield ratio (%)"),
  bh_loss_ratio_1983_2020: z.number().nullable().describe("BH Guard cumulative 1983-2020 loss ratio (%)"),
  bh_loss_ratio_2022: z.number().nullable().describe("BH Guard 2022 loss ratio (%)"),
  bh_loss_ratio_2023: z.number().nullable().describe("BH Guard 2023 loss ratio (%)"),
  bh_loss_ratio_2024: z.number().nullable().describe("BH Guard 2024 loss ratio (%)"),
  bh_loss_ratio_2025: z.number().nullable().describe("BH Guard 2025 loss ratio (%)"),
  bh_loss_ratio_ytd: z.number().nullable().describe("BH Guard current year YTD loss ratio (%)"),
  bh_grand_total_loss_ratio: z.number().nullable().describe("BH Guard grand total blended loss ratio (%)"),

  // Liberty Mutual Commercial Lines
  lm_dwp_ytd: z.number().nullable().describe("LM CL YTD Direct Written Premium in actual dollars (not millions)"),
  lm_dwp_pytd: z.number().nullable().describe("LM CL Prior YTD DWP in actual dollars"),
  lm_dwp_r12: z.number().nullable().describe("LM CL Rolling 12 months DWP in actual dollars"),
  lm_nb_dwp_ytd: z.number().nullable().describe("LM CL YTD New Business DWP in actual dollars"),
  lm_pif: z.number().nullable().describe("LM CL Policies in Force count"),
  lm_loss_ratio_ytd: z.number().nullable().describe("LM CL YTD Loss Ratio (%)"),
  lm_loss_ratio_2yr: z.number().nullable().describe("LM CL 2 Years + YTD Loss Ratio (%)"),
  lm_premium_retention: z.number().nullable().describe("LM CL Premium Retention (%)"),
  lm_plif_renewal: z.number().nullable().describe("LM CL PLIF Renewal count"),
})

type CarrierData = z.infer<typeof CarrierDataSchema>

const SYSTEM_PROMPT = `You are an expert insurance industry data extractor. You will receive a carrier performance report PDF and must extract specific metrics from it.

CRITICAL RULES:
- Return null for any field not found in this specific report
- Do NOT guess or estimate values — only return values explicitly stated in the document
- For Liberty Mutual reports: values shown as "$X.XXM" (e.g. "$0.11M") must be converted to actual dollars (0.11M = 110000). Values shown as plain "$108,119" stay as-is.
- For percentages: return the number only (e.g. "65.0%" → 65.0, "-38.5%" → -38.5)
- For policy counts and PIF: return as plain integers
- Loss ratios over 100% are valid — do not cap them
- "Rolling 12" and "R12" mean the same thing — the trailing 12-month period
- "YTD" = year to date
- "DWP" = Direct Written Premium
- "PIF" = Policies in Force
- "TWP" = Total Written Premium
- "NB" or "New Business" = new policies written
- For Liberty Mutual: the CL ADP Summary shows tiles with values like "$0.11M$0.08M33.9%" — first $M value is YTD DWP, second is Prior YTD, the percentage is growth rate
- For Liberty Mutual: the CL ADP full report shows a Total row with columns: YTD DWP, Prior YTD, Growth%, MTD, Rolling 12, PLIF, PLIF Growth%, NB DWP, NB Growth%, MTD NB, Premium Retention%, etc.
- For BH Guard PAR: the Written Premium section has rows for New, Renewal, and Total — each with 8 columns (CurrYTD Policies, CurrYTD Premium, CurrR12 Policies, CurrR12 Premium, PrevYTD Policies, PrevYTD Premium, PrevR12 Policies, PrevR12 Premium)`

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const carrier = formData.get("carrier") as string

    if (!file || !carrier) {
      return Response.json({ error: "Missing file or carrier" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    const carrierContext: Record<string, string> = {
      progressive: "This is a Progressive Insurance Account Production Report. Focus on Personal Lines and Commercial Lines premium, PIF, and loss ratio columns.",
      travelers: "This is a Travelers PI Production Report. Focus on Auto and Homeowners written premium, loss ratios, retention rates, and PIF.",
      hartford: "This is a Hartford Partner Breakdown Report. Extract PL Auto, PL Home, and Small Commercial written premium, PIF, loss ratio, and retention.",
      safeco: "This is a Safeco Agency Development Profile (ADP). Extract Rolling 12 DWP, PIF, loss ratios, and retention for Auto, Home, and Other lines. Also grab YTD New Business DWP and cross-sell %.",
      berkshire: "This is a Berkshire Hathaway Guard Producer Activity Report (PAR). Extract Written Premium (New YTD policies count, Renewal YTD policies count, Total YTD and Rolling 12 premium), Hit Ratios (New and Renewal %, first column = Current YTD policy basis), Yield Ratio Total, and all Direct Loss Ratio rows by year including subtotals and grand total.",
      libertymutual: "This is a Liberty Mutual Commercial Lines ADP or ADP Summary report. BOTH the CL ADP and CL ADP Summary formats are accepted. Extract: YTD DWP, Prior YTD DWP, Rolling 12 DWP, New Business YTD DWP, PIF count, YTD Loss Ratio, 2 Years + YTD Loss Ratio, Premium Retention %, and PLIF Renewal count. If values are in $M format (e.g. $0.11M), convert to actual dollars (110000). If in actual dollars (e.g. $108,119), use as-is.",
    }

    const { output } = await generateText({
      model: "anthropic/claude-opus-4.6",
      output: Output.object({ schema: CarrierDataSchema }),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${carrierContext[carrier] || "Extract all available insurance metrics from this carrier report."}\n\nExtract all relevant fields from this PDF. Return null for fields not applicable to this carrier or not found in the document.`,
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

    // Strip nulls to get only found fields
    const parsed: Record<string, number | boolean> = {}
    for (const [key, value] of Object.entries(output as CarrierData)) {
      if (value !== null && value !== undefined) {
        parsed[key] = value
      }
    }

    const fieldsFound = Object.keys(parsed).length
    return Response.json({ parsed, fieldsFound })
  } catch (err) {
    console.error("[parse-carrier-report] Error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
