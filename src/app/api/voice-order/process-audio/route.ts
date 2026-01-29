import { NextRequest, NextResponse } from 'next/server'

interface Product {
  id: string
  name: string
  price: number
  category_name?: string
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const productsJson = formData.get('products') as string

    if (!audioFile) {
      return NextResponse.json({ success: false, error: 'Geen audio ontvangen' }, { status: 400 })
    }

    const products: Product[] = JSON.parse(productsJson || '[]')

    if (products.length === 0) {
      return NextResponse.json({ success: false, error: 'Geen producten ontvangen' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Google Gemini API key niet geconfigureerd' }, { status: 500 })
    }

    // Convert audio to base64
    const arrayBuffer = await audioFile.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString('base64')
    
    // Determine mime type - normalize for Gemini compatibility
    let mimeType = audioFile.type || 'audio/mp4'
    
    // Gemini 2.0 Flash supports many audio formats
    // Normalize common variations
    if (mimeType.includes('webm')) {
      mimeType = 'audio/webm'
    } else if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('aac')) {
      mimeType = 'audio/mp4'
    } else if (mimeType.includes('ogg') || mimeType.includes('opus')) {
      mimeType = 'audio/ogg'
    } else if (mimeType.includes('wav')) {
      mimeType = 'audio/wav'
    } else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
      mimeType = 'audio/mp3'
    }

    console.log(`[Voice Order] Processing audio: ${audioFile.size} bytes, original type: ${audioFile.type}, using: ${mimeType}`)

    // Create product list for Gemini
    const productList = products.map((p: Product) => 
      `- ID: "${p.id}" | Naam: "${p.name}" | Prijs: €${p.price.toFixed(2)} | Categorie: ${p.category_name || 'Overig'}`
    ).join('\n')

    const prompt = `Je bent een slimme bestelassistent voor een frituur/snackbar.
Luister naar de audio en match wat de klant bestelt.

BESCHIKBARE PRODUCTEN:
${productList}

BELANGRIJKE REGELS:
1. Herken AANPASSINGEN zoals:
   - "zonder tomaat" → modifications: ["zonder tomaat"]
   - "zonder ui" → modifications: ["zonder ui"]  
   - "zonder ei" → modifications: ["zonder ei"]
   - "extra saus" → modifications: ["extra saus"]
   - "niet te krokant" → modifications: ["niet te krokant"]

2. Herken EXTRAS (sauzen/toppings):
   - "met mayo" → extras: ["mayonaise"]
   - "en ketchup" → extras: ["ketchup"]

3. Match producten flexibel:
   - "friet" = "frieten" = "patat"
   - "frikandel speciaal" zoek naar dat product
   - "grote/klein/medium" = zoek naar formaat

4. Als geen aantal genoemd, default naar 1

RETOURNEER ALLEEN GELDIGE JSON:
{
  "transcription": "wat de klant zei",
  "matched": [
    {
      "product_id": "uuid",
      "product_name": "Frikandel Speciaal",
      "quantity": 1,
      "price": 3.50,
      "extras": ["mayonaise"],
      "modifications": ["zonder ui", "zonder tomaat"]
    }
  ],
  "not_matched": [],
  "total": 3.50
}`

    // Call Gemini API with retry logic
    const callGemini = async (retryCount = 0): Promise<Response> => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Audio
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1000,
            }
          })
        }
      )
      
      // Retry on 429 (rate limit) up to 2 times
      if (response.status === 429 && retryCount < 2) {
        console.log(`[Voice Order] Rate limited, retrying in 2s (attempt ${retryCount + 1})`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        return callGemini(retryCount + 1)
      }
      
      return response
    }

    const response = await callGemini()

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[Voice Order] Gemini API error:', response.status, JSON.stringify(errorData))
      
      const errorMessage = errorData?.error?.message || ''
      
      // Check for specific errors
      if (response.status === 400 && errorMessage.includes('audio')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Audio formaat niet ondersteund. Probeer opnieuw.' 
        }, { status: 400 })
      }
      
      if (response.status === 429) {
        return NextResponse.json({ 
          success: false, 
          error: 'Even druk. Wacht 5 seconden en probeer opnieuw.' 
        }, { status: 429 })
      }
      
      if (response.status === 403 || errorMessage.includes('API key')) {
        return NextResponse.json({ 
          success: false, 
          error: 'API configuratie fout. Neem contact op met support.' 
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: false, 
        error: `Fout: ${response.status}. Probeer opnieuw.` 
      }, { status: 500 })
    }

    const data = await response.json()
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    console.log('[Voice Order] Gemini response:', responseText.substring(0, 200))

    // Parse JSON from response
    let parsed
    try {
      let cleanContent = responseText.trim()
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7)
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3)
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3)
      }
      parsed = JSON.parse(cleanContent.trim())
    } catch {
      console.error('[Voice Order] Failed to parse Gemini response:', responseText)
      return NextResponse.json({ 
        success: false, 
        error: 'Kon bestelling niet begrijpen. Spreek duidelijk en probeer opnieuw.' 
      }, { status: 400 })
    }

    console.log(`[Voice Order] Transcription: "${parsed.transcription}"`)
    console.log(`[Voice Order] Matched ${parsed.matched?.length || 0} products, total: €${parsed.total}`)

    return NextResponse.json({
      success: true,
      transcription: parsed.transcription || '',
      matched: parsed.matched || [],
      not_matched: parsed.not_matched || [],
      total: parsed.total || 0,
    })

  } catch (error: any) {
    console.error('[Voice Order] Process error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Verwerking mislukt' 
    }, { status: 500 })
  }
}
