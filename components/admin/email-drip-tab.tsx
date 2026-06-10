"use client"

import useSWR, { mutate as globalMutate } from "swr"
import { Mail, Clock, CheckCircle2, XCircle, Ban, RefreshCw, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const ADMIN_TOKEN_KEY = "admin_session_token"

function getHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const fetcher = (url: string) =>
  fetch(url, { headers: getHeaders() }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })

const SEQ_LABELS: Record<number, { label: string; description: string }> = {
  1: { label: "Email 1", description: "Confirmation + valuation summary" },
  2: { label: "Email 2", description: "Value drivers breakdown (Day 2)" },
  3: { label: "Email 3", description: "Soft CTA — book a call (Day 5)" },
}

const STATUS_CONFIG = {
  pending:      { label: "Pending",      color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",   icon: Clock },
  sent:         { label: "Sent",         color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", icon: CheckCircle2 },
  failed:       { label: "Failed",       color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",           icon: XCircle },
  unsubscribed: { label: "Unsubscribed", color: "bg-secondary text-muted-foreground",                                       icon: Ban },
}

interface DripRow {
  id: number
  lead_id: number
  sequence: number
  status: keyof typeof STATUS_CONFIG
  send_after: string
  sent_at: string | null
  created_at: string
  lead_name: string
  lead_email: string
  tool_used: string
  estimated_value: string | null
}

interface Summary {
  pending: number
  sent: number
  failed: number
  unsubscribed: number
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export function EmailDripTab() {
  const { data, isLoading, error, mutate } = useSWR<{ rows: DripRow[]; summary: Summary }>(
    "/api/admin/email-drip",
    fetcher,
    { refreshInterval: 30000 }
  )

  const rows: DripRow[] = data?.rows ?? []
  const summary: Summary = data?.summary ?? { pending: 0, sent: 0, failed: 0, unsubscribed: 0 }

  const handleAction = async (id: number, action: "retry" | "cancel") => {
    await fetch("/api/admin/email-drip", {
      method: "POST",
      headers: { ...getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    })
    mutate()
  }

  // Group rows by lead
  const byLead = rows.reduce<Record<number, DripRow[]>>((acc, row) => {
    if (!acc[row.lead_id]) acc[row.lead_id] = []
    acc[row.lead_id].push(row)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Email Drip Status</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track the 3-email follow-up sequence for every lead. Retrigger failed sends or cancel pending emails.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["sent", "pending", "failed", "unsubscribed"] as const).map((key) => {
          const cfg = STATUS_CONFIG[key]
          const Icon = cfg.icon
          return (
            <Card key={key} className="border-border bg-card">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground capitalize">{cfg.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{summary[key]}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Loading / error */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading email data...
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive py-4">Failed to load email drip data. Check your connection.</p>
      )}

      {/* Lead groups */}
      {!isLoading && Object.entries(byLead).length === 0 && (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Mail className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No email drip rows yet. They appear after leads submit.</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {Object.entries(byLead).map(([leadId, leadRows]) => {
          const first = leadRows[0]
          const sorted = [...leadRows].sort((a, b) => a.sequence - b.sequence)
          return (
            <Card key={leadId} className="border-border bg-card overflow-hidden">
              {/* Lead header */}
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 bg-secondary/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {first.lead_name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{first.lead_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{first.lead_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {first.estimated_value && (
                    <span className="text-xs font-mono text-muted-foreground">
                      ${parseFloat(first.estimated_value).toLocaleString()}
                    </span>
                  )}
                  <Badge variant="outline" className="text-[10px]">{first.tool_used ?? "—"}</Badge>
                </div>
              </div>

              {/* Sequence rows */}
              <div className="divide-y divide-border">
                {sorted.map((row) => {
                  const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.pending
                  const Icon = cfg.icon
                  const seqInfo = SEQ_LABELS[row.sequence]
                  const isFuture = row.status === "pending" && new Date(row.send_after) > new Date()
                  return (
                    <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                      {/* Sequence number */}
                      <div className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        row.status === "sent"   ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                        row.status === "failed" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" :
                        "bg-secondary text-muted-foreground"
                      )}>
                        {row.sequence}
                      </div>

                      {/* Label + timing */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{seqInfo?.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{seqInfo?.description}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {row.status === "sent" && row.sent_at
                            ? `Sent ${fmtDate(row.sent_at)}`
                            : isFuture
                              ? `Scheduled ${fmtDate(row.send_after)}`
                              : `Due ${fmtDate(row.send_after)}`}
                        </p>
                      </div>

                      {/* Status badge */}
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium flex items-center gap-1", cfg.color)}>
                        <Icon className="h-2.5 w-2.5" />
                        {cfg.label}
                      </span>

                      {/* Actions */}
                      {row.status === "failed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 h-7 text-xs gap-1"
                          onClick={() => handleAction(row.id, "retry")}
                        >
                          <RefreshCw className="h-3 w-3" /> Retry
                        </Button>
                      )}
                      {row.status === "pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 h-7 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => handleAction(row.id, "cancel")}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
