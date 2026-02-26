import { readFileSync } from 'fs'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const pdfPath = 'user_read_only_context/text_attachments/MICH185MI-Statement-2026-02-vyVtV.pdf'
const data = new Uint8Array(readFileSync(pdfPath))
const pdf = await getDocument(data).promise

console.log(`Pages: ${pdf.numPages}\n`)

// Only look at page 4 (where the commission detail starts, based on "Page 4 of 10" area)
for (let p = 1; p <= Math.min(pdf.numPages, 5); p++) {
  const page = await pdf.getPage(p)
  const tc = await page.getTextContent()
  
  // Group by Y
  const rows = {}
  for (const item of tc.items) {
    if (!item.transform || !item.str) continue
    const str = item.str
    if (!str.trim()) continue
    const y = Math.round(item.transform[5])
    const x = Math.round(item.transform[4])
    const fontSize = Math.round(Math.abs(item.transform[0]))
    
    const foundKey = Object.keys(rows).find(k => Math.abs(Number(k) - y) <= 4)
    const key = foundKey || String(y)
    if (!rows[key]) rows[key] = []
    rows[key].push({ str, x, fontSize })
  }
  
  // Sort by Y descending (top first)
  const sortedKeys = Object.keys(rows).sort((a, b) => Number(b) - Number(a))
  
  console.log(`=== PAGE ${p} (${sortedKeys.length} rows) ===`)
  for (const yKey of sortedKeys) {
    const items = rows[yKey].sort((a, b) => a.x - b.x)
    const itemStrs = items.map(it => `"${it.str}"@x${it.x}(fs${it.fontSize})`).join(', ')
    console.log(`  Y=${yKey}: [${itemStrs}]`)
  }
  console.log()
}
