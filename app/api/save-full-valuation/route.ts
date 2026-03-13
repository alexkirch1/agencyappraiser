import { NextResponse } from "next/server"
import sql from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { leadId, inputs, results } = body

    const rows = await sql`
      INSERT INTO full_valuations (
        lead_id,
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
        ${leadId ?? null},
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

    return NextResponse.json({ success: true, id: rows[0]?.id })
  } catch (err) {
    console.error("[v0] save-full-valuation error:", err)
    return NextResponse.json({ error: "Failed to save valuation" }, { status: 500 })
  }
}
