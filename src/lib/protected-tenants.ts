// =====================================================
// BESCHERMDE TENANTS - KUNNEN NIET VERWIJDERD WORDEN
// =====================================================
// Voeg hier tenant slugs toe die NOOIT verwijderd mogen worden

export const PROTECTED_TENANTS = [
  'frituurnolim',
  'frituur-nolim',
  'demo-frituur',
] as const

export function isProtectedTenant(slug: string | null | undefined): boolean {
  if (!slug) return false
  const normalizedSlug = slug.toLowerCase().trim()
  return PROTECTED_TENANTS.some(protected => 
    normalizedSlug === protected || 
    normalizedSlug.startsWith(protected)
  )
}

export function getProtectionError(slug: string): string {
  return `Tenant "${slug}" is beschermd en kan niet verwijderd worden.`
}
