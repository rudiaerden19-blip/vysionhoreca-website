import { isOhGreenKassaTenant } from '@/lib/kassa-oh-green-discount'
import {
  KASSA_MENU_TILE_TOUCH_PRESS,
  KASSA_MENU_TILE_TOUCH_PRESS_OVERLAY,
} from '@/lib/kassa-pos-surface'

/** Klassiek-kassa: gedempt navy, lichter per bovenste rij. */

export const KASSA_CLASSIC_TILE_FACE =
  'border border-[#0f2740] shadow-[0_3px_8px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.08)_inset]'

/** Oh Green + Klassiek: vlakke tegels (geen schaduw / tik-animatie) — trage kiosk-pc. */
export const KASSA_CLASSIC_TILE_FACE_FLAT = 'border border-[#0f2740]'

export const KASSA_CLASSIC_TILE_BLUES = [
  'bg-[#2f6fad] hover:brightness-105',
  'bg-[#245a8c] hover:brightness-105',
  'bg-[#1a3f66] hover:brightness-105',
] as const

export function ohGreenClassicFlatMenuTiles(
  tenantSlug: string,
  classicLayoutActive: boolean,
  businessName?: string | null,
): boolean {
  return classicLayoutActive && isOhGreenKassaTenant(tenantSlug, businessName)
}

export function kassaClassicTileBlueClass(index: number, columns = 6, flatChrome = false): string {
  const cols = Math.max(1, columns)
  const row = Math.floor(Math.max(0, index) / cols)
  const face = flatChrome ? KASSA_CLASSIC_TILE_FACE_FLAT : KASSA_CLASSIC_TILE_FACE
  const blueFull = KASSA_CLASSIC_TILE_BLUES[row % KASSA_CLASSIC_TILE_BLUES.length]
  const blue = flatChrome ? blueFull.split(' ')[0] : blueFull
  return `${face} ${blue}`
}

export function kassaClassicMenuTileInteractionClass(flatChrome: boolean): string {
  if (flatChrome) return ''
  return `${KASSA_MENU_TILE_TOUCH_PRESS} ${KASSA_MENU_TILE_TOUCH_PRESS_OVERLAY}`
}
