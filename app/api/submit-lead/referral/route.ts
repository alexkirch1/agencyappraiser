export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import sql from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { leadId, referralSource } = await req.json()

    if (!leadId || !referralSource) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    await sql`
      UPDATE leads
      SET referral_source = ${referralSource}
      WHERE id = ${leadId}
    `

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[referral] Failed to save referral source:", err)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
