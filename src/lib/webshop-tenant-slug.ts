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

/**
 * Alle slug-vormen om in DB te matchen (elke tenant: hyphen, case, subdomein).
 * Geen hardcoded slug — alleen afgeleid van route/host-input.
 */
export function webshopTenantSlugDbVariants(slug: string): string[] {
  const trimmed = slug.trim()
  if (!trimmed) return []

  const out = new Set<string>()
  const seeds = [
    trimmed,
    trimmed.toLowerCase(),
    trimmed.replace(/-/g, ''),
    trimmed.toLowerCase().replace(/-/g, ''),
  ]
  for (const seed of seeds) {
    if (!seed) continue
    for (const v of tenantSlugQueryVariants(seed)) {
      out.add(v)
    }
  }
  return [...out]
}

/** Lees sessietoken — nieuwe + legacy cookienaam (alleen webshop-mand/klant). */
export function readWebshopBrowserSessionToken(
  request: NextRequest,
  tenantSlug: string,
): string | null {
  const names = new Set<string>()
  for (const slug of webshopTenantSlugDbVariants(tenantSlug)) {
    names.add(webshopBrowserSessionCookieName(slug))
    names.add(legacyWebshopBrowserSessionCookieName(slug))
  }
  for (const name of names) {
    const token = request.cookies.get(name)?.value?.trim()
    if (token) return token
  }
  return null
}

/** Canonieke `tenant_slug` uit DB (tenant_settings of tenants.slug). */
export async function resolveWebshopTenantSlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<string> {
  const trimmed = slug.trim()
  if (!trimmed) return trimmed

  const variants = webshopTenantSlugDbVariants(trimmed)

  const { data: settingsRows, error: settingsErr } = await supabase
    .from('tenant_settings')
    .select('tenant_slug')
    .in('tenant_slug', variants)
    .limit(1)

  if (!settingsErr && settingsRows?.[0]?.tenant_slug) {
    return String(settingsRows[0].tenant_slug)
  }

  const { data: tenantRows, error: tenantsErr } = await supabase
    .from('tenants')
    .select('slug')
    .in('slug', variants)
    .limit(1)

  if (!tenantsErr && tenantRows?.[0]?.slug) {
    return String(tenantRows[0].slug)
  }

  return trimmed
}

export { tenantSlugQueryVariants }
