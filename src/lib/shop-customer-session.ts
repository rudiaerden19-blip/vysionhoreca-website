import type { NextRequest } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export function webshopBrowserSessionCookieName(tenantSlug: string): string {
  return `vysion_wbs_${tenantSlug.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

/** Klant-id uit httpOnly webshop-sessie (zelfde cookie als /api/shop/browser-session). */
export async function resolveShopCustomerIdFromRequest(
  request: NextRequest,
  tenantSlug: string,
): Promise<string | null> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return null

  const token = request.cookies.get(webshopBrowserSessionCookieName(tenantSlug))?.value?.trim()
  if (!token) return null

  const { data, error } = await supabase
    .from('webshop_browser_sessions')
    .select('shop_customer_id')
    .eq('tenant_slug', tenantSlug)
    .eq('session_token', token)
    .maybeSingle()

  if (error || !data?.shop_customer_id) return null
  return String(data.shop_customer_id)
}
