import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * URL/route kan iets anders zijn dan DB-slug (met/zonder streepje).
 * Geen hardcoded tenant — alleen normalisatie-varianten van de meegegeven slug.
 */
export function tenantSlugLookupVariants(slug: string): string[] {
  const s = (slug || '').trim()
  if (!s) return []
  const noHyphen = s.replace(/-/g, '')
  return noHyphen !== s ? [s, noHyphen] : [s]
}

/** Geldige tenant (tenants-rij bestaat) voor security checks en e-mail. */
export async function tenantExistsInDb(
  supabase: SupabaseClient,
  tenantSlug: string
): Promise<boolean> {
  for (const v of tenantSlugLookupVariants(tenantSlug)) {
    const { data } = await supabase.from('tenants').select('slug').eq('slug', v).maybeSingle()
    if (data?.slug) return true
  }
  return false
}
