import { normalizeTenantSlugKey } from '@/lib/demo-links'

/** Slugs om te proberen bij DB-reads (subdomein vs geregistreerde slug). */
export function tenantSlugQueryVariants(slug: string): string[] {
  const s = slug.trim()
  const out = new Set<string>()
  if (s) out.add(s)
  const noHyphen = s.replace(/-/g, '')
  if (noHyphen) out.add(noHyphen)
  return [...out]
}

export function tenantSlugsMatch(a: string, b: string): boolean {
  return normalizeTenantSlugKey(a) === normalizeTenantSlugKey(b)
}
