import {
  kassaUiLayoutUsesPosLuxury,
  type KassaUiLayoutId,
} from '@/lib/kassa-ui-layout'
import {
  KASSA_POS_MENU_RECESS_TRAY_CLASS,
  KASSA_POS_QUICK_MENU_LIFT_SHADOW,
  KASSA_SPEELS_MENU_PLATE_SHELL_BG_CLASS,
  KASSA_SPEELS_MENU_RECESS_TRAY_CLASS,
  kassaPosButtonClass,
  kassaPosCheckoutButtonClass,
  kassaPosQuickMenuPanelButtonClass,
  kassaPosRaisedStripClass,
  type KassaPosChromeLook,
} from '@/lib/kassa-pos-surface'

/** Zelfde knopvlakken als de gewone kassa (Light / Klassiek). */
export const KASSA_LIGHT_BTN_FACE = 'bg-[#4a4a4a] text-white hover:bg-[#5a5a5a]'
export const KASSA_LIGHT_BTN_FACE_ON =
  'bg-[#4a4a4a] text-white ring-2 ring-white/75 ring-offset-2 ring-offset-[#e3e3e3]'
export const KASSA_CLASSIC_BTN_FACE = 'bg-[#2d2d2d] text-white hover:bg-[#3a3a3a]'
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
  if (kassaUiLayoutUsesPosLuxury(layout)) {
    return kassaPosButtonClass(selected, kassaLayoutPosChrome(layout))
  }
  if (layout === 'light') {
    return `rounded-xl ${selected ? KASSA_LIGHT_BTN_FACE_ON : KASSA_LIGHT_BTN_FACE}`
  }
  return `rounded-xl ${selected ? KASSA_CLASSIC_BTN_FACE_ON : KASSA_CLASSIC_BTN_FACE}`
}

export function kassaLayoutQuickMenuTileClass(layout: KassaUiLayoutId): string {
  if (kassaUiLayoutUsesPosLuxury(layout)) {
    return kassaPosQuickMenuPanelButtonClass(kassaLayoutPosChrome(layout))
  }
  if (layout === 'dark') {
    return `rounded-xl ${KASSA_CLASSIC_ACTION_BTN_FACE} active:brightness-95`
  }
  return `rounded-xl ${KASSA_LIGHT_BTN_FACE} ${KASSA_POS_QUICK_MENU_LIFT_SHADOW} hover:brightness-110 active:brightness-90`
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
  if (kassaUiLayoutUsesPosLuxury(layout)) {
    return `${shell} ${kassaPosButtonClass(false, kassaLayoutPosChrome(layout))}`
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
