"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { FileText, Scale, BookOpen, Settings, ArrowRightLeft, Target } from "lucide-react"

interface ChecklistItem {
  id: string
  label: string
  tip: string
}

interface Category {
  id: string
  title: string
  icon: React.ElementType
  items: ChecklistItem[]
}

const categories: Category[] = [
  {
    id: "financial",
    title: "Financial Documentation",
    icon: FileText,
    items: [
      { id: "f1", label: "3+ years of tax returns organized and available", tip: "Buyers will request at least 3 years of returns during due diligence." },
      { id: "f2", label: "Clean Profit & Loss statement prepared", tip: "Separate agency P&L from personal expenses. Add back owner perks." },
      { id: "f3", label: "SDE/EBITDA calculated with add-backs documented", tip: "Document every add-back (owner comp, personal expenses, one-time costs)." },
      { id: "f4", label: "Revenue trend data for past 3 years compiled", tip: "Show consistent or growing revenue. Explain any dips clearly." },
      { id: "f5", label: "Balance sheet and accounts receivable current", tip: "Outstanding receivables and carrier balances should be reconciled." },
    ],
  },
  {
    id: "legal",
    title: "Legal & Compliance",
    icon: Scale,
    items: [
      { id: "l1", label: "Producer non-solicitation agreements in place", tip: "Without these, producers can take clients when they leave." },
      { id: "l2", label: "E&O insurance current with no open claims", tip: "Active claims or a history of claims will reduce your valuation." },
      { id: "l3", label: "Entity structure reviewed (LLC, Corp, etc.)", tip: "Consult with a tax attorney on the best structure for a sale." },
      { id: "l4", label: "Carrier contracts reviewed for assignment clauses", tip: "Some carriers restrict transferability. Identify these early." },
      { id: "l5", label: "Office lease terms reviewed and documented", tip: "Long-term leases can be a liability. Short-term or virtual is preferred." },
    ],
  },
  {
    id: "book",
    title: "Book of Business Quality",
    icon: BookOpen,
    items: [
      { id: "b1", label: "Retention rate tracked and above 88%", tip: "Retention is the #1 metric buyers evaluate. Above 92% commands a premium." },
      { id: "b2", label: "Client concentration under 20% for top 10 clients", tip: "High concentration is a deal-breaker. Diversify before going to market." },
      { id: "b3", label: "Policy count and premium by line of business documented", tip: "Commercial lines typically command higher multiples than personal." },
      { id: "b4", label: "Carrier diversification healthy (no single carrier >50%)", tip: "Over-reliance on one carrier creates termination risk." },
      { id: "b5", label: "Loss ratio data available by carrier", tip: "Low loss ratios show a quality book that carriers want to retain." },
    ],
  },
  {
    id: "operations",
    title: "Operations & Technology",
    icon: Settings,
    items: [
      { id: "o1", label: "Agency management system (AMS) in place and current", tip: "Buyers want modern, cloud-based systems with clean data." },
      { id: "o2", label: "Standard operating procedures documented", tip: "SOPs demonstrate the business can run without the owner." },
      { id: "o3", label: "Staff roles clearly defined with job descriptions", tip: "Buyers need to understand the team structure and each person's role." },
      { id: "o4", label: "Key workflows are digital/automated where possible", tip: "Manual processes increase cost and risk. Automate before selling." },
    ],
  },
  {
    id: "transition",
    title: "Transition Planning",
    icon: ArrowRightLeft,
    items: [
      { id: "t1", label: "Transition timeline documented (6-24 months)", tip: "Buyers expect the owner to stay on for 6-12 months minimum." },
      { id: "t2", label: "Key client relationships mapped (who knows who)", tip: "Identify which clients are owner-dependent vs. staff-managed." },
      { id: "t3", label: "Staff retention plan discussed or incentivized", tip: "Staff leaving during transition destroys value. Retention bonuses help." },
      { id: "t4", label: "Buyer profile and ideal deal structure considered", tip: "Know if you want a strategic buyer, PE firm, or internal succession." },
    ],
  },
  {
    id: "market",
    title: "Market Positioning",
    icon: Target,
    items: [
      { id: "m1", label: "Unique value proposition or niche identified", tip: "Specialization in a niche (e.g., trucking, construction) commands a premium." },
      { id: "m2", label: "Brand reputation and online presence assessed", tip: "Google reviews, website quality, and community reputation matter." },
      { id: "m3", label: "Growth pipeline documented (new business activity)", tip: "Active new business writing proves the agency isn't just running on renewals." },
      { id: "m4", label: "Competitive landscape in your market understood", tip: "Know your market density and how your agency compares locally." },
    ],
  },
]

export function ReadinessScorecard() {
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const toggleItem = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0)
  const totalChecked = Object.values(checked).filter(Boolean).length
  const overallPct = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0

  const getGradeInfo = (pct: number) => {
    if (pct >= 70) return { label: "Ready", color: "text-[hsl(var(--success))]", barColor: "bg-[hsl(var(--success))]" }
    if (pct >= 40) return { label: "In Progress", color: "text-[hsl(var(--warning))]", barColor: "bg-[hsl(var(--warning))]" }
    return { label: "Needs Work", color: "text-destructive", barColor: "bg-destructive" }
  }

  const overallGrade = getGradeInfo(overallPct)

  return (
    <div className="flex flex-col gap-8">
      {/* Overall Score Card */}
      <Card className="border-primary/30 bg-card">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:text-left">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-border bg-secondary">
            <span className={`text-3xl font-bold ${overallGrade.color}`}>{overallPct}%</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Overall Readiness: <span className={overallGrade.color}>{overallGrade.label}</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {totalChecked} of {totalItems} items complete
            </p>
            <Progress value={overallPct} className="mt-3 h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Category Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {categories.map((cat) => {
          const catChecked = cat.items.filter((item) => checked[item.id]).length
          const catPct = Math.round((catChecked / cat.items.length) * 100)
          const catGrade = getGradeInfo(catPct)

          return (
            <Card key={cat.id} className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                      <cat.icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm font-semibold text-foreground">{cat.title}</CardTitle>
                  </div>
                  <span className={`text-xs font-semibold ${catGrade.color}`}>
                    {catPct}%
                  </span>
                </div>
                <Progress value={catPct} className="mt-2 h-1.5" />
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {cat.items.map((item) => (
                  <label
                    key={item.id}
                    className="group flex cursor-pointer items-start gap-3 rounded-md p-2 transition-colors hover:bg-secondary/50"
                  >
                    <Checkbox
                      checked={!!checked[item.id]}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className={`text-sm leading-snug ${checked[item.id] ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground/70 opacity-0 transition-opacity group-hover:opacity-100">
                        {item.tip}
                      </p>
                    </div>
                  </label>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
