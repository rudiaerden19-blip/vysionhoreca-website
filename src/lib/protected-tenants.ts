// =====================================================
// BESCHERMDE TENANTS - KUNNEN NIET VERWIJDERD WORDEN
// =====================================================
// Voeg hier tenant slugs toe die NOOIT verwijderd mogen worden

export const PROTECTED_TENANTS = [
  'frituurnolim',
  'frituur-nolim',
  'skippsbv',
  'demo-frituur',
] as const

// Admin accounts - nooit betalen, nooit verlopen
export const ADMIN_TENANTS = [
  'frituurnolim',
  'skippsbv',
] as const

export function isAdminTenant(slug: string | null | undefined): boolean {
  if (!slug) return false
  const normalizedSlug = slug.toLowerCase().trim()
  return ADMIN_TENANTS.some((a) => normalizedSlug === a)
}

export function isProtectedTenant(slug: string | null | undefined): boolean {
  if (!slug) return false
  const normalizedSlug = slug.toLowerCase().trim()
  return PROTECTED_TENANTS.some((p) => 
    normalizedSlug === p || 
    normalizedSlug.startsWith(p)
  )
}

export function getProtectionError(slug: string): string {
  return `Tenant "${slug}" is beschermd en kan niet verwijderd worden.`
}
