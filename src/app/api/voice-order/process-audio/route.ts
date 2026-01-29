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

    const prompt = `Luister naar de audio en match met producten. Producten:
${productList}

JSON output:
{"transcription":"tekst","matched":[{"product_id":"id","product_name":"naam","quantity":1,"price":0.00,"extras":[]}],"not_matched":[],"total":0.00}`

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
