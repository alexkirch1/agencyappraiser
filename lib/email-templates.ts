// Shared email templates for Agency Appraiser
// All emails use inline styles for maximum email client compatibility

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://agencyappraiser.com"
const FROM = "Agency Appraiser <hello@agencyappraiser.com>"
const BRAND_COLOR = "#0ea5e9"
const DARK_TEXT = "#0f172a"
const MUTED_TEXT = "#64748b"
const BG = "#f8fafc"
const CARD_BG = "#ffffff"
const BORDER = "#e2e8f0"

function layout(content: string, preheader = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agency Appraiser</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:${BG};">${preheader}</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:${DARK_TEXT};border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
            <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Agency Appraiser</span>
            <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;letter-spacing:0.5px;text-transform:uppercase;">Independent Agency Valuation</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:${CARD_BG};padding:32px 32px 24px;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:${BG};border:1px solid ${BORDER};border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:${MUTED_TEXT};">
              Agency Appraiser &mdash; Independent Insurance Agency Valuation Tool<br/>
              <a href="${BASE_URL}" style="color:${BRAND_COLOR};text-decoration:none;">${BASE_URL}</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function statBox(label: string, value: string) {
  return `<td style="text-align:center;padding:12px 8px;">
    <div style="background:${BG};border:1px solid ${BORDER};border-radius:8px;padding:14px 12px;">
      <div style="font-size:20px;font-weight:700;color:${DARK_TEXT};">${value}</div>
      <div style="font-size:11px;color:${MUTED_TEXT};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
    </div>
  </td>`
}

// ─── Admin notification email ────────────────────────────────────────────────

export function adminNotificationEmail(data: {
  leadName: string
  leadEmail: string
  leadPhone?: string
  agencyName?: string
  toolUsed: string
  estimatedValue?: string
  valuationSummary?: string
}) {
  const value = data.estimatedValue
    ? `$${Number(data.estimatedValue).toLocaleString()}`
    : "Not calculated"

  const html = layout(`
    <div style="display:inline-block;background:${BRAND_COLOR}22;border:1px solid ${BRAND_COLOR}44;border-radius:20px;padding:4px 12px;font-size:12px;color:${BRAND_COLOR};font-weight:600;margin-bottom:16px;">
      NEW LEAD
    </div>
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:${DARK_TEXT};">${data.leadName}</h1>
    <p style="margin:0 0 24px;font-size:15px;color:${MUTED_TEXT};">${data.agencyName || "Independent Agency"} &mdash; via ${data.toolUsed}</p>

    <!-- Value highlight -->
    <div style="background:linear-gradient(135deg,#0ea5e922,#0ea5e911);border:1px solid #0ea5e933;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
      <div style="font-size:13px;color:${MUTED_TEXT};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Estimated Agency Value</div>
      <div style="font-size:36px;font-weight:800;color:${BRAND_COLOR};">${value}</div>
    </div>

    <!-- Contact info -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:10px 14px;background:${BG};border:1px solid ${BORDER};border-radius:6px 6px 0 0;display:flex;justify-content:space-between;">
          <span style="font-size:13px;color:${MUTED_TEXT};font-weight:500;">Email</span>
          <span style="font-size:13px;color:${DARK_TEXT};font-weight:600;">${data.leadEmail}</span>
        </td>
      </tr>
      <tr><td height="2"></td></tr>
      <tr>
        <td style="padding:10px 14px;background:${BG};border:1px solid ${BORDER};border-radius:0;display:flex;justify-content:space-between;">
          <span style="font-size:13px;color:${MUTED_TEXT};font-weight:500;">Phone</span>
          <span style="font-size:13px;color:${DARK_TEXT};font-weight:600;">${data.leadPhone || "Not provided"}</span>
        </td>
      </tr>
      <tr><td height="2"></td></tr>
      <tr>
        <td style="padding:10px 14px;background:${BG};border:1px solid ${BORDER};border-radius:0 0 6px 6px;display:flex;justify-content:space-between;">
          <span style="font-size:13px;color:${MUTED_TEXT};font-weight:500;">Agency</span>
          <span style="font-size:13px;color:${DARK_TEXT};font-weight:600;">${data.agencyName || "Not provided"}</span>
        </td>
      </tr>
    </table>

    ${data.valuationSummary ? `
    <div style="background:${BG};border:1px solid ${BORDER};border-left:3px solid ${BRAND_COLOR};border-radius:6px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:${MUTED_TEXT};text-transform:uppercase;letter-spacing:0.5px;">Valuation Summary</p>
      <p style="margin:0;font-size:13px;color:${DARK_TEXT};line-height:1.6;white-space:pre-wrap;">${data.valuationSummary}</p>
    </div>` : ""}

    <a href="mailto:${data.leadEmail}?subject=Your Agency Valuation - Agency Appraiser" 
       style="display:block;text-align:center;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;">
      Reply to ${data.leadName}
    </a>

    <p style="margin:16px 0 0;font-size:12px;color:${MUTED_TEXT};text-align:center;">
      Submitted ${new Date().toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })} ET
    </p>
  `, `New lead: ${data.leadName} from ${data.agencyName || "unknown agency"} — ${value}`)

  return { from: FROM, html, subject: `New Lead: ${data.leadName} — ${value}` }
}

// ─── Email 1: Instant confirmation to the lead ───────────────────────────────

export function leadConfirmationEmail(data: {
  firstName: string
  agencyName?: string
  estimatedValue?: string
  valuationSummary?: string
  leadId: number
}) {
  const value = data.estimatedValue
    ? `$${Number(data.estimatedValue).toLocaleString()}`
    : null

  const unsubUrl = `${BASE_URL}/api/unsubscribe?lead=${data.leadId}&seq=all`

  const html = layout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${DARK_TEXT};">Hi ${data.firstName},</h1>
    <p style="margin:0 0 24px;font-size:16px;color:${MUTED_TEXT};line-height:1.6;">
      Thanks for using Agency Appraiser. Your valuation request has been received and one of our team members will be in touch shortly.
    </p>

    ${value ? `
    <div style="background:linear-gradient(135deg,#0ea5e922,#0ea5e911);border:1px solid #0ea5e933;border-radius:10px;padding:24px;margin-bottom:24px;text-align:center;">
      <div style="font-size:13px;color:${MUTED_TEXT};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Your Estimated Agency Value</div>
      <div style="font-size:40px;font-weight:800;color:${BRAND_COLOR};line-height:1;">${value}</div>
      ${data.agencyName ? `<div style="margin-top:8px;font-size:13px;color:${MUTED_TEXT};">${data.agencyName}</div>` : ""}
    </div>` : ""}

    ${data.valuationSummary ? `
    <div style="background:${BG};border:1px solid ${BORDER};border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:${MUTED_TEXT};text-transform:uppercase;letter-spacing:0.5px;">Valuation Breakdown</p>
      <p style="margin:0;font-size:14px;color:${DARK_TEXT};line-height:1.7;white-space:pre-wrap;">${data.valuationSummary}</p>
    </div>` : ""}

    <div style="border-top:1px solid ${BORDER};margin:24px 0;"></div>

    <h2 style="margin:0 0 12px;font-size:17px;font-weight:700;color:${DARK_TEXT};">What happens next?</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:32px;vertical-align:top;padding-top:2px;">
          <div style="width:24px;height:24px;background:${BRAND_COLOR};border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;">1</div>
        </td>
        <td style="padding:0 0 16px 12px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:${DARK_TEXT};">We review your valuation</p>
          <p style="margin:4px 0 0;font-size:13px;color:${MUTED_TEXT};">Our team looks at your inputs and compares against recent comparable agency transactions.</p>
        </td>
      </tr>
      <tr>
        <td style="width:32px;vertical-align:top;padding-top:2px;">
          <div style="width:24px;height:24px;background:${BRAND_COLOR};border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;">2</div>
        </td>
        <td style="padding:0 0 16px 12px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:${DARK_TEXT};">You receive a detailed breakdown</p>
          <p style="margin:4px 0 0;font-size:13px;color:${MUTED_TEXT};">We&apos;ll send you a more detailed analysis including what drives value in your specific agency.</p>
        </td>
      </tr>
      <tr>
        <td style="width:32px;vertical-align:top;padding-top:2px;">
          <div style="width:24px;height:24px;background:${BRAND_COLOR};border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;">3</div>
        </td>
        <td style="padding:0 0 0 12px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:${DARK_TEXT};">Decide on your next move</p>
          <p style="margin:4px 0 0;font-size:13px;color:${MUTED_TEXT};">Whether you&apos;re ready to sell now or just exploring, we can help you understand your options.</p>
        </td>
      </tr>
    </table>

    <div style="border-top:1px solid ${BORDER};margin:24px 0;"></div>

    <a href="${BASE_URL}/calculator"
       style="display:block;text-align:center;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;">
      Run Another Valuation
    </a>

    <p style="margin:24px 0 0;font-size:12px;color:${MUTED_TEXT};text-align:center;">
      Questions? Reply to this email — we read every one.<br/>
      <a href="${unsubUrl}" style="color:${MUTED_TEXT};text-decoration:underline;">Unsubscribe from follow-up emails</a>
    </p>
  `, `Your agency valuation is ready${value ? ` — ${value}` : ""}`)

  return {
    from: FROM,
    html,
    subject: value
      ? `Your Agency Valuation: ${value} — Agency Appraiser`
      : "Your Agency Appraiser Valuation — Next Steps",
  }
}

// ─── Email 2: Value drivers deep dive (sent ~2 days later) ───────────────────

export function dripEmail2(data: {
  firstName: string
  agencyName?: string
  estimatedValue?: string
  leadId: number
}) {
  const value = data.estimatedValue
    ? `$${Number(data.estimatedValue).toLocaleString()}`
    : "your agency"
  const unsubUrl = `${BASE_URL}/api/unsubscribe?lead=${data.leadId}&seq=all`

  const html = layout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${DARK_TEXT};">What actually drives your agency&apos;s value?</h1>
    <p style="margin:0 0 24px;font-size:15px;color:${MUTED_TEXT};line-height:1.6;">
      Hi ${data.firstName} &mdash; following up on your valuation${data.agencyName ? ` for ${data.agencyName}` : ""}.
      Most agency owners are surprised to learn that the number they got (${value}) can swing significantly
      based on just a few key factors.
    </p>

    <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:${DARK_TEXT};">The 5 biggest value drivers</h2>

    ${[
      ["Retention Rate", "The #1 driver. Every 1% improvement in retention can add 5–10% to your valuation multiple. Agencies above 90% command premium prices."],
      ["Revenue Mix (PL vs CL)", "Commercial lines are valued higher — typically 1.8–2.5x revenue vs 1.2–1.8x for personal lines. A shift toward CL meaningfully increases value."],
      ["Owner Dependency", "Buyers discount agencies heavily if revenue walks out the door when the owner does. Documented processes and delegated relationships are worth real money."],
      ["Carrier Diversification", "Concentration with a single carrier is a risk flag. Spread across 5+ carriers with no single carrier above 30% of premium is ideal."],
      ["Growth Trend", "A flat book sells at a discount. Consistent 5–10% annual growth signals a healthy operation and justifies higher multiples."],
    ].map(([title, desc], i) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="width:36px;vertical-align:top;">
          <div style="width:28px;height:28px;background:${BRAND_COLOR}22;border:1px solid ${BRAND_COLOR}44;border-radius:8px;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:${BRAND_COLOR};">${i + 1}</div>
        </td>
        <td style="padding-left:12px;">
          <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:${DARK_TEXT};">${title}</p>
          <p style="margin:0;font-size:13px;color:${MUTED_TEXT};line-height:1.5;">${desc}</p>
        </td>
      </tr>
    </table>`).join("")}

    <div style="background:${BG};border:1px solid ${BORDER};border-left:3px solid ${BRAND_COLOR};border-radius:6px;padding:16px;margin:24px 0;">
      <p style="margin:0;font-size:14px;color:${DARK_TEXT};line-height:1.6;">
        <strong>Want a more precise valuation?</strong> The full calculator lets you model different scenarios —
        see exactly how improving retention or growing commercial lines affects your final number.
      </p>
    </div>

    <a href="${BASE_URL}/calculator"
       style="display:block;text-align:center;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;margin-bottom:24px;">
      Try the Full Valuation Calculator
    </a>

    <p style="margin:0;font-size:12px;color:${MUTED_TEXT};text-align:center;">
      <a href="${unsubUrl}" style="color:${MUTED_TEXT};text-decoration:underline;">Unsubscribe from follow-up emails</a>
    </p>
  `, "The 5 factors that move your agency valuation the most")

  return {
    from: FROM,
    html,
    subject: `What moves your agency value — and what doesn&apos;t`,
  }
}

// ─── Email 3: Soft CTA (sent ~5 days later) ──────────────────────────────────

export function dripEmail3(data: {
  firstName: string
  agencyName?: string
  estimatedValue?: string
  leadId: number
}) {
  const value = data.estimatedValue
    ? `$${Number(data.estimatedValue).toLocaleString()}`
    : "your agency"
  const unsubUrl = `${BASE_URL}/api/unsubscribe?lead=${data.leadId}&seq=all`

  const html = layout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${DARK_TEXT};">Ready to explore your options?</h1>
    <p style="margin:0 0 24px;font-size:15px;color:${MUTED_TEXT};line-height:1.6;">
      Hi ${data.firstName} &mdash; this is my last follow-up. I just wanted to make sure you have everything you need
      to make a confident decision about ${data.agencyName ? data.agencyName : "your agency"}${data.estimatedValue ? `, which we estimated at ${value}` : ""}.
    </p>

    <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:${DARK_TEXT};">What can we help you with?</h2>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${[
        ["I&apos;m ready to sell", "Let&apos;s talk about timing, buyer types, and how to maximize your sale price.", `${BASE_URL}/calculator`],
        ["I want to grow value first", "We can walk through the 3–5 changes that would move the needle most before a sale.", `${BASE_URL}/calculator`],
        ["I&apos;m just exploring", "No pressure — run as many valuations as you like. The tool is always free.", `${BASE_URL}/quick-value`],
      ].map(([label, desc, href]) => `
      <tr>
        <td style="padding-bottom:10px;">
          <a href="${href}" style="display:block;padding:16px;background:${BG};border:1px solid ${BORDER};border-radius:8px;text-decoration:none;">
            <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:${BRAND_COLOR};">${label} &rarr;</p>
            <p style="margin:0;font-size:13px;color:${MUTED_TEXT};">${desc}</p>
          </a>
        </td>
      </tr>`).join("")}
    </table>

    <div style="border-top:1px solid ${BORDER};margin:16px 0 24px;"></div>
    <p style="margin:0;font-size:14px;color:${MUTED_TEXT};line-height:1.6;text-align:center;">
      Or just reply to this email — I&apos;m happy to answer any questions personally.<br/>
      &mdash; The Agency Appraiser Team
    </p>

    <p style="margin:24px 0 0;font-size:12px;color:${MUTED_TEXT};text-align:center;">
      <a href="${unsubUrl}" style="color:${MUTED_TEXT};text-decoration:underline;">Unsubscribe from follow-up emails</a>
    </p>
  `, `Ready to explore your options for ${data.agencyName || "your agency"}?`)

  return {
    from: FROM,
    html,
    subject: `One last thing about your agency valuation`,
  }
}
