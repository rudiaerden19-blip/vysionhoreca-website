/** Vlakke zwarte kassaknoppen — alleen Blonkys restaurant en Blonkys snackbar/eethuis. */

export const KASSA_BLONKYS_FLAT_HTML_CLASS = 'kassa-blonkys-flat-btns'

/** Online, Uitloggen, Verwijder en Afrekenen houden hun huidige kleur. */
export const KASSA_BLONKYS_KEEP_CHROME_CLASS = 'kassa-keep-chrome'

export function isBlonkysFlatBlackKassaTenant(slug: string | null | undefined): boolean {
  const s = String(slug ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  if (!s.includes('blonkys')) return false
  return s.includes('restaurant') || s.includes('eethuis') || s.includes('snack')
}
