import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeTenantSlugKey } from '@/lib/demo-links'
import { tenantSlugQueryVariants } from '@/lib/tenant-slug-variants'

/** Eén cookie per zaak ongeacht `/shop/Frituur-Rudi` vs subdomein `frituurrudi`. */
export function webshopBrowserSessionCookieName(tenantSlug: string): string {
  const key = normalizeTenantSlugKey(tenantSlug) || 'unknown'
  return `vysion_wbs_${key.replace(/[^a-z0-9]/g, '')}`
}

/** Vóór normalisatie (bestaande sessies in productie). */
export function legacyWebshopBrowserSessionCookieName(tenantSlug: string): string {
  return `vysion_wbs_${tenantSlug.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

/** Lees sessietoken — nieuwe + legacy cookienaam (alleen webshop-mand/klant). */
export function readWebshopBrowserSessionToken(
  request: NextRequest,
  tenantSlug: string,
): string | null {
  const names = new Set<string>()
  for (const slug of [tenantSlug, ...tenantSlugQueryVariants(tenantSlug)]) {
    names.add(webshopBrowserSessionCookieName(slug))
    names.add(legacyWebshopBrowserSessionCookieName(slug))
  }
  for (const name of names) {
    const token = request.cookies.get(name)?.value?.trim()
    if (token) return token
  }
  return null
}

/** Canonieke `tenant_slug` uit DB (hyphen/case/subdomein). */
export async function resolveWebshopTenantSlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<string> {
  const trimmed = slug.trim()
  if (!trimmed) return trimmed

  const variants = tenantSlugQueryVariants(trimmed)
  const { data } = await supabase
    .from('tenant_settings')
    .select('tenant_slug')
    .in('tenant_slug', variants)
    .limit(1)
    .maybeSingle()

  if (data?.tenant_slug && typeof data.tenant_slug === 'string') {
    return data.tenant_slug
  }
  return trimmed
}

export { tenantSlugQueryVariants }
