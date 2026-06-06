const KEY = (tenant: string, slotKey: string) => `gks_cost_center_ref_${tenant}_${slotKey}`

export function getOrCreateCostCenterReference(tenantSlug: string, slotKey: string): string {
  if (typeof window === 'undefined') {
    return `server-${slotKey}`
  }
  try {
    const existing = localStorage.getItem(KEY(tenantSlug, slotKey))?.trim()
    if (existing) return existing
    const ref =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `ref-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(KEY(tenantSlug, slotKey), ref)
    return ref
  } catch {
    return `fallback-${slotKey}`
  }
}

export function clearCostCenterReference(tenantSlug: string, slotKey: string): void {
  try {
    localStorage.removeItem(KEY(tenantSlug, slotKey))
  } catch {
    /* ignore */
  }
}
