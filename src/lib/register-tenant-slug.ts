/**
 * Zelfde regels als `/api/auth/register`: slug = lowercase alfanumeriek uit zaaknaam.
 * Los module voor unit tests en consistentie.
 */
export function slugifyBusinessNameForTenant(businessName: string): string {
  let tenantSlug = businessName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '')

  if (!tenantSlug || tenantSlug.length < 2) {
    tenantSlug = 'shop'+ Date.now().toString(36)
  }

  return tenantSlug
}
