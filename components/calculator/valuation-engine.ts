// =====================================================
// Valuation Engine – ported verbatim from PHP/JS
// =====================================================

export interface ValuationInputs {
  scopeOfSale: number | null // 1.0 = Full Agency, 0.95 = Book Purchase, 0.9 = Fragmented
  yearEstablished: number | null
  primaryState: string
  employeeCount: number | null
  officeStructure: string // Virtual | Hybrid | BrickAndMortar
  agencyDescription: string
  eoClaims: number
  producerAgreements: string // strong | weak | none
  revenueLTM: number | null
  revenueY2: number | null
  revenueY3: number | null
  sdeEbitda: number | null
  retentionRate: number | null
  policyMix: number | null
  clientConcentration: number | null
  carrierDiversification: number | null
  revenuePerEmployee: number | null
  topCarriers: string
  // Revenue growth trend (quick-value style override)
  revenueGrowthTrend: string // strong | moderate | flat | declining | ""
  // Book quality counts
  activeCustomers: number | null
  activePolicies: number | null
  // Book quality metrics
  lossRatio: number | null // percentage, e.g. 45 for 45%
  avgPremiumPerPolicy: number | null // dollars
  totalWrittenPremium: number | null // for auto-calculating avg premium
  // Transition
  sellerTransitionMonths: number | null // 0-6, 6-12, 12-24
  // Conditional (Full Agency only)
  closingTimeline: string // urgent | standard | long
  annualPayrollCost: number | null
  ownerCompensation: number | null
  staffRetentionRisk: string // secure | moderate | high
  newBusinessValue: number | null
  avgClientTenure: number | null
}

export interface ValuationResults {
  lowOffer: number
  highOffer: number
  coreScore: number
  calculatedMultiple: number
  transactionMultiplier: number
  longevityAdjustment: string
  cagr: number
  revenueRange: string
  sdeRange: string
  riskLevel: { text: string; color: string }
}

export interface RiskAuditItem {
  level: "Strength" | "High Risk" | "Moderate Risk" | "Severe Risk" | "Info"
  title: string
  problem: string
  psychology: string | null
  mitigation: string | null
}

export interface RiskAuditResult {
  items: RiskAuditItem[]
  grade: string
  gradeColor: string
  summaryText: string
}

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatCurrency(value: number): string {
  return formatter.format(value)
}

export function calculateCAGR(ltm: number, y3: number): number {
  if (ltm <= 0 || y3 <= 0 || isNaN(ltm) || isNaN(y3)) return 0
  return (Math.pow(ltm / y3, 1 / 2) - 1) * 100
}

function getRiskLevel(calculatedMultiple: number) {
  if (calculatedMultiple >= 2.8) return { text: "VERY LOW", color: "text-[hsl(var(--success))]" }
  if (calculatedMultiple >= 2.0) return { text: "LOW", color: "text-[hsl(var(--success))]" }
  if (calculatedMultiple >= 1.2) return { text: "MODERATE", color: "text-[hsl(var(--warning))]" }
  return { text: "HIGH", color: "text-destructive" }
}

function analyzeRevenueTrend(revLTM: number, revY2: number | null, revY3: number | null) {
  if (!revY2 || !revY3) return "Stable"
  if (revLTM > revY2 && revY2 > revY3) return "Growth"
  if (revLTM < revY2 && revY2 < revY3) return "Decline"
  if (revY2 < revY3 && revLTM > revY2) return "Recovery"
  if (revY2 > revY3 && revLTM < revY2) return "Dip"
  return "Stable"
}

export function calculateValuation(inputs: ValuationInputs): ValuationResults | null {
  const TRANSACTION_MULTIPLIER = inputs.scopeOfSale ?? 1.0
  const isFullAgency = TRANSACTION_MULTIPLIER === 1.0

  const revLTM = inputs.revenueLTM
  const sde = inputs.sdeEbitda

  if (revLTM === null || sde === null || revLTM <= 0) {
    return null
  }

  const yearEstablished = inputs.yearEstablished
  const revY2 = inputs.revenueY2
  const revY3 = inputs.revenueY3
  const retention = inputs.retentionRate
  const mix = inputs.policyMix
  const concentration = inputs.clientConcentration
  const rpe = inputs.revenuePerEmployee
  const carrierDiv = inputs.carrierDiversification
  const eoClaims = inputs.eoClaims || 0
  const officeStructure = inputs.officeStructure
  const producerAgreements = inputs.producerAgreements

  const CAGR = calculateCAGR(revLTM, revY3 ?? 0)
  const sdeMargin = sde !== null && revLTM > 0 ? sde / revLTM : 0

  let totalRawScore = 0

  // 1. LONGEVITY
  let longevityScore = 0.05
  let longevityAdj = "Unknown"
  if (yearEstablished !== null) {
    const age = new Date().getFullYear() - yearEstablished
    if (age >= 20) {
      longevityScore = 0.1
      longevityAdj = `${age}yr (+0.10x)`
    } else if (age >= 5) {
      longevityScore = 0.08
      longevityAdj = `${age}yr (+0.08x)`
    } else {
      longevityAdj = `${age}yr (+0.05x)`
    }
  }
  totalRawScore += longevityScore

  // 2. DEMOGRAPHIC
  let demographicScore = 0.08
  if (officeStructure === "Virtual") demographicScore = 0.1
  else if (officeStructure === "BrickAndMortar") demographicScore = 0.05
  totalRawScore += demographicScore

  // 3. LEGAL
  let legalScore = 0.12
  if (producerAgreements === "strong") legalScore += 0.08
  else if (producerAgreements === "none") legalScore -= 0.07
  if (eoClaims > 0) legalScore -= Math.min(0.15, eoClaims * 0.05)
  legalScore = Math.max(0.05, Math.min(0.2, legalScore))
  totalRawScore += legalScore

  // 4. FINANCIAL
  let financialScore = 0.1
  if (CAGR >= 10) financialScore += 0.15
  else if (CAGR > 0) financialScore += 0.05
  // If year-over-year revenues aren't provided, fall back to the growth trend radio
  else if (CAGR === 0 && inputs.revenueGrowthTrend) {
    if (inputs.revenueGrowthTrend === "strong")        financialScore += 0.15
    else if (inputs.revenueGrowthTrend === "moderate") financialScore += 0.05
    else if (inputs.revenueGrowthTrend === "flat")     financialScore += 0.0
    else if (inputs.revenueGrowthTrend === "declining") financialScore -= 0.08
  }

  if (sdeMargin >= 0.4) financialScore += 0.15
  else if (sdeMargin >= 0.2) financialScore += 0.1
  else if (sdeMargin > 0) financialScore += 0.05

  if (isFullAgency && sde !== null && inputs.annualPayrollCost !== null && sde < inputs.annualPayrollCost && inputs.annualPayrollCost > 0) {
    financialScore -= 0.1
  }

  // V-Shape Recovery bonus
  if (revY2 && revY3 && revY2 < revY3 && revLTM > revY2) {
    financialScore += 0.08
  }

  financialScore = Math.max(0.05, Math.min(0.45, financialScore))
  totalRawScore += financialScore

  // 5. BOOK QUALITY
  let bookScore = 0.1
  if (retention !== null) {
    if (retention >= 75) {
      const retBonus = (retention - 75) * 0.022
      bookScore = 0.1 + retBonus
    } else if (retention >= 50) {
      bookScore = 0.05
    }
  }
  let concentrationScore = 0
  if (concentration !== null) {
    if (concentration <= 10) concentrationScore = 0.1
    else if (concentration <= 30) concentrationScore = 0.05
  }
  let mixScore = 0
  if (mix !== null) {
    if (mix >= 75) mixScore = 0.05
    else if (mix >= 50) mixScore = 0.02
  }
  // Policies-per-customer ratio bonus (>1.75 = well-rounded book, <1.33 = thin)
  let polsPerCxScore = 0
  if (inputs.activeCustomers && inputs.activePolicies && inputs.activeCustomers > 0) {
    const ratio = inputs.activePolicies / inputs.activeCustomers
    if (ratio > 1.75)      polsPerCxScore = 0.04
    else if (ratio < 1.33) polsPerCxScore = -0.03
  }
  // Loss ratio scoring (<50% excellent, 50-65% neutral, >65% penalty)
  let lossRatioScore = 0
  if (inputs.lossRatio !== null) {
    if (inputs.lossRatio < 50)       lossRatioScore = 0.05
    else if (inputs.lossRatio <= 65) lossRatioScore = 0
    else                             lossRatioScore = -0.08
  }
  // Average premium per policy scoring (higher = larger accounts = stickier)
  let avgPremScore = 0
  const avgPrem = inputs.avgPremiumPerPolicy ?? 
    (inputs.totalWrittenPremium && inputs.activePolicies && inputs.activePolicies > 0 
      ? inputs.totalWrittenPremium / inputs.activePolicies 
      : null)
  if (avgPrem !== null) {
    if (avgPrem >= 2500)      avgPremScore = 0.05
    else if (avgPrem >= 1500) avgPremScore = 0.02
    else if (avgPrem < 800)   avgPremScore = -0.03
  }
  bookScore += concentrationScore + mixScore + polsPerCxScore + lossRatioScore + avgPremScore
  bookScore = Math.max(0.1, Math.min(0.75, bookScore))
  totalRawScore += bookScore

  // 6. OPS
  let opsScore = 0.05
  if (rpe !== null && rpe >= 200000) opsScore += 0.05
  if (carrierDiv !== null) {
    if (carrierDiv < 40) opsScore += 0.05
    else if (carrierDiv <= 70) opsScore += 0.02
  }
  // Seller transition commitment scoring
  if (inputs.sellerTransitionMonths !== null) {
    if (inputs.sellerTransitionMonths >= 24)      opsScore += 0.07
    else if (inputs.sellerTransitionMonths >= 12) opsScore += 0.04
    else if (inputs.sellerTransitionMonths >= 6)  opsScore += 0.02
    else if (inputs.sellerTransitionMonths === 0) opsScore -= 0.05
  }
  opsScore = Math.max(-0.05, Math.min(0.22, opsScore))
  totalRawScore += opsScore

  // 7. CONDITIONAL
  let conditionalScore = 0.0
  if (isFullAgency) {
    if (inputs.closingTimeline === "urgent") conditionalScore += 0.07
    else if (inputs.closingTimeline === "long") conditionalScore -= 0.03
    if (inputs.staffRetentionRisk === "secure") conditionalScore += 0.05
    else if (inputs.staffRetentionRisk === "high") conditionalScore -= 0.1
    if (inputs.avgClientTenure !== null) {
      if (inputs.avgClientTenure > 7) conditionalScore += 0.05
      else if (inputs.avgClientTenure < 3) conditionalScore -= 0.03
    }
    if (inputs.newBusinessValue !== null && revLTM > 0) {
      if (inputs.newBusinessValue / revLTM >= 0.15) conditionalScore += 0.07
    }
    conditionalScore = Math.max(-0.13, Math.min(0.25, conditionalScore))
    totalRawScore += conditionalScore
  }

  // --- FINAL RESULTS ---
  let scaledCoreScore = 0.75
  const desiredMin = 0.75
  const desiredMax = 3.0

  if (totalRawScore > 0) {
    scaledCoreScore = desiredMin + totalRawScore * 1.5
  }
  if (scaledCoreScore < desiredMin) scaledCoreScore = desiredMin
  if (scaledCoreScore > desiredMax) scaledCoreScore = desiredMax

  const finalMultiple = scaledCoreScore * TRANSACTION_MULTIPLIER

  let highOffer = revLTM * finalMultiple
  let lowOffer = revLTM * (finalMultiple - 0.25)
  lowOffer = Math.max(0, lowOffer)
  if (lowOffer > highOffer) lowOffer = highOffer * 0.9

  return {
    lowOffer,
    highOffer,
    coreScore: scaledCoreScore,
    calculatedMultiple: finalMultiple,
    transactionMultiplier: TRANSACTION_MULTIPLIER,
    longevityAdjustment: longevityAdj,
    cagr: CAGR,
    revenueRange: `${formatCurrency(revLTM * 0.75)} - ${formatCurrency(revLTM * 3.0)}`,
    sdeRange: sde ? `${formatCurrency(sde * 5.0)} - ${formatCurrency(sde * 9.0)}` : "---",
    riskLevel: getRiskLevel(finalMultiple),
  }
}

// =====================================================
// Risk Audit Engine – ported from PHP/JS
// =====================================================
export function runRiskAudit(inputs: ValuationInputs): RiskAuditResult {
  const items: RiskAuditItem[] = []
  let severeCount = 0
  let highCount = 0
  let moderateCount = 0
  let strengthCount = 0

  const revLTM = inputs.revenueLTM ?? 0
  const revY2 = inputs.revenueY2
  const revY3 = inputs.revenueY3
  const sde = inputs.sdeEbitda ?? 0

  // 1. Retention
  const retention = inputs.retentionRate ?? 0
  if (retention > 0) {
    if (retention < 80) {
      items.push({
        level: "High Risk",
        title: "Critical Retention Issue (<80%)",
        problem: "Buyers view low retention as a \"Leaky Bucket.\" It signals unhappy clients or poor service.",
        psychology: "The buyer fears that if they buy the book, 20% of the value will evaporate in year one.",
        mitigation: "Implement a proactive 90-day renewal call program immediately.",
      })
      severeCount++
    } else if (retention < 90) {
      items.push({
        level: "Moderate Risk",
        title: "Average Retention (80-89%)",
        problem: "Your retention is stable but average. Top-tier valuations (3.0x+) are reserved for agencies with 92%+ retention.",
        psychology: "Buyers see \"Average\" retention as \"Average\" value.",
        mitigation: "Conduct a \"Lost Business Audit\" to identify why clients leave.",
      })
      moderateCount++
    } else {
      items.push({
        level: "Strength",
        title: "Elite Retention (90%+)",
        problem: "Your client loyalty is exceptional. This is the primary driver for \"Premium\" valuations.",
        psychology: "Buyers are willing to pay more for predictable, recurring revenue.",
        mitigation: null,
      })
      strengthCount++
    }
  }

  // 1b. Policies-per-customer ratio
  if (inputs.activeCustomers && inputs.activePolicies && inputs.activeCustomers > 0) {
    const ratio = inputs.activePolicies / inputs.activeCustomers
    if (ratio > 1.75) {
      items.push({ level: "Strength", title: `Strong Cross-Sell Ratio (${ratio.toFixed(2)} policies/client)`, problem: "Clients hold multiple policies with you, signaling deep loyalty and higher lifetime value.", psychology: "Buyers see multi-policy households as stickier and harder for competitors to poach.", mitigation: null })
      strengthCount++
    } else if (ratio < 1.33) {
      items.push({ level: "Moderate Risk", title: `Thin Cross-Sell Ratio (${ratio.toFixed(2)} policies/client)`, problem: "Most clients hold only a single policy. Revenue per household is below average.", psychology: "Buyers see single-policy clients as churn risk and untapped revenue.", mitigation: "Run a cross-sell campaign targeting your top 20% clients before going to market." })
      moderateCount++
    }
  }

  // 1c. Loss ratio
  if (inputs.lossRatio !== null) {
    if (inputs.lossRatio < 50) {
      items.push({ level: "Strength", title: `Excellent Loss Ratio (${inputs.lossRatio}%)`, problem: "Your book runs clean with low claims activity. This protects carrier relationships post-acquisition.", psychology: "Buyers see low loss ratios as a sign of good underwriting and client selection.", mitigation: null })
      strengthCount++
    } else if (inputs.lossRatio > 65) {
      items.push({ level: "High Risk", title: `High Loss Ratio (${inputs.lossRatio}%)`, problem: "Your loss ratio exceeds 65%, which is a red flag for carriers and buyers.", psychology: "Buyers worry that carriers may non-renew or reduce commissions on a high-loss book.", mitigation: "Review your worst-performing accounts and consider non-renewing chronic claimants before going to market." })
      highCount++
    }
  }

  // 1d. Average premium per policy
  const avgPrem = inputs.avgPremiumPerPolicy ?? 
    (inputs.totalWrittenPremium && inputs.activePolicies && inputs.activePolicies > 0 
      ? inputs.totalWrittenPremium / inputs.activePolicies 
      : null)
  if (avgPrem !== null) {
    if (avgPrem >= 2500) {
      items.push({ level: "Strength", title: `High Average Premium ($${Math.round(avgPrem).toLocaleString()}/policy)`, problem: "Larger policies mean fewer transactions for the same revenue and typically stickier clients.", psychology: "Buyers value high-premium accounts because they're more profitable to service.", mitigation: null })
      strengthCount++
    } else if (avgPrem < 800) {
      items.push({ level: "Moderate Risk", title: `Low Average Premium ($${Math.round(avgPrem).toLocaleString()}/policy)`, problem: "Small policies require similar service effort as large ones but generate less commission.", psychology: "Buyers may see this as a labor-intensive book with thin margins per account.", mitigation: "Consider minimum account size thresholds or bundling strategies to increase avg premium." })
      moderateCount++
    }
  }

  // 1e. Seller transition commitment
  if (inputs.sellerTransitionMonths !== null) {
    if (inputs.sellerTransitionMonths >= 12) {
      items.push({ level: "Strength", title: `Strong Transition Commitment (${inputs.sellerTransitionMonths}+ months)`, problem: "You're willing to stay on for an extended period to ensure client retention.", psychology: "Buyers pay more when the seller commits to a smooth handoff — it dramatically reduces integration risk.", mitigation: null })
      strengthCount++
    } else if (inputs.sellerTransitionMonths === 0) {
      items.push({ level: "High Risk", title: "Immediate Exit Plan", problem: "Planning to walk away at close is a major red flag for buyers.", psychology: "Buyers fear client attrition when the face of the agency disappears overnight.", mitigation: "Consider committing to at least 6 months of transition support — it can increase your multiple by 0.25–0.5x." })
      highCount++
    }
  }

  // 2. Revenue Trend
  const trend = analyzeRevenueTrend(revLTM, revY2 ?? null, revY3 ?? null)
  // If Y-2/Y-3 not provided, use the manual growth trend radio
  const manualTrend = inputs.revenueGrowthTrend
  if (trend === "Decline") {
    items.push({ level: "High Risk", title: "Consistent Revenue Decline", problem: "Revenue has dropped for 3 consecutive periods.", psychology: "Buyers view this as a distressed asset (\"Falling Knife\").", mitigation: "Identify root cause of churn immediately." })
    severeCount++
  } else if (trend === "Recovery") {
    items.push({ level: "Moderate Risk", title: "V-Shape Recovery", problem: "Revenue dipped in Y-2 but is recovering now.", psychology: "Buyers see this as \"Stabilizing\" rather than \"Declining\".", mitigation: "Highlight the recent operational fixes that caused the rebound." })
    moderateCount++
  } else if (trend === "Growth") {
    items.push({ level: "Strength", title: "Consistent Growth", problem: "Revenue has increased year-over-year.", psychology: "Buyers pay a premium for organic growth engines.", mitigation: null })
    strengthCount++
  } else if (trend === "Stable" && manualTrend) {
    // No Y-2/Y-3 data — use the manually selected trend
    if (manualTrend === "strong") {
      items.push({ level: "Strength", title: "Strong Growth Trend", problem: "You reported 10%+ annual growth. This is a premium signal for buyers.", psychology: "Buyers pay a premium for organic growth engines.", mitigation: null })
      strengthCount++
    } else if (manualTrend === "moderate") {
      items.push({ level: "Info", title: "Moderate Growth (3–9%/yr)", problem: "Steady growth is a positive indicator. Documenting this with 3 years of financials will strengthen your position.", psychology: "Buyers see moderate growth as stable and predictable.", mitigation: null })
    } else if (manualTrend === "flat") {
      items.push({ level: "Info", title: "Flat Revenue Trend", problem: "Revenue has remained roughly the same over the past few years.", psychology: "Flat is acceptable but limits upside. Buyers may negotiate harder on price.", mitigation: "Cross-selling and rate increases can quickly move this needle." })
    } else if (manualTrend === "declining") {
      items.push({ level: "High Risk", title: "Declining Revenue Trend", problem: "Revenue has been decreasing. This is a major concern for buyers.", psychology: "Buyers view declining revenue as a \"Falling Knife\" — risky and likely to continue.", mitigation: "Identify and fix the root cause of churn before entering the market." })
      highCount++
    }
  }

  // 3. Profit Margins
  if (revLTM > 0 && sde > 0) {
    const margin = sde / revLTM
    if (margin < 0.2) {
      items.push({ level: "Moderate Risk", title: "Low Margins (<20%)", problem: `Your SDE margin is ${(margin * 100).toFixed(1)}%. Buyers want cash flow (25-40%).`, psychology: "Low margins suggest high overhead. A buyer will aggressively cut costs post-close.", mitigation: "Review your P&L for \"Lifestyle Expenses\" (cars, travel) that can be added back." })
      moderateCount++
    } else if (margin >= 0.4) {
      items.push({ level: "Strength", title: "High Efficiency (40%+ Margins)", problem: `Your SDE margin is ${(margin * 100).toFixed(1)}%. This is best-in-class profitability.`, psychology: "Buyers love this because the debt service is easy to cover.", mitigation: null })
      strengthCount++
    }
  }

  // 4. Solo Risk
  if (inputs.employeeCount === 1) {
    items.push({ level: "High Risk", title: "Key Man / Solo Risk", problem: "As a solo operator, YOU are the business. If you leave, do the clients stay?", psychology: "Buyers worry that client loyalty is tied to you personally, not the brand.", mitigation: "A thorough transition plan (staying on for 6-12 months) is critical to getting full value." })
    highCount++
  }

  // 5. Commercial Mix
  const mix = inputs.policyMix ?? 0
  if (mix > 60) {
    items.push({ level: "Strength", title: "Commercial Heavy", problem: `Your book is ${mix}% Commercial Lines. This is a highly sought-after asset class.`, psychology: "Commercial policies have higher premiums and stickier retention than Personal Lines.", mitigation: null })
    strengthCount++
  } else if (mix < 20 && mix > 0) {
    items.push({ level: "Info", title: "Personal Lines Focus", problem: "Your book is primarily Personal Lines.", psychology: "Personal lines are stable but can be labor-intensive. Buyers may discount slightly for the service load.", mitigation: "Cross-sell commercial policies to existing homeowners." })
  }

  // 6. Office Structure
  if (inputs.officeStructure === "Virtual" || inputs.officeStructure === "Hybrid") {
    items.push({ level: "Strength", title: "Modern Infrastructure", problem: "Operating Virtual/Hybrid makes your agency highly transferable and lowers overhead.", psychology: "Buyers see this as a \"Plug & Play\" acquisition with no lease liabilities.", mitigation: null })
    strengthCount++
  } else if (inputs.officeStructure === "BrickAndMortar") {
    items.push({ level: "Moderate Risk", title: "Lease Liability", problem: "Physical offices often come with long-term leases that buyers do not want to assume.", psychology: "Buyers view rent as \"wasted profit\" if they already have a central office.", mitigation: "Check your lease terms. Are you personally guaranteed? Can you sub-lease?" })
    moderateCount++
  }

  // 7. E&O
  if (inputs.eoClaims === 0) {
    items.push({ level: "Strength", title: "Clean Compliance Record", problem: "Zero E&O claims in 3 years indicates strong operational controls.", psychology: "This removes a major \"Fear Factor\" during due diligence.", mitigation: null })
    strengthCount++
  } else if (inputs.eoClaims > 0) {
    items.push({ level: "Moderate Risk", title: "E&O Claims History", problem: "Past claims raise red flags about compliance and staff training.", psychology: "Buyers worry about \"Tail Liability\" and future lawsuits.", mitigation: "Document exactly what processes changed to prevent recurrence." })
    moderateCount++
  }

  // 8. Client Concentration
  const concentration = inputs.clientConcentration ?? 0
  if (concentration > 25) {
    items.push({ level: "High Risk", title: "Whale Client Risk (>25%)", problem: `Top 10 clients = ${concentration}% of revenue. Highly dangerous leverage.`, psychology: "If one key client leaves, value crashes.", mitigation: "Focus marketing on smaller accounts to dilute risk." })
    highCount++
  }

  // 9. Carrier Dependency
  const carrierDiv = inputs.carrierDiversification ?? 0
  if (carrierDiv > 75) {
    items.push({ level: "High Risk", title: "Carrier Dependence (>75%)", problem: "Heavily reliant on very few carriers.", psychology: "If your top carrier changes their commission schedule or terminates you, your revenue collapses.", mitigation: "Actively quote new business with secondary carriers." })
    highCount++
  }

  // 10. RPE
  const rpe = inputs.revenuePerEmployee ?? 0
  if (rpe > 0 && rpe < 125000) {
    items.push({ level: "Moderate Risk", title: "Low Efficiency (RPE)", problem: `Revenue Per Employee: ${formatCurrency(rpe)}. Standard is $150k+.`, psychology: "Suggests manual workflows or overstaffing.", mitigation: "Audit your tech stack for automation opportunities." })
    moderateCount++
  } else if (rpe > 200000) {
    items.push({ level: "Strength", title: "High Efficiency Team", problem: `RPE is ${formatCurrency(rpe)}. Your team is highly productive.`, psychology: "Buyers see a well-oiled machine that generates profit.", mitigation: null })
    strengthCount++
  }

  // 11. Legal
  if (inputs.producerAgreements === "none" || inputs.producerAgreements === "weak") {
    items.push({ level: "Severe Risk", title: "No Producer Agreements", problem: "Producers legally \"own\" the relationship without contracts.", psychology: "Buyer cannot pay full price for unsecured assets.", mitigation: "Consult an attorney immediately." })
    severeCount++
  }

  // 12. CAGR
  const cagr = calculateCAGR(revLTM, revY3 ?? 0)
  if (cagr > 15) {
    items.push({ level: "Strength", title: "High Growth Asset", problem: `Growing at ${cagr.toFixed(1)}% annually.`, psychology: "Buyers pay a premium for organic growth engines.", mitigation: null })
    strengthCount++
  } else if (cagr < 0 && trend !== "Recovery") {
    items.push({ level: "High Risk", title: "Shrinking Revenue", problem: `Shrinking at ${cagr.toFixed(1)}% per year.`, psychology: "Buyers view this as a \"Turnaround Project.\"", mitigation: "Identify the source of the bleed." })
    highCount++
  }

  // 13. Timeline
  if (inputs.closingTimeline === "urgent") {
    items.push({ level: "Moderate Risk", title: "Urgent Sale Timeline", problem: "Selling in <60 days signals distress.", psychology: "Buyers may low-ball offers expecting desperation.", mitigation: "Extend your runway if possible." })
    moderateCount++
  }

  // 14. Pipeline
  const newBiz = inputs.newBusinessValue ?? 0
  if (newBiz > 0 && revLTM > 0) {
    const velocity = (newBiz * 12) / revLTM
    if (velocity > 0.15) {
      items.push({ level: "Strength", title: "Strong Sales Pipeline", problem: "You are adding new business at a healthy rate.", psychology: "Proves the business isn't just \"resting on renewals.\"", mitigation: null })
      strengthCount++
    }
  }

  // Grade
  let grade = "A"
  let gradeColor = "text-[hsl(var(--success))]"
  let summaryText = `Prime Target! ${strengthCount} Strengths detected.`

  if (severeCount > 0) {
    grade = "D"
    gradeColor = "text-destructive"
    summaryText = "Critical structural risks identified."
  } else if (highCount > 0) {
    grade = "C"
    gradeColor = "text-[hsl(var(--warning))]"
    summaryText = "Meaningful risks exist."
  } else if (moderateCount > 2) {
    grade = "B"
    gradeColor = "text-[hsl(var(--warning))]"
    summaryText = "Solid foundation with some operational drag."
  }

  return { items, grade, gradeColor, summaryText }
}
