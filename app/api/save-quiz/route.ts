import { NextResponse } from "next/server"
import sql from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { leadId, totalScore, maxScore, percentage, grade, answers } = body

    // Validate score fields are reasonable numbers
    const numericScores: Record<string, unknown> = { totalScore, maxScore, percentage }
    for (const [field, val] of Object.entries(numericScores)) {
      if (val != null && (typeof val !== "number" || !isFinite(val) || val < 0 || val > 10_000)) {
        return NextResponse.json({ error: `Invalid value for field: ${field}` }, { status: 400 })
      }
    }
    if (grade != null && (typeof grade !== "string" || grade.length > 10)) {
      return NextResponse.json({ error: "Invalid grade" }, { status: 400 })
    }
    if (answers != null && !Array.isArray(answers)) {
      return NextResponse.json({ error: "answers must be an array" }, { status: 400 })
    }

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
