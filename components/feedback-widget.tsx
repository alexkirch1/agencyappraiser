"use client"

import { useState } from "react"
import { MessageSquarePlus, X, Send, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FeedbackWidgetProps {
  prompt: string
  placeholder: string
  category: string
}

export function FeedbackWidget({ prompt, placeholder, category }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle")

  async function handleSubmit() {
    if (!message.trim()) return
    setStatus("loading")
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), category }),
      })
      if (!res.ok) throw new Error("Failed")
      setStatus("sent")
      setMessage("")
      setTimeout(() => {
        setStatus("idle")
        setOpen(false)
      }, 2500)
    } catch {
      setStatus("error")
      setTimeout(() => setStatus("idle"), 3000)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-5 sm:right-5">
      {/* Popover — full width on small screens, fixed 320px on larger */}
      {open && (
        <div className="w-[calc(100vw-2rem)] max-w-xs rounded-xl border border-border bg-card shadow-xl sm:w-80">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <p className="text-sm font-semibold leading-snug text-foreground">{prompt}</p>
            <button
              onClick={() => { setOpen(false); setStatus("idle") }}
              className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close feedback"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {status === "sent" ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <p className="text-sm font-medium text-foreground">Got it — thanks!</p>
                <p className="text-xs text-muted-foreground">We review every submission.</p>
              </div>
            ) : (
              <>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit()
                  }}
                  placeholder={placeholder}
                  rows={3}
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {status === "error" && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                    <p className="text-xs text-destructive">Something went wrong — please try again.</p>
                  </div>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={!message.trim() || status === "loading"}
                  size="sm"
                  className="mt-2 w-full gap-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  {status === "loading" ? "Sending..." : "Send"}
                </Button>
                <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                  Cmd+Enter to send
                </p>
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
