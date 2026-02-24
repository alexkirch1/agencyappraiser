import { NextResponse } from "next/server"

const PIPEDRIVE_TOKEN = process.env.PIPEDRIVE_API_TOKEN
const PIPEDRIVE_DOMAIN = "rocky" // your Pipedrive subdomain
const RESEND_API_KEY = process.env.RESEND_API_KEY
const NOTIFY_EMAIL = "mergers@rockyquote.com"

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

// Cache for Pipedrive custom field keys (fetched once)
let cachedFieldMap: Record<string, string> | null = null

async function getPipedriveCustomFields(): Promise<Record<string, string>> {
  if (cachedFieldMap) return cachedFieldMap
  try {
    const res = await fetch(
      `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1/dealFields?api_token=${PIPEDRIVE_TOKEN}`
    )
    const json = await res.json()
    if (!json.success || !json.data) return {}
    const map: Record<string, string> = {}
    for (const field of json.data) {
      // Map common field names to their API keys
      const name = (field.name || "").toLowerCase()
      if (name.includes("revenue") && !name.includes("per")) map.revenue = field.key
      else if (name.includes("sde") || name.includes("ebitda")) map.sde = field.key
      else if (name.includes("retention")) map.retention = field.key
      else if (name.includes("commercial") && name.includes("mix")) map.policyMix = field.key
      else if (name.includes("concentration")) map.concentration = field.key
      else if (name.includes("state") && !name.includes("status")) map.state = field.key
      else if (name.includes("employee")) map.employees = field.key
      else if (name.includes("carrier") && name.includes("div")) map.carrierDiv = field.key
      else if (name.includes("scope")) map.scope = field.key
      else if (name.includes("year") && name.includes("est")) map.yearEstablished = field.key
      else if (name.includes("tool") || name.includes("source")) map.source = field.key
    }
    cachedFieldMap = map
    return map
  } catch {
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

    // Map valuation data to Pipedrive custom fields
    if (params.customFields) {
      for (const [logicalKey, value] of Object.entries(params.customFields)) {
        const pipedriveKey = fieldMap[logicalKey]
        if (pipedriveKey && value != null) {
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
    if (!json.success || !json.data?.id) return null
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
  valuationSummary: string
}) {
  if (!RESEND_API_KEY) {
    console.log("[v0] RESEND_API_KEY not set, skipping email")
    return
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Agency Appraiser <onboarding@resend.dev>",
        to: [NOTIFY_EMAIL],
        subject: `New Lead: ${data.leadName} - ${data.toolUsed}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0ea5e9;">New Agency Appraiser Lead</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Name</td>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${data.leadName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Email</td>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0;"><a href="mailto:${data.leadEmail}">${data.leadEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Phone</td>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${data.leadPhone || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Agency</td>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${data.agencyName || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Tool Used</td>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${data.toolUsed}</td>
              </tr>
            </table>
            <h3 style="margin-top: 24px;">Valuation Details</h3>
            <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 14px;">
${data.valuationSummary}
            </div>
            <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">
              This lead was submitted via the Agency Appraiser calculator at ${new Date().toLocaleString()}.
            </p>
          </div>
        `,
      }),
    })
  } catch (err) {
    console.error("[v0] Email send failed:", err)
  }
}

export async function POST(req: Request) {
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

    const results: { pipedrive: boolean; email: boolean; dealId: number | null } = {
      pipedrive: false,
      email: false,
      dealId: null,
    }

    // 1. Create Pipedrive person + deal
    if (PIPEDRIVE_TOKEN) {
      const stageId = await getPipedriveLeadsStageId()
      const personId = await createPipedrivePerson({ name, email, phone, agencyName })

      if (personId && stageId) {
        const dealTitle = agencyName ? `${agencyName} - ${name}` : name

        // Build custom field values from structured data
        const customFields: Record<string, string | number | null> = {}
        if (valuationData) {
          if (valuationData.revenueLTM) customFields.revenue = valuationData.revenueLTM
          if (valuationData.sdeEbitda) customFields.sde = valuationData.sdeEbitda
          if (valuationData.retentionRate) customFields.retention = valuationData.retentionRate
          if (valuationData.policyMix) customFields.policyMix = valuationData.policyMix
          if (valuationData.clientConcentration) customFields.concentration = valuationData.clientConcentration
          if (valuationData.primaryState) customFields.state = valuationData.primaryState
          if (valuationData.employeeCount) customFields.employees = valuationData.employeeCount
          if (valuationData.carrierDiversification) customFields.carrierDiv = valuationData.carrierDiversification
          if (valuationData.yearEstablished) customFields.yearEstablished = valuationData.yearEstablished
          if (valuationData.scopeOfSale != null) {
            const scopeLabels: Record<number, string> = { 1: "Full Agency", 0.95: "Book Purchase", 0.9: "Fragmented" }
            customFields.scope = scopeLabels[valuationData.scopeOfSale] || String(valuationData.scopeOfSale)
          }
          customFields.source = toolUsed || "Agency Valuation"
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
        }
      }
    }

    // 2. Send email notification
    await sendEmailNotification({
      leadName: name,
      leadEmail: email,
      leadPhone: phone,
      agencyName,
      toolUsed: toolUsed || "Agency Valuation",
      valuationSummary: valuationSummary || "No valuation data yet (lead captured pre-calculation)",
    })
    results.email = true

    return NextResponse.json({ success: true, ...results })
  } catch (err) {
    console.error("[v0] Lead submission error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
