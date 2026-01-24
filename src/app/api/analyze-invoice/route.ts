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

Retourneer ALLEEN een valid JSON object met deze structuur (geen andere tekst, geen markdown):
{
  "supplier": "naam van de leverancier",
  "invoiceDate": "datum in YYYY-MM-DD formaat",
  "invoiceNumber": "factuurnummer",
  "totalAmount": 123.45,
  "items": [
    {
      "name": "productnaam (kort en duidelijk)",
      "quantity": 5,
      "unit": "stuk|kg|gram|liter|ml|doos|zak|fles",
      "pricePerUnit": 2.50,
      "totalPrice": 12.50,
      "vatPercentage": 6
    }
  ]
}

KRITIEKE REGELS VOOR PRIJZEN:
- pricePerUnit = de prijs voor 1 ENKELE eenheid (1 stuk, 1 kg, 1 liter)
- totalPrice = het totaalbedrag op de factuur voor die regel
- ALTIJD BEREKENEN: pricePerUnit = totalPrice / quantity
- Voorbeeld: 96 stuks voor €12.86 totaal → pricePerUnit = €0.134 (12.86/96), NIET €12.86
- Voorbeeld: 10 kg voor €26.76 totaal → pricePerUnit = €2.676 (26.76/10)

Andere regels:
- Gebruik Nederlandse productnamen
- Kies de juiste eenheid (stuk voor individuele items, kg voor gewicht, liter voor vloeistoffen)
- BTW is meestal 6% voor voedingsmiddelen, 21% voor non-food
- Als je iets niet kunt lezen, sla het product dan over
- Geef ALLEEN het JSON object terug, geen andere tekst of markdown`

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

    // Validate and fix price calculations
    const validatedItems = (parsed.items || []).map((item: any) => {
      const quantity = Number(item.quantity) || 1
      const totalPrice = Number(item.totalPrice) || 0
      let pricePerUnit = Number(item.pricePerUnit) || 0
      
      // Calculate correct price per unit from total / quantity
      const calculatedPricePerUnit = quantity > 0 ? totalPrice / quantity : totalPrice
      
      // If AI got it wrong (pricePerUnit is same as totalPrice or way off), fix it
      if (quantity > 1 && Math.abs(pricePerUnit - totalPrice) < 0.01) {
        // AI returned totalPrice as pricePerUnit, fix it
        pricePerUnit = calculatedPricePerUnit
        console.log(`Fixed price for ${item.name}: ${totalPrice} / ${quantity} = ${pricePerUnit.toFixed(4)}`)
      } else if (quantity > 1 && Math.abs(pricePerUnit * quantity - totalPrice) > totalPrice * 0.1) {
        // pricePerUnit * quantity doesn't match totalPrice (>10% off), recalculate
        pricePerUnit = calculatedPricePerUnit
        console.log(`Recalculated price for ${item.name}: ${totalPrice} / ${quantity} = ${pricePerUnit.toFixed(4)}`)
      }
      
      return {
        name: item.name,
        quantity: quantity,
        unit: item.unit || 'stuk',
        pricePerUnit: pricePerUnit,
        totalPrice: totalPrice,
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
