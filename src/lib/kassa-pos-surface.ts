/**
 * Productie-kassa POS-knoppenstijl (warm espresso + champagne).
 * Geen import uit `gks-kassa/`— GKS-pilot blijft op preview-branch.
 */

/** Korrelgrijs — header, zijbalk, kader (zie `globals.css`). */
export const KASSA_POS_MENU_PLATE_SHELL_BG_CLASS = 'gks-menu-plate-grain'

/** Luxe-kassa: html/body-klasse — geen leer op innerlijke vakken. */
export const KASSA_LUXE_HTML_CLASS = 'kassa-luxe-leather'

/** Luxe-kassa: één vast viewport-vlak (niet herhalen, niet per paneel). */
export const KASSA_LUXE_LEATHER_PLANE_CLASS = 'kassa-luxe-leather-plane'

/** Luxe-kassa: donkergrijze spikkel onder mandregels (tussen de zijbalkknoppen). */
export const KASSA_LUXE_CART_GRAIN_CLASS = 'kassa-luxe-cart-grain'

export const KASSA_SPEELS_MENU_PLATE_SHELL_BG_CLASS = 'kassa-speels-plate-grain'

export const KASSA_SPEELS_MENU_RECESS_TRAY_CLASS = 'kassa-speels-recess-tray'

/** Terras-plattegrond canvas — gedempt groen + korrel. */
export const KASSA_FLOOR_TERRACE_GRAIN_CLASS = 'gks-floor-terrace-grain'

/** Effen grijs tegelvlak — ingesprongen t.o.v. korrelkader. */

export const KASSA_POS_MENU_TRANSPARENT_CLASS = 'bg-transparent'

export const KASSA_POS_MENU_RECESS_TRAY_CLASS = 'gks-menu-recess-tray'

export const KASSA_POS_RULE_BLACK = 'border-black'

export const KASSA_POS_BTN_SHAPE = 'rounded-xl'

export const KASSA_POS_SELECTED_ACCENT_TEXT = 'text-[#1a1612]'

export const KASSA_POS_SELECTED_TOP_RIM = 'border-t-[#f0d9a8]/55'

export const KASSA_BTN_FACE =
  'bg-[linear-gradient(180deg,#1a1612_0%,#3a3228_46%,#1c1814_100%)]'

const KASSA_BTN_FACE_CHAMPAGNE =
  'bg-[linear-gradient(180deg,#e0c48a_0%,#c4a46a_48%,#a8884e_100%)]'

export const KASSA_POS_SUBTLE_LIFT_SHADOW =
  'shadow-[0_4px_9px_rgba(0,0,0,0.61),0_11px_24px_rgba(0,0,0,0.46),-6px_0_14px_rgba(0,0,0,0.38),6px_0_14px_rgba(0,0,0,0.38)]'

export const KASSA_POS_SELECTED_LIFT_SHADOW =
  'shadow-[0_4px_9px_rgba(0,0,0,0.64),0_11px_26px_rgba(0,0,0,0.51),0_15px_37px_rgba(0,0,0,0.40),-7px_0_16px_rgba(0,0,0,0.40),7px_0_16px_rgba(0,0,0,0.40),0_7px_28px_rgba(196,164,106,0.38),0_0_22px_rgba(212,180,131,0.28),0_0_12px_rgba(212,180,131,0.32)]'

const KASSA_BTN_EDGE = `border border-[#3d352c] ${KASSA_POS_SUBTLE_LIFT_SHADOW}`

const KASSA_LUXE_BTN_PRESS = [
  'transition-[transform,box-shadow,filter,background] duration-100 ease-out',
  'active:translate-y-[2px]',
  'active:shadow-[inset_0_3px_8px_rgba(0,0,0,0.62),inset_0_1px_2px_rgba(0,0,0,0.38)]',
  'active:brightness-[0.9]',
  'active:border-[#c4a46a]',
].join(' ')

export const KASSA_POS_BTN_PRESS = [
  'transition-[transform,box-shadow,filter,background] duration-100 ease-out',
  'active:translate-y-[2px]',
  'active:shadow-[inset_0_3px_8px_rgba(0,0,0,0.62),inset_0_1px_2px_rgba(0,0,0,0.38)]',
  'active:brightness-[0.9]',
  'active:border-[#14110e]',
].join(' ')

const KASSA_BTN_PRESS_FACE =
  'active:bg-[linear-gradient(180deg,#120f0c_0%,#2a241c_52%,#14110e_100%)]'

export const KASSA_POS_BTN_DISABLED_SAME_LOOK =
  'disabled:opacity-100 disabled:cursor-not-allowed disabled:pointer-events-none'

export const KASSA_POS_BTN_ARIA_DISABLED = 'aria-disabled:cursor-not-allowed'

export const KASSA_POS_BTN = [
  KASSA_BTN_FACE,
  KASSA_BTN_EDGE,
  KASSA_POS_BTN_PRESS,
  KASSA_BTN_PRESS_FACE,
  KASSA_POS_BTN_DISABLED_SAME_LOOK,
  'text-[#f0f0f0] disabled:text-[#f0f0f0]',
].join(' ')

export const KASSA_POS_BTN_LUXE = [
  KASSA_BTN_FACE,
  KASSA_BTN_EDGE,
  KASSA_POS_BTN_PRESS,
  KASSA_BTN_PRESS_FACE,
  KASSA_POS_BTN_DISABLED_SAME_LOOK,
  'text-[#f0f0f0] disabled:text-[#f0f0f0]',
].join(' ')

/** Numpad-toetsen — zelfde lift/schaduw als overige POS-knoppen. */
export const KASSA_POS_NUMPAD_KEY = [
  KASSA_POS_BTN_SHAPE,
  KASSA_BTN_FACE,
  KASSA_BTN_EDGE,
  KASSA_POS_BTN_PRESS,
  KASSA_BTN_PRESS_FACE,
  'text-[#f0f0f0]',
  'font-bold text-xl',
  'touch-manipulation select-none',
  'min-h-[2.75rem]',
].join(' ')

/** Numpad-paneel: omhoog schuiven i.p.v. direct tonen. */
export const KASSA_NUMPAD_PANEL_SLIDE_MOTION =
  'transition-transform duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform'

export const KASSA_NUMPAD_CART_RECESS_MOTION =
  'transition-[opacity,transform] duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)]'

export const KASSA_POS_BTN_SELECTED = [
  KASSA_BTN_FACE_CHAMPAGNE,
  'border border-[#c4a46a]',
  KASSA_POS_SELECTED_TOP_RIM,
  KASSA_POS_SELECTED_LIFT_SHADOW,
  KASSA_POS_BTN_PRESS,
  'active:bg-[linear-gradient(180deg,#c4a46a_0%,#a8884e_52%,#8f7344_100%)]',
  KASSA_POS_SELECTED_ACCENT_TEXT,
  'font-semibold',
].join(' ')

export const KASSA_POS_CHECKOUT_LIFT_SHADOW =
  'shadow-[0_4px_9px_rgba(0,0,0,0.64),0_11px_26px_rgba(0,0,0,0.51),0_15px_37px_rgba(0,0,0,0.40),-7px_0_16px_rgba(0,0,0,0.40),7px_0_16px_rgba(0,0,0,0.40),0_6px_22px_rgba(196,164,106,0.32),0_0_16px_rgba(212,180,131,0.22),0_0_8px_rgba(212,180,131,0.26)]'

export const KASSA_POS_CHECKOUT_BTN = [
  KASSA_POS_BTN_SHAPE,
  KASSA_BTN_FACE_CHAMPAGNE,
  'border border-[#c4a46a]',
  KASSA_POS_SELECTED_TOP_RIM,
  KASSA_POS_CHECKOUT_LIFT_SHADOW,
  KASSA_POS_BTN_PRESS,
  'active:bg-[linear-gradient(180deg,#c4a46a_0%,#a8884e_52%,#8f7344_100%)]',
  KASSA_POS_SELECTED_ACCENT_TEXT,
  KASSA_POS_BTN_ARIA_DISABLED,
  'aria-disabled:text-[#1a1612]',
  'touch-manipulation',
  'font-bold',
].join(' ')

export const KASSA_POS_QUICK_MENU_LIFT_SHADOW =
  'shadow-[0_4px_9px_rgba(0,0,0,0.61),0_11px_24px_rgba(0,0,0,0.46),0_0_14px_rgba(212,180,131,0.22),0_0_20px_rgba(196,164,106,0.16),0_0_8px_rgba(212,180,131,0.24)]'

/** Snelmenu-balk: POS-knop met champagne-gloed achter elk tegel. */
export function kassaPosQuickMenuPanelButtonClass(look: KassaPosChromeLook = 'luxe'): string {
  return [
    KASSA_POS_BTN_SHAPE,
    KASSA_BTN_FACE,
    look === 'speels' ? 'border border-[#3d352c]' : 'border border-[#d4b483]',
    KASSA_POS_QUICK_MENU_LIFT_SHADOW,
    look === 'speels' ? KASSA_POS_BTN_PRESS : KASSA_LUXE_BTN_PRESS,
    KASSA_BTN_PRESS_FACE,
    KASSA_POS_BTN_DISABLED_SAME_LOOK,
    'text-[#f0f0f0] disabled:text-[#f0f0f0]',
  ].join(' ')
}

export type KassaPosChromeLook = 'luxe' | 'speels'

/** Speels: alleen de bruine (champagne) knoppen — zwart + zilveren rand. */
const KASSA_SPEELS_BROWN_BTN_FACE =
  'bg-[linear-gradient(180deg,#141414_0%,#1f1f1f_46%,#0a0a0a_100%)]'

const KASSA_SPEELS_BROWN_BTN_PRESS_FACE =
  'active:bg-[linear-gradient(180deg,#0a0a0a_0%,#171717_52%,#050505_100%)]'

const KASSA_SPEELS_SILVER_BORDER = 'border border-[#c8c8c8] border-t-[#ececec]'

const KASSA_SPEELS_SELECTED_LIFT_SHADOW =
  'shadow-[0_4px_9px_rgba(0,0,0,0.64),0_11px_26px_rgba(0,0,0,0.51),0_0_18px_rgba(200,200,208,0.28),0_0_10px_rgba(220,220,228,0.22)]'

export const KASSA_SPEELS_BTN_SELECTED = [
  KASSA_SPEELS_BROWN_BTN_FACE,
  KASSA_SPEELS_SILVER_BORDER,
  KASSA_SPEELS_SELECTED_LIFT_SHADOW,
  KASSA_POS_BTN_PRESS,
  KASSA_SPEELS_BROWN_BTN_PRESS_FACE,
  'text-[#f5f5f5]',
  'font-semibold',
].join(' ')

export const KASSA_SPEELS_CHECKOUT_BTN = [
  KASSA_POS_BTN_SHAPE,
  KASSA_SPEELS_BROWN_BTN_FACE,
  KASSA_SPEELS_SILVER_BORDER,
  KASSA_SPEELS_SELECTED_LIFT_SHADOW,
  KASSA_POS_BTN_PRESS,
  KASSA_SPEELS_BROWN_BTN_PRESS_FACE,
  'text-[#f5f5f5]',
  KASSA_POS_BTN_ARIA_DISABLED,
  'aria-disabled:text-[#f5f5f5]',
  'touch-manipulation',
  'font-bold',
].join(' ')

export function kassaPosButtonClass(selected: boolean, look: KassaPosChromeLook = 'luxe'): string {
  if (look === 'speels' && selected) {
    return `${KASSA_POS_BTN_SHAPE} ${KASSA_SPEELS_BTN_SELECTED}`
  }
  if (look === 'speels') {
    return `${KASSA_POS_BTN_SHAPE} ${KASSA_POS_BTN}`
  }
  return `${KASSA_POS_BTN_SHAPE} ${selected ? KASSA_POS_BTN_SELECTED : KASSA_POS_BTN_LUXE}`
}

export function kassaPosCheckoutButtonClass(look: KassaPosChromeLook = 'luxe'): string {
  return look === 'speels' ? KASSA_SPEELS_CHECKOUT_BTN : KASSA_POS_CHECKOUT_BTN
}

export function kassaPosRaisedStripClass(look: KassaPosChromeLook = 'luxe'): string {
  return kassaPosButtonClass(false, look)
}

export const KASSA_CLOCK_TILE_ON_BAR = [
  KASSA_POS_BTN_SHAPE,
  KASSA_BTN_FACE,
  'relative z-[2]',
  'border border-[#3d352c] border-t-[#d4b483]/25',
  'shadow-[0_1px_0_rgba(255,255,255,0.14),0_3px_8px_rgba(0,0,0,0.38),0_8px_16px_rgba(0,0,0,0.28)]',
  KASSA_POS_BTN_PRESS,
  KASSA_BTN_PRESS_FACE,
].join(' ')

export const KASSA_POS_FIELD = [
  KASSA_POS_BTN_SHAPE,
  KASSA_BTN_FACE,
  'border border-[#3d352c]',
  KASSA_POS_SUBTLE_LIFT_SHADOW,
].join(' ')

/** Mandregel — gestapelde kaart op korrel/zijbalk. */
export const KASSA_POS_CART_ROW = [
  KASSA_POS_BTN_SHAPE,
  'bg-[linear-gradient(180deg,#2a241c_0%,#1a1612_48%,#120f0c_100%)]',
  'border border-[#3d352c]',
  'shadow-[0_3px_8px_rgba(0,0,0,0.52),0_10px_22px_rgba(0,0,0,0.44),0_1px_0_rgba(255,255,255,0.06)_inset]',
  'p-2 flex items-center gap-2',
].join(' ')

export const KASSA_POS_CART_THUMB_SHELL =
  'rounded-lg border border-[#3d352c] bg-[#2a241c] overflow-hidden shrink-0'

export function kassaPosCartQtyButtonClass(compact?: boolean, look: KassaPosChromeLook = 'luxe'): string {
  const size = compact ? 'h-7 w-7 min-h-7 min-w-7 text-sm': 'h-8 w-8 min-h-8 min-w-8 text-base'
  return `${kassaPosButtonClass(false, look)} ${size} shrink-0 flex items-center justify-center leading-none`
}

export function kassaClockBarClass(): string {
  return `${kassaPosButtonClass(false)} relative z-0`
}

/** Zijbalk-footer — Lade/Bon/Verwijder, besteltype, Num pad (niet Afrekenen). */
export const KASSA_SIDEBAR_FOOTER_BTN_LABEL =
  'text-sm font-medium leading-tight tracking-[0.03em] sm:text-[15px]'

/** Zelfde breedte: Snel menu (boven) en Num pad (onder). */
export const KASSA_SIDEBAR_FOOTER_LEFT_COL =
  'w-[7.65rem] min-w-[7.65rem] max-w-[7.65rem] shrink-0'

/** Binnen / Terras zoneknoppen. */
export const KASSA_POS_ZONE_BTN_LABEL =
  'text-sm font-medium tracking-[0.03em] sm:text-[15px]'

const KASSA_MENU_TILE_FACE =
  'bg-[linear-gradient(180deg,#3a3228_0%,#2a241c_48%,#1c1814_100%)]'

/** Categorie-/producttegel — luxe donkere kaart op korrelvlak. */
export const KASSA_POS_MENU_TILE_BUTTON_BASE = [
  'touch-manipulation select-none group relative flex min-h-0 w-full min-w-0 flex-col overflow-hidden text-left',
  KASSA_POS_BTN_SHAPE,
  KASSA_MENU_TILE_FACE,
  'border border-[#3d352c] border-t-[#d4b483]/28',
  KASSA_POS_SUBTLE_LIFT_SHADOW,
  'transition-[transform,box-shadow,filter] duration-150 ease-out',
  'hover:brightness-[1.04]',
  'hover:shadow-[0_6px_14px_rgba(0,0,0,0.58),0_0_14px_rgba(212,180,131,0.16)]',
  'active:translate-y-[1px] active:brightness-[0.93]',
].join(' ')

/** Fotovlak — studio-vignette zoals de afgesproken look: licht midden, donker naar de randen. */
const KASSA_POS_MENU_TILE_STUDIO_BG =
  'bg-[radial-gradient(ellipse_at_50%_42%,#d4c8b4_0%,#b5a894_36%,#8a7d6c_62%,#4a4238_88%,#2a241c_100%)]'

export const KASSA_POS_MENU_TILE_IMAGE_WELL =
  `pointer-events-none relative min-h-0 w-full min-w-0 flex-1 overflow-hidden ${KASSA_POS_MENU_TILE_STUDIO_BG}`

export const KASSA_POS_MENU_TILE_IMAGE_WELL_SXGA =
  `pointer-events-none relative w-full shrink-0 flex-none aspect-square overflow-hidden ${KASSA_POS_MENU_TILE_STUDIO_BG}`

export const KASSA_POS_MENU_TILE_IMG_CLASS =
  'pointer-events-none absolute inset-0 box-border h-full w-full select-none object-contain object-center mix-blend-multiply'

export const KASSA_POS_MENU_TILE_IMG_FRAME =
  `pointer-events-none relative z-0 h-full w-full min-h-0 min-w-0 overflow-hidden ${KASSA_POS_MENU_TILE_STUDIO_BG}`

/** Vignette over de foto (niet over titel): midden open, randen donker. */
export const KASSA_POS_MENU_TILE_IMAGE_FILM =
  'pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_50%_42%,transparent_0%,transparent_62%,rgba(22,19,16,0.12)_88%,rgba(16,13,10,0.22)_100%)]'

/** Speels: zelfde tegel, veel minder cream-shimmer. */
const KASSA_SPEELS_MENU_TILE_STUDIO_BG =
  'bg-[radial-gradient(ellipse_at_50%_42%,#f7f7f7_0%,#e6e6e6_38%,#c8c8c8_68%,#9a9a9a_100%)]'

export const KASSA_SPEELS_MENU_TILE_IMAGE_WELL =
  `pointer-events-none relative min-h-0 w-full min-w-0 flex-1 overflow-hidden ${KASSA_SPEELS_MENU_TILE_STUDIO_BG}`

export const KASSA_SPEELS_MENU_TILE_IMAGE_WELL_SXGA =
  `pointer-events-none relative w-full shrink-0 flex-none aspect-square overflow-hidden ${KASSA_SPEELS_MENU_TILE_STUDIO_BG}`

export const KASSA_SPEELS_MENU_TILE_IMG_FRAME =
  `pointer-events-none relative z-0 h-full w-full min-h-0 min-w-0 overflow-hidden ${KASSA_SPEELS_MENU_TILE_STUDIO_BG}`

export const KASSA_SPEELS_MENU_TILE_PLACEHOLDER_WELL =
  `pointer-events-none flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden px-2 ${KASSA_SPEELS_MENU_TILE_STUDIO_BG}`

export const KASSA_SPEELS_MENU_TILE_PLACEHOLDER_WELL_SXGA =
  `pointer-events-none flex w-full shrink-0 flex-none flex-col items-center justify-center overflow-hidden px-2 aspect-square ${KASSA_SPEELS_MENU_TILE_STUDIO_BG}`

export const KASSA_SPEELS_MENU_TILE_IMAGE_FILM =
  'pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_50%_42%,transparent_0%,transparent_70%,rgba(0,0,0,0.08)_100%)]'

export const KASSA_POS_MENU_TILE_PLACEHOLDER_WELL =
  `pointer-events-none flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden px-2 ${KASSA_POS_MENU_TILE_STUDIO_BG}`

export const KASSA_POS_MENU_TILE_PLACEHOLDER_WELL_SXGA =
  `pointer-events-none flex w-full shrink-0 flex-none flex-col items-center justify-center overflow-hidden px-2 aspect-square ${KASSA_POS_MENU_TILE_STUDIO_BG}`

export const KASSA_POS_MENU_TILE_LABEL_WRAP =
  'pointer-events-none shrink-0 w-full border-t border-black bg-black px-2 pb-2 pt-1.5 sm:px-3'

export const KASSA_POS_MENU_TILE_LABEL_WRAP_SXGA =
  'pointer-events-none shrink-0 w-full border-t border-black bg-black px-2 pb-1.5 pt-0 mt-0 sm:px-3 sm:pb-2 sm:pt-0'

/** Speels: titelstrook dezelfde bruine knopkleur als snelmenu (afb. 2). */
export const KASSA_SPEELS_MENU_TILE_LABEL_WRAP =
  `pointer-events-none shrink-0 w-full border-t border-[#3d352c] ${KASSA_BTN_FACE} px-2 pb-2 pt-1.5 sm:px-3`

export const KASSA_SPEELS_MENU_TILE_LABEL_WRAP_SXGA =
  `pointer-events-none shrink-0 w-full border-t border-[#3d352c] ${KASSA_BTN_FACE} px-2 pb-1.5 pt-0 mt-0 sm:px-3 sm:pb-2 sm:pt-0`

export const KASSA_POS_MENU_TILE_LABEL_CLASS =
  'm-0 line-clamp-1 text-center text-sm font-bold leading-tight tracking-[0.02em] text-white sm:text-[15px] md:text-base'

export const KASSA_POS_MENU_TILE_LABEL_CLASS_SXGA =
  'm-0 line-clamp-1 text-center text-xs font-bold leading-tight tracking-[0.02em] text-white sm:text-[13px]'

export const KASSA_POS_MENU_TILE_QTY_BADGE = [
  'absolute top-1.5 right-1.5 z-20 flex h-7 w-7 items-center justify-center text-xs font-bold',
  KASSA_POS_BTN_SHAPE,
  KASSA_BTN_FACE,
  'border border-[#3d352c]',
  KASSA_POS_SUBTLE_LIFT_SHADOW,
  KASSA_POS_SELECTED_ACCENT_TEXT,
].join(' ')

export const KASSA_POS_MENU_TILE_OPTS_BADGE = [
  'absolute top-1.5 left-1.5 z-20 px-1.5 py-0.5 text-[10px] font-bold text-[#e8e8e8]',
  KASSA_POS_BTN_SHAPE,
  KASSA_BTN_FACE,
  'border border-[#3d352c]',
  KASSA_POS_SUBTLE_LIFT_SHADOW,
].join(' ')

/** Klok+databalk in zijbalk — bewust iets groter dan overige knoppen. */
export const KASSA_SIDEBAR_CLOCK_DATE_LABEL =
  'text-xs font-semibold leading-tight tracking-tight sm:text-sm'
