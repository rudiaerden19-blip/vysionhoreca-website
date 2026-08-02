import type { TenantModuleId } from '@/lib/tenant-modules'

/**
 * Publieke tenant-site: knoppen volgen tenant-modules (registratie-productlijn / superadmin).
 * TableVysion: alleen reservaties — geen webshop-menu of «Bestel nu».
 */
export function isPublicOnlineOrderingEnabled(
  moduleAccess: Record<TenantModuleId, boolean>,
): boolean {
  return !!(moduleAccess['online-bestellingen'] || moduleAccess.online)
}

export function isPublicReservationsEnabled(
  moduleAccess: Record<TenantModuleId, boolean>,
): boolean {
  return !!moduleAccess.reservaties
}
