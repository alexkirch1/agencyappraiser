"use client"

import { useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Briefcase,
  X,
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  FolderOpen,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import type { Deal } from "@/components/admin/admin-dashboard"
import { cn } from "@/lib/utils"

interface DealDocument {
  id: string
  name: string
  size: number
  type: string
  dataUrl: string
  uploadedAt: string
}

interface DealDetails extends Record<string, unknown> {
  notes?: string
  documents?: DealDocument[]
  leadId?: string | number
}

interface DealsTabProps {
  deals: Deal[]
  onUpdateDeal: (id: string, updates: Partial<Deal>) => void
  onDeleteDeal: (id: string) => void
}

const STATUS_CONFIG = {
  active: {
    label: "Active",
    color: "bg-primary/10 text-primary border-primary/20",
    icon: TrendingUp,
  },
  "under-contract": {
    label: "Under Contract",
    color: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20",
    icon: Clock,
  },
  completed: {
    label: "Closed",
    color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20",
    icon: CheckCircle2,
  },
  declined: {
    label: "Declined",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    icon: XCircle,
  },
} as const

type DealStatus = keyof typeof STATUS_CONFIG

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

function fmtBytes(bytes: number) {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`
  return `${bytes} B`
}

function getDealDetails(deal: Deal): DealDetails {
  return (deal.details ?? {}) as DealDetails
}

export function DealsTab({ deals, onUpdateDeal, onDeleteDeal }: DealsTabProps) {
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [notes, setNotes] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dealFiles = deals.filter((d) => d.id.startsWith("deal-file-") || d.id.startsWith("lead-"))

  const openDeal = (deal: Deal) => {
    setSelectedDeal(deal)
    setNotes(getDealDetails(deal).notes ?? "")
  }

  const closeDeal = () => {
    setSelectedDeal(null)
    setNotes("")
  }

  const saveNotes = () => {
    if (!selectedDeal) return
    const details = getDealDetails(selectedDeal)
    onUpdateDeal(selectedDeal.id, {
      details: { ...details, notes },
    })
    setSelectedDeal((prev) => prev ? { ...prev, details: { ...getDealDetails(prev), notes } } : null)
  }

  const setStatus = (status: DealStatus) => {
    if (!selectedDeal) return
    onUpdateDeal(selectedDeal.id, { status })
    setSelectedDeal((prev) => prev ? { ...prev, status } : null)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !selectedDeal) return
    setUploading(true)

    const readers = Array.from(files).map((file) => {
      return new Promise<DealDocument>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          resolve({
            id: `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: reader.result as string,
            uploadedAt: new Date().toISOString(),
          })
        }
        reader.readAsDataURL(file)
      })
    })

    Promise.all(readers).then((newDocs) => {
      const details = getDealDetails(selectedDeal)
      const existing = details.documents ?? []
      const merged = [...existing, ...newDocs]
      onUpdateDeal(selectedDeal.id, {
        details: { ...details, documents: merged },
      })
      setSelectedDeal((prev) =>
        prev ? { ...prev, details: { ...getDealDetails(prev), documents: merged } } : null
      )
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    })
  }

  const deleteDocument = (docId: string) => {
    if (!selectedDeal) return
    const details = getDealDetails(selectedDeal)
    const docs = (details.documents ?? []).filter((d: DealDocument) => d.id !== docId)
    onUpdateDeal(selectedDeal.id, { details: { ...details, documents: docs } })
    setSelectedDeal((prev) =>
      prev ? { ...prev, details: { ...getDealDetails(prev), documents: docs } } : null
    )
  }

  const currentDocs = selectedDeal ? (getDealDetails(selectedDeal).documents ?? []) as DealDocument[] : []
  const activeDeal = selectedDeal
    ? deals.find((d) => d.id === selectedDeal.id) ?? selectedDeal
    : null

  return (
    <div className="flex flex-col gap-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Files", value: String(deals.length), icon: Briefcase },
          { label: "Active", value: String(deals.filter((d) => d.status === "active").length), icon: TrendingUp },
          { label: "Closed", value: String(deals.filter((d) => d.status === "completed").length), icon: CheckCircle2 },
          {
            label: "Pipeline Value",
            value: fmtCurrency(deals.filter((d) => d.status === "active").reduce((s, d) => s + d.valuation, 0)),
            icon: DollarSign,
          },
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

      {/* Deal file grid */}
      {deals.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <FolderOpen className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No deal files yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Go to the Leads tab, open a lead, and click &quot;Create Deal File&quot; to start tracking a deal here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => {
            const details = getDealDetails(deal)
            const docCount = (details.documents as DealDocument[] | undefined)?.length ?? 0
            const statusCfg = STATUS_CONFIG[deal.status as DealStatus] ?? STATUS_CONFIG.active
            const StatusIcon = statusCfg.icon
            return (
              <button
                key={deal.id}
                onClick={() => openDeal(deal)}
                className="group text-left w-full rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] shrink-0", statusCfg.color)}
                  >
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {statusCfg.label}
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                  {deal.deal_name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {deal.deal_type === "full" ? "Full Agency" : "Book Purchase"} &bull;{" "}
                  {new Date(deal.date_saved).toLocaleDateString()}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-foreground">
                    {fmtCurrency(deal.valuation)}
                  </span>
                  {docCount > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      {docCount} doc{docCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {details.notes && (
                  <p className="mt-2 text-[11px] text-muted-foreground italic line-clamp-2 border-t border-border pt-2">
                    {details.notes as string}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Deal Detail Drawer */}
      {activeDeal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={closeDeal} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-card shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 shrink-0 text-primary" />
                  <h3 className="truncate text-base font-semibold text-foreground">
                    {activeDeal.deal_name}
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {activeDeal.deal_type === "full" ? "Full Agency" : "Book Purchase"} &bull;{" "}
                  {new Date(activeDeal.date_saved).toLocaleDateString()} &bull;{" "}
                  <span className="font-mono font-semibold text-foreground">{fmtCurrency(activeDeal.valuation)}</span>
                </p>
              </div>
              <button
                onClick={closeDeal}
                className="ml-4 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Status */}
              <div>
                <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Deal Status
                </Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(STATUS_CONFIG) as [DealStatus, typeof STATUS_CONFIG[DealStatus]][]).map(([key, cfg]) => {
                    const Icon = cfg.icon
                    return (
                      <button
                        key={key}
                        onClick={() => setStatus(key)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                          activeDeal.status === key
                            ? cfg.color + " ring-1 ring-inset"
                            : "border-border text-muted-foreground hover:border-muted-foreground/40"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Deal Info */}
              <div className="rounded-lg border border-border bg-secondary/20 divide-y divide-border">
                {[
                  { label: "Valuation", value: fmtCurrency(activeDeal.valuation) },
                  { label: "Revenue Base", value: activeDeal.premium_base ? fmtCurrency(activeDeal.premium_base) : "—" },
                  {
                    label: "Risk Grade",
                    value: (getDealDetails(activeDeal).riskGrade as string) ?? (getDealDetails(activeDeal).multiple ? `${(getDealDetails(activeDeal).multiple as number).toFixed(2)}x` : null) ?? "—",
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="deal-notes" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </Label>
                <Textarea
                  id="deal-notes"
                  placeholder="Add notes about this deal — due diligence findings, seller conversations, timeline updates..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 gap-1.5 text-xs"
                  onClick={saveNotes}
                >
                  Save Notes
                </Button>
              </div>

              {/* Documents */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Documents ({currentDocs.length})
                  </Label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs h-7"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-3 w-3" />
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.txt"
                    onChange={handleFileUpload}
                  />
                </div>

                {currentDocs.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-center cursor-pointer hover:border-muted-foreground/40 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText className="h-6 w-6 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">
                      Click to upload PDFs, spreadsheets, or any file
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {currentDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 rounded-md border border-border bg-secondary/30 px-3 py-2.5"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">{doc.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {fmtBytes(doc.size)} &bull; {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={doc.dataUrl}
                            download={doc.name}
                            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Download"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            onClick={() => deleteDocument(doc.id)}
                            className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                            aria-label="Delete document"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={() => {
                  if (confirm(`Delete deal file for "${activeDeal.deal_name}"?`)) {
                    onDeleteDeal(activeDeal.id)
                    closeDeal()
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete File
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
