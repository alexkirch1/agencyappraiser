"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SmartInput } from "@/components/ui/smart-input"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Upload, FileText, Search, ChevronLeft, ChevronRight, FolderKanban, BarChart3, Pencil, X, Save, Trophy, ChevronRight as ArrowRight } from "lucide-react"
import { CompleteDealModal } from "@/components/admin/complete-deal-modal"
import { useMarketIntel } from "@/lib/use-market-intel"
import { cn } from "@/lib/utils"
import type { Deal } from "./admin-dashboard"
import { ValuationReport, type ValuationFactors, type OverrideReason } from "./valuation-report"
import {
  cleanNum as sharedCleanNum,
  normalizePolicy as sharedNormalizePolicy,
  formatCurrency as sharedFormatCurrency,
  extractDateFromFilename as sharedExtractDateFromFilename,
  parsePdfCommissionRow,
  scoreCommissionRow,
  scorePolicyParse,
  detectCommStatementFormat,
  setCommStatementFormat,
  resetCommStatementFormat,
  matchCommRows,
  type MatchType,
  type MatchStats,
  type ParseConfidence,
  type ConfidenceLevel,
} from "@/lib/parse-utils"

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
  confidence: ParseConfidence
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

// ----- Re-export shared utilities for local use -----
const cleanNum = sharedCleanNum
const normalizePolicy = sharedNormalizePolicy
const formatCurrency = sharedFormatCurrency
const extractDateFromFilename = sharedExtractDateFromFilename

function confidenceBadge(conf: ParseConfidence): string {
  if (conf.level === "high") return "H"
  if (conf.level === "medium") return "M"
  return "L"
}

function confidenceColor(level: ConfidenceLevel): string {
  if (level === "high") return "text-success"
  if (level === "medium") return "text-warning"
  return "text-destructive"
}

// ----- Auto-map columns -----
function autoMapColumns(headers: string[]): Record<string, number> {
  // Each rule is an ordered list of matchers -- first match wins.
  // Use exact-ish phrases first to avoid false matches (e.g. "number" matching "Phone Number").
  const mapRules: Record<string, string[]> = {
    policy: [
      "Policy Data Policy Number", "policy number", "policy no", "policyno",
      "pol#", "pol #", "policy #", "policy num", "policy",
    ],
    premium: [
      "Policy Data Premium - Annualized", "annualized premium", "premium",
      "annualized", "prem", "written premium", "total premium",
    ],
    carrier: [
      "Policy Data Master Company", "carrier", "company name", "insurer",
      "master company", "writing company",
    ],
    account: [
      "Applicant Data Account Name", "account name", "insured name",
      "insured", "account", "client name", "client", "named insured",
      "policyholder", "customer",
    ],
    effective: [
      "Policy Data Effective Date", "effective date", "eff date", "eff",
      "inception", "start date",
    ],
    expiration: [
      "Policy Expiration Date", "expiration date", "exp date", "exp",
      "end date", "term date",
    ],
    type: [
      "Policy Type", "trans type", "transaction type", "status",
      "policy status", "trans", "type",
    ],
  }
  const result: Record<string, number> = {}
  const usedIndices = new Set<number>()

  for (const [key, keywords] of Object.entries(mapRules)) {
    let foundIndex = -1
    for (const kw of keywords) {
      const idx = headers.findIndex(
        (h, i) => !usedIndices.has(i) && h && h.toString().toLowerCase().includes(kw.toLowerCase())
      )
      if (idx !== -1) {
        foundIndex = idx
        break
      }
    }
    result[key] = foundIndex
    if (foundIndex !== -1) usedIndices.add(foundIndex)
  }
  return result
}

interface HorizonTabProps {
  deals: Deal[]
  onSaveDeal: (deal: Deal) => void
  onUpdateDeal: (id: string, updates: Partial<Deal>) => void
}

export function HorizonTab({ deals, onSaveDeal, onUpdateDeal }: HorizonTabProps) {
  // --- Form state ---
  const [showForm, setShowForm] = useState(false)
  const [dealName, setDealName] = useState("")
  const [dealType, setDealType] = useState<"full" | "book">("full")

  // --- Pipeline sub-tab ---
  const [pipelineTab, setPipelineTab] = useState<"active" | "completed">("active")

  // --- Deal detail drawer ---
  const [viewingDeal, setViewingDeal] = useState<Deal | null>(null)

  // --- Complete deal modal state ---
  const [completingDeal, setCompletingDeal] = useState<Deal | null>(null)
  const { intel, mutate: mutateIntel } = useMarketIntel()

  // --- Edit drawer state ---
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [editName, setEditName] = useState("")
  const [editStatus, setEditStatus] = useState<Deal["status"]>("active")
  const [editValuation, setEditValuation] = useState(0)
  const [editNotes, setEditNotes] = useState("")

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
  const [valuationMultiple, setValuationMultiple] = useState(1.0)
  const [factorLoss, setFactorLoss] = useState(0)
  const [factorCarrier, setFactorCarrier] = useState(0)
  const [saving, setSaving] = useState(false)
  // --- New factor inputs ---
  const [valuationFactors, setValuationFactors] = useState<Partial<ValuationFactors>>({})
  // --- Override state ---
  const [isOverridden, setIsOverridden] = useState(false)
  const [overrideReason, setOverrideReason] = useState<OverrideReason>("")

  // --- Drop zone state ---
  const [dropZoneActive, setDropZoneActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Refs
  const policyFileRef = useRef<HTMLInputElement>(null)
  const commFileRef = useRef<HTMLInputElement>(null)
  const dropAllRef = useRef<HTMLInputElement>(null)

  // ----- Derived values -----
  const ebitda = finRevenue - finOpex + finOwnerComp + finAddbacks
  const baseRevenue = finRevenue || calculateBaseRevenue()
  const currentValuation = baseRevenue * valuationMultiple

  // Auto-feed live book metrics into valuationFactors when data is available.
  // Runs whenever EZLynx CSV or commission PDFs change. Does NOT overwrite
  // manually-entered factors (only sets fields that are currently null/undefined).
  useEffect(() => {
    if (!policy.loaded || !comm.loaded || comm.data.length === 0) return
    const polIdx2  = columnMap.policy     ?? -1
    const nameIdx2 = columnMap.name       ?? -1
    const premIdx2 = columnMap.premium    ?? -1
    const expIdx2  = columnMap.expiration ?? -1
    if (polIdx2 < 0) return

    const today2 = new Date()
    today2.setHours(0, 0, 0, 0)

    const ezList2 = policy.data
      .filter((_, i) => !policy.excludedIndices.has(i))
      .map(row => {
        const polNum   = row[polIdx2] ?? ""
        const clientNm = nameIdx2 >= 0 ? (row[nameIdx2] ?? "") : ""
        const prem     = premIdx2 >= 0 ? cleanNum(row[premIdx2]) : 0
        let isActive = true
        if (expIdx2 >= 0 && row[expIdx2]) {
          const expDate = new Date(row[expIdx2])
          if (!isNaN(expDate.getTime())) isActive = expDate >= today2
        }
        return { policyNumber: polNum, clientName: clientNm, premium: prem, isActive }
      })
      .filter(e => e.policyNumber)

    const ms2 = matchCommRows(ezList2, comm.data)
    const totalMatched2 = ms2.exactCount + ms2.suffixCount + ms2.rewriteCount
    const matchRate2 = comm.data.length > 0 ? (totalMatched2 / comm.data.length) * 100 : 0

    // Retention: EZLynx policies with ≥1 exact/suffix match
    const matchedEZ2 = new Set<string>()
    comm.data.forEach(c => {
      const t = ms2.byId.get(c.id)
      if (t === "exact" || t === "suffix") matchedEZ2.add(normalizePolicy(c.policy_number))
    })
    const retentionRate2 = ezList2.length > 0 ? (matchedEZ2.size / ezList2.length) * 100 : 0

    // Avg premium per active matched policy (from premium model)
    const avgPrem2 = ms2.matchedActiveCount > 0
      ? ms2.matchedActiveEzlynxPremium / ms2.matchedActiveCount
      : null

    setValuationFactors(prev => ({
      ...prev,
      retention:       prev.retention       ?? (retentionRate2 > 0              ? parseFloat(retentionRate2.toFixed(1))          : null),
      matchConfidence: prev.matchConfidence  ?? (matchRate2 > 0                  ? parseFloat(matchRate2.toFixed(1))              : null),
      avgPremium:      prev.avgPremium       ?? (avgPrem2 !== null && avgPrem2 > 0 ? parseFloat(avgPrem2.toFixed(2))              : null),
      totalPolicies:   prev.totalPolicies    ?? (ms2.totalActivePolicies > 0      ? ms2.totalActivePolicies                       : null),
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy.loaded, policy.data, comm.loaded, comm.data, columnMap])

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

  // ----- Unified file processor: classifies by extension then routes -----
  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    setIsProcessing(true)

    const csvFiles  = files.filter(f => /\.(csv|xlsx|xls)$/i.test(f.name))
    const pdfFiles  = files.filter(f => /\.pdf$/i.test(f.name))

    // Process CSV/XLSX as EZLynx policy list (first one wins)
    if (csvFiles.length > 0) {
      const file = csvFiles[0]
      log(`[Drop] Auto-classified as EZLynx Policy List: ${file.name}`)

      const XLSX = await import("xlsx")
      const ab = await file.arrayBuffer()
      try {
        const wb = XLSX.read(ab, { type: "array" })
        let json: unknown[][] = []
        for (let i = 0; i < wb.SheetNames.length; i++) {
          const ws = wb.Sheets[wb.SheetNames[i]]
          const tempJson = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" })
          if (tempJson.length > 5) { json = tempJson; break }
        }
        if (json.length === 0) { log("Empty policy file — skipped.") }
        else {
          let headerIdx = 0
          for (let i = 0; i < Math.min(30, json.length); i++) {
            const rowStr = JSON.stringify(json[i]).toLowerCase()
            if (rowStr.includes("policy") || rowStr.includes("prem")) { headerIdx = i; break }
          }
          const headers = (json[headerIdx] as string[]).map(String)
          const data = json.slice(headerIdx + 1).map((row) => (row as string[]).map(String))
          const mapping = autoMapColumns(headers)
          const mappedNames = Object.entries(mapping)
            .filter(([, idx]) => idx >= 0)
            .map(([key, idx]) => `${key}→col${idx}("${headers[idx]}")`)
            .join(", ")
          log(`Column mapping: ${mappedNames || "No columns mapped"}`)
          let totalPrem = 0
          const premIdx = mapping.premium ?? -1
          if (premIdx > -1) data.forEach((row) => { totalPrem += cleanNum(row[premIdx]) })
          setPolicy({ headers, data, loaded: true, excludedIndices: new Set(), stats: { totalPrem } })
          setColumnMap(mapping)
          setFinRevenue(0)
          const polParse = scorePolicyParse({
            totalRows: data.length,
            mappedColumns: Object.values(mapping).filter(v => v >= 0).length,
            totalPossibleColumns: Object.keys(mapping).length,
            hasPolicyCol: (mapping.policy ?? -1) >= 0,
            hasPremiumCol: (mapping.premium ?? -1) >= 0,
          })
          log(`Loaded ${data.length} policies from ${file.name}. Parse confidence: ${polParse.score}/100 (${polParse.level})`)
        }
      } catch (err) { log(`Error parsing policy file: ${(err as Error).message}`) }
    }

    // Process PDFs as commission statements — sorted chronologically by extracted date
    if (pdfFiles.length > 0) {
      // Sort by extracted date so months load Jan→Dec
      const sorted = [...pdfFiles].sort((a, b) => {
        const da = extractDateFromFilename(a.name) || a.name
        const db = extractDateFromFilename(b.name) || b.name
        return da.localeCompare(db)
      })
      log(`[Drop] Auto-classified ${sorted.length} PDF(s) as Commission Statements — sorted chronologically`)

      // Delegate to the existing PDF branch of handleCommUpload by constructing
      // a synthetic FileList-like array and calling the core processing logic.
      // We do this by directly calling processCommFiles (extracted below).
      await processCommFiles(sorted)
    }

    setIsProcessing(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log])

  // ----- Core commission file processing (PDF + Excel) -----
  // Extracted so both handleCommUpload and processFiles can call it.
  const processCommFiles = useCallback(async (files: File[]) => {
    const XLSX = await import("xlsx")

    setComm(prev => {
      // We'll build new data arrays outside setState and set them at the end
      return prev
    })

    const newCommData: CommItem[] = []
    const newSeen = new Set<string>()
    const newFiles: Record<string, number> = {}

    // Seed from current state
    setComm(prev => {
      prev.data.forEach(c => { newCommData.push(c); newSeen.add(c.id) })
      Object.assign(newFiles, prev.files)
      return prev
    })

    for (const file of files) {
      log(`Scanning ${file.name}...`)
      let fileTotal = 0
      let parsedRows = 0
      let skippedRows = 0
      const fileDate = extractDateFromFilename(file.name) || "Unknown"

      if (file.name.toLowerCase().endsWith(".pdf")) {
        try {
          const pdfjsLib = await import("pdfjs-dist")
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
          const ab = await file.arrayBuffer()
          const pdf = await pdfjsLib.getDocument(new Uint8Array(ab)).promise
          log(`  PDF has ${pdf.numPages} page(s)`)

          let formatSampleText = ""
          for (let pi = 1; pi <= Math.min(2, pdf.numPages); pi++) {
            const pg = await pdf.getPage(pi)
            const tc = await pg.getTextContent()
            formatSampleText += tc.items
              .filter((it): it is typeof it & { str: string } => "str" in it)
              .map(it => it.str).join(" ") + "\n"
          }
          const detectedFmt = detectCommStatementFormat(formatSampleText)
          setCommStatementFormat(detectedFmt)
          log(`  Detected format: ${detectedFmt}`)

          for (let pageIdx = 1; pageIdx <= pdf.numPages; pageIdx++) {
            const page = await pdf.getPage(pageIdx)
            const tc = await page.getTextContent()
            type TItem = { str: string; x: number; y: number; fontSize: number; width: number }
            const items: TItem[] = []
            for (const item of tc.items) {
              if (!("transform" in item) || !("str" in item)) continue
              const str = (item.str ?? "").replace(/\r/g, "")
              if (!str.trim()) continue
              const fontSize = Math.abs(item.transform[0])
              const itemWidth = ("width" in item && typeof item.width === "number" && item.width > 0)
                ? item.width : str.length * fontSize * 0.52
              items.push({ str, x: item.transform[4], y: Math.round(item.transform[5]), fontSize, width: itemWidth })
            }

            const rowMap: Record<number, TItem[]> = {}
            for (const item of items) {
              const foundKey = Object.keys(rowMap).find(k => Math.abs(Number(k) - item.y) <= 4)
              if (foundKey) rowMap[Number(foundKey)].push(item)
              else rowMap[item.y] = [item]
            }
            const sortedYs = Object.keys(rowMap).map(Number).sort((a, b) => b - a)

            for (const yKey of sortedYs) {
              const rowItems = rowMap[yKey]
              rowItems.sort((a, b) => a.x - b.x)
              let lineStr = ""
              for (let ri = 0; ri < rowItems.length; ri++) {
                const item = rowItems[ri]
                if (!item.str) continue
                if (ri > 0) {
                  const prev = rowItems[ri - 1]
                  const prevEnd = prev.x + prev.width
                  const gap = item.x - prevEnd
                  const charW = prev.fontSize * 0.5 || 5
                  if (gap > charW * 3) lineStr += "  "
                  else if (gap > charW * 0.3) lineStr += " "
                }
                lineStr += item.str
              }
              lineStr = lineStr.trim()
              if (!lineStr) continue
              const parsed = parsePdfCommissionRow(lineStr, pageIdx, fileDate, file.name)
              if (parsed) {
                const conf = scoreCommissionRow(parsed)
                const uid = `${parsed.policy_number}_${parsed.commission.toFixed(2)}_${pageIdx}_${yKey}`
                if (!newSeen.has(uid)) {
                  newCommData.push({ id: uid, ...parsed, confidence: conf })
                  newSeen.add(uid)
                  fileTotal += parsed.commission
                  parsedRows++
                }
              } else if (lineStr.length >= 10) {
                skippedRows++
              }
            }
          }
          log(`  Found ${parsedRows} commission records (${skippedRows} rows skipped)`)
          resetCommStatementFormat()
        } catch (err) {
          resetCommStatementFormat()
          log(`Error parsing PDF: ${(err as Error).message}`)
        }
      } else {
        // Excel / CSV commission
        try {
          const ab = await file.arrayBuffer()
          const wb = XLSX.read(ab, { type: "array" })
          for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName]
            const rawData = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" })
            let headerIdx = 0
            for (let i = 0; i < Math.min(20, rawData.length); i++) {
              const rowStr = JSON.stringify(rawData[i]).toLowerCase()
              if ((rowStr.includes("commission") || rowStr.includes("comm") || rowStr.includes("revenue") || rowStr.includes("amount")) &&
                  (rowStr.includes("poli") || rowStr.includes("number") || rowStr.includes("insured") || rowStr.includes("name"))) {
                headerIdx = i; break
              }
            }
            const headers = (rawData[headerIdx] as string[]).map(String)
            const dataRows = rawData.slice(headerIdx + 1)
            const commColKeywords: Record<string, string[]> = {
              policy: ["policy number","policy no","policyno","policy #","pol#","pol #","policy num","policy","certificate"],
              commission: ["commission","comm amt","comm $","agent comm","comm","net amount","split","earned","pay amount"],
              premium: ["written premium","annualized premium","premium","prem","annualized","gross premium"],
              name: ["insured name","named insured","insured","account name","client name","customer name","policyholder","account","client","customer"],
              carrier: ["carrier","company","master company","insurer","writing company"],
              lob: ["lob","line of business","coverage","class code","coverage type"],
              producer: ["producer","agent","csr","writer","writing agent"],
              transType: ["trans type","transaction","trans","action","status"],
            }
            const colMap: Record<string, number> = {}
            const usedCommCols = new Set<number>()
            for (const [key, keywords] of Object.entries(commColKeywords)) {
              for (const kw of keywords) {
                const idx = headers.findIndex((h, i) => !usedCommCols.has(i) && h.toLowerCase().includes(kw.toLowerCase()))
                if (idx !== -1 && colMap[key] === undefined) { colMap[key] = idx; usedCommCols.add(idx); break }
              }
            }
            if (colMap.commission === undefined) { log(`  Sheet "${sheetName}": No commission column found.`); continue }
            const mappedCommCols = Object.entries(colMap).map(([key, idx]) => `${key}→col${idx}("${headers[idx] ?? "?"}")`).join(", ")
            log(`  Sheet "${sheetName}": ${mappedCommCols}`)
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
                const conf = scoreCommissionRow({ policy_number: polNum, commission: val, premium, client_name: clientName, raw_line: row.join(" | "), policyConfidence: colMap.policy !== undefined ? 85 : 20 })
                newCommData.push({ id: uID, policy_number: polNum, commission: val, month: fileDate, file: file.name, client_name: clientName, raw_line: row.join(" | "), producer, carrier, lob, trans_type: transType, premium, confidence: conf })
                newSeen.add(uID)
                fileTotal += val
                parsedRows++
              }
            }
            log(`  Sheet "${sheetName}": ${parsedRows} records`)
          }
        } catch (err) { log(`Error parsing Excel: ${(err as Error).message}`) }
      }

      newFiles[file.name] = fileTotal
    }

    setComm({ data: newCommData, files: newFiles, loaded: newCommData.length > 0, seen: newSeen })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log])

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
          // Log column mapping for debugging
          const mappedNames = Object.entries(mapping)
            .filter(([, idx]) => idx >= 0)
            .map(([key, idx]) => `${key}→col${idx}("${headers[idx]}")`)
            .join(", ")
          log(`Column mapping: ${mappedNames || "No columns mapped"}`)

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

          const mappedCount = Object.values(mapping).filter(v => v >= 0).length
          const polParse = scorePolicyParse({
            totalRows: data.length,
            mappedColumns: mappedCount,
            totalPossibleColumns: Object.keys(mapping).length,
            hasPolicyCol: (mapping.policy ?? -1) >= 0,
            hasPremiumCol: (mapping.premium ?? -1) >= 0,
          })
          log(`Loaded ${data.length} policies from ${file.name}. Parse confidence: ${polParse.score}/100 (${polParse.level})`)
        } catch (err) {
          alert("Error parsing file: " + (err as Error).message)
        }
      }
      reader.readAsArrayBuffer(file)
    },
    [log]
  )

  // ----- Handle Commission Upload (delegates to processCommFiles) -----
  const handleCommUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length === 0) return
      await processCommFiles(files)
      // Reset input so the same file can be re-uploaded
      e.target.value = ""
    },
    [processCommFiles]
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
      shortDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
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
        // Learning model fields
        isOverridden,
        overrideReason: isOverridden ? overrideReason : null,
        valuationFactors,
      },
    }

    onSaveDeal(deal)

    // Log to localStorage so the timeline chart always has a reliable source
    try {
      const logs = JSON.parse(localStorage.getItem("valuation_activity_log") || "[]")
      logs.push({
        date: deal.shortDate,
        status: deal.status === "completed" ? "Completed" : "Partial",
      })
      localStorage.setItem("valuation_activity_log", JSON.stringify(logs))
    } catch {}

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
    setValuationMultiple(1.0)
    setFactorLoss(0)
    setFactorCarrier(0)
    setValuationFactors({})
    setIsOverridden(false)
    setOverrideReason("")
    setPolicySearch("")
  }

  // ----- Filtered policy rows -----
  const filteredPolicies = policy.data.filter((row) => {
    if (!policySearch) return true
    return row.some((cell) =>
      String(cell).toLowerCase().includes(policySearch.toLowerCase())
    )
  })

  // ----- Edit helpers -----
  const openEdit = (deal: Deal) => {
    setEditingDeal(deal)
    setEditName(deal.deal_name)
    setEditStatus(deal.status)
    setEditValuation(deal.valuation)
    setEditNotes((deal.details?.notes as string) ?? "")
  }

  const saveEdit = () => {
    if (!editingDeal) return
    onUpdateDeal(editingDeal.id, {
      deal_name: editName,
      status: editStatus,
      valuation: editValuation,
      details: { ...editingDeal.details, notes: editNotes },
    })
    setEditingDeal(null)
  }

  const statusColors: Record<Deal["status"], string> = {
    active: "text-success",
    completed: "text-primary",
    declined: "text-destructive",
    test: "text-muted-foreground",
  }

  const activeDeals = deals.filter((d) => d.status === "active")
  const completedDeals = deals.filter((d) => d.status === "completed")

  function fmtStat(v: unknown): string {
    if (v == null) return "—"
    const n = parseFloat(String(v))
    return isNaN(n) ? String(v) : n.toLocaleString("en-US", { maximumFractionDigits: 1 })
  }

  // ----- List View (no form open) -----
  if (!showForm) {
    const visibleDeals = pipelineTab === "active" ? activeDeals : completedDeals

    return (
      <div className="relative">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Horizon Pipeline</h2>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Deal
          </Button>
        </div>

        {/* Sub-tabs */}
        <div className="mb-5 flex gap-1 border-b border-border">
          {(["active", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setPipelineTab(tab)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                pipelineTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "active" ? (
                <><FolderKanban className="h-4 w-4" /> Active Pipeline <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-xs text-primary">{activeDeals.length}</span></>
              ) : (
                <><Trophy className="h-4 w-4" /> Completed Deals <span className="ml-1 rounded-full bg-success/10 px-1.5 text-xs text-success">{completedDeals.length}</span></>
              )}
            </button>
          ))}
        </div>

        {/* Market Intel bar — only on completed tab */}
        {pipelineTab === "completed" && intel.sampleSize > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">Market Intel</span>
            {intel.medianMultiple != null && (
              <span className="text-foreground">Median multiple: <strong>{intel.medianMultiple.toFixed(2)}x</strong></span>
            )}
            {intel.earnoutRate != null && intel.earnoutRate > 0 && (
              <span className="text-foreground">Earnout rate: <strong>{Math.round(intel.earnoutRate * 100)}%</strong></span>
            )}
            {intel.medianSellerStay != null && (
              <span className="text-foreground">Avg stay-on: <strong>{intel.medianSellerStay} mo</strong></span>
            )}
          </div>
        )}

        {/* Deal list */}
        {visibleDeals.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              {pipelineTab === "active" ? (
                <><FolderKanban className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No active deals. Click "New Deal" to get started.</p></>
              ) : (
                <><Trophy className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No completed deals yet. Mark a deal as Won to record it here.</p></>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {visibleDeals.map((deal) => (
              <Card
                key={deal.id}
                className="group cursor-pointer border-border transition-all hover:border-primary/30 hover:shadow-md"
                onClick={() => setViewingDeal(deal)}
              >
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold text-foreground">{deal.deal_name}</p>
                      {deal.status === "completed" && (
                        <Trophy className="h-3.5 w-3.5 shrink-0 text-warning" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {deal.deal_type === "full" ? "Full Agency" : "Book Purchase"} &bull;{" "}
                      {new Date(deal.date_saved).toLocaleDateString()} &bull;{" "}
                      <span className={statusColors[deal.status]}>
                        {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                      </span>
                    </p>
                    {deal.details?.notes != null && (
                      <p className="mt-1 truncate text-xs text-muted-foreground/70 italic">
                        {String(deal.details.notes)}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <p className="text-base font-extrabold text-success">{formatCurrency(deal.valuation)}</p>
                      {deal.premium_base > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          {(deal.valuation / deal.premium_base).toFixed(2)}x premium
                        </p>
                      )}
                    </div>
                    {deal.status !== "completed" && (
                      <Button
                        size="sm"
                        className="gap-1.5 bg-success hover:bg-success/90 text-white border-0"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewingDeal(null); setCompletingDeal(deal) }}
                      >
                        <Trophy className="h-3.5 w-3.5" />
                        Won
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewingDeal(null); openEdit(deal) }}
                      aria-label="Edit deal"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Won Deal Modal — rendered last so it is always on top */}
        {completingDeal && (() => {
          const captured = completingDeal
          return (
            <CompleteDealModal
              deal={captured}
              onClose={() => setCompletingDeal(null)}
              onSaved={() => {
                onUpdateDeal(captured.id, { status: "completed" })
                setCompletingDeal(null)
                setViewingDeal(null)
                setPipelineTab("completed")
                mutateIntel()
              }}
            />
          )
        })()}

        {/* Deal Detail Drawer */}
        {viewingDeal && !completingDeal && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setViewingDeal(null)} />
            <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-foreground">{viewingDeal.deal_name}</h3>
                    {viewingDeal.status === "completed" && <Trophy className="h-4 w-4 shrink-0 text-warning" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {viewingDeal.deal_type === "full" ? "Full Agency" : "Book Purchase"} &bull; {new Date(viewingDeal.date_saved).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => setViewingDeal(null)} className="ml-4 rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Key stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Valuation", value: formatCurrency(viewingDeal.valuation), highlight: true },
                    { label: "Premium Base", value: viewingDeal.premium_base > 0 ? formatCurrency(viewingDeal.premium_base) : "—" },
                    { label: "Multiple", value: viewingDeal.premium_base > 0 ? `${(viewingDeal.valuation / viewingDeal.premium_base).toFixed(2)}x` : "—" },
                    { label: "Status", value: viewingDeal.status.charAt(0).toUpperCase() + viewingDeal.status.slice(1) },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="rounded-lg border border-border bg-secondary/30 p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={cn("mt-0.5 text-base font-bold", highlight ? "text-success" : "text-foreground")}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Book / financial details from deal.details */}
                {viewingDeal.details && Object.keys(viewingDeal.details).filter((k) => viewingDeal.details![k] != null && k !== "notes").length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deal Details</p>
                    <div className="divide-y divide-border rounded-lg border border-border bg-secondary/20">
                      {[
                        { key: "carrier", label: "Carrier" },
                        { key: "pif_count", label: "Policies in Force" },
                        { key: "loss_ratio", label: "Loss Ratio", suffix: "%" },
                        { key: "book_retention_pct", label: "Book Retention", suffix: "%" },
                        { key: "multiple", label: "Multiplier" },
                        { key: "policyCount", label: "Policy Count" },
                        { key: "revenue", label: "Revenue" },
                        { key: "ebitda", label: "EBITDA" },
                        { key: "retention", label: "Retention", suffix: "%" },
                        { key: "lossRatio", label: "Loss Ratio", suffix: "%" },
                        { key: "riskGrade", label: "Risk Grade" },
                        { key: "coreScore", label: "Core Score" },
                      ].filter(({ key }) => viewingDeal.details?.[key] != null).map(({ key, label, suffix }) => (
                        <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium text-foreground">
                            {fmtStat(viewingDeal.details![key])}{suffix ?? ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed deal terms */}
                {viewingDeal.status === "completed" && viewingDeal.details?.deal_terms != null && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deal Terms</p>
                    <div className="divide-y divide-border rounded-lg border border-border bg-secondary/20">
                      {[
                        { key: "deal_terms", label: "Structure" },
                        { key: "final_offer", label: "Final Price", fmt: (v: unknown) => formatCurrency(Number(v)) },
                        { key: "final_multiple", label: "Final Multiple", suffix: "x" },
                        { key: "earnout_pct", label: "Earnout %", suffix: "%" },
                        { key: "seller_stay", label: "Seller Stay-On", suffix: " mo" },
                      ].filter(({ key }) => viewingDeal.details?.[key] != null).map(({ key, label, suffix, fmt: fmtFn }) => (
                        <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium text-foreground">
                            {fmtFn ? fmtFn(viewingDeal.details![key]) : `${fmtStat(viewingDeal.details![key])}${suffix ?? ""}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {viewingDeal.details?.notes != null && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                    <p className="rounded-lg border border-border bg-secondary/20 px-4 py-3 text-sm text-foreground/80 italic">
                      {String(viewingDeal.details.notes)}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="border-t border-border px-6 py-4 flex gap-3">
                {(() => {
                  const d = viewingDeal
                  return (
                    <>
                      <Button variant="outline" className="flex-1" onClick={() => { setViewingDeal(null); openEdit(d) }}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      {d.status !== "completed" && (
                        <Button
                          className="flex-1 gap-2 bg-success hover:bg-success/90 text-white border-0"
                          onClick={() => { setViewingDeal(null); setCompletingDeal(d) }}
                        >
                          <Trophy className="h-4 w-4" /> Mark as Won
                        </Button>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
          </>
        )}

        {/* Edit Drawer / Slide-over */}
        {editingDeal && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setEditingDeal(null)}
            />
            {/* Panel */}
            <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h3 className="text-base font-semibold text-foreground">Edit Deal</h3>
                <button
                  onClick={() => setEditingDeal(null)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                {/* Deal Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Deal Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Deal["status"])}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="declined">Declined</option>
                    <option value="test">Test (Excluded from Stats)</option>
                  </select>
                </div>

                {/* Valuation override */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Valuation ($)</label>
                  <input
                    type="number"
                    value={editValuation}
                    onChange={(e) => setEditValuation(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={5}
                    placeholder="Add deal notes, next steps, contact info..."
                    className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Read-only meta */}
                <div className="rounded-md border border-border bg-secondary/30 p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium text-foreground">{editingDeal.deal_type.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Premium Base</span>
                    <span className="font-medium text-foreground">{formatCurrency(editingDeal.premium_base)}</span>
                  </div>
                  {editingDeal.details?.multiple != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Multiple</span>
                      <span className="font-medium text-foreground">{parseFloat(String(editingDeal.details.multiple)).toFixed(2)}x</span>
                    </div>
                  )}
                  {editingDeal.details?.policyCount != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Policies</span>
                      <span className="font-medium text-foreground">{String(editingDeal.details.policyCount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saved</span>
                    <span className="font-medium text-foreground">{new Date(editingDeal.date_saved).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border px-6 py-4 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setEditingDeal(null)}>
                  Cancel
                </Button>
                <Button className="flex-1 gap-2" onClick={saveEdit}>
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </>
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

          {/* Step 2: Single Drop Zone — EZLynx CSV + Commission PDFs */}
          <div className="mb-10 border-b border-border pb-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </span>
              <h3 className="text-lg font-bold text-foreground">Drop All Files Here</h3>
              <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                1 CSV/XLSX + up to 12 PDFs
              </span>
            </div>

            {/* Unified drag-and-drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDropZoneActive(true) }}
              onDragEnter={(e) => { e.preventDefault(); setDropZoneActive(true) }}
              onDragLeave={(e) => {
                // Only deactivate if leaving the zone itself (not a child)
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropZoneActive(false)
              }}
              onDrop={async (e) => {
                e.preventDefault()
                setDropZoneActive(false)
                const dropped = Array.from(e.dataTransfer.files)
                if (dropped.length > 0) await processFiles(dropped)
              }}
              onClick={() => dropAllRef.current?.click()}
              className={cn(
                "w-full cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all select-none",
                dropZoneActive
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : (policy.loaded || comm.loaded)
                    ? "border-success bg-success/5"
                    : "border-border bg-secondary/30 hover:border-primary hover:bg-secondary/50"
              )}
            >
              {isProcessing ? (
                <>
                  <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="font-semibold text-foreground">Processing files...</p>
                  <p className="text-xs text-muted-foreground">Parsing PDFs and CSV simultaneously</p>
                </>
              ) : dropZoneActive ? (
                <>
                  <Upload className="mx-auto mb-2 h-8 w-8 text-primary" />
                  <p className="font-bold text-primary">Release to auto-classify</p>
                  <p className="text-xs text-muted-foreground">CSV/XLSX → Policy List &bull; PDFs → Commission Statements</p>
                </>
              ) : (policy.loaded || comm.loaded) ? (
                <div className="flex flex-wrap items-center justify-center gap-6">
                  {policy.loaded && (
                    <div className="text-center">
                      <p className="text-base font-extrabold text-success">{policy.data.length.toLocaleString()}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">policies loaded</p>
                    </div>
                  )}
                  {comm.loaded && (
                    <div className="text-center">
                      <p className="text-base font-extrabold text-success">{Object.keys(comm.files).length}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">statement{Object.keys(comm.files).length !== 1 ? "s" : ""} loaded</p>
                    </div>
                  )}
                  {comm.loaded && (
                    <div className="text-center">
                      <p className="text-base font-extrabold text-foreground">{comm.data.length.toLocaleString()}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">comm records</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-[10px] font-semibold text-muted-foreground">Click or drop more files to add</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="font-semibold text-foreground">Drag &amp; drop all 13 files at once</p>
                  <p className="text-xs text-muted-foreground">or click to browse &bull; auto-classifies by file type</p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
                    <span className="rounded-md border border-border bg-secondary px-2 py-1 font-mono">.csv / .xlsx</span>
                    <span className="text-muted-foreground/50">→</span>
                    <span className="text-foreground font-medium">EZLynx Policy List</span>
                    <span className="mx-2 text-border">|</span>
                    <span className="rounded-md border border-border bg-secondary px-2 py-1 font-mono">.pdf &times;12</span>
                    <span className="text-muted-foreground/50">→</span>
                    <span className="text-foreground font-medium">Monthly Statements (sorted Jan–Dec)</span>
                  </div>
                </>
              )}
            </div>

            {/* Hidden file input for click-to-browse */}
            <input
              ref={dropAllRef}
              type="file"
              accept=".xlsx,.csv,.xls,.pdf"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files || [])
                e.target.value = ""
                if (files.length > 0) await processFiles(files)
              }}
            />
            {/* Legacy individual inputs kept for potential re-use */}
            <input ref={policyFileRef} type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={handlePolicyUpload} />
            <input ref={commFileRef} type="file" accept=".pdf,.xlsx,.csv,.xls" multiple className="hidden" onChange={handleCommUpload} />

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

          {/* Parse Verification Panel + Commission Files List (rendered inside Step 2 section) */}
          <div className="mb-10 border-b border-border pb-8">

            {/* ── Parse Verification Panel ── */}
            {comm.loaded && comm.data.length > 0 && (() => {
              const sample = comm.data.slice(0, 8)
              const lowConf = comm.data.filter(c => (c.confidence?.score ?? 0) < 50).length
              const pct = Math.round(((comm.data.length - lowConf) / comm.data.length) * 100)
              return (
                <div className="mt-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <p className="text-xs font-semibold text-foreground">Parse Verification</p>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      pct >= 75 ? "bg-success/15 text-success" : pct >= 50 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
                    )}>
                      {pct}% high-confidence
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-xs">
                      <thead>
                        <tr className="border-b border-border bg-secondary/40">
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Conf</th>
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Policy #</th>
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Client</th>
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Carrier</th>
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">LOB</th>
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">TRX</th>
                          <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Premium</th>
                          <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Split Comm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sample.map(row => (
                          <tr key={row.id} className="group hover:bg-secondary/30" title={row.raw_line}>
                            <td className="px-3 py-1.5">
                              <span className={cn(
                                "rounded px-1.5 py-0.5 font-mono font-bold text-[10px]",
                                row.confidence?.level === "high" ? "bg-success/15 text-success" :
                                row.confidence?.level === "medium" ? "bg-warning/15 text-warning" :
                                "bg-destructive/15 text-destructive"
                              )}>
                                {row.confidence?.score ?? "?"}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 font-mono text-foreground">{row.policy_number || <span className="text-destructive">MISSING</span>}</td>
                            <td className="max-w-[120px] truncate px-3 py-1.5 text-foreground">{row.client_name || "—"}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{row.carrier || "—"}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{row.lob || "—"}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{row.trans_type || "—"}</td>
                            <td className="px-3 py-1.5 text-right text-muted-foreground">{row.premium > 0 ? formatCurrency(row.premium) : "—"}</td>
                            <td className={cn(
                              "px-3 py-1.5 text-right font-medium",
                              row.commission < 0 ? "text-destructive" : "text-foreground"
                            )}>
                              {formatCurrency(row.commission)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {comm.data.length > 8 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      Showing first 8 of {comm.data.length} records — hover any row to see the raw source line.
                      {lowConf > 0 && (
                        <span className="ml-1 text-warning"> {lowConf} low-confidence rows — check that this is an EZLynx Horizon commission statement PDF.</span>
                      )}
                    </p>
                  )}
                </div>
              )
            })()}

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

              // Build EZLynx policy list with premium + isActive for 3-pass matcher
              const nameIdx = columnMap.name ?? -1
              const activePolicies: string[][] = []

              // Determine isActive: policy is active when its expiration date is in the
              // future, OR when no date columns are mapped (treat all as active).
              const today = new Date()
              today.setHours(0, 0, 0, 0)

              const ezlynxList: { policyNumber: string; clientName: string; premium: number; isActive: boolean }[] = []
              policy.data.forEach((row, i) => {
                if (!policy.excludedIndices.has(i)) {
                  activePolicies.push(row)
                  const polNum   = polIdx  >= 0 ? (row[polIdx]  ?? "") : ""
                  const clientNm = nameIdx >= 0 ? (row[nameIdx] ?? "") : ""
                  const prem     = premIdx >= 0 ? cleanNum(row[premIdx]) : 0

                  // Expiration-based activity check
                  let isActive = true
                  if (expIdx >= 0 && row[expIdx]) {
                    const expDate = new Date(row[expIdx])
                    if (!isNaN(expDate.getTime())) isActive = expDate >= today
                  }

                  if (polNum) ezlynxList.push({ policyNumber: polNum, clientName: clientNm, premium: prem, isActive })
                }
              })

              // 3-pass cascade match — returns per-row MatchType + aggregate totals + premium model
              const ms: MatchStats = matchCommRows(ezlynxList, comm.data)
              const totalMatched = ms.exactCount + ms.suffixCount + ms.rewriteCount
              const ezlynxTotal  = ezlynxList.length

              // Match Rate = (matched comm rows / total comm rows) × 100
              const matchRate = comm.data.length > 0
                ? (totalMatched / comm.data.length) * 100
                : 0

              // Retention Rate — EZLynx active policies with at least one exact/suffix match
              const matchedEZPolicies = new Set<string>()
              comm.data.forEach(c => {
                const t = ms.byId.get(c.id)
                if (t === "exact" || t === "suffix") {
                  matchedEZPolicies.add(normalizePolicy(c.policy_number))
                }
              })
              const retentionRate = ezlynxTotal > 0
                ? (matchedEZPolicies.size / ezlynxTotal) * 100
                : 0
              const newPolicyRate = ezlynxTotal > 0
                ? ((ezlynxTotal - matchedEZPolicies.size) / ezlynxTotal) * 100
                : 0

              const totalCommission = comm.data.reduce((s, c) => s + c.commission, 0)

              // ── 12-Month Annualization Guardrail ──────────────────────────────────
              const distinctMonths = new Set(
                comm.data.map(c => c.month).filter(m => m && m !== "Unknown")
              )
              const nMonths = distinctMonths.size || 1
              const annualizedCommission = totalCommission * (12 / nMonths)
              const isAnnualized = nMonths < 12

              // ── Policy Persistence Tracker ────────────────────────────────────────
              // For each normalized policy number, track which distinct months it appeared in.
              const policyMonthMap = new Map<string, Set<string>>()
              comm.data.forEach(c => {
                const norm = normalizePolicy(c.policy_number)
                if (!norm) return
                if (!policyMonthMap.has(norm)) policyMonthMap.set(norm, new Set())
                if (c.month && c.month !== "Unknown") policyMonthMap.get(norm)!.add(c.month)
              })
              // Classify by month coverage
              const persistActive   = [...policyMonthMap.values()].filter(s => s.size >= 10).length  // 10-12/12
              const persistPartial  = [...policyMonthMap.values()].filter(s => s.size >= 4 && s.size < 10).length
              const persistLapsed   = [...policyMonthMap.values()].filter(s => s.size > 0 && s.size < 4).length

              return (
                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <p className="text-xs font-bold text-foreground">Book Analytics</p>
                    <span className="text-[10px] text-muted-foreground">{nMonths} month{nMonths !== 1 ? "s" : ""} of data &bull; {Object.keys(comm.files).length} file{Object.keys(comm.files).length !== 1 ? "s" : ""}</span>
                  </div>

                  {/* Annualization banner */}
                  {isAnnualized && (
                    <div className="mb-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/8 px-3 py-2">
                      <span className="mt-0.5 shrink-0 text-warning">&#9432;</span>
                      <p className="text-xs text-warning">
                        <span className="font-bold">Annualized from {nMonths} month{nMonths !== 1 ? "s" : ""} of statement data.</span>{" "}
                        Effective annual commission estimated at {formatCurrency(annualizedCommission)} ({nMonths}/12 months uploaded).
                        Upload the remaining {12 - nMonths} statement{12 - nMonths !== 1 ? "s" : ""} for a full 12-month trailing figure.
                      </p>
                    </div>
                  )}

                  {/* Match breakdown row */}
                  <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="font-semibold text-muted-foreground">Match breakdown:</span>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-600 dark:text-emerald-400">{ms.exactCount} Exact</span>
                    <span className="rounded-full bg-sky-500/15 px-2 py-0.5 font-bold text-sky-600 dark:text-sky-400">{ms.suffixCount} Term Suffix</span>
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-bold text-amber-600 dark:text-amber-400">{ms.rewriteCount} Rewrite</span>
                    <span className="rounded-full bg-destructive/15 px-2 py-0.5 font-bold text-destructive">{ms.unmatchedCount} Unmatched</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-lg font-extrabold text-primary">{totalMatched}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Matched Rows</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-lg font-extrabold text-warning">{ms.unmatchedCount}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Unmatched Rows</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-lg font-extrabold text-success">{matchRate.toFixed(1)}%</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Match Rate</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 text-center" title="EZLynx policies with at least one exact or suffix-matched commission row">
                      <p className="text-lg font-extrabold text-success">{retentionRate > 0 ? retentionRate.toFixed(1) + "%" : "N/A"}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Retention Rate</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 text-center" title="EZLynx policies with no commission statement entries">
                      <p className="text-lg font-extrabold text-primary">{newPolicyRate > 0 ? newPolicyRate.toFixed(1) + "%" : "N/A"}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">New Policy Rate</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-lg font-extrabold text-success">{formatCurrency(ms.matchedCommTotal)}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Matched Comm $</p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-lg font-extrabold text-foreground">{formatCurrency(totalCommission)}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">
                        {isAnnualized ? `${nMonths}-Mo Commission` : "12-Mo Commission"}
                      </p>
                    </div>
                    {isAnnualized && (
                      <div className="rounded-lg border border-warning/40 bg-warning/8 p-3 text-center" title={`Extrapolated from ${nMonths} months of data`}>
                        <p className="text-lg font-extrabold text-warning">{formatCurrency(annualizedCommission)}</p>
                        <p className="text-[10px] font-semibold text-muted-foreground">Annualized (est.)</p>
                        <p className="mt-0.5 text-[9px] text-muted-foreground/70">{nMonths}/12 months</p>
                      </div>
                    )}
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-lg font-extrabold text-warning">{formatCurrency(ms.unmatchedCommTotal)}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Unmatched Comm $</p>
                    </div>
                    <div
                      className="rounded-lg border border-border bg-card p-3 text-center"
                      title={`Matched active EZLynx premium: ${formatCurrency(ms.matchedActiveEzlynxPremium)} + Estimated unmatched: ${formatCurrency(ms.estimatedUnmatchedPremium)} (@ ${(ms.effectiveCommRate * 100).toFixed(1)}% eff. rate)`}
                    >
                      <p className="text-lg font-extrabold text-foreground">{formatCurrency(ms.totalBookPremium)}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">Total Book Premium</p>
                      <p className="mt-0.5 text-[9px] text-muted-foreground/70">
                        {formatCurrency(ms.matchedActiveEzlynxPremium)} matched + {formatCurrency(ms.estimatedUnmatchedPremium)} est.
                      </p>
                    </div>
                    {(() => {
                      const avgConf = comm.data.length > 0
                        ? Math.round(comm.data.reduce((s, c) => s + (c.confidence?.score ?? 50), 0) / comm.data.length)
                        : 0
                      const confLevel: ConfidenceLevel = avgConf >= 70 ? "high" : avgConf >= 45 ? "medium" : "low"
                      return (
                        <div className="rounded-lg border border-border bg-card p-3 text-center">
                          <p className={cn("text-lg font-extrabold", confidenceColor(confLevel))}>{avgConf}/100</p>
                          <p className="text-[10px] font-semibold text-muted-foreground">Avg Parse Confidence</p>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Policy Persistence Tracker */}
                  {nMonths >= 2 && (
                    <div className="mt-3 rounded-lg border border-border bg-secondary/30 p-3">
                      <p className="mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        12-Month Policy Lifecycle &bull; {policyMonthMap.size} unique policies tracked
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-md border border-success/30 bg-success/8 p-2 text-center" title="Paid commission in 10-12 distinct months">
                          <p className="text-base font-extrabold text-success">{persistActive}</p>
                          <p className="text-[9px] font-semibold text-muted-foreground">Consistently Active</p>
                          <p className="text-[8px] text-muted-foreground/70">10+ months</p>
                        </div>
                        <div className="rounded-md border border-warning/30 bg-warning/8 p-2 text-center" title="Paid commission in 4-9 distinct months">
                          <p className="text-base font-extrabold text-warning">{persistPartial}</p>
                          <p className="text-[9px] font-semibold text-muted-foreground">Partial / Seasonal</p>
                          <p className="text-[8px] text-muted-foreground/70">4–9 months</p>
                        </div>
                        <div className="rounded-md border border-destructive/30 bg-destructive/8 p-2 text-center" title="Paid commission in fewer than 4 distinct months">
                          <p className="text-base font-extrabold text-destructive">{persistLapsed}</p>
                          <p className="text-[9px] font-semibold text-muted-foreground">Lapsed / Cancelled</p>
                          <p className="text-[8px] text-muted-foreground/70">1–3 months</p>
                        </div>
                      </div>
                    </div>
                  )}
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

              // Build 3-pass match map for per-row badges (reuse same inputs as Stats Panel)
              const polIdx = columnMap.policy ?? -1
              const nameIdx = columnMap.name ?? -1
              let tableMatchMap: Map<string, MatchType> | null = null
              if (policy.loaded && polIdx >= 0) {
                const ezList = policy.data
                  .filter((_, i) => !policy.excludedIndices.has(i))
                  .map(row => ({
                    policyNumber: row[polIdx] ?? "",
                    clientName:   nameIdx >= 0 ? (row[nameIdx] ?? "") : "",
                  }))
                  .filter(e => e.policyNumber)
                tableMatchMap = matchCommRows(ezList, filteredComm).byId
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
                          <th className="sticky top-0 z-10 border-b-2 border-border bg-secondary px-2 py-2 text-center font-semibold text-muted-foreground">Conf</th>
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
                          const matchType: MatchType = tableMatchMap?.get(c.id) ?? "unmatched"
                          const rowBg =
                            matchType === "exact"     ? "bg-emerald-500/5" :
                            matchType === "suffix"    ? "bg-sky-500/5" :
                            matchType === "rewrite"   ? "bg-amber-500/5" : ""
                          return (
                            <tr key={c.id} className={cn("border-b border-border", rowBg)}>
                              {policy.loaded && (
                                <td className="px-2 py-1.5 text-center">
                                  {matchType === "exact" && (
                                    <span className="inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Yes</span>
                                  )}
                                  {matchType === "suffix" && (
                                    <span className="inline-block rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400">Term Suffix</span>
                                  )}
                                  {matchType === "rewrite" && (
                                    <span className="inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">Rewrite</span>
                                  )}
                                  {matchType === "unmatched" && (
                                    <span className="inline-block rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">Unmatched</span>
                                  )}
                                </td>
                              )}
                              <td className="px-2 py-1.5 text-center" title={c.confidence?.reasons?.join(", ") || ""}>
                                <span className={cn(
                                  "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                                  c.confidence?.level === "high" ? "bg-success/15 text-success" :
                                  c.confidence?.level === "medium" ? "bg-warning/15 text-warning" :
                                  "bg-destructive/15 text-destructive"
                                )}>
                                  {c.confidence?.score ?? "?"}
                                </span>
                              </td>
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
                  <SmartInput
                    inputType="currency"
                    value={finRevenue || null}
                    onValueChange={(v) => setFinRevenue(v ?? 0)}
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
                  <SmartInput
                    inputType="currency"
                    value={finOpex || null}
                    onValueChange={(v) => setFinOpex(v ?? 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-foreground">
                    {"Owner's Compensation (Add-back)"}
                  </label>
                  <SmartInput
                    inputType="currency"
                    value={finOwnerComp || null}
                    onValueChange={(v) => setFinOwnerComp(v ?? 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-foreground">
                    One-Time / Non-Recurring (Add-back)
                  </label>
                  <SmartInput
                    inputType="currency"
                    value={finAddbacks || null}
                    onValueChange={(v) => setFinAddbacks(v ?? 0)}
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
            factors={valuationFactors}
            onFactorsChange={setValuationFactors}
            isOverridden={isOverridden}
            onIsOverriddenChange={setIsOverridden}
            overrideReason={overrideReason}
            onOverrideReasonChange={setOverrideReason}
            intel={intel}
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
