/**
 * GKS-pilot: POS-ref — zwart-grijs, lichte verticale overgang, subtiele schaduw (niet overdreven).
 */

/** Groot vlak achter categorie-/producttegels (POS-plate). */
export const GKS_MENU_PLATE_BG = '#2c2c2e'
export const GKS_MENU_PLATE_BG_CLASS = 'bg-[#2c2c2e]'

/** Bijna recht, heel licht afgerond. */
export const GKS_BTN_SHAPE = 'rounded-[3px]'

/** Zachte “bollig”: donker boven/onder, iets lichter midden — geen harde radiale flare. */
const GKS_BTN_FACE =
  'bg-[linear-gradient(180deg,#2b2b2b_0%,#4a4a4a_46%,#323232_100%)]'

const GKS_BTN_FACE_SELECTED =
  'bg-[linear-gradient(180deg,#353535_0%,#585858_46%,#3d3d3d_100%)]'

/** Dunne rand + lichte drop shadow (referentie-POS). */
const GKS_BTN_EDGE =
  'border border-[#3a3a3a] shadow-[0_2px_3px_rgba(0,0,0,0.35)]'

/** Standaard knop. */
export const GKS_POS_BTN = [
  GKS_BTN_FACE,
  GKS_BTN_EDGE,
  'text-[#f0f0f0]',
  'active:brightness-[0.96]',
].join(' ')

/** Geselecteerde knop. */
export const GKS_POS_BTN_SELECTED = [
  GKS_BTN_FACE_SELECTED,
  GKS_BTN_EDGE,
  'text-white',
  'active:brightness-[0.96]',
].join(' ')

/** Primaire actie (Afrekenen, actieve categorie). */
export const GKS_ACCENT_BTN = [
  GKS_BTN_SHAPE,
  'bg-[linear-gradient(180deg,#1a5fc4_0%,#0056d6_55%,#003d99_100%)]',
  'text-white',
  'border border-[#002d6b]',
  'shadow-[0_2px_4px_rgba(0,0,0,0.4)]',
  'active:brightness-[0.96]',
].join(' ')

/** Displayveld (totaal, numpad) — iets ingevallen, rustig. */
export const GKS_POS_FIELD = [
  GKS_BTN_SHAPE,
  'bg-[linear-gradient(180deg,#3a3a3a_0%,#222222_100%)]',
  'border border-[#2a2a2a]',
  'shadow-[inset_0_2px_5px_rgba(0,0,0,0.45)]',
].join(' ')

/** Onderstrook menu-tegel. */
export const GKS_MENU_TILE_LABEL_SURFACE =
  'bg-[linear-gradient(180deg,#404040_0%,#2a2a2a_100%)]'

export function gksPosButtonClass(selected: boolean): string {
  return `${GKS_BTN_SHAPE} ${selected ? GKS_POS_BTN_SELECTED : GKS_POS_BTN}`
}
