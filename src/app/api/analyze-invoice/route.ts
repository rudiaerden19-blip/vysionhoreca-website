import { NextRequest, NextResponse } from 'next/server'

export interface InvoiceItem {
  name: string
  quantity: number
  unit: string
  pricePerUnit: number
  totalPrice: number
  vatPercentage: number
}

export interface AnalyzeInvoiceResponse {
  success: boolean
  items?: InvoiceItem[]
  supplier?: string
  invoiceDate?: string
  invoiceNumber?: string
  totalAmount?: number
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeInvoiceResponse>> {
  try {
    const { image, mimeType } = await request.json()

    if (!image) {
      return NextResponse.json({ success: false, error: 'Geen afbeelding ontvangen' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      console.error('GOOGLE_GEMINI_API_KEY not set')
      return NextResponse.json({ success: false, error: 'Google Gemini API key niet geconfigureerd.' }, { status: 500 })
    }

    // Check image size (max 20MB base64)
    const imageSizeMB = (image.length * 0.75) / (1024 * 1024)
    if (imageSizeMB > 20) {
      return NextResponse.json({ success: false, error: 'Afbeelding is te groot (max 20MB).' }, { status: 400 })
    }

    console.log(`Analyzing invoice, image size: ${imageSizeMB.toFixed(2)}MB`)

    const prompt = `Je bent een factuur-lezer voor groothandel facturen. Lees ELKE regel op deze factuur.

KOLOMMEN OP DE FACTUUR:
- "Art. Nr." = artikelnummer
- "Omschrijving" = productnaam met verpakkingsinfo (bijv. "BRAADWORST WIT 24X150G VR")
- "Aantal" = hoeveel DOZEN er zijn gekocht (1, 2, 3, etc.)
- "Eh" = eenheid (CU, WUK, etc.)
- "Ehp" = PRIJS PER DOOS (dit is de prijs voor 1 doos!)
- "Subtotaal" = Aantal × Ehp (NIET gebruiken!)

BELANGRIJK - PRIJS PER DOOS:
- Neem ALTIJD de "Ehp" kolom (prijs per 1 doos)
- NOOIT het subtotaal nemen!
- Als Aantal=2 en Ehp=26.36, dan is prijs_per_doos=26.36 (NIET 52.72!)

Retourneer ALLEEN JSON:
{
  "supplier": "leverancier naam",
  "items": [
    {
      "omschrijving": "BRAADWORST WIT 24X150G VR",
      "aantal_dozen": 1,
      "prijs_per_doos": 29.47
    },
    {
      "omschrijving": "STUK 21X135G (KALKOENST) VAN ZON",
      "aantal_dozen": 2,
      "prijs_per_doos": 26.36
    }
  ]
}

REGELS:
1. omschrijving = KOPIEER EXACT inclusief codes zoals 24X150G, 30X100G, 21X135G, 250ST, etc.
2. aantal_dozen = de waarde uit kolom "Aantal" (hoeveel dozen gekocht)
3. prijs_per_doos = de waarde uit kolom "Ehp" (prijs voor 1 doos, NIET subtotaal!)
4. Lees ALLE regels, niet alleen de eerste paar
5. GEEN berekeningen doen, alleen kopiëren wat er staat`

    // Direct REST API call to Gemini (using v1beta for wider model support)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType || 'image/jpeg',
                    data: image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          }
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Gemini API error:', response.status, JSON.stringify(errorData))
      
      const errorMessage = errorData?.error?.message || response.statusText
      
      return NextResponse.json({ 
        success: false, 
        error: `API fout (${response.status}): ${errorMessage}` 
      }, { status: 500 })
    }

    const data = await response.json()
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!content) {
      console.error('No content in response:', data)
      return NextResponse.json({ success: false, error: 'Geen respons van AI' }, { status: 500 })
    }

    // Parse JSON from response
    let parsed
    try {
      let cleanContent = content.trim()
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7)
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3)
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3)
      }
      cleanContent = cleanContent.trim()
      
      parsed = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      return NextResponse.json({ 
        success: false, 
        error: 'Kon factuur niet goed lezen. Probeer een duidelijkere foto.' 
      }, { status: 400 })
    }

    // Parse everything from the omschrijving (description) that AI copied
    const validatedItems = (parsed.items || []).map((item: any) => {
      // Get data from AI - now with explicit prijs_per_doos
      const omschrijving = item.omschrijving || item.originalText || item.name || ''
      // Prioritize prijs_per_doos, fallback to older field names
      // Note: We use prijs_per_doos (Ehp column) - this is ALWAYS the price for 1 box
      // regardless of how many boxes were purchased (aantal_dozen)
      const prijsPerDoos = Number(item.prijs_per_doos) || Number(item.prijs) || Number(item.ehp) || 0
      
      console.log(`\n=== Processing: "${omschrijving}" ===`)
      console.log(`Prijs per doos (Ehp): €${prijsPerDoos.toFixed(2)}`)
      
      // Extract units per box from patterns in the description
      // This tells us how many ITEMS are in ONE box
      let stuksPerDoos = 1
      let unit = 'stuk'
      
      // Pattern 1: NUMBERxNUMBER pattern (e.g., 24X150G, 30X100G, 21X135G)
      // The FIRST number = how many items per box
      const packMatch = omschrijving.match(/(\d+)\s*[xX]\s*\d+/i)
      if (packMatch) {
        stuksPerDoos = parseInt(packMatch[1], 10)
        console.log(`Patroon gevonden "${packMatch[0]}": ${stuksPerDoos} stuks per doos`)
      }
      
      // Pattern 2: 250ST, 100ST (number followed by ST = stuks)
      if (stuksPerDoos === 1) {
        const stMatch = omschrijving.match(/(\d+)\s*ST\b/i)
        if (stMatch) {
          stuksPerDoos = parseInt(stMatch[1], 10)
          console.log(`ST patroon gevonden: ${stuksPerDoos} stuks per doos`)
        }
      }
      
      // Pattern 3: Volume (10L, 2.5L) - only if no X pattern
      if (stuksPerDoos === 1 && !omschrijving.match(/\d+\s*[xX]/i)) {
        const volumeMatch = omschrijving.match(/(\d+(?:[,.]\d+)?)\s*(L|LTR|LITER)\b/i)
        if (volumeMatch) {
          stuksPerDoos = parseFloat(volumeMatch[1].replace(',', '.'))
          unit = 'liter'
          console.log(`Volume gevonden: ${stuksPerDoos} liter`)
        }
      }
      
      // Pattern 4: Weight (10KG, 2.5KG) - only if no X pattern
      if (stuksPerDoos === 1 && !omschrijving.match(/\d+\s*[xX]/i)) {
        const weightMatch = omschrijving.match(/(\d+(?:[,.]\d+)?)\s*(KG|KILO)\b/i)
        if (weightMatch) {
          stuksPerDoos = parseFloat(weightMatch[1].replace(',', '.'))
          unit = 'kg'
          console.log(`Gewicht gevonden: ${stuksPerDoos} kg`)
        }
      }
      
      // CALCULATE PRICE PER UNIT
      // prijsPerDoos = price for 1 box (from Ehp column)
      // stuksPerDoos = items in 1 box (from description like 24X150G)
      // pricePerUnit = prijsPerDoos / stuksPerDoos
      const pricePerUnit = stuksPerDoos > 0 ? prijsPerDoos / stuksPerDoos : prijsPerDoos
      
      console.log(`\nBEREKENING:`)
      console.log(`Prijs per doos: €${prijsPerDoos.toFixed(2)}`)
      console.log(`Stuks per doos: ${stuksPerDoos}`)
      console.log(`Prijs per stuk: €${prijsPerDoos.toFixed(2)} / ${stuksPerDoos} = €${pricePerUnit.toFixed(4)}`)
      
      // Keep the full original description as the name
      // This preserves all the info like "BRAADWORST WIT 24X150G VR"
      return {
        name: omschrijving.trim(),
        quantity: stuksPerDoos,
        unit: unit,
        pricePerUnit: pricePerUnit,
        totalPrice: prijsPerDoos,
        vatPercentage: 6
      }
    })

    return NextResponse.json({
      success: true,
      supplier: parsed.supplier,
      invoiceDate: parsed.invoiceDate,
      invoiceNumber: parsed.invoiceNumber,
      totalAmount: parsed.totalAmount,
      items: validatedItems
    })

  } catch (error: any) {
    console.error('Invoice analysis error:', error)
    return NextResponse.json({ 
      success: false, 
      error: `Fout: ${error?.message || 'Onbekende fout'}` 
    }, { status: 500 })
  }
}
