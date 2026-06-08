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

/** Gunmetal POS — productie-kassa donkere modus (visueel gelijk aan GKS-preview, geen gks-kassa import). */
export function createKassaPosRegisterUiTheme(dark: boolean): KassaRegisterUiTheme {
  const base = createKassaRegisterUiTheme(dark)
  if (!dark) return base

  return {
    ...base,
    shellBg: KASSA_POS_MENU_PLATE_SHELL_BG_CLASS,
    soundBackdrop: 'bg-[#333336]',
    flyMenuPanel: `${KASSA_POS_BTN_SHAPE} shadow-lg border border-[#1a1a1a] bg-[#333333]`,
    flyMenuBorder: 'border-[#4a4a4a]',
    flyMenuDivider: 'border-[#4a4a4a]',
    flyMenuRowHover: 'hover:bg-[#454545]',
    flyMenuRowActive: 'bg-[#4a4a4a]',
    langPanel: `absolute right-0 top-full z-[130] mt-1 min-w-[180px] overflow-hidden ${KASSA_POS_BTN_SHAPE} border border-[#1a1a1a] bg-[#333333] shadow-lg`,
    langRowActive: 'bg-[#4a4a4a] font-semibold text-white',
    categoryStripBg: KASSA_POS_MENU_TRANSPARENT_CLASS,
    categoryStripBorder: 'border-[#333336]',
    categoryStripHover: 'hover:brightness-105',
    productTileSolidBg: 'bg-[#2a2a2a]',
    productTileSolidBorder: 'border-[#1a1a1a]',
    productTileFooterBar: `border-[#1a1a1a] ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`,
    sidebarBg: KASSA_POS_MENU_TRANSPARENT_CLASS,
    ringOffset: 'ring-offset-[#333336]',
    tablePickerPanel: `absolute left-0 right-0 top-full mt-1 z-50 ${KASSA_POS_BTN_SHAPE} shadow-lg border border-[#1a1a1a] ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} overflow-hidden`,
    tablePickerHeader: `border-b border-[#1a1a1a] ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`,
    tablePickerFooterBar: `p-2 border-t border-[#1a1a1a] ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} flex gap-2`,
    numpadBarBg: KASSA_POS_MENU_TRANSPARENT_CLASS,
    clockTileBg: `${KASSA_CLOCK_TILE_ON_BAR} p-1`,
    clockTileHover: 'hover:brightness-105',
    numpadKeyNum: KASSA_POS_NUMPAD_KEY,
    cartRowBg: KASSA_POS_CART_ROW,
    cartThumbPlaceholder: KASSA_POS_CART_THUMB_SHELL,
    modalConfirmBg: `${KASSA_POS_BTN_SHAPE} w-full max-w-sm shadow-lg p-6 flex flex-col gap-4 bg-[#333333] border border-[#1a1a1a]`,
    modalGhostBtn: `flex-1 py-3 ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_BTN} font-semibold transition-[filter]`,
    printFallbackPanel: `w-full max-w-md ${KASSA_POS_BTN_SHAPE} border border-[#1a1a1a] bg-[#333333] p-5 shadow-lg sm:p-6`,
    printFallbackGhost: `mt-3 w-full py-3 px-4 text-sm font-semibold ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_BTN}`,
    priceAccentClass: 'text-[#5a9fd4]',
  }
}
