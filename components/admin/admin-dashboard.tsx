"use client"

import { useState, useEffect } from "react"
import {
  LogOut, Sun, Moon, BarChart3, FolderKanban, Settings, Users,
  TrendingUp, BarChart2, Archive, MessageSquare, Menu, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { OverviewTab } from "@/components/admin/overview-tab"
import { HorizonTab } from "@/components/admin/horizon-tab"
import { SettingsTab } from "@/components/admin/settings-tab"
import { LeadsTab } from "@/components/admin/leads-tab"
import { AnalyticsTab } from "@/components/admin/analytics-tab"
import { MarketDataTab } from "@/components/admin/market-data-tab"
import { ArchiveTab } from "@/components/admin/archive-tab"
import { FeedbackTab } from "@/components/admin/feedback-tab"
import { cn } from "@/lib/utils"

export interface Deal {
  id: string
  deal_name: string
  deal_type: "full" | "book"
  valuation: number
  premium_base: number
  status: "active" | "completed" | "declined" | "test"
  date_saved: string
  details?: Record<string, unknown>
}

interface AdminDashboardProps {
  onLogout: () => void
}

const NAV_GROUPS = [
  {
    label: "Core",
    items: [
      { id: "overview",    label: "Overview",        icon: BarChart3 },
      { id: "analytics",  label: "Analytics",        icon: TrendingUp },
      { id: "leads",      label: "Leads",            icon: Users },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "horizon",    label: "Horizon Pipeline", icon: FolderKanban },
      { id: "market-data",label: "Market Data",      icon: BarChart2 },
    ],
  },
  {
    label: "Admin",
    items: [
      { id: "feedback",   label: "Feedback",         icon: MessageSquare },
      { id: "archive",    label: "Archive",          icon: Archive },
      { id: "settings",   label: "Settings",         icon: Settings },
    ],
  },
] as const

type TabId = "overview" | "analytics" | "leads" | "horizon" | "market-data" | "feedback" | "archive" | "settings"

const TAB_LABELS: Record<TabId, string> = {
  overview: "Overview",
  analytics: "Analytics",
  leads: "Leads",
  horizon: "Horizon Pipeline",
  "market-data": "Market Data",
  feedback: "Feedback",
  archive: "Archive",
  settings: "Settings",
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [deals, setDeals] = useState<Deal[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem("admin-deals")
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    try { localStorage.setItem("admin-deals", JSON.stringify(deals)) } catch { /* quota */ }
  }, [deals])

  const addDeal    = (deal: Deal) => setDeals((p) => [deal, ...p])
  const updateDeal = (id: string, u: Partial<Deal>) => setDeals((p) => p.map((d) => d.id === id ? { ...d, ...u } : d))
  const deleteDeal = (id: string) => setDeals((p) => p.filter((d) => d.id !== id))
  const clearAll   = () => setDeals([])

  const navigate = (id: TabId) => { setActiveTab(id); setSidebarOpen(false) }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={cn("flex flex-col h-full", mobile ? "p-4" : "px-3 py-5")}>
      {/* Logo */}
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <TrendingUp className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold text-foreground tracking-tight">Agency Admin</span>
      </div>

      {/* Nav groups */}
      <div className="flex flex-col gap-5 flex-1 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id as TabId)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors text-left",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="mt-4 border-t border-border pt-4 flex flex-col gap-0.5">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside className="hidden lg:flex lg:w-52 xl:w-56 shrink-0 flex-col border-r border-border bg-card/50">
        <Sidebar />
      </aside>

      {/* ── Mobile sidebar overlay ────────────────────────────── */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-border bg-card lg:hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-bold text-foreground">Menu</span>
              <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Sidebar mobile />
          </aside>
        </>
      )}

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Top bar */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/50 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-sm font-semibold text-foreground">
              {TAB_LABELS[activeTab]}
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex text-xs text-muted-foreground gap-1.5"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout} className="text-xs gap-1.5">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">
            {activeTab === "overview" && (
              <OverviewTab
                deals={deals}
                onStatusChange={(id, status) => updateDeal(id, { status })}
                onDelete={deleteDeal}
                onLoadDeal={() => navigate("horizon")}
              />
            )}
            {activeTab === "analytics"   && <AnalyticsTab />}
            {activeTab === "leads"       && (
              <LeadsTab
                deals={deals}
                onNavigateToPipeline={() => navigate("horizon")}
                onAddDeal={addDeal}
                onUpdateDeal={updateDeal}
              />
            )}
            {activeTab === "horizon"     && <HorizonTab deals={deals} onSaveDeal={addDeal} onUpdateDeal={updateDeal} />}
            {activeTab === "market-data" && <MarketDataTab />}
            {activeTab === "feedback"    && <FeedbackTab />}
            {activeTab === "archive"     && <ArchiveTab />}
            {activeTab === "settings"    && <SettingsTab onClearAll={clearAll} dealCount={deals.length} />}
          </div>
        </main>
      </div>
    </div>
  )
}
