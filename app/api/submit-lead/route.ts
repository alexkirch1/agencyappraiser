export const dynamic = "force-dynamic"

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
      ["revenue",          ["total annual commissions", "annual commissions/revenue (ltm)", "revenue ltm", "annual revenue", "revenue"]],
      ["revenueY2",        ["annual commissions/revenue (y-2)", "revenue y-2", "y-2 revenue"]],
      ["revenueY3",        ["annual commissions/revenue (y-3)", "revenue y-3", "y-3 revenue"]],
      ["sde",              ["seller's discretionary earnings", "sde", "ebitda", "adj. ebitda"]],
      ["retention",        ["client/policy retention rate", "retention rate", "retention %", "retention"]],
      ["policyMix",        ["policy mix (revenue % commercial)", "commercial lines mix", "policy mix", "commercial %"]],
      ["concentration",    ["client concentration", "concentration", "top 10 clients"]],
      ["state",            ["primary state of operation", "primary state", "state", "location"]],
      ["employees",        ["total number of employees", "employee count", "employees", "ftes"]],
      ["carrierDiv",       ["carrier diversification (revenue % from top 3", "carrier diversification", "carrier div"]],
      ["scope",            ["scope of sale", "scope", "sale type", "deal type"]],
      ["yearEstablished",  ["year agency established", "year established", "year est", "founded"]],
      ["topCarriers",      ["top 5 carriers", "top carriers", "carriers (comma"]],
      ["closingTimeline",  ["closing timeline", "timeline", "time to close"]],
      ["calculatedMultiple",["calculated multiple", "multiple"]],
      ["lowOffer",         ["low offer"]],
      ["highOffer",        ["high offer"]],
      ["ownerCompensation",["owners compensation", "owner compensation", "owner comp"]],
      ["annualPayroll",    ["annual payroll cost", "annual payroll", "payroll"]],
      ["staffRetentionRisk",["staff retention risk", "staff risk"]],
      ["avgClientTenure",  ["average client tenure", "avg client tenure", "client tenure"]],
      ["officeStructure",  ["office structure", "office type"]],
      ["agencyDescription",["agency description", "specialty", "niche"]],
      ["rpe",              ["revenue per employee", "rpe"]],
      ["newBusinessValue", ["new business value", "new business"]],
      ["ownerCompensation",["owners compensation", "owner compensation", "owner comp"]],
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
  // Env var presence check — helps debug missing config without leaking values
  console.log("[v0] submit-lead: DATABASE_URL set?", !!process.env.DATABASE_URL)
  console.log("[v0] submit-lead: PIPEDRIVE_API_TOKEN set?", !!process.env.PIPEDRIVE_API_TOKEN)
  console.log("[v0] submit-lead: RESEND_API_KEY set?", !!process.env.RESEND_API_KEY)

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
          const str = (v: unknown) => (v != null && v !== "" ? String(v) : null)

          const revenueLTM        = num(valuationData.revenueLTM)
          const sdeEbitda         = num(valuationData.sdeEbitda)
          const retentionRate     = num(valuationData.retentionRate)
          const policyMix         = num(valuationData.policyMix)
          const clientConcentration = num(valuationData.clientConcentration)
          const employeeCount     = num(valuationData.employeeCount)
          const carrierDiv        = num(valuationData.carrierDiversification)
          const yearEstablished   = num(valuationData.yearEstablished)
          const ownerComp         = num(valuationData.ownerCompensation)
          const annualPayroll     = num(valuationData.annualPayroll)
          const avgClientTenure   = num(valuationData.avgClientTenure)
          const revenueY2         = num(valuationData.revenueY2)
          const revenueY3         = num(valuationData.revenueY3)
          const calcMultiple      = num(valuationData.calculatedMultiple)
          const lowOffer          = num(valuationData.lowOffer)
          const highOffer         = num(valuationData.highOffer)

          // Numeric fields
          if (revenueLTM)         customFields.revenue             = revenueLTM
          if (revenueY2)          customFields.revenueY2           = revenueY2
          if (revenueY3)          customFields.revenueY3           = revenueY3
          if (sdeEbitda)          customFields.sde                 = sdeEbitda
          if (retentionRate)      customFields.retention           = retentionRate
          if (policyMix)          customFields.policyMix           = policyMix
          if (clientConcentration)customFields.concentration       = clientConcentration
          if (employeeCount)      customFields.employees           = employeeCount
          if (carrierDiv)         customFields.carrierDiv          = carrierDiv
          if (yearEstablished)    customFields.yearEstablished     = yearEstablished
          if (ownerComp)          customFields.ownerCompensation   = ownerComp
          if (annualPayroll)      customFields.annualPayroll       = annualPayroll
          if (avgClientTenure)    customFields.avgClientTenure     = avgClientTenure
          if (calcMultiple)       customFields.calculatedMultiple  = calcMultiple
          if (lowOffer)           customFields.lowOffer            = lowOffer
          if (highOffer)          customFields.highOffer           = highOffer

          // Revenue Per Employee — computed here so Pipedrive always gets the derived value
          if (revenueLTM && employeeCount && employeeCount > 0) {
            customFields.rpe = Math.round(revenueLTM / employeeCount)
          }

          // String / enum fields
          if (valuationData.primaryState)   customFields.state              = str(valuationData.primaryState)!
          if (valuationData.topCarriers)     customFields.topCarriers        = str(valuationData.topCarriers)!
          if (valuationData.closingTimeline) customFields.closingTimeline    = str(valuationData.closingTimeline)!
          if (valuationData.staffRetentionRisk) customFields.staffRetentionRisk = str(valuationData.staffRetentionRisk)!
          if (valuationData.officeStructure) customFields.officeStructure    = str(valuationData.officeStructure)!
          if (valuationData.agencyDescription) customFields.agencyDescription = str(valuationData.agencyDescription)!
          if (valuationData.newBusinessValue) customFields.newBusinessValue  = str(valuationData.newBusinessValue)!

          // Scope of Sale — convert multiplier value to a human-readable label
          if (valuationData.scopeOfSale != null) {
            const scopeLabels: Record<string, string> = {
              "1": "Full Agency", "0.95": "Book Purchase", "0.9": "Fragmented",
            }
            customFields.scope = scopeLabels[String(valuationData.scopeOfSale)] ?? str(valuationData.scopeOfSale)!
          }
          // Note: "source"/"origin" is system-generated by Pipedrive and cannot be set via the API
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
      const appUrl = process.env.NEXT_PUBLIC_BASE_URL
        ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
      const cronHeaders: Record<string, string> = { "Content-Type": "application/json" }
      if (process.env.CRON_SECRET) cronHeaders["Authorization"] = `Bearer ${process.env.CRON_SECRET}`
      fetch(`${appUrl}/api/send-drip-email`, {
        method: "POST",
        headers: cronHeaders,
      }).catch((e) => console.error("[submit-lead] Failed to trigger drip:", e))
    }

    return NextResponse.json({ success: true, ...results, leadId: results.leadId })
  } catch (err) {
    console.error("[v0] Lead submission error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
