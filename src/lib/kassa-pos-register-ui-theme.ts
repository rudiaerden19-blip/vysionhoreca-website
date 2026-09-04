import {
  createKassaRegisterUiTheme,
  type KassaRegisterUiTheme,
} from '@/lib/kassa-register-ui-theme'
import {
  KASSA_CLOCK_TILE_ON_BAR,
  KASSA_POS_BTN,
  KASSA_POS_BTN_SHAPE,
  KASSA_POS_FIELD,
  KASSA_POS_NUMPAD_KEY,
  KASSA_POS_CART_ROW,
  KASSA_POS_CART_THUMB_SHELL,
  KASSA_POS_MENU_PLATE_SHELL_BG_CLASS,
  KASSA_POS_MENU_TRANSPARENT_CLASS,
} from '@/lib/kassa-pos-surface'

/** Warm espresso POS — productie-kassa donkere modus (geen gks-kassa import). */
export function createKassaPosRegisterUiTheme(dark: boolean): KassaRegisterUiTheme {
  const base = createKassaRegisterUiTheme(dark)
  if (!dark) return base

  return {
    ...base,
    shellBg: KASSA_POS_MENU_PLATE_SHELL_BG_CLASS,
    soundBackdrop: 'bg-[#2a241e]',
    flyMenuPanel: `${KASSA_POS_BTN_SHAPE} shadow-lg border border-[#14110e] ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`,
    flyMenuBorder: 'border-[#3d352c]',
    flyMenuDivider: 'border-[#3d352c]',
    flyMenuRowHover: 'hover:bg-[#3a3228]',
    flyMenuRowActive: 'bg-[#3a3228]',
    langPanel: `absolute right-0 top-full z-[130] mt-1 min-w-[180px] overflow-hidden ${KASSA_POS_BTN_SHAPE} border border-[#14110e] bg-[#2a241e] shadow-lg`,
    langRowActive: 'bg-[#3a3228] font-semibold text-[#d4b483]',
    categoryStripBg: KASSA_POS_MENU_TRANSPARENT_CLASS,
    categoryStripBorder: 'border-[#2a241e]',
    categoryStripHover: 'hover:brightness-105',
    productTileSolidBg: 'bg-[#2a241c]',
    productTileSolidBorder: 'border-[#14110e]',
    productTileFooterBar: `border-[#14110e] ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`,
    sidebarBg: KASSA_POS_MENU_TRANSPARENT_CLASS,
    ringOffset: 'ring-offset-[#2a241e]',
    tablePickerPanel: `absolute left-0 right-0 top-full mt-1 z-50 ${KASSA_POS_BTN_SHAPE} shadow-lg border border-[#14110e] ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} overflow-hidden`,
    tablePickerHeader: `border-b border-[#14110e] ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`,
    tablePickerFooterBar: `p-2 border-t border-[#14110e] ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} flex gap-2`,
    numpadBarBg: KASSA_POS_MENU_TRANSPARENT_CLASS,
    clockTileBg: `${KASSA_CLOCK_TILE_ON_BAR} p-1`,
    clockTileHover: 'hover:brightness-105',
    numpadKeyNum: KASSA_POS_NUMPAD_KEY,
    cartRowBg: KASSA_POS_CART_ROW,
    cartThumbPlaceholder: KASSA_POS_CART_THUMB_SHELL,
    modalConfirmBg: `${KASSA_POS_BTN_SHAPE} w-full max-w-sm shadow-lg p-6 flex flex-col gap-4 bg-[#2a241e] border border-[#14110e]`,
    modalGhostBtn: `flex-1 py-3 ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_BTN} font-semibold transition-[filter]`,
    printFallbackPanel: `w-full max-w-md ${KASSA_POS_BTN_SHAPE} border border-[#14110e] bg-[#2a241e] p-5 shadow-lg sm:p-6`,
    printFallbackGhost: `mt-3 w-full py-3 px-4 text-sm font-semibold ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_BTN}`,
    priceAccentClass: 'text-[#d4b483]',
  }
}
