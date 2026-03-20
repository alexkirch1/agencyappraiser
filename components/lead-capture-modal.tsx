"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Lock, CheckCircle2, Loader2 } from "lucide-react"

interface LeadData {
  name: string
  email: string
  phone: string
  agencyName: string
}

interface Props {
  onSubmit: (data: LeadData, leadId?: number | null) => void
  onClose?: () => void
  title?: string
  description?: string
  toolUsed?: string
  valuationSummary?: string
  estimatedValue?: number
  valuationData?: Record<string, unknown>
}

export function LeadCaptureModal({
  onSubmit,
  onClose,
  title,
  description,
  toolUsed = "Agency Valuation",
  valuationSummary = "",
  estimatedValue = 0,
  valuationData,
}: Props) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [agencyName, setAgencyName] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = "Name is required"
    if (!email.trim()) newErrors.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Enter a valid email"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    const leadData: LeadData = { name, email, phone, agencyName }

    // Fire API call to Pipedrive + email, capture leadId for DB linking
    let returnedLeadId: number | null = null
    try {
      const res = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...leadData,
          toolUsed,
          valuationSummary,
          estimatedValue,
          valuationData,
        }),
      })
      const json = await res.json()
      returnedLeadId = json.leadId ?? null
    } catch {
      console.error("[v0] Lead API call failed, continuing anyway")
    }

    setSubmitting(false)
    onSubmit(leadData, returnedLeadId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-sm border-border bg-card shadow-2xl">
        <CardHeader className="pb-3">
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          )}
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center text-lg font-bold text-foreground">
            {title || "One quick step to see your valuation"}
          </CardTitle>
          <p className="text-center text-sm text-muted-foreground mt-1">
            {description || "Just your name and email — we'll show your results instantly."}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <Label htmlFor="lc-name" className="text-sm text-muted-foreground">Full Name *</Label>
              <Input
                id="lc-name"
                type="text"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                autoFocus
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="lc-email" className="text-sm text-muted-foreground">Email Address *</Label>
              <Input
                id="lc-email"
                type="email"
                placeholder="john@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
            </div>
            <div>
              <Label htmlFor="lc-phone" className="text-sm text-muted-foreground">Phone <span className="text-muted-foreground/60">(optional)</span></Label>
              <Input
                id="lc-phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button type="submit" size="lg" className="mt-1 w-full gap-2" disabled={submitting}>
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Just a moment...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Show My Valuation</>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground/60">
              No spam. Your info is never shared with third parties.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
