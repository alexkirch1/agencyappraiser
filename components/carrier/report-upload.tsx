"use client"

import { useState, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react"
import type { CarrierName, CarrierInputs } from "./carrier-engine"
import { parseCarrierReport } from "./carrier-report-parser"

interface Props {
  carrier: CarrierName
  onParsed: (fields: Partial<CarrierInputs>) => void
}

async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist")
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ""

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    // Group text items by their Y position (row) so we preserve row structure.
    // Items within 3px of each other vertically are considered the same row.
    const items = content.items.filter(
      (item): item is typeof item & { str: string; transform: number[] } => "str" in item && item.str.trim() !== ""
    )

    // Sort by Y descending (top of page first), then X ascending (left to right)
    items.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5]
      if (Math.abs(yDiff) > 3) return yDiff
      return a.transform[4] - b.transform[4]
    })

    // Group into rows by Y proximity
    const rows: string[][] = []
    let currentRow: { y: number; strs: string[] } | null = null
    for (const item of items) {
      const y = item.transform[5]
      if (!currentRow || Math.abs(currentRow.y - y) > 3) {
        currentRow = { y, strs: [item.str] }
        rows.push(currentRow.strs)
      } else {
        currentRow.strs.push(item.str)
      }
    }

    // Join each row's items with a space, rows separated by newline
    const pageText = rows.map(r => r.join(" ")).join("\n")
    fullText += pageText + "\n"

    console.log("[v0] Page", i, "text:\n", pageText)
  }

  console.log("[v0] Full PDF text:\n", fullText)
  return fullText
}

const carrierReportNames: Record<CarrierName, string> = {
  progressive: "Account Production Report",
  travelers:   "PI Production Report",
  hartford:    "Partner Breakdown Report",
  safeco:      "Agency Development Profile (ADP)",
}

export function ReportUpload({ carrier, onParsed }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [fileName, setFileName] = useState("")
  const [fieldsFound, setFieldsFound] = useState(0)
  const [confidence, setConfidence] = useState(0)
  const [errorMsg, setErrorMsg] = useState("")
  const [rawPreview, setRawPreview] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setStatus("error")
        setErrorMsg("Please upload a PDF file.")
        return
      }

      setStatus("loading")
      setFileName(file.name)
      setErrorMsg("")

      try {
        const text = await extractTextFromPDF(file)
        const parsed = parseCarrierReport(text, carrier)
        const count = Object.values(parsed).filter(
          (v) => v !== null && v !== undefined && v !== ""
        ).length

        if (count === 0) {
          setStatus("error")
          setRawPreview(text.split("\n").slice(0, 60).join("\n"))
          setErrorMsg(
            "Could not extract any fields from this PDF. Make sure you are uploading the correct report type for this carrier. You can still fill in the fields manually."
          )
        } else {
          // Estimate confidence based on fields found vs expected
          const expectedFields: Record<string, number> = {
            progressive: 7,
            travelers:   8,
            hartford:    9,
            safeco:      10,
          }
          const expected = expectedFields[carrier] || 5
          const conf = Math.min(100, Math.round((count / expected) * 80 + 20))
          setFieldsFound(count)
          setConfidence(conf)
          setStatus("success")
          onParsed(parsed)
        }
      } catch {
        setStatus("error")
        setErrorMsg(
          "Failed to parse the PDF. The file may be encrypted or in an unsupported format. You can still fill in the fields manually."
        )
      }
    },
    [carrier, onParsed]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const reset = () => {
    setStatus("idle")
    setFileName("")
    setFieldsFound(0)
    setErrorMsg("")
    setRawPreview("")
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <Card className="border-dashed border-border bg-card">
      <CardContent className="pt-6">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleChange}
        />

        {status === "idle" && (
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
              <p className="text-sm font-medium text-foreground">
                Upload {carrierReportNames[carrier]}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Drag and drop a PDF or click to browse. Fields will auto-fill.
              </p>
            </div>
          </div>
        )}

        {status === "loading" && (
          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Parsing {fileName}...</p>
              <p className="text-xs text-muted-foreground">Extracting carrier data from your report</p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/5 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  <FileText className="mr-1.5 inline h-4 w-4 text-muted-foreground" />
                  {fileName}
                </p>
                <p className="text-xs text-success">
                  {fieldsFound} field{fieldsFound !== 1 ? "s" : ""} auto-filled from report
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
            <Button variant="ghost" size="sm" onClick={reset} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
              <span className="sr-only">Remove file</span>
            </Button>
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
            {rawPreview && (
              <details className="rounded-md border border-border bg-secondary/30">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                  Show extracted text (for support)
                </summary>
                <pre className="max-h-48 overflow-auto px-3 py-2 text-[10px] leading-4 text-muted-foreground whitespace-pre-wrap">
                  {rawPreview}
                </pre>
              </details>
            )}
            <Button variant="outline" size="sm" onClick={reset} className="self-start">
              Try another file
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
