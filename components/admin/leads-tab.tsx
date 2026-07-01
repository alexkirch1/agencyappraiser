"use client"

import { useEffect, useState, useCallback, useMemo } from "react"

const ADMIN_TOKEN_KEY = "admin_session_token"

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null
  return token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : { "Content-Type": "application/json" }
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, TrendingUp, Calculator, ClipboardCheck, DollarSign, RefreshCw, 
  FolderKanban, Trophy, X, ChevronRight, ExternalLink, Trash2, Archive,
  ArrowUpRight, ArrowDownRight, Percent, Target, Clock, Calendar,
  LayoutGrid, List, GripVertical, Phone, Mail, ChevronDown, ArchiveRestore,
  Lightbulb, AlertTriangle, CheckCircle2, HelpCircle, StickyNote, Save
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { CompleteDealModal } from "@/components/admin/complete-deal-modal"
import { useMarketIntel } from "@/lib/use-market-intel"
import type { Deal } from "@/components/admin/admin-dashboard"
import { cn } from "@/lib/utils"

interface LeadRow {
  id: number
  name: string
  email: string
  phone: string | null
  agency_name: string | null
  tool_used: string | null
  estimated_value: string | null
  valuation_summary: string | null
  referral_source: string | null
  pipedrive_deal_id: number | null
  created_at: string
  stage: string | null
  last_activity: string | null
  // Full valuation
  low_offer: string | null
  high_offer: string | null
  core_score: string | null
  calculated_multiple: string | null
  risk_grade: string | null
  revenue_ltm: string | null
  revenue_y2: string | null
  revenue_y3: string | null
  retention_rate: string | null
  sde_ebitda: string | null
  year_established: number | null
  employee_count: number | null
  owner_compensation: string | null
  annual_payroll_cost: string | null
  revenue_per_employee: string | null
  client_concentration: string | null
  carrier_diversification: string | null
  scope_of_sale: string | null
  avg_client_tenure: string | null
  new_business_value: string | null
  staff_retention_risk: string | null
  office_structure: string | null
  top_carriers: string | null
  producer_agreements: string | null
  closing_timeline: string | null
  primary_state: string | null
  eo_claims: number | null
  policy_mix: string | null
  agency_description: string | null
  // Quick valuation
  quick_revenue: string | null
  quick_retention: string | null
  book_type: string | null
  growth: string | null
  policy_ratio: string | null
  quick_policies: number | null
  quick_customers: number | null
  quick_multiplier: string | null
  suggested_mult: string | null
  quick_low: string | null
  quick_mid: string | null
  quick_high: string | null
  tier: string | null
  // Quiz
  total_score: number | null
  max_score: number | null
  quiz_pct: string | null
  quiz_grade: string | null
  quiz_answers: Record<string, unknown> | null
  // Archive
  archived: boolean
  archive_reason: string | null
  archived_at: string | null
  // Notes
  notes: string | null
}

interface Stats {
  total_leads: string
  full_valuations: string
  quick_valuations: string
  quiz_submissions: string
  avg_value: string | null
  total_pipeline_value: string | null
  leads_this_week: string
  leads_this_month: string
  won_leads: string
  lost_leads: string
  engaged_leads: string
  avg_won_value: string | null
  total_won_value: string | null
}

interface StageStats {
  stage: string
  count: string
  value: string | null
}

interface SourceStats {
  source: string
  count: string
  value: string | null
}

interface WeeklyTrend {
  week: string
  count: string
  value: string | null
}

const PIPELINE_STAGES = [
  { id: 'new',         label: 'New',         dotClass: 'bg-slate-400',   activeClass: 'bg-slate-500 text-white' },
  { id: 'contacted',   label: 'Contacted',   dotClass: 'bg-blue-500',    activeClass: 'bg-blue-500 text-white' },
  { id: 'qualified',   label: 'Qualified',   dotClass: 'bg-violet-500',  activeClass: 'bg-violet-500 text-white' },
  { id: 'proposal',    label: 'Proposal',    dotClass: 'bg-amber-500',   activeClass: 'bg-amber-500 text-white' },
  { id: 'negotiating', label: 'Negotiating', dotClass: 'bg-orange-500',  activeClass: 'bg-orange-500 text-white' },
  { id: 'won',         label: 'Won',         dotClass: 'bg-emerald-500', activeClass: 'bg-emerald-500 text-white' },
  { id: 'lost',        label: 'Lost',        dotClass: 'bg-rose-500',    activeClass: 'bg-rose-500 text-white' },
]

const ARCHIVE_REASONS = [
  { id: 'not_interested',  label: 'Not Interested' },
  { id: 'no_contact',      label: 'No Contact / Unresponsive' },
  { id: 'bad_timing',      label: 'Bad Timing' },
  { id: 'price_mismatch',  label: 'Price Mismatch' },
  { id: 'chose_competitor',label: 'Chose Competitor' },
  { id: 'duplicate',       label: 'Duplicate Lead' },
  { id: 'not_qualified',   label: 'Not Qualified' },
  { id: 'other',           label: 'Other' },
]

function ArchiveModal({ 
  leadName, 
  onConfirm, 
  onCancel,
  loading
}: { 
  leadName: string
  onConfirm: (reason: string) => void
  onCancel: () => void
  loading: boolean
}) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-[70] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Archive className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Archive Lead</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {leadName} — select a reason below
            </p>
          </div>
        </div>

        <div className="space-y-1.5 mb-5">
          {ARCHIVE_REASONS.map((reason) => (
            <button
              key={reason.id}
              onClick={() => setSelected(reason.id)}
              className={cn(
                "w-full text-left rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                selected === reason.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/30 text-foreground hover:bg-secondary/60"
              )}
            >
              {reason.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white border-0"
            disabled={!selected || loading}
            onClick={() => selected && onConfirm(selected)}
          >
            {loading ? "Archiving…" : "Archive Lead"}
          </Button>
        </div>
      </div>
    </>
  )
}

function fmt(n: string | null | undefined, prefix = "$") {
  if (!n) return "—"
  const num = parseFloat(n)
  if (isNaN(num)) return "—"
  return prefix + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(num)
}

function fmtCompact(n: string | null | undefined, prefix = "$") {
  if (!n) return "—"
  const num = parseFloat(n)
  if (isNaN(num)) return "—"
  if (num >= 1000000) return prefix + (num / 1000000).toFixed(1) + "M"
  if (num >= 1000) return prefix + (num / 1000).toFixed(0) + "K"
  return prefix + num.toFixed(0)
}

function fmtCompactNum(n: number) {
  if (!n || isNaN(n)) return "0"
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M"
  if (n >= 1000) return (n / 1000).toFixed(0) + "K"
  return n.toFixed(0)
}

function toolBadge(tool: string | null) {
  if (!tool) return <Badge variant="outline" className="text-[10px]">Unknown</Badge>
  if (tool.includes("full")) return <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px]">Full Val</Badge>
  if (tool.includes("quick")) return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 text-[10px]">Quick Val</Badge>
  if (tool.includes("quiz")) return <Badge className="bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 text-[10px]">Quiz</Badge>
  if (tool.toLowerCase().includes("ams") || tool.toLowerCase().includes("agency management")) return <Badge className="bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800 text-[10px]">AMS</Badge>
  if (tool.toLowerCase().includes("carrier")) return <Badge className="bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800 text-[10px]">Carrier</Badge>
  return <Badge variant="outline" className="text-[10px]">{tool}</Badge>
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean)
  if (rows.length === 0) return null
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="divide-y divide-border rounded-lg border border-border bg-secondary/20">
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, tooltip }: { label: string; value: string | null | undefined; tooltip?: string }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-muted-foreground" title={tooltip}>{label}{tooltip && <span className="ml-1 cursor-help text-muted-foreground/50">?</span>}</span>
      <span className="font-medium text-foreground text-right max-w-[55%] break-words">{value}</span>
    </div>
  )
}

// ── Buyer Intelligence engine ─────────────────────────────────────────────────

type SignalLevel = "green" | "yellow" | "red"

interface Signal {
  level: SignalLevel
  label: string
  detail: string
}

interface BuyerIntel {
  verdict: "Strong Buy" | "Buy" | "Proceed with Caution" | "Pass" | "Insufficient Data"
  verdictReason: string
  dealStructure: string   // cash-heavy vs earnout recommendation
  score: number           // 0-100 deal quality score
  signals: Signal[]
  questions: string[]
}

function fmt$(n: number | null) {
  if (!n) return null
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
}

function buildBuyerIntelligence(lead: LeadRow): BuyerIntel {
  const signals: Signal[] = []
  const questions: string[] = []
  let scorePoints = 0
  let maxPoints = 0

  const revenue = parseFloat(lead.revenue_ltm ?? lead.quick_revenue ?? "0") || null
  const sde = parseFloat(lead.sde_ebitda ?? "0") || null
  const ownerComp = parseFloat(lead.owner_compensation ?? "0") || null
  const retention = parseFloat(lead.retention_rate ?? lead.quick_retention ?? "0") || null
  const multiple = parseFloat(lead.calculated_multiple ?? lead.quick_multiplier ?? lead.suggested_mult ?? "0") || null
  const carrierDiv = parseFloat(lead.carrier_diversification ?? "0") || null
  const clientConc = parseFloat(lead.client_concentration ?? "0") || null
  const low = parseFloat(lead.low_offer ?? lead.quick_low ?? "0") || null
  const high = parseFloat(lead.high_offer ?? lead.quick_high ?? "0") || null

  // ── 1. Retention ──────────────────────────────────────────────────────────
  maxPoints += 20
  if (retention !== null) {
    if (retention >= 93) {
      signals.push({ level: "green", label: "Retention", detail: `${retention}% retention — top decile. Well above the 88% P&C benchmark. Strong book stickiness post-close.` })
      scorePoints += 20
    } else if (retention >= 88) {
      signals.push({ level: "green", label: "Retention", detail: `${retention}% retention — at or above industry average. Acceptable for most buyers.` })
      scorePoints += 15
    } else if (retention >= 82) {
      signals.push({ level: "yellow", label: "Retention", detail: `${retention}% retention — below the 88% benchmark. Request trailing 3-year trend to rule out acceleration.` })
      scorePoints += 8
    } else {
      signals.push({ level: "red", label: "Retention", detail: `${retention}% retention — significantly below benchmark. Expect buyers to reduce multiple by 0.3–0.5x or require a retention-based earnout.` })
      scorePoints += 2
    }
  } else {
    questions.push("What is the 3-year trailing retention rate?")
  }

  // ── 2. Revenue / SDE margin sanity ────────────────────────────────────────
  maxPoints += 15
  if (revenue && sde) {
    const sdeMargin = (sde / revenue) * 100
    if (ownerComp && revenue) {
      const compRatio = (ownerComp / revenue) * 100
      if (compRatio > 60) {
        signals.push({ level: "red", label: "Owner Comp vs Revenue", detail: `Owner compensation is ${compRatio.toFixed(0)}% of revenue (${ fmt$(ownerComp) }). Normalized SDE will shift dramatically after recast — verify buyer can absorb management replacement cost.` })
        scorePoints += 3
      } else if (compRatio > 40) {
        signals.push({ level: "yellow", label: "Owner Comp vs Revenue", detail: `Owner comp is ${compRatio.toFixed(0)}% of revenue. Moderate recast risk — confirm SDE figure is already normalized.` })
        scorePoints += 9
      } else {
        signals.push({ level: "green", label: "Financials", detail: `SDE margin of ${sdeMargin.toFixed(0)}% on ${fmt$(revenue)} revenue. Clean financial profile — limited recast risk.` })
        scorePoints += 15
      }
    } else {
      signals.push({ level: "green", label: "Financials", detail: `SDE of ${fmt$(sde)} on ${fmt$(revenue)} revenue (${sdeMargin.toFixed(0)}% margin).` })
      scorePoints += 12
    }
  } else if (revenue) {
    questions.push("What is the normalized SDE/EBITDA after adjusting for owner compensation?")
  } else {
    questions.push("What is the agency's LTM revenue and trailing SDE?")
  }

  // ── 3. Revenue trend ──────────────────────────────────────────────────────
  maxPoints += 15
  if (lead.revenue_ltm && lead.revenue_y2) {
    const ltm = parseFloat(lead.revenue_ltm)
    const y2 = parseFloat(lead.revenue_y2)
    const growth = ((ltm - y2) / y2) * 100
    if (growth >= 12) {
      signals.push({ level: "green", label: "Revenue Growth", detail: `+${growth.toFixed(1)}% YoY revenue growth — strong organic story. Buyers will pay a premium for momentum.` })
      scorePoints += 15
    } else if (growth >= 3) {
      signals.push({ level: "green", label: "Revenue Growth", detail: `+${growth.toFixed(1)}% YoY growth — steady and positive. In line with market expectations.` })
      scorePoints += 11
    } else if (growth >= -3) {
      signals.push({ level: "yellow", label: "Revenue Growth", detail: `Revenue is flat (${growth.toFixed(1)}% YoY). Not a dealbreaker but reduces urgency premium. Verify cause.` })
      scorePoints += 6
    } else {
      signals.push({ level: "red", label: "Revenue Decline", detail: `Revenue declined ${Math.abs(growth).toFixed(1)}% YoY — this is a significant red flag. Buyers will apply a distressed multiple or walk. Root cause required before offer.` })
      scorePoints += 1
    }
  } else if (lead.growth === "declining") {
    signals.push({ level: "red", label: "Revenue Trend", detail: "Self-reported declining growth. Pull 3-year P&L before making any offer." })
    scorePoints += 2; maxPoints += 15
  } else if (lead.growth === "strong") {
    signals.push({ level: "green", label: "Revenue Trend", detail: "Self-reported strong growth trajectory. Verify with actual financials." })
    scorePoints += 10; maxPoints += 15
  } else {
    questions.push("What is the YoY revenue trend for the past 3 years?")
  }

  // ── 4. Carrier concentration ──────────────────────────────────────────────
  maxPoints += 15
  if (carrierDiv !== null) {
    const carrierNames = lead.top_carriers ? ` (${lead.top_carriers})` : ""
    if (carrierDiv >= 65) {
      signals.push({ level: "green", label: "Carrier Diversification", detail: `Strong carrier mix at ${carrierDiv}%${carrierNames}. Well-spread appointments reduce post-close non-renewal risk.` })
      scorePoints += 15
    } else if (carrierDiv >= 40) {
      signals.push({ level: "yellow", label: "Carrier Concentration", detail: `Moderate carrier concentration (score: ${carrierDiv}%)${carrierNames}. Ask which carrier holds the largest share of premium and what happens if that appointment is lost.` })
      scorePoints += 8
    } else {
      signals.push({ level: "red", label: "Carrier Concentration", detail: `High carrier concentration (score: ${carrierDiv}%)${carrierNames}. Over-reliance on one carrier is a top risk in P&C acquisitions — a single non-renewal could eliminate 40–60% of premium post-close. Request carrier volume breakdown.` })
      scorePoints += 2
    }
  } else if (lead.top_carriers) {
    signals.push({ level: "yellow", label: "Carriers", detail: `Appointed with ${lead.top_carriers}. Concentration data not quantified — ask for premium split by carrier.` })
    maxPoints += 15; scorePoints += 6
    questions.push("What % of written premium is placed with the top carrier?")
  } else {
    questions.push("Which carriers is the agency appointed with and what are the premium volumes?")
  }

  // ── 5. Client concentration ───────────────────────────────────────────────
  if (clientConc !== null) {
    maxPoints += 10
    if (clientConc > 25) {
      signals.push({ level: "red", label: "Client Concentration", detail: `Top client is ${clientConc}% of revenue. Request client list with tenure — if this client leaves post-close, the book value drops materially. Consider holdback or earnout tied to this account.` })
      scorePoints += 1
    } else if (clientConc > 15) {
      signals.push({ level: "yellow", label: "Client Concentration", detail: `Top client at ${clientConc}% of revenue — moderate concentration. Verify tenure and relationship is transferable.` })
      scorePoints += 6
    } else {
      signals.push({ level: "green", label: "Client Concentration", detail: `No single client dominates (top client at ${clientConc}%). Clean diversified book.` })
      scorePoints += 10
    }
  }

  // ── 6. E&O history ────────────────────────────────────────────────────────
  if (lead.eo_claims != null) {
    maxPoints += 10
    if (lead.eo_claims === 0) {
      signals.push({ level: "green", label: "E&O History", detail: "Clean E&O record — no claims on file. Reduces reps & warranties exposure for the buyer." })
      scorePoints += 10
    } else if (lead.eo_claims <= 2) {
      signals.push({ level: "yellow", label: "E&O Claims", detail: `${lead.eo_claims} E&O claim${lead.eo_claims > 1 ? "s" : ""} on record. Request full details, resolution status, and confirm coverage limits before LOI.` })
      scorePoints += 4
    } else {
      signals.push({ level: "red", label: "E&O Claims", detail: `${lead.eo_claims} E&O claims — above acceptable threshold. Significant reps & warranties exposure. Require detailed claim summaries and consider an escrow holdback.` })
      scorePoints += 0
    }
  }

  // ── 7. Seller transition ──────────────────────────────────────────────────
  maxPoints += 10
  if (lead.closing_timeline) {
    const t = lead.closing_timeline.toLowerCase()
    if (t.includes("24") || t.includes("18")) {
      signals.push({ level: "green", label: "Seller Transition", detail: `${lead.closing_timeline} transition commitment — long runway significantly reduces post-close attrition risk.` })
      scorePoints += 10
    } else if (t.includes("12")) {
      signals.push({ level: "green", label: "Seller Transition", detail: `12-month transition — adequate for most books. Standard for P&C acquisitions.` })
      scorePoints += 8
    } else if (t.includes("6")) {
      signals.push({ level: "yellow", label: "Seller Transition", detail: "6-month transition is short. Negotiate extension or build retention earnout into deal structure." })
      scorePoints += 4
    } else {
      signals.push({ level: "red", label: "Seller Transition", detail: `Short transition (${lead.closing_timeline}) — high post-close attrition risk. Require minimum 12 months or apply a retention-adjusted earnout.` })
      scorePoints += 1
    }
  } else {
    questions.push("What transition/stay period is the seller willing to commit to?")
  }

  // ── 8. Agency tenure ──────────────────────────────────────────────────────
  if (lead.year_established) {
    const age = new Date().getFullYear() - lead.year_established
    maxPoints += 5
    if (age >= 20) {
      signals.push({ level: "green", label: "Agency Age", detail: `${age} years in operation — deep-rooted client relationships. Low probability of mass attrition post-acquisition.` })
      scorePoints += 5
    } else if (age >= 10) {
      signals.push({ level: "green", label: "Agency Age", detail: `${age} years in operation — established agency with solid track record.` })
      scorePoints += 4
    } else if (age < 5) {
      signals.push({ level: "yellow", label: "Agency Age", detail: `Only ${age} years old — limited track record. Buyer may require a larger earnout component.` })
      scorePoints += 2
    }
  }

  // ── 9. Producer agreements ────────────────────────────────────────────────
  if (lead.producer_agreements) {
    maxPoints += 5
    if (lead.producer_agreements.toLowerCase() === "yes") {
      signals.push({ level: "green", label: "Producer Agreements", detail: "Non-solicit/non-compete agreements in place — reduces walk-away risk of key producers post-close." })
      scorePoints += 5
    } else {
      signals.push({ level: "red", label: "Producer Agreements", detail: "No producer agreements. Producers could solicit the book to a competitor post-close. Address in LOI with restrictive covenants." })
      scorePoints += 0
    }
  }

  // ── 10. Trucking / commercial auto ────────────────────────────────────────
  const isTrucking = lead.policy_mix && parseFloat(lead.policy_mix) >= 50 && lead.top_carriers?.toLowerCase().match(/progressive|canal|great american/)
  if (isTrucking || lead.agency_description?.toLowerCase().includes("truck")) {
    maxPoints += 5
    signals.push({ level: "red", label: "Trucking Exposure", detail: "Book appears to have significant trucking/commercial auto exposure. Carriers frequently non-renew these accounts during ownership changes. Cap multiple at 1.5x and require carrier consent letters before close." })
    scorePoints += 0
  }

  // ── Compute verdict ───────────────────────────────────────────────────────
  const dealScore = maxPoints > 0 ? Math.round((scorePoints / maxPoints) * 100) : 0
  const redCount = signals.filter(s => s.level === "red").length
  const greenCount = signals.filter(s => s.level === "green").length

  let verdict: BuyerIntel["verdict"]
  let verdictReason: string
  let dealStructure: string

  if (maxPoints === 0) {
    verdict = "Insufficient Data"
    verdictReason = "Not enough data to form a recommendation. Submit full valuation to unlock analysis."
    dealStructure = "Cannot assess deal structure without financial data."
  } else if (redCount >= 3 || dealScore < 30) {
    verdict = "Pass"
    verdictReason = `${redCount} critical risk${redCount !== 1 ? "s" : ""} identified. The risk-adjusted return does not support an offer at current ask.`
    dealStructure = "If pursuing anyway: heavy earnout (60%+ contingent), 12-month escrow holdback, and tight reps & warranties."
  } else if (redCount >= 2 || dealScore < 50) {
    verdict = "Proceed with Caution"
    verdictReason = `${redCount} significant risk${redCount !== 1 ? "s" : ""} need resolution before LOI. Manageable with the right deal structure.`
    dealStructure = multiple && multiple > 1.8
      ? `At ${multiple}x, consider retrading to ${(multiple - 0.3).toFixed(2)}x with a 30–40% earnout tied to 12-month post-close retention.`
      : "Structure 25–35% as an earnout tied to retention performance over 24 months."
  } else if (greenCount >= 3 && dealScore >= 75) {
    verdict = "Strong Buy"
    verdictReason = `${greenCount} green signals with a deal quality score of ${dealScore}/100. Premium book — move quickly.`
    dealStructure = multiple && multiple > 2.5
      ? `${multiple}x is at the high end of market. Negotiate to ${(multiple - 0.2).toFixed(2)}x with 10–15% earnout. Cash-heavy deal is appropriate given quality.`
      : `Clean deal — cash-heavy structure appropriate (80%+ at close). Minimal earnout needed given book quality.`
  } else {
    verdict = "Buy"
    verdictReason = `Deal quality score of ${dealScore}/100 with ${greenCount} positive and ${redCount} risk signals. Standard P&C acquisition profile.`
    dealStructure = "Standard structure: 70–75% cash at close, 25–30% earnout over 24 months tied to premium retention."
  }

  // ── Fill remaining questions ───────────────────────────────────────────────
  if (!lead.office_structure) questions.push("Is the agency fully remote, office-based, or hybrid? Any long-term lease obligations?")
  if (!lead.sde_ebitda && revenue) questions.push("Confirm SDE/EBITDA is already normalized for owner's market-rate salary.")
  if (!lead.producer_agreements && !signals.find(s => s.label === "Producer Agreements")) {
    questions.push("Do key producers have non-solicit or non-compete agreements?")
  }
  if (questions.length === 0 && signals.length >= 5) {
    questions.push("What is the expiration/renewal date on the top 3 carrier appointments?")
    questions.push("Are there any outstanding audits, state DOI actions, or pending litigation?")
  }

  return { verdict, verdictReason, dealStructure, score: dealScore, signals, questions }
}

// Smart stat card with trend indicator
function SmartStatCard({ 
  label, 
  value, 
  subValue,
  icon: Icon, 
  trend,
  trendLabel,
  highlight 
}: { 
  label: string
  value: string | number
  subValue?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  highlight?: 'success' | 'warning' | 'primary'
}) {
  const highlightMap: Record<string, string> = {
    success: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20',
    warning: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20',
    primary: 'border-primary/30 bg-primary/5',
  }
  const highlightClass = highlight ? (highlightMap[highlight] ?? 'border-border') : 'border-border'

  return (
    <Card className={cn("transition-all hover:shadow-md", highlightClass)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-4 w-4" />
            <span className="text-xs font-medium">{label}</span>
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-0.5 text-[10px] font-medium rounded-full px-1.5 py-0.5",
              trend === 'up' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
              trend === 'down' && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
              trend === 'neutral' && "bg-muted text-muted-foreground"
            )}>
              {trend === 'up' && <ArrowUpRight className="h-3 w-3" />}
              {trend === 'down' && <ArrowDownRight className="h-3 w-3" />}
              {trendLabel}
            </div>
          )}
        </div>
        <p className={cn(
          "mt-1 text-2xl font-bold",
          highlight === 'success' && "text-emerald-600 dark:text-emerald-400",
          highlight === 'warning' && "text-amber-600 dark:text-amber-400",
          highlight === 'primary' && "text-primary",
          !highlight && "text-foreground"
        )}>{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
        )}
      </CardContent>
    </Card>
  )
}

// Pipeline card component for Kanban view
function PipelineCard({ 
  lead, 
  onSelect,
  onStageChange,
  onArchive,
  isDragging
}: { 
  lead: LeadRow
  onSelect: () => void
  onStageChange: (stage: string) => void
  onArchive: () => void
  isDragging?: boolean
}) {
  const val = lead.estimated_value ?? lead.quick_mid
  const daysAgo = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000)

  return (
    <div 
      className={cn(
        "group bg-card border border-border rounded-lg p-3 cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm",
        isDragging && "opacity-50 rotate-2 shadow-lg"
      )}
      onClick={onSelect}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('leadId', lead.id.toString())
      }}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground mt-0.5 cursor-grab" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-sm text-foreground truncate">
              {lead.agency_name ?? lead.name}
            </h4>
            <div className="flex items-center gap-1 shrink-0">
              {toolBadge(lead.tool_used)}
              <button
                onClick={(e) => { e.stopPropagation(); onArchive() }}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-0.5 rounded text-muted-foreground/50 hover:text-amber-600"
                title="Archive lead"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {lead.name}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(val)}</span>
            <span className="text-[10px] text-muted-foreground">
              {daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1d ago' : `${daysAgo}d ago`}
            </span>
          </div>
          {(lead.phone || lead.email) && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
              {lead.phone && (
                <a 
                  href={`tel:${lead.phone}`} 
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Phone className="h-3 w-3" />
                </a>
              )}
              <a 
                href={`mailto:${lead.email}`} 
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-primary"
              >
                <Mail className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Pipeline column
function PipelineColumn({ 
  stage, 
  leads, 
  onSelectLead,
  onStageChange,
  onArchiveLead
}: { 
  stage: typeof PIPELINE_STAGES[number]
  leads: LeadRow[]
  onSelectLead: (lead: LeadRow) => void
  onStageChange: (leadId: number, newStage: string) => void
  onArchiveLead: (lead: LeadRow) => void
}) {
  const totalValue = leads.reduce((sum, l) => sum + (parseFloat(l.estimated_value ?? l.quick_mid ?? '0') || 0), 0)
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div 
      className={cn(
        "flex-1 min-w-[260px] max-w-[320px] rounded-lg border transition-colors",
        isDragOver ? "border-primary bg-primary/5" : "border-border bg-secondary/20"
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        const leadId = e.dataTransfer.getData('leadId')
        if (leadId) {
          onStageChange(parseInt(leadId), stage.id)
        }
      }}
    >
      {/* Column header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", stage.dotClass)} />
            <h3 className="font-semibold text-sm text-foreground">{stage.label}</h3>
            <span className="bg-muted rounded-full px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {leads.length}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {fmtCompact(totalValue.toString())} total
        </p>
      </div>

      {/* Cards */}
      <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
        {leads.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No leads</p>
        ) : (
          leads.map((lead) => (
            <PipelineCard
              key={lead.id}
              lead={lead}
              onSelect={() => onSelectLead(lead)}
              onStageChange={(newStage) => onStageChange(lead.id, newStage)}
              onArchive={() => onArchiveLead(lead)}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface LeadsTabProps {
  deals?: Deal[]
  onNavigateToPipeline?: () => void
  onAddDeal?: (deal: Deal) => void
  onUpdateDeal?: (id: string, updates: Partial<Deal>) => void
}

export function LeadsTab({ deals = [], onNavigateToPipeline, onAddDeal, onUpdateDeal }: LeadsTabProps) {
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [stageStats, setStageStats] = useState<StageStats[]>([])
  const [sourceStats, setSourceStats] = useState<SourceStats[]>([])
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewingLead, setViewingLead] = useState<LeadRow | null>(null)
  const [wonDeal, setWonDeal] = useState<Deal | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline')
  const [archivingLead, setArchivingLead] = useState<LeadRow | null>(null)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [notesValue, setNotesValue] = useState<string>("")
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const { mutate: mutateIntel } = useMarketIntel()

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/leads", { headers: getAuthHeaders() })
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setLeads(data.leads ?? [])
      setStats(data.stats ?? null)
      setStageStats(data.stageStats ?? [])
      setSourceStats(data.sourceStats ?? [])
      setWeeklyTrend(data.weeklyTrend ?? [])
    } catch {
      setError("Could not load leads from database.")
    } finally {
      setLoading(false)
    }
  }, [])

  // Background stats refresh — no loading flash, just silently updates counts/values
  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/leads", { headers: getAuthHeaders() })
      if (!res.ok) return
      const data = await res.json()
      setStats(data.stats ?? null)
      setStageStats(data.stageStats ?? [])
      setSourceStats(data.sourceStats ?? [])
      setWeeklyTrend(data.weeklyTrend ?? [])
    } catch {
      // silently ignore — stats are non-critical
    }
  }, [])

  const deleteLead = async (id: number) => {
    if (!confirm("Permanently delete this lead and all associated data? This cannot be undone.")) return
    setDeletingId(id)
    try {
      const res = await fetch("/api/admin/leads", {
        method: "DELETE",
        headers: getAuthHeaders(),
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error("Failed to delete")
      setLeads((prev) => prev.filter((l) => l.id !== id))
      setViewingLead(null)
      // Refresh stats so counts/totals update immediately
      refreshStats()
    } catch {
      alert("Failed to delete lead. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  const updateLeadStage = useCallback(async (leadId: number, newStage: string) => {
    // Optimistic update on both leads list and detail panel
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage: newStage } : l))
    setViewingLead((prev) => prev?.id === leadId ? { ...prev, stage: newStage } : prev)

    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: leadId, stage: newStage }),
      })
      if (!res.ok) throw new Error("Failed to update")
      // Update stage stats in background
      refreshStats()
    } catch {
      // Revert on error
      fetchLeads()
      alert("Failed to update lead stage.")
    }
  }, [fetchLeads, refreshStats])

  const archiveLead = async (lead: LeadRow, reason: string) => {
    setArchiveLoading(true)
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: lead.id, archived: true, archive_reason: reason }),
      })
      if (!res.ok) throw new Error("Failed to archive")
      const now = new Date().toISOString()
      setLeads((prev) => prev.map((l) =>
        l.id === lead.id ? { ...l, archived: true, archive_reason: reason, archived_at: now } : l
      ))
      setArchivingLead(null)
      setViewingLead(null)
      refreshStats()
    } catch {
      alert("Failed to archive lead. Please try again.")
    } finally {
      setArchiveLoading(false)
    }
  }

  const saveNotes = async (leadId: number, notes: string) => {
    setNotesSaving(true)
    setNotesSaved(false)
    try {
      await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: leadId, notes }),
      })
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, notes } : l))
      setViewingLead((prev) => prev?.id === leadId ? { ...prev, notes } : prev)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } finally {
      setNotesSaving(false)
    }
  }

  const unarchiveLead = async (id: number) => {
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, archived: false, archive_reason: null }),
      })
      if (!res.ok) throw new Error("Failed to unarchive")
      setLeads((prev) => prev.map((l) =>
        l.id === id ? { ...l, archived: false, archive_reason: null, archived_at: null } : l
      ))
      refreshStats()
    } catch {
      alert("Failed to unarchive lead.")
    }
  }

  useEffect(() => { fetchLeads() }, [fetchLeads])

  // Sync notes textarea when a different lead is opened
  useEffect(() => {
    setNotesValue(viewingLead?.notes ?? "")
    setNotesSaved(false)
  }, [viewingLead?.id])

  const activeDeals = deals.filter((d) => d.status === "active")
  const completedDeals = deals.filter((d) => d.status === "completed")
  const pipelineValue = activeDeals.reduce((s, d) => s + d.valuation, 0)
  const wonValue = completedDeals.reduce((s, d) => s + d.valuation, 0)

  // Build a Deal object from a LeadRow so we can pass it to CompleteDealModal
  function leadToDeal(lead: LeadRow): Deal {
    const valuation = parseFloat(lead.estimated_value ?? lead.quick_mid ?? "0") || 0
    const premiumBase = parseFloat(lead.revenue_ltm ?? lead.quick_revenue ?? "0") || 0
    return {
      id: `lead-${lead.id}`,
      deal_name: lead.agency_name ?? lead.name,
      deal_type: (lead.tool_used?.includes("book") ? "book" : "full") as "full" | "book",
      valuation,
      premium_base: premiumBase,
      status: "active",
      date_saved: lead.created_at,
      details: {
        carrier: null,
        loss_ratio: lead.quick_retention ? null : null,
        book_retention_pct: lead.retention_rate ? parseFloat(lead.retention_rate) : null,
        revenue: premiumBase || null,
        retention: lead.retention_rate ? parseFloat(lead.retention_rate) : null,
        lossRatio: null,
        riskGrade: lead.risk_grade ?? lead.quiz_grade,
        coreScore: lead.core_score ? parseFloat(lead.core_score) : null,
        multiple: lead.calculated_multiple ? parseFloat(lead.calculated_multiple) : null,
        notes: null,
      },
    }
  }

  function fmtStat(v: string | null | undefined, prefix = "") {
    if (!v) return "—"
    const n = parseFloat(v)
    return isNaN(n) ? v : prefix + n.toLocaleString("en-US", { maximumFractionDigits: 1 })
  }

  // Derive all stats directly from local leads array so they update instantly on any mutation
  const derivedStats = useMemo(() => {
    const active = leads.filter((l) => !l.archived)
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const totalLeads = active.length
    const wonLeads = active.filter((l) => l.stage === 'won')
    const lostLeads = active.filter((l) => l.stage === 'lost')
    const engagedLeads = active.filter((l) => l.stage && !['won', 'lost', 'new'].includes(l.stage))
    const thisWeek = active.filter((l) => new Date(l.created_at) >= oneWeekAgo)

    const withValue = active.filter((l) => l.estimated_value && !isNaN(parseFloat(l.estimated_value)))
    const wonWithValue = wonLeads.filter((l) => l.estimated_value && !isNaN(parseFloat(l.estimated_value)))

    const totalPipeline = withValue.reduce((s, l) => s + parseFloat(l.estimated_value!), 0)
    const totalWon = wonWithValue.reduce((s, l) => s + parseFloat(l.estimated_value!), 0)
    const avgValue = withValue.length > 0 ? totalPipeline / withValue.length : 0
    const avgWon = wonWithValue.length > 0 ? totalWon / wonWithValue.length : 0

    const convRate = totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : '0'

    // Stage distribution from local array
    const stageMap = PIPELINE_STAGES.reduce((acc, s) => {
      const inStage = active.filter((l) => (l.stage ?? 'new') === s.id)
      const stageVal = inStage.filter((l) => l.estimated_value).reduce((sum, l) => sum + parseFloat(l.estimated_value!), 0)
      acc[s.id] = { count: inStage.length, value: stageVal }
      return acc
    }, {} as Record<string, { count: number; value: number }>)

    // Source breakdown from local array
    const sourceMap: Record<string, { count: number; value: number }> = {}
    for (const l of active) {
      const src = l.tool_used ?? 'unknown'
      if (!sourceMap[src]) sourceMap[src] = { count: 0, value: 0 }
      sourceMap[src].count++
      if (l.estimated_value) sourceMap[src].value += parseFloat(l.estimated_value)
    }

    return {
      totalLeads,
      wonCount: wonLeads.length,
      lostCount: lostLeads.length,
      engagedCount: engagedLeads.length,
      thisWeekCount: thisWeek.length,
      totalPipeline,
      totalWon,
      avgValue,
      avgWon,
      convRate,
      stageMap,
      sourceMap,
    }
  }, [leads])

  // Calculate week-over-week trend from server weeklyTrend (still server-side only, fine)
  const weekTrend = weeklyTrend.length >= 2 
    ? parseInt(weeklyTrend[weeklyTrend.length - 1]?.count ?? '0') - parseInt(weeklyTrend[weeklyTrend.length - 2]?.count ?? '0')
    : 0

  // Separate active vs archived leads
  const activeLeads = leads.filter((l) => !l.archived)
  const archivedLeads = leads.filter((l) => l.archived)

  // Group active leads by stage for pipeline view
  const leadsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.id] = activeLeads.filter((l) => (l.stage ?? 'new') === stage.id)
    return acc
  }, {} as Record<string, LeadRow[]>)

  return (
    <div className="flex flex-col gap-6">
      {/* Horizon Pipeline summary */}
      {deals.length > 0 && (
        <div
          className="flex cursor-pointer flex-wrap items-center gap-4 rounded-lg border border-primary/20 bg-primary/5 px-5 py-4 transition-colors hover:bg-primary/10"
          onClick={onNavigateToPipeline}
          role="button"
          aria-label="Go to Horizon Pipeline"
        >
          <FolderKanban className="h-5 w-5 shrink-0 text-primary" />
          <div className="flex flex-1 flex-wrap gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Active Pipeline</p>
              <p className="text-base font-bold text-foreground">
                {activeDeals.length} deal{activeDeals.length !== 1 ? "s" : ""}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  — ${pipelineValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed Deals</p>
              <p className="text-base font-bold text-foreground">
                <Trophy className="mb-0.5 mr-1 inline h-4 w-4 text-amber-500" />
                {completedDeals.length}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  — ${wonValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
              </p>
            </div>
          </div>
          <span className="text-xs text-primary font-medium">View Pipeline &rarr;</span>
        </div>
      )}

      {/* Smart Stats Grid — derived from local leads array, updates instantly */}
      {leads.length > 0 && (
        <div className="space-y-4">
          {/* Primary metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SmartStatCard
              label="Total Pipeline"
              value={`$${fmtCompactNum(derivedStats.totalPipeline)}`}
              subValue={`${derivedStats.totalLeads} leads`}
              icon={DollarSign}
              highlight="primary"
            />
            <SmartStatCard
              label="Won Revenue"
              value={`$${fmtCompactNum(derivedStats.totalWon)}`}
              subValue={`${derivedStats.wonCount} closed`}
              icon={Trophy}
              highlight="success"
            />
            <SmartStatCard
              label="Conversion Rate"
              value={`${derivedStats.convRate}%`}
              subValue={`${derivedStats.wonCount}/${derivedStats.totalLeads}`}
              icon={Percent}
              trend={parseFloat(derivedStats.convRate) > 10 ? 'up' : parseFloat(derivedStats.convRate) > 5 ? 'neutral' : 'down'}
              trendLabel={parseFloat(derivedStats.convRate) > 10 ? 'Good' : 'Avg'}
            />
            <SmartStatCard
              label="This Week"
              value={String(derivedStats.thisWeekCount)}
              subValue={weekTrend >= 0 ? `+${weekTrend} vs last` : `${weekTrend} vs last`}
              icon={Calendar}
              trend={weekTrend > 0 ? 'up' : weekTrend < 0 ? 'down' : 'neutral'}
              trendLabel={weekTrend > 0 ? `+${weekTrend}` : weekTrend < 0 ? `${weekTrend}` : '0'}
            />
            <SmartStatCard
              label="Avg Deal Size"
              value={`$${fmtCompactNum(derivedStats.avgValue)}`}
              subValue={derivedStats.avgWon > 0 ? `Won: $${fmtCompactNum(derivedStats.avgWon)}` : undefined}
              icon={Target}
            />
            <SmartStatCard
              label="Engaged"
              value={String(derivedStats.engagedCount)}
              subValue="In progress"
              icon={Clock}
              highlight="warning"
            />
          </div>

          {/* Source breakdown */}
          {Object.keys(derivedStats.sourceMap).length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(Object.entries(derivedStats.sourceMap) as [string, { count: number; value: number }][])
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 4)
                .map(([source, data]) => {
                const icon = source?.includes('full') ? Calculator 
                  : source?.includes('quick') ? TrendingUp 
                  : source?.includes('quiz') ? ClipboardCheck 
                  : Users
                return (
                  <SmartStatCard
                    key={source}
                    label={source?.includes('full') ? 'Full Valuations'
                      : source?.includes('quick') ? 'Quick Valuations'
                      : source?.includes('quiz') ? 'Quiz Leads'
                      : 'Other'}
                    value={String(data.count)}
                    subValue={data.value > 0 ? `$${fmtCompactNum(data.value)}` : undefined}
                    icon={icon}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* View toggle and header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Leads Pipeline</h3>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            <button
              onClick={() => setViewMode('pipeline')}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === 'pipeline' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Pipeline
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === 'list' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchLeads} className="gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Pipeline View */}
      {viewMode === 'pipeline' && (
        <div className="relative">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
            </div>
          )}
          {error && (
            <p className="px-6 py-8 text-center text-sm text-destructive">{error}</p>
          )}
          {!loading && !error && (
            <div className="flex gap-3 overflow-x-auto pb-4">
              {PIPELINE_STAGES.filter(s => s.id !== 'lost').map((stage) => (
                <PipelineColumn
                  key={stage.id}
                  stage={stage}
                  leads={leadsByStage[stage.id] ?? []}
                  onSelectLead={setViewingLead}
                  onStageChange={updateLeadStage}
                  onArchiveLead={setArchivingLead}
                />
              ))}
            </div>
          )}

          {/* Lost leads summary */}
          {leadsByStage['lost']?.length > 0 && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <h3 className="font-semibold text-sm text-foreground">Lost</h3>
                  <span className="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                    {leadsByStage['lost'].length}
                  </span>
                </div>
                <button 
                  onClick={() => setViewMode('list')}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
                >
                  View all
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">All Leads</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
              </div>
            )}
            {error && (
              <p className="px-6 py-8 text-center text-sm text-destructive">{error}</p>
            )}
            {!loading && !error && leads.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">No leads saved yet. Leads appear here after users submit the calculator or quiz.</p>
            )}
            {!loading && !error && leads.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Agency</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Stage</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Tool</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Est. Value</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Multiple</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Risk</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Date</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leads.map((lead) => {
                      const multi = lead.calculated_multiple ?? lead.suggested_mult
                      const grade = lead.risk_grade ?? lead.quiz_grade
                      const val = lead.estimated_value ?? lead.quick_mid
                      const stage = PIPELINE_STAGES.find(s => s.id === (lead.stage ?? 'new'))
                      return (
                        <tr
                          key={lead.id}
                          className="group cursor-pointer hover:bg-secondary/30 transition-colors"
                          onClick={() => setViewingLead(lead)}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">{lead.email}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{lead.agency_name ?? "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-2 h-2 rounded-full", stage?.dotClass ?? 'bg-slate-400')} />
                              <span className="text-xs font-medium text-muted-foreground">{stage?.label ?? 'New'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">{toolBadge(lead.tool_used)}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">{fmt(val)}</td>
                          <td className="px-4 py-3 text-right font-mono text-foreground">
                            {multi ? `${parseFloat(multi).toFixed(2)}x` : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {grade ? <Badge variant="outline" className="text-[10px]">{grade}</Badge> : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(lead.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lead Detail Drawer */}
      {viewingLead && !wonDeal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setViewingLead(null)} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-card shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold text-foreground">
                  {viewingLead.agency_name ?? viewingLead.name}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {viewingLead.name} &bull;{" "}
                  <a href={`mailto:${viewingLead.email}`} className="hover:text-primary" onClick={(e) => e.stopPropagation()}>
                    {viewingLead.email}
                  </a>
                  {viewingLead.phone && <> &bull; {viewingLead.phone}</>}
                </p>
              </div>
              <button
                onClick={() => setViewingLead(null)}
                className="ml-4 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stage selector */}
            <div className="border-b border-border px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Stage</p>
              <div className="flex flex-wrap gap-1.5">
                  {PIPELINE_STAGES.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => {
                      updateLeadStage(viewingLead.id, stage.id)
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      (viewingLead.stage ?? 'new') === stage.id
                        ? stage.activeClass
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    )}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Tool badge + date + state */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {toolBadge(viewingLead.tool_used)}
                  {viewingLead.primary_state && (
                    <Badge variant="outline" className="text-[10px]">{viewingLead.primary_state}</Badge>
                  )}
                  {viewingLead.referral_source && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                      Heard via: {viewingLead.referral_source}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{new Date(viewingLead.created_at).toLocaleDateString()}</span>
              </div>

              {/* Agency description */}
              {viewingLead.agency_description && (
                <p className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
                  {viewingLead.agency_description}
                </p>
              )}

              {/* Valuation summary (raw text from lead capture) */}
              {viewingLead.valuation_summary && !viewingLead.low_offer && !viewingLead.quick_low && (
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Valuation Summary</p>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{viewingLead.valuation_summary}</p>
                </div>
              )}

              {/* ── Buyer Intelligence ──────────────────────────────────────── */}
              {(() => {
                const intel = buildBuyerIntelligence(viewingLead)
                if (intel.verdict === "Insufficient Data" && intel.signals.length === 0) return null

                const verdictColors: Record<BuyerIntel["verdict"], string> = {
                  "Strong Buy":           "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
                  "Buy":                  "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
                  "Proceed with Caution": "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
                  "Pass":                 "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400",
                  "Insufficient Data":    "bg-secondary border-border text-muted-foreground",
                }
                const signalDot: Record<Signal["level"], string> = {
                  green:  "bg-emerald-500",
                  yellow: "bg-amber-400",
                  red:    "bg-rose-500",
                }
                const signalBg: Record<Signal["level"], string> = {
                  green:  "bg-emerald-500/5 border-emerald-500/20",
                  yellow: "bg-amber-500/5 border-amber-500/20",
                  red:    "bg-rose-500/5 border-rose-500/20",
                }

                return (
                  <div className="rounded-lg border border-border bg-card overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-2 border-b border-border bg-secondary/30 px-4 py-2.5">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                      <p className="text-xs font-bold uppercase tracking-wide text-foreground">Buyer Intelligence</p>
                      {intel.verdict !== "Insufficient Data" && (
                        <span className="ml-auto text-[10px] font-semibold text-muted-foreground">
                          Deal Score: {intel.score}/100
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Verdict + Deal Structure */}
                      <div className={cn("rounded-lg border px-4 py-3 space-y-1.5", verdictColors[intel.verdict])}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-wide">Recommendation</p>
                          <span className="text-sm font-bold">{intel.verdict}</span>
                        </div>
                        <p className="text-xs leading-relaxed opacity-90">{intel.verdictReason}</p>
                        <div className="border-t border-current/20 pt-2 mt-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-0.5">Deal Structure</p>
                          <p className="text-xs leading-relaxed opacity-85">{intel.dealStructure}</p>
                        </div>
                      </div>

                      {/* Score bar */}
                      {intel.verdict !== "Insufficient Data" && (
                        <div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Deal Quality</span>
                            <span>{intel.score}/100</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", intel.score >= 70 ? "bg-emerald-500" : intel.score >= 45 ? "bg-amber-400" : "bg-rose-500")}
                              style={{ width: `${intel.score}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Signals */}
                      {intel.signals.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Signal Analysis</p>
                          {intel.signals.map((sig, i) => (
                            <div key={i} className={cn("rounded-md border px-3 py-2.5 flex gap-2.5", signalBg[sig.level])}>
                              <span className={cn("mt-1 h-2 w-2 rounded-full shrink-0", signalDot[sig.level])} />
                              <div>
                                <p className="text-[11px] font-semibold text-foreground">{sig.label}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{sig.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Questions to ask */}
                      {intel.questions.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <HelpCircle className="h-3 w-3" /> Questions to Ask
                          </p>
                          {intel.questions.map((q, i) => (
                            <div key={i} className="flex gap-2 pl-1">
                              <span className="text-blue-400 text-xs shrink-0 mt-0.5">—</span>
                              <p className="text-xs text-foreground leading-relaxed">{q}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Valuation offer band — top priority */}
              {(() => {
                const low = parseFloat(viewingLead.low_offer ?? viewingLead.quick_low ?? "")
                const high = parseFloat(viewingLead.high_offer ?? viewingLead.quick_high ?? "")
                // Always compute mid from the actual low/high so it stays between them.
                // Only fall back to stored estimated_value when we have no range data at all.
                const computedMid = !isNaN(low) && !isNaN(high)
                  ? Math.round((low + high) / 2)
                  : parseFloat(viewingLead.estimated_value ?? viewingLead.quick_mid ?? "")
                const midDisplay = fmt(isNaN(computedMid) ? null : String(computedMid))
                return (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Low", value: fmt(viewingLead.low_offer ?? viewingLead.quick_low) },
                  { label: "Mid Value", value: midDisplay, highlight: true as const },
                  { label: "High", value: fmt(viewingLead.high_offer ?? viewingLead.quick_high) },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className={`rounded-lg border p-3 text-center ${highlight ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30" : "border-border bg-secondary/30"}`}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className={`mt-0.5 text-sm font-bold ${highlight ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>{value}</p>
                  </div>
                ))}
              </div>
                )
              })()}

              {/* Core scoring */}
              {(viewingLead.core_score || viewingLead.risk_grade || viewingLead.calculated_multiple) && (
                <Section label="Scoring">
                  <Row label="Core Score" value={viewingLead.core_score ? fmtStat(viewingLead.core_score) : null}
                    tooltip="Composite score (0–100) computed from revenue trend, retention, owner dependency, carrier mix, staff risk, and market position. Higher = more valuable, lower-risk agency." />
                  <Row label="Risk Grade" value={viewingLead.risk_grade} />
                  <Row label="Calculated Multiple" value={viewingLead.calculated_multiple ? `${parseFloat(viewingLead.calculated_multiple).toFixed(2)}x` : null} />
                </Section>
              )}

              {/* Financials */}
              {(viewingLead.revenue_ltm || viewingLead.sde_ebitda || viewingLead.owner_compensation) && (
                <Section label="Financials">
                  <Row label="Revenue (LTM)" value={viewingLead.revenue_ltm ? fmt(viewingLead.revenue_ltm) : null} />
                  <Row label="Revenue (Y-2)" value={viewingLead.revenue_y2 ? fmt(viewingLead.revenue_y2) : null} />
                  <Row label="Revenue (Y-3)" value={viewingLead.revenue_y3 ? fmt(viewingLead.revenue_y3) : null} />
                  <Row label="SDE / EBITDA" value={viewingLead.sde_ebitda ? fmt(viewingLead.sde_ebitda) : null} />
                  <Row label="Owner Compensation" value={viewingLead.owner_compensation ? fmt(viewingLead.owner_compensation) : null} />
                  <Row label="Annual Payroll" value={viewingLead.annual_payroll_cost ? fmt(viewingLead.annual_payroll_cost) : null} />
                  <Row label="Revenue / Employee" value={viewingLead.revenue_per_employee ? fmt(viewingLead.revenue_per_employee) : null} />
                  <Row label="New Business Value" value={viewingLead.new_business_value ? fmt(viewingLead.new_business_value) : null} />
                </Section>
              )}

              {/* Book quality */}
              {(viewingLead.retention_rate || viewingLead.client_concentration || viewingLead.carrier_diversification) && (
                <Section label="Book Quality">
                  <Row label="Retention Rate" value={viewingLead.retention_rate ? `${fmtStat(viewingLead.retention_rate)}%` : null} />
                  <Row label="Avg Client Tenure" value={viewingLead.avg_client_tenure ? `${fmtStat(viewingLead.avg_client_tenure)} yrs` : null} />
                  <Row label="Client Concentration" value={viewingLead.client_concentration ? `${fmtStat(viewingLead.client_concentration)}%` : null} />
                  <Row label="Carrier Diversification" value={viewingLead.carrier_diversification ? `${fmtStat(viewingLead.carrier_diversification)}%` : null} />
                  <Row label="Policy Mix Score" value={viewingLead.policy_mix ? fmtStat(viewingLead.policy_mix) : null} />
                  <Row label="Top Carriers" value={viewingLead.top_carriers} />
                </Section>
              )}

              {/* Agency profile */}
              {(viewingLead.year_established || viewingLead.employee_count || viewingLead.office_structure) && (
                <Section label="Agency Profile">
                  <Row label="Year Established" value={viewingLead.year_established?.toString() ?? null} />
                  <Row label="Employees" value={viewingLead.employee_count?.toString() ?? null} />
                  <Row label="Office Structure" value={viewingLead.office_structure} />
                  <Row label="Staff Retention Risk" value={viewingLead.staff_retention_risk} />
                  <Row label="Producer Agreements" value={viewingLead.producer_agreements} />
                  <Row label="E&O Claims" value={viewingLead.eo_claims != null ? viewingLead.eo_claims.toString() : null} />
                  <Row label="Scope of Sale" value={viewingLead.scope_of_sale ? `${fmtStat(viewingLead.scope_of_sale)}%` : null} />
                  <Row label="Closing Timeline" value={viewingLead.closing_timeline} />
                </Section>
              )}

              {/* Quick valuation */}
              {viewingLead.quick_revenue && (
                <Section label="Quick Valuation">
                  <Row label="Revenue" value={viewingLead.quick_revenue ? fmt(viewingLead.quick_revenue) : null} />
                  <Row label="Retention" value={viewingLead.quick_retention ? `${viewingLead.quick_retention}%` : null} />
                  <Row label="Book Type" value={viewingLead.book_type} />
                  <Row label="Tier" value={viewingLead.tier} />
                  <Row label="Growth" value={viewingLead.growth} />
                  <Row label="Policy Ratio" value={viewingLead.policy_ratio} />
                  <Row label="Policies" value={viewingLead.quick_policies?.toString() ?? null} />
                  <Row label="Customers" value={viewingLead.quick_customers?.toString() ?? null} />
                  <Row label="Suggested Multiple" value={viewingLead.quick_multiplier ? `${parseFloat(viewingLead.quick_multiplier).toFixed(2)}x` : viewingLead.suggested_mult ? `${parseFloat(viewingLead.suggested_mult).toFixed(2)}x` : null} />
                </Section>
              )}

              {/* Quiz */}
              {(viewingLead.quiz_grade || viewingLead.quiz_answers) && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quiz Results</p>
                  <div className="divide-y divide-border rounded-lg border border-border bg-secondary/20">
                    {viewingLead.quiz_grade && (
                      <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="text-muted-foreground">Grade</span>
                        <span className="font-bold text-foreground">{viewingLead.quiz_grade}</span>
                      </div>
                    )}
                    {viewingLead.total_score != null && viewingLead.max_score != null && (
                      <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="text-muted-foreground">Score</span>
                        <span className="font-medium text-foreground">{viewingLead.total_score} / {viewingLead.max_score}</span>
                      </div>
                    )}
                    {viewingLead.quiz_pct && (
                      <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="text-muted-foreground">Percentage</span>
                        <span className="font-medium text-foreground">{fmtStat(viewingLead.quiz_pct)}%</span>
                      </div>
                    )}
                    {viewingLead.quiz_answers && Object.entries(viewingLead.quiz_answers).map(([question, answer], idx) => (
                      <div key={idx} className="flex flex-col gap-0.5 px-4 py-2.5 text-sm">
                        <span className="text-[11px] text-muted-foreground leading-snug">{`Q${idx + 1}: ${question}`}</span>
                        <span className="font-medium text-foreground break-words">{String(answer)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <StickyNote className="h-3.5 w-3.5" /> Notes
                  </p>
                  <button
                    onClick={() => saveNotes(viewingLead.id, notesValue)}
                    disabled={notesSaving || notesValue === (viewingLead.notes ?? "")}
                    className={cn(
                      "flex items-center gap-1 text-[11px] font-medium rounded px-2 py-0.5 transition-colors",
                      notesSaved
                        ? "text-emerald-600 dark:text-emerald-400"
                        : notesValue !== (viewingLead.notes ?? "")
                          ? "text-primary hover:bg-primary/10"
                          : "text-muted-foreground/40 cursor-default"
                    )}
                  >
                    <Save className="h-3 w-3" />
                    {notesSaved ? "Saved" : "Save"}
                  </button>
                </div>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
                      saveNotes(viewingLead.id, notesValue)
                    }
                  }}
                  placeholder="Add notes, follow-up actions, due diligence flags…"
                  rows={4}
                  className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                />
                <p className="mt-1 text-[10px] text-muted-foreground/50">Cmd+Enter to save</p>
              </div>

              {/* Pipedrive link */}
              {viewingLead.pipedrive_deal_id && (
                <a
                  href={`https://app.pipedrive.com/deal/${viewingLead.pipedrive_deal_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4" />
                  View in Pipedrive
                </a>
              )}
            </div>

            {/* Drawer footer */}
            <div className="border-t border-border px-6 py-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                disabled={deletingId === viewingLead.id}
                onClick={() => deleteLead(viewingLead.id)}
              >
                <Trash2 className="h-4 w-4" />
                {deletingId === viewingLead.id ? "Deleting…" : "Delete"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/30"
                onClick={() => setArchivingLead(viewingLead)}
              >
                <Archive className="h-4 w-4" />
                Archive
              </Button>
              <Button
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                onClick={() => {
                  const deal = leadToDeal(viewingLead)
                  // Optimistically mark as won in local state
                  setLeads((prev) => prev.map((l) => l.id === viewingLead.id ? { ...l, stage: 'won' } : l))
                  setViewingLead(null)
                  setWonDeal(deal)
                  refreshStats()
                }}
              >
                <Trophy className="h-4 w-4" />
                Mark as Won
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Archived Leads Section */}
      {archivedLeads.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Archived Leads</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {archivedLeads.length}
              </span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showArchived && "rotate-180")} />
          </button>
          {showArchived && (
            <div className="divide-y divide-border">
              {archivedLeads.map((lead) => {
                const reason = ARCHIVE_REASONS.find(r => r.id === lead.archive_reason)
                return (
                  <div key={lead.id} className="flex items-center justify-between px-4 py-3 bg-card hover:bg-secondary/20 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-muted-foreground truncate">{lead.agency_name ?? lead.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground/60">{lead.name}</span>
                        {reason && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/20 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                            {reason.label}
                          </span>
                        )}
                        {lead.archived_at && (
                          <span className="text-[10px] text-muted-foreground/50">
                            {new Date(lead.archived_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => unarchiveLead(lead.id)}
                      className="ml-3 flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                      title="Restore lead"
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                      Restore
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Archive Reason Modal */}
      {archivingLead && (
        <ArchiveModal
          leadName={archivingLead.agency_name ?? archivingLead.name}
          onConfirm={(reason) => archiveLead(archivingLead, reason)}
          onCancel={() => setArchivingLead(null)}
          loading={archiveLoading}
        />
      )}

      {/* Won / CompleteDealModal */}
      {wonDeal && (() => {
        const captured = wonDeal
        return (
          <CompleteDealModal
            deal={captured}
            onClose={() => setWonDeal(null)}
            onSaved={() => {
              // Add to the pipeline as completed if callback exists
              onAddDeal?.({ ...captured, status: "completed" })
              // Also update the lead stage to won
              const leadId = parseInt(captured.id.replace('lead-', ''))
              if (!isNaN(leadId)) {
                updateLeadStage(leadId, 'won')
              }
              setWonDeal(null)
              mutateIntel()
            }}
          />
        )
      })()}
    </div>
  )
}
