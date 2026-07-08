import { NextResponse } from "next/server"
import sql from "@/lib/db"

// This route is invoked daily by Vercel Cron (see vercel.json).
// It permanently deletes leads that have been in the trash for more than 30 days,
// along with their child rows (full_valuations, quick_valuations, quiz_submissions).
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Find all lead IDs that have been in the trash for >30 days
    const expired = await sql`
      SELECT id FROM leads
      WHERE deleted_at IS NOT NULL
        AND deleted_at < NOW() - INTERVAL '30 days'
    `

    if (expired.length === 0) {
      return NextResponse.json({ purged: 0 })
    }

    const ids = expired.map((r) => r.id as number)

    // Cascade delete child rows first
    await sql`DELETE FROM full_valuations  WHERE lead_id = ANY(${ids})`
    await sql`DELETE FROM quick_valuations WHERE lead_id = ANY(${ids})`
    await sql`DELETE FROM quiz_submissions  WHERE lead_id = ANY(${ids})`
    await sql`DELETE FROM leads WHERE id = ANY(${ids})`

    console.log(`[purge-trash] Permanently deleted ${ids.length} expired trash leads: ${ids.join(", ")}`)

    return NextResponse.json({ purged: ids.length })
  } catch (err) {
    console.error("[purge-trash] Error:", err)
    return NextResponse.json({ error: "Purge failed" }, { status: 500 })
  }
}
