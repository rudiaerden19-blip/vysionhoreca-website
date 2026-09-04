/** Klassiek-kassa: gedempt navy, lichter per bovenste rij. */

export const KASSA_CLASSIC_TILE_FACE =
  'border border-[#0f2740] shadow-[0_3px_8px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.08)_inset]'

export const KASSA_CLASSIC_TILE_BLUES = [
  'bg-[#2f6fad] hover:brightness-105',
  'bg-[#245a8c] hover:brightness-105',
  'bg-[#1a3f66] hover:brightness-105',
] as const

export function kassaClassicTileBlueClass(index: number, columns = 6): string {
  const cols = Math.max(1, columns)
  const row = Math.floor(Math.max(0, index) / cols)
  return `${KASSA_CLASSIC_TILE_FACE} ${KASSA_CLASSIC_TILE_BLUES[row % KASSA_CLASSIC_TILE_BLUES.length]}`
}
