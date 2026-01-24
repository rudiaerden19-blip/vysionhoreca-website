import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Lazy initialization - only create client when needed (not during build)
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

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

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not set')
      return NextResponse.json({ success: false, error: 'OpenAI API key niet geconfigureerd. Voeg OPENAI_API_KEY toe aan Vercel.' }, { status: 500 })
    }

    // Check image size (max 20MB base64)
    const imageSizeMB = (image.length * 0.75) / (1024 * 1024)
    if (imageSizeMB > 20) {
      return NextResponse.json({ success: false, error: 'Afbeelding is te groot (max 20MB). Gebruik een kleinere foto.' }, { status: 400 })
    }

    console.log(`Analyzing invoice, image size: ${imageSizeMB.toFixed(2)}MB`)

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: `Je bent een expert in het analyseren van leveranciersfacturen voor horecazaken.
Analyseer de factuur en extraheer alle producten/ingrediënten met hun prijzen.

Retourneer ALLEEN een valid JSON object met deze structuur:
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
- Geef ALLEEN het JSON object terug, geen andere tekst`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyseer deze leveranciersfactuur en extraheer alle producten met prijzen:'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType || 'image/jpeg'};base64,${image}`,
                detail: 'high'
              }
            }
          ]
        }
      ]
    })

    const content = response.choices[0]?.message?.content
    
    if (!content) {
      return NextResponse.json({ success: false, error: 'Geen respons van AI' }, { status: 500 })
    }

    // Parse JSON from response
    let parsed
    try {
      // Remove markdown code blocks if present
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
    
    // More specific error messages
    let errorMessage = 'Er ging iets mis bij het analyseren. Probeer opnieuw.'
    
    if (error?.code === 'invalid_api_key' || error?.message?.includes('API key')) {
      errorMessage = 'OpenAI API key is ongeldig. Controleer de configuratie.'
    } else if (error?.code === 'insufficient_quota' || error?.message?.includes('quota')) {
      errorMessage = 'OpenAI tegoed is op. Voeg credits toe aan je OpenAI account.'
    } else if (error?.code === 'rate_limit_exceeded') {
      errorMessage = 'Te veel requests. Wacht even en probeer opnieuw.'
    } else if (error?.message?.includes('Could not process image')) {
      errorMessage = 'Kon afbeelding niet verwerken. Probeer een andere foto.'
    } else if (error?.message) {
      errorMessage = `Fout: ${error.message}`
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage
    }, { status: 500 })
  }
}
