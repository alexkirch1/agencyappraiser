"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, TrendingUp, Calculator, ClipboardCheck, DollarSign, RefreshCw, 
  FolderKanban, Trophy, X, ChevronRight, ExternalLink, Trash2, Archive,
  ArrowUpRight, ArrowDownRight, Percent, Target, Clock, Calendar,
  LayoutGrid, List, GripVertical, Phone, Mail, ChevronDown, ArchiveRestore
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

function toolBadge(tool: string | null) {
  if (!tool) return <Badge variant="outline" className="text-[10px]">Unknown</Badge>
  if (tool.includes("full")) return <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px]">Full Val</Badge>
  if (tool.includes("quick")) return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 text-[10px]">Quick Val</Badge>
  if (tool.includes("quiz")) return <Badge className="bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 text-[10px]">Quiz</Badge>
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
  const highlightClass = {
    success: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20',
    warning: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20',
    primary: 'border-primary/30 bg-primary/5',
  }[highlight ?? ''] ?? 'border-border'

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
  const { mutate: mutateIntel } = useMarketIntel()

  const deleteLead = async (id: number) => {
    if (!confirm("Permanently delete this lead and all associated data? This cannot be undone.")) return
    setDeletingId(id)
    try {
      const res = await fetch("/api/admin/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error("Failed to delete")
      setLeads((prev) => prev.filter((l) => l.id !== id))
      setViewingLead(null)
    } catch {
      alert("Failed to delete lead. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  const updateLeadStage = useCallback(async (leadId: number, newStage: string) => {
    // Optimistic update
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage: newStage } : l))
    
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, stage: newStage }),
      })
      if (!res.ok) throw new Error("Failed to update")
    } catch {
      // Revert on error
      fetchLeads()
      alert("Failed to update lead stage.")
    }
  }, [])

  const archiveLead = async (lead: LeadRow, reason: string) => {
    setArchiveLoading(true)
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, archived: true, archive_reason: reason }),
      })
      if (!res.ok) throw new Error("Failed to archive")
      setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, archived: true, archive_reason: reason } : l))
      setArchivingLead(null)
      setViewingLead(null)
    } catch {
      alert("Failed to archive lead. Please try again.")
    } finally {
      setArchiveLoading(false)
    }
  }

  const unarchiveLead = async (id: number) => {
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, archived: false, archive_reason: null }),
      })
      if (!res.ok) throw new Error("Failed to unarchive")
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, archived: false, archive_reason: null } : l))
    } catch {
      alert("Failed to unarchive lead.")
    }
  }

  const fetchLeads = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/leads")
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

  // Calculate conversion rate
  const conversionRate = stats && parseInt(stats.total_leads) > 0 
    ? ((parseInt(stats.won_leads ?? '0') / parseInt(stats.total_leads)) * 100).toFixed(1)
    : '0'

  // Calculate week-over-week trend
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

      {/* Smart Stats Grid */}
      {stats && (
        <div className="space-y-4">
          {/* Primary metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SmartStatCard
              label="Total Pipeline"
              value={fmtCompact(stats.total_pipeline_value)}
              subValue={`${stats.total_leads} leads`}
              icon={DollarSign}
              highlight="primary"
            />
            <SmartStatCard
              label="Won Revenue"
              value={fmtCompact(stats.total_won_value)}
              subValue={`${stats.won_leads ?? 0} closed`}
              icon={Trophy}
              highlight="success"
            />
            <SmartStatCard
              label="Conversion Rate"
              value={`${conversionRate}%`}
              subValue={`${stats.won_leads ?? 0}/${stats.total_leads}`}
              icon={Percent}
              trend={parseFloat(conversionRate) > 10 ? 'up' : parseFloat(conversionRate) > 5 ? 'neutral' : 'down'}
              trendLabel={parseFloat(conversionRate) > 10 ? 'Good' : 'Avg'}
            />
            <SmartStatCard
              label="This Week"
              value={stats.leads_this_week}
              subValue={weekTrend >= 0 ? `+${weekTrend} vs last` : `${weekTrend} vs last`}
              icon={Calendar}
              trend={weekTrend > 0 ? 'up' : weekTrend < 0 ? 'down' : 'neutral'}
              trendLabel={weekTrend > 0 ? `+${weekTrend}` : weekTrend < 0 ? `${weekTrend}` : '0'}
            />
            <SmartStatCard
              label="Avg Deal Size"
              value={fmtCompact(stats.avg_value)}
              subValue={stats.avg_won_value ? `Won: ${fmtCompact(stats.avg_won_value)}` : undefined}
              icon={Target}
            />
            <SmartStatCard
              label="Engaged"
              value={stats.engaged_leads ?? '0'}
              subValue="In progress"
              icon={Clock}
              highlight="warning"
            />
          </div>

          {/* Source breakdown */}
          {sourceStats.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {sourceStats.slice(0, 4).map((source) => {
                const icon = source.source?.includes('full') ? Calculator 
                  : source.source?.includes('quick') ? TrendingUp 
                  : source.source?.includes('quiz') ? ClipboardCheck 
                  : Users
                return (
                  <SmartStatCard
                    key={source.source}
                    label={source.source?.includes('full') ? 'Full Valuations'
                      : source.source?.includes('quick') ? 'Quick Valuations'
                      : source.source?.includes('quiz') ? 'Quiz Leads'
                      : 'Other'}
                    value={source.count}
                    subValue={source.value ? fmtCompact(source.value) : undefined}
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
                      setViewingLead((prev) => prev ? { ...prev, stage: stage.id } : prev)
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
                  { label: "Mid / Est.", value: fmt(viewingLead.estimated_value ?? viewingLead.quick_mid), highlight: true as const },
                  { label: "High", value: fmt(viewingLead.high_offer ?? viewingLead.quick_high) },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className={`rounded-lg border p-3 text-center ${highlight ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30" : "border-border bg-secondary/30"}`}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className={`mt-0.5 text-sm font-bold ${highlight ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>{value}</p>
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
