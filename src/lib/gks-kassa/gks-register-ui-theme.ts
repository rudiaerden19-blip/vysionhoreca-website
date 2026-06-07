import {
  createKassaRegisterUiTheme,
  type KassaRegisterUiTheme,
} from '@/lib/kassa-register-ui-theme'
import {
  GKS_BTN_SHAPE,
  GKS_MENU_PLATE_SHELL_BG_CLASS,
  GKS_MENU_PLATE_TRANSPARENT_CLASS,
  GKS_MENU_TILE_LABEL_SURFACE,
  GKS_CLOCK_TILE_ON_BAR,
  GKS_POS_BTN,
  GKS_POS_FIELD,
} from '@/lib/gks-kassa/gks-pos-surface'

/**
 * GKS-pilot: neutraal gunmetal + gradient-toetsen (POS-referentie).
 * Alleen gebruikt op `/shop/{tenant}/gks`.
 */
export function createGksRegisterUiTheme(dark: boolean): KassaRegisterUiTheme {
  const base = createKassaRegisterUiTheme(dark)
  if (!dark) return base

  return {
    ...base,
    shellBg: GKS_MENU_PLATE_SHELL_BG_CLASS,
    soundBackdrop: 'bg-[#333336]',
    flyMenuPanel: `${GKS_BTN_SHAPE} shadow-lg border border-[#1a1a1a] bg-[#333333]`,
    flyMenuBorder: 'border-[#4a4a4a]',
    flyMenuDivider: 'border-[#4a4a4a]',
    flyMenuRowHover: 'hover:bg-[#454545]',
    flyMenuRowActive: 'bg-[#4a4a4a]',
    langPanel: `absolute right-0 top-full z-[130] mt-1 min-w-[180px] overflow-hidden ${GKS_BTN_SHAPE} border border-[#1a1a1a] bg-[#333333] shadow-lg`,
    langRowActive: 'bg-[#4a4a4a] font-semibold text-white',
    categoryStripBg: GKS_MENU_PLATE_TRANSPARENT_CLASS,
    categoryStripBorder: 'border-[#333336]',
    categoryStripHover: 'hover:brightness-105',
    productTileSolidBg: 'bg-[#2a2a2a]',
    productTileSolidBorder: 'border-[#1a1a1a]',
    productTileFooterBar: `border-[#1a1a1a] ${GKS_MENU_TILE_LABEL_SURFACE}`,
    sidebarBg: GKS_MENU_PLATE_TRANSPARENT_CLASS,
    ringOffset: 'ring-offset-[#333336]',
    tablePickerPanel: `absolute left-0 right-0 top-full mt-1 z-50 ${GKS_BTN_SHAPE} shadow-lg border border-[#1a1a1a] ${GKS_MENU_PLATE_SHELL_BG_CLASS} overflow-hidden`,
    tablePickerHeader: `border-b border-[#1a1a1a] ${GKS_MENU_PLATE_SHELL_BG_CLASS}`,
    tablePickerFooterBar: `p-2 border-t border-[#1a1a1a] ${GKS_MENU_PLATE_SHELL_BG_CLASS} flex gap-2`,
    numpadBarBg: GKS_MENU_PLATE_TRANSPARENT_CLASS,
    clockTileBg: `${GKS_CLOCK_TILE_ON_BAR} p-1`,
    clockTileHover: 'hover:brightness-105',
    numpadKeyNum: `${GKS_BTN_SHAPE} ${GKS_POS_BTN}`,
    cartRowBg: `${GKS_POS_FIELD} p-2.5 flex items-center gap-2.5`,
    cartThumbPlaceholder: 'bg-[#3a3a3a]',
    modalConfirmBg: `${GKS_BTN_SHAPE} w-full max-w-sm shadow-lg p-6 flex flex-col gap-4 bg-[#333333] border border-[#1a1a1a]`,
    modalGhostBtn: `flex-1 py-3 ${GKS_BTN_SHAPE} ${GKS_POS_BTN} font-semibold transition-[filter]`,
    printFallbackPanel: `w-full max-w-md ${GKS_BTN_SHAPE} border border-[#1a1a1a] bg-[#333333] p-5 shadow-lg sm:p-6`,
    printFallbackGhost: `mt-3 w-full py-3 px-4 text-sm font-semibold ${GKS_BTN_SHAPE} ${GKS_POS_BTN}`,
  }
}
