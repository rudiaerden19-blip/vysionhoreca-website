import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { registerShopCustomerServer } from '@/lib/shop-customer-auth-server'
import {
  applyWebshopSessionCookieToResponse,
  bindShopCustomerToBrowserSession,
} from '@/lib/webshop-browser-session-server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

export async function POST(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 500 })
  }

  let body: {
    email?: string
    password?: string
    name?: string
    phone?: string
    address?: string
    postal_code?: string
    city?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const result = await registerShopCustomerServer(supabase, tenantSlug, {
    email: body.email ?? '',
    password: body.password ?? '',
    name: body.name ?? '',
    phone: body.phone ?? '',
    address: body.address ?? '',
    postal_code: body.postal_code ?? '',
    city: body.city ?? '',
  })

  if (!result.ok) {
    const status = result.error === 'email_in_use' ? 409 : 400
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  const customerId = result.customer.id
  if (!customerId) {
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  const bound = await bindShopCustomerToBrowserSession(
    request,
    supabase,
    tenantSlug,
    String(customerId),
  )
  if (!bound.ok) {
    return NextResponse.json({ ok: false, error: 'session_save_failed' }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true, customer: result.customer, session_bound: true })
  applyWebshopSessionCookieToResponse(request, res, tenantSlug, bound.sessionToken)
  return res
}
