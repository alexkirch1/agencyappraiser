export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { isAdminAuthenticated } from "@/lib/admin-auth"

// GET — list all archived carriers
export async function GET(req: Request) {
  if (!(await isAdminAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const rows = await sql`
      SELECT id, carrier_key, carrier_name, reason, archived_at
      FROM archived_carriers
      ORDER BY archived_at DESC
    `
    return NextResponse.json({ carriers: rows })
  } catch (e) {
    console.error("[archived-carriers GET]", e)
    return NextResponse.json({ error: "Failed to fetch archived carriers" }, { status: 500 })
  }
}

// POST — archive a carrier
export async function POST(req: Request) {
  if (!(await isAdminAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { carrier_key, carrier_name, reason } = await req.json()
    if (!carrier_key || !carrier_name) {
      return NextResponse.json({ error: "carrier_key and carrier_name required" }, { status: 400 })
    }
    const rows = await sql`
      INSERT INTO archived_carriers (carrier_key, carrier_name, reason)
      VALUES (${carrier_key}, ${carrier_name}, ${reason ?? null})
      ON CONFLICT (carrier_key) DO UPDATE SET reason = EXCLUDED.reason, archived_at = now()
      RETURNING *
    `
    return NextResponse.json({ carrier: rows[0] })
  } catch (e) {
    console.error("[archived-carriers POST]", e)
    return NextResponse.json({ error: "Failed to archive carrier" }, { status: 500 })
  }
}

// DELETE — unarchive a carrier (restore it)
export async function DELETE(req: Request) {
  if (!(await isAdminAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { carrier_key } = await req.json()
    if (!carrier_key) {
      return NextResponse.json({ error: "carrier_key required" }, { status: 400 })
    }
    await sql`DELETE FROM archived_carriers WHERE carrier_key = ${carrier_key}`
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[archived-carriers DELETE]", e)
    return NextResponse.json({ error: "Failed to unarchive carrier" }, { status: 500 })
  }
}
