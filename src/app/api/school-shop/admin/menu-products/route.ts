import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const tenant_slug = request.nextUrl.searchParams.get('tenant_slug')?.trim()
    if (!tenant_slug) {
      return NextResponse.json({ error: 'tenant_slug verplicht' }, { status: 400 })
    }
    const access = await verifyTenantOrSuperAdmin(request, tenant_slug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('menu_products')
      .select('id, name, price, is_active')
      .eq('tenant_slug', tenant_slug)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return NextResponse.json((data || []).filter((p) => p.is_active !== false))
  } catch (e) {
    console.error('school-shop menu-products', e)
    return NextResponse.json({ error: 'Mislukt' }, { status: 500 })
  }
}
