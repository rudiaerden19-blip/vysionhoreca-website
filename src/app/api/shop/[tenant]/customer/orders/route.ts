import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { getShopCustomerByIdServer } from '@/lib/shop-customer-auth-server'
import { resolveShopCustomerIdFromRequest } from '@/lib/shop-customer-session'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

export async function GET(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 500 })
  }

  const customerId = await resolveShopCustomerIdFromRequest(request, tenantSlug)
  if (!customerId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const customer = await getShopCustomerByIdServer(supabase, tenantSlug, customerId)
  if (!customer?.email) {
    return NextResponse.json({ ok: true, orders: [] })
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .eq('customer_email', customer.email)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[shop-customer/orders] GET', error)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, orders: data ?? [] })
}
