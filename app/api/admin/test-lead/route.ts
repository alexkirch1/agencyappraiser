export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { isAdminAuthenticated } from "@/lib/admin-auth"

/**
 * POST /api/admin/test-lead
 *
 * Dev utility: inserts a real dummy lead row into the DB to verify that:
 *   1. The DATABASE_URL env var is set and the Neon connection works
 *   2. The admin auth token is being sent correctly from the client
 *   3. The SWR fetch + mutate() cycle in overview-tab is working end-to-end
 *
 * The inserted lead is tagged with tool_used = 'quick_value' and
 * agency_name = '[TEST] Debug Lead' so it is easily identifiable and deletable.
 */
export async function POST() {
  // Log env var presence for debugging — never log actual values
  console.log("[v0] test-lead: DATABASE_URL set?", !!process.env.DATABASE_URL)

  if (!(await isAdminAuthenticated())) {
    console.error("[v0] test-lead: 401 — admin token missing or invalid")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const rows = await sql`
      INSERT INTO leads (name, email, phone, agency_name, tool_used, estimated_value, valuation_summary)
      VALUES (
        'Test Lead',
        'test+debug@agencyappraiser.com',
        '555-000-0000',
        '[TEST] Debug Lead',
        'quick_value',
        250000,
        'Inserted by the Test Lead button in the admin Overview tab to verify DB connectivity.'
      )
      RETURNING id, name, agency_name, created_at
    `

    const lead = rows[0]
    console.log("[v0] test-lead: inserted lead id =", lead?.id)

    return NextResponse.json({ success: true, lead })
  } catch (err) {
    console.error("[v0] test-lead: DB insert failed:", err)
    return NextResponse.json(
      { error: "DB insert failed — check server logs for details." },
      { status: 500 },
    )
  }
}
