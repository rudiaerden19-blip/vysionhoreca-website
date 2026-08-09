/**
 * Shop/onlinescherm: licht standaard; donker sync met kassa (`kassa_ui_dark` in kassa_pos_state).
 * Merkkleur platform online (licht): #0E5D82 — niet tenant primary_color in de winkel.
 */

import {
  KASSA_POS_BTN_SHAPE,
  KASSA_POS_MENU_PLATE_SHELL_BG_CLASS,
  KASSA_POS_MENU_RECESS_TRAY_CLASS,
  kassaPosButtonClass,
} from '@/lib/kassa-pos-surface'

/** Platform online (admin / schermen) — niet de klant-winkel. */
export const PLATFORM_ONLINE_BRAND_HEX = '#0E5D82'

const KASSA_DARK_BTN = `${kassaPosButtonClass(false)} touch-manipulation font-semibold text-[#f0f0f0]`
const KASSA_DARK_BTN_ACCENT = `${kassaPosButtonClass(true)} touch-manipulation font-bold`
export const KASSA_DARK_CARD_SHELL = `${KASSA_POS_BTN_SHAPE} border border-[#2a2a2a] ${KASSA_POS_MENU_RECESS_TRAY_CLASS} text-[#f0f0f0]`
export const KASSA_DARK_CARD_HEAD =
  'border-b border-black/40 bg-[linear-gradient(180deg,#1c1c1c_0%,#101010_48%,#060606_100%)]'
export const KASSA_DARK_MUTED = 'text-white/70'
export const KASSA_DARK_NEW_RING =
  'shadow-[0_0_0_2px_rgba(90,159,212,0.75),0_8px_24px_rgba(0,0,0,0.45)]'

export type ShopDisplaySurface = {
  pageShell: string
  header: string
  headerTitle: string
  headerSub: string
  tabBar: string
  btn: string
  btnAccent: string
  btnMenu: string
  tabActive: string
  tabInactive: string
  langDropdown: string
  langItemActive: string
  langItem: string
  modalOverlay: string
  modalPanel: string
  muted: string
  emptyTitle: string
  emptySub: string
  statBadge: string
  statNew: string
  statKitchen: string
  statReady: string
  clock: string
  soundOn: string
  soundOff: string
  completedCard: string
  completedCardMuted: string
  completedCardPrice: string
  cardAppearance: 'light' | 'dark'
  loaderRing: string
  scrollArea: string
  langBtn: string
  adminMenuLink: string
}

export function getShopDisplaySurface(kassaDark: boolean): ShopDisplaySurface {
  if (!kassaDark) {
    return {
      pageShell: SHOP_DISPLAY_PAGE_SHELL,
      header: SHOP_DISPLAY_HEADER,
      headerTitle: 'text-gray-900',
      headerSub: 'text-gray-600',
      tabBar: 'shrink-0 border-b border-gray-200 bg-white px-4 py-2 flex gap-2 items-center',
      btn: SHOP_DISPLAY_BTN,
      btnAccent: SHOP_DISPLAY_BTN_ACCENT,
      btnMenu: SHOP_DISPLAY_BTN_MENU,
      tabActive: SHOP_DISPLAY_TAB_ACTIVE,
      tabInactive: SHOP_DISPLAY_TAB_INACTIVE,
      langDropdown: SHOP_DISPLAY_LANG_DROPDOWN,
      langItemActive: 'bg-teal-50 font-semibold text-accent',
      langItem: 'text-gray-800',
      modalOverlay: SHOP_DISPLAY_MODAL_OVERLAY,
      modalPanel: SHOP_DISPLAY_MODAL_PANEL,
      muted: SHOP_DISPLAY_MUTED,
      emptyTitle: 'text-2xl font-bold text-gray-900',
      emptySub: 'text-gray-600',
      statBadge:
        'px-3 py-2 rounded-lg text-sm font-bold bg-teal-50 text-teal-900',
      statNew:
        'px-3 py-2 bg-teal-50 text-teal-900 rounded-lg text-sm font-bold',
      statKitchen: 'px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-bold',
      statReady: 'px-3 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-bold',
      clock: 'text-2xl font-mono font-bold text-gray-900',
      soundOn: 'bg-green-100 text-green-800',
      soundOff: 'bg-amber-100 text-amber-900 ring-2 ring-amber-400',
      completedCard:
        'bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors shadow-sm',
      completedCardMuted: 'text-sm text-gray-600',
      completedCardPrice: 'text-sm text-gray-700 font-medium tabular-nums',
      cardAppearance: 'light',
      loaderRing: 'border-accent',
      scrollArea: 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4',
      langBtn:
        'inline-flex touch-manipulation items-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50',
      adminMenuLink:
        'flex shrink-0 items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-800 transition-colors hover:bg-gray-200',
    }
  }

  return {
    pageShell: `${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} text-[#f0f0f0]`,
    header: `shrink-0 border-b border-black px-4 py-3 ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`,
    headerTitle: 'text-white',
    headerSub: 'text-white/95',
    tabBar: `shrink-0 border-b border-black px-4 py-2 flex gap-2 items-center ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`,
    btn: KASSA_DARK_BTN,
    btnAccent: KASSA_DARK_BTN_ACCENT,
    btnMenu: KASSA_DARK_BTN_ACCENT,
    tabActive: KASSA_DARK_BTN_ACCENT,
    tabInactive: KASSA_DARK_BTN,
    langDropdown: `absolute right-0 top-full z-[130] mt-1 max-h-80 min-w-[180px] overflow-y-auto border border-black shadow-xl ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`,
    langItemActive: `${KASSA_DARK_BTN_ACCENT} w-full`,
    langItem: 'text-[#f0f0f0] hover:bg-white/10',
    modalOverlay: 'bg-black/70',
    modalPanel: `${KASSA_POS_BTN_SHAPE} border border-black shadow-2xl ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} text-[#f0f0f0] max-w-2xl w-full max-h-[90vh] overflow-y-auto`,
    muted: KASSA_DARK_MUTED,
    emptyTitle: 'text-2xl font-bold text-white',
    emptySub: KASSA_DARK_MUTED,
    statBadge: `px-3 py-2 font-bold ${KASSA_DARK_BTN}`,
    statNew: `px-3 py-2 font-bold ${KASSA_DARK_BTN}`,
    statKitchen: `px-3 py-2 font-bold ${KASSA_DARK_BTN}`,
    statReady: `px-3 py-2 font-bold ${KASSA_DARK_BTN}`,
    clock: 'text-2xl font-mono font-bold text-white',
    soundOn: KASSA_DARK_BTN,
    soundOff: `${KASSA_DARK_BTN} ring-2 ring-amber-400`,
    completedCard: `cursor-pointer overflow-hidden transition-all ${KASSA_DARK_CARD_SHELL} hover:brightness-[1.04]`,
    completedCardMuted: `text-sm ${KASSA_DARK_MUTED}`,
    completedCardPrice: 'text-sm font-medium tabular-nums text-white',
    cardAppearance: 'dark',
    loaderRing: 'border-[#5a9fd4]',
    scrollArea: 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4',
    langBtn: `inline-flex touch-manipulation items-center gap-1 px-3 py-2 text-sm font-bold ${KASSA_DARK_BTN}`,
    adminMenuLink: `flex shrink-0 items-center gap-2 px-3 py-2 text-sm font-bold ${KASSA_DARK_BTN}`,
  }
}

export const SHOP_DISPLAY_PAGE_SHELL = 'bg-gray-100 text-gray-900'

export const SHOP_DISPLAY_HEADER =
  'bg-white border-b border-gray-200 text-gray-900 shadow-sm'

export const SHOP_DISPLAY_BTN_SHAPE = 'rounded-xl'

export const SHOP_DISPLAY_BTN =
  'rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100 touch-manipulation'

export const SHOP_DISPLAY_BTN_ACCENT =
  'rounded-xl border border-accent bg-accent px-3 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-accent/90 active:bg-[#0c4f6e] touch-manipulation'

export const SHOP_DISPLAY_BTN_MENU =
  'rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-bold text-gray-800 transition-colors hover:bg-gray-200 touch-manipulation'

export const SHOP_DISPLAY_TAB_ACTIVE =
  'rounded-lg border border-accent bg-accent px-4 py-2 font-bold text-white shadow-sm touch-manipulation'

export const SHOP_DISPLAY_TAB_INACTIVE =
  'rounded-lg border border-gray-300 bg-white px-4 py-2 font-bold text-gray-700 hover:bg-gray-50 touch-manipulation'

export const SHOP_DISPLAY_LANG_DROPDOWN =
  'absolute right-0 top-full z-[130] mt-1 max-h-80 min-w-[180px] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl'

export const SHOP_DISPLAY_CARD_SHELL =
  'rounded-xl border border-gray-200 bg-white text-gray-900 shadow-md'

export const SHOP_DISPLAY_CARD_HEAD =
  'border-b border-gray-200 bg-slate-50 text-gray-900'

export const SHOP_DISPLAY_MUTED = 'text-gray-600'

export const SHOP_DISPLAY_SUBSTRIP =
  'border-b border-gray-100 bg-gray-50 text-center text-sm font-medium text-gray-800'

export const SHOP_DISPLAY_RECESS =
  'rounded-lg border border-gray-200 bg-gray-50'

export const SHOP_DISPLAY_STATUS_BADGE =
  'rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold uppercase text-gray-800'

export const SHOP_DISPLAY_CARD_FOOTER = 'border-t border-gray-200 bg-gray-50 p-3'

export const SHOP_DISPLAY_ITEM_ROW_DIVIDER = 'border-b border-gray-200 pb-2 last:border-0'

export const SHOP_DISPLAY_OPTION_LINE = 'border-l-2 border-gray-300 pl-2 text-gray-700'

export const SHOP_DISPLAY_DINE_IN_STRIP =
  'border-b border-sky-200 bg-sky-50 px-3 py-1.5 text-center text-xs font-bold text-sky-900 sm:text-sm'

export const SHOP_DISPLAY_MODAL_OVERLAY = 'bg-black/40'

export const SHOP_DISPLAY_MODAL_PANEL =
  'rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl'

export const SHOP_DISPLAY_ACCENT_TEXT = 'text-accent'

export const SHOP_DISPLAY_NEW_CARD_RING =
  'shadow-[0_0_0_2px_rgba(14,93,130,0.55),0_8px_24px_rgba(0,0,0,0.12)]'
