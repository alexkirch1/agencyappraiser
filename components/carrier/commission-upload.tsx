"use client"

// Updated: pdfjs-dist removed, now uses AI parse API
import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2, ChevronDown, ChevronUp, Sparkles } from "lucide-react"
import type { CarrierInputs } from "./carrier-engine"
import type { CommissionParseResult } from "./commission-statement-parser"

async function parseBookOfBusinessWithAI(file: File): Promise<CommissionParseResult> {
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch("/api/parse-commission", {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(err.error || `Server error ${res.status}`)
  }

  const { parsed } = await res.json()
  return parsed as CommissionParseResult
}

function fmt$(n: number): string {
  return "$" + Math.abs(Math.round(n)).toLocaleString()
}

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
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setStatus("error"); setErrorMsg("Please upload a PDF file."); return
    }
    setStatus("loading"); setFileName(file.name); setErrorMsg("")
    try {
      const parsed = await parseBookOfBusinessWithAI(file)
      const hasData = (parsed.totalWrittenPremium ?? 0) !== 0 || (parsed.totalPolicies ?? 0) > 0
      if (!hasData) {
        setStatus("error")
        setErrorMsg("Could not extract data from this PDF. Make sure this is an EZLynx Book of Business Detail report.")
        return
      }
      setResult(parsed)
      setStatus("success")
      onParsed({
        book_avg_premium_per_policy: parsed.book_avg_premium_per_policy,
        book_new_business_pct:       parsed.book_new_business_pct,
        book_policies_per_customer:  parsed.book_policies_per_customer,
      }, parsed)
    } catch (err) {
      setStatus("error")
      setErrorMsg(
        err instanceof Error
          ? `Parse failed: ${err.message}`
          : "Failed to parse the PDF. The file may be encrypted or in an unsupported format."
      )
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

  return (
    <div className="rounded-lg border border-dashed border-border">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {status === "idle" && (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer items-center gap-3 rounded-lg p-4 transition-colors hover:bg-secondary/30"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Upload className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Upload Book of Business Detail</p>
            <p className="text-xs text-muted-foreground">
              EZLynx Book of Business Detail PDF — AI auto-fills new business %, policies/customer, avg premium
            </p>
          </div>
        </div>
      )}

      {status === "loading" && (
        <div className="flex items-center gap-3 p-4">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            AI is reading {fileName}... (10–20 sec)
          </p>
        </div>
      )}

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

      {status === "success" && result && (
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  <FileText className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                  {fileName}
                  {result.statementMonth && (
                    <span className="ml-2 text-xs text-muted-foreground">({result.statementMonth})</span>
                  )}
                </p>
                <p className="text-xs text-success">
                  <Sparkles className="mr-1 inline h-3 w-3" />
                  Book of Business parsed · {result.format && `Format ${result.format}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setExpanded(v => !v)}
              >
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Details
              </Button>
              <Button variant="ghost" size="sm" onClick={reset} className="h-7 w-7 p-0">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {result.totalWrittenPremium != null && (
              <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                Written Premium: <strong>{fmt$(result.totalWrittenPremium)}</strong>
              </span>
            )}
            {result.totalPolicies != null && result.totalPolicies > 0 && (
              <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                Policies: <strong>{result.totalPolicies}</strong>
              </span>
            )}
            {result.totalCustomers != null && result.totalCustomers > 0 && (
              <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                Customers: <strong>{result.totalCustomers}</strong>
              </span>
            )}
            {result.book_policies_per_customer != null && (
              <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                Policies/Customer: <strong>{result.book_policies_per_customer.toFixed(2)}</strong>
              </span>
            )}
            {result.book_new_business_pct != null && (
              <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                New Business: <strong>{result.book_new_business_pct.toFixed(1)}%</strong>
              </span>
            )}
            {result.book_avg_premium_per_policy != null && (
              <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                Avg Premium/Policy: <strong>{fmt$(result.book_avg_premium_per_policy)}</strong>
              </span>
            )}
          </div>

          {expanded && result.carrierBreakdown && result.carrierBreakdown.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Carrier</th>
                    <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Written Prem</th>
                    <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Policies</th>
                    <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">NB</th>
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
          )}
        </div>
      )}
    </div>
  )
}
