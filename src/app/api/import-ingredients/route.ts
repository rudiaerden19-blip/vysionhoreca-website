import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'

// POST /api/import-ingredients
// Body: { tenant_slug: string, ingredients: Array<{ name, price, unit?, supplier?, article_nr? }> }

export async function POST(request: NextRequest) {
  try {
    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const body = await request.json()
    const { tenant_slug, ingredients } = body

    if (!tenant_slug) {
      return NextResponse.json({ error: 'tenant_slug is required' }, { status: 400 })
    }

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'ingredients array is required' }, { status: 400 })
    }

    // Get existing ingredients for this tenant
    const { data: existingIngredients } = await supabase
      .from('ingredients')
      .select('name')
      .eq('tenant_slug', tenant_slug)

    const existingNames = new Set(
      (existingIngredients || []).map(i => i.name.toLowerCase().trim())
    )

    // Filter out duplicates
    const newIngredients: Array<{
      tenant_slug: string
      name: string
      unit: string
      purchase_price: number
      supplier: string | null
      notes: string | null
    }> = []

    const skipped: string[] = []

    for (const ing of ingredients) {
      const name = ing.name?.trim()
      if (!name) continue

      const nameLower = name.toLowerCase()

      // Skip if already exists
      if (existingNames.has(nameLower)) {
        skipped.push(name)
        continue
      }

      // Add to new ingredients
      existingNames.add(nameLower) // Prevent duplicates within same import

      newIngredients.push({
        tenant_slug,
        name,
        unit: ing.unit || 'stuk',
        purchase_price: parseFloat(ing.price) || 0,
        supplier: ing.supplier || null,
        notes: ing.article_nr ? `Art.nr: ${ing.article_nr}` : null
      })
    }

    // Insert new ingredients
    let inserted = 0
    if (newIngredients.length > 0) {
      const { error } = await supabase
        .from('ingredients')
        .insert(newIngredients)

      if (error) {
        console.error('Insert error:', error)
        return NextResponse.json({ error: 'Failed to insert ingredients', details: error.message }, { status: 500 })
      }
      inserted = newIngredients.length
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped: skipped.length,
      skippedNames: skipped.slice(0, 10), // Show first 10 skipped
      message: `${inserted} ingrediënten toegevoegd, ${skipped.length} overgeslagen (al aanwezig)`
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ 
      error: 'Import failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
