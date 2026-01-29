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
    
    // Determine mime type
    let mimeType = audioFile.type || 'audio/webm'
    // Gemini supports: audio/wav, audio/mp3, audio/aiff, audio/aac, audio/ogg, audio/flac
    // WebM with opus codec should work as audio/webm
    if (mimeType === 'audio/webm;codecs=opus') {
      mimeType = 'audio/webm'
    }

    console.log(`[Voice Order] Processing audio: ${audioFile.size} bytes, type: ${mimeType}`)

    // Create product list for Gemini
    const productList = products.map((p: Product) => 
      `- ID: "${p.id}" | Naam: "${p.name}" | Prijs: €${p.price.toFixed(2)} | Categorie: ${p.category_name || 'Overig'}`
    ).join('\n')

    const prompt = `Je krijgt een audio-opname van een klant die een bestelling plaatst bij een frituur/snackbar.

STAP 1: Luister naar de audio en schrijf op wat de klant zegt.
STAP 2: Match wat de klant bestelt met de beschikbare producten.

BESCHIKBARE PRODUCTEN:
${productList}

MATCH REGELS:
1. Match producten op basis van naam, ook met synoniemen:
   - "friet" = "frieten" = "patat" = "frites"
   - "frikandel" = "frikadel" 
   - "mayo" = "mayonaise"
   - "grote" / "klein" / "medium" = zoek naar formaat in productnaam
2. Als de klant een aantal noemt, gebruik dat. Anders default naar 1.
3. Sauzen/extras (mayo, ketchup, zout) → voeg toe als "extras"
4. Niet te matchen items → in "not_matched"

RETOURNEER ALLEEN GELDIGE JSON:
{
  "transcription": "wat de klant zei",
  "matched": [
    {
      "product_id": "uuid-hier",
      "product_name": "Grote Friet",
      "quantity": 1,
      "price": 4.50,
      "extras": ["mayonaise", "zout"]
    }
  ],
  "not_matched": ["items die niet gevonden werden"],
  "total": 4.50
}`

    // Call Gemini API with audio
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[Voice Order] Gemini API error:', response.status, errorData)
      
      // Check for specific errors
      if (response.status === 400 && errorData?.error?.message?.includes('audio')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Audio formaat niet ondersteund. Probeer opnieuw.' 
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'AI service fout. Probeer opnieuw.' 
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
