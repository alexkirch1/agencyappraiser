export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { fullValuationNotificationEmail, fullValuationAgentEmail } from "@/lib/email-templates"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const NOTIFY_EMAIL = "alex@rockyquote.com"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { leadId, inputs, results, isSuspiciousData } = body
    const user = await getCurrentUser()

    const rows = await sql`
      INSERT INTO full_valuations (
        lead_id, user_id,
        scope_of_sale, year_established, primary_state, employee_count,
        office_structure, agency_description, eo_claims, producer_agreements,
        revenue_ltm, revenue_y2, revenue_y3, sde_ebitda,
        retention_rate, policy_mix, client_concentration, carrier_diversification,
        revenue_per_employee, top_carriers,
        closing_timeline, annual_payroll_cost, owner_compensation,
        staff_retention_risk, new_business_value, avg_client_tenure,
        revenue_growth_trend, active_customers, active_policies,
        loss_ratio, avg_premium_per_policy, total_written_premium, seller_transition_months,
        low_offer, high_offer, core_score, calculated_multiple, risk_grade
      ) VALUES (
        ${leadId ?? null}, ${user?.id ?? null},
        ${inputs.scopeOfSale ?? null}, ${inputs.yearEstablished ?? null},
        ${inputs.primaryState ?? null}, ${inputs.employeeCount ?? null},
        ${inputs.officeStructure ?? null}, ${inputs.agencyDescription ?? null},
        ${inputs.eoClaims ?? null}, ${inputs.producerAgreements ?? null},
        ${inputs.revenueLTM ?? null}, ${inputs.revenueY2 ?? null},
        ${inputs.revenueY3 ?? null}, ${inputs.sdeEbitda ?? null},
        ${inputs.retentionRate ?? null}, ${inputs.policyMix ?? null},
        ${inputs.clientConcentration ?? null}, ${inputs.carrierDiversification ?? null},
        ${inputs.revenuePerEmployee ?? null}, ${inputs.topCarriers ?? null},
        ${inputs.closingTimeline ?? null}, ${inputs.annualPayrollCost ?? null},
        ${inputs.ownerCompensation ?? null}, ${inputs.staffRetentionRisk ?? null},
        ${inputs.newBusinessValue ?? null}, ${inputs.avgClientTenure ?? null},
        ${inputs.revenueGrowthTrend || null}, ${inputs.activeCustomers ?? null},
        ${inputs.activePolicies ?? null},
        ${inputs.lossRatio ?? null}, ${inputs.avgPremiumPerPolicy ?? null},
        ${inputs.totalWrittenPremium ?? null}, ${inputs.sellerTransitionMonths ?? null},
        ${results?.lowOffer ?? null}, ${results?.highOffer ?? null},
        ${results?.coreScore ?? null}, ${results?.calculatedMultiple ?? null},
        ${results?.riskGrade ?? null}
      )
      RETURNING id
    `

    // Update the parent lead's estimated_value to the actual mid-point (lowOffer + highOffer / 2)
    // so the admin drawer shows the real valuation, not whatever revenue figure was stored at lead capture.
    if (leadId && results?.lowOffer != null && results?.highOffer != null) {
      const midOffer = Math.round((results.lowOffer + results.highOffer) / 2)
      await sql`
        UPDATE leads
        SET estimated_value = ${midOffer}, last_activity = NOW()
        WHERE id = ${leadId}
      `
    }

    // Send admin notification with the full valuation details
    if (RESEND_API_KEY && results?.lowOffer != null && results?.highOffer != null && leadId) {
      try {
        // Look up lead name + email for the notification
        const leadRows = await sql`SELECT name, email, agency_name FROM leads WHERE id = ${leadId} LIMIT 1`
        const lead = leadRows[0]
        if (lead) {
          const midOffer = Math.round((results.lowOffer + results.highOffer) / 2)
          const { from, html, subject } = fullValuationNotificationEmail({
            leadName: lead.name,
            leadEmail: lead.email,
            agencyName: lead.agency_name ?? undefined,
            lowOffer: results.lowOffer,
            highOffer: results.highOffer,
            midOffer,
            calculatedMultiple: results.calculatedMultiple ?? 0,
            riskGrade: results.riskGrade ?? "N/A",
            revenueLTM: inputs?.revenueLTM ?? undefined,
            sdeEbitda: inputs?.sdeEbitda ?? undefined,
            retentionRate: inputs?.retentionRate ?? undefined,
            leadId,
          })
          // Send admin notification — prepend suspicious flag if ratio was unrealistic
          const adminSubject = isSuspiciousData ? `⚠️ SUSPICIOUS DATA FLAG — ${subject}` : subject
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({ from, to: [NOTIFY_EMAIL], reply_to: lead.email, subject: adminSubject, html }),
          })

          // Send agent valuation report email
          const firstName = (lead.name ?? "there").split(" ")[0]
          const agentPayload = fullValuationAgentEmail({
            firstName,
            agencyName: lead.agency_name ?? undefined,
            leadEmail: lead.email,
            lowOffer: results.lowOffer,
            highOffer: results.highOffer,
            calculatedMultiple: results.calculatedMultiple ?? 0,
            riskGrade: results.riskGrade ?? "N/A",
            revenueLTM: inputs?.revenueLTM ?? undefined,
            retentionRate: inputs?.retentionRate ?? undefined,
            leadId,
          })
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({ from: agentPayload.from, to: [lead.email], subject: agentPayload.subject, html: agentPayload.html }),
          })
        }
      } catch (emailErr) {
        // Non-fatal — log but never crash the valuation save
        console.error("[save-full-valuation] Email send failed:", emailErr)
      }
    }

    return NextResponse.json({ success: true, id: rows[0]?.id })
  } catch (err) {
    console.error("[v0] save-full-valuation error:", err)
    return NextResponse.json({ error: "Failed to save valuation" }, { status: 500 })
  }
}
