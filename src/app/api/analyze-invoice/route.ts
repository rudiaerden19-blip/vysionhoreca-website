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

    const prompt = `Je bent een factuur-lezer voor groothandel facturen. Lees ELKE regel op deze factuur VOLLEDIG.

TYPISCHE KOLOMMEN (kunnen anders heten):
- Art.Nr/Artikelnummer
- Omschrijving/Product (de volledige productnaam)
- Aantal (hoeveel dozen/verpakkingen gekocht)
- Eenheid/Eh/Inhoud (bijv. "40 ST", "24 stuks", "CU", "WUK")
- Ehp/Stuksprijs (prijs per 1 doos/verpakking)
- Subtotaal/Totaal (NIET gebruiken!)

BELANGRIJK - LEES ALLES:
1. Kopieer de VOLLEDIGE omschrijving LETTERLIJK zoals die op de factuur staat
2. Let op patronen in de omschrijving zoals: 24X150G, 30X100G, 40X16G, 250ST, etc.
3. Als het aantal stuks NIET in de omschrijving staat, kijk dan naar de "Eenheid" of "Inhoud" kolom
4. Neem de Ehp (prijs per 1 doos), NOOIT het subtotaal!

VOORBEELDEN van omschrijvingen die je EXACT moet kopiëren:
- "PAST. 227148 HAMBURGERBROODJE 40X16G" (40 stuks per doos)
- "BRAADWORST WIT 24X150G VR" (24 stuks per doos)
- "COCA COLA 24X33CL" (24 blikjes per tray)
- "FRIET 10KG" (10 kg per zak)

Retourneer ALLEEN JSON:
{
  "supplier": "leverancier naam",
  "items": [
    {
      "omschrijving": "VOLLEDIGE omschrijving EXACT van factuur",
      "stuks_per_doos": 24,
      "prijs_per_doos": 29.47
    }
  ]
}

REGELS:
1. omschrijving = KOPIEER LETTERLIJK de hele tekst uit de omschrijving kolom
2. stuks_per_doos = het aantal stuks/items in 1 doos (uit omschrijving of eenheid kolom)
   - Bij "24X150G" = 24 stuks
   - Bij "40 ST" in eenheid kolom = 40 stuks
   - Bij "10KG" = 10 (kg)
   - Als NIET te vinden, zet op 1
3. prijs_per_doos = de prijs voor 1 doos (Ehp kolom), NIET subtotaal!
4. Lees ALLE regels op de factuur
5. GEEN berekeningen, alleen kopiëren`

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

    // Parse everything from the AI response
    const validatedItems = (parsed.items || []).map((item: any) => {
      // Get data from AI
      const omschrijving = item.omschrijving || item.originalText || item.name || ''
      const prijsPerDoos = Number(item.prijs_per_doos) || Number(item.prijs) || Number(item.ehp) || 0
      
      // Get stuks_per_doos from AI first (the AI should have read it from the invoice)
      let stuksPerDoos = Number(item.stuks_per_doos) || 0
      let unit = 'stuk'
      
      console.log(`\n=== Processing: "${omschrijving}" ===`)
      console.log(`AI stuks_per_doos: ${stuksPerDoos}`)
      console.log(`Prijs per doos (Ehp): €${prijsPerDoos.toFixed(2)}`)
      
      // If AI didn't provide stuks_per_doos, try to extract from omschrijving
      if (stuksPerDoos <= 0) {
        console.log('AI gaf geen stuks_per_doos, probeer uit omschrijving te halen...')
        
        // Pattern 1: NUMBERxNUMBER pattern (e.g., 24X150G, 30X100G, 21X135G)
        const packMatch = omschrijving.match(/(\d+)\s*[xX]\s*\d+/i)
        if (packMatch) {
          stuksPerDoos = parseInt(packMatch[1], 10)
          console.log(`Patroon "${packMatch[0]}" gevonden: ${stuksPerDoos} stuks per doos`)
        }
        
        // Pattern 2: 250ST, 100ST (number followed by ST = stuks)
        if (stuksPerDoos <= 0) {
          const stMatch = omschrijving.match(/(\d+)\s*ST\b/i)
          if (stMatch) {
            stuksPerDoos = parseInt(stMatch[1], 10)
            console.log(`ST patroon gevonden: ${stuksPerDoos} stuks per doos`)
          }
        }
        
        // Pattern 3: Volume (10L, 2.5L) - only if no X pattern
        if (stuksPerDoos <= 0 && !omschrijving.match(/\d+\s*[xX]/i)) {
          const volumeMatch = omschrijving.match(/(\d+(?:[,.]\d+)?)\s*(L|LTR|LITER)\b/i)
          if (volumeMatch) {
            stuksPerDoos = parseFloat(volumeMatch[1].replace(',', '.'))
            unit = 'liter'
            console.log(`Volume gevonden: ${stuksPerDoos} liter`)
          }
        }
        
        // Pattern 4: Weight (10KG, 2.5KG) - only if no X pattern
        if (stuksPerDoos <= 0 && !omschrijving.match(/\d+\s*[xX]/i)) {
          const weightMatch = omschrijving.match(/(\d+(?:[,.]\d+)?)\s*(KG|KILO)\b/i)
          if (weightMatch) {
            stuksPerDoos = parseFloat(weightMatch[1].replace(',', '.'))
            unit = 'kg'
            console.log(`Gewicht gevonden: ${stuksPerDoos} kg`)
          }
        }
        
        // Default to 1 if nothing found
        if (stuksPerDoos <= 0) {
          stuksPerDoos = 1
          console.log('Geen patroon gevonden, default naar 1')
        }
      }
      
      // Determine unit from omschrijving if not already set
      if (unit === 'stuk') {
        if (omschrijving.match(/\d+\s*(L|LTR|LITER)\b/i)) {
          unit = 'liter'
        } else if (omschrijving.match(/\d+\s*(KG|KILO)\b/i)) {
          unit = 'kg'
        } else if (omschrijving.match(/\d+\s*(G|GR|GRAM)\b/i)) {
          unit = 'stuk'
        } else if (omschrijving.match(/\d+\s*(CL|ML)\b/i)) {
          unit = 'stuk'
        }
      }
      
      // CALCULATE PRICE PER UNIT
      const pricePerUnit = stuksPerDoos > 0 ? prijsPerDoos / stuksPerDoos : prijsPerDoos
      
      console.log(`\nBEREKENING:`)
      console.log(`Prijs per doos: €${prijsPerDoos.toFixed(2)}`)
      console.log(`Stuks per doos: ${stuksPerDoos}`)
      console.log(`Prijs per stuk: €${prijsPerDoos.toFixed(2)} / ${stuksPerDoos} = €${pricePerUnit.toFixed(4)}`)
      
      // Keep the full original description as the name
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
