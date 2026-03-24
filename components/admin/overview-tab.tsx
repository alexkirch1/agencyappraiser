"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Trash2, TrendingUp, TrendingDown, DollarSign, 
  Target, Clock, CheckCircle2, XCircle, BarChart3, Percent
} from "lucide-react"
import type { Deal } from "./admin-dashboard"
import { cn } from "@/lib/utils"

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
      className: "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
      label: "COMPLETED",
    },
    declined: {
      className: "bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
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

// Smart stat card component
function SmartStat({ 
  label, 
  value, 
  subValue,
  icon: Icon, 
  trend,
  trendValue,
  highlight,
  size = 'default'
}: { 
  label: string
  value: string | number
  subValue?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  highlight?: 'success' | 'warning' | 'primary' | 'destructive'
  size?: 'default' | 'large'
}) {
  const highlightClass = {
    success: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20',
    warning: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20',
    primary: 'border-primary/30 bg-primary/5',
    destructive: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20',
  }[highlight ?? ''] ?? 'border-border'

  return (
    <Card className={cn("transition-all hover:shadow-md", highlightClass)}>
      <CardContent className={size === 'large' ? 'p-6' : 'p-4'}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-0.5 text-[10px] font-medium rounded-full px-1.5 py-0.5",
              trend === 'up' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
              trend === 'down' && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
              trend === 'neutral' && "bg-muted text-muted-foreground"
            )}>
              {trend === 'up' && <TrendingUp className="h-3 w-3" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3" />}
              {trendValue}
            </div>
          )}
        </div>
        <p className={cn(
          "mt-2 font-extrabold",
          size === 'large' ? 'text-3xl' : 'text-2xl',
          highlight === 'success' && "text-emerald-600 dark:text-emerald-400",
          highlight === 'warning' && "text-amber-600 dark:text-amber-400",
          highlight === 'primary' && "text-primary",
          highlight === 'destructive' && "text-red-600 dark:text-red-400",
          !highlight && "text-foreground"
        )}>{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
        )}
      </CardContent>
    </Card>
  )
}

// Mini progress bar
function ProgressBar({ value, max, color = 'primary' }: { value: number, max: number, color?: 'primary' | 'success' | 'warning' | 'destructive' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const colorClass = {
    primary: 'bg-primary',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    destructive: 'bg-red-500',
  }[color]

  return (
    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
      <div 
        className={cn("h-full transition-all rounded-full", colorClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function OverviewTab({ deals, onStatusChange, onDelete, onLoadDeal }: OverviewTabProps) {
  const activePipeline = deals
    .filter((d) => d.status === "active")
    .reduce((sum, d) => sum + d.valuation, 0)

  const completedDeals = deals.filter((d) => d.status === "completed")
  const declinedDeals = deals.filter((d) => d.status === "declined")
  const activeDeals = deals.filter((d) => d.status === "active")

  const completedValue = completedDeals.reduce((sum, d) => sum + d.valuation, 0)
  const totalDeals = deals.length
  const conversionRate = totalDeals > 0 ? ((completedDeals.length / totalDeals) * 100).toFixed(1) : '0'

  // Average deal size
  const avgDealSize = completedDeals.length > 0 
    ? completedValue / completedDeals.length 
    : activePipeline > 0 && activeDeals.length > 0 
      ? activePipeline / activeDeals.length 
      : 0

  // Days in pipeline (average age of active deals)
  const avgDaysInPipeline = activeDeals.length > 0
    ? Math.round(activeDeals.reduce((sum, d) => {
        const days = Math.floor((Date.now() - new Date(d.date_saved).getTime()) / 86400000)
        return sum + days
      }, 0) / activeDeals.length)
    : 0

  // Deal type breakdown
  const fullDeals = deals.filter(d => d.deal_type === 'full')
  const bookDeals = deals.filter(d => d.deal_type === 'book')

  // Recent activity (last 30 days)
  const thirtyDaysAgo = Date.now() - (30 * 86400000)
  const recentDeals = deals.filter(d => new Date(d.date_saved).getTime() > thirtyDaysAgo)

  return (
    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SmartStat
          label="Active Pipeline"
          value={`$${activePipeline.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subValue={`${activeDeals.length} deal${activeDeals.length !== 1 ? 's' : ''} in progress`}
          icon={BarChart3}
          highlight="primary"
          size="large"
        />
        <SmartStat
          label="Completed Revenue"
          value={`$${completedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subValue={`${completedDeals.length} deal${completedDeals.length !== 1 ? 's' : ''} closed`}
          icon={CheckCircle2}
          highlight="success"
          size="large"
        />
        <SmartStat
          label="Conversion Rate"
          value={`${conversionRate}%`}
          subValue={`${completedDeals.length} of ${totalDeals} deals`}
          icon={Percent}
          trend={parseFloat(conversionRate) >= 30 ? 'up' : parseFloat(conversionRate) >= 15 ? 'neutral' : 'down'}
          trendValue={parseFloat(conversionRate) >= 30 ? 'Strong' : parseFloat(conversionRate) >= 15 ? 'Avg' : 'Low'}
          size="large"
        />
        <SmartStat
          label="Avg Deal Size"
          value={`$${avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subValue="Per completed deal"
          icon={DollarSign}
          size="large"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <SmartStat
          label="Total Saved"
          value={deals.length}
          icon={Target}
        />
        <SmartStat
          label="Active"
          value={activeDeals.length}
          icon={Clock}
          highlight="warning"
        />
        <SmartStat
          label="Won"
          value={completedDeals.length}
          icon={CheckCircle2}
          highlight="success"
        />
        <SmartStat
          label="Declined"
          value={declinedDeals.length}
          icon={XCircle}
          highlight="destructive"
        />
        <SmartStat
          label="Avg Days"
          value={avgDaysInPipeline}
          subValue="In pipeline"
          icon={Clock}
        />
        <SmartStat
          label="Last 30 Days"
          value={recentDeals.length}
          subValue="New deals"
          icon={TrendingUp}
          trend={recentDeals.length >= 5 ? 'up' : recentDeals.length >= 2 ? 'neutral' : 'down'}
        />
      </div>

      {/* Deal type breakdown */}
      <Card className="border-border">
        <CardContent className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Deal Type Breakdown</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Full Agency Valuations</span>
                <span className="text-sm font-bold text-foreground">{fullDeals.length}</span>
              </div>
              <ProgressBar value={fullDeals.length} max={deals.length} color="primary" />
              <p className="text-xs text-muted-foreground mt-1">
                ${fullDeals.reduce((s, d) => s + d.valuation, 0).toLocaleString()} total value
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Book Valuations</span>
                <span className="text-sm font-bold text-foreground">{bookDeals.length}</span>
              </div>
              <ProgressBar value={bookDeals.length} max={deals.length} color="success" />
              <p className="text-xs text-muted-foreground mt-1">
                ${bookDeals.reduce((s, d) => s + d.valuation, 0).toLocaleString()} total value
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deal History */}
      <Card className="overflow-hidden border-border">
        <div className="border-b border-border bg-secondary/50 px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Saved Deal History</h3>
          <span className="text-xs text-muted-foreground">{deals.length} total</span>
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
                  className="flex items-center justify-between border-b border-border px-6 py-4 last:border-b-0 hover:bg-secondary/20 transition-colors"
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
                        <span className="ml-2 text-amber-600 dark:text-amber-400 font-bold">STALE ({daysOld}d)</span>
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
                      <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
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
