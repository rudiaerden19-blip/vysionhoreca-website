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

    const prompt = `Je bent een expert in het analyseren van leveranciersfacturen voor horecazaken.
Analyseer de factuur en extraheer alle producten/ingrediënten met hun prijzen.

BELANGRIJK: Facturen hebben vaak meerdere kolommen:
- Omschrijving (bijv. "HAMBURGER 30X100G VAN ZON")
- Aantal (bijv. "2" dozen/colli)
- Eenheid (CU, ST, KG, L)
- Prijs per stuk/doos (bijv. €10.90)
- Totaal bedrag (bijv. €21.80)

Retourneer ALLEEN een valid JSON object:
{
  "supplier": "naam leverancier",
  "invoiceDate": "YYYY-MM-DD",
  "invoiceNumber": "factuurnummer",
  "totalAmount": 123.45,
  "items": [
    {
      "originalText": "HAMBURGER 30X100G VAN ZON",
      "name": "Hamburger",
      "boxesOrdered": 2,
      "pricePerBox": 10.90,
      "totalPrice": 21.80,
      "vatPercentage": 6
    }
  ]
}

KRITIEKE REGELS:
1. originalText = EXACTE tekst van de factuur (met 30X100G, 24X150G, etc.)
2. boxesOrdered = aantal DOZEN/COLLI gekocht (de "Aantal" kolom, vaak 1 of 2)
3. pricePerBox = prijs voor 1 DOOS (niet het totaal als meerdere dozen)
4. totalPrice = totaalbedrag voor die regel
5. Als boxesOrdered=2 en totalPrice=21.80, dan pricePerBox=10.90
6. Geef ALLEEN JSON terug, geen markdown`

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

    // Parse quantity from originalText and calculate price per unit
    const validatedItems = (parsed.items || []).map((item: any) => {
      const originalText = item.originalText || item.name || ''
      const totalPrice = Number(item.totalPrice) || 0
      const boxesOrdered = Number(item.boxesOrdered) || 1
      
      // Calculate price per box (use AI value or calculate from total)
      let pricePerBox = Number(item.pricePerBox) || 0
      if (pricePerBox === 0 && boxesOrdered > 0) {
        pricePerBox = totalPrice / boxesOrdered
      }
      
      // Try to extract units per box from patterns like "24X150G", "96X20G", "30X100G"
      let unitsPerBox = 1
      let unit = 'stuk'
      
      // Pattern 1: 24X150G, 96X20G, 30X100G (number X numberg)
      const packMatch = originalText.match(/(\d+)\s*[xX]\s*\d+\s*[gG]/i)
      if (packMatch) {
        unitsPerBox = parseInt(packMatch[1], 10)
        console.log(`Parsed units per box from "${originalText}": ${unitsPerBox} stuks per doos`)
      }
      
      // Pattern 2: 5EX140G (numberEXnumberg)
      if (unitsPerBox === 1) {
        const packMatchE = originalText.match(/(\d+)\s*[eE]?[xX]\s*\d+\s*[gG]/i)
        if (packMatchE) {
          unitsPerBox = parseInt(packMatchE[1], 10)
          console.log(`Parsed units per box (E) from "${originalText}": ${unitsPerBox} stuks per doos`)
        }
      }
      
      // Pattern 3: 10L, 10KG, 2.5KG (volume/weight - these are the units, not pieces)
      if (unitsPerBox === 1) {
        const volumeMatch = originalText.match(/(\d+(?:[,.]\d+)?)\s*(L|LTR|LITER)\b/i)
        if (volumeMatch) {
          unitsPerBox = parseFloat(volumeMatch[1].replace(',', '.'))
          unit = 'liter'
          console.log(`Parsed volume from "${originalText}": ${unitsPerBox} liter per doos`)
        }
      }
      
      if (unitsPerBox === 1) {
        const weightMatch = originalText.match(/(\d+(?:[,.]\d+)?)\s*(KG|KILO)\b/i)
        if (weightMatch) {
          unitsPerBox = parseFloat(weightMatch[1].replace(',', '.'))
          unit = 'kg'
          console.log(`Parsed weight from "${originalText}": ${unitsPerBox} kg per doos`)
        }
      }
      
      // Calculate price per unit: pricePerBox / unitsPerBox
      const pricePerUnit = unitsPerBox > 0 ? pricePerBox / unitsPerBox : pricePerBox
      
      console.log(`${item.name}: doos €${pricePerBox.toFixed(2)} / ${unitsPerBox} ${unit} = €${pricePerUnit.toFixed(4)} per ${unit}`)
      
      return {
        name: item.name || originalText,
        quantity: unitsPerBox,
        unit: unit,
        pricePerUnit: pricePerUnit,
        totalPrice: pricePerBox, // Store price per box, not total for multiple boxes
        vatPercentage: Number(item.vatPercentage) || 6
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
