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

Belangrijke regels:
- Gebruik Nederlandse productnamen
- Kies de juiste eenheid (stuk voor individuele items, kg voor gewicht, liter voor vloeistoffen, doos voor verpakkingen)
- Als een product per doos wordt verkocht met X stuks erin, bereken dan de prijs per stuk
- BTW is meestal 6% voor voedingsmiddelen, 21% voor non-food
- Als je iets niet kunt lezen, sla het product dan over
- Geef ALLEEN het JSON object terug, geen andere tekst of markdown`

    // Direct REST API call to Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
      console.error('Gemini API error:', response.status, errorData)
      
      if (response.status === 404) {
        return NextResponse.json({ 
          success: false, 
          error: 'Gemini API model niet beschikbaar. Controleer je API key.' 
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: false, 
        error: `API fout: ${errorData?.error?.message || response.statusText}` 
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

    return NextResponse.json({
      success: true,
      supplier: parsed.supplier,
      invoiceDate: parsed.invoiceDate,
      invoiceNumber: parsed.invoiceNumber,
      totalAmount: parsed.totalAmount,
      items: parsed.items || []
    })

  } catch (error: any) {
    console.error('Invoice analysis error:', error)
    return NextResponse.json({ 
      success: false, 
      error: `Fout: ${error?.message || 'Onbekende fout'}` 
    }, { status: 500 })
  }
}
