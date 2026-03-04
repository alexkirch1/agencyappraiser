import { NextResponse } from "next/server"
import sql from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { leadId, totalScore, maxScore, percentage, grade, answers } = body

    const rows = await sql`
      INSERT INTO quiz_submissions (
        lead_id, total_score, max_score, percentage, grade, answers
      ) VALUES (
        ${leadId ?? null},
        ${totalScore ?? null}, ${maxScore ?? null}, ${percentage ?? null},
        ${grade ?? null}, ${JSON.stringify(answers ?? [])}
      )
      RETURNING id
    `

    return NextResponse.json({ success: true, id: rows[0]?.id })
  } catch (err) {
    console.error("[v0] save-quiz error:", err)
    return NextResponse.json({ error: "Failed to save quiz" }, { status: 500 })
  }
}
