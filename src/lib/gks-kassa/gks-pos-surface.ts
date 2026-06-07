/**
 * GKS-pilot: POS-ref — zwart-grijs, lichte verticale overgang, subtiele schaduw (niet overdreven).
 */

/** Eén vlak: tegels + sidebar + header (geen kleurverschil tussen kolommen). */
export const GKS_MENU_PLATE_BG = '#333336'
export const GKS_MENU_PLATE_BG_CLASS = 'bg-[#333336]'

/** Subtiel afgerond — luxe POS, geen pill. */
export const GKS_BTN_SHAPE = 'rounded-[6px]'

/** Minder zwaar dan overal `font-bold`. */
export const GKS_FONT_UI = 'font-semibold'
export const GKS_FONT_UI_SOFT = 'font-medium'

/** Klokbalk: zelfde vlak, lichtere schaduw dan knoppen. */
export const GKS_CLOCK_BAR_SHADOW =
  'shadow-[0_1px_3px_rgba(0,0,0,0.16),0_3px_8px_rgba(0,0,0,0.1)]'

/** Zachte “bollig”: donker boven/onder, iets lichter midden — geen harde radiale flare. */
const GKS_BTN_FACE =
  'bg-[linear-gradient(180deg,#161616_0%,#323232_46%,#1c1c1c_100%)]'

const GKS_BTN_FACE_SELECTED =
  'bg-[linear-gradient(180deg,#1e1e1e_0%,#3a3a3a_46%,#242424_100%)]'

/** Subtiele diepte achter knoppen (dubbele zachte drop shadow). */
export const GKS_SUBTLE_LIFT_SHADOW =
  'shadow-[0_2px_4px_rgba(0,0,0,0.42),0_5px_12px_rgba(0,0,0,0.28)]'

/** Subtiele diepte achter menu-tegels — iets ruimer dan knoppen. */
export const GKS_TILE_LIFT_SHADOW =
  'shadow-[0_3px_6px_rgba(0,0,0,0.45),0_8px_18px_rgba(0,0,0,0.22)]'

const GKS_BTN_EDGE = `border border-[#2a2a2a] ${GKS_SUBTLE_LIFT_SHADOW}`

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

/**
 * Primaire actie (Afrekenen) — POS-ref “Kassa”: cyan boven → koningsblauw onder.
 */
export const GKS_ACCENT_BTN = [
  GKS_BTN_SHAPE,
  'bg-[linear-gradient(180deg,#7ad9ff_0%,#4fb8f0_32%,#1a7fd8_62%,#004aad_100%)]',
  'text-white',
  'border border-[#003878] border-t-[#9ee8ff]/35',
  'shadow-[0_2px_5px_rgba(0,0,0,0.4),0_6px_14px_rgba(0,30,80,0.25)]',
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
  'bg-[linear-gradient(180deg,#2e2e2e_0%,#1a1a1a_100%)]'

export const GKS_CLOCK_BAR = [
  GKS_BTN_SHAPE,
  GKS_BTN_FACE,
  'border border-[#2a2a2a]',
  GKS_CLOCK_BAR_SHADOW,
].join(' ')

export function gksPosButtonClass(selected: boolean): string {
  return `${GKS_BTN_SHAPE} ${selected ? GKS_POS_BTN_SELECTED : GKS_POS_BTN}`
}
