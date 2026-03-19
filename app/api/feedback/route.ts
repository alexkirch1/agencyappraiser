import { NextResponse } from "next/server"

// Email notifications are disabled until a valid Resend API key is configured
const RESEND_API_KEY: string | undefined = undefined // process.env.RESEND_API_KEY
const NOTIFY_EMAIL = "mergers@rockyquote.com"

export async function POST(req: Request) {
  try {
    const { message, category } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: "No message" }, { status: 400 })
    }

    // Send email notification if Resend is configured
    if (RESEND_API_KEY) {
      const categoryLabels: Record<string, string> = {
        "carrier-request":  "Carrier Request",
        "feature-request":  "Feature Request",
        "calculator-feedback": "Calculator Feedback",
        "general":          "General Feedback",
      }
      const label = categoryLabels[category] ?? "Feedback"

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Agency Appraiser <onboarding@resend.dev>",
          to: [NOTIFY_EMAIL],
          subject: `[${label}] New feedback submitted`,
          html: `
            <h2>${label}</h2>
            <p>${message.replace(/\n/g, "<br>")}</p>
            <hr>
            <p style="color:#888;font-size:12px">Submitted via Agency Appraiser feedback widget</p>
          `,
        }),
      })
      await res.json()
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[v0] Feedback submission error:", err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
