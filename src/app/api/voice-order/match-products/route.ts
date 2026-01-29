import { NextRequest, NextResponse } from 'next/server'

interface Product {
  id: string
  name: string
  price: number
  category_name?: string
}

export async function POST(request: NextRequest) {
  try {
    const { text, products } = await request.json()

    if (!text || !products || products.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Geen tekst of producten ontvangen' 
      }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Google Gemini API key niet geconfigureerd' 
      }, { status: 500 })
    }

    // Create a product list for Gemini
    const productList = products.map((p: Product) => 
      `- ID: "${p.id}" | Naam: "${p.name}" | Prijs: €${p.price.toFixed(2)} | Categorie: ${p.category_name || 'Overig'}`
    ).join('\n')

    const prompt = `Je bent een slimme bestelassistent voor een frituur/snackbar. 
De klant heeft het volgende gezegd: "${text}"

Dit zijn de beschikbare producten:
${productList}

TAAK: Match wat de klant zei met de beschikbare producten. 

REGELS:
1. Match producten op basis van naam, ook als de klant een afkorting of synoniem gebruikt
   - "friet" = "frieten" = "patat" = "frites"
   - "frikandel" = "frikadel" = "curryworst speciaal" (als bedoeld)
   - "mayo" = "mayonaise"
   - "grote" / "klein" / "medium" = zoek naar formaat in productnaam
2. Als de klant een aantal noemt, gebruik dat aantal. Anders default naar 1.
3. Als de klant sauzen of extras noemt (mayo, ketchup, zout, etc.), voeg die toe als "extras"
4. Als je een product NIET kunt matchen, negeer het maar meld het in "not_matched"
5. Wees STRIKT: match alleen als je zeker bent

Retourneer ALLEEN geldige JSON:
{
  "matched": [
    {
      "product_id": "uuid-hier",
      "product_name": "Grote Friet",
      "quantity": 1,
      "price": 4.50,
      "extras": ["mayonaise", "zout"]
    }
  ],
  "not_matched": ["item dat niet gevonden werd"],
  "total": 4.50
}`

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
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
      return NextResponse.json({ 
        success: false, 
        error: 'AI service fout. Probeer opnieuw.' 
      }, { status: 500 })
    }

    const data = await response.json()
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
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
        error: 'Kon bestelling niet begrijpen. Probeer opnieuw.' 
      }, { status: 400 })
    }

    console.log(`[Voice Order] Matched ${parsed.matched?.length || 0} products, total: €${parsed.total}`)

    return NextResponse.json({
      success: true,
      matched: parsed.matched || [],
      not_matched: parsed.not_matched || [],
      total: parsed.total || 0,
      original_text: text,
    })

  } catch (error: any) {
    console.error('[Voice Order] Match error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Product matching mislukt' 
    }, { status: 500 })
  }
}
