"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/use-auth"
import { AuthModal } from "@/components/auth/auth-modal"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, TrendingUp, Calculator, Lock, ArrowRight } from "lucide-react"
import Link from "next/link"

interface SavedValuation {
  id: number
  agency_description: string | null
  scope_of_sale: string | null
  revenue_ltm: number | null
  low_offer: number | null
  high_offer: number | null
  calculated_multiple: number | null
  risk_grade: string | null
  created_at: string
}

const RISK_COLORS: Record<string, string> = {
  "A": "text-success",
  "B": "text-primary",
  "C": "text-warning",
  "D": "text-destructive",
}

export default function MyValuationsPage() {
  const { user, loading } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [valuations, setValuations] = useState<SavedValuation[]>([])
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (!user) return
    setFetching(true)
    fetch("/api/valuations")
      .then(r => r.json())
      .then(d => setValuations(d.valuations ?? []))
      .finally(() => setFetching(false))
  }, [user])

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this valuation?")) return
    await fetch(`/api/valuations?id=${id}`, { method: "DELETE" })
    setValuations(v => v.filter(x => x.id !== id))
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <Card className="w-full max-w-md border-border">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Lock className="h-7 w-7 text-muted-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Sign in to view your valuations</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Create a free account to save your valuations and track your agency's value over time.
              </p>
              <Button className="mt-6 w-full gap-2" onClick={() => setShowAuth(true)}>
                <TrendingUp className="h-4 w-4" />
                Sign In or Create Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Valuations</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back, {user.name}. Here are your saved valuation reports.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/calculator">
            <Calculator className="h-4 w-4" />
            New Valuation
          </Link>
        </Button>
      </div>

      {fetching ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : valuations.length === 0 ? (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-base font-medium text-foreground">No saved valuations yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Run a full valuation to see results saved here.</p>
            <Button asChild className="mt-6 gap-2">
              <Link href="/calculator">
                Start Full Valuation
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {valuations.map((v) => (
            <Card key={v.id} className="border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {v.agency_description || "Unnamed Agency"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {v.low_offer && v.high_offer && (
                    <div className="flex items-center justify-between rounded-md bg-success/10 px-3 py-2">
                      <span className="text-xs text-muted-foreground">Valuation Range</span>
                      <span className="text-sm font-bold text-success">
                        ${(v.low_offer / 1000).toFixed(0)}k – ${(v.high_offer / 1000).toFixed(0)}k
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Revenue (LTM)</span>
                    <span className="text-xs font-medium text-foreground">
                      {v.revenue_ltm ? `$${(v.revenue_ltm / 1000).toFixed(0)}k` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Multiple</span>
                    <span className="text-xs font-medium text-foreground">
                      {v.calculated_multiple ? `${v.calculated_multiple.toFixed(2)}x` : "—"}
                    </span>
                  </div>
                  {v.risk_grade && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Risk Grade</span>
                      <span className={`text-xs font-bold ${RISK_COLORS[v.risk_grade] ?? "text-foreground"}`}>
                        {v.risk_grade}
                      </span>
                    </div>
                  )}
                </div>

                {v.scope_of_sale && (
                  <div className="mt-3">
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground capitalize">
                      {v.scope_of_sale}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
