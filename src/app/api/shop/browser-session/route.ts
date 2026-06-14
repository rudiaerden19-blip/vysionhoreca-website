import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function cookieName(tenantSlug: string): string {
  return `vysion_wbs_${tenantSlug.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

function cookiePath(tenantSlug: string): string {
  return `/shop/${tenantSlug}`
}

type SessionRow = {
  cart_items: unknown
  whatsapp_phone: string | null
  shop_customer_id: string | null
}

function normalizeCart(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : []
}

export async function GET(request: NextRequest) {
  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 500 })
  }

  const tenant_slug = request.nextUrl.searchParams.get('tenant_slug')?.trim()
  if (!tenant_slug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const token = request.cookies.get(cookieName(tenant_slug))?.value?.trim()
  if (!token) {
    return NextResponse.json({
      ok: true,
      cart: [],
      whatsapp_phone: null,
      shop_customer_id: null,
    })
  }

  const { data, error } = await supabase
    .from('webshop_browser_sessions')
    .select('cart_items, whatsapp_phone, shop_customer_id')
    .eq('tenant_slug', tenant_slug)
    .eq('session_token', token)
    .maybeSingle()

  if (error) {
    console.error('[shop/browser-session] GET', error)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  const row = data as SessionRow | null
  return NextResponse.json({
    ok: true,
    cart: normalizeCart(row?.cart_items),
    whatsapp_phone: row?.whatsapp_phone ?? null,
    shop_customer_id: row?.shop_customer_id ?? null,
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 500 })
  }

  let body: {
    tenant_slug?: string
    cart?: unknown[]
    whatsapp_phone?: string | null
    shop_customer_id?: string | null
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const tenant_slug = body.tenant_slug?.trim()
  if (!tenant_slug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const cName = cookieName(tenant_slug)
  let token = request.cookies.get(cName)?.value?.trim()
  if (!token) {
    token = crypto.randomUUID()
  }

  const { data: existing } = await supabase
    .from('webshop_browser_sessions')
    .select('cart_items, whatsapp_phone, shop_customer_id')
    .eq('tenant_slug', tenant_slug)
    .eq('session_token', token)
    .maybeSingle()

  const prev = (existing as SessionRow | null) ?? {
    cart_items: [],
    whatsapp_phone: null,
    shop_customer_id: null,
  }

  const nextRow = {
    tenant_slug,
    session_token: token,
    cart_items: 'cart' in body ? normalizeCart(body.cart) : normalizeCart(prev.cart_items),
    whatsapp_phone:
      'whatsapp_phone' in body ? body.whatsapp_phone?.trim() || null : prev.whatsapp_phone,
    shop_customer_id:
      'shop_customer_id' in body ? body.shop_customer_id ?? null : prev.shop_customer_id,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('webshop_browser_sessions').upsert(nextRow, {
    onConflict: 'tenant_slug,session_token',
  })

  if (error) {
    console.error('[shop/browser-session] PATCH', error)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }

  const res = NextResponse.json({
    ok: true,
    cart: nextRow.cart_items,
    whatsapp_phone: nextRow.whatsapp_phone,
    shop_customer_id: nextRow.shop_customer_id,
  })
  res.cookies.set(cName, token, {
    httpOnly: true,
    path: cookiePath(tenant_slug),
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
