"use client"

import { useState } from "react"
import useSWR from "swr"
import { MessageSquare, CheckCircle2, Clock, Trash2, RefreshCw, Send, ChevronDown, ChevronUp, Tag } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const ADMIN_TOKEN_KEY = "admin_session_token"

const fetcher = (url: string) => {
  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null
  return fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })
}

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" }
}

type FeedbackStatus = "new" | "in_review" | "resolved"

interface FeedbackItem {
  id: number
  message: string
  category: string | null
  admin_response: string | null
  responded_at: string | null
  created_at: string
  status: FeedbackStatus
}

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; variant: "default" | "secondary" | "outline"; icon: React.ElementType }> = {
  new:       { label: "New",       variant: "default",   icon: Clock },
  in_review: { label: "In Review", variant: "secondary", icon: Clock },
  resolved:  { label: "Resolved",  variant: "outline",   icon: CheckCircle2 },
}

const CATEGORY_COLORS: Record<string, string> = {
  bug:        "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  feature:    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  question:   "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  general:    "bg-secondary text-muted-foreground",
}

function FeedbackCard({ item, onUpdate, onDelete }: {
  item: FeedbackItem
  onUpdate: (id: number, patch: Partial<FeedbackItem>) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(item.status === "new")
  const [response, setResponse] = useState(item.admin_response ?? "")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.new
  const StatusIcon = cfg.icon
  const categoryClass = CATEGORY_COLORS[item.category ?? "general"] ?? CATEGORY_COLORS.general

  const handleSend = async () => {
    if (!response.trim()) return
    setSaving(true)
    try {
      await onUpdate(item.id, { admin_response: response.trim(), status: "resolved" })
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (status: FeedbackStatus) => {
    await onUpdate(item.id, { status })
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(item.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className={cn("border-border transition-all", item.status === "new" && "border-primary/30 bg-primary/[0.02]")}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={cfg.variant} className="gap-1 text-xs">
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </Badge>
            {item.category && (
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", categoryClass)}>
                {item.category}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(item.created_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={deleting}
              onClick={handleDelete}
              aria-label="Delete feedback"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Message */}
        <p className="text-sm text-foreground">{item.message}</p>

        {expanded && (
          <>
            {/* Existing response */}
            {item.admin_response && (
              <div className="rounded-md border border-border bg-secondary/40 p-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Your response</p>
                <p className="text-sm text-foreground">{item.admin_response}</p>
                {item.responded_at && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sent {new Date(item.responded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
            )}

            {/* Response box */}
            <div className="space-y-2">
              <Textarea
                placeholder={item.admin_response ? "Update your response..." : "Write a response (internal note or reply)..."}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Status toggles */}
                <div className="flex gap-1">
                  {(["new", "in_review", "resolved"] as FeedbackStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={cn(
                        "rounded px-2 py-1 text-xs font-medium transition-colors",
                        item.status === s
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>

                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={saving || !response.trim()}
                  onClick={handleSend}
                >
                  <Send className="h-3.5 w-3.5" />
                  {saving ? "Saving..." : item.admin_response ? "Update Response" : "Save Response"}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function FeedbackTab() {
  const { data, mutate, isLoading } = useSWR<{ feedback: FeedbackItem[] }>(
    "/api/admin/feedback",
    fetcher
  )
  const [filter, setFilter] = useState<"all" | FeedbackStatus>("all")

  const allFeedback = data?.feedback ?? []
  const counts = {
    all:       allFeedback.length,
    new:       allFeedback.filter((f) => f.status === "new").length,
    in_review: allFeedback.filter((f) => f.status === "in_review").length,
    resolved:  allFeedback.filter((f) => f.status === "resolved").length,
  }
  const visible = filter === "all" ? allFeedback : allFeedback.filter((f) => f.status === filter)

  const handleUpdate = async (id: number, patch: Partial<FeedbackItem>) => {
    await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ id, ...patch }),
    })
    mutate()
  }

  const handleDelete = async (id: number) => {
    await fetch("/api/admin/feedback", {
      method: "DELETE",
      headers: authHeaders(),
      body: JSON.stringify({ id }),
    })
    mutate()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Feedback</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            All user feedback submissions. Respond, track status, and keep a record.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([["all", "All"], ["new", "New"], ["in_review", "In Review"], ["resolved", "Resolved"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              filter === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            )}
          >
            <p className="text-xl font-bold text-foreground">{counts[key]}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </button>
        ))}
      </div>

      {/* Feedback list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {filter === "all" ? "No feedback received yet." : `No ${filter.replace("_", " ")} feedback.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <FeedbackCard key={item.id} item={item} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
