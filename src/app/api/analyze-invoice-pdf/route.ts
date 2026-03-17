/**
 * PDF Factuur Parser API — powered by Gemini AI
 * POST /api/analyze-invoice-pdf
 *
 * Leest tekst uit PDF via unpdf, stuurt naar Gemini AI voor slimme extractie.
 * Veel betrouwbaarder dan regex voor alle factuurformaten.
 *
 * MULTI-TENANT: tenant_slug is verplicht.
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractText } from 'unpdf'

export const runtime = 'nodejs'
export const maxDuration = 30

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const tenantSlug = formData.get('tenant_slug') as string | null

    if (!tenantSlug)
      return NextResponse.json({ success: false, error: 'tenant_slug ontbreekt' }, { status: 401 })
    if (!file)
      return NextResponse.json({ success: false, error: 'Geen bestand ontvangen' }, { status: 400 })
    if (file.type !== 'application/pdf')
      return NextResponse.json({ success: false, error: 'Alleen PDF bestanden' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json({ success: false, error: 'Bestand te groot (max 10 MB)' }, { status: 400 })

    // Tekst uitlezen uit PDF
    const uint8Array = new Uint8Array(await file.arrayBuffer())
    const { text } = await extractText(uint8Array, { mergePages: true })

    if (!text || text.trim().length < 20)
      return NextResponse.json(
        { success: false, error: 'Kon geen tekst uitlezen. Is het een gescande afbeelding?' },
        { status: 422 }
      )

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      // Geen Gemini key: fallback naar basis regex
      return fallbackExtract(text)
    }

    // Gemini AI prompt
    const prompt = `Je bent een factuur-assistent voor een Belgisch horecabedrijf.
Analyseer deze factuurtekst en geef de gevraagde info terug als JSON.

FACTUURTEKST:
"""
${text.substring(0, 3000)}
"""

Geef ENKEL dit JSON terug, geen uitleg:
{
  "supplier": "naam van de leverancier/verkoper (NIET de bank, NIET het horecabedrijf zelf)",
  "invoiceNumber": "factuurnummer of leeg",
  "invoiceDate": "datum in formaat YYYY-MM-DD of leeg",
  "amount": getal (totaal te betalen bedrag incl BTW, enkel het getal zonder euroteken),
  "description": "korte beschrijving van wat er gekocht werd (max 60 tekens)",
  "fixedCategory": een van: "RENT"|"PERSONNEL"|"ELECTRICITY"|"GAS"|"WATER"|"INSURANCE"|"LEASING"|"LOAN"|"SUBSCRIPTIONS"|"OTHER",
  "variableCategory": een van: "INGREDIENTS"|"PACKAGING"|"CLEANING"|"MAINTENANCE"|"MARKETING"|"OTHER"
}

REGELS:
- supplier = de firma die de factuur STUURT (bovenaan de factuur), niet de bank
- Als het een voedingsfactuur is (aardappelen, friet, vlees, groenten...) → variableCategory = "INGREDIENTS"
- Als het een energiefactuur is → fixedCategory = "ELECTRICITY" of "GAS"
- Als het een huurcontract is → fixedCategory = "RENT"
- amount = het eindbedrag dat betaald moet worden (totaal incl BTW)
- Geef NOOIT een bank (Belfius, KBC, ING...) als supplier`

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
      }),
    })

    if (!res.ok) {
      console.error('[analyze-invoice-pdf] Gemini error:', res.status)
      return fallbackExtract(text)
    }

    const geminiData = await res.json()
    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // JSON uit het antwoord halen
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[analyze-invoice-pdf] Geen JSON in Gemini antwoord:', raw)
      return fallbackExtract(text)
    }

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      success: true,
      supplier:          parsed.supplier          || '',
      invoiceNumber:     parsed.invoiceNumber      || '',
      invoiceDate:       parsed.invoiceDate        || new Date().toISOString().split('T')[0],
      amount:            typeof parsed.amount === 'number' ? parsed.amount : parseFloat(parsed.amount) || 0,
      description:       parsed.description        || (parsed.supplier ? `Factuur ${parsed.supplier}` : 'Aankoop leverancier'),
      fixedCategory:     parsed.fixedCategory      || 'OTHER',
      variableCategory:  parsed.variableCategory   || 'OTHER',
    })

  } catch (error) {
    console.error('[analyze-invoice-pdf] Error:', error)
    return NextResponse.json({ success: false, error: 'Fout bij verwerken van PDF' }, { status: 500 })
  }
}

// ── Fallback: minimale regex als Gemini niet beschikbaar is ───────

function fallbackExtract(text: string): NextResponse {
  const today = new Date().toISOString().split('T')[0]
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Bedrag: grootste getal met € teken
  const amounts = [...text.matchAll(/€\s*([0-9]+[,.]?[0-9]*)/g)]
    .map(m => parseFloat(m[1].replace(',', '.')))
    .filter(n => n > 0)
  const amount = amounts.length > 0 ? Math.max(...amounts) : 0

  // Datum
  const dateMatch = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/)
  const invoiceDate = dateMatch
    ? `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`
    : today

  // Leverancier: eerste zinnige lijn
  const skipLine = (l: string) =>
    l.length < 3 ||
    /^\d/.test(l) ||
    /^(factuur|invoice|tel|fax|www|http|BE\d{2})/i.test(l) ||
    /IBAN|BIC|BTW/i.test(l)

  const supplier = lines.find(l => !skipLine(l)) || ''

  return NextResponse.json({
    success: true,
    supplier,
    invoiceNumber: '',
    invoiceDate,
    amount,
    description: supplier ? `Factuur ${supplier}`.substring(0, 80) : 'Aankoop leverancier',
    fixedCategory: 'OTHER',
    variableCategory: 'INGREDIENTS',
  })
}
