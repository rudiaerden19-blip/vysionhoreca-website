import {
  createKassaRegisterUiTheme,
  type KassaRegisterUiTheme,
} from '@/lib/kassa-register-ui-theme'

/**
 * GKS-pilot: neutraal gunmetal (POS-referentie), geen blauw-grijze productie-tinten.
 * Alleen gebruikt op `/shop/{tenant}/gks`.
 */
export function createGksRegisterUiTheme(dark: boolean): KassaRegisterUiTheme {
  const base = createKassaRegisterUiTheme(dark)
  if (!dark) return base

  return {
    ...base,
    shellBg: 'bg-[#2d2d30]',
    soundBackdrop: 'bg-[#2d2d30]',
    flyMenuPanel: 'rounded-none shadow-lg border border-[#4a4a4a] bg-[#333333]',
    flyMenuBorder: 'border-[#4a4a4a]',
    flyMenuDivider: 'border-[#4a4a4a]',
    flyMenuRowHover: 'hover:bg-[#454545]',
    flyMenuRowActive: 'bg-[#4a4a4a]',
    langPanel:
      'absolute right-0 top-full z-[130] mt-1 min-w-[180px] overflow-hidden rounded-none border border-[#4a4a4a] bg-[#333333] shadow-lg',
    langRowActive: 'bg-[#4a4a4a] font-semibold text-white',
    categoryStripBg: 'bg-[#383838]',
    categoryStripBorder: 'border-[#4a4a4a]',
    categoryStripHover: 'hover:bg-[#454545]',
    productTileSolidBg: 'bg-[#404040]',
    productTileSolidBorder: 'border-[#5c5c5c]',
    productTileFooterBar: 'border-[#5c5c5c] bg-[#4a4a4a]',
    sidebarBg: 'bg-[#333333] border-l border-[#4a4a4a]',
    ringOffset: 'ring-offset-[#333333]',
    tablePickerPanel:
      'absolute left-0 right-0 top-full mt-1 z-50 rounded-none shadow-lg border border-[#4a4a4a] bg-[#333333] overflow-hidden',
    tablePickerHeader: 'bg-[#383838] border-b border-[#4a4a4a]',
    tablePickerFooterBar: 'p-2 border-t border-[#4a4a4a] bg-[#383838] flex gap-2',
    numpadBarBg: 'bg-[#333333]',
    clockTileBg: 'rounded-none bg-[#404040] p-1 border border-[#5c5c5c]',
    clockTileHover: 'hover:border-[#787878] hover:bg-[#4a4a4a]',
    numpadKeyNum: 'bg-[#4a4a4a] text-white hover:bg-[#565656] border border-[#5c5c5c]',
    cartRowBg:
      'bg-[#383838] rounded-none p-2.5 flex items-center gap-2.5 border border-[#4a4a4a]',
    cartThumbPlaceholder: 'bg-[#4a4a4a]',
    modalConfirmBg:
      'rounded-none w-full max-w-sm shadow-lg p-6 flex flex-col gap-4 bg-[#333333] border border-[#4a4a4a]',
    modalGhostBtn:
      'flex-1 py-3 rounded-none bg-[#4a4a4a] text-white font-semibold hover:bg-[#565656] transition-colors border border-[#5c5c5c]',
    printFallbackPanel:
      'w-full max-w-md rounded-none border border-[#4a4a4a] bg-[#333333] p-5 shadow-lg sm:p-6',
    printFallbackGhost:
      'mt-3 w-full rounded-none border border-[#5c5c5c] bg-[#4a4a4a] px-4 py-3 text-sm font-semibold text-white hover:bg-[#565656]',
  }
}
