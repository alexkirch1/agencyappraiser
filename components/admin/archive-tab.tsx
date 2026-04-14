"use client"

import { useState } from "react"
import useSWR from "swr"
import { Archive, ArchiveRestore, Plus, ChevronDown, ChevronRight, Pencil, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ── Types ─────────────────────────────────────────────────────────────────────
interface ArchiveItem {
  id: number
  section: string
  name: string
  identifier: string | null
  reason: string | null
  archived_by: string | null
  archived_at: string
  notes: string | null
}

// ── Section definitions ───────────────────────────────────────────────────────
const SECTIONS = [
  { key: "carriers", label: "Carriers",  description: "Carrier reports & integrations" },
  { key: "features", label: "Features",  description: "Tool features or UI sections" },
  { key: "tools",    label: "Tools",     description: "Standalone tools or calculators" },
  { key: "leads",    label: "Leads",     description: "Lead sources or segments" },
  { key: "pages",    label: "Pages",     description: "Entire pages or routes" },
  { key: "other",    label: "Other",     description: "Anything else" },
]

const SECTION_BADGE: Record<string, string> = {
  carriers: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400",
  features: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-400",
  tools:    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
  leads:    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
  pages:    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400",
  other:    "border-border bg-secondary text-muted-foreground",
}

// ── Auth helper ───────────────────────────────────────────────────────────────
function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_session_token") : null
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" }
}

const fetcher = (url: string) =>
  fetch(url, { headers: authHeaders() }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })

// ── Main component ────────────────────────────────────────────────────────────
export function ArchiveTab() {
  const { data, mutate, isLoading } = useSWR<{ items: ArchiveItem[] }>(
    "/api/admin/site-archive",
    fetcher,
    { refreshInterval: 30000 }
  )

  // Add form
  const [showForm, setShowForm]           = useState(false)
  const [newSection, setNewSection]       = useState("")
  const [newName, setNewName]             = useState("")
  const [newIdentifier, setNewIdentifier] = useState("")
  const [newReason, setNewReason]         = useState("")
  const [newNotes, setNewNotes]           = useState("")
  const [adding, setAdding]               = useState(false)

  // UI state
  const [collapsed, setCollapsed]   = useState<Record<string, boolean>>({})
  const [restoring, setRestoring]   = useState<number | null>(null)
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({})
  const [savingNotes, setSavingNotes]   = useState<number | null>(null)

  const items = data?.items ?? []

  // Group by section, preserving SECTIONS order
  const grouped = SECTIONS.reduce<Record<string, ArchiveItem[]>>((acc, s) => {
    acc[s.key] = items.filter((i) => i.section === s.key)
    return acc
  }, {})
  // Anything with an unknown section goes into "other"
  const unknownItems = items.filter((i) => !SECTIONS.some((s) => s.key === i.section))
  if (unknownItems.length) grouped["other"] = [...(grouped["other"] ?? []), ...unknownItems]

  const activeSections = SECTIONS.filter((s) => (grouped[s.key] ?? []).length > 0)
  const totalCount = items.length

  const handleAdd = async () => {
    if (!newSection || !newName.trim()) return
    setAdding(true)
    try {
      await fetch("/api/admin/site-archive", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          section: newSection,
          name: newName.trim(),
          identifier: newIdentifier.trim() || null,
          reason: newReason.trim() || null,
          notes: newNotes.trim() || null,
        }),
      })
      setNewName("")
      setNewIdentifier("")
      setNewReason("")
      setNewNotes("")
      setShowForm(false)
      mutate()
    } finally {
      setAdding(false)
    }
  }

  const handleRestore = async (id: number) => {
    setRestoring(id)
    try {
      await fetch("/api/admin/site-archive", {
        method: "DELETE",
        headers: authHeaders(),
        body: JSON.stringify({ id }),
      })
      mutate()
    } finally {
      setRestoring(null)
    }
  }

  const handleSaveNotes = async (id: number) => {
    setSavingNotes(id)
    try {
      await fetch("/api/admin/site-archive", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ id, notes: editingNotes[id] ?? null }),
      })
      setEditingNotes((p) => { const n = { ...p }; delete n[id]; return n })
      mutate()
    } finally {
      setSavingNotes(null)
    }
  }

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Site Archive</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isLoading
              ? "Loading..."
              : totalCount === 0
              ? "Nothing archived yet."
              : `${totalCount} item${totalCount === 1 ? "" : "s"} archived across ${activeSections.length} section${activeSections.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <Button
          size="sm"
          variant={showForm ? "secondary" : "default"}
          className="gap-1.5"
          onClick={() => setShowForm((p) => !p)}
        >
          <Plus className="h-4 w-4" />
          Archive Item
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Archive a New Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Section *</label>
                <Select value={newSection} onValueChange={setNewSection}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Choose section..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        <span className="font-medium">{s.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{s.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Name *</label>
                <Input
                  className="h-9 text-sm"
                  placeholder="e.g. American Modern"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Identifier <span className="font-normal">(optional)</span></label>
                <Input
                  className="h-9 text-sm"
                  placeholder="e.g. american-modern"
                  value={newIdentifier}
                  onChange={(e) => setNewIdentifier(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Reason <span className="font-normal">(optional)</span></label>
                <Input
                  className="h-9 text-sm"
                  placeholder="e.g. No production report available"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Notes <span className="font-normal">(optional)</span></label>
              <Textarea
                className="min-h-[60px] resize-none text-sm"
                placeholder="Any follow-up context or tasks..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!newSection || !newName.trim() || adding}
                onClick={handleAdd}
              >
                {adding ? "Archiving..." : "Archive Item"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      )}

      {/* Sections */}
      {!isLoading && activeSections.map((section) => {
        const sectionItems = grouped[section.key] ?? []
        const isCollapsed = collapsed[section.key]
        return (
          <Card key={section.key} className="border-border">
            <CardHeader
              className="cursor-pointer select-none pb-3"
              onClick={() => setCollapsed((p) => ({ ...p, [section.key]: !p[section.key] }))}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCollapsed
                    ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  <CardTitle className="text-sm font-semibold text-foreground">{section.label}</CardTitle>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {sectionItems.length}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{section.description}</span>
              </div>
            </CardHeader>

            {!isCollapsed && (
              <CardContent className="pt-0">
                <div className="divide-y divide-border">
                  {sectionItems.map((item) => {
                    const isEditingNotes = item.id in editingNotes
                    return (
                      <div key={item.id} className="space-y-2 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">{item.name}</span>
                              <Badge
                                variant="outline"
                                className={`px-1.5 py-0 text-[10px] ${SECTION_BADGE[item.section] ?? SECTION_BADGE.other}`}
                              >
                                {item.section}
                              </Badge>
                              {item.identifier && (
                                <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                  {item.identifier}
                                </code>
                              )}
                            </div>
                            {item.reason && (
                              <p className="text-xs italic text-muted-foreground">&ldquo;{item.reason}&rdquo;</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Archived {new Date(item.archived_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              {item.archived_by && ` · by ${item.archived_by}`}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="Edit notes"
                              onClick={() =>
                                setEditingNotes((p) =>
                                  item.id in p
                                    ? (() => { const n = { ...p }; delete n[item.id]; return n })()
                                    : { ...p, [item.id]: item.notes ?? "" }
                                )
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs"
                              disabled={restoring === item.id}
                              onClick={() => handleRestore(item.id)}
                            >
                              <ArchiveRestore className="h-3 w-3" />
                              {restoring === item.id ? "Restoring..." : "Restore"}
                            </Button>
                          </div>
                        </div>

                        {/* Inline notes editor */}
                        {isEditingNotes ? (
                          <div className="flex items-end gap-2">
                            <Textarea
                              className="min-h-[60px] flex-1 resize-none text-xs"
                              placeholder="Add notes about why this was archived or what needs to happen to restore it..."
                              value={editingNotes[item.id]}
                              onChange={(e) =>
                                setEditingNotes((p) => ({ ...p, [item.id]: e.target.value }))
                              }
                            />
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={savingNotes === item.id}
                                onClick={() => handleSaveNotes(item.id)}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() =>
                                  setEditingNotes((p) => { const n = { ...p }; delete n[item.id]; return n })
                                }
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : item.notes ? (
                          <p className="rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                            {item.notes}
                          </p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}

      {/* Empty state */}
      {!isLoading && totalCount === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Archive className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">Nothing archived yet</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            Use the archive to hide carriers, features, tools, or pages without permanently deleting them. Restore anything at any time.
          </p>
          <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Archive your first item
          </Button>
        </div>
      )}
    </div>
  )
}
