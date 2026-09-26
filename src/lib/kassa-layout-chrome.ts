import {
  kassaUiLayoutUsesPosLuxury,
  type KassaUiLayoutId,
} from '@/lib/kassa-ui-layout'
import {
  KASSA_POS_MENU_RECESS_TRAY_CLASS,
  KASSA_POS_QUICK_MENU_LIFT_SHADOW,
  KASSA_SPEELS_MENU_PLATE_SHELL_BG_CLASS,
  KASSA_SPEELS_MENU_RECESS_TRAY_CLASS,
  kassaPosCheckoutButtonClass,
  kassaPosRaisedStripClass,
  type KassaPosChromeLook,
} from '@/lib/kassa-pos-surface'

/**
 * Hover alleen bij een echte muis. Op iPad/touch is de eerste tik anders “hover”
 * en moet je nog eens drukken.
 */
const RETAIL_BTN_HOVER_LIFT = '[@media(hover:hover)]:hover:bg-[#686868]'
const RETAIL_BTN_HOVER_LIFT_ON = '[@media(hover:hover)]:hover:bg-[#7a7a7a]'

/** Retail-knoppen op donkere layouts: lichter grijs dan het espresso-vlak. Alleen winkelkassa. */
export const RETAIL_GRAY_BTN_FACE =
  `touch-manipulation [-webkit-tap-highlight-color:transparent] rounded-xl border border-[#6a6a6a] bg-[#5a5a5a] text-[#f3f3f3] shadow-[0_3px_8px_rgba(0,0,0,0.4)] active:bg-[#4e4e4e] ${RETAIL_BTN_HOVER_LIFT}`
export const RETAIL_GRAY_BTN_FACE_ON =
  `touch-manipulation [-webkit-tap-highlight-color:transparent] rounded-xl border border-[#8d8d8d] bg-[#707070] text-white shadow-[0_3px_8px_rgba(0,0,0,0.4)] ring-2 ring-white/65 active:bg-[#626262] ${RETAIL_BTN_HOVER_LIFT_ON}`

/** Retail Light: website-blauw (`--primary`). Horeca-kassa gebruikt deze constants niet. */
export const KASSA_LIGHT_BTN_FACE =
  'bg-[#3C4D6B] text-white [@media(hover:hover)]:hover:bg-[#2D3A52]'
export const KASSA_LIGHT_BTN_FACE_ON =
  'bg-[#3C4D6B] text-white ring-2 ring-white/75 ring-offset-2 ring-offset-[#e3e3e3]'
export const KASSA_CLASSIC_BTN_FACE =
  'bg-[#2d2d2d] text-white [@media(hover:hover)]:hover:bg-[#3a3a3a]'
export const KASSA_CLASSIC_BTN_FACE_ON =
  'bg-[#2d2d2d] text-white ring-2 ring-white/75 ring-offset-2 ring-offset-[#0f1319]'
export const KASSA_CLASSIC_ACTION_BTN_FACE = KASSA_CLASSIC_BTN_FACE
export const KASSA_CLASSIC_ACTION_BTN_FACE_ON = KASSA_CLASSIC_BTN_FACE_ON

export function kassaLayoutPosChrome(layout: KassaUiLayoutId): KassaPosChromeLook {
  return layout === 'speels' ? 'speels' : 'luxe'
}

export function kassaLayoutPlateBgClass(layout: KassaUiLayoutId): string {
  if (layout === 'speels') return KASSA_SPEELS_MENU_PLATE_SHELL_BG_CLASS
  if (layout === 'luxe') return 'bg-transparent'
  if (layout === 'light') return 'bg-[#e3e3e3]'
  return 'bg-[#0b0f14]'
}

export function kassaLayoutRecessTrayClass(layout: KassaUiLayoutId): string {
  if (layout === 'speels') return KASSA_SPEELS_MENU_RECESS_TRAY_CLASS
  if (layout === 'luxe') return `${KASSA_POS_MENU_RECESS_TRAY_CLASS} gks-menu-vignette`
  if (layout === 'light') return 'bg-[#d4d4d4]'
  return 'bg-[#151a21]'
}

export function kassaLayoutHeaderBarClass(layout: KassaUiLayoutId): string {
  if (kassaUiLayoutUsesPosLuxury(layout)) {
    return `pb-3 ${kassaLayoutPlateBgClass(layout)}`
  }
  return 'bg-black'
}

export function kassaLayoutChromeBtnClass(layout: KassaUiLayoutId, selected: boolean): string {
  if (layout === 'light') {
    return `rounded-xl ${selected ? KASSA_LIGHT_BTN_FACE_ON : KASSA_LIGHT_BTN_FACE}`
  }
  return selected ? RETAIL_GRAY_BTN_FACE_ON : RETAIL_GRAY_BTN_FACE
}

export function kassaLayoutQuickMenuTileClass(layout: KassaUiLayoutId): string {
  if (layout === 'light') {
    return `rounded-xl ${KASSA_LIGHT_BTN_FACE} ${KASSA_POS_QUICK_MENU_LIFT_SHADOW} hover:brightness-110 active:brightness-90`
  }
  return RETAIL_GRAY_BTN_FACE
}

export function kassaLayoutCheckoutBtnClass(layout: KassaUiLayoutId): string {
  if (kassaUiLayoutUsesPosLuxury(layout)) {
    return kassaPosCheckoutButtonClass(kassaLayoutPosChrome(layout))
  }
  return 'rounded-xl bg-emerald-500 font-bold text-white hover:bg-emerald-600 disabled:bg-emerald-900/45'
}

export function kassaLayoutTotalStripClass(layout: KassaUiLayoutId): string {
  if (kassaUiLayoutUsesPosLuxury(layout)) {
    return kassaPosRaisedStripClass(kassaLayoutPosChrome(layout))
  }
  if (layout === 'dark') return 'rounded-xl border border-zinc-600 bg-[#151a21]'
  return 'rounded-xl border border-gray-200 bg-gray-50'
}

export function kassaLayoutModePickerPanelBg(layout: KassaUiLayoutId): string {
  if (kassaUiLayoutUsesPosLuxury(layout)) return kassaLayoutPlateBgClass(layout)
  if (layout === 'light') return 'bg-white'
  return 'bg-[#151a21]'
}

export function kassaLayoutHamburgerMenuHeaderBg(layout: KassaUiLayoutId): string {
  if (kassaUiLayoutUsesPosLuxury(layout)) return kassaLayoutPlateBgClass(layout)
  return 'bg-[#1e293b]'
}

export function kassaLayoutHeaderQuickLinkClass(layout: KassaUiLayoutId): string {
  const shell =
    'inline-flex shrink-0 touch-manipulation items-center justify-center whitespace-nowrap font-semibold transition-colors min-h-[2.35rem] px-3 py-2 sm:min-h-[2.6rem] sm:px-3.5 sm:py-2.5'
  if (kassaUiLayoutUsesPosLuxury(layout) || layout === 'dark') {
    return `${shell} ${RETAIL_GRAY_BTN_FACE}`
  }
  if (layout === 'light') {
    return `${shell} rounded-xl font-bold ${KASSA_LIGHT_BTN_FACE}`
  }
  return `${shell} rounded-xl font-bold ${KASSA_CLASSIC_BTN_FACE}`
}

export function kassaLayoutHeaderUtilityClass(layout: KassaUiLayoutId, selected: boolean): string {
  const shell =
    'inline-flex shrink-0 touch-manipulation items-center justify-center whitespace-nowrap font-semibold transition-colors min-h-[2.35rem] px-3 py-2 sm:min-h-[2.6rem] sm:px-3.5 sm:py-2.5 gap-0.5 sm:gap-1'
  return `${shell} ${kassaLayoutChromeBtnClass(layout, selected)}`
}
