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
      "name": "productnaam (kort en duidelijk, zonder gewicht/aantal)",
      "quantity": 24,
      "unit": "stuk",
      "pricePerUnit": 1.25,
      "totalPrice": 30.00,
      "vatPercentage": 6
    }
  ]
}

KRITIEKE REGELS - LEES VERPAKKINGSNOTATIE:
Groothandelfacturen gebruiken notaties zoals "24X150G" of "96X20G". Dit betekent AANTAL x GEWICHT PER STUK.

VOORBEELDEN:
- "BRAADWORST WIT 24X150G" €28.00 → quantity=24, pricePerUnit=€1.17 (28/24), name="Braadworst wit"
- "BITTERBALLEN 96X20G" €12.86 → quantity=96, pricePerUnit=€0.134 (12.86/96), name="Bitterballen"
- "CERVELA ROOD 5X140G" €26.45 → quantity=5, pricePerUnit=€5.29 (26.45/5), name="Cervela rood"
- "FISHBURGER 24X85G" €31.10 → quantity=24, pricePerUnit=€1.30 (31.10/24), name="Fishburger"
- "HAMBURGER 30X100G" €13.20 → quantity=30, pricePerUnit=€0.44 (13.20/30), name="Hamburger"
- "MAYONAISE 10L" €25.00 → quantity=10, unit="liter", pricePerUnit=€2.50 (25/10), name="Mayonaise"
- "FRITUURVET 10KG" €26.76 → quantity=10, unit="kg", pricePerUnit=€2.68 (26.76/10), name="Frituurvet"

REGELS:
1. Zoek naar "NxG" of "NXG" patronen (bijv. 24X150G = 24 stuks)
2. quantity = het AANTAL STUKS in de verpakking (24, 96, 30, etc.)
3. pricePerUnit = totalPrice / quantity (prijs voor 1 STUK)
4. unit = "stuk" voor individuele items, "kg" voor gewicht, "liter" voor vloeistoffen
5. name = alleen de productnaam, zonder gewicht/aantal notatie
6. BTW is meestal 6% voor voedingsmiddelen, 21% voor non-food
7. Geef ALLEEN het JSON object terug, geen andere tekst of markdown`

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
