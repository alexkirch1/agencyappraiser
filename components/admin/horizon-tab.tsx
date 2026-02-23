"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Upload, FileText, Search, ChevronLeft, ChevronRight, FolderKanban, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Deal } from "./admin-dashboard"
import { ValuationReport } from "./valuation-report"

// ----- Type definitions -----
interface CommItem {
  id: string
  policy_number: string
  commission: number
  month: string
  file: string
  client_name: string
  raw_line: string
  producer: string
  carrier: string
  lob: string
  trans_type: string
  premium: number
}

interface PolicyState {
  headers: string[]
  data: string[][]
  loaded: boolean
  excludedIndices: Set<number>
  stats: { totalPrem: number }
}

interface CommState {
  data: CommItem[]
  files: Record<string, number>
  loaded: boolean
  seen: Set<string>
}

// ----- Utilities (ported from PHP) -----
function cleanNum(val: unknown): number {
  if (typeof val === "number") return val
  let s = String(val || "").trim()
  if (!s) return 0
  let isNeg = false
  if (s.includes("(") && s.includes(")")) isNeg = true
  if (s.endsWith("-")) isNeg = true
  if (s.startsWith("-")) isNeg = true
  s = s.replace(/\s+/g, "").replace(/[^0-9.]/g, "")
  const num = parseFloat(s)
  if (isNaN(num)) return 0
  if (num > 500000) return 0
  return isNeg ? -num : num
}

function normalizePolicy(val: unknown): string {
  let s = String(val || "").trim().toUpperCase()
  s = s.replace(/[^A-Z0-9]/g, "")
  s = s.replace(/^0+/, "")
  return s
}

function formatCurrency(num: number): string {
  return "$" + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function extractDateFromFilename(filename: string): string | null {
  const match = filename.match(
    /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-_]*20[2-3]\d|20[2-3]\d[\s\-_]*(?:0[1-9]|1[0-2])/i
  )
  if (match) {
    const d = new Date(match[0])
    if (!isNaN(d.getTime())) {
      const y = d.getUTCFullYear()
      const m = d.getUTCMonth() + 1
      return `${y}-${String(m).padStart(2, "0")}`
    }
  }
  const yearFirst = filename.match(/(20[2-3]\d)[.\-_](0[1-9]|1[0-2])/)
  if (yearFirst) return `${yearFirst[1]}-${yearFirst[2]}`
  const simpleMatch = filename.match(/(0[1-9]|1[0-2])[.\-_](20[2-3]\d)/)
  if (simpleMatch) return `${simpleMatch[2]}-${simpleMatch[1]}`
  return null
}

// ----- Auto-map columns -----
function autoMapColumns(headers: string[]): Record<string, number> {
  const mapRules: Record<string, string[]> = {
    policy: ["Policy Data Policy Number", "policy", "pol#", "number", "ref"],
    premium: ["Policy Data Premium - Annualized", "premium", "annualized", "prem"],
    carrier: ["Policy Data Master Company", "carrier", "company", "insurer"],
    account: ["Applicant Data Account Name", "insured", "account", "name", "client"],
    effective: ["Policy Data Effective Date", "eff", "start", "inception"],
    expiration: ["Policy Expiration Date", "exp", "end", "term"],
    type: ["Policy Type", "status", "trans", "type"],
  }
  const result: Record<string, number> = {}
  for (const [key, keywords] of Object.entries(mapRules)) {
    let foundIndex = -1
    for (const k of keywords) {
      const idx = headers.findIndex(
        (h) => h && h.toString().toLowerCase().includes(k.toLowerCase())
      )
      if (idx !== -1) {
        foundIndex = idx
        break
      }
    }
    result[key] = foundIndex
  }
  return result
}

interface HorizonTabProps {
  deals: Deal[]
  onSaveDeal: (deal: Deal) => void
  onUpdateDeal: (id: string, updates: Partial<Deal>) => void
}

export function HorizonTab({ deals, onSaveDeal }: HorizonTabProps) {
  // --- Form state ---
  const [showForm, setShowForm] = useState(false)
  const [dealName, setDealName] = useState("")
  const [dealType, setDealType] = useState<"full" | "book">("full")

  // --- Policy list state ---
  const [policy, setPolicy] = useState<PolicyState>({
    headers: [],
    data: [],
    loaded: false,
    excludedIndices: new Set(),
    stats: { totalPrem: 0 },
  })
  const [columnMap, setColumnMap] = useState<Record<string, number>>({})
  const [policySearch, setPolicySearch] = useState("")

  // --- Commission state ---
  const [comm, setComm] = useState<CommState>({
    data: [],
    files: {},
    loaded: false,
    seen: new Set(),
  })
  const [logMessages, setLogMessages] = useState<string[]>(["Waiting for files..."])
  const [policyPage, setPolicyPage] = useState(0)
  const [commPage, setCommPage] = useState(0)
  const [commFileFilter, setCommFileFilter] = useState<string | null>(null)
  const ROWS_PER_PAGE = 100

  // --- Financial inputs ---
  const [finRevenue, setFinRevenue] = useState(0)
  const [finOpex, setFinOpex] = useState(0)
  const [finOwnerComp, setFinOwnerComp] = useState(0)
  const [finAddbacks, setFinAddbacks] = useState(0)

  // --- Valuation state ---
  const [valuationMultiple, setValuationMultiple] = useState(1.5)
  const [factorLoss, setFactorLoss] = useState(0)
  const [factorCarrier, setFactorCarrier] = useState(0)
  const [saving, setSaving] = useState(false)

  // Refs
  const policyFileRef = useRef<HTMLInputElement>(null)
  const commFileRef = useRef<HTMLInputElement>(null)

  // ----- Derived values -----
  const ebitda = finRevenue - finOpex + finOwnerComp + finAddbacks
  const baseRevenue = finRevenue || calculateBaseRevenue()
  const currentValuation = baseRevenue * valuationMultiple

  function calculateBaseRevenue(): number {
    if (!comm.loaded || comm.data.length === 0) return 0
    const totalComm = comm.data.reduce((sum, c) => sum + c.commission, 0)

    if (!policy.loaded) return totalComm

    const polIdx = columnMap.policy ?? -1
    if (polIdx === -1) return totalComm

    const policySet = new Set<string>()
    policy.data.forEach((row, i) => {
      if (!policy.excludedIndices.has(i)) {
        const pNorm = normalizePolicy(row[polIdx])
        if (pNorm) policySet.add(pNorm)
      }
    })

    const premIdx = columnMap.premium ?? -1
    const aggregatedComms: Record<string, { total: number; claimed: boolean }> = {}
    comm.data.forEach((c) => {
      const p = normalizePolicy(c.policy_number)
      if (!aggregatedComms[p]) aggregatedComms[p] = { total: 0, claimed: false }
      aggregatedComms[p].total += c.commission
    })

    let totalVerifiedCash = 0
    let totalUnmatchedProjected = 0

    policy.data.forEach((row, i) => {
      if (policy.excludedIndices.has(i)) return
      const pNorm = normalizePolicy(row[polIdx])
      const premium = premIdx > -1 ? cleanNum(row[premIdx]) : 0

      if (aggregatedComms[pNorm] && !aggregatedComms[pNorm].claimed) {
        totalVerifiedCash += aggregatedComms[pNorm].total
        aggregatedComms[pNorm].claimed = true
      } else {
        totalUnmatchedProjected += premium * 0.1
      }
    })

    return totalVerifiedCash + totalUnmatchedProjected
  }

  // ----- Log helper -----
  const log = useCallback((msg: string) => {
    setLogMessages((prev) => [...prev, msg])
  }, [])

  // ----- Handle Policy Upload -----
  const handlePolicyUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      log(`Reading Client List: ${file.name}...`)

      const XLSX = await import("xlsx")
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target?.result, { type: "array" })
          let json: unknown[][] = []
          for (let i = 0; i < wb.SheetNames.length; i++) {
            const ws = wb.Sheets[wb.SheetNames[i]]
            const tempJson = XLSX.utils.sheet_to_json<unknown[]>(ws, {
              header: 1,
              defval: "",
            })
            if (tempJson.length > 5) {
              json = tempJson
              break
            }
          }
          if (json.length === 0) {
            alert("Empty file.")
            return
          }

          // Find header row
          let headerIdx = 0
          for (let i = 0; i < Math.min(30, json.length); i++) {
            const rowStr = JSON.stringify(json[i]).toLowerCase()
            if (rowStr.includes("policy") || rowStr.includes("prem")) {
              headerIdx = i
              break
            }
          }

          const headers = (json[headerIdx] as string[]).map(String)
          const data = json.slice(headerIdx + 1).map((row) =>
            (row as string[]).map(String)
          )
          const mapping = autoMapColumns(headers)

          // Calculate total premium
          let totalPrem = 0
          const premIdx = mapping.premium ?? -1
          if (premIdx > -1) {
            data.forEach((row) => {
              totalPrem += cleanNum(row[premIdx])
            })
          }

          setPolicy({
            headers,
            data,
            loaded: true,
            excludedIndices: new Set(),
            stats: { totalPrem },
          })
          setColumnMap(mapping)
          setFinRevenue(0) // will be calculated from comm data

          log(`Loaded ${data.length} policies from ${file.name}.`)
        } catch (err) {
          alert("Error parsing file: " + (err as Error).message)
        }
      }
      reader.readAsArrayBuffer(file)
    },
    [log]
  )

  // ----- Parse a single PDF row for commission data -----
  function parsePdfRow(lineStr: string, pageNum: number, fileDate: string, fileName: string): CommItem | null {
    if (lineStr.length < 10) return null
    // Skip header-like rows
    const lower = lineStr.toLowerCase()
    if (
      lower.includes("page ") && lower.includes(" of ") ||
      lower.includes("statement date") ||
      lower.includes("commission rate") && lower.includes("policy number") ||
      /^(total|subtotal|grand total)/i.test(lineStr.trim())
    ) return null

    // Find all money values (amounts with decimals like 1,234.56)
    const moneyPattern = /[(-]?\$?\s*(\d{1,3}(?:[,\s]?\d{3})*)\.\d{2}\s*[)CR-]*/gi
    const moneyMatches = [...lineStr.matchAll(moneyPattern)]
    const moneyCandidates = moneyMatches
      .map((match) => ({
        val: cleanNum(match[0]),
        raw: match[0],
        abs: Math.abs(cleanNum(match[0])),
        index: match.index ?? 0,
      }))
      .filter((m) => m.val !== 0 && m.abs < 500000 && m.abs >= 0.01)

    if (moneyCandidates.length === 0) return null

    // Commission is typically the last or smallest money amount on the line
    // If there are multiple amounts, the last one tends to be the commission
    // (premium comes first, then commission)
    let commAmount: typeof moneyCandidates[0]
    let premAmount: typeof moneyCandidates[0] | null = null

    if (moneyCandidates.length >= 2) {
      // Sort by position in line (left to right)
      const sorted = [...moneyCandidates].sort((a, b) => a.index - b.index)
      // Last money value is usually commission, first is usually premium
      commAmount = sorted[sorted.length - 1]
      premAmount = sorted[0]
      // Unless the last one is bigger (then it's premium and the smaller one is commission)
      if (commAmount.abs > premAmount.abs * 3 && premAmount.abs > 0) {
        const temp = commAmount
        commAmount = premAmount
        premAmount = temp
      }
    } else {
      commAmount = moneyCandidates[0]
    }

    // Extract policy number - look for alphanumeric tokens that look like policy numbers
    let cleanLine = lineStr
    moneyCandidates.forEach((m) => {
      cleanLine = cleanLine.replace(m.raw, " __MONEY__ ")
    })
    const tokens = cleanLine.split(/\s+/).filter(t => t !== "__MONEY__" && t.trim())

    let foundPol: string | null = null
    let foundName = ""
    const nameTokens: string[] = []

    for (const t of tokens) {
      const tClean = t.replace(/^[.,\-:()]+|[.,\-:()]+$/g, "")
      if (!tClean) continue

      const hasDigit = /\d/.test(tClean)
      const hasLetter = /[a-zA-Z]/.test(tClean)
      // Skip pure dates like 01/15/2024 or 2024-01-15
      const isDate = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(tClean) ||
                     /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(tClean)
      // Skip pure percentages like 15% or 0.15
      const isPercent = /^\d+\.?\d*%$/.test(tClean)
      // Skip short pure numbers (ages, counts etc)
      const isPureShortNum = /^\d{1,3}$/.test(tClean)

      if (isDate || isPercent || isPureShortNum) continue

      // A policy number typically has digits and is 4+ chars, often mixed with letters
      if (!foundPol && tClean.length >= 4 && hasDigit && (hasLetter || tClean.length >= 6)) {
        foundPol = normalizePolicy(tClean)
      } else if (hasLetter && !hasDigit && tClean.length >= 2) {
        nameTokens.push(tClean)
      }
    }

    foundName = nameTokens.slice(0, 4).join(" ")

    if (!foundPol || commAmount.val === 0) return null

    return {
      id: `${foundPol}_${commAmount.val.toFixed(2)}_${pageNum}`,
      policy_number: foundPol,
      commission: commAmount.val,
      month: fileDate,
      file: fileName,
      client_name: foundName,
      raw_line: lineStr,
      producer: "-",
      carrier: "-",
      lob: "-",
      trans_type: "-",
      premium: premAmount ? premAmount.val : 0,
    }
  }

  // ----- Handle Commission Upload -----
  const handleCommUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length === 0) return

      const XLSX = await import("xlsx")
      const newCommData: CommItem[] = [...comm.data]
      const newSeen = new Set(comm.seen)
      const newFiles: Record<string, number> = { ...comm.files }

      for (const file of files) {
        log(`Scanning ${file.name}...`)
        let fileTotal = 0
        let parsedRows = 0
        let skippedRows = 0
        const fileDate = extractDateFromFilename(file.name) || "Unknown"

        if (file.name.toLowerCase().endsWith(".pdf")) {
          // PDF parsing via pdfjs-dist
          try {
            const pdfjsLib = await import("pdfjs-dist")
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

            const ab = await file.arrayBuffer()
            const pdf = await pdfjsLib.getDocument(new Uint8Array(ab)).promise
            log(`  PDF has ${pdf.numPages} page(s)`)

            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i)
              const textContent = await page.getTextContent()

              // Group text items into rows by Y coordinate
              const rows: Record<number, typeof textContent.items> = {}
              textContent.items.forEach((item) => {
                if (!("transform" in item)) return
                const y = Math.round(item.transform[5])
                // Cluster nearby Y values (within 4px)
                const foundKey = Object.keys(rows).find(
                  (key) => Math.abs(Number(key) - y) <= 4
                )
                if (foundKey) rows[Number(foundKey)].push(item)
                else rows[y] = [item]
              })

              // Sort rows top-to-bottom (highest Y = top of page)
              const sortedYs = Object.keys(rows)
                .map(Number)
                .sort((a, b) => b - a)

              for (const yKey of sortedYs) {
                const rowItems = rows[yKey]
                // Sort items left to right by X coordinate
                rowItems.sort((a, b) => {
                  const ax = "transform" in a ? a.transform[4] : 0
                  const bx = "transform" in b ? b.transform[4] : 0
                  return ax - bx
                })

                const lineStr = rowItems
                  .map((item) => ("str" in item ? item.str : ""))
                  .join("  ")
                  .replace(/\s{3,}/g, "  ")
                  .trim()

                const parsed = parsePdfRow(lineStr, i, fileDate, file.name)
                if (parsed && !newSeen.has(parsed.id)) {
                  newCommData.push(parsed)
                  newSeen.add(parsed.id)
                  fileTotal += parsed.commission
                  parsedRows++
                } else if (lineStr.length >= 10) {
                  skippedRows++
                }
              }
            }
            log(`  Found ${parsedRows} commission records (${skippedRows} rows skipped)`)
          } catch (err) {
            log(`Error parsing PDF: ${(err as Error).message}`)
          }
        } else {
          // Excel / CSV
          try {
            const ab = await file.arrayBuffer()
            const wb = XLSX.read(ab, { type: "array" })

            // Try each sheet
            for (const sheetName of wb.SheetNames) {
              const ws = wb.Sheets[sheetName]
              const rawData = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" })

              // Find the header row -- look for rows with commission-like keywords
              let headerIdx = 0
              for (let i = 0; i < Math.min(20, rawData.length); i++) {
                const rowStr = JSON.stringify(rawData[i]).toLowerCase()
                if (
                  (rowStr.includes("commission") || rowStr.includes("comm") || rowStr.includes("revenue") || rowStr.includes("amount")) &&
                  (rowStr.includes("poli") || rowStr.includes("number") || rowStr.includes("insured") || rowStr.includes("name"))
                ) {
                  headerIdx = i
                  break
                }
              }

              const headers = (rawData[headerIdx] as string[]).map(String)
              const dataRows = rawData.slice(headerIdx + 1)

              // Auto-detect column indices for commission data
              const commColKeywords: Record<string, string[]> = {
                policy: ["policy", "pol#", "pol #", "number", "policy no", "policyno"],
                commission: ["commission", "comm", "comm amt", "comm $", "revenue", "net", "split", "pay", "earned", "agent comm"],
                premium: ["premium", "prem", "written", "annualized", "gross"],
                name: ["insured", "name", "account", "client", "customer", "policyholder"],
                carrier: ["carrier", "company", "master", "insurer"],
                lob: ["lob", "line", "coverage", "class", "type"],
                producer: ["producer", "agent", "csr", "writer"],
                transType: ["trans", "type", "status", "action"],
              }

              const colMap: Record<string, number> = {}
              for (const [key, keywords] of Object.entries(commColKeywords)) {
                for (const kw of keywords) {
                  const idx = headers.findIndex(h =>
                    h.toLowerCase().includes(kw.toLowerCase())
                  )
                  if (idx !== -1 && colMap[key] === undefined) {
                    colMap[key] = idx
                    break
                  }
                }
              }

              // Need at minimum a commission column
              if (colMap.commission === undefined) {
                log(`  Sheet "${sheetName}": No commission column found in headers.`)
                continue
              }

              log(`  Sheet "${sheetName}": Mapped cols - pol:${colMap.policy ?? "?"} comm:${colMap.commission ?? "?"} prem:${colMap.premium ?? "?"} name:${colMap.name ?? "?"}`)

              for (let idx = 0; idx < dataRows.length; idx++) {
                const row = (dataRows[idx] as string[]).map(String)
                const val = cleanNum(row[colMap.commission])
                if (val === 0 || Math.abs(val) > 500000) continue

                const polNum = colMap.policy !== undefined ? normalizePolicy(row[colMap.policy]) : `ROW${idx}`
                const clientName = colMap.name !== undefined ? row[colMap.name] : ""
                const premium = colMap.premium !== undefined ? cleanNum(row[colMap.premium]) : 0
                const carrier = colMap.carrier !== undefined ? row[colMap.carrier] : "-"
                const lob = colMap.lob !== undefined ? row[colMap.lob] : "-"
                const producer = colMap.producer !== undefined ? row[colMap.producer] : "-"
                const transType = colMap.transType !== undefined ? row[colMap.transType] : "-"

                const uID = `${polNum}_${val.toFixed(2)}_${idx}_${sheetName}`
                if (!newSeen.has(uID)) {
                  newCommData.push({
                    id: uID,
                    policy_number: polNum,
                    commission: val,
                    month: fileDate,
                    file: file.name,
                    client_name: clientName,
                    raw_line: row.join(" | "),
                    producer,
                    carrier,
                    lob,
                    trans_type: transType,
                    premium,
                  })
                  newSeen.add(uID)
                  fileTotal += val
                  parsedRows++
                }
              }

              if (parsedRows > 0) break // found data in this sheet
            }
            log(`  Found ${parsedRows} commission records from Excel`)
          } catch (err) {
            log(`Error parsing Excel: ${(err as Error).message}`)
          }
        }

        newFiles[file.name] = fileTotal
        log(`Scanned ${file.name}: ${formatCurrency(fileTotal)} total from ${parsedRows} records`)
      }

      setComm({
        data: newCommData,
        files: newFiles,
        loaded: true,
        seen: newSeen,
      })

      // Auto-fill revenue from comm data
      const totalCommRevenue = newCommData.reduce((sum, c) => sum + c.commission, 0)
      if (finRevenue === 0) {
        setFinRevenue(totalCommRevenue)
      }
    },
    [comm, log, finRevenue]
  )

  // ----- Save Deal -----
  const handleSave = () => {
    console.log("[v0] handleSave triggered, dealName:", dealName, "valuation:", currentValuation)
    if (!dealName.trim()) {
      alert("Please enter a deal name.")
      return
    }
    setSaving(true)

    const deal: Deal = {
      id: `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      deal_name: dealName,
      deal_type: dealType,
      valuation: currentValuation,
      premium_base: baseRevenue,
      status: "active",
      date_saved: new Date().toISOString(),
      details: {
        finRevenue,
        finOpex,
        finOwnerComp,
        finAddbacks,
        ebitda,
        multiple: valuationMultiple,
        factorLoss,
        factorCarrier,
        policyCount: policy.data.length,
        commRecords: comm.data.length,
      },
    }

    onSaveDeal(deal)
    setSaving(false)
    resetForm()
    setShowForm(false)
  }

  const resetForm = () => {
    setDealName("")
    setDealType("full")
    setPolicy({ headers: [], data: [], loaded: false, excludedIndices: new Set(), stats: { totalPrem: 0 } })
    setColumnMap({})
    setComm({ data: [], files: {}, loaded: false, seen: new Set() })
    setLogMessages(["Waiting for files..."])
    setFinRevenue(0)
    setFinOpex(0)
    setFinOwnerComp(0)
    setFinAddbacks(0)
    setValuationMultiple(1.5)
    setFactorLoss(0)
    setFactorCarrier(0)
    setPolicySearch("")
  }

  // ----- Filtered policy rows -----
  const filteredPolicies = policy.data.filter((row) => {
    if (!policySearch) return true
    return row.some((cell) =>
      String(cell).toLowerCase().includes(policySearch.toLowerCase())
    )
  })

  // ----- List View (no form open) -----
  if (!showForm) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Horizon Pipeline</h2>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Deal
          </Button>
        </div>

        {deals.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <FolderKanban className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No deals in the pipeline. Click "New Deal" to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {deals.map((deal) => (
              <Card key={deal.id} className="border-border">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-bold text-foreground">{deal.deal_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {deal.deal_type.toUpperCase()} |{" "}
                      {new Date(deal.date_saved).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-lg font-extrabold text-success">
                    {formatCurrency(deal.valuation)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ----- Form View -----
  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowForm(false)}
        className="mb-4 text-muted-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back to Pipeline
      </Button>

      <Card className="border-border">
        <CardContent className="p-6 lg:p-8">
          {/* Step 1: Deal Info */}
          <div className="mb-10 border-b border-border pb-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </span>
              <h3 className="text-lg font-bold text-foreground">Deal Information</h3>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-foreground">Deal Name</label>
              <Input
                value={dealName}
                onChange={(e) => setDealName(e.target.value)}
                placeholder="e.g., Smith Insurance Agency"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDealType("full")}
                className={cn(
                  "flex flex-col items-center rounded-xl border-2 p-6 transition-all",
                  dealType === "full"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <span className="text-base font-bold text-foreground">Full Agency</span>
                <span className="text-xs text-muted-foreground">Complete acquisition</span>
              </button>
              <button
                onClick={() => setDealType("book")}
                className={cn(
                  "flex flex-col items-center rounded-xl border-2 p-6 transition-all",
                  dealType === "book"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <span className="text-base font-bold text-foreground">Book Only</span>
                <span className="text-xs text-muted-foreground">Book of business</span>
              </button>
            </div>
          </div>

          {/* Step 2: Upload Policy List */}
          <div className="mb-10 border-b border-border pb-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </span>
              <h3 className="text-lg font-bold text-foreground">Upload Client / Policy List</h3>
            </div>

            <button
              onClick={() => policyFileRef.current?.click()}
              className={cn(
                "w-full rounded-xl border-2 border-dashed p-8 text-center transition-all",
                policy.loaded
                  ? "border-success bg-success/5"
                  : "border-border bg-secondary/30 hover:border-primary"
              )}
            >
              <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="font-semibold text-foreground">
                {policy.loaded
                  ? `Loaded ${policy.data.length} policies`
                  : "Upload Policy List (Excel / CSV)"}
              </p>
              <p className="text-xs text-muted-foreground">
                {policy.loaded
                  ? `Total Premium: ${formatCurrency(policy.stats.totalPrem)}`
                  : "System auto-maps columns"}
              </p>
            </button>
            <input
              ref={policyFileRef}
              type="file"
              accept=".xlsx,.csv,.xls"
              className="hidden"
              onChange={handlePolicyUpload}
            />

            {/* Policy Table Preview */}
            {policy.loaded && policy.data.length > 0 && (() => {
              const totalPolicyPages = Math.ceil(filteredPolicies.length / ROWS_PER_PAGE)
              const policySlice = filteredPolicies.slice(policyPage * ROWS_PER_PAGE, (policyPage + 1) * ROWS_PER_PAGE)
              return (
                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={policySearch}
                      onChange={(e) => { setPolicySearch(e.target.value); setPolicyPage(0) }}
                      placeholder="Search policies..."
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="max-h-[420px] overflow-auto rounded-lg border border-border">
                    <table className="w-full min-w-[600px] text-xs">
                      <thead>
                        <tr>
                          <th className="sticky top-0 z-10 border-b-2 border-border bg-secondary px-3 py-2 text-left font-semibold text-muted-foreground">
                            Use
                          </th>
                          {policy.headers.slice(0, 6).map((h, i) => (
                            <th
                              key={i}
                              className="sticky top-0 z-10 whitespace-nowrap border-b-2 border-border bg-secondary px-3 py-2 text-left font-semibold text-muted-foreground"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {policySlice.map((row) => {
                          const origIdx = policy.data.indexOf(row)
                          const excluded = policy.excludedIndices.has(origIdx)
                          return (
                            <tr
                              key={origIdx}
                              className={cn(
                                "border-b border-border transition-colors",
                                excluded && "opacity-30 line-through",
                                !excluded && "hover:bg-secondary/50"
                              )}
                            >
                              <td className="px-3 py-1.5">
                                <input
                                  type="checkbox"
                                  checked={!excluded}
                                  onChange={() => {
                                    const next = new Set(policy.excludedIndices)
                                    if (excluded) next.delete(origIdx)
                                    else next.add(origIdx)
                                    setPolicy((prev) => ({
                                      ...prev,
                                      excludedIndices: next,
                                    }))
                                  }}
                                />
                              </td>
                              {row.slice(0, 6).map((cell, ci) => (
                                <td
                                  key={ci}
                                  className="whitespace-nowrap px-3 py-1.5 text-foreground"
                                >
                                  {cell || ""}
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {policyPage * ROWS_PER_PAGE + 1}--{Math.min((policyPage + 1) * ROWS_PER_PAGE, filteredPolicies.length)} of {filteredPolicies.length} policies
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={policyPage === 0}
                        onClick={() => setPolicyPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Prev
                      </Button>
                      <span className="px-2 text-xs text-muted-foreground">
                        {policyPage + 1} / {totalPolicyPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={policyPage >= totalPolicyPages - 1}
                        onClick={() => setPolicyPage(p => p + 1)}
                      >
                        Next
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Step 3: Upload Commission Statements */}
          <div className="mb-10 border-b border-border pb-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                3
              </span>
              <h3 className="text-lg font-bold text-foreground">
                Upload Commission Statements
              </h3>
            </div>

            <button
              onClick={() => commFileRef.current?.click()}
              className={cn(
                "w-full rounded-xl border-2 border-dashed p-8 text-center transition-all",
                comm.loaded
                  ? "border-success bg-success/5"
                  : "border-border bg-secondary/30 hover:border-primary"
              )}
            >
              <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="font-semibold text-foreground">
                {comm.loaded
                  ? `${Object.keys(comm.files).length} files uploaded`
                  : "Upload Commission Statements (PDF / Excel)"}
              </p>
              <p className="text-xs text-muted-foreground">
                {comm.loaded
                  ? `${comm.data.length} records parsed`
                  : "System scans PDFs and auto-detects dates"}
              </p>
            </button>
            <input
              ref={commFileRef}
              type="file"
              accept=".pdf,.xlsx,.csv,.xls"
              multiple
              className="hidden"
              onChange={handleCommUpload}
            />

            {/* Commission Files List -- clickable to filter */}
            {Object.keys(comm.files).length > 0 && (
              <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3">
                <p className="mb-2 text-xs font-bold text-muted-foreground">
                  Uploaded Commission Files (click to filter):
                </p>
                <button
                  onClick={() => { setCommFileFilter(null); setCommPage(0) }}
                  className={cn(
                    "mb-1 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors",
                    commFileFilter === null ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-secondary"
                  )}
                >
                  <span>All Files</span>
                  <span className="font-mono">{formatCurrency(Object.values(comm.files).reduce((s, t) => s + t, 0))}</span>
                </button>
                {Object.entries(comm.files).map(([fname, total]) => (
                  <button
                    key={fname}
                    onClick={() => { setCommFileFilter(fname); setCommPage(0) }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors",
                      commFileFilter === fname ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-secondary"
                    )}
                  >
                    <span className="truncate text-left">{fname}</span>
                    <span className="ml-2 shrink-0 font-mono font-bold">{formatCurrency(total)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Stats Panel */}
            {comm.loaded && comm.data.length > 0 && policy.loaded && (() => {
              const polIdx = columnMap.policy ?? -1
              const premIdx = columnMap.premium ?? -1
              const effIdx = columnMap.effective ?? -1
              const expIdx = columnMap.expiration ?? -1
              const typeIdx = columnMap.type ?? -1

              // Build policy set
              const policyNumbers = new Set<string>()
              const activePolicies: string[][] = []
              policy.data.forEach((row, i) => {
                if (!policy.excludedIndices.has(i)) {
                  const pNorm = polIdx >= 0 ? normalizePolicy(row[polIdx]) : ""
                  if (pNorm) policyNumbers.add(pNorm)
                  activePolicies.push(row)
                }
              })

              // Build comm policy set
              const commPolicySet = new Set<string>()
              let matchedCommTotal = 0
              let unmatchedCommTotal = 0
              comm.data.forEach(c => {
                const normP = normalizePolicy(c.policy_number)
                commPolicySet.add(normP)
                if (policyNumbers.has(normP)) matchedCommTotal += c.commission
                else unmatchedCommTotal += c.commission
              })

              const matchedPolicies = [...policyNumbers].filter(p => commPolicySet.has(p)).length
              const unmatchedPolicies = policyNumbers.size - matchedPolicies
              const matchRate = policyNumbers.size > 0 ? ((matchedPolicies / policyNumbers.size) * 100) : 0

              // Retention: policies with type containing "renew" or effective date in past
              let renewals = 0
              let newBiz = 0
              activePolicies.forEach(row => {
                const typeStr = typeIdx >= 0 ? String(row[typeIdx]).toLowerCase() : ""
                if (typeStr.includes("renew") || typeStr.includes("ren") || typeStr.includes("renewal")) {
                  renewals++
                } else if (typeStr.includes("new") || typeStr.includes("nb") || typeStr.includes("new business")) {
                  newBiz++
                }
              })
              // If no type data, estimate from effective dates
              if (renewals === 0 && newBiz === 0 && effIdx >= 0) {
                const now = new Date()
                const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
                activePolicies.forEach(row => {
                  const effDate = new Date(row[effIdx])
                  if (!isNaN(effDate.getTime())) {
                    if (effDate > oneYearAgo) newBiz++
                    else renewals++
                  }
                })
              }
              const retentionRate = (renewals + newBiz) > 0 ? ((renewals / (renewals + newBiz)) * 100) : 0
              const newPolicyRate = (renewals + newBiz) > 0 ? ((newBiz / (renewals + newBiz)) * 100) : 0

              // Total premium
              let totalPrem = 0
              if (premIdx >= 0) {
                activePolicies.forEach(row => { totalPrem += cleanNum(row[premIdx]) })
              }

              // Commission match $ stats
              const totalCommission = comm.data.reduce((s, c) => s + c.commission, 0)

              return (
                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <p className="text-xs font-bold text-foreground">Book Analytics</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-lg font-extrabold text-primary">{matchedPolicies}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Matched Policies</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-lg font-extrabold text-warning">{unmatchedPolicies}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Unmatched Policies</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-lg font-extrabold text-success">{matchRate.toFixed(1)}%</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Match Rate</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-lg font-extrabold text-foreground">{retentionRate > 0 ? retentionRate.toFixed(1) + "%" : "N/A"}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Retention Rate</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-lg font-extrabold text-foreground">{newPolicyRate > 0 ? newPolicyRate.toFixed(1) + "%" : "N/A"}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">New Policy Rate</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-lg font-extrabold text-success">{formatCurrency(matchedCommTotal)}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Matched Comm $</p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-lg font-extrabold text-foreground">{formatCurrency(totalCommission)}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Total Commission</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-lg font-extrabold text-warning">{formatCurrency(unmatchedCommTotal)}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Unmatched Comm $</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-lg font-extrabold text-foreground">{formatCurrency(totalPrem)}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Total Premium</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Commission Data Table with pagination */}
            {comm.loaded && comm.data.length > 0 && (() => {
              const filteredComm = commFileFilter
                ? comm.data.filter(c => c.file === commFileFilter)
                : comm.data
              const totalCommPages = Math.ceil(filteredComm.length / ROWS_PER_PAGE)
              const commSlice = filteredComm.slice(commPage * ROWS_PER_PAGE, (commPage + 1) * ROWS_PER_PAGE)

              // Pre-build policy lookup set
              const polIdx = columnMap.policy ?? -1
              const policySet = new Set<string>()
              if (policy.loaded && polIdx >= 0) {
                policy.data.forEach((row, i) => {
                  if (!policy.excludedIndices.has(i)) {
                    const pNorm = normalizePolicy(row[polIdx])
                    if (pNorm) policySet.add(pNorm)
                  }
                })
              }

              return (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground">
                      Commission Records ({filteredComm.length}{commFileFilter ? ` from ${commFileFilter}` : ""})
                    </p>
                  </div>
                  <div className="max-h-[420px] overflow-auto rounded-lg border border-border">
                    <table className="w-full min-w-[700px] text-xs">
                      <thead>
                        <tr>
                          {policy.loaded && (
                            <th className="sticky top-0 z-10 border-b-2 border-border bg-secondary px-2 py-2 text-left font-semibold text-muted-foreground">Match</th>
                          )}
                          <th className="sticky top-0 z-10 border-b-2 border-border bg-secondary px-2 py-2 text-left font-semibold text-muted-foreground">Policy #</th>
                          <th className="sticky top-0 z-10 border-b-2 border-border bg-secondary px-2 py-2 text-left font-semibold text-muted-foreground">Client</th>
                          <th className="sticky top-0 z-10 border-b-2 border-border bg-secondary px-2 py-2 text-right font-semibold text-muted-foreground">Commission</th>
                          <th className="sticky top-0 z-10 border-b-2 border-border bg-secondary px-2 py-2 text-right font-semibold text-muted-foreground">Premium</th>
                          <th className="sticky top-0 z-10 border-b-2 border-border bg-secondary px-2 py-2 text-left font-semibold text-muted-foreground">Month</th>
                          <th className="sticky top-0 z-10 border-b-2 border-border bg-secondary px-2 py-2 text-left font-semibold text-muted-foreground">File</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commSlice.map((c) => {
                          const isMatched = policy.loaded && polIdx >= 0 && policySet.has(normalizePolicy(c.policy_number))
                          return (
                            <tr key={c.id} className={cn(
                              "border-b border-border",
                              isMatched ? "bg-success/5" : ""
                            )}>
                              {policy.loaded && (
                                <td className="px-2 py-1.5 text-center">
                                  {isMatched
                                    ? <span className="text-success font-bold">Yes</span>
                                    : <span className="text-muted-foreground">No</span>
                                  }
                                </td>
                              )}
                              <td className="px-2 py-1.5 font-mono text-foreground">{c.policy_number}</td>
                              <td className="px-2 py-1.5 text-foreground">{c.client_name || "-"}</td>
                              <td className={cn("px-2 py-1.5 text-right font-mono font-semibold", c.commission >= 0 ? "text-success" : "text-destructive")}>
                                {formatCurrency(c.commission)}
                              </td>
                              <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">
                                {c.premium > 0 ? formatCurrency(c.premium) : "-"}
                              </td>
                              <td className="px-2 py-1.5 text-muted-foreground">{c.month}</td>
                              <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[120px]">{c.file}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {commPage * ROWS_PER_PAGE + 1}--{Math.min((commPage + 1) * ROWS_PER_PAGE, filteredComm.length)} of {filteredComm.length} records
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={commPage === 0}
                        onClick={() => setCommPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Prev
                      </Button>
                      <span className="px-2 text-xs text-muted-foreground">
                        {commPage + 1} / {totalCommPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={commPage >= totalCommPages - 1}
                        onClick={() => setCommPage(p => p + 1)}
                      >
                        Next
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* System Log */}
            <div className="mt-4 max-h-36 overflow-y-auto rounded-lg bg-[#1e293b] p-3 font-mono text-xs text-[#cbd5e1]">
              {logMessages.map((msg, i) => (
                <div key={i}>{msg}</div>
              ))}
            </div>
          </div>

          {/* Step 4: Financials (Full Agency only) */}
          {dealType === "full" && (
            <div className="mb-10 border-b border-border pb-8">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  4
                </span>
                <h3 className="text-lg font-bold text-foreground">Financials & EBITDA</h3>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Enter T12 financial data. Revenue field auto-fills from verified data.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-foreground">
                    Base Revenue ($)
                  </label>
                  <Input
                    type="number"
                    value={finRevenue || ""}
                    onChange={(e) => setFinRevenue(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Auto-filled from files, can edit.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-foreground">
                    Annual Operating Expenses
                  </label>
                  <Input
                    type="number"
                    value={finOpex || ""}
                    onChange={(e) => setFinOpex(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-foreground">
                    {"Owner's Compensation (Add-back)"}
                  </label>
                  <Input
                    type="number"
                    value={finOwnerComp || ""}
                    onChange={(e) => setFinOwnerComp(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-foreground">
                    One-Time / Non-Recurring (Add-back)
                  </label>
                  <Input
                    type="number"
                    value={finAddbacks || ""}
                    onChange={(e) => setFinAddbacks(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-success bg-success/5 p-4 text-center">
                <p className="text-xs font-bold uppercase text-success">
                  Adjusted EBITDA (T12)
                </p>
                <p
                  className={cn(
                    "text-2xl font-extrabold",
                    ebitda >= 0 ? "text-success" : "text-destructive"
                  )}
                >
                  {formatCurrency(ebitda)}
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Valuation */}
          <ValuationReport
            baseRevenue={baseRevenue}
            currentValuation={currentValuation}
            valuationMultiple={valuationMultiple}
            onMultipleChange={setValuationMultiple}
            factorLoss={factorLoss}
            onFactorLossChange={setFactorLoss}
            factorCarrier={factorCarrier}
            onFactorCarrierChange={setFactorCarrier}
          />

          {/* Save Button */}
          <div className="mt-8 flex gap-4">
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Valuation"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
