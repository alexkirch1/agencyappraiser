import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { adminNotificationEmail } from "@/lib/email-templates"

const PIPEDRIVE_TOKEN = process.env.PIPEDRIVE_API_TOKEN
const PIPEDRIVE_DOMAIN = "rocky"
const RESEND_API_KEY: string | undefined = process.env.RESEND_API_KEY
const NOTIFY_EMAIL = "alex@rockyquote.com"

// We'll look up the pipeline + stage IDs dynamically on first call
let cachedStageId: number | null = null

async function getPipedriveLeadsStageId(): Promise<number | null> {
  if (cachedStageId) return cachedStageId
  try {
    const res = await fetch(
      `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1/stages?api_token=${PIPEDRIVE_TOKEN}`
    )
    const json = await res.json()
    if (!json.success || !json.data) return null
    // Find the "Leads" stage in the "Acquisitions" pipeline (pipeline_id = 7)
    const leadsStage = json.data.find(
      (s: { name: string; pipeline_id: number }) =>
        s.pipeline_id === 7 && s.name.toLowerCase() === "leads"
    )
    if (leadsStage) {
      cachedStageId = leadsStage.id
      return leadsStage.id
    }
    // Fallback: get first stage of pipeline 7
    const anyStage = json.data.find(
      (s: { pipeline_id: number }) => s.pipeline_id === 7
    )
    if (anyStage) {
      cachedStageId = anyStage.id
      return anyStage.id
    }
    return null
  } catch {
    return null
  }
}

async function createPipedrivePerson(data: {
  name: string
  email: string
  phone: string
  agencyName: string
}): Promise<number | null> {
  try {
    const res = await fetch(
      `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1/persons?api_token=${PIPEDRIVE_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: [{ value: data.email, primary: true, label: "work" }],
          phone: data.phone
            ? [{ value: data.phone, primary: true, label: "work" }]
            : undefined,
          org_id: undefined,
        }),
      }
    )
    const json = await res.json()
    if (json.success && json.data?.id) return json.data.id
    return null
  } catch {
    return null
  }
}

// Cache for Pipedrive custom field keys (fetched once per cold start)
let cachedFieldMap: Record<string, string> | null = null

/**
 * Fetch all Pipedrive deal fields and build a logical-name → field-key mapping.
 * Uses multiple matching strategies per logical field (exact phrase, then partial).
 */
async function getPipedriveCustomFields(): Promise<Record<string, string>> {
  if (cachedFieldMap) return cachedFieldMap
  try {
    const res = await fetch(
      `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1/dealFields?api_token=${PIPEDRIVE_TOKEN}`
    )
    const json = await res.json()
    if (!json.success || !json.data) {
        return {}
    }

    const map: Record<string, string> = {}
    const fields: { key: string; name: string; type: string }[] = json.data

    // Only match against custom fields (40-char hex key) — never Pipedrive system fields
    const customFields = fields.filter((f) => /^[a-f0-9]{40}$/.test(f.key))

    // Build a helper to find a field by trying multiple patterns in order
    function findField(patterns: string[]): string | null {
      for (const pattern of patterns) {
        const match = customFields.find(f => {
          const n = f.name.toLowerCase()
          return n === pattern.toLowerCase() || n.includes(pattern.toLowerCase())
        })
        if (match) return match.key
      }
      return null
    }

    // Map each logical key with multiple search patterns (most specific first)
    const mappings: [string, string[]][] = [
      ["revenue", ["annual revenue", "revenue ltm", "revenue", "total revenue"]],
      ["sde", ["sde", "ebitda", "sde / ebitda", "sde/ebitda", "seller discretionary"]],
      ["retention", ["retention rate", "retention %", "retention"]],
      ["policyMix", ["commercial lines mix", "commercial mix", "policy mix", "commercial %"]],
      ["concentration", ["client concentration", "concentration", "top client %"]],
      ["state", ["primary state", "state", "location"]],
      ["employees", ["employee count", "employees", "number of employees", "staff"]],
      ["carrierDiv", ["carrier diversification", "carrier div", "top carrier %"]],
      ["scope", ["scope of sale", "scope", "sale type", "deal type"]],
      ["yearEstablished", ["year established", "year est", "founded", "established"]],
    ]

    for (const [logicalKey, patterns] of mappings) {
      const key = findField(patterns)
      if (key) map[logicalKey] = key
    }

    cachedFieldMap = map
    return map
  } catch (err) {
    console.error("[v0] Failed to fetch Pipedrive fields:", err)
    return {}
  }
}

async function createPipedriveDeal(params: {
  title: string
  personId: number
  stageId: number
  value: number
  note: string
  customFields?: Record<string, string | number | null>
}): Promise<number | null> {
  try {
    // Get custom field keys
    const fieldMap = await getPipedriveCustomFields()

    // Build deal body with custom field values
    const dealBody: Record<string, unknown> = {
      title: params.title,
      person_id: params.personId,
      stage_id: params.stageId,
      value: Math.round(params.value),
      currency: "USD",
    }

    // Pipedrive system field keys that must never be set via the custom field mapper
    const SYSTEM_KEYS = new Set(["origin", "source", "status", "stage_id", "pipeline_id", "owner_id", "person_id", "org_id"])

    // Map valuation data to Pipedrive custom fields
    if (params.customFields) {
      for (const [logicalKey, value] of Object.entries(params.customFields)) {
        const pipedriveKey = fieldMap[logicalKey]
        // Only write if the resolved key looks like a custom field (40-char hex) and is not a system field
        if (pipedriveKey && value != null && /^[a-f0-9]{40}$/.test(pipedriveKey) && !SYSTEM_KEYS.has(pipedriveKey)) {
          dealBody[pipedriveKey] = value
        }
      }
    }



    const res = await fetch(
      `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1/deals?api_token=${PIPEDRIVE_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dealBody),
      }
    )
    const json = await res.json()
      if (!json.success || !json.data?.id) {
      return null
    }
    const dealId = json.data.id

    // Attach note with valuation details
    if (params.note) {
      await fetch(
        `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1/notes?api_token=${PIPEDRIVE_TOKEN}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deal_id: dealId,
            content: params.note,
          }),
        }
      )
    }

    return dealId
  } catch {
    return null
  }
}

async function sendEmailNotification(data: {
  leadName: string
  leadEmail: string
  leadPhone: string
  agencyName: string
  toolUsed: string
  estimatedValue?: string
  valuationSummary: string
}) {
  if (!RESEND_API_KEY) {
    console.log("[submit-lead] RESEND_API_KEY not set, skipping email")
    return
  }

  try {
    const { from, html, subject } = adminNotificationEmail({
      leadName: data.leadName,
      leadEmail: data.leadEmail,
      leadPhone: data.leadPhone,
      agencyName: data.agencyName,
      toolUsed: data.toolUsed,
      estimatedValue: data.estimatedValue,
      valuationSummary: data.valuationSummary,
    })

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from,
        to: [NOTIFY_EMAIL],
        reply_to: data.leadEmail,
        subject,
        html,
      }),
    })
  } catch (err) {
    console.error("[submit-lead] Admin email failed:", err)
  }
}

export async function POST(req: Request) {
  // Rate limit: 5 leads per IP per 15 minutes
  const { allowed } = rateLimit(`submit-lead:${getClientIp(req)}`, 5, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
  }

  try {
    const body = await req.json()
    const {
      name, email, phone, agencyName, toolUsed, valuationSummary, estimatedValue,
      // Structured valuation data for Pipedrive custom fields
      valuationData,
    } = body

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    // Input length limits to prevent DB abuse
    if (typeof name !== "string" || name.length > 200) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 })
    }
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (typeof email !== "string" || !emailRegex.test(email) || email.length > 320) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }
    if (phone && (typeof phone !== "string" || phone.length > 30)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 })
    }
    if (agencyName && (typeof agencyName !== "string" || agencyName.length > 300)) {
      return NextResponse.json({ error: "Invalid agency name" }, { status: 400 })
    }

    const results: { pipedrive: boolean; email: boolean; dealId: number | null; leadId: number | null } = {
      pipedrive: false,
      email: false,
      dealId: null,
      leadId: null,
    }

    // Save lead to Neon
    try {
      const rows = await sql`
        INSERT INTO leads (name, email, phone, agency_name, tool_used, estimated_value, valuation_summary)
        VALUES (${name}, ${email}, ${phone || null}, ${agencyName || null}, ${toolUsed || null}, ${estimatedValue || null}, ${valuationSummary || null})
        RETURNING id
      `
      results.leadId = rows[0]?.id ?? null
    } catch (err) {
      console.error("[v0] Neon lead insert failed:", err)
    }

    // 1. Create Pipedrive person + deal
    if (PIPEDRIVE_TOKEN) {
      const stageId = await getPipedriveLeadsStageId()
      const personId = await createPipedrivePerson({ name, email, phone, agencyName })

      if (personId && stageId) {
        const dealTitle = agencyName ? `${agencyName} - ${name}` : name

        // Build custom field values from structured data
        // Numbers must be sent as actual numbers, strings as strings
        const customFields: Record<string, string | number | null> = {}
        if (valuationData) {
          const num = (v: unknown) => (v != null && v !== "" ? Number(v) : null)
          const revenueLTM = num(valuationData.revenueLTM)
          const sdeEbitda = num(valuationData.sdeEbitda)
          const retentionRate = num(valuationData.retentionRate)
          const policyMix = num(valuationData.policyMix)
          const clientConcentration = num(valuationData.clientConcentration)
          const employeeCount = num(valuationData.employeeCount)
          const carrierDiv = num(valuationData.carrierDiversification)
          const yearEstablished = num(valuationData.yearEstablished)

          if (revenueLTM) customFields.revenue = revenueLTM
          if (sdeEbitda) customFields.sde = sdeEbitda
          if (retentionRate) customFields.retention = retentionRate
          if (policyMix) customFields.policyMix = policyMix
          if (clientConcentration) customFields.concentration = clientConcentration
          if (valuationData.primaryState) customFields.state = String(valuationData.primaryState)
          if (employeeCount) customFields.employees = employeeCount
          if (carrierDiv) customFields.carrierDiv = carrierDiv
          if (yearEstablished) customFields.yearEstablished = yearEstablished
          if (valuationData.scopeOfSale != null) {
            const scopeLabels: Record<number, string> = { 1: "Full Agency", 0.95: "Book Purchase", 0.9: "Fragmented" }
            customFields.scope = scopeLabels[Number(valuationData.scopeOfSale)] || String(valuationData.scopeOfSale)
          }
          // Note: "source" is intentionally omitted — Pipedrive's "origin" field is system-generated and cannot be set via the API
        }
        const dealId = await createPipedriveDeal({
          title: dealTitle,
          personId,
          stageId,
          value: estimatedValue || 0,
          note: `Contact: ${name} (${email})\nAgency: ${agencyName || "N/A"}\nPhone: ${phone || "N/A"}\nTool: ${toolUsed || "Agency Valuation"}\n\n--- Valuation Summary ---\n${valuationSummary || "No valuation data"}`,
          customFields,
        })
        if (dealId) {
          results.pipedrive = true
          results.dealId = dealId
          // Backfill Pipedrive deal ID on the lead row
          if (results.leadId) {
            await sql`UPDATE leads SET pipedrive_deal_id = ${dealId} WHERE id = ${results.leadId}`.catch(() => {})
          }
        }
      }
    }

    // 2. Send admin notification email
    await sendEmailNotification({
      leadName: name,
      leadEmail: email,
      leadPhone: phone,
      agencyName,
      toolUsed: toolUsed || "Agency Valuation",
      estimatedValue: estimatedValue?.toString(),
      valuationSummary: valuationSummary || "No valuation data yet",
    })
    results.email = true

    // 3. Queue 3-email drip sequence for the lead
    if (results.leadId) {
      const now = new Date()
      const day2 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
      const day5 = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
      await sql`
        INSERT INTO email_drip (lead_id, sequence, send_after)
        VALUES
          (${results.leadId}, 1, ${now.toISOString()}),
          (${results.leadId}, 2, ${day2.toISOString()}),
          (${results.leadId}, 3, ${day5.toISOString()})
        ON CONFLICT (lead_id, sequence) DO NOTHING
      `.catch((err) => console.error("[submit-lead] Failed to queue drip emails:", err))

      // Trigger the drip processor immediately so Email 1 goes out right away
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/send-drip-email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, ...results, leadId: results.leadId })
  } catch (err) {
    console.error("[v0] Lead submission error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
