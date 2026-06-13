import * as XLSX from 'xlsx'

export type RetailImportRow = {
  name: string
  barcode: string
  price: number
  stock: number
  article_number: string | null
}

const NAME_KEYS = ['name', 'naam', 'product', 'productnaam', 'omschrijving', 'title', 'artikel']
const BARCODE_KEYS = ['barcode', 'ean', 'gtin', 'bar code', 'barcode/ean', 'streepjescode']
const PRICE_KEYS = ['price', 'prijs', 'verkoopprijs', 'vk prijs', 'vk_prijs', 'prijs incl', 'prijs incl.']
const STOCK_KEYS = ['stock', 'voorraad', 'qty', 'quantity', 'aantal', 'stock_quantity']
const ARTICLE_KEYS = ['article', 'artikel', 'sku', 'artikelnummer', 'artikelnr', 'art nr', 'artikel nr']

function normHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[._]/g, ' ')
}

function pickField(row: Record<string, string>, keys: string[]): string {
  for (const [rawKey, val] of Object.entries(row)) {
    const nk = normHeader(rawKey)
    if (keys.some((k) => nk === k || nk.includes(k))) {
      return String(val ?? '').trim()
    }
  }
  return ''
}

function parsePrice(raw: string): number {
  const s = raw.replace(/€/g, '').trim().replace(/\s/g, '')
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0
}

function parseIntStock(raw: string): number {
  const n = Number.parseInt(raw.replace(/\D/g, ''), 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function mapRecordToImportRow(row: Record<string, string>): RetailImportRow | null {
  const name = pickField(row, NAME_KEYS)
  const barcodeRaw = pickField(row, BARCODE_KEYS) || pickField(row, ARTICLE_KEYS)
  const digits = barcodeRaw.replace(/\D/g, '')
  const barcode = digits.length >= 8 ? digits : barcodeRaw.trim()
  if (!name || !barcode) return null
  const price = parsePrice(pickField(row, PRICE_KEYS))
  const stock = parseIntStock(pickField(row, STOCK_KEYS))
  const article = pickField(row, ARTICLE_KEYS) || barcode
  return {
    name,
    barcode,
    price,
    stock,
    article_number: article || null,
  }
}

function detectDelimiter(line: string): ',' |  ';' |  '\t'{
  const counts = { ',': 0, ';': 0, '\t': 0 }
  let inQuote = false
  for (const ch of line) {
    if (ch === '"') inQuote = !inQuote
    else if (!inQuote && ch in counts) counts[ch as keyof typeof counts]++
  }
  if (counts[';'] >= counts[','] && counts[';'] >= counts['\t']) return ';'
  if (counts['\t'] >= counts[',']) return '\t'
  return ','
}

function parseCsvLine(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"'
        i++
      } else inQuote = !inQuote
    } else if (ch === delim && !inQuote) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

export function parseRetailCsvText(text: string): RetailImportRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const delim = detectDelimiter(lines[0])
  const headers = parseCsvLine(lines[0], delim)
  const rows: RetailImportRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i], delim)
    if (cells.every((c) => !c)) continue
    const rec: Record<string, string> = {}
    headers.forEach((h, idx) => {
      rec[h] = cells[idx] ?? ''
    })
    const mapped = mapRecordToImportRow(rec)
    if (mapped) rows.push(mapped)
  }
  return rows
}

export function parseRetailExcelBuffer(buffer: ArrayBuffer): RetailImportRow[] {
  const wb = XLSX.read(buffer, { type: 'array'})
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return []
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: ''})
  const rows: RetailImportRow[] = []
  for (const row of json) {
    const rec: Record<string, string> = {}
    for (const [k, v] of Object.entries(row)) {
      rec[k] = String(v ?? '').trim()
    }
    const mapped = mapRecordToImportRow(rec)
    if (mapped) rows.push(mapped)
  }
  return rows
}
