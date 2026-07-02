"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Lock, CheckCircle2, Loader2, ChevronRight } from "lucide-react"

const REFERRAL_OPTIONS = [
  "Google / Search",
  "Ad (Google, Meta, etc.)",
  "LinkedIn",
  "Facebook Group",
  "Referred by a colleague",
  "Industry newsletter",
  "Big I / PIA association",
  "Podcast or webinar",
  "Other",
]

const FEEDBACK_OPTIONS = [
  "Just exploring — not ready to sell yet",
  "Actively looking to sell in the next 12 months",
  "Comparing offers — already have a buyer in mind",
  "Curious about my agency's value for planning purposes",
  "Looking to acquire, not sell",
  "Other",
]

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
  const [step, setStep] = useState<"form" | "referral" | "feedback">("form")
  const [leadId, setLeadId] = useState<number | null>(null)
  const [leadData, setLeadData] = useState<LeadData | null>(null)
  const [referralSource, setReferralSource] = useState("")
  const [savingReferral, setSavingReferral] = useState(false)
  const [feedbackOption, setFeedbackOption] = useState("")
  const [savingFeedback, setSavingFeedback] = useState(false)

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
    const data: LeadData = { name, email, phone, agencyName }

    let returnedLeadId: number | null = null
    try {
      const res = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          toolUsed,
          valuationSummary,
          estimatedValue,
          valuationData,
        }),
      })
      const json = await res.json()
      returnedLeadId = json.leadId ?? null

      // Fire Meta Lead event after successful submission
      const win = window as unknown as { fbq?: (...args: unknown[]) => void }
      if (typeof win.fbq === "function") {
        win.fbq("track", "Lead")
      }
    } catch {
      console.error("[lead-capture] Lead API call failed, continuing anyway")
    }

    setSubmitting(false)
    setLeadId(returnedLeadId)
    setLeadData(data)
    setStep("referral")
  }

  const handleReferral = async (source: string) => {
    setReferralSource(source)
    setSavingReferral(true)

    // Save referral source to DB in background — non-blocking
    if (leadId) {
      fetch("/api/submit-lead/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, referralSource: source }),
      }).catch(() => {})
    }

    // Small delay so the selection feels acknowledged before moving on
    await new Promise((r) => setTimeout(r, 350))
    setSavingReferral(false)
    setStep("feedback")
  }

  const handleFeedback = async (option: string) => {
    setFeedbackOption(option)
    setSavingFeedback(true)

    // Save feedback to lead notes in background — non-blocking
    if (leadId) {
      fetch("/api/submit-lead/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, feedback: option }),
      }).catch(() => {})
    }

    await new Promise((r) => setTimeout(r, 350))
    setSavingFeedback(false)
    onSubmit(leadData!, leadId)
  }

  const handleSkip = () => {
    onSubmit(leadData!, leadId)
  }

  if (step === "referral") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <Card className="w-full max-w-sm border-border bg-card shadow-2xl">
          <CardHeader className="pb-3">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-center text-lg font-bold text-foreground">
              One quick question
            </CardTitle>
            <p className="text-center text-sm text-muted-foreground mt-1">
              How did you hear about Agency Appraiser?
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {REFERRAL_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => handleReferral(option)}
                  disabled={savingReferral}
                  className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm text-left transition-all
                    ${referralSource === option
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-secondary/30 text-foreground hover:border-primary/50 hover:bg-primary/5"
                    } disabled:opacity-60`}
                >
                  <span>{option}</span>
                  {savingReferral && referralSource === option
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                </button>
              ))}
            </div>
            <button
              onClick={handleSkip}
              className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip this question
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "feedback") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <Card className="w-full max-w-sm border-border bg-card shadow-2xl">
          <CardHeader className="pb-3">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <CardTitle className="text-center text-lg font-bold text-foreground">
                One more thing
              </CardTitle>
              <span className="rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Optional
              </span>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-1">
              Where are you in the process of selling your agency?
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {FEEDBACK_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => handleFeedback(option)}
                  disabled={savingFeedback}
                  className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm text-left transition-all
                    ${feedbackOption === option
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-secondary/30 text-foreground hover:border-primary/50 hover:bg-primary/5"
                    } disabled:opacity-60`}
                >
                  <span>{option}</span>
                  {savingFeedback && feedbackOption === option
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                </button>
              ))}
            </div>
            <button
              onClick={handleSkip}
              className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip this question
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-sm border-border bg-card shadow-2xl">
        <CardHeader className="pb-3">
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
