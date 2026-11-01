/** Speels-chrome zonder glans — alleen Blonkys restaurant en snackbar/eethuis. */

import {
  kassaSpeelsGrayChromeButtonClass,
  kassaSpeelsOrderTypeButtonClass,
} from '@/lib/kassa-pos-surface'

export const KASSA_BLONKYS_FLAT_HTML_CLASS = 'kassa-blonkys-flat-btns'

/** Legacy hook (vroeger uitzondering op vlak zwart); mag op knoppen blijven staan. */
export const KASSA_BLONKYS_KEEP_CHROME_CLASS = 'kassa-keep-chrome'

const BLONKYS_MATTE_KASSA_SLUGS = new Set(['blonkysrestaurant', 'blonkyseethuis'])

/** Alleen Blonkys restaurant + snackbar/eethuis (exacte slugs). Andere tenants: geen html-class, geen CSS. */
export function isBlonkysFlatBlackKassaTenant(slug: string | null | undefined): boolean {
  const s = String(slug ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  return BLONKYS_MATTE_KASSA_SLUGS.has(s)
}

/** Categoriebalk — grijs chrome i.p.v. donkerblauw (alleen Blonkys). */
export function blonkysSpeelsCategoryStripButtonClass(active: boolean): string {
  return kassaSpeelsOrderTypeButtonClass(active)
}

/** Snelmenu-paneel — zelfde grijs chrome als Verkoop/Binnen (alleen Blonkys). */
export function blonkysSpeelsQuickMenuPanelButtonClass(): string {
  return kassaSpeelsGrayChromeButtonClass()
}
