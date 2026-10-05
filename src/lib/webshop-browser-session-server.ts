import type { NextRequest } from 'next/server'
import type { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  readWebshopBrowserSessionToken,
  resolveWebshopTenantSlug,
  webshopBrowserSessionCookieName,
  webshopTenantSlugDbVariants,
} from '@/lib/webshop-tenant-slug'

type SessionRow = {
  cart_items: unknown
  whatsapp_phone: string | null
  shop_customer_id: string | null
}

function normalizeCart(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : []
}

function sessionCookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax' as const,
    secure: request.nextUrl.protocol === 'https:',
  }
}

async function loadExistingBrowserSession(
  supabase: SupabaseClient,
  tenantInput: string,
  tenant_slug: string,
  token: string,
): Promise<SessionRow | null> {
  const slugCandidates = [...new Set([tenant_slug, ...webshopTenantSlugDbVariants(tenantInput)])]
  for (const slug of slugCandidates) {
    const { data } = await supabase
      .from('webshop_browser_sessions')
      .select('cart_items, whatsapp_phone, shop_customer_id')
      .eq('tenant_slug', slug)
      .eq('session_token', token)
      .maybeSingle()
    if (data) return data as SessionRow
  }
  return null
}

/**
 * Koppel webshop-klant aan browser-sessie (httpOnly cookie + DB).
 * Direct na geslaagde login/register — betrouwbaarder dan aparte client-PATCH.
 */
export async function bindShopCustomerToBrowserSession(
  request: NextRequest,
  supabase: SupabaseClient,
  tenantInput: string,
  customerId: string,
): Promise<{ ok: true; sessionToken: string } | { ok: false; error: string }> {
  const id = customerId.trim()
  if (!id) return { ok: false, error: 'bad_request' }

  const tenant_slug = await resolveWebshopTenantSlug(supabase, tenantInput)
  let token = readWebshopBrowserSessionToken(request, tenantInput)
  if (!token) token = crypto.randomUUID()

  const prev =
    (await loadExistingBrowserSession(supabase, tenantInput, tenant_slug, token)) ?? {
      cart_items: [],
      whatsapp_phone: null,
      shop_customer_id: null,
    }

  const nextRow = {
    tenant_slug,
    session_token: token,
    cart_items: normalizeCart(prev.cart_items),
    whatsapp_phone: prev.whatsapp_phone,
    shop_customer_id: id,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('webshop_browser_sessions').upsert(nextRow, {
    onConflict: 'tenant_slug,session_token',
  })

  if (error) {
    console.error('[webshop-browser-session-server] bind customer', error)
    return { ok: false, error: 'session_save_failed' }
  }

  return { ok: true, sessionToken: token }
}

export function applyWebshopSessionCookieToResponse(
  request: NextRequest,
  res: NextResponse,
  tenantInput: string,
  sessionToken: string,
): void {
  res.cookies.set(
    webshopBrowserSessionCookieName(tenantInput),
    sessionToken,
    sessionCookieOptions(request),
  )
}
