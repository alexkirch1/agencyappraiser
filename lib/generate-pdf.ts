import type { ValuationInputs, ValuationResults, RiskAuditResult } from "@/components/calculator/valuation-engine"

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function pct(n: number | null) {
  return n !== null ? n.toFixed(1) + "%" : "—"
}

export async function downloadValuationPDF(
  inputs: ValuationInputs,
  results: ValuationResults,
  riskAudit: RiskAuditResult
) {
  // Dynamic import so jsPDF is only bundled client-side
  const { default: jsPDF } = await import("jspdf")

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" })
  const W = doc.internal.pageSize.getWidth()
  const margin = 48
  const col = W - margin * 2
  let y = margin

  // ── helpers ──────────────────────────────────────────────────────────────
  const newPage = () => {
    doc.addPage()
    y = margin
  }

  const checkPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) newPage()
  }

  const drawHRule = (color = "#e2e8f0") => {
    doc.setDrawColor(color)
    doc.setLineWidth(0.5)
    doc.line(margin, y, W - margin, y)
    y += 12
  }

  const heading = (text: string, size = 14) => {
    checkPage(size + 20)
    doc.setFontSize(size)
    doc.setFont("helvetica", "bold")
    doc.setTextColor("#0f172a")
    doc.text(text, margin, y)
    y += size + 6
  }

  const body = (text: string, size = 10, color = "#334155") => {
    checkPage(size + 8)
    doc.setFontSize(size)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(color)
    const lines = doc.splitTextToSize(text, col) as string[]
    doc.text(lines, margin, y)
    y += lines.length * (size + 4) + 4
  }

  const row = (label: string, value: string, indent = 0) => {
    checkPage(18)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor("#64748b")
    doc.text(label, margin + indent, y)
    doc.setFont("helvetica", "bold")
    doc.setTextColor("#0f172a")
    doc.text(value, W - margin, y, { align: "right" })
    y += 18
  }

  // ── Cover header ─────────────────────────────────────────────────────────
  doc.setFillColor("#0ea5e9")
  doc.rect(0, 0, W, 80, "F")
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.setTextColor("#ffffff")
  doc.text("Agency Valuation Report", margin, 38)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("Prepared by Agency Appraiser  •  " + new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), margin, 58)
  y = 104

  // ── Estimated Value Range ────────────────────────────────────────────────
  heading("Estimated Value Range", 16)
  doc.setFontSize(26)
  doc.setFont("helvetica", "bold")
  doc.setTextColor("#16a34a")
  doc.text(`${fmt(results.lowOffer)}  –  ${fmt(results.highOffer)}`, margin, y)
  y += 36

  row("Final Multiple", `${results.calculatedMultiple.toFixed(2)}x`)
  row("Transaction Multiplier", `${results.transactionMultiplier.toFixed(2)}x`)
  row("Core Score", `${results.coreScore.toFixed(2)}x`)
  row("Risk Level", results.riskLevel.text)
  row("Revenue Range", results.revenueRange)
  row("SDE Range", results.sdeRange)
  row("CAGR", isNaN(results.cagr) ? "—" : `${results.cagr.toFixed(2)}%`)
  row("Longevity Adjustment", results.longevityAdjustment)

  y += 8
  drawHRule()

  // ── Agency Overview ──────────────────────────────────────────────────────
  heading("Agency Overview")
  row("Year Established", inputs.yearEstablished ? String(inputs.yearEstablished) : "—")
  row("Primary State", inputs.primaryState || "—")
  row("Employees", inputs.employeeCount ? String(inputs.employeeCount) : "—")
  row("Office Structure", inputs.officeStructure || "—")
  if (inputs.agencyDescription) {
    y += 4
    body(`Description: ${inputs.agencyDescription}`)
  }
  y += 4
  drawHRule()

  // ── Financial Summary ────────────────────────────────────────────────────
  heading("Financial Summary")
  row("Annual Revenue (LTM)", inputs.revenueLTM ? fmt(inputs.revenueLTM) : "—")
  row("Revenue Year -1", inputs.revenueY2 ? fmt(inputs.revenueY2) : "—")
  row("Revenue Year -2", inputs.revenueY3 ? fmt(inputs.revenueY3) : "—")
  row("SDE / EBITDA", inputs.sdeEbitda ? fmt(inputs.sdeEbitda) : "—")
  if (inputs.annualPayrollCost) row("Annual Payroll", fmt(inputs.annualPayrollCost))
  if (inputs.ownerCompensation) row("Owner Compensation", fmt(inputs.ownerCompensation))
  y += 4
  drawHRule()

  // ── Book Quality ─────────────────────────────────────────────────────────
  heading("Book Quality")
  row("Retention Rate", pct(inputs.retentionRate))
  row("Commercial Mix", pct(inputs.policyMix))
  row("Client Concentration (Top 10)", pct(inputs.clientConcentration))
  row("Carrier Diversification (Top carrier %)", pct(inputs.carrierDiversification))
  if (inputs.revenuePerEmployee) row("Revenue Per Employee", fmt(inputs.revenuePerEmployee))
  if (inputs.newBusinessValue) row("New Business (monthly)", fmt(inputs.newBusinessValue))
  if (inputs.avgClientTenure) row("Avg Client Tenure", `${inputs.avgClientTenure} yrs`)
  if (inputs.topCarriers) {
    y += 4
    body(`Top Carriers: ${inputs.topCarriers}`)
  }
  y += 4
  drawHRule()

  // ── Risk Audit ───────────────────────────────────────────────────────────
  heading("Risk Audit")
  row("Risk Grade", riskAudit.grade)
  body(riskAudit.summaryText)
  y += 6

  for (const item of riskAudit.items) {
    checkPage(60)
    const levelColor: Record<string, string> = {
      "Strength": "#16a34a",
      "High Risk": "#dc2626",
      "Moderate Risk": "#d97706",
      "Severe Risk": "#7f1d1d",
      "Info": "#0ea5e9",
    }
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(levelColor[item.level] ?? "#0f172a")
    doc.text(`[${item.level}] ${item.title}`, margin, y)
    y += 14
    body(item.problem, 9, "#475569")
    if (item.mitigation) {
      doc.setFontSize(9)
      doc.setFont("helvetica", "italic")
      doc.setTextColor("#0ea5e9")
      const mLines = doc.splitTextToSize(`Mitigation: ${item.mitigation}`, col - 8) as string[]
      doc.text(mLines, margin + 8, y)
      y += mLines.length * 13 + 4
    }
    y += 4
  }

  // ── Disclaimer footer ────────────────────────────────────────────────────
  checkPage(40)
  drawHRule("#cbd5e1")
  doc.setFontSize(8)
  doc.setFont("helvetica", "italic")
  doc.setTextColor("#94a3b8")
  doc.text(
    "This report is a preliminary estimate for educational purposes only. It is not a binding offer or formal appraisal. Agency Appraiser.",
    margin, y, { maxWidth: col }
  )

  doc.save(`agency-valuation-${Date.now()}.pdf`)
}
