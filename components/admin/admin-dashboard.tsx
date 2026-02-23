"use client"

import { useState, useEffect } from "react"
import { LogOut, Sun, Moon, BarChart3, FolderKanban, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { OverviewTab } from "@/components/admin/overview-tab"
import { HorizonTab } from "@/components/admin/horizon-tab"
import { SettingsTab } from "@/components/admin/settings-tab"
import { cn } from "@/lib/utils"

export interface Deal {
  id: string
  deal_name: string
  deal_type: "full" | "book"
  valuation: number
  premium_base: number
  status: "active" | "completed" | "declined"
  date_saved: string
  details?: Record<string, unknown>
}

interface AdminDashboardProps {
  onLogout: () => void
}

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "horizon", label: "Horizon Pipeline", icon: FolderKanban },
  { id: "settings", label: "Settings", icon: Settings },
] as const

type TabId = (typeof tabs)[number]["id"]

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [deals, setDeals] = useState<Deal[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem("admin-deals")
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const { theme, toggleTheme } = useTheme()

  // Persist deals to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem("admin-deals", JSON.stringify(deals))
    } catch { /* quota exceeded -- ignore */ }
  }, [deals])

  const addDeal = (deal: Deal) => {
    setDeals((prev) => [deal, ...prev])
  }

  const updateDeal = (id: string, updates: Partial<Deal>) => {
    setDeals((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    )
  }

  const deleteDeal = (id: string) => {
    setDeals((prev) => prev.filter((d) => d.id !== id))
  }

  const clearAllDeals = () => {
    setDeals([])
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            Agency <span className="text-primary">Dashboard</span>
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-1 border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <OverviewTab
            deals={deals}
            onStatusChange={(id, status) => updateDeal(id, { status })}
            onDelete={deleteDeal}
            onLoadDeal={(id) => {
              setActiveTab("horizon")
              // Could load deal data into horizon form here
              console.log("Load deal:", id)
            }}
          />
        )}
        {activeTab === "horizon" && (
          <HorizonTab deals={deals} onSaveDeal={addDeal} onUpdateDeal={updateDeal} />
        )}
        {activeTab === "settings" && (
          <SettingsTab onClearAll={clearAllDeals} dealCount={deals.length} />
        )}
      </div>
    </div>
  )
}
