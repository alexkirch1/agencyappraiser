"use client"

import { useState } from "react"
import useSWR from "swr"
import { Archive, ArchiveRestore, Plus, Trash2, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

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
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" }
}

// Known active carriers from the carrier form that can be archived
const ACTIVE_CARRIERS = [
  { key: "progressive", label: "Progressive" },
  { key: "travelers", label: "Travelers" },
  { key: "hartford", label: "The Hartford" },
  { key: "safeco", label: "Safeco (Liberty Mutual)" },
  { key: "berkshirehathaway", label: "Berkshire Hathaway GUARD" },
  { key: "libertymutual", label: "Liberty Mutual CL" },
]

interface ArchivedCarrier {
  id: number
  carrier_key: string
  carrier_name: string
  reason: string | null
  archived_at: string
}

export function ArchiveTab() {
  const { data, mutate, isLoading } = useSWR<{ carriers: ArchivedCarrier[] }>(
    "/api/admin/archived-carriers",
    fetcher
  )

  const [archiving, setArchiving] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState("")
  const [customName, setCustomName] = useState("")
  const [reason, setReason] = useState("")
  const [showCustom, setShowCustom] = useState(false)

  const archivedKeys = new Set((data?.carriers ?? []).map((c) => c.carrier_key))

  const handleArchive = async () => {
    const key = showCustom ? customName.toLowerCase().replace(/\s+/g, "-") : selectedKey
    const name = showCustom ? customName : ACTIVE_CARRIERS.find((c) => c.key === selectedKey)?.label ?? selectedKey
    if (!key || !name) return

    setArchiving(true)
    try {
      await fetch("/api/admin/archived-carriers", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ carrier_key: key, carrier_name: name, reason }),
      })
      setSelectedKey("")
      setCustomName("")
      setReason("")
      setShowCustom(false)
      mutate()
    } finally {
      setArchiving(false)
    }
  }

  const handleRestore = async (carrier_key: string) => {
    setRestoring(carrier_key)
    try {
      await fetch("/api/admin/archived-carriers", {
        method: "DELETE",
        headers: authHeaders(),
        body: JSON.stringify({ carrier_key }),
      })
      mutate()
    } finally {
      setRestoring(null)
    }
  }

  const availableToArchive = ACTIVE_CARRIERS.filter((c) => !archivedKeys.has(c.key))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Carrier Archive</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Carriers hidden from the carrier report tool. Restore them at any time.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Archive a carrier */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Plus className="h-4 w-4 text-primary" />
            Archive a Carrier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCustom(false)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${!showCustom ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              Active carrier
            </button>
            <button
              onClick={() => setShowCustom(true)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${showCustom ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              Custom name
            </button>
          </div>

          {!showCustom ? (
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a carrier to archive...</option>
              {availableToArchive.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          ) : (
            <Input
              placeholder="Carrier name (e.g. AmTrust)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          )}

          <Input
            placeholder="Reason for archiving (optional — e.g. no report available)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <Button
            onClick={handleArchive}
            disabled={archiving || (!showCustom ? !selectedKey : !customName)}
            size="sm"
            className="gap-2"
          >
            <Archive className="h-3.5 w-3.5" />
            {archiving ? "Archiving..." : "Archive Carrier"}
          </Button>
        </CardContent>
      </Card>

      {/* Archived carriers list */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-muted-foreground" />
              Archived Carriers
            </span>
            <Badge variant="secondary">{data?.carriers.length ?? 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
            </div>
          ) : (data?.carriers ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No carriers archived. Archive a carrier above to hide it from the carrier report.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {(data?.carriers ?? []).map((carrier) => (
                <div key={carrier.id} className="flex items-center justify-between py-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">{carrier.carrier_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Key: <code className="font-mono text-xs">{carrier.carrier_key}</code>
                      {" · "}
                      Archived {new Date(carrier.archived_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {carrier.reason && (
                      <p className="text-xs italic text-muted-foreground">"{carrier.reason}"</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={restoring === carrier.carrier_key}
                    onClick={() => handleRestore(carrier.carrier_key)}
                  >
                    <ArchiveRestore className="h-3 w-3" />
                    {restoring === carrier.carrier_key ? "Restoring..." : "Restore"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
