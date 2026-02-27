"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import type { Deal } from "./admin-dashboard"

interface OverviewTabProps {
  deals: Deal[]
  onStatusChange: (id: string, status: Deal["status"]) => void
  onDelete: (id: string) => void
  onLoadDeal: (id: string) => void
}

function getNextStatus(current: Deal["status"]): Deal["status"] {
  if (current === "active") return "completed"
  if (current === "completed") return "declined"
  return "active"
}

function StatusBadge({
  status,
  onClick,
}: {
  status: Deal["status"]
  onClick: () => void
}) {
  const config = {
    active: {
      className: "bg-secondary text-muted-foreground",
      label: "ACTIVE",
    },
    completed: {
      className: "bg-success/15 text-success border border-success/30",
      label: "COMPLETED",
    },
    declined: {
      className: "bg-destructive/15 text-destructive border border-destructive/30",
      label: "DECLINED",
    },
  }

  const c = config[status]
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-bold uppercase transition-colors ${c.className}`}
    >
      {c.label}
    </button>
  )
}

export function OverviewTab({ deals, onStatusChange, onDelete, onLoadDeal }: OverviewTabProps) {
  const activePipeline = deals
    .filter((d) => d.status === "active")
    .reduce((sum, d) => sum + d.valuation, 0)

  return (
    <div>
      {/* Stat Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border">
          <CardContent className="p-6">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Saved Valuations
            </p>
            <p className="text-3xl font-extrabold text-foreground">{deals.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-6">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Active Pipeline
            </p>
            <p className="text-3xl font-extrabold text-success">
              ${activePipeline.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-6">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Completed Deals
            </p>
            <p className="text-3xl font-extrabold text-foreground">
              {deals.filter((d) => d.status === "completed").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deal History */}
      <Card className="overflow-hidden border-border">
        <div className="border-b border-border bg-secondary/50 px-6 py-4">
          <h3 className="font-semibold text-foreground">Saved Deal History</h3>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          {deals.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No saved valuations yet. Create one from the Horizon Pipeline tab.
            </div>
          ) : (
            deals.map((deal) => {
              const daysOld = Math.floor(
                (Date.now() - new Date(deal.date_saved).getTime()) / 86400000
              )
              const displayStatus =
                deal.status === "active" && daysOld > 30
                  ? ("active" as const)
                  : deal.status

              return (
                <div
                  key={deal.id}
                  className="flex items-center justify-between border-b border-border px-6 py-4 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onLoadDeal(deal.id)}
                      className="text-left text-base font-bold text-foreground hover:text-primary transition-colors"
                    >
                      {deal.deal_name}
                    </button>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Saved:{" "}
                      {new Date(deal.date_saved).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      | Type:{" "}
                      <span className="font-bold uppercase">{deal.deal_type}</span>
                      {daysOld > 30 && deal.status === "active" && (
                        <span className="ml-2 text-warning font-bold">INACTIVE ({daysOld}d)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge
                      status={displayStatus}
                      onClick={() =>
                        onStatusChange(deal.id, getNextStatus(deal.status))
                      }
                    />
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-success">
                        ${deal.valuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Base: ${deal.premium_base.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this deal?")) {
                          onDelete(deal.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>
    </div>
  )
}
