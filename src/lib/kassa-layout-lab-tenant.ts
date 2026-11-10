/** Superadmin layout-lab: welke zaak in de iframe-preview — niet welke code op productie draait. */
export const KASSA_LAYOUT_LAB_TENANT_STORAGE_KEY = 'vysion-kassa-layout-lab-tenant-v1'

/** Eerste bezoek lab (alleen preview-data; productie-code = alle tenants). */
export const KASSA_LAYOUT_LAB_FALLBACK_TENANT = 'ohgreen'

export function normalizeKassaLayoutLabTenantSlug(raw: string): string {
  return raw.trim().toLowerCase()
}

export function readKassaLayoutLabTenantSlug(urlTenant: string): string {
  const fromUrl = normalizeKassaLayoutLabTenantSlug(urlTenant)
  if (fromUrl) return fromUrl
  if (typeof window === 'undefined') return KASSA_LAYOUT_LAB_FALLBACK_TENANT
  try {
    const stored = localStorage.getItem(KASSA_LAYOUT_LAB_TENANT_STORAGE_KEY)
    if (stored) {
      const s = normalizeKassaLayoutLabTenantSlug(stored)
      if (s) return s
    }
  } catch {
    /* private mode */
  }
  return KASSA_LAYOUT_LAB_FALLBACK_TENANT
}

export function writeKassaLayoutLabTenantSlug(tenantSlug: string): void {
  const s = normalizeKassaLayoutLabTenantSlug(tenantSlug)
  if (!s) return
  try {
    localStorage.setItem(KASSA_LAYOUT_LAB_TENANT_STORAGE_KEY, s)
  } catch {
    /* noop */
  }
}
