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

Deze factuur heeft kolommen: Omschrijving | Aantal | Eh | Ehp | % | Subtotaal | % | Total | BTW

LEES DE KOLOMMEN ZORGVULDIG:
- "Aantal" = hoeveel dozen/colli besteld (bijv. 2)
- "Ehp" = Eenheidsprijs = prijs per 1 doos (bijv. €11.47)
- "Total" = totaalbedrag (Aantal x Ehp)

Retourneer ALLEEN JSON:
{
  "supplier": "naam leverancier",
  "invoiceDate": "YYYY-MM-DD",
  "invoiceNumber": "factuurnummer",
  "totalAmount": 123.45,
  "items": [
    {
      "originalText": "HAMBURGER 30X100G VAN ZON",
      "name": "Hamburger",
      "aantal": 2,
      "ehp": 11.47,
      "total": 21.80,
      "vatPercentage": 6
    }
  ]
}

VOORBEELDEN uit deze factuur:
- "HAMBURGER 30X100G VAN ZON" met Aantal=2, Ehp=11.4740, Total=21.80
  → originalText="HAMBURGER 30X100G VAN ZON", name="Hamburger", aantal=2, ehp=11.47, total=21.80
- "BITTERBALLEN 20% 96X20G PB" met Aantal=1, Ehp=13.5420, Total=12.86
  → originalText="BITTERBALLEN 20% 96X20G PB", name="Bitterballen", aantal=1, ehp=13.54, total=12.86
- "BRAADWORST WIT 24X150G VR" met Aantal=1, Ehp=29.4740, Total=28.00
  → originalText="BRAADWORST WIT 24X150G VR", name="Braadworst wit", aantal=1, ehp=29.47, total=28.00

BELANGRIJK:
- ehp = de waarde uit de "Ehp" kolom (prijs per doos)
- aantal = de waarde uit de "Aantal" kolom
- Geef ALLEEN JSON terug, geen markdown of tekst`

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
      
      // Get values from AI - use new field names (ehp, aantal) or fallback to old names
      const ehp = Number(item.ehp) || Number(item.pricePerBox) || 0
      const aantal = Number(item.aantal) || Number(item.boxesOrdered) || 1
      const total = Number(item.total) || Number(item.totalPrice) || 0
      
      // Price per box is the Ehp (eenheidsprijs) from the invoice
      // If ehp is 0, calculate from total / aantal
      let pricePerBox = ehp > 0 ? ehp : (aantal > 0 ? total / aantal : total)
      
      console.log(`AI parsed: ${item.name} - aantal=${aantal}, ehp=${ehp}, total=${total}, pricePerBox=${pricePerBox}`)
      
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
        const packMatchE = originalText.match(/(\d+)\s*[eE][xX]\s*\d+\s*[gG]/i)
        if (packMatchE) {
          unitsPerBox = parseInt(packMatchE[1], 10)
          console.log(`Parsed units per box (E) from "${originalText}": ${unitsPerBox} stuks per doos`)
        }
      }
      
      // Pattern 3: 10L, 10KG, 2.5KG (volume/weight)
      if (unitsPerBox === 1) {
        const volumeMatch = originalText.match(/(\d+(?:[,.]\d+)?)\s*(L|LTR|LITER)\b/i)
        if (volumeMatch) {
          unitsPerBox = parseFloat(volumeMatch[1].replace(',', '.'))
          unit = 'liter'
          console.log(`Parsed volume from "${originalText}": ${unitsPerBox} liter`)
        }
      }
      
      if (unitsPerBox === 1) {
        const weightMatch = originalText.match(/(\d+(?:[,.]\d+)?)\s*(KG|KILO)\b/i)
        if (weightMatch) {
          unitsPerBox = parseFloat(weightMatch[1].replace(',', '.'))
          unit = 'kg'
          console.log(`Parsed weight from "${originalText}": ${unitsPerBox} kg`)
        }
      }
      
      // Calculate price per unit: pricePerBox / unitsPerBox
      const pricePerUnit = unitsPerBox > 0 ? pricePerBox / unitsPerBox : pricePerBox
      
      console.log(`RESULT: ${item.name}: €${pricePerBox.toFixed(2)} per doos / ${unitsPerBox} ${unit} = €${pricePerUnit.toFixed(4)} per ${unit}`)
      
      return {
        name: item.name || originalText,
        quantity: unitsPerBox,
        unit: unit,
        pricePerUnit: pricePerUnit,
        totalPrice: pricePerBox, // Store price per box
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
