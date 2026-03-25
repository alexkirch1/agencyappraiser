import { NextResponse } from "next/server"
import sql from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { leadId, revenue, retention, bookType, growth, customers, policies, ratio, multiplier, suggested, lowValue, midValue, highValue, tier } = body

    // Validate numeric fields are numbers and within plausible bounds
    const numericFields: Record<string, unknown> = { revenue, retention, customers, policies, ratio, multiplier, suggested, lowValue, midValue, highValue }
    for (const [field, val] of Object.entries(numericFields)) {
      if (val != null && (typeof val !== "number" || !isFinite(val) || val < 0 || val > 1_000_000_000)) {
        return NextResponse.json({ error: `Invalid value for field: ${field}` }, { status: 400 })
      }
    }
    if (tier != null && (typeof tier !== "string" || tier.length > 50)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 })
    }
    if (bookType != null && (typeof bookType !== "string" || bookType.length > 100)) {
      return NextResponse.json({ error: "Invalid bookType" }, { status: 400 })
    }

    const rows = await sql`
      INSERT INTO quick_valuations (
        lead_id, revenue, retention, book_type, growth,
        customers, policies, policy_ratio,
        multiplier, suggested_mult,
        low_value, mid_value, high_value, tier
      ) VALUES (
        ${leadId ?? null},
        ${revenue ?? null}, ${retention ?? null}, ${bookType ?? null}, ${growth ?? null},
        ${customers ?? null}, ${policies ?? null}, ${ratio ?? null},
        ${multiplier ?? null}, ${suggested ?? null},
        ${lowValue ?? null}, ${midValue ?? null}, ${highValue ?? null}, ${tier ?? null}
      )
      RETURNING id
    `

    return NextResponse.json({ success: true, id: rows[0]?.id })
  } catch (err) {
    console.error("[v0] save-quick-valuation error:", err)
    return NextResponse.json({ error: "Failed to save quick valuation" }, { status: 500 })
  }
}
