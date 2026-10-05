import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { getShopCustomerByIdServer } from '@/lib/shop-customer-auth-server'
import { tenantSlugsMatch } from '@/lib/tenant-slug-variants'
import {
  readWebshopBrowserSessionToken,
  resolveWebshopTenantSlug,
  webshopBrowserSessionCookieName,
  webshopTenantSlugDbVariants,
} from '@/lib/webshop-tenant-slug'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const dynamic = 'force-dynamic'

function cookiePath(_tenantSlug: string): string {
  // Path moet `/` zijn: op *.ordervysion.com staat de URL op `/menu`, `/checkout` (rewrite),
  // terwijl API-calls naar `/api/shop/browser-session` gaan. Met `/shop/{tenant}` werd de
  // httpOnly-cookie nooit meegestuurd → checkout zag een lege mand.
  // Cookie-naam is per tenant (`vysion_wbs_*`), dus path `/` is veilig op gedeelde hosts.
  return '/'
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

  const tenantInput = request.nextUrl.searchParams.get('tenant_slug')?.trim()
  if (!tenantInput) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const tenant_slug = await resolveWebshopTenantSlug(supabase, tenantInput)

  const token = readWebshopBrowserSessionToken(request, tenantInput)
  if (!token) {
    return NextResponse.json({
      ok: true,
      cart: [],
      whatsapp_phone: null,
      shop_customer_id: null,
    })
  }

  let row: SessionRow | null = null
  const slugCandidates = [...new Set([tenant_slug, ...webshopTenantSlugDbVariants(tenantInput)])]
  for (const slug of slugCandidates) {
    const { data, error } = await supabase
      .from('webshop_browser_sessions')
      .select('cart_items, whatsapp_phone, shop_customer_id')
      .eq('tenant_slug', slug)
      .eq('session_token', token)
      .maybeSingle()
    if (error) {
      console.error('[shop/browser-session] GET', error)
      return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
    }
    if (data) {
      row = data as SessionRow
      break
    }
  }
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

  const tenantInput = body.tenant_slug?.trim()
  if (!tenantInput) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const tenant_slug = await resolveWebshopTenantSlug(supabase, tenantInput)

  const cName = webshopBrowserSessionCookieName(tenantInput)
  let token = readWebshopBrowserSessionToken(request, tenantInput)
  if (!token) {
    token = crypto.randomUUID()
  }

  let existing: SessionRow | null = null
  const slugCandidates = [...new Set([tenant_slug, ...webshopTenantSlugDbVariants(tenantInput)])]
  for (const slug of slugCandidates) {
    const { data } = await supabase
      .from('webshop_browser_sessions')
      .select('cart_items, whatsapp_phone, shop_customer_id')
      .eq('tenant_slug', slug)
      .eq('session_token', token)
      .maybeSingle()
    if (data) {
      existing = data as SessionRow
      break
    }
  }

  const prev = existing ?? {
    cart_items: [],
    whatsapp_phone: null,
    shop_customer_id: null,
  }

  let nextShopCustomerId =
    'shop_customer_id' in body ? body.shop_customer_id ?? null : prev.shop_customer_id

  if (nextShopCustomerId != null && nextShopCustomerId !== prev.shop_customer_id) {
    const id = String(nextShopCustomerId).trim()
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ ok: false, error: 'invalid_customer' }, { status: 400 })
    }
    let verifiedId: string | null = null
    const customer = await getShopCustomerByIdServer(supabase, tenantInput, id)
    if (customer?.id) {
      verifiedId = customer.id
    } else {
      const { data: byId } = await supabase
        .from('shop_customers')
        .select('id, tenant_slug')
        .eq('id', id)
        .maybeSingle()
      if (
        byId?.id &&
        typeof byId.tenant_slug === 'string' &&
        tenantSlugsMatch(byId.tenant_slug, tenantInput)
      ) {
        verifiedId = String(byId.id)
      }
    }
    if (!verifiedId) {
      return NextResponse.json({ ok: false, error: 'invalid_customer' }, { status: 400 })
    }
    nextShopCustomerId = verifiedId
  }

  const nextRow = {
    tenant_slug,
    session_token: token,
    cart_items: 'cart' in body ? normalizeCart(body.cart) : normalizeCart(prev.cart_items),
    whatsapp_phone:
      'whatsapp_phone' in body ? body.whatsapp_phone?.trim() || null : prev.whatsapp_phone,
    shop_customer_id: nextShopCustomerId,
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
    secure: request.nextUrl.protocol === 'https:',
  })
  return res
}
