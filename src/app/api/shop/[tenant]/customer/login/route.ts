import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { loginShopCustomerServer } from '@/lib/shop-customer-auth-server'
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

  let body: { email?: string; password?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const result = await loginShopCustomerServer(
    supabase,
    tenantSlug,
    body.email ?? '',
    body.password ?? '',
  )

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 401 })
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
