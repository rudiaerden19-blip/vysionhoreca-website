/**
 * Professioneel donker palet voor het kassa-scherm: hoge leesbaarheid, geen “zwart-op-grijs”.
 * Licht modus volgt bestaande grijze basis.
 */

export type KassaRegisterUiTheme = {
  shellBg: string
  soundBackdrop: string
  soundHeading: string
  soundBody: string
  soundStrong: string
  soundMuted: string
  flyMenuPanel: string
  flyMenuBorder: string
  flyMenuDivider: string
  flyMenuRowHover: string
  flyMenuRowActive: string
  flyMenuText: string
  flyMenuTextMuted: string
  flyMenuChevron: string
  langPanel: string
  langPanelBorder: string
  langRowHover: string
  langRowActive: string
  langRowInactive: string
  categoryStripBg: string
  categoryStripBorder: string
  categoryStripHover: string
  categoryStripText: string
  categoryStripIcon: string
  menuEmptyMuted: string
  productTileSolidBg: string
  productTileSolidBorder: string
  productTileFooterBar: string
  productFooterTextDark: string
  priceAccentClass: string
  sidebarBg: string
  sidebarBorder: string
  ringOffset: string
  tablePickerPanel: string
  tablePickerBorder: string
  tablePickerHeader: string
  tablePickerHeaderBorder: string
  tablePickerEmpty: string
  tablePickerFooterBar: string
  numpadBarBg: string
  clockTileBg: string
  clockTileBorder: string
  clockTileHover: string
  numpadInput: string
  numpadMeta: string
  numpadKeyNum: string
  numpadKeyNumHover: string
  cartRowBg: string
  cartRowBorder: string
  cartThumbPlaceholder: string
  cartTitle: string
  cartChoices: string
  cartDividerTop: string
  cartTotalsMeta: string
  modalConfirmBg: string
  modalConfirmTitle: string
  modalConfirmBody: string
  modalGhostBtn: string
  printFallbackPanel: string
  printFallbackTitle: string
  printFallbackBody: string
  printFallbackGhost: string
  pwaInstallBtn: string
}

export function createKassaRegisterUiTheme(dark: boolean): KassaRegisterUiTheme {
  if (!dark) {
    return {
      shellBg: 'bg-[#e3e3e3]',
      soundBackdrop: 'bg-[#e3e3e3]',
      soundHeading: 'text-gray-900',
      soundBody: 'text-gray-700',
      soundStrong: 'text-gray-900',
      soundMuted: 'text-gray-600',
      flyMenuPanel: 'bg-white rounded-2xl shadow-2xl border border-gray-100',
      flyMenuBorder: 'border-gray-100',
      flyMenuDivider: 'border-gray-100',
      flyMenuRowHover: 'hover:bg-blue-50',
      flyMenuRowActive: 'bg-blue-50',
      flyMenuText: 'text-gray-800',
      flyMenuTextMuted: 'text-gray-700',
      flyMenuChevron: 'text-gray-400',
      langPanel:
        'absolute right-0 top-full z-[130] mt-1 min-w-[180px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl',
      langPanelBorder: 'border-gray-200',
      langRowHover: 'hover:bg-gray-50',
      langRowActive: 'bg-blue-50 font-semibold text-blue-600',
      langRowInactive: 'text-gray-700',
      categoryStripBg: 'bg-[#e3e3e3]',
      categoryStripBorder: 'border-gray-300',
      categoryStripHover: 'hover:bg-[#d8d8d8]',
      categoryStripText: 'text-gray-800',
      categoryStripIcon: 'text-gray-600',
      menuEmptyMuted: 'text-gray-400',
      productTileSolidBg: 'bg-neutral-100',
      productTileSolidBorder: 'border-neutral-200/90',
      productTileFooterBar: 'border-neutral-200 bg-neutral-50/95',
      productFooterTextDark: 'text-neutral-950',
      priceAccentClass: 'text-[#58CCFF]',
      sidebarBg: 'bg-white border-l border-gray-200',
      sidebarBorder: 'border-gray-200',
      ringOffset: 'ring-offset-white',
      tablePickerPanel: 'absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden',
      tablePickerBorder: 'border-gray-200',
      tablePickerHeader: 'bg-gray-50 border-b border-gray-200',
      tablePickerHeaderBorder: 'border-gray-200',
      tablePickerEmpty: 'text-gray-400',
      tablePickerFooterBar: 'p-2 border-t border-gray-200 bg-gray-50 flex gap-2',
      numpadBarBg: 'bg-[#e3e3e3]',
      clockTileBg: 'bg-white shadow-md border border-slate-300',
      clockTileBorder: 'border-slate-300',
      clockTileHover: 'hover:border-[#3C4D6B] hover:bg-slate-50',
      numpadInput: 'text-black',
      numpadMeta: 'text-gray-700',
      numpadKeyNum: 'bg-[#e3e3e3] text-black hover:bg-gray-200',
      numpadKeyNumHover: '',
      cartRowBg: 'bg-white rounded-xl p-2.5 flex items-center gap-2.5 border border-gray-100 shadow-sm',
      cartRowBorder: 'border-gray-100',
      cartThumbPlaceholder: 'bg-gray-100',
      cartTitle: 'text-gray-800',
      cartChoices: 'text-gray-400',
      cartDividerTop: 'border-t border-gray-200',
      cartTotalsMeta: 'text-gray-700 border-b border-gray-100',
      modalConfirmBg: 'bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-4',
      modalConfirmTitle: 'font-bold text-xl text-gray-800',
      modalConfirmBody: 'text-gray-500 mt-1 text-sm',
      modalGhostBtn: 'flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors',
      printFallbackPanel: 'w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6',
      printFallbackTitle: 'text-lg font-bold text-gray-900',
      printFallbackBody: 'mt-3 text-sm leading-relaxed text-gray-700',
      printFallbackGhost:
        'mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50',
      pwaInstallBtn: 'rounded-full bg-white px-3 py-0.5 text-xs font-bold text-[#3C4D6B] hover:bg-slate-100',
    }
  }

  return {
    shellBg: 'bg-[#0b0f14]',
    soundBackdrop: 'bg-[#0b0f14]',
    soundHeading: 'text-zinc-50',
    soundBody: 'text-zinc-300',
    soundStrong: 'text-white',
    soundMuted: 'text-zinc-400',
    flyMenuPanel: 'rounded-2xl shadow-2xl border border-zinc-600 bg-[#151a21]',
    flyMenuBorder: 'border-zinc-700/90',
    flyMenuDivider: 'border-zinc-700/90',
    flyMenuRowHover: 'hover:bg-zinc-800/90',
    flyMenuRowActive: 'bg-zinc-800/95',
    flyMenuText: 'text-zinc-100',
    flyMenuTextMuted: 'text-zinc-300',
    flyMenuChevron: 'text-zinc-500',
    langPanel:
      'absolute right-0 top-full z-[130] mt-1 min-w-[180px] overflow-hidden rounded-xl border border-zinc-600 bg-[#151a21] shadow-xl',
    langPanelBorder: 'border-zinc-600',
    langRowHover: 'hover:bg-zinc-800/90',
    langRowActive: 'bg-[#263043] font-semibold text-[#58CCFF]',
    langRowInactive: 'text-zinc-200',
    categoryStripBg: 'bg-[#121821]',
    categoryStripBorder: 'border-zinc-600',
    categoryStripHover: 'hover:bg-[#1a2230]',
    categoryStripText: 'text-zinc-50',
    categoryStripIcon: 'text-zinc-400',
    menuEmptyMuted: 'text-zinc-500',
    productTileSolidBg: 'bg-[#1a2230]',
    productTileSolidBorder: 'border-zinc-600',
    productTileFooterBar: 'border-zinc-600/70 bg-[#151a21]/55 backdrop-blur-md',
    productFooterTextDark: 'text-zinc-50',
    priceAccentClass: 'text-white',
    sidebarBg: 'bg-[#0f1319] border-l border-zinc-700',
    sidebarBorder: 'border-zinc-700',
    ringOffset: 'ring-offset-[#0f1319]',
    tablePickerPanel:
      'absolute left-0 right-0 top-full mt-1 z-50 rounded-2xl shadow-2xl border border-zinc-600 bg-[#151a21] overflow-hidden',
    tablePickerBorder: 'border-zinc-600',
    tablePickerHeader: 'bg-[#1a2230] border-b border-zinc-600',
    tablePickerHeaderBorder: 'border-zinc-600',
    tablePickerEmpty: 'text-zinc-400',
    tablePickerFooterBar: 'p-2 border-t border-zinc-600 bg-[#121821] flex gap-2',
    numpadBarBg: 'bg-[#161c26]',
    clockTileBg: 'rounded-xl bg-[#1a2230] p-1 shadow-md border border-zinc-600',
    clockTileBorder: 'border-zinc-600',
    clockTileHover: 'hover:border-[#58CCFF] hover:bg-[#263043]',
    numpadInput: 'text-zinc-50',
    numpadMeta: 'text-zinc-300',
    numpadKeyNum: 'bg-[#263043] text-zinc-50 hover:bg-[#2f3b52]',
    numpadKeyNumHover: '',
    cartRowBg:
      'bg-[#1a2230] rounded-xl p-2.5 flex items-center gap-2.5 border border-zinc-600/95 shadow-inner shadow-black/25',
    cartRowBorder: 'border-zinc-600',
    cartThumbPlaceholder: 'bg-[#263043]',
    cartTitle: 'text-zinc-50',
    cartChoices: 'text-zinc-400',
    cartDividerTop: 'border-t border-zinc-700',
    cartTotalsMeta: 'text-zinc-300 border-b border-zinc-700',
    modalConfirmBg: 'rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-4 bg-[#151a21] border border-zinc-600',
    modalConfirmTitle: 'font-bold text-xl text-zinc-50',
    modalConfirmBody: 'text-zinc-400 mt-1 text-sm',
    modalGhostBtn:
      'flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-100 font-semibold hover:bg-zinc-700 transition-colors',
    printFallbackPanel: 'w-full max-w-md rounded-2xl border border-zinc-600 bg-[#151a21] p-5 shadow-xl sm:p-6',
    printFallbackTitle: 'text-lg font-bold text-zinc-50',
    printFallbackBody: 'mt-3 text-sm leading-relaxed text-zinc-300',
    printFallbackGhost:
      'mt-3 w-full rounded-xl border border-zinc-600 bg-[#1a2230] px-4 py-3 text-sm font-semibold text-zinc-100 hover:bg-[#263043]',
    pwaInstallBtn: 'rounded-full bg-zinc-100 px-3 py-0.5 text-xs font-bold text-[#0f1319] hover:bg-white',
  }
}
