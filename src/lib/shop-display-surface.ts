/**
 * Keuken- & shop/onlinescherm + platform online UI — licht thema.
 * Merkkleur platform online: #0E5D82 (niet tenant primary_color in de winkel).
 * Geen import uit `kassa-pos-surface`.
 */

/** Platform online (admin / schermen) — niet de klant-winkel. */
export const PLATFORM_ONLINE_BRAND_HEX = '#0E5D82'

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

/** Alias voor gedeelde orderkaart (keuken + display). */
export const KITCHEN_CARD_SHELL = SHOP_DISPLAY_CARD_SHELL
export const KITCHEN_CARD_HEAD = SHOP_DISPLAY_CARD_HEAD
export const KITCHEN_MUTED = SHOP_DISPLAY_MUTED
export const KITCHEN_SUBSTRIP = SHOP_DISPLAY_SUBSTRIP
export const KITCHEN_POS_BTN = `${SHOP_DISPLAY_BTN} py-3`
export const KITCHEN_POS_BTN_ACCENT = `${SHOP_DISPLAY_BTN_ACCENT} py-3`
