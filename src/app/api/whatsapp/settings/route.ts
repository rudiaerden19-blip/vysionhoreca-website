import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - fetch settings for tenant
export async function GET(request: NextRequest) {
  const tenantSlug = request.nextUrl.searchParams.get('tenant')
  
  if (!tenantSlug) {
    return NextResponse.json({ error: 'Missing tenant' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('whatsapp_settings')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST - save settings for tenant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenant_slug, ...settings } = body

    if (!tenant_slug) {
      return NextResponse.json({ error: 'Missing tenant_slug' }, { status: 400 })
    }

    // Check if settings exist
    const { data: existing } = await supabaseAdmin
      .from('whatsapp_settings')
      .select('id')
      .eq('tenant_slug', tenant_slug)
      .single()

    let result
    if (existing?.id) {
      // Update
      const { data, error } = await supabaseAdmin
        .from('whatsapp_settings')
        .update(settings)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Insert
      const { data, error } = await supabaseAdmin
        .from('whatsapp_settings')
        .insert({ tenant_slug, ...settings })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('WhatsApp settings save error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
