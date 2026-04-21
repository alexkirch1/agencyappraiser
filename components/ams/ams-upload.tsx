"use client"

import { useState, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2, Sparkles, ShieldCheck } from "lucide-react"
import type { AmsInputs } from "./ams-engine"

interface Props {
  onParsed: (fields: Partial<AmsInputs>) => void
}

const ADMIN_TOKEN_KEY = "admin_session_token"

async function parseWithAI(file: File): Promise<{ parsed: Partial<AmsInputs>; fieldsFound: number; confidence?: number }> {
  const formData = new FormData()
  formData.append("file", file)

  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null
  const res = await fetch("/api/parse-ams-report", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(err.error || `Server error ${res.status}`)
  }

  return res.json()
}

export function AmsUpload({ onParsed }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [fileName, setFileName] = useState("")
  const [fieldsFound, setFieldsFound] = useState(0)
  const [confidence, setConfidence] = useState(0)
  const [errorMsg, setErrorMsg] = useState("")
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    const isPDF = file.name.toLowerCase().endsWith(".pdf")
    const isCSV = file.name.toLowerCase().endsWith(".csv")
    if (!isPDF && !isCSV) {
      setStatus("error")
      setErrorMsg("Please upload a PDF or CSV export from EZLynx.")
      return
    }

    setStatus("loading")
    setFileName(file.name)
    setErrorMsg("")

    try {
      const data = await parseWithAI(file)
      const { parsed, fieldsFound: count } = data

      if (count === 0) {
        setStatus("error")
        setErrorMsg("The AI could not extract any fields from this report. Make sure you are uploading an EZLynx Agency Summary, Production Report, or Commission Report. You can fill in the fields manually below.")
      } else {
        const conf = typeof data.confidence === "number" ? Math.min(99, data.confidence) : Math.min(98, Math.round((count / 12) * 78 + 20))
        setFieldsFound(count)
        setConfidence(conf)
        setMeta((data as Record<string, unknown>).meta as Record<string, unknown> ?? null)
        setStatus("success")
        onParsed(parsed)
      }
    } catch (err) {
      setStatus("error")
      setErrorMsg(
        err instanceof Error
          ? `Parse failed: ${err.message}. You can still fill in the fields manually.`
          : "Failed to parse the report. You can still fill in the fields manually."
      )
    }
  }, [onParsed])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const reset = () => {
    setStatus("idle")
    setFileName("")
    setFieldsFound(0)
    setMeta(null)
    setErrorMsg("")
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <Card className="border-dashed border-border bg-card">
      <CardContent className="pt-5">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.csv"
          className="hidden"
          onChange={handleChange}
        />

        {status === "idle" && (
          <>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-secondary/30"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Upload EZLynx Agency Summary or Production Report</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Export from EZLynx and drag and drop, or click to browse. AI will auto-fill the fields below.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" />
              <span>Your report is processed securely and never stored or shared.</span>
            </div>
          </>
        )}

        {status === "loading" && (
          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Reading {fileName}...</p>
              <p className="text-xs text-muted-foreground">AI is extracting your agency data — this takes 10–20 seconds</p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col gap-3 rounded-lg border border-success/30 bg-success/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    <FileText className="mr-1.5 inline h-4 w-4 text-muted-foreground" />
                    {fileName}
                  </p>
                  <p className="text-xs text-success">
                    <Sparkles className="mr-1 inline h-3 w-3" />
                    {fieldsFound} field{fieldsFound !== 1 ? "s" : ""} computed from report data
                    <span className={`ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      confidence >= 70 ? "bg-success/15 text-success" :
                      confidence >= 45 ? "bg-warning/15 text-warning" :
                      "bg-destructive/15 text-destructive"
                    }`}>
                      {confidence}% confidence
                    </span>
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} className="h-8 w-8 shrink-0 p-0">
                <X className="h-4 w-4" />
                <span className="sr-only">Remove file</span>
              </Button>
            </div>

            {/* Meta breakdown — only for deterministic Book of Business parses */}
            {meta && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-success/20 pt-3 sm:grid-cols-3">
                {(meta.active_rows as number) > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Active Policies</p>
                    <p className="text-sm font-semibold text-foreground">{(meta.active_rows as number).toLocaleString()}</p>
                  </div>
                )}
                {(meta.pl_policies as number) > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Personal Lines</p>
                    <p className="text-sm font-semibold text-foreground">{(meta.pl_policies as number).toLocaleString()} policies</p>
                  </div>
                )}
                {(meta.cl_policies as number) > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Commercial Lines</p>
                    <p className="text-sm font-semibold text-foreground">{(meta.cl_policies as number).toLocaleString()} policies</p>
                  </div>
                )}
                {(meta.new_biz_count as number) > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">New Business</p>
                    <p className="text-sm font-semibold text-foreground">{(meta.new_biz_count as number).toLocaleString()} policies</p>
                  </div>
                )}
                {(meta.renewed_count as number) > 0 && (meta.total_expiring as number) > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Renewals</p>
                    <p className="text-sm font-semibold text-foreground">
                      {(meta.renewed_count as number).toLocaleString()} / {(meta.total_expiring as number).toLocaleString()}
                    </p>
                  </div>
                )}
                {Array.isArray(meta.top_lobs) && meta.top_lobs.length > 0 && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Top Lines of Business</p>
                    <p className="text-xs text-foreground">{(meta.top_lobs as string[]).join(" · ")}</p>
                  </div>
                )}
                {meta.revenue_is_estimated && (
                  <p className="col-span-2 text-[10px] text-muted-foreground sm:col-span-3">
                    * Revenue is estimated from commission rates — review and adjust in the form below.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {fileName ? `Could not parse ${fileName}` : "Upload failed"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{errorMsg}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={reset} className="self-start">
              Try another file
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
