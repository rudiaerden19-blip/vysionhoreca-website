import type { TenantModuleId } from '@/lib/tenant-modules'

export type TenantModuleAccess = Record<TenantModuleId, boolean>

/** Dashboard / omzet-widgets: orders alleen als kassa, weborders of rapporten aan staat. */
export function tenantShouldLoadOrderDashboardData(access: TenantModuleAccess): boolean {
  return !!(
    access.kassa ||
    access['retail-kassa'] ||
    access['online-bestellingen'] ||
    access.rapporten
  )
}

export function tenantShouldLoadWebsiteReviews(access: TenantModuleAccess): boolean {
  return !!access.website
}

/** Populaire items op dashboard = rapporten-module. */
export function tenantShouldLoadPopularItemsStats(access: TenantModuleAccess): boolean {
  return !!access.rapporten && tenantShouldLoadOrderDashboardData(access)
}

/** Kassa: 3s-poll voor webshop `new`orders. */
export function tenantShouldPollWebshopNewOrders(access: TenantModuleAccess): boolean {
  return !!access['online-bestellingen']
}

/** Kassa: reserverings-poll + alarm. */
export function tenantShouldPollReservations(access: TenantModuleAccess): boolean {
  return !!access.reservaties
}
