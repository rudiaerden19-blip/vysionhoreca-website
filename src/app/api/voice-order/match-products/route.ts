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

BESCHIKBARE PRODUCTEN:
${productList}

BELANGRIJKE REGELS:

1. Herken AANPASSINGEN (modifications) - dit zijn wijzigingen op het product:
   - "zonder tomaat" → modifications: ["zonder tomaat"]
   - "zonder ui" / "zonder uitjes" → modifications: ["zonder ui"]
   - "zonder ei" → modifications: ["zonder ei"]
   - "zonder sla" → modifications: ["zonder sla"]
   - "extra saus" → modifications: ["extra saus"]
   - "niet te krokant" → modifications: ["niet te krokant"]
   - "goed doorbakken" → modifications: ["goed doorbakken"]

2. Herken EXTRAS (sauzen/toppings die erbij komen):
   - "met mayo" / "mayonaise" → extras: ["mayonaise"]
   - "ketchup" → extras: ["ketchup"]
   - "curry" / "currysaus" → extras: ["currysaus"]
   - "zout" → extras: ["zout"]

3. Match producten flexibel:
   - "friet" = "frieten" = "patat" = "frites"
   - "frikandel" = "frikadel"
   - "speciaal" = product met ui/mayo/curry
   - "grote" / "klein" / "medium" = zoek naar formaat in productnaam

4. Als geen aantal genoemd, default naar 1

5. ALTIJD modifications array toevoegen, ook als leeg

Retourneer ALLEEN geldige JSON:
{
  "matched": [
    {
      "product_id": "uuid-hier",
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
