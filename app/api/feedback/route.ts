export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import sql from "@/lib/db"

const RESEND_API_KEY: string | undefined = process.env.RESEND_API_KEY
const NOTIFY_EMAIL = "mergers@rockyquote.com"

export async function POST(req: Request) {
  // Rate limit: 3 feedback messages per IP per 10 minutes
  const { allowed } = rateLimit(`feedback:${getClientIp(req)}`, 3, 10 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait before sending more feedback." }, { status: 429 })
  }

  try {
    const { message, category } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: "No message" }, { status: 400 })
    }

    // Cap message length
    if (typeof message !== "string" || message.length > 2000) {
      return NextResponse.json({ error: "Message too long (max 2000 characters)." }, { status: 400 })
    }

    // Persist to database so admin can view and respond
    try {
      await sql`
        INSERT INTO feedback (message, category, status)
        VALUES (${message.trim()}, ${category ?? "general"}, 'new')
      `
    } catch (dbErr) {
      console.error("[feedback] DB insert failed:", dbErr)
      // Non-fatal — still send email if configured
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
