/**
 * Thermische bon: zelfde Vysion Print-server (:3001, JSON → ESC/POS in de app),
 * met twee manieren om die server te bereiken:
 * - LAN: IPv4 van iPad of ander toestel op het netwerk
 * - PC + USB: print-server op deze machine (localhost) die de Epson via USB aanstuurt
 */

import { normalizeLanPrinterIp } from '@/lib/printer-lan'

export type PrinterThermalConnectionMode = 'lan_print_server' | 'pc_local_usb'

const connectionModeKey = (tenantSlug: string) => `printer_connection_${tenantSlug}`
const printerIpKey = (tenantSlug: string) => `printer_ip_${tenantSlug}`

/** Print-server voor USB op dezelfde PC als de browser (Vysion Print Windows). */
export const LOCAL_THERMAL_PRINT_HOST = '127.0.0.1'

export function getPrinterConnectionMode(tenantSlug: string): PrinterThermalConnectionMode {
  if (typeof window === 'undefined') return 'lan_print_server'
  const v = localStorage.getItem(connectionModeKey(tenantSlug))
  return v === 'pc_local_usb' ? 'pc_local_usb' : 'lan_print_server'
}

export function setPrinterConnectionMode(tenantSlug: string, mode: PrinterThermalConnectionMode): void {
  localStorage.setItem(connectionModeKey(tenantSlug), mode)
}

/**
 * Alleen het opgeslagen LAN-IP (geen localhost-override).
 * Handig voor het invullen van het IP-veld als de modus tijdelijk op PC/USB staat.
 */
export function getStoredLanPrinterIpOnly(tenantSlug: string): string | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(printerIpKey(tenantSlug))
  if (!raw) return null
  return normalizeLanPrinterIp(raw)
}

/**
 * Effectief doel-IPv4 voor thermal POST naar :3001 (proxy of direct).
 */
export function getEffectiveThermalPrinterIp(tenantSlug: string): string | null {
  if (getPrinterConnectionMode(tenantSlug) === 'pc_local_usb') {
    return LOCAL_THERMAL_PRINT_HOST
  }
  return getStoredLanPrinterIpOnly(tenantSlug)
}
