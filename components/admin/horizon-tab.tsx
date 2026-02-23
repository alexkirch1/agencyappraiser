"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Upload, FileText, Search, ChevronLeft } from "lucide-react"
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
        const fileDate = extractDateFromFilename(file.name) || "Unknown"

        if (file.name.endsWith(".pdf")) {
          // PDF parsing via pdfjs-dist
          try {
            const pdfjsLib = await import("pdfjs-dist")
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

            const ab = await file.arrayBuffer()
            const pdf = await pdfjsLib.getDocument(new Uint8Array(ab)).promise

            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i)
              const textContent = await page.getTextContent()
              const rows: Record<number, typeof textContent.items> = {}

              textContent.items.forEach((item) => {
                if (!("transform" in item)) return
                const y = Math.floor(item.transform[5])
                const foundKey = Object.keys(rows).find(
                  (key) => Math.abs(Number(key) - y) <= 8
                )
                if (foundKey) rows[Number(foundKey)].push(item)
                else rows[y] = [item]
              })

              Object.values(rows).forEach((rowItems) => {
                rowItems.sort((a, b) => {
                  const ax = "transform" in a ? a.transform[4] : 0
                  const bx = "transform" in b ? b.transform[4] : 0
                  return ax - bx
                })

                const lineStr = rowItems
                  .map((item) => ("str" in item ? item.str : ""))
                  .join(" ")
                  .trim()

                // Find money
                const moneyPattern = /[(-]?\$?\s*(\d{1,3}(?:[,\s]?\d{3})*)\s*\.\s*(\d{2})\s*[)CR-]*/gi
                const moneyMatches = [...lineStr.matchAll(moneyPattern)]
                const moneyCandidates = moneyMatches
                  .map((match) => ({
                    val: cleanNum(match[0]),
                    raw: match[0],
                    abs: Math.abs(cleanNum(match[0])),
                  }))
                  .filter((m) => m.val !== 0 && m.abs < 500000)

                if (moneyCandidates.length === 0) return
                moneyCandidates.sort((a, b) => a.abs - b.abs)
                const foundMoney = moneyCandidates[0].val

                // Find policy number
                let cleanLine = lineStr
                moneyCandidates.forEach((m) => {
                  cleanLine = cleanLine.replace(m.raw, " ")
                })
                const tokens = cleanLine.split(/\s+/)
                let foundPol: string | null = null

                for (const t of tokens) {
                  const tClean = t.replace(/^[.,\-:()]+|[.,\-:()]+$/g, "")
                  const hasDigit = /\d/.test(tClean)
                  const isDate = tClean.includes("/") || (tClean.includes("-") && tClean.length >= 8)
                  if (tClean.length >= 4 && hasDigit && !isDate) {
                    foundPol = normalizePolicy(tClean)
                    break
                  }
                }

                if (foundPol && foundMoney !== 0) {
                  const uID = `${foundPol}_${foundMoney}_${i}`
                  if (!newSeen.has(uID)) {
                    newCommData.push({
                      id: uID,
                      policy_number: foundPol,
                      commission: foundMoney,
                      month: fileDate,
                      file: file.name,
                      client_name: "",
                      raw_line: lineStr,
                      producer: "-",
                      carrier: "-",
                      lob: "-",
                      trans_type: "-",
                      premium: 0,
                    })
                    newSeen.add(uID)
                    fileTotal += foundMoney
                  }
                }
              })
            }
          } catch (err) {
            log(`Error parsing PDF: ${(err as Error).message}`)
          }
        } else {
          // Excel / CSV
          try {
            const ab = await file.arrayBuffer()
            const wb = XLSX.read(ab, { type: "array" })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

            data.forEach((row, idx) => {
              const keys = Object.keys(row)
              const kPol = keys.find((k) => /pol/i.test(k) && !/type/i.test(k))
              const kAmt = keys.find((k) => {
                const s = k.toLowerCase()
                return (
                  /commission|comm|split|net|revenue/.test(s) ||
                  (/amount|amt|pay|bonus/.test(s) &&
                    !s.includes("premium") &&
                    !s.includes("basis"))
                )
              })

              if (kPol && kAmt) {
                const p = normalizePolicy(row[kPol])
                const val = cleanNum(row[kAmt])
                if (Math.abs(val) > 50000 || val === 0) return

                const kName = keys.find((k) => /name|insured|client|account|customer/i.test(k))
                const uID = `${p}_${val}_${idx}`

                if (!newSeen.has(uID)) {
                  newCommData.push({
                    id: uID,
                    policy_number: p,
                    commission: val,
                    month: fileDate,
                    file: file.name,
                    client_name: kName ? String(row[kName]) : "",
                    raw_line: Object.values(row).join(" | "),
                    producer: "-",
                    carrier: "-",
                    lob: "-",
                    trans_type: "-",
                    premium: 0,
                  })
                  newSeen.add(uID)
                  fileTotal += val
                }
              }
            })
          } catch (err) {
            log(`Error parsing Excel: ${(err as Error).message}`)
          }
        }

        newFiles[file.name] = fileTotal
        log(`Scanned ${file.name}: ${formatCurrency(fileTotal)}`)
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
            {policy.loaded && policy.data.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={policySearch}
                    onChange={(e) => setPolicySearch(e.target.value)}
                    placeholder="Search policies..."
                    className="h-9 text-sm"
                  />
                </div>
                <div className="max-h-72 overflow-auto rounded-lg border border-border">
                  <table className="w-full min-w-[600px] text-xs">
                    <thead>
                      <tr>
                        <th className="sticky top-0 border-b-2 border-border bg-secondary px-3 py-2 text-left font-semibold text-muted-foreground">
                          Use
                        </th>
                        {policy.headers.slice(0, 6).map((h, i) => (
                          <th
                            key={i}
                            className="sticky top-0 whitespace-nowrap border-b-2 border-border bg-secondary px-3 py-2 text-left font-semibold text-muted-foreground"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPolicies.slice(0, 100).map((row, idx) => {
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
                {policy.data.length > 100 && (
                  <p className="mt-1 text-center text-xs text-muted-foreground">
                    Showing first 100 of {policy.data.length} rows
                  </p>
                )}
              </div>
            )}
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

            {/* Commission Files List */}
            {Object.keys(comm.files).length > 0 && (
              <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3">
                <p className="mb-2 text-xs font-bold text-muted-foreground">
                  Uploaded Commission Files:
                </p>
                {Object.entries(comm.files).map(([fname, total]) => (
                  <div
                    key={fname}
                    className="flex items-center justify-between border-b border-border py-1.5 text-xs last:border-b-0"
                  >
                    <span className="text-foreground">{fname}</span>
                    <span className="font-bold text-primary">{formatCurrency(total)}</span>
                  </div>
                ))}
              </div>
            )}

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
