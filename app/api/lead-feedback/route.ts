export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import sql from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { leadId, feedback } = await req.json()

    if (!leadId || !feedback) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    // Append the new feedback to any existing notes rather than overwriting
    await sql`
      UPDATE leads
      SET notes = CASE
        WHEN notes IS NULL OR notes = '' THEN ${`Website experience feedback: ${feedback}`}
        ELSE notes || E'\n' || ${`Website experience feedback: ${feedback}`}
      END
      WHERE id = ${leadId}
    `

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[submit-lead/feedback] Failed to save feedback:", err)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
