/** Same-tab sync when thermal printer IP is saved (storage event only fires across tabs). */
export const THERMAL_PRINTER_IP_SYNC_EVENT = 'vysion:thermal-printer-ip'

export function thermalPrinterIpStorageKey(tenantSlug: string): string {
  return `printer_ip_${tenantSlug}`
}

export function dispatchThermalPrinterIpSaved(tenantSlug: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(THERMAL_PRINTER_IP_SYNC_EVENT, { detail: { tenantSlug } }))
}
