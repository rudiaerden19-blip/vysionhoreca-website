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

    const prompt = `Lees deze factuur en geef ALLEEN de omschrijving en prijs per regel.

KOPIEER DE OMSCHRIJVING EXACT zoals die op de factuur staat, inclusief codes zoals 30X100G, 24X150G, 96X20G, etc.

Retourneer ALLEEN JSON (geen markdown, geen tekst):
{
  "supplier": "leverancier naam",
  "items": [
    {
      "omschrijving": "HAMBURGER 30X100G VAN ZON",
      "prijs": 11.47
    }
  ]
}

REGELS:
1. omschrijving = KOPIEER EXACT van de factuur (bijv. "HAMBURGER 30X100G VAN ZON", "BITTERBALLEN 20% 96X20G PB")
2. prijs = de eenheidsprijs (Ehp kolom), niet de totaalprijs
3. Als er meerdere dozen zijn gekocht, neem de prijs per doos (Ehp), niet het totaal
4. GEEN berekeningen, GEEN interpretatie, alleen kopiëren`

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
      const omschrijving = item.omschrijving || item.originalText || item.name || ''
      const prijs = Number(item.prijs) || Number(item.ehp) || Number(item.totalPrice) || 0
      
      console.log(`Processing: "${omschrijving}" - prijs: €${prijs}`)
      
      // Extract units per box from patterns in the description
      let unitsPerBox = 1
      let unit = 'stuk'
      let productName = omschrijving
      
      // Pattern 1: ANY NUMBERxNUMBER pattern with optional unit
      // Matches: 30X33CL, 24X150G, 96X20G, 24X25CL, 4X11X100G, 250ST, etc.
      // The first number is ALWAYS the quantity
      const packMatch = omschrijving.match(/(\d+)\s*[xX]\s*\d+/i)
      if (packMatch) {
        unitsPerBox = parseInt(packMatch[1], 10)
        console.log(`Found NxN pattern in "${omschrijving}": ${unitsPerBox} stuks per doos`)
      }
      
      // Pattern 2: 250ST, 100ST (number followed by ST = stuks)
      if (unitsPerBox === 1) {
        const stMatch = omschrijving.match(/(\d+)\s*ST\b/i)
        if (stMatch) {
          unitsPerBox = parseInt(stMatch[1], 10)
          console.log(`Found ST pattern in "${omschrijving}": ${unitsPerBox} stuks`)
        }
      }
      
      // Pattern 3: 10L, 2.5KG, 10KG (single volume/weight - no X pattern)
      if (unitsPerBox === 1 && !omschrijving.match(/\d+\s*[xX]/i)) {
        const volumeMatch = omschrijving.match(/(\d+(?:[,.]\d+)?)\s*(L|LTR|LITER)\b/i)
        if (volumeMatch) {
          unitsPerBox = parseFloat(volumeMatch[1].replace(',', '.'))
          unit = 'liter'
          console.log(`Found volume in "${omschrijving}": ${unitsPerBox} liter`)
        }
      }
      
      if (unitsPerBox === 1 && !omschrijving.match(/\d+\s*[xX]/i)) {
        const weightMatch = omschrijving.match(/(\d+(?:[,.]\d+)?)\s*(KG|KILO)\b/i)
        if (weightMatch) {
          unitsPerBox = parseFloat(weightMatch[1].replace(',', '.'))
          unit = 'kg'
          console.log(`Found weight in "${omschrijving}": ${unitsPerBox} kg`)
        }
      }
      
      // Clean up product name - remove quantity/weight info
      productName = omschrijving
        .replace(/\d+\s*[xX]\s*[\d,.]+\s*(G|GR|KG|CL|ML|L|CC)?\b/gi, '') // Remove 30X33CL, 24X150G, etc.
        .replace(/\d+\s*ST\b/gi, '') // Remove 250ST
        .replace(/\d+(?:[,.]\d+)?\s*(KG|L|LTR|LITER|KILO|ML|CL|GR|GRAM|CC)\b/gi, '') // Remove weights
        .replace(/\s*(VR|PB|CU|BLIK|PET|SLEEK)\s*$/i, '') // Remove unit codes at end
        .replace(/\s+/g, ' ') // Clean up spaces
        .trim()
      
      // Calculate price per unit
      const pricePerUnit = unitsPerBox > 0 ? prijs / unitsPerBox : prijs
      
      console.log(`RESULT: "${productName}": €${prijs.toFixed(2)} / ${unitsPerBox} ${unit} = €${pricePerUnit.toFixed(4)} per ${unit}`)
      
      return {
        name: productName || omschrijving,
        quantity: unitsPerBox,
        unit: unit,
        pricePerUnit: pricePerUnit,
        totalPrice: prijs,
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
