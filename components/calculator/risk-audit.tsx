"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { RiskAuditResult, RiskAuditItem } from "./valuation-engine"
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react"

interface Props {
  data: RiskAuditResult
}

export function RiskAudit({ data }: Props) {
  if (data.items.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <p className="text-sm text-muted-foreground">Complete the form to see your risk audit.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Grade Header */}
      <Card className="border-border bg-card">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 ${gradeColorBorder(data.grade)}`}>
            <span className={`text-3xl font-bold ${data.gradeColor}`}>{data.grade}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Risk Grade</p>
            <p className="text-xs text-muted-foreground">{data.summaryText}</p>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      {data.items.map((item, idx) => (
        <RiskCard key={idx} item={item} />
      ))}
    </div>
  )
}

function gradeColorBorder(grade: string) {
  switch (grade) {
    case "A": return "border-[hsl(var(--success))]"
    case "B": return "border-[hsl(var(--warning))]"
    case "C": return "border-[hsl(var(--warning))]"
    case "D": return "border-destructive"
    default: return "border-border"
  }
}

function RiskCard({ item }: { item: RiskAuditItem }) {
  const config = levelConfig(item.level)

  return (
    <Card className={`border-l-4 ${config.borderColor} border-border bg-card`}>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <config.Icon className={`h-4 w-4 ${config.textColor}`} />
            <h4 className={`text-sm font-semibold ${config.textColor}`}>{item.title}</h4>
          </div>
          <Badge variant="outline" className={`text-[10px] ${config.textColor} border-current`}>
            {config.badge}
          </Badge>
        </div>

        <p className="text-xs leading-relaxed text-foreground">{item.problem}</p>

        {item.psychology && (
          <div className={`rounded-md p-2.5 ${config.psychBg}`}>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">
              {item.level === "Strength" ? "Why Buyers Pay More" : "Buyer's Perspective"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.psychology}</p>
          </div>
        )}

        {item.mitigation && (
          <div className="rounded-md bg-[hsl(var(--warning))]/10 p-2.5">
            <p className="text-[10px] font-semibold uppercase text-[hsl(var(--warning))]">How to Fix It</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.mitigation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function levelConfig(level: RiskAuditItem["level"]) {
  switch (level) {
    case "Strength":
      return {
        Icon: CheckCircle2,
        textColor: "text-[hsl(var(--success))]",
        borderColor: "border-l-[hsl(var(--success))]",
        badge: "Key Strength",
        psychBg: "bg-[hsl(var(--success))]/10",
      }
    case "High Risk":
    case "Severe Risk":
      return {
        Icon: ShieldAlert,
        textColor: "text-destructive",
        borderColor: "border-l-destructive",
        badge: level,
        psychBg: "bg-primary/10",
      }
    case "Moderate Risk":
      return {
        Icon: AlertTriangle,
        textColor: "text-[hsl(var(--warning))]",
        borderColor: "border-l-[hsl(var(--warning))]",
        badge: level,
        psychBg: "bg-primary/10",
      }
    case "Info":
      return {
        Icon: Info,
        textColor: "text-primary",
        borderColor: "border-l-primary",
        badge: "Observation",
        psychBg: "bg-primary/10",
      }
  }
}
