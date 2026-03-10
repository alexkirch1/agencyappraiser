"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, TrendingUp, Calculator, ClipboardCheck, DollarSign, RefreshCw, FolderKanban, Trophy, X, ChevronRight, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CompleteDealModal } from "@/components/admin/complete-deal-modal"
import { useMarketIntel } from "@/lib/use-market-intel"
import type { Deal } from "@/components/admin/admin-dashboard"

interface LeadRow {
  id: number
  name: string
  email: string
  phone: string | null
  agency_name: string | null
  tool_used: string | null
  estimated_value: string | null
  pipedrive_deal_id: number | null
  created_at: string
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
}

interface Stats {
  total_leads: string
  full_valuations: string
  quick_valuations: string
  quiz_submissions: string
  avg_value: string | null
}

function fmt(n: string | null | undefined, prefix = "$") {
  if (!n) return "—"
  const num = parseFloat(n)
  if (isNaN(num)) return "—"
  return prefix + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(num)
}

function toolBadge(tool: string | null) {
  if (!tool) return <Badge variant="outline" className="text-[10px]">Unknown</Badge>
  if (tool.includes("full")) return <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px]">Full Val</Badge>
  if (tool.includes("quick")) return <Badge className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border border-[hsl(var(--success))]/20 text-[10px]">Quick Val</Badge>
  if (tool.includes("quiz")) return <Badge className="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border border-[hsl(var(--warning))]/20 text-[10px]">Quiz</Badge>
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

interface LeadsTabProps {
  deals?: Deal[]
  onNavigateToPipeline?: () => void
  onAddDeal?: (deal: Deal) => void
  onUpdateDeal?: (id: string, updates: Partial<Deal>) => void
}

export function LeadsTab({ deals = [], onNavigateToPipeline, onAddDeal, onUpdateDeal }: LeadsTabProps) {
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewingLead, setViewingLead] = useState<LeadRow | null>(null)
  const [wonDeal, setWonDeal] = useState<Deal | null>(null)
  const { mutate: mutateIntel } = useMarketIntel()

  const fetchLeads = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/leads")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setLeads(data.leads ?? [])
      setStats(data.stats ?? null)
    } catch {
      setError("Could not load leads from database.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLeads() }, [])

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
                <Trophy className="mb-0.5 mr-1 inline h-4 w-4 text-warning" />
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

      {/* Summary stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {[
            { label: "Total Leads", value: stats.total_leads, icon: Users },
            { label: "Full Valuations", value: stats.full_valuations, icon: Calculator },
            { label: "Quick Valuations", value: stats.quick_valuations, icon: TrendingUp },
            { label: "Quiz Submissions", value: stats.quiz_submissions, icon: ClipboardCheck },
            { label: "Avg. Est. Value", value: fmt(stats.avg_value), icon: DollarSign },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-border bg-card">
              <CardContent className="flex flex-col gap-1 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Leads table */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">All Leads</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchLeads} className="gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
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

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Tool badge + date + state */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {toolBadge(viewingLead.tool_used)}
                  {viewingLead.primary_state && (
                    <Badge variant="outline" className="text-[10px]">{viewingLead.primary_state}</Badge>
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

              {/* Valuation offer band — top priority */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Low", value: fmt(viewingLead.low_offer ?? viewingLead.quick_low) },
                  { label: "Mid / Est.", value: fmt(viewingLead.estimated_value ?? viewingLead.quick_mid), highlight: true },
                  { label: "High", value: fmt(viewingLead.high_offer ?? viewingLead.quick_high) },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className={`rounded-lg border p-3 text-center ${highlight ? "border-success/30 bg-success/5" : "border-border bg-secondary/30"}`}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className={`mt-0.5 text-sm font-bold ${highlight ? "text-success" : "text-foreground"}`}>{value}</p>
                  </div>
                ))}
              </div>

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
              {viewingLead.quiz_grade && (
                <Section label="Quiz Results">
                  <Row label="Grade" value={viewingLead.quiz_grade} />
                  <Row label="Score" value={viewingLead.total_score != null && viewingLead.max_score != null ? `${viewingLead.total_score} / ${viewingLead.max_score}` : null} />
                  <Row label="Percentage" value={viewingLead.quiz_pct ? `${fmtStat(viewingLead.quiz_pct)}%` : null} />
                </Section>
              )}

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
            <div className="border-t border-border px-6 py-4 flex gap-3">
              <Button
                className="flex-1 gap-2 bg-success hover:bg-success/90 text-white border-0"
                onClick={() => {
                  const deal = leadToDeal(viewingLead)
                  setViewingLead(null)
                  setWonDeal(deal)
                }}
              >
                <Trophy className="h-4 w-4" />
                Mark as Won
              </Button>
            </div>
          </div>
        </>
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
              setWonDeal(null)
              mutateIntel()
            }}
          />
        )
      })()}
    </div>
  )
}
