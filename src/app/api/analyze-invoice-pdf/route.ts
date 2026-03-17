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

export const runtime = 'nodejs'
export const maxDuration = 30

/* eslint-disable @typescript-eslint/no-var-requires */
// pdf-parse heeft geen ESM default export — gebruik require voor CJS compatibiliteit
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>
/* eslint-enable @typescript-eslint/no-var-requires */

// ── Extractie helpers ────────────────────────────────────────────

function extractSupplier(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

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
  for (let i = 1; i < lines.length; i++) {
    if (/BTW[:\s-]*BE\s*0?\d{9}/i.test(lines[i]) || /\bBE\s*0\d{9}\b/i.test(lines[i])) {
      const prev = lines[i - 1]
      if (prev && prev.length > 2 && !/^\d/.test(prev)) return prev.substring(0, 100)
    }
  }
  for (const line of lines.slice(0, 8)) {
    if (line.length > 3 && !/^\d{1,2}[\/\-.]\d{1,2}/.test(line) && !/^factuur/i.test(line)) {
      return line.substring(0, 100)
    }
  }
  return ''
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

    // MULTI-TENANT: tenant_slug is verplicht
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

    const buffer = Buffer.from(await file.arrayBuffer())
    const pdfData = await pdfParse(buffer)
    const text = pdfData.text

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        { success: false, error: 'Kon geen tekst uitlezen. Is het een gescande afbeelding?' },
        { status: 422 }
      )
    }

    const supplier      = extractSupplier(text)
    const invoiceNumber = extractInvoiceNumber(text)
    const invoiceDate   = extractDate(text)
    const amount        = extractAmount(text)
    const description   = supplier ? `Factuur ${supplier}`.substring(0, 80) : 'Aankoop leverancier'

    return NextResponse.json({
      success: true,
      supplier,
      invoiceNumber,
      invoiceDate,
      amount,
      description,
    })

  } catch (error) {
    console.error('[analyze-invoice-pdf] Error:', error)
    return NextResponse.json({ success: false, error: 'Fout bij verwerken van PDF' }, { status: 500 })
  }
}
