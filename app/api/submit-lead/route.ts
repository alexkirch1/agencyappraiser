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

async function createPipedriveDeal(params: {
  title: string
  personId: number
  stageId: number
  value: number
  note: string
}): Promise<number | null> {
  try {
    const res = await fetch(
      `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1/deals?api_token=${PIPEDRIVE_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: params.title,
          person_id: params.personId,
          stage_id: params.stageId,
          value: Math.round(params.value),
          currency: "USD",
        }),
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
    const { name, email, phone, agencyName, toolUsed, valuationSummary, estimatedValue } = body

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
        const dealTitle = `${agencyName || name} - ${toolUsed || "Agency Valuation"}`
        const dealId = await createPipedriveDeal({
          title: dealTitle,
          personId,
          stageId,
          value: estimatedValue || 0,
          note: `Tool: ${toolUsed}\nContact: ${name} (${email})\nAgency: ${agencyName || "N/A"}\nPhone: ${phone || "N/A"}\n\n--- Valuation Summary ---\n${valuationSummary || "No valuation data"}`,
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
