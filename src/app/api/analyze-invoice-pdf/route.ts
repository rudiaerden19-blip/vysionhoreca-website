/**
 * PDF Factuur Parser API
 * POST /api/analyze-invoice-pdf
 *
 * Accepteert een PDF, leest de tekst uit en extraheert:
 * leverancier, factuurnummer, datum en bedrag.
 *
 * MULTI-TENANT: tenant_slug is verplicht — data wordt NOOIT
 * geschreven zonder geldige tenant. Elke tenant ziet alleen zijn eigen data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractText } from 'unpdf'

export const runtime = 'nodejs'
export const maxDuration = 30

// ── Extractie helpers ────────────────────────────────────────────

function extractSupplier(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // 1. Expliciete labels
  const labelPatterns = [
    /^(?:verkoper|leverancier|van|from|supplier|afzender)[:\s]+(.+)/i,
    /^(?:bedrijfsnaam|company|naam|name)[:\s]+(.+)/i,
  ]
  for (const line of lines) {
    for (const pat of labelPatterns) {
      const m = line.match(pat)
      if (m) return m[1].trim().substring(0, 100)
    }
  }

  // 2. Lijn vóór BTW-nummer
  for (let i = 1; i < lines.length; i++) {
    if (/BTW[:\s-]*BE\s*0?\d{9}/i.test(lines[i]) || /\bBE\s*0\d{9}\b/i.test(lines[i])) {
      const prev = lines[i - 1]
      if (prev && prev.length > 2 && !/^\d/.test(prev)) return prev.substring(0, 100)
    }
  }

  // 3. Bekende Belgische groothandels/leveranciers herkennen in tekst
  const knownSuppliers = [
    'Metro', 'Makro', 'Sligro', 'Bidfood', 'Hanos', 'Vandemoortele',
    'Bofrost', 'Aviko', 'Lamb Weston', 'Farm Frites', 'Mydibel',
    'Telenet', 'Proximus', 'Orange', 'VOO', 'Fluvius', 'ORES',
    'Luminus', 'Engie', 'TotalEnergies', 'Belfius', 'KBC', 'ING', 'BNP',
    'Vivaqua', 'De Watergroep', 'TMVW',
  ]
  for (const s of knownSuppliers) {
    if (new RegExp(`\\b${s}\\b`, 'i').test(text)) return s
  }

  // 4. Eerste niet-triviale lijn bovenaan het document
  const skipPatterns = [
    /^\d{1,2}[\/\-.]\d{1,2}/,   // datum
    /^factuur/i,
    /^invoice/i,
    /^tel[:\s]/i,
    /^fax[:\s]/i,
    /^www\./i,
    /^http/i,
    /^@/,
    /^\+\d/,                      // telefoonnummer
    /^[A-Z]{1,3}\d{3,}/,         // postcode-achtig
  ]
  for (const line of lines.slice(0, 15)) {
    if (line.length < 3) continue
    if (skipPatterns.some(p => p.test(line))) continue
    // Bevat minstens 2 letters naast elkaar (echte naam)
    if (/[A-Za-z]{2,}/.test(line)) return line.substring(0, 100)
  }
  return ''
}

// ── Categorie detectie ────────────────────────────────────────────

type FixedCostCategory = 'RENT' | 'PERSONNEL' | 'ELECTRICITY' | 'GAS' | 'WATER' | 'INSURANCE' | 'LEASING' | 'LOAN' | 'SUBSCRIPTIONS' | 'OTHER'
type VariableCostCategory = 'INGREDIENTS' | 'PACKAGING' | 'CLEANING' | 'MAINTENANCE' | 'MARKETING' | 'OTHER'

function detectFixedCategory(text: string): FixedCostCategory {
  const t = text.toLowerCase()
  if (/\b(huur|verhuur|huurcontract|loyer|rent)\b/.test(t)) return 'RENT'
  if (/\b(loon|personeel|werknemers|social|rsz|onss|payroll|salaris)\b/.test(t)) return 'PERSONNEL'
  if (/\b(elektriciteit|electricité|stroom|kwh|kwa|energie|energy|fluvius|engie|luminus)\b/.test(t)) return 'ELECTRICITY'
  if (/\b(aardgas|gas|m³|m3|gasmeter)\b/.test(t)) return 'GAS'
  if (/\b(water|waterverbruik|m³|vivaqua|watergroep|tmvw)\b/.test(t)) return 'WATER'
  if (/\b(verzekering|assurance|insurance|polis|ba |brand)\b/.test(t)) return 'INSURANCE'
  if (/\b(leasing|lease|huurkoop|renting)\b/.test(t)) return 'LEASING'
  if (/\b(lening|krediet|loan|credit|aflossing|intrest)\b/.test(t)) return 'LOAN'
  if (/\b(abonnement|subscription|licentie|license|software|hosting|telenet|proximus|orange|voo)\b/.test(t)) return 'SUBSCRIPTIONS'
  return 'OTHER'
}

function detectVariableCategory(text: string): VariableCostCategory {
  const t = text.toLowerCase()
  if (/\b(friet|frites|frieten|aardappel|vlees|kip|vis|groenten|metro|makro|sligro|bidfood|aviko|lamb weston|mydibel|bofrost|ingredient|voeding|levensmiddel)\b/.test(t)) return 'INGREDIENTS'
  if (/\b(verpakking|packaging|zak|bakje|beker|folie|wrap|box|dozen|karton)\b/.test(t)) return 'PACKAGING'
  if (/\b(schoonmaak|cleaning|poetsmiddel|zeep|desinfect|hygiëne|sanitair)\b/.test(t)) return 'CLEANING'
  if (/\b(onderhoud|reparatie|maintenance|herstelling|technisch|installatie)\b/.test(t)) return 'MAINTENANCE'
  if (/\b(marketing|reclame|advertentie|flyer|social media|drukwerk|publicité)\b/.test(t)) return 'MARKETING'
  return 'OTHER'
}

function extractInvoiceNumber(text: string): string {
  const patterns = [
    /(?:factuurnummer|invoice\s*no\.?|inv\.?\s*no\.?|facture\s*n[o°]\.?|reference|ref\.?)[:\s#]*([A-Z0-9][-A-Z0-9\/_.]{2,25})/i,
    /(?:nr\.?|number|nummer)[:\s#]*([A-Z0-9][-A-Z0-9\/_.]{2,25})/i,
    /\b(INV[-\/]?\d{4,})\b/i,
    /\b(FAC[-\/]?\d{4,})\b/i,
    /\b(\d{4,}[-\/]\d{2,})\b/,
  ]
  for (const pat of patterns) {
    const m = text.match(pat)
    if (m) return m[1].trim().substring(0, 50)
  }
  return ''
}

function normalizeDate(raw: string): string {
  const parts = raw.split(/[\/\-.]/)
  if (parts.length !== 3) return ''
  let day: string, month: string, year: string
  if (parts[0].length === 4) {
    ;[year, month, day] = parts
  } else {
    ;[day, month] = parts
    year = parts[2].length === 4 ? parts[2] : parseInt(parts[2]) < 50 ? `20${parts[2]}` : `19${parts[2]}`
  }
  const d = parseInt(day), mo = parseInt(month), y = parseInt(year)
  if (isNaN(d) || isNaN(mo) || isNaN(y) || mo < 1 || mo > 12 || d < 1 || d > 31) return ''
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function extractDate(text: string): string {
  const today = new Date().toISOString().split('T')[0]
  const contextPatterns = [
    /(?:factuurdatum|invoice\s*date|datum|date)[:\s]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
    /(?:factuurdatum|invoice\s*date|datum|date)[:\s]*(\d{4}[\/\-.]\d{2}[\/\-.]\d{2})/i,
  ]
  for (const pat of contextPatterns) {
    const m = text.match(pat)
    if (m) return normalizeDate(m[1]) || today
  }
  const datePatterns = [
    /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})\b/,
    /\b(\d{4}[\/\-.]\d{2}[\/\-.]\d{2})\b/,
  ]
  for (const pat of datePatterns) {
    const m = text.match(pat)
    if (m) return normalizeDate(m[1]) || today
  }
  return today
}

function parseEuroAmount(raw: string): number {
  let s = raw.trim()
  if (/^\d{1,3}(\.\d{3})+(,\d{2})?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(,\d{3})+(\.\d{2})?$/.test(s)) s = s.replace(/,/g, '')
  else s = s.replace(',', '.')
  const v = parseFloat(s)
  return isNaN(v) ? 0 : Math.round(v * 100) / 100
}

function extractAmount(text: string): number {
  const contextPatterns = [
    /(?:totaal\s*te\s*betalen|te\s*betalen|total\s*(?:amount\s*)?due|grand\s*total|total\s*incl\.?|bedrag\s*incl\.?)[:\s€$]*([0-9]{1,6}[,.]?[0-9]{0,3}(?:[,.][0-9]{2})?)/i,
    /(?:totaal|total|subtotaal|subtotal)[:\s€$]*([0-9]{1,6}[,.]?[0-9]{0,3}(?:[,.][0-9]{2})?)/i,
  ]
  for (const pat of contextPatterns) {
    const m = text.match(pat)
    if (m) { const a = parseEuroAmount(m[1]); if (a > 0) return a }
  }
  const allAmounts = [...text.matchAll(/€\s*([0-9]{1,6}[,.]?[0-9]{0,3}(?:[,.][0-9]{2})?)/g)]
    .map(m => parseEuroAmount(m[1])).filter(a => a > 0)
  return allAmounts.length > 0 ? Math.max(...allAmounts) : 0
}

// ── POST handler ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const tenantSlug = formData.get('tenant_slug') as string | null

    if (!tenantSlug) {
      return NextResponse.json({ success: false, error: 'tenant_slug ontbreekt' }, { status: 401 })
    }
    if (!file) {
      return NextResponse.json({ success: false, error: 'Geen bestand ontvangen' }, { status: 400 })
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ success: false, error: 'Alleen PDF bestanden worden ondersteund' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Bestand te groot (max 10 MB)' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    const { text } = await extractText(uint8Array, { mergePages: true })

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        { success: false, error: 'Kon geen tekst uitlezen. Is het een gescande afbeelding?' },
        { status: 422 }
      )
    }

    const supplier        = extractSupplier(text)
    const invoiceNumber   = extractInvoiceNumber(text)
    const invoiceDate     = extractDate(text)
    const amount          = extractAmount(text)
    const description     = supplier ? `Factuur ${supplier}`.substring(0, 80) : 'Aankoop leverancier'
    const fixedCategory   = detectFixedCategory(text)
    const variableCategory = detectVariableCategory(text)

    return NextResponse.json({
      success: true,
      supplier,
      invoiceNumber,
      invoiceDate,
      amount,
      description,
      fixedCategory,
      variableCategory,
    })

  } catch (error) {
    console.error('[analyze-invoice-pdf] Error:', error)
    return NextResponse.json({ success: false, error: 'Fout bij verwerken van PDF' }, { status: 500 })
  }
}
