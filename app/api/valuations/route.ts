import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })

  const rows = await sql`
    SELECT id, agency_description, scope_of_sale, revenue_ltm, low_offer, high_offer,
           calculated_multiple, risk_grade, created_at
    FROM full_valuations
    WHERE user_id = ${user.id}
    ORDER BY created_at DESC
    LIMIT 20
  `
  return NextResponse.json({ valuations: rows })
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID required." }, { status: 400 })

  await sql`DELETE FROM full_valuations WHERE id = ${id} AND user_id = ${user.id}`
  return NextResponse.json({ success: true })
}
