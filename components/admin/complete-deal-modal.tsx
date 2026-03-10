"use client"

import { useState } from "react"
import { X, CheckCircle, Loader2, Trophy, PartyPopper } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Deal } from "@/components/admin/admin-dashboard"

interface CompleteDealModalProps {
  deal: Deal
  onClose: () => void
  onSaved: () => void
}

const DEAL_TERMS = [
  "100% Cash at Close",
  "Cash + Earnout",
  "Cash + Seller Note",
  "Cash + Equity",
  "Other",
]

export function CompleteDealModal({ deal, onClose, onSaved }: CompleteDealModalProps) {
  const [finalOffer, setFinalOffer] = useState(deal.valuation)
  const [dealStructure, setDealStructure] = useState("100% Cash at Close")
  const [earnoutPct, setEarnoutPct] = useState(0)
  const [sellerStayMonths, setSellerStayMonths] = useState(12)
  const [retention, setRetention] = useState<number | "">(deal.details?.book_retention_pct as number ?? "")
  const [lossRatio, setLossRatio] = useState<number | "">(deal.details?.loss_ratio as number ?? "")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const finalMultiple = deal.premium_base > 0 ? finalOffer / deal.premium_base : 0
  const hasEarnout = dealStructure.includes("Earnout")

  const handleSave = async () => {
    if (finalOffer <= 0) {
      setError("Please enter the final offer amount.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/completed-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_name: deal.deal_name,
          deal_type: deal.deal_type,
          premium_base: deal.premium_base,
          appraised_low: deal.valuation * 0.9,
          appraised_high: deal.valuation * 1.1,
          final_offer: finalOffer,
          final_multiple: parseFloat(finalMultiple.toFixed(3)),
          deal_structure: dealStructure,
          earnout_pct: hasEarnout ? earnoutPct : 0,
          seller_stay_months: sellerStayMonths,
          retention_rate: retention !== "" ? retention : null,
          loss_ratio: lossRatio !== "" ? lossRatio : null,
          policies_per_cx: deal.details?.pif_count ?? null,
          primary_state: deal.details?.state ?? null,
          carrier: deal.details?.carrier ?? null,
          notes,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      setSaved(true)
      setTimeout(() => {
        onSaved()
        onClose()
      }, 1200)
    } catch {
      setError("Could not save — please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-deal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
          {/* Celebration Header */}
          <div className="relative overflow-hidden rounded-t-xl bg-gradient-to-br from-success/20 via-success/10 to-primary/10 px-6 py-6 text-center">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center justify-center gap-2 mb-2">
              <PartyPopper className="h-7 w-7 text-warning" />
              <Trophy className="h-9 w-9 text-warning" />
              <PartyPopper className="h-7 w-7 text-warning scale-x-[-1]" />
            </div>
            <h2 id="complete-deal-title" className="text-xl font-bold text-foreground">
              Congratulations!
            </h2>
            <p className="mt-1 text-sm font-medium text-foreground/80">{deal.deal_name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Record the final deal terms to improve future valuations</p>
          </div>

          {/* Body */}
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
            {saved ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Trophy className="h-14 w-14 text-warning" />
                <p className="text-lg font-bold text-foreground">Deal recorded!</p>
                <p className="text-sm text-muted-foreground">
                  Moving to Completed Deals tab now.
                </p>
              </div>
            ) : (
              <>
                {/* Summary row */}
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-secondary/30 p-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Model Estimate</p>
                    <p className="font-semibold text-foreground">
                      ${deal.valuation.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Premium Base</p>
                    <p className="font-semibold text-foreground">
                      ${deal.premium_base.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Final Offer */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Final Offer / Sale Price ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={finalOffer}
                    onChange={(e) => setFinalOffer(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {finalMultiple > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      = {finalMultiple.toFixed(2)}x of premium base
                    </p>
                  )}
                </div>

                {/* Deal Terms */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Deal Structure</label>
                  <select
                    value={dealStructure}
                    onChange={(e) => setDealStructure(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {DEAL_TERMS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Earnout % — only if earnout selected */}
                {hasEarnout && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Earnout Component (% of total)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={earnoutPct}
                      onChange={(e) => setEarnoutPct(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                )}

                {/* Seller Stay */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Seller Stay-On Agreement (months)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={sellerStayMonths}
                    onChange={(e) => setSellerStayMonths(parseInt(e.target.value) || 0)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Optional book metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Book Retention (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={retention}
                      placeholder="e.g. 88"
                      onChange={(e) => setRetention(e.target.value === "" ? "" : parseFloat(e.target.value))}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Loss Ratio (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={lossRatio}
                      placeholder="e.g. 62"
                      onChange={(e) => setLossRatio(e.target.value === "" ? "" : parseFloat(e.target.value))}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Key deal details, what drove the final price, buyer type..."
                    className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
              </>
            )}
          </div>

          {/* Footer */}
          {!saved && (
            <div className="border-t border-border px-6 py-4 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : "Record Completed Deal"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
