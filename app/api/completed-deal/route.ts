import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { isAdminAuthenticated } from "@/lib/admin-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json()
    const {
      deal_name,
      deal_type,
      premium_base,
      appraised_low,
      appraised_high,
      final_offer,
      final_multiple,
      deal_structure,    // e.g. "100% Cash at Close", "Cash + Earnout"
      earnout_pct,       // 0-100
      seller_stay_months, // months seller agreed to stay on
      retention_rate,
      loss_ratio,
      policies_per_cx,
      primary_state,
      carrier,
      notes,
    } = body

    await sql`
      INSERT INTO completed_deals (
        deal_name, deal_type, premium_base, appraised_low,
        appraised_high, final_offer, final_multiple, deal_structure,
        earnout_pct, seller_stay_months, retention_rate, loss_ratio,
        policies_per_cx, primary_state, carrier, notes
      ) VALUES (
        ${deal_name}, ${deal_type}, ${premium_base}, ${appraised_low ?? null},
        ${appraised_high ?? null}, ${final_offer}, ${final_multiple}, ${deal_structure},
        ${earnout_pct}, ${seller_stay_months ?? null}, ${retention_rate ?? null}, ${loss_ratio ?? null},
        ${policies_per_cx ?? null}, ${primary_state ?? null}, ${carrier ?? null}, ${notes ?? null}
      )
    `

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[completed-deal] POST error:", err)
    return NextResponse.json({ error: "Failed to save deal" }, { status: 500 })
  }
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const rows = await sql`
      SELECT *
      FROM completed_deals
      ORDER BY created_at DESC
      LIMIT 100
    `
    return NextResponse.json({ deals: rows })
  } catch (err) {
    console.error("[completed-deal] GET error:", err)
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 })
  }
}
