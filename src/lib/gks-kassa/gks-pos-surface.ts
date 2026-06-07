/**
 * GKS-pilot: referentie-POS — lichtgrijs boven → donker onder, licht afgeronde hoeken.
 */

/** Rechthoekig, subtiel afgerond (“een beetje bollig”). */
export const GKS_BTN_SHAPE = 'rounded-[5px]'

const GKS_EDGE =
  'border border-[#2a2a2a] border-b-[#121212] shadow-[inset_0_1px_0_rgba(255,255,255,0.26)]'

/** Standaard toets (numpad, sidebar, header). */
export const GKS_POS_BTN = [
  'bg-gradient-to-b from-[#9a9a9a] via-[#5f5f5f] to-[#2a2a2a]',
  GKS_EDGE,
  'text-white',
  'hover:brightness-105',
  'active:brightness-[0.92]',
].join(' ')

/** Geselecteerde toets (bijv. Binnen, Ter plaatse, numpad open). */
export const GKS_POS_BTN_SELECTED = [
  'bg-gradient-to-b from-[#b0b0b0] via-[#757575] to-[#3d3d3d]',
  GKS_EDGE,
  'text-white',
  'ring-1 ring-inset ring-white/12',
  'hover:brightness-105',
  'active:brightness-[0.92]',
].join(' ')

/** Primaire actie (Afrekenen, actieve categorie). */
export const GKS_ACCENT_BTN = [
  GKS_BTN_SHAPE,
  'bg-gradient-to-b from-[#5cadff] via-[#0056d6] to-[#003a8c]',
  'text-white',
  'border border-[#003080] border-b-[#001d45]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.32)]',
  'hover:brightness-105',
  'active:brightness-[0.92]',
].join(' ')

/** Displayvelden (totaal, numpad-invoer). */
export const GKS_POS_FIELD = [
  GKS_BTN_SHAPE,
  'bg-gradient-to-b from-[#8a8a8a] via-[#4a4a4a] to-[#1a1a1a]',
  'border border-[#0f0f0f]',
  'shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]',
].join(' ')

/** Onderstrook menu-tegel (titel onder foto). */
export const GKS_MENU_TILE_LABEL_SURFACE =
  'bg-gradient-to-b from-[#8a8a8a] via-[#5a5a5a] to-[#333333]'

export function gksPosButtonClass(selected: boolean): string {
  return `${GKS_BTN_SHAPE} ${selected ? GKS_POS_BTN_SELECTED : GKS_POS_BTN}`
}
