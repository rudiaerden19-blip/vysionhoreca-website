/** Klassiek-kassa: effen blauwe tegels, lichter per bovenste rij. */

export const KASSA_CLASSIC_TILE_BLUES = [
  'bg-[#3d9ee8] hover:brightness-105',
  'bg-[#2b6cb0] hover:brightness-105',
  'bg-[#1e4a7a] hover:brightness-105',
] as const

export function kassaClassicTileBlueClass(index: number, columns = 6): string {
  const cols = Math.max(1, columns)
  const row = Math.floor(Math.max(0, index) / cols)
  return KASSA_CLASSIC_TILE_BLUES[row % KASSA_CLASSIC_TILE_BLUES.length]
}
