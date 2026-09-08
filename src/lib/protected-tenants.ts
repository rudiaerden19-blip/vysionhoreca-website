// =====================================================
// BESCHERMDE TENANTS - KUNNEN NIET VERWIJDERD WORDEN
// =====================================================
// Voeg hier tenant slugs toe die NOOIT verwijderd mogen worden

export const PROTECTED_TENANTS = [
  'frituurnolim',
  'frituur-nolim',
  'skippsbv',
  'restaurantdekorf',
  'demo-frituur',
] as const

// Admin accounts - nooit betalen, nooit verlopen
export const ADMIN_TENANTS = [
  'frituurnolim',
  'skippsbv',
  'restaurantdekorf',
] as const

// Demo / test accounts — geen betalende zaak, niet meetellen in superadmin-totalen
export const DEMO_TENANTS = [
  'demo-frituur',
  'gkstest',
] as const

export function isAdminTenant(slug: string | null | undefined): boolean {
  if (!slug) return false
  const normalizedSlug = slug.toLowerCase().trim()
  return ADMIN_TENANTS.some((a) => normalizedSlug === a)
}

/**
 * Donor-/platformtenants (ADMIN_TENANTS): in superadmin- en abonnement-lijsten altijd **pro + active**,
 * nooit trial/starter — los van wat er in `subscriptions`staat.
 */
export function donorAdminDisplaySubscription<T extends { plan: string; status: string }>(
  tenantSlug: string,
  sub: T | null | undefined
): T | undefined {
  if (!isAdminTenant(tenantSlug)) return sub ?? undefined
  const base = (sub ?? { plan: 'pro', status: 'active'}) as T
  return { ...base, plan: 'pro', status: 'active'}
}

export function isProtectedTenant(slug: string | null | undefined): boolean {
  if (!slug) return false
  const normalizedSlug = slug.toLowerCase().trim()
  return PROTECTED_TENANTS.some((p) => 
    normalizedSlug === p || 
    normalizedSlug.startsWith(p)
  )
}

export function isDemoTenant(slug: string | null | undefined): boolean {
  if (!slug) return false
  const normalizedSlug = slug.toLowerCase().trim()
  return DEMO_TENANTS.some((d) => normalizedSlug === d)
}

/** Eigen demos, MAIN/admin-zaken — niet meetellen als klantzaak. */
export function isInternalPlatformTenant(slug: string | null | undefined): boolean {
  return isAdminTenant(slug) || isDemoTenant(slug)
}

export function getProtectionError(slug: string): string {
  return `Tenant "${slug}" is beschermd en kan niet verwijderd worden.`
}
