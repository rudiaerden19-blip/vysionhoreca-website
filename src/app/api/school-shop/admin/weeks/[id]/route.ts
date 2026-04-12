import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant_slug = request.nextUrl.searchParams.get('tenant_slug')?.trim()
    if (!tenant_slug) {
      return NextResponse.json({ error: 'tenant_slug verplicht' }, { status: 400 })
    }
    const access = await verifyTenantOrSuperAdmin(request, tenant_slug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
    }

    const { data: row } = await supabase
      .from('school_shop_weeks')
      .select('id')
      .eq('id', params.id)
      .eq('tenant_slug', tenant_slug)
      .maybeSingle()

    if (!row) {
      return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
    }

    const { error } = await supabase.from('school_shop_weeks').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('school-shop admin week DELETE', e)
    return NextResponse.json({ error: 'Mislukt' }, { status: 500 })
  }
}
