"use client"

import { useState } from "react"
import { MessageSquarePlus, X, Send, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FeedbackWidgetProps {
  prompt: string           // e.g. "Don't see a carrier you'd like to sell?"
  placeholder: string      // e.g. "Tell us the carrier name..."
  category: string         // e.g. "carrier-request", "feature-request", "general"
}

export function FeedbackWidget({ prompt, placeholder, category }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!message.trim()) return
    setLoading(true)
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), category }),
      })
      setSent(true)
      setMessage("")
      setTimeout(() => {
        setSent(false)
        setOpen(false)
      }, 2500)
    } catch {
      // fail silently — still close
      setSent(true)
      setTimeout(() => { setSent(false); setOpen(false) }, 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Popover */}
      {open && (
        <div className="w-80 rounded-xl border border-border bg-card shadow-xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <p className="text-sm font-semibold leading-snug text-foreground">{prompt}</p>
            <button
              onClick={() => setOpen(false)}
              className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close feedback"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {sent ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
                <p className="text-sm font-medium text-foreground">Got it — thanks!</p>
                <p className="text-xs text-muted-foreground">We review every submission.</p>
              </div>
            ) : (
              <>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Button
                  onClick={handleSubmit}
                  disabled={!message.trim() || loading}
                  size="sm"
                  className="mt-2 w-full gap-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  {loading ? "Sending..." : "Send"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-lg transition-all hover:border-primary/40 hover:text-foreground hover:shadow-xl"
          aria-label="Send feedback"
        >
          <MessageSquarePlus className="h-4 w-4 text-primary" />
          Feedback
        </button>
      )}
    </div>
  )
}
