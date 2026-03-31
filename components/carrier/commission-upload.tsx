"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2, ChevronDown, ChevronUp, Zap } from "lucide-react"
import type { CarrierInputs } from "./carrier-engine"
import { parseCommissionStatement, type CommissionParseResult } from "./commission-statement-parser"

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmt$(n: number): string {
  return "$" + Math.abs(Math.round(n)).toLocaleString()
}

// ─── Carrier-field mapping ────────────────────────────────────────────────────
// Maps parsed CSV data → CarrierInputs fields based on detected carrier.
// This is the core "smartness" — the CSV tells us carrier, LOBs, PIF, NB premium.

function mapToCarrierInputs(parsed: CommissionParseResult): Partial<CarrierInputs> {
  const fields: Partial<CarrierInputs> = {}

  // Always fill book quality fields
  if (parsed.book_avg_premium_per_policy != null)  fields.book_avg_premium_per_policy  = parsed.book_avg_premium_per_policy
  if (parsed.book_new_business_pct != null)         fields.book_new_business_pct         = parsed.book_new_business_pct
  if (parsed.book_policies_per_customer != null)   fields.book_policies_per_customer    = parsed.book_policies_per_customer
  if (parsed.book_monoline_pct != null)             fields.book_monoline_pct              = parsed.book_monoline_pct

  // Auto-set carrier and book type
  if (parsed.detectedCarrier)  fields.carrier  = parsed.detectedCarrier
  if (parsed.detectedBookType) fields.bookType = parsed.detectedBookType

  const { lobBreakdown: lob, totalWrittenPremium, newBusinessPremium, totalPolicies, newBusinessCount } = parsed
  const total   = totalWrittenPremium ?? 0
  const pif     = totalPolicies ?? 0
  const nbPrem  = newBusinessPremium ?? 0
  const nbCount = newBusinessCount ?? 0

  switch (parsed.detectedCarrier) {
    // ── Liberty Mutual (Commercial CL ADP fields) ──────────────────────────
    case "libertymutual": {
      // Total written premium maps to R12 DWP (most accurate rolling figure)
      if (total > 0) fields.lm_dwp_r12 = total
      if (pif > 0)   fields.lm_pif = pif
      if (nbPrem > 0) fields.lm_nb_dwp_ytd = nbPrem
      break
    }

    // ── Safeco (Personal Lines DWP split by LOB) ───────────────────────────
    case "safeco": {
      if (lob.auto > 0)  fields.safeco_auto_dwp = lob.auto
      if (lob.home > 0)  fields.safeco_home_dwp = lob.home
      const other = lob.other + lob.commercial
      if (other > 0) fields.safeco_other_dwp = other
      if (nbPrem > 0) fields.safeco_nb_dwp = nbPrem
      // Approximate PIF split proportionally by premium
      if (pif > 0 && total > 0) {
        if (lob.auto > 0)  fields.safeco_auto_pif  = Math.round(pif * lob.auto  / total)
        if (lob.home > 0)  fields.safeco_home_pif  = Math.round(pif * lob.home  / total)
      }
      break
    }

    // ── Travelers (uses $k inputs) ─────────────────────────────────────────
    case "travelers": {
      if (lob.auto > 0)  fields.travelers_auto_wp = Math.round(lob.auto / 1000)
      if (lob.home > 0)  fields.travelers_home_wp = Math.round(lob.home / 1000)
      if (pif > 0 && total > 0) {
        if (lob.auto > 0)  fields.travelers_auto_pif  = Math.round(pif * lob.auto  / total)
        if (lob.home > 0)  fields.travelers_home_pif  = Math.round(pif * lob.home  / total)
      }
      break
    }

    // ── Hartford (uses $k inputs, has PL + CL) ─────────────────────────────
    case "hartford": {
      if (lob.auto > 0) fields.hartford_pl_auto_twp = Math.round(lob.auto / 1000)
      if (lob.home > 0) fields.hartford_pl_home_twp = Math.round(lob.home / 1000)
      const clTotal = lob.commercial + lob.wc
      if (clTotal > 0) fields.hartford_cl_twp = Math.round(clTotal / 1000)
      if (pif > 0 && total > 0) {
        if (lob.auto > 0) fields.hartford_pl_auto_pif = Math.round(pif * lob.auto / total)
        if (lob.home > 0) fields.hartford_pl_home_pif = Math.round(pif * lob.home / total)
      }
      break
    }

    // ── Progressive ────────────────────────────────────────────────────────
    case "progressive": {
      const plTotal = lob.auto + lob.home
      const clTotal = lob.commercial + lob.wc
      if (plTotal > 0) fields.prog_pl_premium = plTotal
      if (clTotal > 0) fields.prog_cl_premium = clTotal
      if (pif > 0 && total > 0) {
        if (plTotal > 0) fields.prog_pl_pif = Math.round(pif * plTotal / total)
        if (clTotal > 0) fields.prog_cl_pif = Math.round(pif * clTotal / total)
      }
      break
    }

    // ── Berkshire / BH Guard (Commercial) ─────────────────────────────────
    case "berkshire": {
      if (total > 0)  fields.bh_written_premium_r12 = total
      if (nbCount > 0) fields.bh_new_policies_ytd = nbCount
      if (pif > 0)    fields.bh_renewal_policies_ytd = pif - nbCount
      break
    }
  }

  return fields
}

// ─── LOB breakdown display ────────────────────────────────────────────────────

function LobPill({ label, value }: { label: string; value: number }) {
  if (value <= 0) return null
  return (
    <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
      {label}: <strong>{fmt$(value)}</strong>
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onParsed: (fields: Partial<CarrierInputs>, result: CommissionParseResult) => void
}

export function CommissionUpload({ onParsed }: Props) {
  const [status, setStatus]     = useState<"idle" | "loading" | "success" | "error">("idle")
  const [fileName, setFileName] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [result, setResult]     = useState<CommissionParseResult | null>(null)
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setStatus("error"); setErrorMsg("Please upload a CSV file exported from EZLynx."); return
    }
    setStatus("loading"); setFileName(file.name); setErrorMsg("")
    try {
      const text   = await file.text()
      const parsed = parseCommissionStatement(text)
      const hasData = (parsed.totalWrittenPremium ?? 0) > 0 || (parsed.totalPolicies ?? 0) > 0
      if (!hasData) {
        setStatus("error")
        setErrorMsg("Could not extract data. Make sure this is an EZLynx Book of Business Detail Report CSV.")
        return
      }
      setResult(parsed)
      setStatus("success")
      onParsed(mapToCarrierInputs(parsed), parsed)
    } catch {
      setStatus("error")
      setErrorMsg("Failed to parse the file. Make sure it is an EZLynx Book of Business Detail Report CSV.")
    }
  }, [onParsed])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const reset = () => {
    setStatus("idle"); setFileName(""); setErrorMsg(""); setResult(null); setExpanded(false)
    if (inputRef.current) inputRef.current.value = ""
  }

  const lob = result?.lobBreakdown

  return (
    <div className="rounded-lg border border-dashed border-border">
      <input
        ref={inputRef} type="file" accept=".csv" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {/* ── Idle ── */}
      {status === "idle" && (
        <div
          onDragOver={e => e.preventDefault()} onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer items-center gap-3 rounded-lg p-4 transition-colors hover:bg-secondary/30"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Upload className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Upload Book of Business Detail Report</p>
            <p className="text-xs text-muted-foreground">
              EZLynx EZ Links CSV export — auto-detects carrier, fills premium, PIF &amp; book quality fields
            </p>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {status === "loading" && (
        <div className="flex items-center gap-3 p-4">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Parsing {fileName}...</p>
        </div>
      )}

      {/* ── Error ── */}
      {status === "error" && (
        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs text-muted-foreground">{errorMsg}</p>
          </div>
          <Button variant="outline" size="sm" onClick={reset} className="self-start text-xs">
            Try another file
          </Button>
        </div>
      )}

      {/* ── Success ── */}
      {status === "success" && result && (
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  <FileText className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                  {fileName}
                  {result.statementMonth && (
                    <span className="ml-2 text-xs text-muted-foreground">({result.statementMonth})</span>
                  )}
                </p>
                <p className="text-xs text-success">
                  Parsed successfully &middot; {result.totalPolicies} policies &middot; {result.totalCustomers} customers
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setExpanded(v => !v)}>
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Details
              </Button>
              <Button variant="ghost" size="sm" onClick={reset} className="h-7 w-7 p-0">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Auto-detected context */}
          {(result.detectedCarrier || result.detectedBookType) && (
            <div className="mt-2 flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2">
              <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="text-xs text-foreground">
                <strong>Auto-detected:</strong>{" "}
                {result.detectedCarrier
                  ? <span className="capitalize">{result.detectedCarrier === "libertymutual" ? "Liberty Mutual" : result.detectedCarrier === "berkshire" ? "Berkshire / BH Guard" : result.detectedCarrier.charAt(0).toUpperCase() + result.detectedCarrier.slice(1)}</span>
                  : null}
                {result.detectedCarrier && result.detectedBookType && " · "}
                {result.detectedBookType
                  ? <span className="capitalize">{result.detectedBookType === "wc" ? "Workers Comp" : result.detectedBookType} lines</span>
                  : null}
                {" — carrier &amp; premium fields pre-filled below"}
              </p>
            </div>
          )}

          {/* Summary pills */}
          <div className="mt-3 flex flex-wrap gap-2">
            {result.totalWrittenPremium != null && (
              <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                Total Premium: <strong>{fmt$(result.totalWrittenPremium)}</strong>
              </span>
            )}
            {result.newBusinessPremium != null && result.newBusinessPremium > 0 && (
              <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                NB Premium: <strong>{fmt$(result.newBusinessPremium)}</strong>
              </span>
            )}
            {result.book_new_business_pct != null && (
              <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                New Business: <strong>{result.book_new_business_pct.toFixed(1)}%</strong>
              </span>
            )}
            {result.book_policies_per_customer != null && (
              <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                Policies/Customer: <strong>{result.book_policies_per_customer.toFixed(2)}</strong>
              </span>
            )}
            {result.book_avg_premium_per_policy != null && (
              <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                Avg Prem/Policy: <strong>{fmt$(result.book_avg_premium_per_policy)}</strong>
              </span>
            )}
            {result.book_monoline_pct != null && (
              <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                Monoline: <strong>{result.book_monoline_pct.toFixed(1)}%</strong>
              </span>
            )}
            {result.expiringCount != null && result.expiringCount > 0 && (
              <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                Expiring: <strong>{result.expiringCount}</strong>
              </span>
            )}
          </div>

          {/* Expandable details */}
          {expanded && (
            <div className="mt-3 space-y-3">
              {/* LOB breakdown */}
              {lob && Object.values(lob).some(v => v > 0) && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Premium by Line of Business
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <LobPill label="Auto" value={lob.auto} />
                    <LobPill label="Home" value={lob.home} />
                    <LobPill label="Commercial" value={lob.commercial} />
                    <LobPill label="Workers Comp" value={lob.wc} />
                    <LobPill label="Other" value={lob.other} />
                  </div>
                </div>
              )}

              {/* Carrier breakdown table */}
              {result.carrierBreakdown.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Writing Company Breakdown
                  </p>
                  <div className="overflow-hidden rounded-md border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/50">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Carrier</th>
                          <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Written Prem</th>
                          <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Policies</th>
                          <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">New Biz</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {result.carrierBreakdown.map(cb => (
                          <tr key={cb.carrier} className="bg-card">
                            <td className="px-3 py-1.5 font-medium text-foreground">{cb.carrier}</td>
                            <td className="px-3 py-1.5 text-right text-foreground">{fmt$(cb.writtenPremium)}</td>
                            <td className="px-3 py-1.5 text-right text-muted-foreground">{cb.policyCount}</td>
                            <td className="px-3 py-1.5 text-right text-muted-foreground">{cb.newBusinessCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
