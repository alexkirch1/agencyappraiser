import { NextResponse } from "next/server"

const RESEND_API_KEY = process.env.RESEND_API_KEY

const DRIP_EMAILS = {
  welcome: {
    subject: "Your Agency Valuation Report is Ready",
    html: (data: { name: string; valuationRange?: string }) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #0f172a; font-size: 24px; margin: 0;">Agency Appraiser</h1>
        </div>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi ${data.name},</p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Thank you for using Agency Appraiser to value your insurance agency. ${data.valuationRange ? `Your estimated valuation range is <strong style="color: #16a34a;">${data.valuationRange}</strong>.` : ''}
        </p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          This is the first step in understanding what your agency is worth. Over the next few days, I'll share some insights to help you maximize your valuation:
        </p>
        
        <ul style="color: #334155; font-size: 16px; line-height: 2;">
          <li>The #1 factor that kills agency valuations</li>
          <li>How to increase your multiple by 0.5x or more</li>
          <li>What buyers look for in due diligence</li>
        </ul>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          In the meantime, you can revisit your valuation anytime at <a href="https://agencyappraiser.com/calculator" style="color: #0ea5e9;">agencyappraiser.com/calculator</a>.
        </p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 32px;">
          Talk soon,<br/>
          <strong>The Agency Appraiser Team</strong>
        </p>
        
        <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px;">
            You received this email because you used Agency Appraiser. <a href="#" style="color: #94a3b8;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `,
  },
  day2_retention: {
    subject: "The #1 Factor That Kills Agency Valuations",
    html: (data: { name: string }) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #0f172a; font-size: 24px; margin: 0;">Agency Appraiser</h1>
        </div>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi ${data.name},</p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Want to know the single biggest factor that can tank your agency's valuation?
        </p>
        
        <p style="color: #334155; font-size: 20px; line-height: 1.6; font-weight: bold; text-align: center; padding: 16px; background: #fef3c7; border-radius: 8px; margin: 24px 0;">
          Poor Client Retention
        </p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Here's why it matters so much to buyers:
        </p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          <strong>At 85% retention</strong>, you lose 15% of your book every year. After 3 years, only 61% of today's revenue remains. Buyers see this as a "leaky bucket" — they're essentially buying declining revenue.
        </p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          <strong>At 92% retention</strong>, you keep 78% of revenue after 3 years. That's a massive difference in the buyer's projected returns.
        </p>
        
        <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 24px 0;">
          <p style="color: #166534; font-size: 14px; margin: 0;">
            <strong>Pro tip:</strong> The easiest retention wins come from implementing a 90-day pre-renewal call program. Call your clients 90 days before renewal to address concerns before they shop.
          </p>
        </div>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Tomorrow, I'll share how to potentially add 0.5x or more to your valuation multiple.
        </p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 32px;">
          Best,<br/>
          <strong>The Agency Appraiser Team</strong>
        </p>
        
        <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px;">
            <a href="#" style="color: #94a3b8;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `,
  },
  day4_multiple: {
    subject: "How to Add 0.5x to Your Valuation Multiple",
    html: (data: { name: string }) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #0f172a; font-size: 24px; margin: 0;">Agency Appraiser</h1>
        </div>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi ${data.name},</p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          On a $500K revenue agency, the difference between a 2.5x and 3.0x multiple is <strong>$250,000</strong>. Here's how to move the needle:
        </p>
        
        <h3 style="color: #0f172a; font-size: 18px; margin-top: 24px;">1. Clean Up Your Book (Quick Win)</h3>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Non-renew chronic claimants and unprofitable accounts. A cleaner loss ratio can add 0.1-0.2x to your multiple.
        </p>
        
        <h3 style="color: #0f172a; font-size: 18px; margin-top: 24px;">2. Diversify Your Carrier Mix</h3>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          If more than 40% of your book is with one carrier, buyers see concentration risk. Spread new business across 3-4 carriers.
        </p>
        
        <h3 style="color: #0f172a; font-size: 18px; margin-top: 24px;">3. Document Everything</h3>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Buyers pay premiums for "turnkey" agencies. Have clear processes documented, clean financials, and organized carrier statements.
        </p>
        
        <h3 style="color: #0f172a; font-size: 18px; margin-top: 24px;">4. Commit to a Transition Period</h3>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Staying on for 12-24 months post-sale can add 0.25-0.5x. Buyers fear client attrition when the face of the agency disappears.
        </p>
        
        <div style="background: #eff6ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 24px 0;">
          <p style="color: #1e40af; font-size: 14px; margin: 0;">
            <strong>Want help preparing?</strong> Reply to this email and I'll connect you with our team for a free consultation.
          </p>
        </div>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 32px;">
          Best,<br/>
          <strong>The Agency Appraiser Team</strong>
        </p>
        
        <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px;">
            <a href="#" style="color: #94a3b8;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `,
  },
  day7_duediligence: {
    subject: "What Buyers Look For in Due Diligence",
    html: (data: { name: string }) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #0f172a; font-size: 24px; margin: 0;">Agency Appraiser</h1>
        </div>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi ${data.name},</p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          This is the final email in our series. Today: what happens after you accept an offer.
        </p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Due diligence is where deals die or valuations get cut. Here's what buyers will request:
        </p>
        
        <h3 style="color: #0f172a; font-size: 16px; margin-top: 24px;">Financial Documents</h3>
        <ul style="color: #334155; font-size: 14px; line-height: 2;">
          <li>3 years of tax returns</li>
          <li>Monthly P&L statements</li>
          <li>Carrier commission statements</li>
          <li>Contingency and bonus documentation</li>
        </ul>
        
        <h3 style="color: #0f172a; font-size: 16px; margin-top: 24px;">Book of Business Data</h3>
        <ul style="color: #334155; font-size: 14px; line-height: 2;">
          <li>Policy-level export from your AMS</li>
          <li>Retention by year and carrier</li>
          <li>Loss ratio reports</li>
          <li>Client concentration analysis</li>
        </ul>
        
        <h3 style="color: #0f172a; font-size: 16px; margin-top: 24px;">Legal & Operations</h3>
        <ul style="color: #334155; font-size: 14px; line-height: 2;">
          <li>Carrier contracts and appointments</li>
          <li>E&O policy and claims history</li>
          <li>Employee agreements (especially non-competes)</li>
          <li>Office lease terms</li>
        </ul>
        
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0;">
          <p style="color: #991b1b; font-size: 14px; margin: 0;">
            <strong>Common deal-killer:</strong> Discovering that key producers have no non-compete agreements. Buyers fear they'll leave and take clients with them.
          </p>
        </div>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Start gathering these documents now, even if you're years from selling. Being prepared signals professionalism and can speed up your deal by weeks.
        </p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center;">
          <p style="color: #166534; font-size: 16px; font-weight: bold; margin: 0 0 8px 0;">Ready to take the next step?</p>
          <p style="color: #334155; font-size: 14px; margin: 0;">
            Reply to this email or visit <a href="https://agencyappraiser.com" style="color: #0ea5e9;">agencyappraiser.com</a> to connect with our team.
          </p>
        </div>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 32px;">
          Best of luck with your agency journey,<br/>
          <strong>The Agency Appraiser Team</strong>
        </p>
        
        <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px;">
            <a href="#" style="color: #94a3b8;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `,
  },
}

export async function POST(req: Request) {
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { email, name, emailType, valuationRange } = body

    if (!email || !name || !emailType) {
      return NextResponse.json({ error: "email, name, and emailType are required" }, { status: 400 })
    }

    const template = DRIP_EMAILS[emailType as keyof typeof DRIP_EMAILS]
    if (!template) {
      return NextResponse.json({ error: "Invalid emailType" }, { status: 400 })
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Agency Appraiser <onboarding@resend.dev>",
        to: [email],
        reply_to: "mergers@rockyquote.com",
        subject: template.subject,
        html: template.html({ name, valuationRange }),
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error("[v0] Drip email send failed:", result)
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: result.id })
  } catch (err) {
    console.error("[v0] Drip email error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
