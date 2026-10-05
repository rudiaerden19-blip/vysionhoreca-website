import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import {
  deleteShopCustomerAccountServer,
  getShopCustomerByIdServer,
} from '@/lib/shop-customer-auth-server'
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
  if (!customer) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, customer })
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

  let body: { name?: string; phone?: string; address?: string; postal_code?: string; city?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const updates: Record<string, string> = {}
  if (typeof body.name === 'string') updates.name = body.name.trim()
  if (typeof body.phone === 'string') updates.phone = body.phone.trim()
  if (typeof body.address === 'string') updates.address = body.address.trim()
  if (typeof body.postal_code === 'string') updates.postal_code = body.postal_code.trim()
  if (typeof body.city === 'string') updates.city = body.city.trim()
  updates.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('shop_customers')
    .update(updates)
    .eq('tenant_slug', tenantSlug)
    .eq('id', customerId)

  if (error) {
    console.error('[shop-customer/me] PATCH', error)
    return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500 })
  }

  const customer = await getShopCustomerByIdServer(supabase, tenantSlug, customerId)
  return NextResponse.json({ ok: true, customer })
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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

  const ok = await deleteShopCustomerAccountServer(supabase, tenantSlug, customerId)
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'delete_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
