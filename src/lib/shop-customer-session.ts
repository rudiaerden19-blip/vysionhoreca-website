import type { NextRequest } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import {
  readWebshopBrowserSessionToken,
  resolveWebshopTenantSlug,
  tenantSlugQueryVariants,
} from '@/lib/webshop-tenant-slug'

/** Klant-id uit httpOnly webshop-sessie (zelfde cookie als /api/shop/browser-session). */
export async function resolveShopCustomerIdFromRequest(
  request: NextRequest,
  tenantSlug: string,
): Promise<string | null> {
  const supabase = getServerSupabaseClient()
  if (!supabase) return null

  const token = readWebshopBrowserSessionToken(request, tenantSlug)
  if (!token) return null

  const canonical = await resolveWebshopTenantSlug(supabase, tenantSlug)
  const slugCandidates = [...new Set([canonical, ...tenantSlugQueryVariants(tenantSlug)])]

  for (const slug of slugCandidates) {
    const { data, error } = await supabase
      .from('webshop_browser_sessions')
      .select('shop_customer_id')
      .eq('tenant_slug', slug)
      .eq('session_token', token)
      .maybeSingle()

    if (error) continue
    if (data?.shop_customer_id) return String(data.shop_customer_id)
  }

  return null
}
