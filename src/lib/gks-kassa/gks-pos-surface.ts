/**
 * GKS-preview: legacy exportnamen — kern POS-knoppen komen uit `@/lib/kassa-pos-surface`.
 */

import {
  KASSA_POS_BTN,
  KASSA_POS_BTN_ARIA_DISABLED,
  KASSA_POS_BTN_DISABLED_SAME_LOOK,
  KASSA_POS_BTN_PRESS,
  KASSA_POS_BTN_SELECTED,
  KASSA_POS_BTN_SHAPE,
  KASSA_POS_CHECKOUT_BTN,
  KASSA_POS_CHECKOUT_LIFT_SHADOW,
  KASSA_POS_MENU_PLATE_SHELL_BG_CLASS,
  KASSA_POS_SELECTED_ACCENT_TEXT,
  KASSA_POS_SELECTED_LIFT_SHADOW,
  KASSA_POS_SELECTED_TOP_RIM,
  KASSA_POS_SUBTLE_LIFT_SHADOW,
  kassaPosButtonClass,
  kassaPosRaisedStripClass,
} from '@/lib/kassa-pos-surface'

export {
  kassaPosButtonClass as gksPosButtonClass,
  kassaPosRaisedStripClass as gksPosRaisedStripClass,
}

export const GKS_MENU_PLATE_BG = '#333336'
export const GKS_MENU_PLATE_SHELL_BG_CLASS = KASSA_POS_MENU_PLATE_SHELL_BG_CLASS
export const GKS_MENU_PLATE_BG_CLASS = KASSA_POS_MENU_PLATE_SHELL_BG_CLASS
export const GKS_MENU_RECESS_TRAY_CLASS = 'gks-menu-recess-tray'
export const GKS_MENU_PLATE_TRANSPARENT_CLASS = 'bg-transparent'
export const GKS_RULE_BLACK = 'border-black'
export const GKS_BTN_SHAPE = KASSA_POS_BTN_SHAPE
export const GKS_FONT_UI = 'font-semibold'
export const GKS_FONT_UI_SOFT = 'font-medium'
export const GKS_CLOCK_BAR_SHADOW =
  'shadow-[0_6px_12px_rgba(0,0,0,0.62),0_14px_30px_rgba(0,0,0,0.5),0_20px_44px_rgba(0,0,0,0.38)]'
export const GKS_CLOCK_BAR_LIFT_SHADOW = GKS_CLOCK_BAR_SHADOW
export const GKS_SUBTLE_LIFT_SHADOW = KASSA_POS_SUBTLE_LIFT_SHADOW
export const GKS_TILE_LIFT_SHADOW =
  'shadow-[0_5px_10px_rgba(0,0,0,0.56),0_12px_28px_rgba(0,0,0,0.42),0_16px_38px_rgba(0,0,0,0.34)]'
export const GKS_POS_SELECTED_LIFT_SHADOW = KASSA_POS_SELECTED_LIFT_SHADOW
export const GKS_POS_SELECTED_ACCENT_TEXT = KASSA_POS_SELECTED_ACCENT_TEXT
export const GKS_POS_SELECTED_TOP_RIM = KASSA_POS_SELECTED_TOP_RIM
export const GKS_TILE_PRESS = [
  'transition-[transform,box-shadow,filter] duration-200 ease-out',
  'active:translate-y-[1px]',
  'active:brightness-[0.96]',
].join(' ')
export const GKS_BTN_PRESS = KASSA_POS_BTN_PRESS
export const GKS_BTN_DISABLED_SAME_LOOK = KASSA_POS_BTN_DISABLED_SAME_LOOK
export const GKS_BTN_ARIA_DISABLED = KASSA_POS_BTN_ARIA_DISABLED
export const GKS_POS_BTN = KASSA_POS_BTN
export const GKS_POS_BTN_SELECTED = KASSA_POS_BTN_SELECTED
export const GKS_CHECKOUT_LIFT_SHADOW = KASSA_POS_CHECKOUT_LIFT_SHADOW
export const GKS_CHECKOUT_BTN = KASSA_POS_CHECKOUT_BTN
export const GKS_MENU_TILE_LABEL_SURFACE = KASSA_POS_MENU_PLATE_SHELL_BG_CLASS

const GKS_BTN_FACE =
  'bg-[linear-gradient(180deg,#161616_0%,#323232_46%,#1c1c1c_100%)]'

const GKS_BTN_PRESS_FACE =
  'active:bg-[linear-gradient(180deg,#0e0e0e_0%,#242424_52%,#101010_100%)]'

export const GKS_CLOCK_TILE_ON_BAR = [
  GKS_BTN_SHAPE,
  GKS_BTN_FACE,
  'relative z-[2]',
  'border border-[#3d3d3d] border-t-[#4a4a4a]/80',
  'shadow-[0_1px_0_rgba(255,255,255,0.14),0_3px_8px_rgba(0,0,0,0.38),0_8px_16px_rgba(0,0,0,0.28)]',
  GKS_BTN_PRESS,
  GKS_BTN_PRESS_FACE,
].join(' ')

export const GKS_ACCENT_BTN = [
  GKS_BTN_SHAPE,
  'bg-[linear-gradient(180deg,#7ad9ff_0%,#4fb8f0_32%,#1a7fd8_62%,#004aad_100%)]',
  'text-white',
  'border border-[#003878] border-t-[#9ee8ff]/35',
  'shadow-[0_2px_5px_rgba(0,0,0,0.4),0_6px_14px_rgba(0,30,80,0.25)]',
  GKS_BTN_PRESS,
  GKS_BTN_DISABLED_SAME_LOOK,
  'active:bg-[linear-gradient(180deg,#4a9fd0_0%,#0d5bb8_55%,#002f75_100%)]',
  'active:border-[#002a66]',
  'disabled:text-white',
].join(' ')

export const GKS_POS_FIELD = [
  GKS_BTN_SHAPE,
  GKS_BTN_FACE,
  'border border-[#2a2a2a]',
  GKS_SUBTLE_LIFT_SHADOW,
].join(' ')

export const GKS_CLOCK_BAR = [
  GKS_BTN_SHAPE,
  GKS_BTN_FACE,
  'relative z-0',
  'border border-[#2a2a2a]',
  GKS_CLOCK_BAR_LIFT_SHADOW,
].join(' ')

export function gksClockBarClass(): string {
  return `${kassaPosButtonClass(false)} relative z-0`
}
