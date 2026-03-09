"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, TrendingUp, Calculator, ClipboardCheck, DollarSign, RefreshCw, FolderKanban, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  // Full val
  low_offer: string | null
  high_offer: string | null
  core_score: string | null
  calculated_multiple: string | null
  risk_grade: string | null
  revenue_ltm: string | null
  retention_rate: string | null
  // Quick val
  quick_revenue: string | null
  quick_retention: string | null
  book_type: string | null
  growth: string | null
  policy_ratio: string | null
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

interface LeadsTabProps {
  deals?: Deal[]
  onNavigateToPipeline?: () => void
}

export function LeadsTab({ deals = [], onNavigateToPipeline }: LeadsTabProps) {
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Agency</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Tool</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Est. Value</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Range</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Multiple</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Risk</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leads.map((lead) => {
                    const low = lead.low_offer ?? lead.quick_low
                    const high = lead.high_offer ?? lead.quick_high
                    const multi = lead.calculated_multiple ?? lead.suggested_mult
                    const grade = lead.risk_grade ?? lead.quiz_grade
                    const val = lead.estimated_value ?? lead.quick_mid
                    return (
                      <tr key={lead.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{lead.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <a href={`mailto:${lead.email}`} className="hover:text-primary">{lead.email}</a>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{lead.agency_name ?? "—"}</td>
                        <td className="px-4 py-3">{toolBadge(lead.tool_used)}</td>
                        <td className="px-4 py-3 text-right font-mono text-foreground">{fmt(val)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {low && high ? `${fmt(low)} – ${fmt(high)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-foreground">
                          {multi ? `${parseFloat(multi).toFixed(2)}x` : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {grade ? <Badge variant="outline" className="text-[10px]">{grade}</Badge> : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(lead.created_at).toLocaleDateString()}
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
    </div>
  )
}
