/**
 * Productie-kassa POS-knoppenstijl (gunmetal gradient).
 * Geen import uit `gks-kassa/` — GKS-pilot blijft op preview-branch.
 */

/** Korrelgrijs — header, zijbalk, kader (zie `globals.css`). */
export const KASSA_POS_MENU_PLATE_SHELL_BG_CLASS = 'gks-menu-plate-grain'

/** Effen grijs tegelvlak — ingesprongen t.o.v. korrelkader. */

export const KASSA_POS_MENU_TRANSPARENT_CLASS = 'bg-transparent'

export const KASSA_POS_MENU_RECESS_TRAY_CLASS = 'gks-menu-recess-tray'

export const KASSA_POS_RULE_BLACK = 'border-black'

export const KASSA_POS_BTN_SHAPE = 'rounded-xl'

export const KASSA_POS_SELECTED_ACCENT_TEXT = 'text-[#5a9fd4]'

export const KASSA_POS_SELECTED_TOP_RIM = 'border-t-[#7a9ab8]/28'

const KASSA_BTN_FACE =
  'bg-[linear-gradient(180deg,#161616_0%,#323232_46%,#1c1c1c_100%)]'

export const KASSA_POS_SUBTLE_LIFT_SHADOW =
  'shadow-[0_4px_9px_rgba(0,0,0,0.61),0_11px_24px_rgba(0,0,0,0.46),-6px_0_14px_rgba(0,0,0,0.38),6px_0_14px_rgba(0,0,0,0.38)]'

export const KASSA_POS_SELECTED_LIFT_SHADOW =
  'shadow-[0_4px_9px_rgba(0,0,0,0.64),0_11px_26px_rgba(0,0,0,0.51),0_15px_37px_rgba(0,0,0,0.40),-7px_0_16px_rgba(0,0,0,0.40),7px_0_16px_rgba(0,0,0,0.40),0_7px_28px_rgba(26,127,216,0.50),0_0_26px_rgba(110,181,255,0.38),0_0_14px_rgba(110,181,255,0.44)]'

const KASSA_BTN_EDGE = `border border-[#2a2a2a] ${KASSA_POS_SUBTLE_LIFT_SHADOW}`

export const KASSA_POS_BTN_PRESS = [
  'transition-[transform,box-shadow,filter,background] duration-100 ease-out',
  'active:translate-y-[2px]',
  'active:shadow-[inset_0_3px_8px_rgba(0,0,0,0.62),inset_0_1px_2px_rgba(0,0,0,0.38)]',
  'active:brightness-[0.9]',
  'active:border-[#1a1a1a]',
].join(' ')

const KASSA_BTN_PRESS_FACE =
  'active:bg-[linear-gradient(180deg,#0e0e0e_0%,#242424_52%,#101010_100%)]'

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
  KASSA_BTN_FACE,
  'border border-[#2a2a2a]',
  KASSA_POS_SELECTED_TOP_RIM,
  KASSA_POS_SELECTED_LIFT_SHADOW,
  KASSA_POS_BTN_PRESS,
  KASSA_BTN_PRESS_FACE,
  KASSA_POS_SELECTED_ACCENT_TEXT,
].join(' ')

export const KASSA_POS_CHECKOUT_LIFT_SHADOW =
  'shadow-[0_4px_9px_rgba(0,0,0,0.64),0_11px_26px_rgba(0,0,0,0.51),0_15px_37px_rgba(0,0,0,0.40),-7px_0_16px_rgba(0,0,0,0.40),7px_0_16px_rgba(0,0,0,0.40),0_6px_22px_rgba(26,127,216,0.36),0_0_18px_rgba(110,181,255,0.24),0_0_10px_rgba(110,181,255,0.28)]'

export const KASSA_POS_CHECKOUT_BTN = [
  KASSA_POS_BTN_SHAPE,
  KASSA_BTN_FACE,
  'border border-[#2a2a2a]',
  KASSA_POS_SELECTED_TOP_RIM,
  KASSA_POS_CHECKOUT_LIFT_SHADOW,
  KASSA_POS_BTN_PRESS,
  KASSA_BTN_PRESS_FACE,
  KASSA_POS_SELECTED_ACCENT_TEXT,
  KASSA_POS_BTN_ARIA_DISABLED,
  'aria-disabled:text-[#5a9fd4]',
  'touch-manipulation',
  'font-bold',
].join(' ')

export const KASSA_POS_QUICK_MENU_LIFT_SHADOW =
  'shadow-[0_4px_9px_rgba(0,0,0,0.61),0_11px_24px_rgba(0,0,0,0.46),0_0_14px_rgba(110,181,255,0.26),0_0_22px_rgba(26,127,216,0.20),0_0_8px_rgba(110,181,255,0.30)]'

/** Snelmenu-balk: zwarte POS-knop met blauwe gloed achter elk tegel. */
export function kassaPosQuickMenuPanelButtonClass(): string {
  return [
    KASSA_POS_BTN_SHAPE,
    KASSA_BTN_FACE,
    'border border-[#2a2a2a]',
    KASSA_POS_QUICK_MENU_LIFT_SHADOW,
    KASSA_POS_BTN_PRESS,
    KASSA_BTN_PRESS_FACE,
    KASSA_POS_BTN_DISABLED_SAME_LOOK,
    'text-[#f0f0f0] disabled:text-[#f0f0f0]',
  ].join(' ')
}

export function kassaPosButtonClass(selected: boolean): string {
  return `${KASSA_POS_BTN_SHAPE} ${selected ? KASSA_POS_BTN_SELECTED : KASSA_POS_BTN}`
}

export function kassaPosRaisedStripClass(): string {
  return kassaPosButtonClass(false)
}

export const KASSA_CLOCK_TILE_ON_BAR = [
  KASSA_POS_BTN_SHAPE,
  KASSA_BTN_FACE,
  'relative z-[2]',
  'border border-[#3d3d3d] border-t-[#4a4a4a]/80',
  'shadow-[0_1px_0_rgba(255,255,255,0.14),0_3px_8px_rgba(0,0,0,0.38),0_8px_16px_rgba(0,0,0,0.28)]',
  KASSA_POS_BTN_PRESS,
  KASSA_BTN_PRESS_FACE,
].join(' ')

export const KASSA_POS_FIELD = [
  KASSA_POS_BTN_SHAPE,
  KASSA_BTN_FACE,
  'border border-[#2a2a2a]',
  KASSA_POS_SUBTLE_LIFT_SHADOW,
].join(' ')

/** Mandregel — gestapelde kaart op korrel/zijbalk. */
export const KASSA_POS_CART_ROW = [
  KASSA_POS_BTN_SHAPE,
  'bg-[linear-gradient(180deg,#1c1c1c_0%,#101010_48%,#060606_100%)]',
  'border border-[#2a2a2a]',
  'shadow-[0_3px_8px_rgba(0,0,0,0.52),0_10px_22px_rgba(0,0,0,0.44),0_1px_0_rgba(255,255,255,0.06)_inset]',
  'p-2 flex items-center gap-2',
].join(' ')

export const KASSA_POS_CART_THUMB_SHELL =
  'rounded-lg border border-[#3a3a3a] bg-[#252528] overflow-hidden shrink-0'

export function kassaPosCartQtyButtonClass(compact?: boolean): string {
  const size = compact ? 'h-7 w-7 min-h-7 min-w-7 text-sm' : 'h-8 w-8 min-h-8 min-w-8 text-base'
  return `${kassaPosButtonClass(false)} ${size} shrink-0 flex items-center justify-center leading-none`
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
  'bg-[linear-gradient(180deg,#3a3a3e_0%,#2c2c30_48%,#232327_100%)]'

/** Categorie-/producttegel — luxe donkere kaart op korrelvlak. */
export const KASSA_POS_MENU_TILE_BUTTON_BASE = [
  'touch-manipulation select-none group relative flex min-h-0 w-full min-w-0 flex-col overflow-hidden text-left',
  KASSA_POS_BTN_SHAPE,
  KASSA_MENU_TILE_FACE,
  'border border-[#3d3d3d] border-t-[#5c5c62]/40',
  KASSA_POS_SUBTLE_LIFT_SHADOW,
  'transition-[transform,box-shadow,filter] duration-150 ease-out',
  'hover:brightness-[1.04]',
  'hover:shadow-[0_6px_14px_rgba(0,0,0,0.58),0_0_14px_rgba(110,181,255,0.14)]',
  'active:translate-y-[1px] active:brightness-[0.93]',
].join(' ')

/** Fotovlak rand-tot-rand; wit zodat `object-contain` geen grijze letterbox toont. */
export const KASSA_POS_MENU_TILE_IMAGE_WELL =
  'pointer-events-none relative min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-white'

export const KASSA_POS_MENU_TILE_IMAGE_WELL_SXGA =
  'pointer-events-none relative w-full shrink-0 flex-none aspect-square overflow-hidden bg-white'

export const KASSA_POS_MENU_TILE_IMG_CLASS =
  'pointer-events-none absolute inset-0 box-border h-full w-full select-none object-contain object-center'

export const KASSA_POS_MENU_TILE_IMG_FRAME =
  'pointer-events-none relative h-full w-full min-h-0 min-w-0 overflow-hidden bg-white'

export const KASSA_POS_MENU_TILE_PLACEHOLDER_WELL =
  'pointer-events-none flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden bg-[#1a1a1e] px-2 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]'

export const KASSA_POS_MENU_TILE_PLACEHOLDER_WELL_SXGA =
  'pointer-events-none flex w-full shrink-0 flex-none flex-col items-center justify-center overflow-hidden bg-[#1a1a1e] px-2 aspect-square shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]'

export const KASSA_POS_MENU_TILE_LABEL_WRAP =
  'pointer-events-none shrink-0 w-full border-t border-[#45454a]/80 bg-[linear-gradient(180deg,#343438_0%,#2a2a2e_100%)] px-2 pb-2 pt-1.5 sm:px-3'

export const KASSA_POS_MENU_TILE_LABEL_WRAP_SXGA =
  'pointer-events-none shrink-0 w-full border-t border-[#45454a]/80 bg-[linear-gradient(180deg,#343438_0%,#2a2a2e_100%)] px-2 pb-1.5 pt-0 mt-0 sm:px-3 sm:pb-2 sm:pt-0'

export const KASSA_POS_MENU_TILE_LABEL_CLASS =
  'm-0 line-clamp-2 text-center text-base font-bold leading-snug tracking-[0.03em] text-[#f2f2f2] sm:text-lg md:text-xl'

export const KASSA_POS_MENU_TILE_LABEL_CLASS_SXGA =
  'm-0 line-clamp-2 text-center text-[15px] font-bold leading-snug tracking-[0.03em] text-[#f2f2f2] sm:text-base'

export const KASSA_POS_MENU_TILE_QTY_BADGE = [
  'absolute top-1.5 right-1.5 z-20 flex h-7 w-7 items-center justify-center text-xs font-bold',
  KASSA_POS_BTN_SHAPE,
  KASSA_BTN_FACE,
  'border border-[#3d3d3d]',
  KASSA_POS_SUBTLE_LIFT_SHADOW,
  KASSA_POS_SELECTED_ACCENT_TEXT,
].join(' ')

export const KASSA_POS_MENU_TILE_OPTS_BADGE = [
  'absolute top-1.5 left-1.5 z-20 px-1.5 py-0.5 text-[10px] font-bold text-[#e8e8e8]',
  KASSA_POS_BTN_SHAPE,
  KASSA_BTN_FACE,
  'border border-[#3d3d3d]',
  KASSA_POS_SUBTLE_LIFT_SHADOW,
].join(' ')

/** Klok+databalk in zijbalk — bewust iets groter dan overige knoppen. */
export const KASSA_SIDEBAR_CLOCK_DATE_LABEL =
  'text-xs font-semibold leading-tight tracking-tight sm:text-sm'
