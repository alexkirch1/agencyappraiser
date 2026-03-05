import { NextResponse } from "next/server"

const PIPEDRIVE_TOKEN = process.env.PIPEDRIVE_API_TOKEN
const PIPEDRIVE_DOMAIN = "rocky"

/**
 * GET /api/pipedrive-fields
 * Returns all deal custom fields from Pipedrive so we can map them correctly.
 * This is a diagnostic endpoint -- visit it in the browser to see field keys.
 */
export async function GET() {
  if (!PIPEDRIVE_TOKEN) {
    return NextResponse.json({ error: "PIPEDRIVE_API_TOKEN not set" }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1/dealFields?api_token=${PIPEDRIVE_TOKEN}`
    )
    const json = await res.json()
    if (!json.success || !json.data) {
      return NextResponse.json({ error: "Failed to fetch fields", raw: json }, { status: 500 })
    }

    // Return only custom fields (those with hash-based keys) plus a few important standard ones
    const fields = json.data.map((f: { key: string; name: string; field_type: string; options?: unknown[] }) => ({
      key: f.key,
      name: f.name,
      type: f.field_type,
      options: f.options?.length ? f.options : undefined,
    }))

    // Separate standard vs custom
    const custom = fields.filter((f: { key: string }) => /^[a-f0-9]{40}$/.test(f.key))
    const standard = fields.filter((f: { key: string }) => !/^[a-f0-9]{40}$/.test(f.key))

    return NextResponse.json({
      message: "Copy the 'key' value for each field you want to map. Custom fields have 40-char hex keys.",
      customFields: custom,
      standardFields: standard.map((f: { key: string; name: string }) => ({ key: f.key, name: f.name })),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
