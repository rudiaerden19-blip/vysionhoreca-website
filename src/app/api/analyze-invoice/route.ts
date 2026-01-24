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

BELANGRIJK: Geef voor elk item ook de EXACTE originele tekst van de factuur terug in "originalText".

Retourneer ALLEEN een valid JSON object met deze structuur (geen andere tekst, geen markdown):
{
  "supplier": "naam van de leverancier",
  "invoiceDate": "datum in YYYY-MM-DD formaat",
  "invoiceNumber": "factuurnummer",
  "totalAmount": 123.45,
  "items": [
    {
      "originalText": "BRAADWORST WIT 24X150G VR",
      "name": "Braadworst wit",
      "totalPrice": 28.00,
      "vatPercentage": 6
    }
  ]
}

REGELS:
1. originalText = kopieer de EXACTE tekst van de factuur (inclusief 24X150G, 96X20G, etc.)
2. name = korte productnaam zonder gewicht/aantal
3. totalPrice = het bedrag op de factuur voor die regel
4. BTW is meestal 6% voor voedingsmiddelen, 21% voor non-food
5. Geef ALLEEN het JSON object terug, geen andere tekst of markdown`

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
      
      // Try to extract quantity from patterns like "24X150G", "96X20G", "30X100G", "5EX140G"
      // Patterns: NUMBERxNUMBERg, NUMBER X NUMBERg, NUMBEReXNUMBERg
      let quantity = 1
      let unit = 'stuk'
      
      // Pattern 1: 24X150G, 96X20G, 30X100G (number X numberg)
      const packMatch = originalText.match(/(\d+)\s*[xX]\s*\d+\s*[gG]/i)
      if (packMatch) {
        quantity = parseInt(packMatch[1], 10)
        console.log(`Parsed pack quantity from "${originalText}": ${quantity} stuks`)
      }
      
      // Pattern 2: 5EX140G (numberEXnumberg - E for "each" or typo)
      if (quantity === 1) {
        const packMatchE = originalText.match(/(\d+)\s*[eE]?[xX]\s*\d+\s*[gG]/i)
        if (packMatchE) {
          quantity = parseInt(packMatchE[1], 10)
          console.log(`Parsed pack quantity (E) from "${originalText}": ${quantity} stuks`)
        }
      }
      
      // Pattern 3: 10L, 10KG, 2.5KG (volume/weight)
      if (quantity === 1) {
        const volumeMatch = originalText.match(/(\d+(?:[,.]\d+)?)\s*(L|LTR|LITER)\b/i)
        if (volumeMatch) {
          quantity = parseFloat(volumeMatch[1].replace(',', '.'))
          unit = 'liter'
          console.log(`Parsed volume from "${originalText}": ${quantity} liter`)
        }
      }
      
      if (quantity === 1) {
        const weightMatch = originalText.match(/(\d+(?:[,.]\d+)?)\s*(KG|KILO)\b/i)
        if (weightMatch) {
          quantity = parseFloat(weightMatch[1].replace(',', '.'))
          unit = 'kg'
          console.log(`Parsed weight from "${originalText}": ${quantity} kg`)
        }
      }
      
      // Calculate price per unit
      const pricePerUnit = quantity > 0 ? totalPrice / quantity : totalPrice
      
      console.log(`${item.name}: ${totalPrice} / ${quantity} = ${pricePerUnit.toFixed(4)} per ${unit}`)
      
      return {
        name: item.name || originalText,
        quantity: quantity,
        unit: unit,
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
