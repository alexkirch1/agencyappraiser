import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      deal_name,
      deal_type,
      premium_base,
      estimated_valuation,
      final_offer,
      final_multiple,
      deal_terms,        // e.g. "100% cash", "80% cash / 20% earnout"
      earnout_pct,       // 0-100
      seller_stay,       // months seller agreed to stay on
      book_retention_pct,
      loss_ratio,
      pif_count,
      state,
      carrier,
      notes,
    } = body

    await sql`
      INSERT INTO completed_deals (
        deal_name, deal_type, premium_base, estimated_valuation,
        final_offer, final_multiple, deal_terms, earnout_pct,
        seller_stay, book_retention_pct, loss_ratio, pif_count,
        state, carrier, notes
      ) VALUES (
        ${deal_name}, ${deal_type}, ${premium_base}, ${estimated_valuation},
        ${final_offer}, ${final_multiple}, ${deal_terms}, ${earnout_pct},
        ${seller_stay}, ${book_retention_pct}, ${loss_ratio}, ${pif_count},
        ${state}, ${carrier}, ${notes}
      )
    `

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[completed-deal] POST error:", err)
    return NextResponse.json({ error: "Failed to save deal" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const rows = await sql`
      SELECT *
      FROM completed_deals
      ORDER BY completed_at DESC
      LIMIT 100
    `
    return NextResponse.json({ deals: rows })
  } catch (err) {
    console.error("[completed-deal] GET error:", err)
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 })
  }
}
