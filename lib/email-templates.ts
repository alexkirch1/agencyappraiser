// Shared email templates for Agency Appraiser
// All emails use inline styles for maximum email client compatibility

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://agencyappraiser.com"
// Use Resend's shared domain until agencyappraiser.com is verified in Resend
const FROM = process.env.RESEND_FROM_EMAIL
  ? `Agency Appraiser <${process.env.RESEND_FROM_EMAIL}>`
  : "Agency Appraiser <onboarding@resend.dev>"
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

// ─── Full valuation completed — admin notification ───────────────────────────

export function fullValuationNotificationEmail(data: {
  leadName: string
  leadEmail: string
  agencyName?: string
  lowOffer: number
  highOffer: number
  midOffer: number
  calculatedMultiple: number
  riskGrade: string
  revenueLTM?: number
  sdeEbitda?: number
  retentionRate?: number
  targetPayout?: number
  leadId: number
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

  const gradeColor: Record<string, string> = {
    "A+": "#16a34a", A: "#16a34a", B: "#0ea5e9", C: "#f59e0b", D: "#ef4444", F: "#dc2626",
  }
  const gColor = gradeColor[data.riskGrade] ?? MUTED_TEXT

  const html = layout(`
    <div style="display:inline-block;background:#8b5cf622;border:1px solid #8b5cf644;border-radius:20px;padding:4px 12px;font-size:12px;color:#7c3aed;font-weight:600;margin-bottom:16px;">
      FULL VALUATION COMPLETED
    </div>
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:${DARK_TEXT};">${data.leadName}</h1>
    <p style="margin:0 0 24px;font-size:15px;color:${MUTED_TEXT};">${data.agencyName || "Independent Agency"} &mdash; Full Agency Valuation Calculator</p>

    <!-- Valuation range -->
    <table width="100%" cellpadding="0" cellspacing="4" style="margin-bottom:20px;">
      <tr>
        ${statBox("Low", fmt(data.lowOffer))}
        ${statBox("Mid Value", fmt(data.midOffer))}
        ${statBox("High", fmt(data.highOffer))}
      </tr>
    </table>

    <!-- Key metrics row -->
    <table width="100%" cellpadding="0" cellspacing="4" style="margin-bottom:24px;">
      <tr>
        ${statBox("Multiple", `${data.calculatedMultiple.toFixed(2)}x`)}
        ${data.revenueLTM ? statBox("Revenue", fmt(data.revenueLTM)) : ""}
        ${data.retentionRate ? statBox("Retention", `${data.retentionRate}%`) : ""}
        <td style="text-align:center;padding:12px 8px;">
          <div style="background:${BG};border:1px solid ${BORDER};border-radius:8px;padding:14px 12px;">
            <div style="font-size:20px;font-weight:700;color:${gColor};">${data.riskGrade}</div>
            <div style="font-size:11px;color:${MUTED_TEXT};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Risk Grade</div>
          </div>
        </td>
      </tr>
    </table>

    ${data.sdeEbitda ? `
    <div style="background:${BG};border:1px solid ${BORDER};border-left:3px solid #8b5cf6;border-radius:6px;padding:12px 16px;margin-bottom:12px;">
      <span style="font-size:12px;color:${MUTED_TEXT};font-weight:500;">SDE / EBITDA</span>
      <span style="float:right;font-size:13px;font-weight:700;color:${DARK_TEXT};">${fmt(data.sdeEbitda)}</span>
    </div>` : ""}

    ${data.targetPayout ? `
    <div style="background:#fefce8;border:1px solid #fde047;border-left:3px solid #ca8a04;border-radius:6px;padding:12px 16px;margin-bottom:24px;">
      <span style="font-size:12px;color:#92400e;font-weight:600;">Seller Target Payout</span>
      <span style="float:right;font-size:13px;font-weight:700;color:#92400e;">${fmt(data.targetPayout)}</span>
    </div>` : "<div style='margin-bottom:24px;'></div>"}

    <!-- CTA -->
    <a href="${BASE_URL}/admin"
       style="display:block;text-align:center;background:#0f172a;color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;margin-bottom:12px;">
      View in Admin Dashboard
    </a>
    <a href="mailto:${data.leadEmail}?subject=Your Agency Valuation Results"
       style="display:block;text-align:center;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
      Reply to ${data.leadName}
    </a>

    <p style="margin:16px 0 0;font-size:12px;color:${MUTED_TEXT};text-align:center;">
      Completed ${new Date().toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })} ET
    </p>
  `, `Full valuation: ${data.leadName} — ${fmt(data.midOffer)} mid at ${data.calculatedMultiple.toFixed(2)}x (${data.riskGrade} grade)`)

  return {
    from: FROM,
    html,
    subject: `Full Valuation: ${data.leadName} — ${fmt(data.midOffer)} @ ${data.calculatedMultiple.toFixed(2)}x (${data.riskGrade})`,
  }
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

// ─── Thank-you email sent to the lead on every submission ────────────────────
// Simple, clean — no follow-up pitch, no numbered steps. Just a thank you,
// their report attached as a PDF, and a pointer to the feedback button.

export function thankYouEmail(data: {
  firstName: string
  agencyName?: string
}) {
  const html = layout(`
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${DARK_TEXT};">Thank you, ${data.firstName}.</h1>
    <p style="margin:0 0 16px;font-size:15px;color:${MUTED_TEXT};line-height:1.7;">
      Thank you for filling out our form${data.agencyName ? ` for <strong style="color:${DARK_TEXT};">${data.agencyName}</strong>` : ""}. Your valuation report is attached to this email as a PDF.
    </p>
    <p style="margin:0 0 0;font-size:15px;color:${MUTED_TEXT};line-height:1.7;">
      If you have any questions, you can reach us through the <strong style="color:${DARK_TEXT};">feedback button</strong> at
      <a href="${BASE_URL}" style="color:${BRAND_COLOR};text-decoration:none;">Agency Appraiser</a>.
    </p>
  `, `Thank you for submitting your agency valuation`)

  return {
    from: FROM,
    html,
    subject: "Thank you — Agency Appraiser",
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

// ─── PDF report builder — works for both quick and full valuations ────────────
// Returns a base64-encoded PDF string ready to pass to Resend attachments.
// Uses jsPDF (already installed) server-side via Node.js.

export type ReportData =
  | {
      type: "quick"
      name: string
      agencyName?: string
      lowValue: number
      highValue: number
      suggested: number
      revenue: number
      retention?: number
      policies?: number
      generatedAt?: string
    }
  | {
      type: "full"
      name: string
      agencyName?: string
      lowOffer: number
      highOffer: number
      calculatedMultiple: number
      riskGrade: string
      revenueLTM?: number
      retentionRate?: number
      generatedAt?: string
    }

export async function buildReportPdf(data: ReportData): Promise<string> {
  // jsPDF is a browser+Node library — import dynamically to avoid SSR chunk issues
  const { jsPDF } = await import("jspdf")

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

  const doc = new jsPDF({ unit: "pt", format: "letter" })
  const W = doc.internal.pageSize.getWidth()
  const pad = 48
  let y = pad

  // Header bar
  doc.setFillColor(15, 23, 42) // #0f172a
  doc.rect(0, 0, W, 64, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("Agency Appraiser", pad, 38)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(148, 163, 184)
  doc.text("Independent Agency Valuation", pad, 52)
  y = 96

  // Title
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.text("Valuation Report", pad, y)
  y += 20

  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  const subtitle = data.agencyName
    ? `${data.name} — ${data.agencyName}`
    : data.name
  doc.text(subtitle, pad, y)
  y += 8

  doc.setFontSize(10)
  doc.text(data.generatedAt ?? new Date().toLocaleDateString("en-US", { dateStyle: "long" }), pad, y)
  y += 28

  // Divider
  doc.setDrawColor(226, 232, 240)
  doc.line(pad, y, W - pad, y)
  y += 24

  if (data.type === "quick") {
    const mid = Math.round((data.lowValue + data.highValue) / 2)

    // Value box
    doc.setFillColor(240, 249, 255)
    doc.setDrawColor(186, 230, 253)
    doc.roundedRect(pad, y, W - pad * 2, 80, 8, 8, "FD")
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("ESTIMATED AGENCY VALUE", W / 2, y + 22, { align: "center" })
    doc.setTextColor(14, 165, 233)
    doc.setFontSize(32)
    doc.text(fmt(mid), W / 2, y + 54, { align: "center" })
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.setFont("helvetica", "normal")
    doc.text(`Range: ${fmt(data.lowValue)} – ${fmt(data.highValue)}`, W / 2, y + 72, { align: "center" })
    y += 100

    // Metrics grid
    const metrics: [string, string][] = [
      ["Annual Revenue", fmt(data.revenue)],
      ["Suggested Multiple", `${data.suggested.toFixed(2)}x`],
      ...(data.retention != null ? [["Retention Rate", `${data.retention}%`] as [string, string]] : []),
      ...(data.policies != null ? [["Active Policies", data.policies.toLocaleString()] as [string, string]] : []),
    ]
    const colW = (W - pad * 2) / 2
    metrics.forEach(([label, value], i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = pad + col * colW
      const my = y + row * 56
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(x + (col === 1 ? 6 : 0), my, colW - 8, 48, 4, 4, "FD")
      doc.setTextColor(100, 116, 139)
      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.text(label.toUpperCase(), x + (col === 1 ? 14 : 8), my + 16)
      doc.setTextColor(15, 23, 42)
      doc.setFontSize(14)
      doc.text(value, x + (col === 1 ? 14 : 8), my + 36)
    })
    y += Math.ceil(metrics.length / 2) * 56 + 16

    // Disclaimer
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(14, 165, 233)
    doc.setLineWidth(2)
    doc.line(pad, y, pad, y + 48)
    doc.setLineWidth(0.5)
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("Note:", pad + 10, y + 14)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 116, 139)
    const disclaimer = doc.splitTextToSize(
      "This is a 60-second ballpark estimate. Your actual market value depends on carrier mix, owner dependency, and deal structure. The full calculator provides a 7-category M&A-grade analysis.",
      W - pad * 2 - 14
    )
    doc.text(disclaimer, pad + 10, y + 28)

  } else {
    // Full valuation
    const mid = Math.round((data.lowOffer + data.highOffer) / 2)
    const gradeColors: Record<string, [number, number, number]> = {
      "A+": [22, 163, 74], A: [22, 163, 74], B: [14, 165, 233], C: [245, 158, 11], D: [239, 68, 68], F: [220, 38, 38],
    }
    const gc = gradeColors[data.riskGrade] ?? [100, 116, 139]

    // Value box
    doc.setFillColor(240, 249, 255)
    doc.setDrawColor(186, 230, 253)
    doc.roundedRect(pad, y, W - pad * 2, 80, 8, 8, "FD")
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("ESTIMATED AGENCY VALUE", W / 2, y + 22, { align: "center" })
    doc.setTextColor(14, 165, 233)
    doc.setFontSize(32)
    doc.text(fmt(mid), W / 2, y + 54, { align: "center" })
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.setFont("helvetica", "normal")
    doc.text(`Conservative range: ${fmt(data.lowOffer)} – ${fmt(data.highOffer)}`, W / 2, y + 72, { align: "center" })
    y += 100

    // Metrics
    const metrics: [string, string][] = [
      ["Revenue Multiple", `${data.calculatedMultiple.toFixed(2)}x`],
      ["Risk Grade", data.riskGrade],
      ...(data.revenueLTM != null ? [["Annual Revenue", fmt(data.revenueLTM)] as [string, string]] : []),
      ...(data.retentionRate != null ? [["Retention Rate", `${data.retentionRate}%`] as [string, string]] : []),
    ]
    const colW = (W - pad * 2) / 2
    metrics.forEach(([label, value], i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = pad + col * colW
      const my = y + row * 56
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(x + (col === 1 ? 6 : 0), my, colW - 8, 48, 4, 4, "FD")
      doc.setTextColor(100, 116, 139)
      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.text(label.toUpperCase(), x + (col === 1 ? 14 : 8), my + 16)
      // Color the grade value
      const color = label === "Risk Grade" ? gc : [15, 23, 42] as [number, number, number]
      doc.setTextColor(color[0], color[1], color[2])
      doc.setFontSize(14)
      doc.text(value, x + (col === 1 ? 14 : 8), my + 36)
    })
    y += Math.ceil(metrics.length / 2) * 56 + 16

    // Conservative note
    doc.setFillColor(240, 253, 244)
    doc.setDrawColor(22, 163, 74)
    doc.setLineWidth(2)
    doc.line(pad, y, pad, y + 56)
    doc.setLineWidth(0.5)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(15, 23, 42)
    doc.text("Note on your estimate:", pad + 10, y + 14)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 116, 139)
    const note = doc.splitTextToSize(
      "We apply a conservative adjustment to the figures shown here. Real offers from qualified buyers typically come in at or above the high end of your range.",
      W - pad * 2 - 14
    )
    doc.text(note, pad + 10, y + 28)
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFillColor(248, 250, 252)
  doc.rect(0, pageH - 40, W, 40, "F")
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text("Agency Appraiser — Independent Insurance Agency Valuation", pad, pageH - 16)
  doc.text(BASE_URL, W - pad, pageH - 16, { align: "right" })

  // Return as base64
  return doc.output("datauristring").split(",")[1]
}

// ─── Quick Valuation: Admin notification email ───────────────────────────────

export function quickValuationAdminEmail(data: {
  leadName: string
  leadEmail: string
  leadPhone?: string
  agencyName?: string
  leadId: number
  // Inputs
  revenue: number
  retention?: number
  bookType?: string
  growth?: string
  customers?: number
  policies?: number
  ratio?: number
  hasTrucking?: boolean
  // Calculated
  multiplier: number
  suggested: number
  lowValue: number
  highValue: number
  tier: string
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
  const midValue = Math.round((data.lowValue + data.highValue) / 2)

  function row(label: string, value: string | number | null | undefined) {
    if (value == null || value === "") return ""
    return `
    <tr>
      <td style="padding:9px 14px;font-size:13px;color:${MUTED_TEXT};font-weight:500;border-bottom:1px solid ${BORDER};background:${BG};width:45%;">${label}</td>
      <td style="padding:9px 14px;font-size:13px;color:${DARK_TEXT};font-weight:600;border-bottom:1px solid ${BORDER};background:#fff;">${value}</td>
    </tr>`
  }

  const html = layout(`
    <div style="display:inline-block;background:#f59e0b22;border:1px solid #f59e0b44;border-radius:20px;padding:4px 12px;font-size:12px;color:#b45309;font-weight:600;margin-bottom:16px;letter-spacing:0.3px;">
      NEW QUICK VALUATION LEAD
    </div>
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:${DARK_TEXT};">${data.leadName}</h1>
    <p style="margin:0 0 20px;font-size:14px;color:${MUTED_TEXT};">${data.agencyName || "Independent Agency"} &mdash; Quick Valuation Tool</p>

    <!-- Valuation summary -->
    <table width="100%" cellpadding="0" cellspacing="4" style="margin-bottom:20px;">
      <tr>
        ${statBox("Low", fmt(data.lowValue))}
        ${statBox("Mid Value", fmt(midValue))}
        ${statBox("High", fmt(data.highValue))}
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="4" style="margin-bottom:24px;">
      <tr>
        ${statBox("Suggested Multiple", `${data.suggested.toFixed(2)}x`)}
        ${statBox("Applied Multiple", `${data.multiplier.toFixed(2)}x`)}
        ${statBox("Tier", data.tier)}
      </tr>
    </table>

    <!-- All submitted fields -->
    <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${MUTED_TEXT};text-transform:uppercase;letter-spacing:0.5px;">Submitted Form Data</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:8px;border-collapse:collapse;overflow:hidden;margin-bottom:24px;">
      ${row("Lead ID", `#${data.leadId}`)}
      ${row("Name", data.leadName)}
      ${row("Email", data.leadEmail)}
      ${row("Phone", data.leadPhone)}
      ${row("Agency Name", data.agencyName)}
      ${row("Annual Revenue (LTM)", fmt(data.revenue))}
      ${row("Retention Rate", data.retention != null ? `${data.retention}%` : null)}
      ${row("Book Type", data.bookType)}
      ${row("Revenue Growth Trend", data.growth)}
      ${row("Active Customers", data.customers?.toLocaleString())}
      ${row("Active Policies", data.policies?.toLocaleString())}
      ${row("Policy/Customer Ratio", data.ratio != null ? data.ratio.toFixed(2) : null)}
      ${row("Specialty / High-Risk Niches", data.hasTrucking === true ? "Yes" : data.hasTrucking === false ? "No" : null)}
    </table>

    <!-- Admin CTAs -->
    <a href="${BASE_URL}/admin"
       style="display:block;text-align:center;background:${DARK_TEXT};color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;margin-bottom:10px;">
      View in Admin Dashboard
    </a>
    <a href="mailto:${data.leadEmail}?subject=Your Agency Valuation - Agency Appraiser"
       style="display:block;text-align:center;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
      Reply to ${data.leadName}
    </a>
    <p style="margin:16px 0 0;font-size:12px;color:${MUTED_TEXT};text-align:center;">
      Submitted ${new Date().toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })} ET
    </p>
  `, `Quick valuation: ${data.leadName} — ${fmt(midValue)} @ ${data.suggested.toFixed(2)}x`)

  return {
    from: FROM,
    html,
    subject: `New Valuation Lead: ${data.agencyName || data.leadName} / ${data.leadEmail}`,
  }
}


