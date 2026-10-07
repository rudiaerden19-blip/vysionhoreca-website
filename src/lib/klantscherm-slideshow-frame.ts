/**
 * Klantscherm (15″ landscape): elke promo/menu-foto in hetzelfde kader.
 * Bronfoto’s verschillen in formaat/compositie (kassa/menu); we normaliseren alleen de weergave.
 */
export const KLANTSCHERM_SLIDE_FRAME_CLASS =
  'relative aspect-video h-[min(88vh,100%)] w-[min(96vw,calc(88vh*16/9))] max-h-[88vh] max-w-[96vw] shrink-0'

export function klantschermSlideBackdropStyle(url: string): { backgroundImage: string } {
  const safe = url.replace(/"/g, '%22')
  return { backgroundImage: `url("${safe}")` }
}
