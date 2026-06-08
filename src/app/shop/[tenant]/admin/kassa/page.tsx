'use client'

import {
  Suspense,
  memo,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
  startTransition,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import dynamic from 'next/dynamic'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  MenuProduct,
  MenuCategory,
  ProductOption,
  ProductOptionChoice,
  dedupeCatalogById,
  getMenuCategories,
  invalidateMenuCategoriesCache,
  getMenuProducts,
  getProductsWithOptions,
  getOptionsForProduct,
  getTenantSettings,
  TenantSettings,
  compareMenuProductsBySortOrder,
} from '@/lib/admin-api'
import { supabase } from '@/lib/supabase'
import { adminDb } from '@/lib/admin-db-client'
import { useLanguage } from '@/i18n'
import { getSoundsEnabled, setSoundsEnabled, playClick, playAddToCart, playRemove, playSuccess, playCashRegister, playCheckout, initAudio, prewarmAudio, playOrderNotification, activateAudioForIOS } from '@/lib/sounds'
import { prefetchProductImageUrls } from '@/lib/offline-product-images'
import { kassaProductImageRetryOnError } from '@/lib/kassa-img-retry'
import { allTenantModulesTrue, type TenantModuleId } from '@/lib/tenant-modules'
import {
  buildHamburgerModules,
  filterHamburgerModulesForAccess,
} from '@/lib/admin-hamburger-modules'
import { useTenantModuleFlags } from '@/lib/use-tenant-modules'
import {
  appLocaleToBcp47,
  escapeReceiptHtml,
  KASSA_PRINT_RECEIPT_STYLES,
  printReceiptHtmlDocument,
  printStaffSalesSummaryReceipt,
} from '@/lib/print-receipt-html'
import {
  sendToVysionPrintAgent,
  openCashDrawer,
  isAndroidTabletPrintClient,
  fetchPrintAgentHealth,
  printAgentHasDedicatedKitchenPrinter,
} from '@/lib/vysion-print-agent-client'
import {
  offlineDbLoadMenuSnapshot,
  offlineDbSaveMenuSnapshot,
  offlineDbSetOrderQueue,
} from '@/lib/kassa-offline-db'
import { AccountMenuSessionBlock } from '@/components/AccountMenuSessionBlock'
import {
  clearPublicDemoSession,
  isMarketingDemoTenantSlug,
  publicDemoSessionMatchesTenant,
} from '@/lib/demo-links'
import { useKassaUiDarkSync } from '@/lib/kassa-register-ui-dark-preference'
import { createKassaRegisterUiTheme, type KassaRegisterUiTheme } from '@/lib/kassa-register-ui-theme'
import { createKassaPosRegisterUiTheme } from '@/lib/kassa-pos-register-ui-theme'
import {
  KASSA_POS_BTN_SHAPE,
  KASSA_POS_CHECKOUT_BTN,
  KASSA_POS_MENU_PLATE_SHELL_BG_CLASS,
  KASSA_POS_MENU_RECESS_TRAY_CLASS,
  KASSA_POS_RULE_BLACK,
  KASSA_POS_QUICK_MENU_LIFT_SHADOW,
  KASSA_POS_SELECTED_ACCENT_TEXT,
  KASSA_POS_ZONE_BTN_LABEL,
  KASSA_SIDEBAR_FOOTER_BTN_LABEL,
  KASSA_SIDEBAR_FOOTER_LEFT_COL,
  KASSA_NUMPAD_CART_RECESS_MOTION,
  KASSA_NUMPAD_PANEL_SLIDE_MOTION,
  KASSA_POS_CART_THUMB_SHELL,
  KASSA_POS_MENU_TILE_BUTTON_BASE,
  KASSA_POS_MENU_TILE_IMAGE_WELL,
  KASSA_POS_MENU_TILE_IMAGE_WELL_SXGA,
  KASSA_POS_MENU_TILE_IMG_CLASS,
  KASSA_POS_MENU_TILE_IMG_FRAME,
  KASSA_POS_MENU_TILE_IMAGE_FILM,
  KASSA_POS_MENU_TILE_LABEL_CLASS,
  KASSA_POS_MENU_TILE_LABEL_CLASS_SXGA,
  KASSA_POS_MENU_TILE_LABEL_WRAP,
  KASSA_POS_MENU_TILE_LABEL_WRAP_SXGA,
  KASSA_POS_MENU_TILE_OPTS_BADGE,
  KASSA_POS_MENU_TILE_PLACEHOLDER_WELL,
  KASSA_POS_MENU_TILE_PLACEHOLDER_WELL_SXGA,
  KASSA_POS_MENU_TILE_QTY_BADGE,
  kassaPosButtonClass,
  kassaPosQuickMenuPanelButtonClass,
  kassaPosCartQtyButtonClass,
  kassaPosRaisedStripClass,
} from '@/lib/kassa-pos-surface'
import { authFetch, buildShopInternalReturnPath } from '@/lib/auth-headers'
import {
  attemptCloseThenOrNavigate,
  applyOwnerOnlyLogoutCleanup,
  broadcastTenantOwnerLogout,
  setTerminalLogout,
} from '@/lib/session-broadcast'
import {
  isDuplicateKassaClientViolation,
  isLikelyOfflineOrNetworkPersistFailure,
} from '@/lib/kassa-supabase-guards'
import { fetchOrderNumberByKassaClientUuid } from '@/lib/kassa-fetch-order-number'
import { formatKassaNumpadHeaderDate } from '@/lib/format-kassa-header-date'
import { appendKassaCloseTipToAbsoluteLoginUrl } from '@/lib/shop-login-kassa-tip'
import { syncZReportAfterOrderSafe } from '@/lib/kassa-z-sync-safe'
import { KassaAnalogClock } from '@/components/kassa/KassaAnalogClock'
import { LocaleFlagEmoji } from '@/components/LocaleFlagEmoji'
import { KassaRegisterSuspenseFallback } from '@/components/KassaRegisterSuspenseFallback'
import type {
  KassaCartItem as CartItem,
  KassaSelectedChoice as SelectedChoice,
  KassaRegisterOrderType as OrderType,
  KassaPaymentMethod as PaymentMethodType,
  KassaLastOrderReceipt,
} from '@/lib/kassa-cart-types'
import { kassaReceiptTableNumber } from '@/lib/kassa-cart-types'
import { mergeCartLinesForTable } from '@/lib/kassa-table-cart-merge'
import {
  computeBarBonDelta,
  loadBarBonWatermarks,
  removeBarBonWatermarkSlot,
  saveBarBonWatermarks,
} from '@/lib/kassa-bar-bon-watermark'
import {
  flushOfflineOrdersToSupabase,
  mergeOfflineOrderQueues,
  offlineOrdersQueueStorageKey,
} from '@/lib/kassa-offline-order-queue'
import { isWebshopChannelNewOrder } from '@/lib/admin-api-order-helpers'
import { useKassaOfflineFlushBridge } from '@/lib/use-kassa-offline-flush-bridge'
import type { KassaPayOption } from '@/components/kassa/KassaPaymentModal'
import { KassaPaymentModal } from '@/components/kassa/KassaPaymentModal'
import { KassaSplitPaymentModal } from '@/components/kassa/KassaSplitPaymentModal'
import { KassaSuccessReceiptModal } from '@/components/kassa/KassaSuccessReceiptModal'
import { KassaProductOptionsModal } from '@/components/kassa/KassaProductOptionsModal'
import {
  KassaProductStaffGatePopup,
  KassaStaffClockModal,
  KassaStaffSalesSummaryModal,
} from '@/components/kassa/KassaStaffClockUi'
import { LogoutSoftwareConfirmModal } from '@/components/LogoutSoftwareConfirmModal'
import { parseFloorPlanTablesJson, sanitizeFloorPlanTables, type FloorPlanTable } from '@/lib/kassa-floor-plan-tables'
import {
  FLOOR_PLAN_ZONE_INSIDE,
  FLOOR_PLAN_ZONE_TERRACE,
  floorPlanTablesLocalStorageKey,
  floorPlanZoneFromRealtimePayload,
  KASSA_FLOOR_ZONES,
  migrateLegacyTableOrdersKeys,
  normalizeFloorPlanZone,
  parseTableOrderMapKey,
  tableOrderMapKey,
  type FloorPlanZone,
} from '@/lib/kassa-floor-plan-zone'
import {
  kassaCustomerDisplayChannelName,
  type KassaCustomerDisplayMessage,
  type KassaCustomerDisplayLine,
  KASSA_CUSTOMER_DISPLAY_THANK_YOU_MS,
} from '@/lib/kassa-customer-display'
import {
  buildCustomerDisplayPopupFeatures,
  heuristicSecondaryBoundsSync,
  prefetchCustomerDisplayBounds,
  positionCustomerDisplayWindow,
  pulseApplyCustomerDisplayBounds,
  readCachedSecondaryBounds,
  resolveSecondaryBoundsViaApi,
  writeCachedSecondaryBounds,
  applyCustomerDisplayWindowBounds,
} from '@/lib/kassa-customer-display-window'
import {
  buildCategoryVatLookup,
  computeInclusiveVatSplitFromCart,
  resolveVatPercentForProduct,
  normalizeCategoryVatPercent,
} from '@/lib/order-vat'
import { sortKassaCartLinesByMenuCategory } from '@/lib/kassa-cart-grouping'

/** Tik-feedback ná paint — zwakkere touch-terminals blijven UI-updates beter bijbenen */
function scheduleKassaTapSound(play: () => void) {
  queueMicrotask(() => {
    requestAnimationFrame(() => void play())
  })
}

function scheduleAddToCartSound() {
  scheduleKassaTapSound(playAddToCart)
}

/** Kiosk/SXGA‑raster: smalle sidebar + vijf kolommen op `lg` — matcht Tailwind‑raster voor row‑cap. */
function kassaMenuGridColumnCountSxgaViewport(vpWcss: number): number {
  if (!Number.isFinite(vpWcss) || vpWcss <= 0) return 2
  if (vpWcss >= 1024) return 5
  if (vpWcss >= 768) return 4
  if (vpWcss >= 640) return 3
  return 2
}

/** Ruimte titel onder fotobak (SXGA); strak maar leesbare 2‑regellijn op 17″. */
const KASSA_SXGA_LABEL_STRIP_RESERVED_PX = 80
/** Vierkante fotobak ⇒ hoogte = celbreedte */
const KASSA_SXGA_TILE_IMAGE_HEIGHT_FRAC = 1
/** Zelfde als `mt-1.5` tussen foto-strook en naam */
const KASSA_SXGA_IMAGE_TO_TITLE_GAP_PX = 6

/**
 * Fysisch paneel klassiek **1280×1024** óf daar dicht tegenaan (sommige Elo/OS rapporteren ±2px).
 * Vangt kassa’s waar `inner*` door zoom/oriëntatie **niet altijd landschaps-w>h** heeft zoals verwacht,
 * maar het scherm wel echt deze 17″ 4∶3 klasse is.
 */
function isLikelySxga1280by1024PhysicalPanel(): boolean {
  if (typeof window === 'undefined') return false
  const scr = window.screen
  if (!scr || scr.width <= 0 || scr.height <= 0) return false

  const tryPair = (a: number, b: number): boolean => {
    if (!(a > 0 && b > 0)) return false
    const lw = Math.max(a, b)
    const sh = Math.min(a, b)
    return lw >= 1248 && lw <= 1312 && sh >= 1000 && sh <= 1060 && lw / sh >= 1.18 && lw / sh <= 1.32
  }

  if (tryPair(scr.width, scr.height)) return true
  if (tryPair(scr.availWidth, scr.availHeight)) return true
  return false
}

/**
 * `visualViewport`/inner nabij **1280×1024‑klasse** (inclusief Windows‑schaal **~1024×819**) — géén XGA 1024×768.
 */
function innerViewportRoughlySxga17(wCss: number, hCss: number): boolean {
  const lw = Math.max(wCss, hCss)
  const sh = Math.min(wCss, hCss)
  if (lw < 990 || lw > 1380 || sh < 796 || sh > 1108) return false
  const r = lw / sh
  return r >= 1.158 && r <= 1.36
}

/**
 * Fallback: viewport matchMedia klassiek SXGA‑kiosk; sluit breedbeeld uit.
 */
function sxgaLayoutMatchMediaHint(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(
    '(min-width: 1000px) and (max-width: 1420px) and (min-height: 785px) and (max-height: 1100px) and (min-aspect-ratio: 1215/1000) and (max-aspect-ratio: 1395/1000)',
  ).matches
}

/**
 * Alleen automatisch voor **≈1280×1024 / vierkante 17″‑kassa**. Geen invoer/schakelaars.
 */
function shouldApplyKassaCompactSquareMonitorTileCap(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

  const ua = navigator.userAgent
  // Alleen kleine phones uitsluiten; iPad-landscape kiosk mag dezelfde compacte tegels als Elo gebruiken.
  if (/\biPhone\b|\biPod\b/.test(ua)) return false
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return false

  const vv = window.visualViewport
  const wSrc = vv?.width != null && vv.width > 0 ? vv.width : window.innerWidth
  const hSrc = vv?.height != null && vv.height > 0 ? vv.height : window.innerHeight
  const w = Math.max(1, Math.floor(wSrc))
  const h = Math.max(1, Math.floor(hSrc))

  if (innerViewportRoughlySxga17(w, h)) return true

  if (isLikelySxga1280by1024PhysicalPanel()) return true

  if (sxgaLayoutMatchMediaHint()) return true

  if (w <= h || w < 860 || h < 620) return false

  const shortSide = h
  const longSide = w
  const inSizeBand =
    longSide >= 980 && longSide <= 1400 && shortSide >= 796 && shortSide <= 1090

  let ratioHit = false
  if (inSizeBand) {
    const r = longSide / shortSide
    ratioHit = r >= 1.2 && r <= 1.36
  }

  return ratioHit
}

/** Standaard numpadbalk (`w-80` / `sm:w-96` / `lg:w-[380px]`). */
const KASSA_SIDEBAR_WIDTH_BASE_PX = 320
const KASSA_SIDEBAR_WIDTH_SM_PX = 384
const KASSA_SIDEBAR_WIDTH_LG_PX = 380
/**
 * 17″ kiosk (SXGA): zijbalkbreedte — sync met `w-[332px]` en `.cursor/rules/kassa-17inch-sxga.mdc`.
 * Niet verkleinen zonder footer/header opnieuw te meten op 1280×1024.
 */
const KASSA_SIDEBAR_WIDTH_SXGA_COMPACT_PX = 332

/**
 * SXGA (~17″): rij gelijk aan **vierkante foto** (celbreedte) + lichte gap + titel — overige schermen ongemoeid.
 */
function applyKassaMenuSquareMonitorTileRowCap(
  rowH: number,
  gridInnerWidthPx: number,
  menuGridGapPx: number,
  _unusedMaxTileHToCellWLegacy: number,
  viewportCssWidth: number,
): number {
  if (!shouldApplyKassaCompactSquareMonitorTileCap()) return rowH
  const cols = kassaMenuGridColumnCountSxgaViewport(viewportCssWidth)
  const cellW =
    cols > 0
      ? (gridInnerWidthPx - (cols - 1) * menuGridGapPx) / cols
      : gridInnerWidthPx

  const cw = Math.max(1, cellW)
  const imgBandPx = cw * KASSA_SXGA_TILE_IMAGE_HEIGHT_FRAC
  const idealSxgaRowPx = Math.ceil(
    imgBandPx + KASSA_SXGA_IMAGE_TO_TITLE_GAP_PX + KASSA_SXGA_LABEL_STRIP_RESERVED_PX,
  )
  void _unusedMaxTileHToCellWLegacy

  return Math.max(118, Math.min(rowH, idealSxgaRowPx))
}

const KASSA_NUMPAD_KEYS = ['7', '8', '9', '+', '4', '5', '6', '-', '1', '2', '3', '×', 'C', '0', '.', '='] as const

/** Scroll vs tik op embedded touch/WebView (o.a. Elo): kleine beweging telt nog als tik */
const KASSA_TILE_TAP_SLOP_PX = 18
/** Horizontale categoriebalk: ruimere slop + scroll-as detectie (17″/21″/iPad). */
const KASSA_STRIP_TAP_SLOP_PX = 24
const KASSA_STRIP_SCROLL_AXIS_MIN_PX = 8
const KASSA_STRIP_SCROLL_DELTA_PX = 4

/** Titelbalk: klantscherm + geluid tijdelijk verborgen (code blijft voor later). */
const KASSA_HEADER_HIDE_CUSTOMER_DISPLAY_AND_SOUND = true

const KASSA_HEADER_QUICK_LINK_BTN =
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-[#3C4D6B] font-bold text-white transition-colors hover:bg-[#2D3A52] min-h-[2.35rem] px-3 py-2 sm:min-h-[2.6rem] sm:px-3.5 sm:py-2.5'
const KASSA_HEADER_QUICK_LINK_LABEL = 'text-[11px] leading-snug sm:text-xs'

/** Alleen Binnen/Terras — groter dan besteltype-knoppen eronder. */
function kassaFloorZoneButtonTouchClass(sxga: boolean): string {
  return sxga ? 'min-h-[3.25rem] py-2.5' : 'min-h-[2.75rem] py-2'
}

function kassaOrderTypeButtonTouchClass(sxga: boolean): string {
  return sxga ? 'min-h-[3.25rem] py-2.5' : 'min-h-[3rem] py-2.5'
}

/** Sidebar-footer: touch-vriendelijke hoogte (Lade / Bon / Verwijder). */
function kassaFooterActionTouchMinHClass(sxga: boolean, denseBill: boolean): string {
  if (sxga) return 'min-h-[4.75rem] py-2.5'
  if (denseBill) return 'min-h-[4rem] py-2'
  return 'min-h-[4.25rem] py-2.5'
}

function stoolsFromFloorDecorPayload(data: unknown): { stoolNumber: string; segmentId: string }[] {
  const rawItems = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)
      ? ((data as { items: unknown[] }).items as unknown[])
      : []
  const list = rawItems as { id?: string; type?: string; stool1?: string; stool2?: string }[]
  const out: { stoolNumber: string; segmentId: string }[] = []
  for (const d of list) {
    if (d.type !== 'bar_segment') continue
    const sid = d.id || ''
    if (d.stool1) out.push({ stoolNumber: d.stool1, segmentId: sid })
    if (d.stool2) out.push({ stoolNumber: d.stool2, segmentId: sid })
  }
  return out
}

/** Open kassa-tafelorders: alleen rijen uit Supabase — geen merge met oude localStorage. */
function buildOpenTableOrdersMapFromRows(
  data:
    | {
        table_number: string | null
        items: unknown
        floor_plan_zone?: string | null
        status?: string | null
        order_type?: string | null
        payment_status?: string | null
      }[]
    | null
    | undefined,
): Record<string, CartItem[]> {
  const out: Record<string, CartItem[]> = {}
  if (!data?.length) return out
  for (const row of data) {
    const tn = row.table_number
    const st = String(row.status || '').toLowerCase()
    const ot = String(row.order_type || '').toUpperCase()
    const ps = String(row.payment_status || '').toLowerCase()
    if (ot !== 'DINE_IN') continue
    if (!['open', 'preparing'].includes(st)) continue
    if (ps === 'paid') continue
    if (tn != null && String(tn) !== '' && row.items != null) {
      const zone = normalizeFloorPlanZone(row.floor_plan_zone)
      out[tableOrderMapKey(zone, String(tn))] = row.items as CartItem[]
    }
  }
  return out
}

/**
 * Supabase is bron voor elke tafel die een open order-rij heeft; lokale manden die
 * nog niet in die snapshot zitten (persist debounce / net gesleept) blijven zichtbaar
 * tot de server ze teruggeeft.
 */
function mergeOpenTableOrdersServerWithPendingLocal(
  prev: Record<string, CartItem[]>,
  fromServer: Record<string, CartItem[]>
): Record<string, CartItem[]> {
  const merged: Record<string, CartItem[]> = { ...fromServer }
  for (const [k, v] of Object.entries(prev)) {
    if (!(k in fromServer) && (v?.length ?? 0) > 0) {
      merged[k] = v
    }
  }
  return merged
}

/** Rijen uit DB voor buildOpenTableOrdersMapFromRows — zelfde bron als adminDb-insert (service role). */
type OpenTableOrderRow = {
  table_number: string | null
  items: unknown
  floor_plan_zone?: string | null
  order_type?: string | null
  status?: string | null
  payment_status?: string | null
}

function isDineInOpenTableDraftRow(row: OpenTableOrderRow): boolean {
  if (String(row.order_type || '').toUpperCase() !== 'DINE_IN') return false
  if (row.table_number == null || String(row.table_number).trim() === '') return false
  const st = String(row.status || '').toLowerCase()
  if (!['open', 'preparing'].includes(st)) return false
  if (String(row.payment_status || '').toLowerCase() === 'paid') return false
  return true
}

/**
 * Open tafelmanden: lees via admin-proxy (service role), net als schrijven — alle kassa-pc's zien identieke data.
 * Anon-Supabase alleen als fallback (bv. demo zonder sessie).
 * `preparing` = keuken heeft "klaar" gezet op open mand; mand blijft zichtbaar tot afrekenen.
 */
async function fetchOpenTableOrdersForTenant(tenantSlug: string): Promise<OpenTableOrderRow[] | null> {
  const adminRes = await adminDb.select<OpenTableOrderRow[]>('orders', {
    tenantSlug: tenantSlug,
    select: 'table_number, items, floor_plan_zone, order_type, payment_status, status',
    in: { status: ['open', 'preparing'] },
    limit: 500,
  })
  if (adminRes.ok && Array.isArray(adminRes.data)) {
    return adminRes.data.filter(isDineInOpenTableDraftRow)
  }
  if (!adminRes.ok && adminRes.error) {
    console.warn('[kassa] open orders admin read failed:', adminRes.error)
  }
  const { data, error } = await supabase
    .from('orders')
    .select('table_number, items, floor_plan_zone, order_type, payment_status, status')
    .eq('tenant_slug', tenantSlug)
    .in('status', ['open', 'preparing'])
    .limit(500)
  if (error) {
    console.warn('[kassa] open orders anon read failed:', error.message)
    return null
  }
  return ((data ?? []) as OpenTableOrderRow[]).filter(isDineInOpenTableDraftRow)
}

function buildKassaCustomerDisplayLines(cart: CartItem[]): KassaCustomerDisplayLine[] {
  return cart.map((i) => {
    const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
    const unit = i.product.price + choicesTotal
    const choiceNames = (i.choices || []).map((c) => c.choiceName).filter(Boolean)
    const choicePart = choiceNames.length > 0 ? ` (${choiceNames.join(', ')})` : ''
    return {
      label: `${i.product.name}${choicePart}`,
      qty: i.quantity,
      lineTotal: Math.round(unit * i.quantity * 100) / 100,
    }
  })
}

const KassaFloorPlan = dynamic(() => import('@/components/KassaFloorPlan'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25" aria-hidden>
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#3C4D6B] border-t-transparent" />
    </div>
  ),
})
const KassaReservationsView = dynamic(() => import('@/components/KassaReservationsView'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25" aria-hidden>
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#3C4D6B] border-t-transparent" />
    </div>
  ),
})

/** Categorie- en producttegel: witte kaart; foto alleen bovenin, titel in vaste strook eronder (niet over de foto). */
const KASSA_MENU_TILE_BUTTON_CLASS_BASE =
  'touch-manipulation select-none group relative flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-neutral-200/90 bg-white text-left shadow-[0_8px_30px_rgba(0,0,0,0.35)] active:brightness-95'

/** Standaard: rastercel wordt **items-stretch** ⇒ knop moet **`h-full`**. */
const KASSA_MENU_TILE_BUTTON_CLASS = `${KASSA_MENU_TILE_BUTTON_CLASS_BASE} h-full`

/**
 * SXGA: **`h-auto`** — geen groot wit blok onder titel als `gridAutoRows` te ruim rekende;
 * combinatie met **`items-start`** op het grid voor beide grids (cat + product).
 */
const KASSA_MENU_TILE_BUTTON_CLASS_SXGA = `${KASSA_MENU_TILE_BUTTON_CLASS_BASE} h-auto justify-start`

const KASSA_MENU_TILE_IMAGE_WELL =
  'pointer-events-none relative min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-white'

/**
 * SXGA ~17″: **vierkante** fotobak iets grotere tik‑/kijkvlak bij zelfde celbreedte; abs.‑img heeft wél echte hoogte.
 */
const KASSA_MENU_TILE_IMAGE_WELL_SXGA =
  'pointer-events-none relative w-full shrink-0 flex-none aspect-square overflow-hidden bg-white'

/** SXGA placeholder (geen afbeeldings‑URL):zelfde vorm als fotobak. */
const KASSA_MENU_TILE_PLACEHOLDER_WELL_SXGA =
  'pointer-events-none flex w-full shrink-0 flex-none flex-col items-center justify-center overflow-hidden bg-white px-2 aspect-square'

const KASSA_MENU_TILE_IMG_CLASS =
  'pointer-events-none absolute inset-0 box-border h-full w-full select-none object-contain object-center'

/** Kiosk/SXGA: vult het vierkant gelijkmatig op (licht bijsnijden); minder verschil tussen bron‑aspect‑ratio’s. */
const KASSA_MENU_TILE_IMG_CLASS_SXGA_COVER =
  'pointer-events-none absolute inset-0 box-border h-full w-full select-none object-cover object-center'

/** Vaste onderstrook: titel staat onder de afbeelding, niet in de foto. */
const KASSA_MENU_TILE_LABEL_WRAP =
  'pointer-events-none shrink-0 w-full bg-white px-2 pb-2 pt-1.5 sm:px-3'

/** SXGA ~17″: dichter tegen de foto, zelfde horizontale marge als standaard. */
const KASSA_MENU_TILE_LABEL_WRAP_SXGA =
  'pointer-events-none shrink-0 w-full bg-white px-2 pb-1.5 pt-0 mt-1.5 sm:px-3 sm:pb-2 sm:mt-1.5 sm:pt-0'

const KASSA_MENU_TILE_LABEL_CLASS =
  'm-0 line-clamp-2 text-center text-base font-black leading-snug tracking-tight text-black sm:text-lg md:text-xl'

/** SXGA 17″: categorie + product gelijk (`md:text-xl` wordt te groot in smalle rastercel). */
const KASSA_MENU_TILE_LABEL_CLASS_SXGA =
  'm-0 line-clamp-2 text-center text-[15px] font-black leading-snug tracking-tight text-black sm:text-base'

type KassaCategoryTileButtonProps = {
  category: MenuCategory
  imageUrl?: string
  sxgaDenseTileLayout?: boolean
  posLuxuryAppearance?: boolean
}

const KassaCategoryTileButton = memo(function KassaCategoryTileButton({
  category,
  imageUrl,
  sxgaDenseTileLayout,
  posLuxuryAppearance = false,
}: KassaCategoryTileButtonProps) {
  const btnClass = posLuxuryAppearance
    ? `${KASSA_POS_MENU_TILE_BUTTON_BASE} ${sxgaDenseTileLayout ? 'h-auto justify-start' : 'h-full'}`
    : sxgaDenseTileLayout
      ? KASSA_MENU_TILE_BUTTON_CLASS_SXGA
      : KASSA_MENU_TILE_BUTTON_CLASS
  const imgWell = posLuxuryAppearance
    ? sxgaDenseTileLayout
      ? KASSA_POS_MENU_TILE_IMAGE_WELL_SXGA
      : KASSA_POS_MENU_TILE_IMAGE_WELL
    : sxgaDenseTileLayout
      ? KASSA_MENU_TILE_IMAGE_WELL_SXGA
      : KASSA_MENU_TILE_IMAGE_WELL
  const labelWrap = posLuxuryAppearance
    ? sxgaDenseTileLayout
      ? KASSA_POS_MENU_TILE_LABEL_WRAP_SXGA
      : KASSA_POS_MENU_TILE_LABEL_WRAP
    : sxgaDenseTileLayout
      ? KASSA_MENU_TILE_LABEL_WRAP_SXGA
      : KASSA_MENU_TILE_LABEL_WRAP
  const labelClass = posLuxuryAppearance
    ? sxgaDenseTileLayout
      ? KASSA_POS_MENU_TILE_LABEL_CLASS_SXGA
      : KASSA_POS_MENU_TILE_LABEL_CLASS
    : sxgaDenseTileLayout
      ? KASSA_MENU_TILE_LABEL_CLASS_SXGA
      : KASSA_MENU_TILE_LABEL_CLASS

  const noImgTop = posLuxuryAppearance
    ? sxgaDenseTileLayout
      ? KASSA_POS_MENU_TILE_PLACEHOLDER_WELL_SXGA
      : KASSA_POS_MENU_TILE_PLACEHOLDER_WELL
    : sxgaDenseTileLayout
      ? KASSA_MENU_TILE_PLACEHOLDER_WELL_SXGA
      : 'pointer-events-none flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden bg-white px-2'

  const imgClass = posLuxuryAppearance
    ? KASSA_POS_MENU_TILE_IMG_CLASS
    : sxgaDenseTileLayout
      ? KASSA_MENU_TILE_IMG_CLASS_SXGA_COVER
      : KASSA_MENU_TILE_IMG_CLASS

  return (
    <button
      type="button"
      data-kassa-category-id={category.id != null ? String(category.id) : undefined}
      className={btnClass}
    >
      {imageUrl ? (
        <>
          <div className={imgWell}>
            <div className={posLuxuryAppearance ? KASSA_POS_MENU_TILE_IMG_FRAME : 'relative h-full w-full min-h-0'}>
              <img
                src={imageUrl}
                alt={category.name}
                decoding="async"
                loading="eager"
                onError={kassaProductImageRetryOnError}
                className={imgClass}
              />
            </div>
            {posLuxuryAppearance ? <div className={KASSA_POS_MENU_TILE_IMAGE_FILM} aria-hidden /> : null}
          </div>
          <div className={labelWrap}>
            <p className={labelClass}>{category.name}</p>
          </div>
        </>
      ) : (
        <>
          <div className={noImgTop}>
            {category.icon ? (
              <span className={`text-5xl ${posLuxuryAppearance ? 'text-neutral-500' : 'text-neutral-400'}`}>
                {category.icon}
              </span>
            ) : null}
          </div>
          <div className={labelWrap}>
            <p className={labelClass}>{category.name}</p>
          </div>
        </>
      )}
    </button>
  )
})

type KassaProductTileButtonProps = {
  product: MenuProduct
  inCart: number
  hasOpts: boolean
  sxgaDenseTileLayout?: boolean
  posLuxuryAppearance?: boolean
}

const KassaProductTileButton = memo(function KassaProductTileButton({
  product,
  inCart,
  hasOpts,
  sxgaDenseTileLayout,
  posLuxuryAppearance = false,
}: KassaProductTileButtonProps) {
  const { t } = useLanguage()
  const btnClass = posLuxuryAppearance
    ? `${KASSA_POS_MENU_TILE_BUTTON_BASE} ${sxgaDenseTileLayout ? 'h-auto justify-start' : 'h-full'}`
    : sxgaDenseTileLayout
      ? KASSA_MENU_TILE_BUTTON_CLASS_SXGA
      : KASSA_MENU_TILE_BUTTON_CLASS
  const imgWell = posLuxuryAppearance
    ? sxgaDenseTileLayout
      ? KASSA_POS_MENU_TILE_IMAGE_WELL_SXGA
      : KASSA_POS_MENU_TILE_IMAGE_WELL
    : sxgaDenseTileLayout
      ? KASSA_MENU_TILE_IMAGE_WELL_SXGA
      : KASSA_MENU_TILE_IMAGE_WELL
  const labelWrap = posLuxuryAppearance
    ? sxgaDenseTileLayout
      ? KASSA_POS_MENU_TILE_LABEL_WRAP_SXGA
      : KASSA_POS_MENU_TILE_LABEL_WRAP
    : sxgaDenseTileLayout
      ? KASSA_MENU_TILE_LABEL_WRAP_SXGA
      : KASSA_MENU_TILE_LABEL_WRAP
  const labelClass = posLuxuryAppearance
    ? sxgaDenseTileLayout
      ? KASSA_POS_MENU_TILE_LABEL_CLASS_SXGA
      : KASSA_POS_MENU_TILE_LABEL_CLASS
    : sxgaDenseTileLayout
      ? KASSA_MENU_TILE_LABEL_CLASS_SXGA
      : KASSA_MENU_TILE_LABEL_CLASS

  const noImgTop = posLuxuryAppearance
    ? sxgaDenseTileLayout
      ? `${KASSA_POS_MENU_TILE_PLACEHOLDER_WELL_SXGA} pt-2`
      : `${KASSA_POS_MENU_TILE_PLACEHOLDER_WELL} pt-4`
    : sxgaDenseTileLayout
      ? KASSA_MENU_TILE_PLACEHOLDER_WELL_SXGA
      : 'pointer-events-none flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden bg-white px-2 pt-4'

  const imgClass = posLuxuryAppearance
    ? KASSA_POS_MENU_TILE_IMG_CLASS
    : sxgaDenseTileLayout
      ? KASSA_MENU_TILE_IMG_CLASS_SXGA_COVER
      : KASSA_MENU_TILE_IMG_CLASS

  return (
    <button
      type="button"
      data-kassa-product-id={product.id != null ? String(product.id) : undefined}
      className={btnClass}
    >
      {product.image_url ? (
        <>
          <div className={imgWell}>
            <div className={posLuxuryAppearance ? KASSA_POS_MENU_TILE_IMG_FRAME : 'relative h-full w-full min-h-0'}>
              <img
                src={product.image_url}
                alt={product.name}
                decoding="async"
                loading="eager"
                onError={kassaProductImageRetryOnError}
                className={imgClass}
              />
            </div>
            {posLuxuryAppearance ? <div className={KASSA_POS_MENU_TILE_IMAGE_FILM} aria-hidden /> : null}
          </div>
          <div className={labelWrap}>
            <p className={labelClass}>{product.name}</p>
          </div>
        </>
      ) : (
        <>
          <div className={noImgTop}>
            <span className={`text-5xl ${posLuxuryAppearance ? 'text-neutral-500' : 'text-neutral-300'}`}>🍽️</span>
          </div>
          <div className={labelWrap}>
            <p className={labelClass}>{product.name}</p>
          </div>
        </>
      )}
      {inCart > 0 && (
        <div
          className={
            posLuxuryAppearance
              ? KASSA_POS_MENU_TILE_QTY_BADGE
              : 'absolute top-1.5 right-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-md'
          }
        >
          {inCart}
        </div>
      )}
      {hasOpts && (
        <div
          className={
            posLuxuryAppearance
              ? KASSA_POS_MENU_TILE_OPTS_BADGE
              : 'absolute top-1.5 left-1.5 z-20 rounded-md bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-white shadow'
          }
        >
          {posLuxuryAppearance ? t('kassaApp.optionBadgeShort') : '⚙️'}
        </div>
      )}
    </button>
  )
})

/** Unieke sleutel per afgeronde verkoop — zonder tijdstip (dat kan per render/build verschillen). */
function kassaPaidReceiptGuardKey(order: KassaLastOrderReceipt): string {
  const ref = String(order.checkoutReference ?? '').trim()
  const cents = Math.round(order.total * 100)
  return `${order.orderNumber}|${ref}|${cents}`
}

function kassaPaidReceiptDedupeStorageKey(tenantSlug: string, order: KassaLastOrderReceipt): string {
  return `vysion_kassa_paid_print_ok:${tenantSlug}:${kassaPaidReceiptGuardKey(order)}`
}

function snapshotCartItemsForAsyncPrint(items: CartItem[]): CartItem[] {
  return items.map((i) => ({
    ...i,
    product: { ...i.product },
    choices: i.choices?.map((c) => ({ ...c })),
  }))
}

/** Gele bon: alleen tegen dubbeltik binnen deze tijd; daarna altijd opnieuw afdrukken mogelijk. */
const KASSA_DRAFT_RECEIPT_COOLDOWN_MS = 450

function KassaAdminPageInner({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const offlineQueueKey = offlineOrdersQueueStorageKey(tenant)
  const router = useRouter()
  const searchParams = useSearchParams()
  const demoFromUrl =
    searchParams.get('demo') === 'bekijk' || searchParams.get('alleen_lezen') === '1'
  const [demoFromMarketingSession, setDemoFromMarketingSession] = useState(false)
  useLayoutEffect(() => {
    if (!isMarketingDemoTenantSlug(tenant)) return
    setDemoFromMarketingSession(publicDemoSessionMatchesTenant(tenant))
  }, [tenant, searchParams])
  const demoViewOnly = demoFromUrl || demoFromMarketingSession
  const { dark: kassaAppearanceDark } = useKassaUiDarkSync(tenant)
  const ui = useMemo(
    () =>
      kassaAppearanceDark
        ? createKassaPosRegisterUiTheme(true)
        : createKassaRegisterUiTheme(false),
    [kassaAppearanceDark],
  )

  useEffect(() => {
    const html = document.documentElement
    if (kassaAppearanceDark) html.classList.add('kassa-dark-appearance')
    else html.classList.remove('kassa-dark-appearance')
    return () => html.classList.remove('kassa-dark-appearance')
  }, [kassaAppearanceDark])

  const baseUrl = `/shop/${tenant}/admin`
  const { t, locale, setLocale, locales, localeNames } = useLanguage()

  const {
    moduleAccess,
    enabledModulesJson,
    featureLabelPrinting,
    loading: moduleFlagsLoading,
  } = useTenantModuleFlags(tenant)
  const effectiveAccess =
    demoViewOnly || moduleFlagsLoading ? allTenantModulesTrue() : moduleAccess
  const effectiveLabelPrinting = demoViewOnly || moduleFlagsLoading ? true : featureLabelPrinting
  const effectiveJson =
    demoViewOnly || moduleFlagsLoading ? null : enabledModulesJson

  const filteredHamburgerModules = useMemo(() => {
    const all = buildHamburgerModules(baseUrl, tenant)
    return filterHamburgerModulesForAccess(
      all,
      effectiveAccess,
      effectiveLabelPrinting,
      effectiveJson
    )
  }, [baseUrl, tenant, effectiveAccess, effectiveLabelPrinting, effectiveJson])

  const [navOpen, setNavOpen] = useState(false)
  const [kassaOpen, setKassaOpen] = useState(false)
  const [flyoutOpen, setFlyoutOpen] = useState<string | null>(null)
  const [onlineSubOpen, setOnlineSubOpen] = useState<string | null>(null)
  const [personeelSubOpen, setPersoneelSubOpen] = useState<string | null>(null)
  const [hamburgerOpen, setHamburgerOpen] = useState(false)
  const [hamburgerSubOpen, setHamburgerSubOpen] = useState<string | null>(null)
  const [quickMenuPanelOpen, setQuickMenuPanelOpen] = useState(false)
  const closeNav = () => { setNavOpen(false); setKassaOpen(false); setFlyoutOpen(null); setOnlineSubOpen(null) }
  // ── Geluid activatie scherm ──────────────────────────────────────────────
  // Eén keer per sessie (sessionStorage). Navigeren binnen de kassa toont het NIET opnieuw.
  // Bij nieuwe browsersessie (volgende ochtend) verschijnt het opnieuw.
  const SESSION_KEY = `vysion_kassa_audio_ok_${tenant}`
  const [soundActivated, setSoundActivated] = useState(() => {
    if (demoViewOnly) return true
    return typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === 'true'
  })
  const [showSoundActivation, setShowSoundActivation] = useState(() => {
    if (demoViewOnly) return false
    return typeof window === 'undefined' ? false : sessionStorage.getItem(SESSION_KEY) !== 'true'
  })

  const activateSound = () => {
    // Zelfde singleton AudioContext + notification.mp3 als playOrderNotification (niet aparte AudioContext)
    activateAudioForIOS()
    initAudio()
    prewarmAudio()
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    sessionStorage.setItem(SESSION_KEY, 'true')
    setSoundActivated(true)
    setShowSoundActivation(false)
  }

  /** Css-hooks voor scherpere lcd-weergave (globals.css: tekst + afbeeldingen); opruimen bij verlaten kassa */
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.classList.add('vysion-kassa-root')
    body.classList.add('vysion-kassa-root')
    return () => {
      html.classList.remove('vysion-kassa-root')
      body.classList.remove('vysion-kassa-root')
    }
  }, [])

  /** Eerste tik op kassa ontgrendelt audio (sessie al “ok”) zodat poll achtergrond alarm kan afspelen */
  const audioUnlockOnceRef = useRef(false)
  useEffect(() => {
    if (demoViewOnly || !soundActivated || audioUnlockOnceRef.current) return
    const onPointer = () => {
      if (audioUnlockOnceRef.current) return
      audioUnlockOnceRef.current = true
      activateAudioForIOS()
      initAudio()
      window.removeEventListener('pointerdown', onPointer, true)
    }
    window.addEventListener('pointerdown', onPointer, true)
    return () => window.removeEventListener('pointerdown', onPointer, true)
  }, [soundActivated, demoViewOnly])

  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN')
  const [tableNumber, setTableNumber] = useState('')
  const [numpadValue, setNumpadValue] = useState('')
  /** Alleen zichtbaar na druk op Num pad; bij opstart/login uit. */
  const [numpadPanelVisible, setNumpadPanelVisible] = useState(false)
  useEffect(() => {
    if (cart.length > 0) setNumpadPanelVisible(false)
  }, [cart.length])
  /** Minuut-update zodat de datum in de lege numpad-balk rond middernacht klopt. */
  const [numpadBarDate, setNumpadBarDate] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNumpadBarDate(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  const numpadHeaderDateLabel = useMemo(
    () => formatKassaNumpadHeaderDate(numpadBarDate, locale),
    [numpadBarDate, locale],
  )
  const [soundsOn, setSoundsOn] = useState(true)
  const [isOnline, setIsOnline] = useState<boolean | null>(null)
  const flushOfflineOrdersRef = useRef<() => Promise<void>>(async () => {})
  const [langOpen, setLangOpen] = useState(false)
  const [logoutSoftwareConfirmOpen, setLogoutSoftwareConfirmOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  /** Alleen bij product/opties: toon korte popup als verkoopmedewerker verplicht is. */
  const blockSaleWithoutStaffIfNeededRef = useRef<() => boolean>(() => false)
  const handleProductClickRef = useRef<(product: MenuProduct) => Promise<void>>(async () => {})
  /** Touch/WebView: voorkom dubbele afhandeling (pointerup + synthetische click). */
  const suppressProductGridClickRef = useRef(false)
  const productTilePointerRef = useRef<{
    pointerId: number
    x: number
    y: number
    chip: HTMLElement | null
  } | null>(null)
  const suppressCategoryGridClickRef = useRef(false)
  const categoryTilePointerRef = useRef<{
    pointerId: number
    x: number
    y: number
    chip: HTMLElement | null
  } | null>(null)
  const suppressCategoryStripClickRef = useRef(false)
  const categoryStripPointerRef = useRef<{
    pointerId: number
    x: number
    y: number
    chip: HTMLElement | null
    scrollLeft: number
  } | null>(null)

  // ── Nieuwe bestelling alarm (exact donor) ────────────────────────────────
  const [newOrderAlert, setNewOrderAlert] = useState<{id: string; orderNumber: number; total: number} | null>(null)
  const [newReservAlert, setNewReservAlert] = useState<{ id: string } | null>(null)
  const newOrderAlertRef = useRef<{id: string; orderNumber: number; total: number} | null>(null)
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousOrderIdsRef = useRef<string[]>([])
  const dismissedOrderIdsRef = useRef<string[]>([]) // oranje scherm al getoond, niet opnieuw tonen

  const newReservAlertRef = useRef<{ id: string } | null>(null)
  const previousReservIdsRef = useRef<string[]>([])
  /** Backlog bij openen kassa: geen geluid tot er een echte nieuwe reservering bijkomt (ID of hogere pending-teller). */
  const previousPendingReservCountRef = useRef<number | null>(null)
  const reservationAlarmLatchedRef = useRef(false)

  // Gebruik playOrderNotification uit sounds.ts — zelfde geactiveerde AudioContext als alle andere knoppen
  const stopAlarm = useRef(() => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current)
      alarmIntervalRef.current = null
    }
  }).current

  const startAlarm = useRef(() => {
    if (alarmIntervalRef.current) return
    // Speel direct
    playOrderNotification().catch(() => {})
    // Herhaal elke 2 seconden
    alarmIntervalRef.current = setInterval(() => {
      playOrderNotification().catch(() => {})
    }, 2000)
  }).current

  // Alarm blijft spelen (bestellingen + reserveringen delen hetzelfde interval als online orders)
  useEffect(() => {
    if (demoViewOnly) return
    if (newOrderAlert || newReservAlert) {
      if (!alarmIntervalRef.current) startAlarm()
      const verifyInterval = setInterval(() => {
        if ((newOrderAlertRef.current || newReservAlertRef.current) && !alarmIntervalRef.current) startAlarm()
      }, 2000)
      return () => clearInterval(verifyInterval)
    }
  }, [newOrderAlert, newReservAlert, startAlarm, demoViewOnly])

  // Cleanup alarm bij unmount
  useEffect(() => { return () => { if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current) } }, [])

  // Expose alarm functies globaal (zodat bestellingen pagina alarm kan stoppen)
  useEffect(() => {
    ;(window as any).stopOrderAlarm = () => { stopAlarm(); newOrderAlertRef.current = null; setNewOrderAlert(null) }
    ;(window as any).startOrderAlarm = () => startAlarm()
    ;(window as any).isAlarmRunning = () => alarmIntervalRef.current !== null
  }, [stopAlarm, startAlarm])

  useEffect(() => {
    ;(window as any).stopReservationAlarm = () => {
      newReservAlertRef.current = null
      setNewReservAlert(null)
      void (async () => {
        try {
          const [o, p] = await Promise.all([
            supabase
              .from('orders')
              .select('*', { count: 'exact', head: true })
              .eq('tenant_slug', tenant)
              .eq('status', 'new')
              .in('order_type', ['pickup', 'delivery', 'group']),
            supabase
              .from('reservations')
              .select('*', { count: 'exact', head: true })
              .eq('tenant_slug', tenant)
              .or('status.eq.PENDING,status.eq.pending,status.eq.WAITLIST,status.eq.waitlist'),
          ])
          if ((o.count ?? 0) === 0 && (p.count ?? 0) === 0) {
            stopAlarm()
            newOrderAlertRef.current = null
            setNewOrderAlert(null)
          }
        } catch {
          /* ignore */
        }
      })()
    }
    return () => {
      delete (window as any).stopReservationAlarm
    }
  }, [tenant, stopAlarm])

  useEffect(() => {
    if (!demoViewOnly) return
    try {
      sessionStorage.setItem(SESSION_KEY, 'true')
    } catch { /* ignore */ }
  }, [demoViewOnly, SESSION_KEY])

  // Poll elke 3s: online bestellingen + reserveringen — één alarm (startAlarm/stopAlarm) zoals voor orders.
  // Tab verborgen → geen interval (minder CPU op zwakkere kassa-PC's); bij terugkeren meteen één check.
  useEffect(() => {
    if (demoViewOnly) return
    let isFirstOrderCheck = true
    let isFirstReservCheck = true
    let intervalId: ReturnType<typeof setInterval> | null = null
    const check = async () => {
      try {
        const [{ data: orders }, { data: idRows }, pendingRes] = await Promise.all([
          supabase
            .from('orders')
            .select('id,order_number,total,status,order_type')
            .eq('tenant_slug', tenant)
            .eq('status', 'new')
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('reservations')
            .select('id')
            .eq('tenant_slug', tenant)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_slug', tenant)
            .or('status.eq.PENDING,status.eq.pending,status.eq.WAITLIST,status.eq.waitlist'),
        ])
        const list = orders || []
        /** Alleen webshop/kiosk `new` — kassa-POS schrijft direct `confirmed`; die mogen geen oranje alarm geven. */
        const webshopNewList = list.filter((o: { order_type?: string | null }) =>
          isWebshopChannelNewOrder(o),
        )
        const reservList = idRows || []
        const pendingAndWl = pendingRes.count ?? 0
        setPendingReservCount(pendingAndWl)

        const prevPendingCnt = previousPendingReservCountRef.current
        if (prevPendingCnt !== null && pendingAndWl > prevPendingCnt) {
          reservationAlarmLatchedRef.current = true
        }
        previousPendingReservCountRef.current = pendingAndWl
        if (pendingAndWl === 0) {
          reservationAlarmLatchedRef.current = false
        }

        let newReservOnes: { id: string }[] = []

        // ── Orders: alleen webshop-kanaal (pickup / delivery / group) ──
        const currentOrderIds = webshopNewList.map((o: { id: string }) => o.id)
        const prevOrderIds = previousOrderIdsRef.current
        if (!isFirstOrderCheck) {
          const newOrderOnes = webshopNewList.filter((o: { id: string }) => !prevOrderIds.includes(o.id))
          if (newOrderOnes.length > 0) {
            startAlarm()
            try {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(t('kassaApp.pushNewOrderTitle'), {
                  body: t('kassaApp.pushNewOrderBody').replace(
                    '{orderNumber}',
                    String(newOrderOnes[0].order_number),
                  ),
                  icon: '/favicon.ico',
                  requireInteraction: true,
                  tag: 'new-order',
                })
              }
            } catch {
              /* ignore */
            }
            const alert = {
              id: newOrderOnes[0].id,
              orderNumber: newOrderOnes[0].order_number,
              total: newOrderOnes[0].total || 0,
            }
            newOrderAlertRef.current = alert
            setNewOrderAlert(alert)
          }
        } else {
          isFirstOrderCheck = false
          if (webshopNewList.length > 0) startAlarm()
        }
        previousOrderIdsRef.current = currentOrderIds

        // ── Reserveringen: zelfde startAlarm, geen apart interval ──
        const currentReservIds = reservList.map((r: { id: string }) => r.id)
        const prevReservIds = previousReservIdsRef.current
        if (!isFirstReservCheck) {
          newReservOnes = reservList.filter((r: { id: string }) => !prevReservIds.includes(r.id))
          if (newReservOnes.length > 0) {
            reservationAlarmLatchedRef.current = true
            startAlarm()
            try {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(t('kassaApp.pushNewReservationTitle'), {
                  body: t('kassaApp.pushNewReservationBody'),
                  icon: '/favicon.ico',
                  requireInteraction: true,
                  tag: 'new-reservation',
                })
              }
            } catch {
              /* ignore */
            }
            const alert = { id: newReservOnes[0].id }
            newReservAlertRef.current = alert
            setNewReservAlert(alert)
          }
        } else {
          isFirstReservCheck = false
        }
        previousReservIdsRef.current = currentReservIds

        // ── Alarm aan/uit: alleen webshop `new` OF reservering-alarm ──
        const needOrderAlarm = webshopNewList.length > 0
        const needReservAlarm = reservationAlarmLatchedRef.current && pendingAndWl > 0
        if (needOrderAlarm || needReservAlarm) {
          if (!alarmIntervalRef.current) startAlarm()
        } else {
          if (alarmIntervalRef.current) {
            stopAlarm()
            newOrderAlertRef.current = null
            setNewOrderAlert(null)
          }
          newReservAlertRef.current = null
          setNewReservAlert(null)
        }
      } catch {
        /* ignore */
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (intervalId !== null) {
          clearInterval(intervalId)
          intervalId = null
        }
      } else {
        void check()
        if (intervalId === null) {
          intervalId = setInterval(() => {
            void check()
          }, 3000)
        }
      }
    }
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      void check()
      intervalId = setInterval(() => {
        void check()
      }, 3000)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (intervalId !== null) clearInterval(intervalId)
      previousPendingReservCountRef.current = null
      reservationAlarmLatchedRef.current = false
    }
  }, [tenant, startAlarm, stopAlarm, demoViewOnly, t])

  // Menu
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [products, setProducts] = useState<MenuProduct[]>([])
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null)
  const [menuLoading, setMenuLoading] = useState(true)
  const [productsWithOptions, setProductsWithOptions] = useState<string[]>([])
  const productIdsWithOptionsSet = useMemo(
    () => new Set(productsWithOptions),
    [productsWithOptions],
  )

  /** gap-4 (16px) op categorie-/productgrid; zelfde waarde in ResizeObserver-formule. */
  const KASSA_MENU_GRID_GAP_PX = 16

  const KASSA_MENU_VISIBLE_ROWS = 3
  /** 1 = rijhoogte past bij KASSA_MENU_VISIBLE_ROWS in scrollport (min gap); hogere rijen = grotere tegels / meer tekstruimte (o.a. 15"). */
  const KASSA_MENU_TILE_HEIGHT_BOOST = 1
  /**
   * SXGA gebruikt deze waarde niet meer (inhoud‑rij); argument blijft voor API-compat.
   */
  const KASSA_MENU_SQUARE_MONITOR_MAX_TILE_H_TO_CELL_W = 1.42

  function estimateKassaMenuGridInnerWidthPx(): number {
    if (typeof window === 'undefined') return 560
    const vv = window.visualViewport
    const iw = Math.floor(
      vv?.width != null && vv.width > 0 ? vv.width : window.innerWidth,
    )
    const kioskSxga = shouldApplyKassaCompactSquareMonitorTileCap()
    const sidebarPx = kioskSxga
      ? KASSA_SIDEBAR_WIDTH_SXGA_COMPACT_PX
      : iw >= 1024
        ? KASSA_SIDEBAR_WIDTH_LG_PX
        : iw >= 640
          ? KASSA_SIDEBAR_WIDTH_SM_PX
          : KASSA_SIDEBAR_WIDTH_BASE_PX
    const horizontalPadGuess = 32
    return Math.max(200, iw - sidebarPx - horizontalPadGuess)
  }

  function computeInitialKassaMenuRowPx(): number {
    if (typeof window === 'undefined') return Math.floor(180 * KASSA_MENU_TILE_HEIGHT_BOOST)
    const vh = window.visualViewport?.height ?? window.innerHeight
    const overhead = 68 + 56
    const innerApprox = Math.max(0, vh - overhead - 48)
    let row =
      ((innerApprox - (KASSA_MENU_VISIBLE_ROWS - 1) * KASSA_MENU_GRID_GAP_PX) / KASSA_MENU_VISIBLE_ROWS) *
      KASSA_MENU_TILE_HEIGHT_BOOST
    row = Math.max(120, Math.floor(row))
    return applyKassaMenuSquareMonitorTileRowCap(
      row,
      estimateKassaMenuGridInnerWidthPx(),
      KASSA_MENU_GRID_GAP_PX,
      KASSA_MENU_SQUARE_MONITOR_MAX_TILE_H_TO_CELL_W,
      Math.max(
        1,
        Math.floor(
          window.visualViewport?.width != null && window.visualViewport.width > 0
            ? window.visualViewport.width
            : window.innerWidth,
        ),
      ),
    )
  }

  /** Menu-paneel: responsieve kolommen × N rijen; rijhoogte = f(scrollport), ~3 rijen “doel” = hogere tegels. */
  const kassaMenuScrollRef = useRef<HTMLDivElement>(null)
  /** Ghost-tap naar nieuwe DOM onder vinger blokkeren (geen tijdvenster: ~2 frames pointer-events uit). */
  const kassaProductGridRef = useRef<HTMLDivElement>(null)
  const kassaCategoryGridRef = useRef<HTMLDivElement>(null)
  const kassaCategoryStripRef = useRef<HTMLDivElement>(null)
  /** Vorige gekozen categorie-id; null = nog nooit naar producten geweest. */
  const kassaPrevSelectedCategoryIdRef = useRef<string | null>(null)

  const [kassaMenuRowPx, setKassaMenuRowPx] = useState(computeInitialKassaMenuRowPx)
  /** SXGA ~17″: dichtere titel+vierkante fotobak — alleen daar `sxgaDenseTileLayout` naar tegels */
  const [kassaSxgaDenseTiles, setKassaSxgaDenseTiles] = useState(false)

  /** Na swap categorie⇄product: kort géén pointers op de verse grid (zelfde coörd = ghost tik). */
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined

    const currentId =
      selectedCategory?.id !== undefined && selectedCategory?.id !== null
        ? String(selectedCategory.id)
        : null
    const prevId = kassaPrevSelectedCategoryIdRef.current

    let peelEl: HTMLElement | null = null
    if (currentId !== null) {
      peelEl = kassaProductGridRef.current
    } else if (prevId !== null) {
      peelEl = kassaCategoryGridRef.current
    }
    kassaPrevSelectedCategoryIdRef.current = currentId

    if (!peelEl) return undefined

    peelEl.style.pointerEvents = 'none'
    let rafInner = 0
    const rafOuter = window.requestAnimationFrame(() => {
      rafInner = window.requestAnimationFrame(() => {
        peelEl!.style.pointerEvents = ''
      })
    })

    return () => {
      window.cancelAnimationFrame(rafOuter)
      window.cancelAnimationFrame(rafInner)
      peelEl.style.pointerEvents = ''
    }
  }, [selectedCategory])

  useLayoutEffect(() => {
    if (!selectedCategory?.id || !kassaCategoryStripRef.current) return
    const chip = kassaCategoryStripRef.current.querySelector(
      `[data-kassa-strip-category-id="${String(selectedCategory.id)}"]`,
    )
    if (chip && 'scrollIntoView' in chip) {
      chip.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedCategory?.id])

  const [showReservations, setShowReservations] = useState(false)
  const [pendingReservCount, setPendingReservCount] = useState(0)
  const [showFloorPlan, setShowFloorPlan] = useState(false)
  const [showTablePicker, setShowTablePicker] = useState(false)
  /** Verkoop / Binnen / Terras — los van besteltype (Ter plaatse); accent alleen na tik. */
  const [kassaZoneTab, setKassaZoneTab] = useState<'sales' | 'inside' | 'terrace' | null>(null)
  const [pickerBrowseZone, setPickerBrowseZone] = useState<FloorPlanZone>(FLOOR_PLAN_ZONE_INSIDE)
  const [dineInFloorZone, setDineInFloorZone] = useState<FloorPlanZone>(FLOOR_PLAN_ZONE_INSIDE)
  const [kassaTablesByZone, setKassaTablesByZone] = useState<Record<FloorPlanZone, FloorPlanTable[]>>({
    inside: [],
    terrace: [],
  })
  /** Tijdens plattegrond-upsert: poll/realtime mag geen kortere DB-snapshot over optimistische tafels zetten. */
  const floorPlanTablesPersistInflightRef = useRef<Partial<Record<FloorPlanZone, number>>>({})

  const applyKassaFloorPlanTablesPayload = useCallback((zone: FloorPlanZone, raw: unknown): boolean => {
    const parsed = parseFloorPlanTablesJson(raw)
    if (parsed === null) return false
    const fixed = sanitizeFloorPlanTables(parsed)
    setKassaTablesByZone((prev) => {
      const prevZone = prev[zone]
      const inflight = floorPlanTablesPersistInflightRef.current[zone] ?? 0
      if (inflight > 0 && fixed.length < prevZone.length) {
        const prevIds = new Set(prevZone.map((t) => t.id))
        if (fixed.every((t) => prevIds.has(t.id))) {
          return prev
        }
      }
      localStorage.setItem(floorPlanTablesLocalStorageKey(tenant, zone), JSON.stringify(fixed))
      return { ...prev, [zone]: fixed }
    })
    return true
  }, [tenant])
  const [kassaStoolsByZone, setKassaStoolsByZone] = useState<
    Record<FloorPlanZone, { stoolNumber: string; segmentId: string }[]>
  >({
    inside: [],
    terrace: [],
  })

  const [tenantInfo, setTenantInfo] = useState<TenantSettings | null>(null)

  useEffect(() => {
    const cacheKeySettings = `vysion_settings_${tenant}`
    const cachedSettings = localStorage.getItem(cacheKeySettings)
    if (cachedSettings) {
      try {
        setTenantInfo(JSON.parse(cachedSettings))
      } catch {
        /* ignore */
      }
    }
    getTenantSettings(tenant)
      .then((s) => {
        setTenantInfo(s)
        try {
          localStorage.setItem(cacheKeySettings, JSON.stringify(s))
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* offline: cache suffices */
      })
  }, [tenant])

  /** Zie Admin › Kassa-terminal (`kassa_floor_plan_enabled`). `undefined` = aan (backward compatible). */
  const kassaFloorPlanEnabled = tenantInfo?.kassa_floor_plan_enabled ?? true

  const categoryVatLookup = useMemo(() => buildCategoryVatLookup(categories), [categories])
  const tenantDefaultBtw = useMemo(
    () => normalizeCategoryVatPercent(tenantInfo?.btw_percentage ?? 6, 21),
    [tenantInfo?.btw_percentage],
  )
  const resolveCartLineVat = useCallback(
    (line: CartItem) =>
      resolveVatPercentForProduct(line.product, categoryVatLookup, tenantDefaultBtw),
    [categoryVatLookup, tenantDefaultBtw],
  )

  useEffect(() => {
    if (!kassaFloorPlanEnabled && showFloorPlan) setShowFloorPlan(false)
  }, [kassaFloorPlanEnabled, showFloorPlan])

  // Openstaande bestellingen per tafel: { "1": CartItem[], "2": CartItem[], ... }
  const [tableOrders, setTableOrders] = useState<Record<string, CartItem[]>>({})

  const tableOrdersKey = `vysion_table_orders_${tenant}`
  const persistTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  /** Één persist tegelijk per tafel-slot: voorkomt dat DELETE/INSERT door elkaar lopen (keuken ziet dan niets). */
  const openOrderPersistChainRef = useRef<Record<string, Promise<void>>>({})

  const applyOpenOrdersFromServerRows = useCallback((rows: OpenTableOrderRow[] | null) => {
    if (rows === null) return
    const fromServer = buildOpenTableOrdersMapFromRows(rows)
    setTableOrders((prev) => {
      const merged = mergeOpenTableOrdersServerWithPendingLocal(prev, fromServer)
      localStorage.setItem(tableOrdersKey, JSON.stringify(merged))
      return merged
    })
  }, [tableOrdersKey])

  useEffect(() => {
    return () => {
      const snapshot = { ...persistTimersRef.current }
      for (const k of Object.keys(snapshot)) {
        clearTimeout(snapshot[k])
      }
      persistTimersRef.current = {}
    }
  }, [])

  useLayoutEffect(() => {
    let rafId = 0

    /** Moet synchroon: geen `rAF` — anders eerste categorie-frame nog “niet‑SXGA” (te groot). */
    function syncSxgaDenseFromViewport() {
      const sxgaDense = shouldApplyKassaCompactSquareMonitorTileCap()
      setKassaSxgaDenseTiles((prev) => (prev === sxgaDense ? prev : sxgaDense))
    }

    const measure = () => {
      syncSxgaDenseFromViewport()
      cancelAnimationFrame(rafId)
      const el = kassaMenuScrollRef.current
      if (!el || typeof ResizeObserver === 'undefined') return

      rafId = requestAnimationFrame(() => {
        const st = getComputedStyle(el)
        const pt = parseFloat(st.paddingTop) || 0
        const pb = parseFloat(st.paddingBottom) || 0
        const pl = parseFloat(st.paddingLeft) || 0
        const pr = parseFloat(st.paddingRight) || 0
        const innerH = el.clientHeight - pt - pb
        const gridInnerW = Math.max(0, el.clientWidth - pl - pr)
        const vpWsrc =
          window.visualViewport?.width != null && window.visualViewport.width > 0
            ? window.visualViewport.width
            : window.innerWidth
        const viewportW = Math.max(1, Math.floor(vpWsrc))
        const fallback = computeInitialKassaMenuRowPx()
        if (innerH <= 0) {
          setKassaMenuRowPx((prev) => (prev === fallback ? prev : fallback))
          return
        }
        let rowH =
          ((innerH - (KASSA_MENU_VISIBLE_ROWS - 1) * KASSA_MENU_GRID_GAP_PX) / KASSA_MENU_VISIBLE_ROWS) *
          KASSA_MENU_TILE_HEIGHT_BOOST
        rowH = Math.max(108, Math.floor(rowH))
        const next = applyKassaMenuSquareMonitorTileRowCap(
          rowH,
          gridInnerW,
          KASSA_MENU_GRID_GAP_PX,
          KASSA_MENU_SQUARE_MONITOR_MAX_TILE_H_TO_CELL_W,
          viewportW,
        )
        setKassaMenuRowPx((prev) => (prev === next ? prev : next))
      })
    }

    measure()
    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined' && kassaMenuScrollRef.current) {
      ro = new ResizeObserver(measure)
      ro.observe(kassaMenuScrollRef.current)
    }
    const onLayoutSignal = () => measure()
    window.addEventListener('resize', onLayoutSignal)
    window.visualViewport?.addEventListener?.('resize', onLayoutSignal)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onLayoutSignal)
      window.visualViewport?.removeEventListener?.('resize', onLayoutSignal)
      ro?.disconnect()
    }
  }, [selectedCategory, menuLoading, kassaSxgaDenseTiles])

  // Laad tafels + barkrukken + openstaande bestellingen (localStorage + Supabase sync)

  useEffect(() => {
    if (kassaFloorPlanEnabled) {
      for (const zone of KASSA_FLOOR_ZONES) {
        const lsRaw = localStorage.getItem(floorPlanTablesLocalStorageKey(tenant, zone))
        if (lsRaw) {
          try {
            const parsed = JSON.parse(lsRaw)
            if (Array.isArray(parsed)) setKassaTablesByZone((p) => ({ ...p, [zone]: parsed }))
          } catch {
            /* empty */
          }
        }
      }

      void (async () => {
        for (const zone of KASSA_FLOOR_ZONES) {
          const adminRes = await adminDb.select<{ data?: unknown } | null>('floor_plan_tables', {
            tenantSlug: tenant,
            select: 'data',
            match: { plan_zone: zone },
            single: 'maybe',
          })
          let merged = false
          if (adminRes.ok) {
            const row = adminRes.data as { data?: unknown } | null | undefined
            if (row == null) merged = applyKassaFloorPlanTablesPayload(zone, [])
            else merged = applyKassaFloorPlanTablesPayload(zone, row.data)
          }
          if (!merged) {
            const { data, error } = await supabase
              .from('floor_plan_tables')
              .select('data')
              .eq('tenant_slug', tenant)
              .eq('plan_zone', zone)
              .maybeSingle()
            if (!error) {
              if (data == null) applyKassaFloorPlanTablesPayload(zone, [])
              else applyKassaFloorPlanTablesPayload(zone, data.data)
            }
          }
        }
      })()

      void (async () => {
        for (const zone of KASSA_FLOOR_ZONES) {
          const { data } = await supabase
            .from('floor_plan_decor')
            .select('data')
            .eq('tenant_slug', tenant)
            .eq('plan_zone', zone)
            .maybeSingle()
          if (data?.data == null) {
            setKassaStoolsByZone((p) => ({ ...p, [zone]: [] }))
          } else {
            setKassaStoolsByZone((p) => ({
              ...p,
              [zone]: stoolsFromFloorDecorPayload(data.data),
            }))
          }
        }
      })()
    }

    const ordersRaw = localStorage.getItem(tableOrdersKey)
    if (ordersRaw) {
      try {
        setTableOrders(migrateLegacyTableOrdersKeys(JSON.parse(ordersRaw)))
      } catch {
        /* empty */
      }
    }

    void fetchOpenTableOrdersForTenant(tenant).then(applyOpenOrdersFromServerRows)
    // Geen showTablePicker hier: die toggle triggert bij openen plattegrond en overschreef
    // tableOrders met een lege DB-snapshot vóór persist klaar was.
  }, [
    tenant,
    tableOrdersKey,
    kassaFloorPlanEnabled,
    applyOpenOrdersFromServerRows,
    applyKassaFloorPlanTablesPayload,
  ])

  // ── Realtime sync: tafelstatus tussen apparaten ───────────────────────────
  useEffect(() => {
    if (!kassaFloorPlanEnabled) return

    const refetchAllFloorPlanTables = () => {
      void (async () => {
        for (const zone of KASSA_FLOOR_ZONES) {
          const adminRes = await adminDb.select<{ data?: unknown } | null>('floor_plan_tables', {
            tenantSlug: tenant,
            select: 'data',
            match: { plan_zone: zone },
            single: 'maybe',
          })
          let merged = false
          if (adminRes.ok) {
            const row = adminRes.data as { data?: unknown } | null | undefined
            if (row == null) merged = applyKassaFloorPlanTablesPayload(zone, [])
            else merged = applyKassaFloorPlanTablesPayload(zone, row.data)
          }
          if (!merged) {
            const { data, error } = await supabase
              .from('floor_plan_tables')
              .select('data')
              .eq('tenant_slug', tenant)
              .eq('plan_zone', zone)
              .maybeSingle()
            if (!error) {
              if (data == null) applyKassaFloorPlanTablesPayload(zone, [])
              else applyKassaFloorPlanTablesPayload(zone, data.data)
            }
          }
        }
      })()
    }

    const tableChannel = supabase
      .channel(`kassa_fpt_${tenant}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'floor_plan_tables', filter: `tenant_slug=eq.${tenant}` },
        (payload: {
          eventType?: string
          new?: { data?: unknown; plan_zone?: string }
          old?: { plan_zone?: string }
        }) => {
          const applyZone = floorPlanZoneFromRealtimePayload(payload)
          if (!applyZone) {
            refetchAllFloorPlanTables()
            return
          }
          if (payload.eventType === 'DELETE') {
            void applyKassaFloorPlanTablesPayload(applyZone, [])
            return
          }
          const row = payload.new
          if (!row) {
            refetchAllFloorPlanTables()
            return
          }
          void applyKassaFloorPlanTablesPayload(applyZone, row.data)
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(tableChannel).catch(() => {})
    }
  }, [tenant, kassaFloorPlanEnabled, applyKassaFloorPlanTablesPayload])

  // ── Realtime sync: plattegrond-decor / barkrukken ─────────────────────────
  useEffect(() => {
    if (!kassaFloorPlanEnabled) return

    const refetchAllFloorDecor = () => {
      void (async () => {
        for (const zone of KASSA_FLOOR_ZONES) {
          const { data } = await supabase
            .from('floor_plan_decor')
            .select('data')
            .eq('tenant_slug', tenant)
            .eq('plan_zone', zone)
            .maybeSingle()
          if (data?.data == null) {
            setKassaStoolsByZone((p) => ({ ...p, [zone]: [] }))
          } else {
            setKassaStoolsByZone((p) => ({
              ...p,
              [zone]: stoolsFromFloorDecorPayload(data.data),
            }))
          }
        }
      })()
    }

    const decorChannel = supabase
      .channel(`kassa_decor_${tenant}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'floor_plan_decor',
          filter: `tenant_slug=eq.${tenant}`,
        },
        (
          payload: {
            eventType?: string
            new?: { data?: unknown; plan_zone?: string }
            old?: { plan_zone?: string }
          },
        ) => {
          const zone = floorPlanZoneFromRealtimePayload(payload)
          if (!zone) {
            refetchAllFloorDecor()
            return
          }
          if (payload.eventType === 'DELETE') {
            setKassaStoolsByZone((prev) => ({ ...prev, [zone]: [] }))
            return
          }
          const row = payload.new
          if (row?.data == null) {
            setKassaStoolsByZone((prev) => ({ ...prev, [zone]: [] }))
            return
          }
          setKassaStoolsByZone((prev) => ({
            ...prev,
            [zone]: stoolsFromFloorDecorPayload(row.data),
          }))
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(decorChannel).catch(() => {})
    }
  }, [tenant, kassaFloorPlanEnabled])

  // ── Realtime sync: open bestellingen per tafel tussen apparaten ───────────
  useEffect(() => {
    const ordersChannel = supabase
      .channel(`kassa_open_orders_${tenant}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `tenant_slug=eq.${tenant}` },
        () => {
          void fetchOpenTableOrdersForTenant(tenant).then(applyOpenOrdersFromServerRows)
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(ordersChannel).catch(() => {})
    }
  }, [tenant, applyOpenOrdersFromServerRows])

  /** Als WebSockets/realtime op een werkstation vastzitten (firewall, slaapstand, print-kiosk),
   *  halen we dezelfde bron nog eens binnen bij terugkeren naar het venster + periodiek. */
  useEffect(() => {
    const pullOpenOrders = () => {
      void fetchOpenTableOrdersForTenant(tenant).then(applyOpenOrdersFromServerRows)
    }

    const pullFloorAndDecor = () => {
      void (async () => {
        for (const zone of KASSA_FLOOR_ZONES) {
          const adminRes = await adminDb.select<{ data?: unknown } | null>('floor_plan_tables', {
            tenantSlug: tenant,
            select: 'data',
            match: { plan_zone: zone },
            single: 'maybe',
          })
          let merged = false
          if (adminRes.ok) {
            const row = adminRes.data as { data?: unknown } | null | undefined
            if (row == null) merged = applyKassaFloorPlanTablesPayload(zone, [])
            else merged = applyKassaFloorPlanTablesPayload(zone, row.data)
          }
          if (!merged) {
            const { data, error } = await supabase
              .from('floor_plan_tables')
              .select('data')
              .eq('tenant_slug', tenant)
              .eq('plan_zone', zone)
              .maybeSingle()
            if (!error) {
              if (data == null) applyKassaFloorPlanTablesPayload(zone, [])
              else applyKassaFloorPlanTablesPayload(zone, data.data)
            }
          }
        }
      })()

      void (async () => {
        for (const zone of KASSA_FLOOR_ZONES) {
          const { data } = await supabase
            .from('floor_plan_decor')
            .select('data')
            .eq('tenant_slug', tenant)
            .eq('plan_zone', zone)
            .maybeSingle()
          if (data?.data == null) {
            setKassaStoolsByZone((p) => ({ ...p, [zone]: [] }))
          } else {
            setKassaStoolsByZone((p) => ({
              ...p,
              [zone]: stoolsFromFloorDecorPayload(data.data),
            }))
          }
        }
      })()
    }

    const pullAll = () => {
      if (kassaFloorPlanEnabled) pullFloorAndDecor()
      pullOpenOrders()
    }

    const onActive = () => {
      if (document.visibilityState !== 'visible') return
      pullAll()
    }

    document.addEventListener('visibilitychange', onActive)
    window.addEventListener('focus', onActive)
    let timerFloor: number | null = null
    if (kassaFloorPlanEnabled) {
      timerFloor = window.setInterval(() => {
        if (document.visibilityState === 'visible') pullFloorAndDecor()
      }, 45_000)
    }
    const timerOrders = window.setInterval(() => {
      if (document.visibilityState === 'visible') pullOpenOrders()
    }, 12_000)

    return () => {
      document.removeEventListener('visibilitychange', onActive)
      window.removeEventListener('focus', onActive)
      if (timerFloor !== null) window.clearInterval(timerFloor)
      window.clearInterval(timerOrders)
    }
  }, [tenant, kassaFloorPlanEnabled, applyOpenOrdersFromServerRows, applyKassaFloorPlanTablesPayload])

  const cancelPersistTimer = (slotKey: string) => {
    const timers = persistTimersRef.current
    const prev = timers[slotKey]
    if (prev) {
      clearTimeout(prev)
      delete timers[slotKey]
    }
  }

  const persistOpenOrderRowToSupabaseImpl = async (
    zone: FloorPlanZone,
    tblNr: string,
    items: CartItem[],
  ) => {
    const openWhere = {
      tenant_slug: tenant,
      table_number: tblNr,
      status: 'open' as const,
      floor_plan_zone: zone,
    }
    const prepWhere = {
      tenant_slug: tenant,
      table_number: tblNr,
      status: 'preparing' as const,
      floor_plan_zone: zone,
    }

    const deleteOpenAndPreparing = async () => {
      const delOpen = await adminDb.delete('orders', openWhere, { tenantSlug: tenant })
      if (!delOpen.ok) console.warn('[kassa] open order delete failed:', delOpen.error)
      const delPrep = await adminDb.delete('orders', prepWhere, { tenantSlug: tenant })
      if (!delPrep.ok) console.warn('[kassa] preparing draft delete failed:', delPrep.error)
    }

    if (items.length === 0) {
      await deleteOpenAndPreparing()
      return
    }

    let customerTableLabel = t('kassaReceipt.tableLabel').replace(/\{number\}/g, String(tblNr))
    if (zone === FLOOR_PLAN_ZONE_TERRACE) {
      customerTableLabel = `${customerTableLabel} (${t('kassaApp.floorZoneTerrace')})`
    }

    const rowPayload: Record<string, unknown> = {
      order_number: 0,
      status: 'open',
      payment_status: 'pending',
      order_type: 'DINE_IN',
      customer_name: customerTableLabel,
      customer_notes: customerTableLabel,
      table_number: tblNr,
      floor_plan_zone: zone,
      subtotal: 0,
      tax: 0,
      total: 0,
      items: items as unknown as Record<string, unknown>[],
    }

    const sel = await adminDb.select<{ id: string }[]>('orders', {
      tenantSlug: tenant,
      select: 'id',
      match: { tenant_slug: tenant, table_number: tblNr, floor_plan_zone: zone },
      in: { status: ['open', 'preparing'] },
      limit: 20,
      timeoutMs: 12_000,
    })
    const ids =
      sel.ok && Array.isArray(sel.data) ? sel.data.map((r) => r.id).filter(Boolean) : []

    if (ids.length === 1) {
      const up = await adminDb.update(
        'orders',
        rowPayload,
        { id: ids[0], tenant_slug: tenant },
        { tenantSlug: tenant, timeoutMs: 12_000 },
      )
      if (up.ok) return
      console.warn('[kassa] open order update failed, replace:', up.error)
    }

    await deleteOpenAndPreparing()

    for (let attempt = 0; attempt < 3; attempt++) {
      const insRes = await adminDb.insert('orders', rowPayload, {
        tenantSlug: tenant,
        timeoutMs: 12_000,
      })
      if (insRes.ok) return
      console.warn('[kassa] open order insert failed:', insRes.error)
      const errMsg = insRes.error || ''
      const uniqueOrConflict =
        insRes.status === 409 || /duplicate|unique|23505/i.test(errMsg)
      const retryable =
        attempt < 2 && (insRes.status === 0 || insRes.status >= 500 || uniqueOrConflict)
      if (!retryable) break
      await new Promise((r) => setTimeout(r, 650 * (attempt + 1)))
    }
  }

  const persistOpenOrderRowToSupabase = (zone: FloorPlanZone, tblNr: string, items: CartItem[]) => {
    const slotKey = tableOrderMapKey(zone, tblNr)
    const prev = openOrderPersistChainRef.current[slotKey] ?? Promise.resolve()
    openOrderPersistChainRef.current[slotKey] = prev
      .then(() => persistOpenOrderRowToSupabaseImpl(zone, tblNr, items))
      .catch((err) => {
        console.warn('[kassa] open order persist:', err)
      })
  }

  const schedulePersistOpenOrder = (zone: FloorPlanZone, tblNr: string, items: CartItem[]) => {
    const slotKey = tableOrderMapKey(zone, tblNr)
    cancelPersistTimer(slotKey)
    persistTimersRef.current[slotKey] = setTimeout(() => {
      delete persistTimersRef.current[slotKey]
      void persistOpenOrderRowToSupabase(zone, tblNr, items)
    }, 420)
  }

  const updateTableStatus = (tblNr: string, occupied: boolean, zone: FloorPlanZone) => {
    const lsKey = floorPlanTablesLocalStorageKey(tenant, zone)
    const tablesRaw = localStorage.getItem(lsKey)
    if (!tablesRaw) return
    try {
      const tbls = JSON.parse(tablesRaw)
      const newStatus = occupied ? 'OCCUPIED' : 'FREE'
      const updatedTbls = tbls.map((t: { number: string; status: string }) =>
        t.number === tblNr ? { ...t, status: newStatus } : t,
      )
      localStorage.setItem(lsKey, JSON.stringify(updatedTbls))
      setKassaTablesByZone((prev) => ({ ...prev, [zone]: updatedTbls }))
      void adminDb.upsert(
        'floor_plan_tables',
        { tenant_slug: tenant, plan_zone: zone, data: updatedTbls } as any,
        { tenantSlug: tenant, onConflict: 'tenant_slug,plan_zone' },
      )
    } catch {
      /* empty */
    }
  }

  const saveCartToTable = (zone: FloorPlanZone, tblNr: string, items: CartItem[]) => {
    const slotKey = tableOrderMapKey(zone, tblNr)
    cancelPersistTimer(slotKey)
    if (items.length === 0) {
      try {
        removeBarBonWatermarkSlot(tenant, slotKey)
      } catch {
        /* storage mag tafel-sync niet breken */
      }
    }
    setTableOrders((prev) => {
      const updated = { ...prev, [slotKey]: items }
      localStorage.setItem(tableOrdersKey, JSON.stringify(updated))
      return updated
    })
    updateTableStatus(tblNr, items.length > 0, zone)
    void persistOpenOrderRowToSupabase(zone, tblNr, items)
  }

  // Bevestiging popup voor tafel wisselen
  const [switchConfirm, setSwitchConfirm] = useState<string | null>(null)
  /** Na plattegrond «Afrekenen»: open betaalmodal zodra doSwitchToTable klaar is (ook ná switch-bevestiging). */
  const openPaymentAfterFloorPlanSwitchRef = useRef(false)
  /** Automatische toog-delta bij «Naar tafel» / tafel wisselen: aparte inflight per slot. */
  const barDeltaSlotInflightRef = useRef<Record<string, boolean>>({})
  const flushBarDeltaSlipRef = useRef<
    (
      zone: FloorPlanZone,
      tblNr: string,
      snap: CartItem[],
      opts?: { printKitchen?: boolean; printKassaSlip?: boolean },
    ) => void
  >(() => {})

  const switchToTable = (newTableNr: string) => {
    const zone = pickerBrowseZone
    if (
      tableNumber &&
      cart.length > 0 &&
      (tableNumber !== newTableNr || dineInFloorZone !== zone)
    ) {
      setSwitchConfirm(tableOrderMapKey(zone, newTableNr))
      return
    }
    doSwitchToTable(newTableNr, zone)
  }

  const doSwitchToTable = (newTableNr: string, zone: FloorPlanZone) => {
    if (tableNumber && cart.length > 0) {
      const snap = snapshotCartItemsForAsyncPrint(cart)
      const oldZone = dineInFloorZone
      const oldTbl = tableNumber
      const oldSlot = tableOrderMapKey(oldZone, oldTbl)
      setTableOrders((prev) => {
        const merged = mergeCartLinesForTable(prev[oldSlot] || [], cart)
        const next = { ...prev, [oldSlot]: merged }
        localStorage.setItem(tableOrdersKey, JSON.stringify(next))
        updateTableStatus(oldTbl, merged.length > 0, oldZone)
        schedulePersistOpenOrder(oldZone, oldTbl, merged)
        return next
      })
      void flushBarDeltaSlipRef.current(oldZone, oldTbl, snap, {
        printKitchen: true,
        printKassaSlip: false,
      })
    }
    setCart([])
    setTableNumber(newTableNr)
    setDineInFloorZone(zone)
    setOrderType('DINE_IN')
    setShowTablePicker(false)
    setKassaZoneTab(null)
    setSwitchConfirm(null)
    if (openPaymentAfterFloorPlanSwitchRef.current) {
      openPaymentAfterFloorPlanSwitchRef.current = false
      setShowFloorPlan(false)
      setShowPaymentModal(true)
    }
  }

  /** Voeg toe aan tafel: nieuwe karronde naar tafelmand; keuken/kassa-delta alleen over die ronde. */
  const parkOrder = (opts: { printKitchen: boolean; printKassaSlip: boolean }) => {
    if (!tableNumber || cart.length === 0) return
    const snap = snapshotCartItemsForAsyncPrint(cart)
    const zone = dineInFloorZone
    const tbl = tableNumber
    const slotKey = tableOrderMapKey(zone, tbl)
    setTableOrders((prev) => {
      const merged = mergeCartLinesForTable(prev[slotKey] || [], cart)
      const next = { ...prev, [slotKey]: merged }
      localStorage.setItem(tableOrdersKey, JSON.stringify(next))
      updateTableStatus(tbl, merged.length > 0, zone)
      schedulePersistOpenOrder(zone, tbl, merged)
      return next
    })
    void flushBarDeltaSlipRef.current(zone, tbl, snap, opts)
    setCart([])
    setTableNumber('')
    setDineInFloorZone(FLOOR_PLAN_ZONE_INSIDE)
  }

  // Betaling
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showSplitModal, setShowSplitModal] = useState(false)
  /** BroadcastChannel-sessie voor tweede scherm (klant); optioneel — geen impact zonder token */
  const [customerDisplayToken, setCustomerDisplayToken] = useState<string | null>(null)
  /** Korte bedankmelding op klantscherm na betaling */
  const [customerDisplayThankYou, setCustomerDisplayThankYou] = useState<{
    total: number
    until: number
    /** Unieke tafelcontext tijdens bedankfase (nummer + zone). */
    dineInSubtitle?: string
  } | null>(null)
  const customerDisplayBcRef = useRef<BroadcastChannel | null>(null)
  const cartLinesScrollRef = useRef<HTMLDivElement | null>(null)
  /** HTML bon wacht op modal als lokale Print Agent faalt; daarna printReceiptHtmlDocument */
  const [printAgentFallbackHtml, setPrintAgentFallbackHtml] = useState<string | null>(null)
  /**
   * Thermische print-status op het scherm — géén window.alert ná async (Chrome Android blokkeert dat).
   */
  const [thermalPrintBanner, setThermalPrintBanner] = useState<{
    variant: 'success' | 'error'
    message: string
  } | null>(null)
  /** Bon afdrukken in succesmodal: UI-lock tijdens await. */
  const [successReceiptPrintBusy, setSuccessReceiptPrintBusy] = useState(false)
  /** Gele kop / sidebar: voorlopige bon wordt afgedrukt. */
  const [draftBonPrinting, setDraftBonPrinting] = useState(false)

  const paidReceiptPrintGuardRef = useRef<{
    key: string | null
    inFlight: boolean
    printedOkOnce: boolean
  }>({ key: null, inFlight: false, printedOkOnce: false })

  const draftReceiptPrintGuardRef = useRef<{
    inFlight: boolean
    /** Laatste geslaagde voorlopige print — alleen cooldown tegen dubbeltik, geen permanent blok. */
    lastOkAt: number
  }>({ inFlight: false, lastOkAt: 0 })

  const [splitCash, setSplitCash] = useState(0)
  const [splitCard, setSplitCard] = useState(0)
  const [lastOrder, setLastOrder] = useState<KassaLastOrderReceipt | null>(null)

  const [staffClockOpen, setStaffClockOpen] = useState(false)
  const [staffClockList, setStaffClockList] = useState<
    { id: string; name: string; hasOpenSession: boolean }[]
  >([])
  const [staffClockListLoading, setStaffClockListLoading] = useState(false)
  /** Minstens één GET staff-lijst afgerond terwijl klok aan staat (voorkomt korte “niemand ingeklokt”-race). */
  const [staffClockListHydrated, setStaffClockListHydrated] = useState(false)
  const [productStaffGatePopupOpen, setProductStaffGatePopupOpen] = useState(false)
  const [staffClockBusy, setStaffClockBusy] = useState(false)
  const [staffClockPinModal, setStaffClockPinModal] = useState<{
    staffId: string
    staffName: string
    action: 'in' | 'out'
  } | null>(null)
  const [staffClockPinInput, setStaffClockPinInput] = useState('')
  const [staffClockPinError, setStaffClockPinError] = useState<string | null>(null)
  const [staffClockSummary, setStaffClockSummary] = useState<{
    staffName: string
    total: number
    orderCount: number
    orders: { order_number: number; total: number }[]
  } | null>(null)
  /** Verhoog bij annuleren/sluiten zodat late API-antwoorden geen state meer zetten (busy blijft niet hangen). */
  const staffClockPinReqGen = useRef(0)
  const [activeKassaStaff, setActiveKassaStaff] = useState<{ id: string; name: string } | null>(null)

  // Opties modal (editingCartKey = bestaande winkelmandregel aanpassen)
  const [optionsModal, setOptionsModal] = useState<{
    product: MenuProduct
    options: ProductOption[]
    selected: SelectedChoice[]
    editingCartKey?: string
  } | null>(null)

  // Blokkeer body scroll (iPad Safari fix)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
      document.documentElement.style.overflow = ''
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
  }, [])

  // ── PWA install prompt ────────────────────────────────────────────────────
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallPWA = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') { setInstallPrompt(null); setIsInstalled(true) }
  }

  // ── Menu cache keys ────────────────────────────────────────────────────────
  const CACHE_CATS = `vysion_menu_cats_${tenant}`
  const CACHE_PRODS = `vysion_menu_prods_${tenant}`
  const CACHE_OPTS = `vysion_menu_opts_${tenant}`

  // Laad categorieën, producten en welke producten opties hebben
  // Offline: laad uit localStorage-cache; online: laad van Supabase en update cache
  const loadMenu = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent
    if (!silent) setMenuLoading(true)

    // 1) IndexedDB (meest recente snapshot na eerdere sessie)
    try {
      const snap = await offlineDbLoadMenuSnapshot(tenant)
      if (snap) {
        setCategories(dedupeCatalogById(JSON.parse(snap.categoriesJson)))
        setProducts(dedupeCatalogById(JSON.parse(snap.productsJson)))
        setProductsWithOptions([...new Set(JSON.parse(snap.productsWithOptionsJson) as string[])])
        setMenuLoading(false)
      }
    } catch {
      /* ignore */
    }

    // 2) localStorage-cache (legacy / migratie)
    try {
      const cachedCats = localStorage.getItem(CACHE_CATS)
      const cachedProds = localStorage.getItem(CACHE_PRODS)
      const cachedOpts = localStorage.getItem(CACHE_OPTS)
      if (cachedCats && cachedProds && cachedOpts) {
        setCategories(dedupeCatalogById(JSON.parse(cachedCats)))
        setProducts(dedupeCatalogById(JSON.parse(cachedProds)))
        setProductsWithOptions([...new Set(JSON.parse(cachedOpts) as string[])])
        setMenuLoading(false)
      }
    } catch {
      /* geen geldige cache */
    }

    // 3) Supabase (online refresh)
    try {
      const [cats, prods, withOpts] = await Promise.all([
        getMenuCategories(tenant),
        getMenuProducts(tenant),
        getProductsWithOptions(tenant),
      ])
      const activeCats = dedupeCatalogById(cats.filter(c => c.is_active))
      const activeProds = dedupeCatalogById(prods.filter(p => p.is_active))
      setCategories(activeCats)
      setProducts(activeProds)
      setProductsWithOptions(withOpts)
      const catsJson = JSON.stringify(activeCats)
      const prodsJson = JSON.stringify(activeProds)
      const optsJson = JSON.stringify(withOpts)
      localStorage.setItem(CACHE_CATS, catsJson)
      localStorage.setItem(CACHE_PRODS, prodsJson)
      localStorage.setItem(CACHE_OPTS, optsJson)
      void offlineDbSaveMenuSnapshot(tenant, {
        categoriesJson: catsJson,
        productsJson: prodsJson,
        productsWithOptionsJson: optsJson,
      })
    } catch {
      // Netwerkfout – cache hierboven is voldoende
    }
    setMenuLoading(false)
  }, [tenant, CACHE_CATS, CACHE_PRODS, CACHE_OPTS])

  useEffect(() => {
    loadMenu()
  }, [tenant, loadMenu])

  useEffect(() => {
    try {
      const tok = sessionStorage.getItem(`vysion_klantscherm_${tenant}`)?.trim()
      if (tok) setCustomerDisplayToken(tok)
    } catch {
      /* ignore */
    }
  }, [tenant])

  useEffect(() => {
    void prefetchCustomerDisplayBounds(window)
  }, [tenant])

  useEffect(() => {
    if (!customerDisplayToken || typeof BroadcastChannel === 'undefined') {
      customerDisplayBcRef.current?.close()
      customerDisplayBcRef.current = null
      return
    }
    const name = kassaCustomerDisplayChannelName(tenant, customerDisplayToken)
    customerDisplayBcRef.current?.close()
    customerDisplayBcRef.current = new BroadcastChannel(name)
    return () => {
      customerDisplayBcRef.current?.close()
      customerDisplayBcRef.current = null
    }
  }, [tenant, customerDisplayToken])

  useEffect(() => {
    if (!customerDisplayThankYou) return
    const ms = customerDisplayThankYou.until - Date.now()
    if (ms <= 0) {
      setCustomerDisplayThankYou(null)
      return
    }
    const id = window.setTimeout(() => setCustomerDisplayThankYou(null), ms)
    return () => window.clearTimeout(id)
  }, [customerDisplayThankYou])

  // Zorg dat product- en logo-afbeeldingen in de SW image-cache zitten (offline zichtbaar)
  useEffect(() => {
    if (products.length === 0) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const urls: string[] = []
    for (const p of products) {
      if (p.image_url) urls.push(p.image_url)
    }
    if (tenantInfo?.logo_url) urls.push(tenantInfo.logo_url)
    prefetchProductImageUrls(urls).catch(() => {})
  }, [products, tenantInfo?.logo_url])

  // Tab terug naar voorgrond (Edge/Windows): menu verversen zonder heel het rooster te verbergen —
  // forceren van menuLoading gaf ±1s "Laden…" bij elke tab-switch.
  useEffect(() => {
    let lastSilentAt = 0
    const gapMs = 800
    const refreshSilentThrottled = () => {
      const now = Date.now()
      if (now - lastSilentAt < gapMs) return
      lastSilentAt = now
      void loadMenu({ silent: true })
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshSilentThrottled()
    }
    const onFocus = () => refreshSilentThrottled()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [tenant, loadMenu])

  // Sound init
  useEffect(() => {
    setSoundsOn(getSoundsEnabled())
  }, [])

  // Online status check – gecombineerd: navigator.onLine + server ping
  useEffect(() => {
    const check = async () => {
      if (!navigator.onLine) { setIsOnline(false); return }
      try {
        const res = await fetch('/api/ping', { method: 'HEAD', cache: 'no-store' })
        setIsOnline(res.ok)
      } catch {
        setIsOnline(false)
      }
    }
    const goOnline = () => { setIsOnline(true); check() }
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    check()
    const interval = setInterval(check, 30000)
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [tenant])

  // Sluit taalmenu bij tik buiten (pointerdown: betrouwbaar op Windows-touch / Edge)
  useEffect(() => {
    function handlePointerOutside(e: PointerEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerOutside, true)
    return () => document.removeEventListener('pointerdown', handlePointerOutside, true)
  }, [])

  const toggleSound = () => {
    const next = !soundsOn
    setSoundsOn(next)
    setSoundsEnabled(next)
    if (next) {
      activateAudioForIOS()
      initAudio()
    }
    playClick()
  }

  // ── Cart ─────────────────────────────────────────────────────────────────
  const tableHasOpenOrder = (zone: FloorPlanZone, tblNr: string, cartRound: CartItem[]) => {
    const slotKey = tableOrderMapKey(zone, tblNr)
    const parked = tableOrders[slotKey]?.length ?? 0
    return parked > 0 || cartRound.length > 0
  }

  const addToCart = (product: MenuProduct, choices: SelectedChoice[] = []) => {
    scheduleAddToCartSound()
    const cartKey = choices.length > 0
      ? `${product.id}-${choices.map(c => c.choiceId).sort().join('-')}`
      : product.id!
    setCart(prev => {
      const existing = prev.find(i => i.cartKey === cartKey)
      const updated = existing
        ? prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { product, quantity: 1, choices, cartKey }]
      if (tableNumber) {
        updateTableStatus(tableNumber, tableHasOpenOrder(dineInFloorZone, tableNumber, updated), dineInFloorZone)
      }
      return updated
    })
  }

  handleProductClickRef.current = async (product: MenuProduct) => {
    if (blockSaleWithoutStaffIfNeededRef.current()) return
    if (product.id && productIdsWithOptionsSet.has(product.id)) {
      const opts = await getOptionsForProduct(product.id!)
      setOptionsModal({ product, options: opts, selected: [] })
    } else {
      addToCart(product)
    }
  }

  const handleProductClick = useCallback((product: MenuProduct) => {
    void handleProductClickRef.current(product)
  }, [])

  const handleCategorySelect = useCallback((cat: MenuCategory) => {
    startTransition(() => setSelectedCategory(cat))
  }, [])

  const handleCategoryClear = useCallback(() => {
    startTransition(() => setSelectedCategory(null))
  }, [])

  const toggleKassaQuickMenu = useCallback(() => {
    playClick()
    setQuickMenuPanelOpen((open) => !open)
  }, [])

  /** Open opties-modal om toppings/sauzen van een mandregel te wijzigen (alle tenants). */
  const openEditCartItem = async (item: CartItem) => {
    if (demoViewOnly) return
    const pid = item.product.id
    if (!pid || String(pid).startsWith('custom-')) return
    if (!productIdsWithOptionsSet.has(pid)) return
    const opts = await getOptionsForProduct(pid)
    playClick()
    setOptionsModal({
      product: item.product,
      options: opts,
      selected: item.choices?.length ? [...item.choices] : [],
      editingCartKey: item.cartKey,
    })
  }

  const toggleChoice = (option: ProductOption, choice: ProductOptionChoice) => {
    setOptionsModal(prev => {
      if (!prev) return prev
      const isSingle = option.type === 'single'
      const alreadySelected = prev.selected.find(s => s.choiceId === choice.id)
      let newSelected: SelectedChoice[]
      if (alreadySelected) {
        newSelected = prev.selected.filter(s => s.choiceId !== choice.id)
      } else if (isSingle) {
        newSelected = [...prev.selected.filter(s => s.optionId !== option.id!), {
          optionId: option.id!, optionName: option.name,
          choiceId: choice.id!, choiceName: choice.name, price: choice.price
        }]
      } else {
        newSelected = [...prev.selected, {
          optionId: option.id!, optionName: option.name,
          choiceId: choice.id!, choiceName: choice.name, price: choice.price
        }]
      }
      return { ...prev, selected: newSelected }
    })
  }

  const confirmOptions = () => {
    if (!optionsModal) return
    const missing = optionsModal.options.filter(o => o.required && !optionsModal.selected.find(s => s.optionId === o.id))
    if (missing.length > 0) {
      playClick()
      alert(t('kassaApp.optionChoosePrompt').replace('{name}', missing[0].name))
      return
    }

    const { product, selected, editingCartKey } = optionsModal
    if (!editingCartKey && blockSaleWithoutStaffIfNeededRef.current()) return

    if (editingCartKey) {
      scheduleAddToCartSound()
      const oldQty = cart.find(i => i.cartKey === editingCartKey)?.quantity ?? 1
      const cartKey =
        selected.length > 0
          ? `${product.id}-${selected.map(c => c.choiceId).sort().join('-')}`
          : product.id!

      setCart(prev => {
        const without = prev.filter(i => i.cartKey !== editingCartKey)
        const existing = without.find(i => i.cartKey === cartKey)
        let updated: CartItem[]
        if (existing) {
          updated = without.map(i =>
            i.cartKey === cartKey ? { ...i, quantity: i.quantity + oldQty } : i
          )
        } else {
          updated = [...without, { product, quantity: oldQty, choices: selected, cartKey }]
        }
        if (tableNumber) {
          updateTableStatus(tableNumber, tableHasOpenOrder(dineInFloorZone, tableNumber, updated), dineInFloorZone)
        }
        return updated
      })
    } else {
      addToCart(product, selected)
    }
    setOptionsModal(null)
  }

  const updateQty = (cartKey: string, qty: number) => {
    if (qty <= 0) scheduleKassaTapSound(playRemove)
    else scheduleKassaTapSound(playClick)
    setCart(prev => {
      const updated = qty <= 0
        ? prev.filter(i => i.cartKey !== cartKey)
        : prev.map(i => i.cartKey === cartKey ? { ...i, quantity: qty } : i)
      if (tableNumber) {
        updateTableStatus(tableNumber, tableHasOpenOrder(dineInFloorZone, tableNumber, updated), dineInFloorZone)
      }
      return updated
    })
  }

  const activeTableSlotKey = useMemo(() => {
    if (orderType !== 'DINE_IN' || !tableNumber) return null
    return tableOrderMapKey(dineInFloorZone, tableNumber)
  }, [orderType, tableNumber, dineInFloorZone])

  const parkedOnTableLines = useMemo((): CartItem[] => {
    if (!activeTableSlotKey) return []
    return tableOrders[activeTableSlotKey] ?? []
  }, [activeTableSlotKey, tableOrders])

  /** Alleen «Al op tafel», geen kar/numpad: lijst vult het zwarte vlak. */
  const parkedOnlySidebarView = useMemo(
    () => !numpadPanelVisible && cart.length === 0 && parkedOnTableLines.length > 0,
    [numpadPanelVisible, cart.length, parkedOnTableLines.length],
  )

  /** Volledige rekening (op tafel + deze ronde) voor totaal, betalen en voorlopige bon. */
  const billLines = useMemo((): CartItem[] => {
    if (activeTableSlotKey) return mergeCartLinesForTable(parkedOnTableLines, cart)
    return cart
  }, [activeTableSlotKey, parkedOnTableLines, cart])

  const total = useMemo(
    () =>
      billLines.reduce((sum, i) => {
        const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
        return sum + (i.product.price + choicesTotal) * i.quantity
      }, 0),
    [billLines],
  )

  const draftBonLineItems = billLines

  const draftBonTotal = useMemo(
    () =>
      draftBonLineItems.reduce((sum, i) => {
        const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
        return sum + (i.product.price + choicesTotal) * i.quantity
      }, 0),
    [draftBonLineItems],
  )

  /** Compacte chrome (boven/onder) zodat productveld maximaal ruimte houdt. */
  const kassaSidebarFooterTier = useMemo<'comfort' | 'compact' | 'dense'>(() => {
    const n = billLines.length
    if (n === 0) return 'compact'
    return 'dense'
  }, [billLines.length])

  useEffect(() => {
    if (cart.length === 0) return
    const el = cartLinesScrollRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [cart.length])

  const pickerTables = kassaTablesByZone[pickerBrowseZone]
  const pickerStools = kassaStoolsByZone[pickerBrowseZone]

  const onFloorPlanTablesPersisted = useCallback((zone: FloorPlanZone, tables: FloorPlanTable[]) => {
    const fixed = sanitizeFloorPlanTables(tables)
    setKassaTablesByZone((prev) => ({ ...prev, [zone]: fixed }))
    localStorage.setItem(floorPlanTablesLocalStorageKey(tenant, zone), JSON.stringify(fixed))
  }, [tenant])

  const onFloorPlanTablesPersistLifecycle = useCallback((zone: FloorPlanZone, phase: 'start' | 'end') => {
    if (phase === 'start') {
      floorPlanTablesPersistInflightRef.current[zone] =
        (floorPlanTablesPersistInflightRef.current[zone] ?? 0) + 1
    } else {
      const n = (floorPlanTablesPersistInflightRef.current[zone] ?? 1) - 1
      if (n <= 0) {
        const next = { ...floorPlanTablesPersistInflightRef.current }
        delete next[zone]
        floorPlanTablesPersistInflightRef.current = next
      } else {
        floorPlanTablesPersistInflightRef.current[zone] = n
      }
    }
  }, [])

  const switchConfirmParsed = switchConfirm ? parseTableOrderMapKey(switchConfirm) : null
  const switchConfirmDisplay =
    switchConfirmParsed != null
      ? switchConfirmParsed.zone === FLOOR_PLAN_ZONE_TERRACE
        ? `${switchConfirmParsed.tableNumber} (${t('kassaApp.floorZoneTerrace')})`
        : switchConfirmParsed.tableNumber
      : ''

  /** Klantscherm: vooraf gelokaliseerde regel tafel + zone (BroadcastChannel). */
  const customerDisplayDineInSubtitle = useMemo((): string | undefined => {
    if (orderType !== 'DINE_IN' || !tableNumber) return undefined
    const zoneLabel =
      dineInFloorZone === FLOOR_PLAN_ZONE_TERRACE
        ? t('kassaApp.floorZoneTerrace')
        : t('kassaApp.floorZoneInside')
    return t('kassaCustomerDisplay.dineInTableZoneLine')
      .replace(/\{number\}/g, String(tableNumber))
      .replace(/\{zone\}/g, zoneLabel)
  }, [orderType, tableNumber, dineInFloorZone, t])

  const openKlantschermWindow = useCallback(() => {
    if (typeof window === 'undefined') return
    let tok = customerDisplayToken
    if (!tok) {
      try {
        const saved = sessionStorage.getItem(`vysion_klantscherm_${tenant}`)?.trim()
        if (saved) {
          tok = saved
          setCustomerDisplayToken(saved)
        }
      } catch {
        /* ignore */
      }
    }
    if (!tok) {
      tok =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      try {
        sessionStorage.setItem(`vysion_klantscherm_${tenant}`, tok)
      } catch {
        /* ignore */
      }
      setCustomerDisplayToken(tok)
    }
    const url = `${window.location.origin}/shop/${tenant}/klantscherm?t=${encodeURIComponent(tok)}`
    const winName = `vysion_klantscherm_${tenant}`

    const cached = readCachedSecondaryBounds()
    const heuristic = heuristicSecondaryBoundsSync(window.screen)
    const syncBounds = cached ?? heuristic

    let features =
      'popup=yes,width=520,height=380,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes'
    if (syncBounds) {
      features = buildCustomerDisplayPopupFeatures(syncBounds)
    }

    const w = window.open(url, winName, features)
    if (!w) {
      window.alert(t('kassaApp.customerDisplayOpenFailed'))
      return
    }

    if (syncBounds) {
      applyCustomerDisplayWindowBounds(w, syncBounds)
      pulseApplyCustomerDisplayBounds(w, syncBounds, 12_000)
    }

    const reposition = async () => {
      const fresh = await resolveSecondaryBoundsViaApi(window)
      const bounds = fresh ?? syncBounds
      if (fresh) writeCachedSecondaryBounds(fresh)
      if (bounds && !w.closed) {
        pulseApplyCustomerDisplayBounds(w, bounds, 12_000)
        await positionCustomerDisplayWindow(w)
        await new Promise((r) => setTimeout(r, 120))
        await positionCustomerDisplayWindow(w)
      }
    }
    void reposition()
  }, [tenant, customerDisplayToken, t])

  /** Mand + bon: categorievolgorde uit menu (niet tikvolgorde). */
  const cartLinesByCategory = useMemo(
    () => sortKassaCartLinesByMenuCategory(cart, categories),
    [cart, categories],
  )

  const parkedLinesByCategory = useMemo(
    () => sortKassaCartLinesByMenuCategory(parkedOnTableLines, categories),
    [parkedOnTableLines, categories],
  )

  const billLinesByCategory = useMemo(
    () => sortKassaCartLinesByMenuCategory(billLines, categories),
    [billLines, categories],
  )

  useEffect(() => {
    const bc = customerDisplayBcRef.current
    if (!bc || !customerDisplayToken) return

    const businessName =
      tenantInfo?.business_name ??
      tenant
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    const fallbackVatRate = normalizeCategoryVatPercent(tenantInfo?.btw_percentage ?? 6, 21)
    const totalInclVat = Math.round(total * 100) / 100

    let msg: KassaCustomerDisplayMessage
    const thankYouActive =
      customerDisplayThankYou !== null && Date.now() < customerDisplayThankYou.until

    if (thankYouActive && customerDisplayThankYou) {
      msg = {
        v: 1,
        phase: 'thankYou',
        tenantSlug: tenant,
        businessName,
        totalInclVat: customerDisplayThankYou.total,
        dineInSubtitle: customerDisplayThankYou.dineInSubtitle,
      }
    } else if (billLines.length === 0 && !showPaymentModal && !showSplitModal) {
      msg = { v: 1, phase: 'idle', tenantSlug: tenant, businessName }
    } else if ((showPaymentModal || showSplitModal) && billLines.length > 0) {
      const splitCd = computeInclusiveVatSplitFromCart(billLines, resolveCartLineVat)
      const subtotalExVat = splitCd.subtotalExcl
      const vatAmount = splitCd.totalTax
      const vatLines =
        splitCd.byRate.length > 1
          ? splitCd.byRate.map((l) => ({ rate: l.rate, amount: l.tax }))
          : undefined
      const vatRate = splitCd.byRate.length === 1 ? splitCd.byRate[0].rate : fallbackVatRate
      msg = {
        v: 1,
        phase: 'checkout',
        tenantSlug: tenant,
        businessName,
        lines: buildKassaCustomerDisplayLines(billLinesByCategory),
        subtotalExVat,
        vatRate,
        vatAmount,
        ...(vatLines ? { vatLines } : {}),
        totalInclVat,
        dineInSubtitle: customerDisplayDineInSubtitle,
      }
    } else if (billLines.length > 0) {
      msg = {
        v: 1,
        phase: 'cart',
        tenantSlug: tenant,
        businessName,
        lines: buildKassaCustomerDisplayLines(billLinesByCategory),
        totalInclVat,
        dineInSubtitle: customerDisplayDineInSubtitle,
      }
    } else {
      msg = { v: 1, phase: 'idle', tenantSlug: tenant, businessName }
    }

    const tmr = window.setTimeout(() => {
      try {
        bc.postMessage(msg)
      } catch {
        /* ignore */
      }
    }, 60)
    return () => window.clearTimeout(tmr)
  }, [
    tenant,
    customerDisplayToken,
    billLines,
    billLinesByCategory,
    total,
    showPaymentModal,
    showSplitModal,
    tenantInfo?.business_name,
    tenantInfo?.btw_percentage,
    customerDisplayThankYou,
    customerDisplayDineInSubtitle,
    resolveCartLineVat,
  ])

  /** Totaal per product-id voor tegel-badge; vermijdt O(producten × mandregels) bij elke qty-wijziging. */
  const cartQtyByProductId = useMemo(() => {
    const m = new Map<string, number>()
    for (const line of cart) {
      const id = line.product.id
      if (!id || String(id).startsWith('custom-')) continue
      const key = String(id)
      m.set(key, (m.get(key) ?? 0) + line.quantity)
    }
    return m
  }, [cart])

  /** Categorietegel-foto: eigen `image_url` als gezet, anders eerste productfoto in categorie. */
  const categoryTileImageByCategoryId = useMemo(() => {
    const m = new Map<string, { url: string }>()
    for (const c of categories) {
      const id = c.id != null ? String(c.id) : ''
      const u = (c.image_url || '').trim()
      if (id && u) m.set(id, { url: u })
    }
    for (const p of products) {
      const cid = p.category_id
      if (!cid || !p.image_url) continue
      const key = String(cid)
      if (!m.has(key)) m.set(key, { url: p.image_url })
    }
    return m
  }, [categories, products])

  const productsInSelectedCategory = useMemo(() => {
    if (!selectedCategory) return []
    return products
      .filter(p => p.category_id === selectedCategory.id)
      .sort(compareMenuProductsBySortOrder)
  }, [products, selectedCategory])

  const productGridById = useMemo(() => {
    const m = new Map<string, MenuProduct>()
    for (const p of productsInSelectedCategory) {
      if (p.id != null) m.set(String(p.id), p)
    }
    return m
  }, [productsInSelectedCategory])

  const categoryGridById = useMemo(() => {
    const m = new Map<string, MenuCategory>()
    for (const c of categories) {
      if (c.id != null) m.set(String(c.id), c)
    }
    return m
  }, [categories])

  const handleProductGridPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const chip = (e.target as HTMLElement).closest('[data-kassa-product-id]')
    productTilePointerRef.current =
      chip instanceof HTMLElement ? { pointerId: e.pointerId, x: e.clientX, y: e.clientY, chip } : null
  }, [])

  const handleProductGridPointerCancel = useCallback(() => {
    productTilePointerRef.current = null
  }, [])

  const handleProductGridPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const start = productTilePointerRef.current
      productTilePointerRef.current = null
      if (!start || start.pointerId !== e.pointerId) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const dx = Math.abs(e.clientX - start.x)
      const dy = Math.abs(e.clientY - start.y)
      if (dx > KASSA_TILE_TAP_SLOP_PX || dy > KASSA_TILE_TAP_SLOP_PX) return
      const endChip = (e.target as HTMLElement).closest('[data-kassa-product-id]')
      if (!(endChip instanceof HTMLElement) || endChip !== start.chip) return
      const id = endChip.dataset.kassaProductId
      if (!id) return
      const picked = productGridById.get(id)
      if (!picked) return
      suppressProductGridClickRef.current = true
      void handleProductClick(picked)
    },
    [productGridById, handleProductClick],
  )

  const handleProductGridClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (suppressProductGridClickRef.current) {
        suppressProductGridClickRef.current = false
        return
      }
      const el = (e.target as HTMLElement).closest('[data-kassa-product-id]')
      if (!el || !(el instanceof HTMLElement)) return
      const id = el.dataset.kassaProductId
      if (!id) return
      const picked = productGridById.get(id)
      if (picked) void handleProductClick(picked)
    },
    [productGridById, handleProductClick],
  )

  const handleCategoryGridPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const chip = (e.target as HTMLElement).closest('[data-kassa-category-id]')
    categoryTilePointerRef.current =
      chip instanceof HTMLElement ? { pointerId: e.pointerId, x: e.clientX, y: e.clientY, chip } : null
  }, [])

  const handleCategoryGridPointerCancel = useCallback(() => {
    categoryTilePointerRef.current = null
  }, [])

  const handleCategoryGridPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const start = categoryTilePointerRef.current
      categoryTilePointerRef.current = null
      if (!start || start.pointerId !== e.pointerId) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const dx = Math.abs(e.clientX - start.x)
      const dy = Math.abs(e.clientY - start.y)
      if (dx > KASSA_TILE_TAP_SLOP_PX || dy > KASSA_TILE_TAP_SLOP_PX) return
      const endChip = (e.target as HTMLElement).closest('[data-kassa-category-id]')
      if (!(endChip instanceof HTMLElement) || endChip !== start.chip) return
      const id = endChip.dataset.kassaCategoryId
      if (!id) return
      const picked = categoryGridById.get(id)
      if (!picked) return
      suppressCategoryGridClickRef.current = true
      handleCategorySelect(picked)
    },
    [categoryGridById, handleCategorySelect],
  )

  const handleCategoryGridClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (suppressCategoryGridClickRef.current) {
        suppressCategoryGridClickRef.current = false
        return
      }
      const el = (e.target as HTMLElement).closest('[data-kassa-category-id]')
      if (!el || !(el instanceof HTMLElement)) return
      const id = el.dataset.kassaCategoryId
      if (!id) return
      const picked = categoryGridById.get(id)
      if (picked) handleCategorySelect(picked)
    },
    [categoryGridById, handleCategorySelect],
  )

  const handleCategoryStripPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const chip = (e.target as HTMLElement).closest('[data-kassa-strip-category-id]')
    categoryStripPointerRef.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      chip: chip instanceof HTMLElement ? chip : null,
      scrollLeft: kassaCategoryStripRef.current?.scrollLeft ?? 0,
    }
  }, [])

  const handleCategoryStripPointerCancel = useCallback(() => {
    categoryStripPointerRef.current = null
  }, [])

  const handleCategoryStripPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const start = categoryStripPointerRef.current
      categoryStripPointerRef.current = null
      if (!start || start.pointerId !== e.pointerId) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (!start.chip) return

      const scrollEl = kassaCategoryStripRef.current
      if (
        scrollEl &&
        Math.abs(scrollEl.scrollLeft - start.scrollLeft) > KASSA_STRIP_SCROLL_DELTA_PX
      ) {
        return
      }

      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)
      if (adx > KASSA_STRIP_SCROLL_AXIS_MIN_PX && adx >= ady) return
      if (adx > KASSA_STRIP_TAP_SLOP_PX || ady > KASSA_STRIP_TAP_SLOP_PX) return

      const endChip = (e.target as HTMLElement).closest('[data-kassa-strip-category-id]')
      if (!(endChip instanceof HTMLElement) || endChip !== start.chip) return
      const id = endChip.dataset.kassaStripCategoryId
      if (!id) return
      const picked = categoryGridById.get(id)
      if (!picked) return
      suppressCategoryStripClickRef.current = true
      handleCategorySelect(picked)
    },
    [categoryGridById, handleCategorySelect],
  )

  const handleCategoryStripClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (suppressCategoryStripClickRef.current) {
        suppressCategoryStripClickRef.current = false
        return
      }
      const el = (e.target as HTMLElement).closest('[data-kassa-strip-category-id]')
      if (!el || !(el instanceof HTMLElement)) return
      const id = el.dataset.kassaStripCategoryId
      if (!id) return
      const picked = categoryGridById.get(id)
      if (picked) handleCategorySelect(picked)
    },
    [categoryGridById, handleCategorySelect],
  )

  // ── Numpad ────────────────────────────────────────────────────────────────
  const handleNumpad = useCallback((key: string) => {
    setNumpadValue((prev) => {
      if (key === 'C') return ''
      if (key === '=') {
        try {
          const expr = prev.replace(/×/g, '*')
          // eslint-disable-next-line no-new-func
          const result = Function('"use strict"; return (' + expr + ')')()
          return String(result)
        } catch {
          return prev
        }
      }
      if (['+', '-', '×'].includes(key)) {
        if (prev && !['+', '-', '×'].some((op) => prev.endsWith(op))) return prev + key
        return prev
      }
      if (key === '.') {
        const parts = prev.split(/[+\-×]/)
        if (!parts[parts.length - 1]?.includes('.')) return prev + '.'
        return prev
      }
      return prev + key
    })
  }, [])

  const addCustomAmount = () => {
    const amount = parseFloat(numpadValue)
    if (amount > 0) {
      const custom: MenuProduct = {
        id: `custom-${Date.now()}`,
        tenant_slug: tenant,
        category_id: null,
        name: `Bedrag €${amount.toFixed(2)}`,
        description: '',
        price: amount,
        image_url: '',
        is_active: true,
        is_popular: false,
        sort_order: 0,
        allergens: [],
      }
      setCart((prev) => {
        const updated = [...prev, { product: custom, quantity: 1, cartKey: custom.id! }]
        if (tableNumber) {
          updateTableStatus(tableNumber, tableHasOpenOrder(dineInFloorZone, tableNumber, updated), dineInFloorZone)
        }
        return updated
      })
      setNumpadValue('')
    }
  }

  const selectOrderType = useCallback((type: OrderType) => {
    playClick()
    setOrderType(type)
  }, [])

  useKassaOfflineFlushBridge(tenant, flushOfflineOrdersRef)

  const clearTableAfterPayment = (zone: FloorPlanZone, tblNr: string) => {
    const slotKey = tableOrderMapKey(zone, tblNr)
    cancelPersistTimer(slotKey)
    removeBarBonWatermarkSlot(tenant, slotKey)
    const updated = { ...tableOrders }
    delete updated[slotKey]
    setTableOrders(updated)
    localStorage.setItem(tableOrdersKey, JSON.stringify(updated))
    updateTableStatus(tblNr, false, zone)
    const stoolStatusKey =
      zone === FLOOR_PLAN_ZONE_INSIDE
        ? `vysion_stool_status_${tenant}`
        : `vysion_stool_status_terrace_${tenant}`
    try {
      const raw = localStorage.getItem(stoolStatusKey)
      if (raw) {
        const statuses = JSON.parse(raw)
        if (statuses[tblNr]) {
          delete statuses[tblNr]
          localStorage.setItem(stoolStatusKey, JSON.stringify(statuses))
        }
      }
    } catch {
      /* empty */
    }
    void adminDb.delete(
      'orders',
      { tenant_slug: tenant, table_number: tblNr, status: 'open', floor_plan_zone: zone },
      { tenantSlug: tenant },
    )
    void adminDb.delete(
      'orders',
      { tenant_slug: tenant, table_number: tblNr, status: 'preparing', floor_plan_zone: zone },
      { tenantSlug: tenant },
    )
  }

  /** Kar leegmaken; bij tafel ook open mand + DB-order (na gele bon of bij fout). */
  const clearCart = () => {
    scheduleKassaTapSound(playRemove)
    setCart([])
    if (orderType === 'DINE_IN' && tableNumber) {
      clearTableAfterPayment(dineInFloorZone, tableNumber)
      return
    }
    if (tableNumber) {
      updateTableStatus(
        tableNumber,
        tableHasOpenOrder(dineInFloorZone, tableNumber, []),
        dineInFloorZone,
      )
    }
  }

  const completePayment = async (
    method: PaymentMethodType,
    splitAmounts?: { cash: number; card: number },
  ) => {
    if (billLines.length === 0) return

    if (method === 'SPLIT') {
      const sc = splitAmounts?.cash ?? 0
      const sd = splitAmounts?.card ?? 0
      if (Math.abs(total - sc - sd) > 0.02) return
    }

    invalidateMenuCategoriesCache(tenant)
    let freshVatLookup = categoryVatLookup
    try {
      const freshCats = dedupeCatalogById((await getMenuCategories(tenant)).filter((c) => c.is_active))
      freshVatLookup = buildCategoryVatLookup(freshCats)
      setCategories(freshCats)
    } catch {
      /* offline: bestaande lookup */
    }
    const resolveLineVatAtCheckout = (line: (typeof billLines)[number]) =>
      resolveVatPercentForProduct(line.product, freshVatLookup, tenantDefaultBtw)
    const vatSplit = computeInclusiveVatSplitFromCart(billLines, resolveLineVatAtCheckout)
    if (Math.abs(vatSplit.grossTotal - total) > 0.03) {
      console.warn('[kassa] btw-split vs mandtotaal mismatched', { split: vatSplit.grossTotal, total })
    }
    const subtotal = vatSplit.subtotalExcl
    const tax = vatSplit.totalTax
    const createdAt = new Date()
    const kassa_client_uuid =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${tenant}-${createdAt.getTime()}-${Math.random().toString(36).slice(2, 12)}`

    const shortRef = kassa_client_uuid.replace(/-/g, '').slice(-10).toUpperCase()

    const receiptTable = kassaReceiptTableNumber(orderType, tableNumber)
    const customerTableLabel = receiptTable
      ? (() => {
          let lbl = t('kassaReceipt.tableLabel').replace(/\{number\}/g, receiptTable)
          if (dineInFloorZone === FLOOR_PLAN_ZONE_TERRACE) {
            lbl = `${lbl} (${t('kassaApp.floorZoneTerrace')})`
          }
          return lbl
        })()
      : null

    const orderPayload: Record<string, unknown> = {
      tenant_slug: tenant,
      kassa_client_uuid,
      customer_name: customerTableLabel ?? t('kassaApp.walkInCustomerName'),
      status: 'confirmed',
      payment_status: 'paid',
      payment_method: method === 'SPLIT' ? 'SPLIT' : method,
      order_type: orderType,
      customer_notes: customerTableLabel,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: total,
      kassa_staff_id: activeKassaStaff?.id ?? null,
      items: billLines.map((i) => ({
        product_id: i.product.id,
        name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        btw_percentage: resolveLineVatAtCheckout(i),
        options: (i.choices || []).map((c: any) => ({ name: c.choiceName || c.name || '', price: c.price || 0 })),
      })),
      created_at: createdAt.toISOString(),
    }

    if (orderType === 'DINE_IN') {
      orderPayload.floor_plan_zone = tableNumber ? dineInFloorZone : FLOOR_PLAN_ZONE_INSIDE
    }
    if (orderType === 'DINE_IN' && tableNumber) {
      orderPayload.table_number = tableNumber
    }

    if (method === 'SPLIT' && splitAmounts) {
      orderPayload.payment_split_cash = Math.round(splitAmounts.cash * 100) / 100
      orderPayload.payment_split_card = Math.round(splitAmounts.card * 100) / 100
    }

    const insRes = await adminDb.insert(
      'orders',
      orderPayload as Record<string, unknown>,
      { tenantSlug: tenant, select: 'order_number' },
    )

    const insertedRow = (() => {
      if (!insRes.ok || insRes.data == null) return null
      const raw = insRes.data as unknown
      const row = (Array.isArray(raw) ? raw[0] : raw) as { order_number?: number } | undefined
      return row ?? null
    })()

    let allocatedOrderNumber = 0
    let queuedOffline = false

    const finishSuccessPath = () => {
      syncZReportAfterOrderSafe(tenant, createdAt.toISOString())
      playCashRegister()
      setTimeout(() => playSuccess(), 400)
    }

    if (insRes.ok && insertedRow?.order_number != null) {
      allocatedOrderNumber = Number(insertedRow.order_number)
      finishSuccessPath()
    } else if (insRes.ok && insertedRow?.order_number == null) {
      allocatedOrderNumber = await fetchOrderNumberByKassaClientUuid(supabase, tenant, kassa_client_uuid)
      if (allocatedOrderNumber <= 0) {
        console.error('Kassa: insert OK but order_number not resolved', { insertedRow, kassa_client_uuid })
        alert(`${t('kassaApp.orderPersistFailedTitle')}\n\n${t('kassaApp.orderPersistFailedBody')}`)
        return
      }
      finishSuccessPath()
    } else if (!insRes.ok && isDuplicateKassaClientViolation(insRes.error)) {
      allocatedOrderNumber = await fetchOrderNumberByKassaClientUuid(supabase, tenant, kassa_client_uuid)
      finishSuccessPath()
    } else if (
      !insRes.ok &&
      (insRes.status === 0 || insRes.status >= 500 || isLikelyOfflineOrNetworkPersistFailure(insRes.error))
    ) {
      const addToQueue = async () => {
        const queue = await mergeOfflineOrderQueues(tenant)
        if (
          !queue.some(
            (o: unknown) =>
              (o as { kassa_client_uuid?: string }).kassa_client_uuid === kassa_client_uuid,
          )
        ) {
          queue.push(orderPayload)
          await offlineDbSetOrderQueue(tenant, queue)
          localStorage.setItem(offlineQueueKey, JSON.stringify(queue))
        }
        try {
          const reg = await navigator.serviceWorker?.ready
          if (reg && 'sync' in reg) {
            await (
              reg as ServiceWorkerRegistration & {
                sync: { register: (tag: string) => Promise<void> }
              }
            ).sync.register('vysion-offline-orders')
          }
        } catch {
          /* Background Sync niet ondersteund */
        }
      }
      if ('locks' in navigator) {
        await (navigator as Navigator & { locks: LockManager }).locks.request(
          `vysion_queue_${tenant}`,
          async () => {
            await addToQueue()
          },
        )
      } else {
        await addToQueue()
      }
      queuedOffline = true
      alert(`${t('kassaApp.offlineModeActive')}\n\n${t('kassaApp.offlineOrderQueuedAlert').replace('{ref}', shortRef)}`)
      playCashRegister()
      setTimeout(() => playSuccess(), 400)
    } else {
      console.error('Kassa: admin order insert error:', insRes.error)
      alert(
        `${t('kassaApp.orderPersistFailedTitle')}\n\n${t('kassaApp.orderPersistFailedBody')}${insRes.error ? `\n\n(${insRes.error})` : ''}`,
      )
      return
    }

    setCustomerDisplayThankYou({
      total: Math.round(total * 100) / 100,
      until: Date.now() + KASSA_CUSTOMER_DISPLAY_THANK_YOU_MS,
      dineInSubtitle:
        orderType === 'DINE_IN' && tableNumber
          ? t('kassaCustomerDisplay.dineInTableZoneLine')
              .replace(/\{number\}/g, String(tableNumber))
              .replace(
                /\{zone\}/g,
                dineInFloorZone === FLOOR_PLAN_ZONE_TERRACE
                  ? t('kassaApp.floorZoneTerrace')
                  : t('kassaApp.floorZoneInside'),
              )
          : undefined,
    })

    setLastOrder({
      orderNumber: allocatedOrderNumber,
      checkoutReference: queuedOffline ? shortRef : undefined,
      items: sortKassaCartLinesByMenuCategory([...billLines], categories),
      total,
      vatSplit: vatSplit.byRate.map((l) => ({
        rate: l.rate,
        baseExcl: l.baseExcl,
        tax: l.tax,
      })),
      subtotalExclVat: Math.round(subtotal * 100) / 100,
      totalTax: Math.round(tax * 100) / 100,
      paymentMethod: method,
      splitCash: method === 'SPLIT' ? splitAmounts?.cash : undefined,
      splitCard: method === 'SPLIT' ? splitAmounts?.card : undefined,
      orderType,
      tableNumber: receiptTable,
      floorPlanZone: receiptTable ? dineInFloorZone : undefined,
      createdAt,
      helpedByStaffName: activeKassaStaff?.name?.trim() || null,
    })

    if (tableNumber && orderType === 'DINE_IN') clearTableAfterPayment(dineInFloorZone, tableNumber)

    clearCart()
    setTableNumber('')
    setDineInFloorZone(FLOOR_PLAN_ZONE_INSIDE)
    setShowPaymentModal(false)
    setShowSplitModal(false)
    if (tenantInfo?.kassa_staff_clock_enabled && !demoViewOnly) {
      setActiveKassaStaff(null)
    }
    setShowSuccessModal(true)
  }

  const printReceipt = async (
    order: typeof lastOrder,
    opts?: {
      draft?: boolean
      /** Alleen nieuwe regels t.o.v. vorige toogbon (tafelmand). */
      barTableDelta?: boolean
      /** Na geslaagde print: watermerk bijwerken (localStorage per tenant). */
      barWatermarkCommit?: { slotKey: string; row: Record<string, number> }
      /**
       * Alleen bij draft: 1 = gele Bon-knop / toog-delta; 2 = tap op zaaknaam in header (zelfde volume als betaalde bon).
       * Betaalde bon: altijd 2 — dit veld wordt genegeerd.
       */
      draftCopies?: 1 | 2
      /** Standaard kassa; keuken bij «naar tafel»-delta. */
      receiptMode?: 'kassa' | 'keuken'
    },
  ) => {
    if (!order) {
      setThermalPrintBanner({
        variant: 'error',
        message: 'Geen bon om te printen. Sluit dit bericht en probeer opnieuw.',
      })
      return
    }
    const isDraft = !!opts?.draft
    const barKitchenDelta = !!opts?.barTableDelta
    const receiptMode = opts?.receiptMode ?? 'kassa'
    const receiptTableNr = kassaReceiptTableNumber(order.orderType, order.tableNumber)

    if (!isDraft) {
      try {
        if (typeof window !== 'undefined') {
          const sk = kassaPaidReceiptDedupeStorageKey(tenant, order)
          if (window.sessionStorage.getItem(sk) === '1') return
        }
      } catch {
        /* sessionStorage onbereikbaar */
      }

      const key = kassaPaidReceiptGuardKey(order)
      const g = paidReceiptPrintGuardRef.current
      if (g.key !== key) {
        g.key = key
        g.printedOkOnce = false
        g.inFlight = false
      }
      if (g.printedOkOnce || g.inFlight) return
      g.inFlight = true
    } else {
      if (!barKitchenDelta) {
        const g = draftReceiptPrintGuardRef.current
        const now = Date.now()
        if (g.inFlight) return
        if (now - g.lastOkAt < KASSA_DRAFT_RECEIPT_COOLDOWN_MS) return
        g.inFlight = true
      }
    }

    try {
    const fbVatRate = normalizeCategoryVatPercent(tenantInfo?.btw_percentage ?? 6, 21)
    const splitOk =
      Array.isArray(order.vatSplit) &&
      order.vatSplit.length > 0 &&
      typeof order.subtotalExclVat === 'number' &&
      typeof order.totalTax === 'number'
    let subtotal: number
    let tax: number
    if (splitOk) {
      subtotal = Math.round((order.subtotalExclVat as number) * 100) / 100
      tax = Math.round((order.totalTax as number) * 100) / 100
    } else {
      subtotal = Math.round((order.total / (1 + fbVatRate / 100)) * 100) / 100
      tax = Math.round((order.total - subtotal) * 100) / 100
    }
    const orderTypeLabel =
      order.orderType === 'DINE_IN'
        ? `🍽️ ${t('kassaReceipt.orderTypeDineIn')}`
        : order.orderType === 'TAKEAWAY'
          ? `📦 ${t('kassaReceipt.orderTypeTakeaway')}`
          : `🚗 ${t('kassaReceipt.orderTypeDelivery')}`
    const receiptRefDisplay = isDraft
      ? barKitchenDelta
        ? t('kassaReceipt.barToogReceiptRef')
        : t('kassaReceipt.draftReceiptRef')
      : order.checkoutReference ??
        (order.orderNumber > 0 ? String(order.orderNumber) : '—')

    const payLabel = isDraft
      ? t('kassaReceipt.draftNotPaid')
      : order.paymentMethod === 'SPLIT'
        ? t('kassaReceipt.paidSplit')
            .replace('{cash}', (order.splitCash ?? 0).toFixed(2))
            .replace('{card}', (order.splitCard ?? 0).toFixed(2))
        : order.paymentMethod === 'CASH'
          ? t('kassaApp.payCash')
          : order.paymentMethod === 'CARD'
            ? t('kassaApp.payCard')
            : order.paymentMethod === 'IDEAL'
              ? t('kassaApp.payIdeal')
              : t('kassaApp.payBancontact')

    const docTitle = `${t('kassaReceipt.receiptNo')}${receiptRefDisplay}`
    const bizName = escapeReceiptHtml(tenantInfo?.business_name || t('kassaApp.defaultBusinessName'))
    const dateStr = order.createdAt.toLocaleString(appLocaleToBcp47(locale), {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

    const orderTypePlain =
      order.orderType === 'DINE_IN'
        ? t('kassaReceipt.orderTypeDineIn')
        : order.orderType === 'TAKEAWAY'
          ? t('kassaReceipt.orderTypeTakeaway')
          : t('kassaReceipt.orderTypeDelivery')

    const terraceSuffix =
      order.orderType === 'DINE_IN' && order.floorPlanZone === FLOOR_PLAN_ZONE_TERRACE
        ? ` (${t('kassaApp.floorZoneTerrace')})`
        : ''

    const bonLines: string[] = []
    bonLines.push(tenantInfo?.business_name || t('kassaApp.defaultBusinessName'))
    if (tenantInfo?.address) bonLines.push(tenantInfo.address)
    if (tenantInfo?.postal_code || tenantInfo?.city) {
      bonLines.push(`${tenantInfo.postal_code ?? ''} ${tenantInfo.city ?? ''}`.trim())
    }
    if (tenantInfo?.phone) bonLines.push(`${t('kassaReceipt.telPrefix')} ${tenantInfo.phone}`)
    bonLines.push('--------------------------------')
    if (isDraft) {
      if (barKitchenDelta) {
        bonLines.push(t('kassaReceipt.barToogBanner'))
        bonLines.push(t('kassaReceipt.barToogHint'))
      } else {
        bonLines.push(t('kassaReceipt.draftBanner'))
      }
      bonLines.push('--------------------------------')
    }
    bonLines.push(
      receiptTableNr
        ? `${orderTypePlain} | ${t('kassaReceipt.tablePrefix')} ${receiptTableNr}${terraceSuffix}`
        : orderTypePlain,
    )
    bonLines.push(`${t('kassaReceipt.receiptNo')}${receiptRefDisplay}  ${dateStr}`)
    bonLines.push('--------------------------------')
    const receiptLines = sortKassaCartLinesByMenuCategory(order.items, categories)
    for (const i of receiptLines) {
      const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
      const lineTotal = (i.product.price + choicesTotal) * i.quantity
      bonLines.push(`${i.quantity}x ${i.product.name}  EUR ${lineTotal.toFixed(2)}`)
      for (const c of i.choices || []) {
        bonLines.push(`  + ${c.choiceName}${c.price > 0 ? `  EUR ${c.price.toFixed(2)}` : ''}`)
      }
    }
    bonLines.push('--------------------------------')
    bonLines.push(`${t('kassaReceipt.subtotal')}  EUR ${subtotal.toFixed(2)}`)
    if (splitOk && order.vatSplit!.length >= 1) {
      for (const row of order.vatSplit!) {
        bonLines.push(
          `${t('kassaReceipt.vat').replace('{rate}', String(row.rate))}  EUR ${row.tax.toFixed(2)}`,
        )
      }
    } else {
      bonLines.push(`${t('kassaReceipt.vat').replace('{rate}', String(fbVatRate))}  EUR ${tax.toFixed(2)}`)
    }
    bonLines.push(`${t('kassaReceipt.total')}  EUR ${order.total.toFixed(2)}`)
    bonLines.push(`${t('kassaReceipt.paidWith')} ${payLabel}`)
    if (order.helpedByStaffName) {
      bonLines.push(t('kassaReceipt.helpedBy').replace('{name}', order.helpedByStaffName))
    }
    if (tenantInfo?.btw_number) {
      bonLines.push(t('kassaReceipt.businessVatLabel').replace('{vatNumber}', tenantInfo.btw_number))
    }
    bonLines.push(
      isDraft
        ? barKitchenDelta ? t('kassaReceipt.barToogFooter') : t('kassaReceipt.draftFooter')
        : t('kassaReceipt.thanks'),
    )
    if (tenantInfo?.website) bonLines.push(tenantInfo.website)

    /** Kassa-lade alleen openen bij contante betaling — PIN/online hebben dat niet nodig. Voorlopige bon: nooit. */
    const isCash =
      !isDraft && ['CASH', 'cash', 'CONTANT', 'contant'].includes(String(order.paymentMethod || ''))

    const paidCopies = 2
    const draftCopies = opts?.draftCopies === 2 ? 2 : 1
    const printResult = await sendToVysionPrintAgent({
      winkelnaam: tenantInfo?.business_name || t('kassaApp.defaultBusinessName'),
      bonInhoud: bonLines.join('\n'),
      /** Draft: 1 = gele Bon / toog-delta; 2 = zaaknaam in header. Betaald (afrekenen): altijd 2. */
      copies: isDraft ? draftCopies : paidCopies,
      openDrawer: isCash,
      receiptMode,
      orderData: {
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        tableNumber: receiptTableNr || null,
        items: order.items.map(i => ({
          quantity: i.quantity,
          name: i.product.name,
          price: (i.product.price + (i.choices || []).reduce((s, c) => s + c.price, 0)) * i.quantity,
          choices: (i.choices || []).map(c => ({ name: c.choiceName, price: c.price })),
        })),
        subtotal,
        tax,
        total: order.total,
        paymentMethod: order.paymentMethod,
      },
      businessInfo: {
        name: tenantInfo?.business_name,
        address: tenantInfo?.address ?? undefined,
        postalCode: tenantInfo?.postal_code ?? undefined,
        city: tenantInfo?.city ?? undefined,
        phone: tenantInfo?.phone ?? undefined,
        vatNumber: tenantInfo?.btw_number ?? undefined,
        website: tenantInfo?.website ?? undefined,
        vatRate: splitOk ? order.vatSplit![0].rate : fbVatRate,
      },
    })

    /** Alleen bij Print-Agent-fout op PC: HTML voor noodafdruk. Tablet/kiosk: géén browser-print (Chrome → alleen PDF, kiosk valt om). */
    const receiptHtml = !printResult.ok
      ? `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeReceiptHtml(docTitle)}</title><style>${KASSA_PRINT_RECEIPT_STYLES}</style></head><body>
      <div class="center">
        <div class="bold big">${bizName}</div>
        ${tenantInfo?.address ? `<div class="small">${escapeReceiptHtml(tenantInfo.address)}</div>` : ''}
        ${tenantInfo?.postal_code || tenantInfo?.city ? `<div class="small">${escapeReceiptHtml(tenantInfo.postal_code ?? '')} ${escapeReceiptHtml(tenantInfo.city ?? '')}</div>` : ''}
        ${tenantInfo?.phone ? `<div class="small">${escapeReceiptHtml(t('kassaReceipt.telPrefix'))} ${escapeReceiptHtml(tenantInfo.phone)}</div>` : ''}
      </div>
      <div class="divider"></div>
      ${isDraft ? `<div class="center bold">${escapeReceiptHtml(barKitchenDelta ? t('kassaReceipt.barToogBanner') : t('kassaReceipt.draftBanner'))}</div>${barKitchenDelta ? `<div class="center small">${escapeReceiptHtml(t('kassaReceipt.barToogHint'))}</div>` : ''}<div class="divider-solid"></div>` : ''}
      <div class="center order-type">${escapeReceiptHtml(orderTypeLabel)}${receiptTableNr ? `<br/>${escapeReceiptHtml(t('kassaReceipt.tablePrefix'))} ${escapeReceiptHtml(receiptTableNr)}${escapeReceiptHtml(terraceSuffix)}` : ''}</div>
      <div class="row small">
        <span>${escapeReceiptHtml(t('kassaReceipt.receiptNo'))}${escapeReceiptHtml(receiptRefDisplay)}</span>
        <span>${escapeReceiptHtml(dateStr)}</span>
      </div>
      <div class="divider-solid"></div>
      ${sortKassaCartLinesByMenuCategory(order.items, categories).map(i => {
        const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
        const lineTotal = (i.product.price + choicesTotal) * i.quantity
        return `<div class="row"><span>${i.quantity}x ${escapeReceiptHtml(i.product.name)}</span><span>€${lineTotal.toFixed(2)}</span></div>
        ${(i.choices || []).map(c => `<div class="row small" style="margin-left:15px;color:#666;"><span>+ ${escapeReceiptHtml(c.choiceName)}</span><span>${c.price > 0 ? '€' + c.price.toFixed(2) : ''}</span></div>`).join('')}`
      }).join('')}
      <div class="divider-solid"></div>
      <div class="row"><span>${escapeReceiptHtml(t('kassaReceipt.subtotal'))}</span><span>€${subtotal.toFixed(2)}</span></div>
      ${
        splitOk && order.vatSplit!.length >= 1
          ? order
              .vatSplit!.map(
                (l) =>
                  `<div class="row"><span>${escapeReceiptHtml(t('kassaReceipt.vat').replace('{rate}', String(l.rate)))}</span><span>€${l.tax.toFixed(2)}</span></div>`,
              )
              .join('')
          : `<div class="row"><span>${escapeReceiptHtml(t('kassaReceipt.vat').replace('{rate}', String(fbVatRate)))}</span><span>€${tax.toFixed(2)}</span></div>`
      }
      <div class="row total"><span>${escapeReceiptHtml(t('kassaReceipt.total'))}</span><span>€${order.total.toFixed(2)}</span></div>
      <div class="divider"></div>
      <div class="center small">${escapeReceiptHtml(t('kassaReceipt.paidWith'))} ${escapeReceiptHtml(payLabel)}</div>
      ${order.helpedByStaffName ? `<div class="divider"></div><div class="center bold">${t('kassaReceipt.helpedBy').replace('{name}', escapeReceiptHtml(order.helpedByStaffName))}</div>` : ''}
      <div class="divider"></div>
      <div class="center small">
        ${tenantInfo?.btw_number ? `${escapeReceiptHtml(t('kassaReceipt.businessVatLabel').replace('{vatNumber}', tenantInfo.btw_number))}<br/>` : ''}
        ${escapeReceiptHtml(isDraft ? (barKitchenDelta ? t('kassaReceipt.barToogFooter') : t('kassaReceipt.draftFooter')) : t('kassaReceipt.thanks'))}
        ${tenantInfo?.website ? `<br/>${escapeReceiptHtml(tenantInfo.website)}` : ''}
      </div>
    </body></html>`
        : ''

    flushSync(() => {
      if (printResult.ok) {
        /** Zelfde op tablet/desktop: geen losse succes-toast — voorkomt verschillende UX per apparaat. */
        setThermalPrintBanner(null)
      } else {
        setThermalPrintBanner({
          variant: 'error',
          message: `${t('kassaApp.printAgentFailedDebugTitle')}\n\n${printResult.error}\n\n${t('kassaApp.printAgentFailedDebugFooter')}`,
        })
        /** Zelfde nood-HTML overal; alleen bij Android geen browser-print bij „Doorgaan”. */
        setPrintAgentFallbackHtml(receiptHtml)
      }
    })
    if (printResult.ok) {
      if (!isDraft) {
        paidReceiptPrintGuardRef.current.printedOkOnce = true
        try {
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(kassaPaidReceiptDedupeStorageKey(tenant, order), '1')
          }
        } catch {
          /* quota / private mode */
        }
      } else {
        if (!barKitchenDelta) {
          draftReceiptPrintGuardRef.current.lastOkAt = Date.now()
        }
        const commit = opts?.barWatermarkCommit
        if (commit?.slotKey) {
          try {
            const st = loadBarBonWatermarks(tenant)
            st[commit.slotKey] = commit.row
            saveBarBonWatermarks(tenant, st)
          } catch {
            /* ignore */
          }
        }
      }
      return
    }
    } catch (printErr: unknown) {
      const msg = printErr instanceof Error ? printErr.message : String(printErr)
      setThermalPrintBanner({
        variant: 'error',
        message: `Bonafdruk fout:\n\n${msg}`,
      })
    } finally {
      if (!isDraft) paidReceiptPrintGuardRef.current.inFlight = false
      else if (!barKitchenDelta) draftReceiptPrintGuardRef.current.inFlight = false
    }
  }

  flushBarDeltaSlipRef.current = (zone, tblNr, snap, slipOpts) => {
    void (async () => {
      if (demoViewOnly || snap.length === 0) return
      const wantKitchen = slipOpts?.printKitchen === true
      const printKassaSlip = slipOpts?.printKassaSlip === true
      if (!wantKitchen && !printKassaSlip) return
      const slotKey = tableOrderMapKey(zone, tblNr)
      if (barDeltaSlotInflightRef.current[slotKey]) return
      barDeltaSlotInflightRef.current[slotKey] = true
      try {
        const store = loadBarBonWatermarks(tenant)
        const rawPrev = store[slotKey]
        const prev =
          rawPrev != null && typeof rawPrev === 'object' && !Array.isArray(rawPrev)
            ? (rawPrev as Record<string, number>)
            : {}
        const { deltaLines, nextWatermark } = computeBarBonDelta(snap, prev)
        if (deltaLines.length === 0) return

        const draftSplit = computeInclusiveVatSplitFromCart(deltaLines, resolveCartLineVat)
        const deltaTotal = draftSplit.grossTotal
        const draftOrder: KassaLastOrderReceipt = {
          orderNumber: 0,
          items: sortKassaCartLinesByMenuCategory(deltaLines, categories),
          total: deltaTotal,
          vatSplit: draftSplit.byRate.map((l) => ({
            rate: l.rate,
            baseExcl: l.baseExcl,
            tax: l.tax,
          })),
          subtotalExclVat: draftSplit.subtotalExcl,
          totalTax: draftSplit.totalTax,
          paymentMethod: 'CARD',
          orderType: 'DINE_IN',
          tableNumber: tblNr,
          floorPlanZone:
            zone === FLOOR_PLAN_ZONE_TERRACE ? FLOOR_PLAN_ZONE_TERRACE : FLOOR_PLAN_ZONE_INSIDE,
          createdAt: new Date(),
          helpedByStaffName: activeKassaStaff?.name ?? null,
        }

        const watermarkCommit = { slotKey, row: nextWatermark }

        const commitWatermarkOnly = () => {
          try {
            const st = loadBarBonWatermarks(tenant)
            st[watermarkCommit.slotKey] = watermarkCommit.row
            saveBarBonWatermarks(tenant, st)
          } catch {
            /* ignore */
          }
        }

        let kitchenAvailable = false
        if (wantKitchen) {
          const health = await fetchPrintAgentHealth()
          kitchenAvailable = printAgentHasDedicatedKitchenPrinter(health)
        }

        if (wantKitchen && kitchenAvailable) {
          await printReceipt(draftOrder, {
            draft: true,
            barTableDelta: true,
            receiptMode: 'keuken',
            barWatermarkCommit: printKassaSlip ? undefined : watermarkCommit,
          })
        } else if (wantKitchen && !kitchenAvailable) {
          commitWatermarkOnly()
        }

        if (printKassaSlip) {
          await printReceipt(draftOrder, {
            draft: true,
            barTableDelta: true,
            receiptMode: 'kassa',
            barWatermarkCommit: watermarkCommit,
          })
        }
      } catch {
        /* mand staat opgeslagen; print optioneel */
      } finally {
        delete barDeltaSlotInflightRef.current[slotKey]
      }
    })()
  }

  /**
   * Gele bon: altijd volledige mand/kar op de bon (incl. hele tafel).
   * Bij dine-in+tafel: na geslaagde print watermerk = volledige stand, zodat «Naar tafel» alleen nog delta print.
   */
  const printDraftBonFromCart = async (opts?: { draftCopies?: 1 | 2 }) => {
    if (draftBonLineItems.length === 0) return
    try {
      setDraftBonPrinting(true)
      playClick()

      let watermarkCommit: { slotKey: string; row: Record<string, number> } | undefined
      if (orderType === 'DINE_IN') {
        const tblNr = String(tableNumber ?? '').trim()
        if (tblNr !== '') {
          try {
            const slotKey = tableOrderMapKey(dineInFloorZone, tblNr)
            const { nextWatermark } = computeBarBonDelta(draftBonLineItems, {})
            watermarkCommit = { slotKey, row: nextWatermark }
          } catch {
            /* geen watermark-bijwerk bij bereken-fout — bon mag wél printen */
          }
        }
      }

      const draftSplit = computeInclusiveVatSplitFromCart(draftBonLineItems, resolveCartLineVat)
      const draftOrder: KassaLastOrderReceipt = {
        orderNumber: 0,
        items: sortKassaCartLinesByMenuCategory(draftBonLineItems, categories),
        total: draftBonTotal,
        vatSplit: draftSplit.byRate.map((l) => ({
          rate: l.rate,
          baseExcl: l.baseExcl,
          tax: l.tax,
        })),
        subtotalExclVat: draftSplit.subtotalExcl,
        totalTax: draftSplit.totalTax,
        paymentMethod: 'CARD',
        orderType,
        tableNumber: kassaReceiptTableNumber(orderType, tableNumber),
        floorPlanZone: orderType === 'DINE_IN' && tableNumber ? dineInFloorZone : undefined,
        createdAt: new Date(),
        helpedByStaffName: activeKassaStaff?.name ?? null,
      }

      await printReceipt(draftOrder, {
        draft: true,
        draftCopies: opts?.draftCopies ?? 1,
        ...(watermarkCommit ? { barWatermarkCommit: watermarkCommit } : {}),
      })
    } finally {
      setDraftBonPrinting(false)
    }
  }

  const printStaffClockSalesSummary = async () => {
    if (!staffClockSummary) return
    playClick()
    const s = staffClockSummary
    const biz = tenantInfo
      ? {
          name: tenantInfo.business_name,
          address: tenantInfo.address,
          postalCode: tenantInfo.postal_code,
          city: tenantInfo.city,
          phone: tenantInfo.phone,
          email: tenantInfo.email,
          btw_number: tenantInfo.btw_number,
        }
      : undefined
    const introLine = t('staffClock.summaryIntro').replace('{name}', s.staffName)
    const printedLine = t('staffClock.summaryReceiptPrinted').replace(
      '{date}',
      new Date().toLocaleString(appLocaleToBcp47(locale), {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    )
    await printStaffSalesSummaryReceipt({
      business: biz,
      labels: {
        docTitle: `${t('staffClock.summaryTitle')} — ${s.staffName}`,
        heading: t('staffClock.summaryTitle'),
        introLine,
        totalLabel: t('staffClock.summaryTotalLabel'),
        orderCountLine: t('staffClock.summaryOrderCount').replace('{count}', String(s.orderCount)),
        columnAmount: t('staffClock.summaryAmount'),
        noOrdersLine: t('staffClock.noOrdersToday'),
        printedLine,
      },
      total: s.total,
      orders: s.orders,
      staffName: s.staffName,
      summaryHeading: t('staffClock.summaryTitle'),
      introLine,
      printedLine,
    })
  }

  const performLogout = () => {
    if (demoViewOnly) {
      clearPublicDemoSession()
      window.location.replace(`/shop/${tenant}/admin/kassa?demo=bekijk`)
      return
    }
    applyOwnerOnlyLogoutCleanup(tenant)
    setTerminalLogout({ kind: 'staff', tenantSlug: tenant })
    broadcastTenantOwnerLogout({ scope: 'owner', tenantSlug: tenant, landing: 'tenant-login' })
    const origin = window.location.origin
    const next = buildShopInternalReturnPath(tenant, window.location.pathname, window.location.search)
    const loginUrl = `${origin}/login?next=${encodeURIComponent(next)}`
    attemptCloseThenOrNavigate(() => {
      window.location.replace(appendKassaCloseTipToAbsoluteLoginUrl(loginUrl))
    })
  }

  const staffClockErrorText = (code: string) => {
    const key = `staffClock.errors.${code}`
    const msg = t(key)
    return msg === key ? t('staffClock.errors.unknown') : msg
  }

  const loadStaffClockList = useCallback(async (opts?: { background?: boolean }) => {
    const background = opts?.background === true
    if (!background) setStaffClockListLoading(true)
    try {
      const res = await authFetch(`/api/kassa/staff-clock?tenant_slug=${encodeURIComponent(tenant)}`, {
        cache: 'no-store',
      })
      const data = (await res.json()) as {
        ok?: boolean
        staff?: { id: string; name: string; hasOpenSession: boolean }[]
      }
      if (data.ok && data.staff) setStaffClockList(data.staff)
      else if (!background) setStaffClockList([])
    } catch {
      if (!background) setStaffClockList([])
    } finally {
      if (!background) setStaffClockListLoading(false)
      setStaffClockListHydrated(true)
    }
  }, [tenant])

  useEffect(() => {
    if (demoViewOnly) {
      setStaffClockListHydrated(true)
      return
    }
    if (!tenantInfo?.kassa_staff_clock_enabled) {
      setStaffClockListHydrated(true)
      return
    }
    setStaffClockListHydrated(false)
    void loadStaffClockList({ background: true })
  }, [tenant, demoViewOnly, tenantInfo?.kassa_staff_clock_enabled, loadStaffClockList])

  const openStaffClockModal = () => {
    playClick()
    staffClockPinReqGen.current += 1
    setStaffClockBusy(false)
    setStaffClockOpen(true)
    setStaffClockPinModal(null)
    setStaffClockPinInput('')
    setStaffClockPinError(null)
    void loadStaffClockList({ background: staffClockList.length > 0 })
  }

  const submitStaffClockPin = async () => {
    const modal = staffClockPinModal
    if (!modal) return
    const pin = staffClockPinInput.trim()
    if (!pin) {
      playClick()
      setStaffClockPinError(t('staffClock.pinRequired'))
      return
    }
    const reqGen = ++staffClockPinReqGen.current
    setStaffClockBusy(true)
    setStaffClockPinError(null)
    try {
      const res = await authFetch('/api/kassa/staff-clock', {
        method: 'POST',
        body: JSON.stringify({
          tenant_slug: tenant,
          staff_id: modal.staffId,
          pin,
          action: modal.action,
        }),
      })
      let data: {
        ok?: boolean
        error?: string
        staffName?: string
        summary?: { total: number; order_count: number; orders: { order_number: number; total: number }[] }
      }
      try {
        data = (await res.json()) as typeof data
      } catch {
        if (staffClockPinReqGen.current !== reqGen) return
        setStaffClockPinError(t('staffClock.errors.server'))
        return
      }
      if (staffClockPinReqGen.current !== reqGen) return
      if (data.ok) {
        playSuccess()
        setStaffClockPinModal(null)
        setStaffClockPinInput('')
        if (modal.action === 'out' && activeKassaStaff?.id === modal.staffId) {
          setActiveKassaStaff(null)
        }
        if (modal.action === 'out' && data.summary !== undefined) {
          setStaffClockSummary({
            staffName: data.staffName || modal.staffName,
            total: data.summary.total,
            orderCount: data.summary.order_count,
            orders: data.summary.orders || [],
          })
        }
        void loadStaffClockList({ background: true })
      } else {
        playClick()
        setStaffClockPinError(staffClockErrorText(data.error || 'unknown'))
      }
    } catch {
      if (staffClockPinReqGen.current !== reqGen) return
      setStaffClockPinError(t('staffClock.errors.server'))
    } finally {
      if (staffClockPinReqGen.current === reqGen) {
        setStaffClockBusy(false)
      }
    }
  }

  const startStaffSales = (s: { id: string; name: string }) => {
    flushSync(() => {
      staffClockPinReqGen.current += 1
      setStaffClockBusy(false)
      setActiveKassaStaff({ id: s.id, name: s.name })
      setStaffClockOpen(false)
      setStaffClockPinModal(null)
      setStaffClockPinInput('')
      setStaffClockPinError(null)
    })
    try {
      playSuccess()
    } catch {
      /* geluid optioneel — modal moet altijd dicht */
    }
  }

  const hasAnyStaffClockedIn = useMemo(
    () => staffClockList.some((s) => s.hasOpenSession),
    [staffClockList]
  )
  const showKassaStaffClockButton = useMemo(
    () => Boolean(tenantInfo?.kassa_staff_clock_enabled) && !demoViewOnly,
    [tenantInfo?.kassa_staff_clock_enabled, demoViewOnly],
  )

  const quickMenuAllowedSubmenuIds = useMemo(
    () => new Set(filteredHamburgerModules.flatMap((m) => m.items.map((i) => i.id))),
    [filteredHamburgerModules],
  )

  const kassaQuickMenuActions = useMemo(
    () =>
      [
        {
          key: 'addCategory',
          labelKey: 'kassaApp.quickMenuAddCategory',
          kind: 'nav' as const,
          href: `${baseUrl}/categorieen`,
          submenuId: 'sm_kassa_categorieen',
        },
        {
          key: 'addProduct',
          labelKey: 'kassaApp.quickMenuAddProduct',
          kind: 'nav' as const,
          href: `${baseUrl}/producten`,
          submenuId: 'sm_kassa_producten',
        },
        {
          key: 'clockOut',
          labelKey: 'kassaApp.quickMenuClockOut',
          kind: 'clock' as const,
          submenuId: 'sm_personeel_inuitklokken',
          requireStaffClock: true,
        },
        {
          key: 'sales',
          labelKey: 'kassaApp.quickMenuSales',
          kind: 'nav' as const,
          href: `${baseUrl}/verkoop`,
          submenuId: 'sm_rpt_verkoop',
        },
        {
          key: 'online',
          labelKey: 'kassaApp.quickMenuOnlineToggle',
          kind: 'nav' as const,
          href: `${baseUrl}/online-status`,
          submenuId: 'sm_online_status',
        },
        {
          key: 'openingHours',
          labelKey: 'kassaApp.quickMenuOpeningHours',
          kind: 'nav' as const,
          href: `${baseUrl}/openingstijden`,
          submenuId: 'sm_inst_opening',
        },
        {
          key: 'shopProfile',
          labelKey: 'kassaApp.quickMenuShopProfile',
          kind: 'nav' as const,
          href: `${baseUrl}/profiel`,
          submenuId: 'sm_web_profiel',
        },
        {
          key: 'orders',
          labelKey: 'kassaApp.quickMenuOrders',
          kind: 'nav' as const,
          href: `${baseUrl}/bestellingen`,
          submenuId: 'sm_orders_bestellingen',
        },
      ] as const,
    [baseUrl],
  )

  const isKassaQuickMenuActionEnabled = useCallback(
    (action: (typeof kassaQuickMenuActions)[number]) => {
      if ('requireStaffClock' in action && action.requireStaffClock && !showKassaStaffClockButton) {
        return false
      }
      return quickMenuAllowedSubmenuIds.has(action.submenuId)
    },
    [quickMenuAllowedSubmenuIds, showKassaStaffClockButton],
  )

  const kassaQuickMenuPanelBtnClass = useCallback(
    (enabled: boolean) =>
      [
        `flex min-h-[7.25rem] min-w-0 items-center justify-center px-1 py-2 text-center sm:min-h-[7.75rem] sm:px-1.5 leading-tight ${KASSA_SIDEBAR_FOOTER_BTN_LABEL}`,
        kassaAppearanceDark
          ? kassaPosQuickMenuPanelButtonClass()
          : `rounded-xl bg-[#161616] text-[#f0f0f0] ${KASSA_POS_QUICK_MENU_LIFT_SHADOW} hover:brightness-110 active:brightness-90`,
        !enabled ? 'pointer-events-none opacity-40' : '',
      ].join(' '),
    [kassaAppearanceDark],
  )
  const requiresStaffSelectionForSale = useMemo(
    () =>
      Boolean(tenantInfo?.kassa_staff_clock_enabled) &&
      !demoViewOnly &&
      (!staffClockListHydrated || hasAnyStaffClockedIn) &&
      !activeKassaStaff,
    [
      tenantInfo?.kassa_staff_clock_enabled,
      demoViewOnly,
      staffClockListHydrated,
      hasAnyStaffClockedIn,
      activeKassaStaff,
    ]
  )

  const blockSaleWithoutStaffIfNeeded = useCallback((): boolean => {
    if (!requiresStaffSelectionForSale) return false
    playClick()
    setProductStaffGatePopupOpen(true)
    return true
  }, [requiresStaffSelectionForSale])

  blockSaleWithoutStaffIfNeededRef.current = blockSaleWithoutStaffIfNeeded

  const paymentMethodOptions = useMemo<KassaPayOption[]>(
    () => [
      { method: 'CASH', label: t('kassaApp.payCash'), icon: '💵', color: '#10b981' },
      { method: 'CARD', label: t('kassaApp.payCard'), icon: '💳', color: '#3b82f6' },
      { method: 'IDEAL', label: t('kassaApp.payIdeal'), icon: '📱', color: '#ec4899' },
      { method: 'BANCONTACT', label: t('kassaApp.payBancontact'), icon: '🏦', color: '#f59e0b' },
    ],
    [t],
  )

  // ── Geluid activatie scherm (exact donor) — toon elke sessie ───────────
  if (showSoundActivation && !soundActivated && !demoViewOnly) {
    return (
      <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center p-8 ${ui.soundBackdrop}`}>
        <div className={`max-w-md text-center ${ui.soundHeading}`}>
          <div className="mb-8 text-8xl">🔔</div>
          <h1 className={`mb-4 text-4xl font-bold ${ui.soundHeading}`}>{t('kassaApp.soundTitle')}</h1>
          <p className={`mb-8 text-xl ${ui.soundBody}`}>
            {t('kassaApp.soundBody')}
            <br /><br />
            <strong className={ui.soundStrong}>{t('kassaApp.soundOncePerDay')}</strong>
          </p>
          <button
            onClick={activateSound}
            className="flex w-full transform items-center justify-center gap-4 rounded-2xl bg-green-500 py-6 text-2xl font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-green-600"
          >
            <span className="text-4xl">🔊</span>
            {t('kassaApp.soundActivateButton').toUpperCase()}
          </button>
          <p className={`mt-6 text-sm ${ui.soundMuted}`}>
            💡 {t('kassaApp.soundHintFooter')}
          </p>
        </div>
      </div>
    )
  }

  const kassaDarkHeaderBtnShell =
    'inline-flex shrink-0 touch-manipulation items-center justify-center whitespace-nowrap font-semibold transition-colors min-h-[2.35rem] px-3 py-2 sm:min-h-[2.6rem] sm:px-3.5 sm:py-2.5'

  const headerQuickLinkBtnClass = kassaAppearanceDark
    ? `${kassaDarkHeaderBtnShell} ${kassaPosButtonClass(false)}`
    : KASSA_HEADER_QUICK_LINK_BTN

  const headerUtilityBtnClass = (selected: boolean) =>
    kassaAppearanceDark ? `${kassaDarkHeaderBtnShell} gap-0.5 sm:gap-1 ${kassaPosButtonClass(selected)}` : ''

  const cartLineQtyBtnCompact = kassaSxgaDenseTiles && kassaSidebarFooterTier === 'dense'

  const kassaSidebarRowGapClass = kassaAppearanceDark
    ? kassaSxgaDenseTiles
      ? 'gap-2'
      : 'gap-4'
    : 'gap-1.5'

  const kassaSidebarActionLabelClass =
    kassaAppearanceDark && kassaSxgaDenseTiles
      ? 'text-center text-[11px] font-medium leading-tight tracking-[0.02em]'
      : kassaAppearanceDark
        ? `text-center ${KASSA_SIDEBAR_FOOTER_BTN_LABEL}`
        : 'text-center text-xs font-bold leading-tight sm:text-sm'

  const kassaSidebarZoneLabelClass =
    kassaAppearanceDark && kassaSxgaDenseTiles
      ? 'text-xs font-medium tracking-[0.02em]'
      : kassaAppearanceDark
        ? KASSA_POS_ZONE_BTN_LABEL
        : 'font-bold'

  const renderSidebarCartLine = (item: (typeof cartLinesByCategory)[number]) => {
    const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
    const lineTotal = ((item.product.price + choicesTotal) * item.quantity).toFixed(2)
    const thumbClass = kassaAppearanceDark
      ? `${KASSA_POS_CART_THUMB_SHELL} h-10 w-10`
      : `h-12 w-12 rounded-lg flex-shrink-0 ${ui.cartThumbPlaceholder}`

    return (
      <div key={item.cartKey} className={ui.cartRowBg}>
        {item.product.image_url ? (
          <img
            src={item.product.image_url}
            alt={item.product.name}
            decoding="async"
            loading="eager"
            onError={kassaProductImageRetryOnError}
            className={`${thumbClass} ${
              item.product.image_display_mode === 'contain' ? 'object-contain p-0.5' : 'object-cover'
            }`}
          />
        ) : (
          <div className={`${thumbClass} flex items-center justify-center text-xl`}>🍽️</div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className={`truncate font-bold ${ui.cartTitle} ${kassaAppearanceDark ? 'text-[13px] leading-tight' : 'text-sm'}`}
          >
            {item.product.name}
          </p>
          {item.choices && item.choices.length > 0 ? (
            <p className={`truncate text-xs ${ui.cartChoices}`}>{item.choices.map((c) => c.choiceName).join(', ')}</p>
          ) : null}
          <p
            className={`font-bold ${kassaAppearanceDark ? `text-xs ${ui.priceAccentClass}` : 'text-sm text-emerald-600'}`}
          >
            €{lineTotal}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => updateQty(item.cartKey, item.quantity - 1)}
            className={
              kassaAppearanceDark
                ? `touch-manipulation ${kassaPosCartQtyButtonClass(cartLineQtyBtnCompact)}`
                : `touch-manipulation rounded-lg bg-red-500 text-white font-bold flex items-center justify-center hover:bg-red-600 active:brightness-95 ${
                    cartLineQtyBtnCompact ? 'h-8 w-8 text-base' : 'h-9 w-9 text-lg'
                  }`
            }
            aria-label={item.quantity === 1 ? t('kassaApp.ariaRemoveLine') : t('kassaApp.ariaDecreaseQty')}
          >
            {item.quantity === 1 ? (
              <span
                className={kassaAppearanceDark ? 'text-[1.05rem] leading-none' : undefined}
                aria-hidden
              >
                🗑
              </span>
            ) : (
              '−'
            )}
          </button>
          {!demoViewOnly &&
            item.product.id &&
            !String(item.product.id).startsWith('custom-') &&
            productIdsWithOptionsSet.has(item.product.id) && (
              <button
                type="button"
                onClick={() => void openEditCartItem(item)}
                className={
                  kassaAppearanceDark
                    ? `touch-manipulation ${kassaPosCartQtyButtonClass(cartLineQtyBtnCompact)} text-sm`
                    : `touch-manipulation rounded-lg bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 active:brightness-95 ${
                        cartLineQtyBtnCompact ? 'h-8 w-8 text-sm' : 'h-9 w-9 text-sm'
                      }`
                }
                title={t('kassaApp.ariaEditOptions')}
                aria-label={t('kassaApp.ariaEditOptions')}
              >
                ✏️
              </button>
            )}
          <span className={`w-6 text-center text-base font-bold ${ui.numpadInput}`}>{item.quantity}</span>
          <button
            type="button"
            onClick={() => updateQty(item.cartKey, item.quantity + 1)}
            className={
              kassaAppearanceDark
                ? `touch-manipulation ${kassaPosCartQtyButtonClass(cartLineQtyBtnCompact)}`
                : `touch-manipulation rounded-lg bg-[#3C4D6B] text-white font-bold flex items-center justify-center hover:bg-[#2D3A52] active:brightness-95 ${
                    cartLineQtyBtnCompact ? 'h-8 w-8 text-base' : 'h-9 w-9 text-lg'
                  }`
            }
            aria-label={t('kassaApp.ariaIncreaseQty')}
          >
            +
          </button>
        </div>
      </div>
    )
  }

  const sidebarCartSectionLabelClass = kassaAppearanceDark
    ? 'shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-white/90'
    : `shrink-0 text-[10px] font-bold uppercase tracking-wide ${ui.numpadMeta}`

  const sidebarCartLinesScrollClass = kassaAppearanceDark
    ? 'min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain py-0.5'
    : 'min-h-0 flex-1 overflow-y-auto overscroll-y-contain'

  return (
    <div
      className="flex min-h-0 flex-col overflow-hidden h-[100svh] max-h-[100svh] supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh]"
      data-testid="kassa-app"
    >
      <LogoutSoftwareConfirmModal
        open={logoutSoftwareConfirmOpen}
        onCancel={() => setLogoutSoftwareConfirmOpen(false)}
        onConfirm={() => {
          setLogoutSoftwareConfirmOpen(false)
          performLogout()
        }}
      />
      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${ui.shellBg}`}>

      {/* ── Blauwe balk: één rij — kleine tenantnaam zodat snelkoppelingen naast elkaar passen zonder horizontale scrollbar ── */}
      <div
        className={`relative z-30 flex min-h-[56px] w-full min-w-0 shrink-0 items-center gap-1.5 px-2 py-2 sm:gap-2 sm:px-3 ${
          kassaAppearanceDark
            ? `pb-3 ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`
            : 'bg-black'
        }`}
      >

        {/* Backdrop sluit menu/flyout (printer-bridge-modal heeft eigen overlay) */}
        {(hamburgerOpen || flyoutOpen) && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setHamburgerOpen(false)
              setHamburgerSubOpen(null)
              setFlyoutOpen(null)
            }}
          />
        )}

        {/* ── Hamburger ── */}
        <div className="relative z-20 flex shrink-0 items-center gap-2">
          <button onClick={() => { setHamburgerOpen(!hamburgerOpen); setHamburgerSubOpen(null) }}
            className={`flex items-center gap-1.5 px-2 py-1.5 transition-colors sm:gap-2 sm:px-3 ${
              kassaAppearanceDark
                ? kassaPosButtonClass(true)
                : hamburgerOpen
                  ? 'rounded-xl bg-[#47c6fe] text-[#063042]'
                  : 'rounded-xl bg-[#58CCFF] text-[#063042] hover:bg-[#47c6fe]'
            }`}
            type="button"
            title={t('kassaApp.hamburgerMenu')}
            aria-expanded={hamburgerOpen}
          >
            <svg className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            <span className="font-bold text-[11px] leading-tight sm:text-xs">{t('kassaApp.hamburgerMenu')}</span>
          </button>
          {hamburgerOpen && (() => {
            const modules = filteredHamburgerModules
            const activeMod = modules.find(m => m.rowKey === hamburgerSubOpen)
            return (
              <div className="absolute top-full left-0 mt-1 flex z-30">
                {/* Eerste kolom: modules */}
                <div className={`${ui.flyMenuPanel} overflow-y-auto`} style={{ width: 240, maxHeight: '85vh' }}>
                  <div
                    className={`sticky top-0 rounded-t-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white ${
                      kassaAppearanceDark ? KASSA_POS_MENU_PLATE_SHELL_BG_CLASS : 'bg-[#1e293b]'
                    }`}
                  >
                    {t('adminLayout.menu')}
                  </div>
                  <Link
                    href={baseUrl}
                    prefetch={false}
                    onClick={() => {
                      setHamburgerOpen(false)
                      setHamburgerSubOpen(null)
                    }}
                    className={`flex items-center border-b ${ui.flyMenuDivider} px-4 py-3 text-sm font-semibold ${ui.flyMenuText} transition-colors ${ui.flyMenuRowHover}`}
                  >
                    <span>{t('adminLayout.overview')}</span>
                  </Link>
                  {modules.map(mod => (
                    <div key={mod.rowKey} className={`border-b ${ui.flyMenuDivider} last:border-0`}>
                      {(
                        <button onClick={() => setHamburgerSubOpen(hamburgerSubOpen === mod.rowKey ? null : mod.rowKey)}
                          className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${hamburgerSubOpen === mod.rowKey ? ui.flyMenuRowActive : ui.flyMenuRowHover}`}>
                          <span className={`font-semibold text-sm ${ui.flyMenuTextMuted}`}>
                            {mod.labelKey ? t(mod.labelKey) : mod.label}
                          </span>
                          <svg className={`w-4 h-4 ${ui.flyMenuChevron}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {/* Tweede popup rechts: sub-items */}
                {activeMod && (
                  <div className={`ml-2 overflow-y-auto self-start ${ui.flyMenuPanel}`} style={{ width: 220, maxHeight: '85vh' }}>
                    <div
                      className={`sticky top-0 rounded-t-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white ${
                        kassaAppearanceDark ? KASSA_POS_MENU_PLATE_SHELL_BG_CLASS : 'bg-[#1e293b]'
                      }`}
                    >
                      {activeMod.labelKey ? t(activeMod.labelKey) : activeMod.label}
                    </div>
                    {activeMod.items.map(item => (
                      <Link key={item.id} href={item.href} prefetch={item.href === baseUrl ? false : undefined} onClick={() => {
                        setHamburgerOpen(false)
                        setHamburgerSubOpen(null)
                      }}
                        className={`flex items-center px-4 py-3 ${ui.flyMenuRowHover} border-b ${ui.flyMenuDivider} text-sm ${ui.flyMenuTextMuted} transition-colors`}>
                        <span>{item.labelKey ? t(item.labelKey) : item.label}</span>
                      </Link>
                    ))}
                    {activeMod.rowKey === 'account' && (
                      <AccountMenuSessionBlock
                        tenantSlug={tenant}
                        onClose={() => { setHamburgerOpen(false); setHamburgerSubOpen(null) }}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5">
        <div
          className={`relative z-20 flex min-w-0 shrink-0 flex-col justify-center px-0.5 ${
            kassaSxgaDenseTiles
              ? 'ml-2 max-w-[6.5rem]'
              : 'ml-[1cm] max-w-[9rem] sm:max-w-[11rem] md:max-w-[14rem] lg:max-w-[16rem]'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              if (draftBonLineItems.length === 0 || draftBonPrinting) return
              void printDraftBonFromCart({ draftCopies: 2 })
            }}
            className="max-w-full truncate rounded-md px-1 py-0.5 text-center text-sm font-bold leading-tight tracking-tight text-white transition-colors hover:bg-white/15 active:bg-white/25 sm:text-base md:text-lg"
            title={t('kassaApp.cartBonTitle')}
            aria-label={`${tenantInfo?.business_name || tenant} — ${t('kassaApp.cartBonTitle')}`}
          >
            {tenantInfo?.business_name ||
              tenant.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </button>
        </div>

        {/* Snelkoppelingen: 4cm naar rechts op groot scherm; op 17″ 2cm extra naast zaaknaam */}
        <div
          className={`relative z-20 flex min-h-0 min-w-0 flex-1 items-center ${
            kassaSxgaDenseTiles ? 'ml-[2cm]' : 'ml-[4cm]'
          }`}
        >
          <nav
            aria-label={t('kassaApp.quickLinksAria')}
            className="flex min-h-0 min-w-0 flex-1 flex-nowrap items-center justify-start gap-1.5 sm:gap-2"
          >

          {effectiveAccess.reservaties && (
            <button
              type="button"
              onClick={() => {
                newReservAlertRef.current = null
                setNewReservAlert(null)
                setShowReservations(true)
              }}
              title={t('kassaApp.navReservations')}
              className={`relative ${headerQuickLinkBtnClass}`}
            >
              <span className={KASSA_HEADER_QUICK_LINK_LABEL}>{t('kassaApp.navReservations')}</span>
              {pendingReservCount > 0 && (
                <span className="absolute -right-1 -top-1.5 flex h-7 min-w-[26px] items-center justify-center rounded-full border-2 border-white bg-red-600 px-1.5 text-sm font-black text-white shadow-lg sm:-right-2 sm:-top-2">
                  {pendingReservCount}
                </span>
              )}
            </button>
          )}

          {!demoViewOnly && (
            <button
              type="button"
              onClick={openKlantschermWindow}
              title={t('kassaApp.customerDisplayHint')}
              aria-hidden={KASSA_HEADER_HIDE_CUSTOMER_DISPLAY_AND_SOUND}
              tabIndex={KASSA_HEADER_HIDE_CUSTOMER_DISPLAY_AND_SOUND ? -1 : 0}
              className={`relative ${headerQuickLinkBtnClass} ${
                KASSA_HEADER_HIDE_CUSTOMER_DISPLAY_AND_SOUND ? 'hidden' : ''
              }`}
            >
              <span className={KASSA_HEADER_QUICK_LINK_LABEL}>{t('kassaApp.openCustomerDisplay')}</span>
            </button>
          )}

          {effectiveAccess['online-bestellingen'] && (
            <Link
              href={`/shop/${tenant}/display`}
              title={t('kassaApp.navShopDisplay')}
              className={headerQuickLinkBtnClass}
            >
              <span className={KASSA_HEADER_QUICK_LINK_LABEL}>{t('kassaApp.navShopDisplay')}</span>
            </Link>
          )}

          {effectiveAccess['online-bestellingen'] && (
            <Link
              href={`/keuken/${tenant}`}
              title={t('kassaApp.navKitchenDisplay')}
              className={headerQuickLinkBtnClass}
            >
              <span className={KASSA_HEADER_QUICK_LINK_LABEL}>{t('kassaApp.navKitchenDisplay')}</span>
            </Link>
          )}

          <button
            type="button"
            onClick={toggleSound}
            aria-hidden={KASSA_HEADER_HIDE_CUSTOMER_DISPLAY_AND_SOUND}
            tabIndex={KASSA_HEADER_HIDE_CUSTOMER_DISPLAY_AND_SOUND ? -1 : 0}
            className={`${headerQuickLinkBtnClass} ${
              soundsOn || kassaAppearanceDark ? '' : 'bg-white/10 text-white hover:bg-white/20'
            } ${KASSA_HEADER_HIDE_CUSTOMER_DISPLAY_AND_SOUND ? 'hidden' : ''}`}
            title={soundsOn ? t('kassaApp.soundOnTitle') : t('kassaApp.soundOffTitle')}
          >
            <span className={KASSA_HEADER_QUICK_LINK_LABEL}>
              {soundsOn ? t('kassaApp.soundOnTitle') : t('kassaApp.soundOffTitle')}
            </span>
          </button>

          {isOnline !== null && (
            <div
              className={`inline-flex max-w-[6.5rem] shrink-0 items-center justify-center gap-0.5 leading-tight min-h-[2.35rem] sm:min-h-[2.6rem] sm:max-w-[8rem] md:max-w-none ${KASSA_HEADER_QUICK_LINK_LABEL} ${
                kassaAppearanceDark
                  ? isOnline
                    ? headerQuickLinkBtnClass
                    : `${kassaDarkHeaderBtnShell} ${kassaPosButtonClass(false)} bg-red-600/95 text-white`
                  : isOnline
                    ? 'rounded-xl bg-[#3C4D6B] px-3 py-2 font-bold text-white'
                    : 'rounded-xl bg-red-600/95 px-3 py-2 font-bold text-white'
              }`}
              title={isOnline ? t('kassaApp.onlineModeLiveTitle') : t('kassaApp.offlineModeActive')}
              role="status"
              aria-live="polite"
            >
              <span className="truncate">{isOnline ? t('kassaApp.onlineModeLive') : t('kassaApp.offlineModeActive')}</span>
            </div>
          )}

          {activeKassaStaff && !demoViewOnly && (
            <div className="hidden max-w-[7rem] shrink-0 items-center rounded-md bg-emerald-600/90 px-1.5 py-1 text-[10px] font-bold text-white sm:flex md:max-w-[10rem] md:text-xs">
              <span className="truncate" title={activeKassaStaff.name}>
                {activeKassaStaff.name}
              </span>
            </div>
          )}
          </nav>
        </div>

          <div ref={langRef} className="relative z-[40] shrink-0">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              aria-label={`${t('nav.language')}: ${localeNames[locale]}`}
              onClick={() => setLangOpen(o => !o)}
              className={
                kassaAppearanceDark
                  ? headerUtilityBtnClass(langOpen)
                  : 'inline-flex touch-manipulation items-center gap-0.5 whitespace-nowrap rounded-lg bg-white/10 px-1.5 py-1.5 font-medium text-white transition-colors hover:bg-white/20 sm:gap-1 sm:rounded-xl sm:px-2 sm:py-2 md:px-3'
              }
            >
              <LocaleFlagEmoji locale={locale} variant="inline" className="text-sm text-white sm:text-[15px]" />
              <svg className={`size-4 shrink-0 transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {langOpen && (
              <div className={ui.langPanel}>
                {locales.map(lang => (
                  <button key={lang} type="button" onClick={() => { setLocale(lang); setLangOpen(false) }}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors ${ui.langRowHover} ${locale === lang ? ui.langRowActive : ui.langRowInactive}`}>
                    <LocaleFlagEmoji locale={lang} />
                    <span>{localeNames[lang]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

        <button
          type="button"
          onClick={() => setLogoutSoftwareConfirmOpen(true)}
          title={t('kassaApp.logout')}
          className={
            kassaAppearanceDark
              ? `relative z-20 ${headerUtilityBtnClass(true)}`
              : 'relative z-20 inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-lg bg-[#58CCFF] px-1.5 py-1 text-[11px] font-bold text-black transition-colors hover:bg-[#47c6fe] sm:gap-1 sm:px-2.5 sm:py-1.5 sm:text-sm'
          }
        >
          <span className={kassaAppearanceDark ? KASSA_HEADER_QUICK_LINK_LABEL : 'leading-snug'}>
            {t('kassaApp.logout')}
          </span>
        </button>
        </div>

      </div>

      {/* ── Offline / PWA banner ── */}
      {isOnline === false && (
        <div className="flex-shrink-0 bg-red-700 text-white text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-1.5 px-4 text-center">
          <span className="font-bold">{t('kassaApp.offlineModeActive')}</span>
          <span className="opacity-95 font-normal">{t('kassaApp.offlineBanner')}</span>
        </div>
      )}
      {installPrompt && !isInstalled && (
        <div className="flex-shrink-0 bg-[#3C4D6B] text-white text-xs font-semibold flex items-center justify-between gap-2 py-1.5 px-4">
          <span>📲 {t('kassaApp.pwaInstallBanner')}</span>
          <div className="flex gap-2">
            <button onClick={handleInstallPWA} className={ui.pwaInstallBtn}>{t('kassaApp.install')}</button>
            <button onClick={() => setInstallPrompt(null)} className="text-white/70 hover:text-white text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {/* ── Body: midden + rechts ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden w-full">

        {/* ── Midden: categorieën / producten ── */}
        <div
          className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${
            kassaAppearanceDark ? KASSA_POS_MENU_PLATE_SHELL_BG_CLASS : 'bg-[#e3e3e3]'
          }`}
        >

          {/* Categoriebalk boven producten: alle tenant-categorieën, horizontaal scrollbaar */}
          {selectedCategory && categories.length > 0 && (
            <div
              className={`flex shrink-0 items-stretch border-b ${ui.categoryStripBorder} ${ui.categoryStripBg} ${
                kassaAppearanceDark ? 'pl-2' : ''
              }`}
            >
              <button
                type="button"
                onClick={handleCategoryClear}
                title={t('kassaApp.backToCategories')}
                aria-label={t('kassaApp.backToCategories')}
                className={`touch-manipulation select-none flex shrink-0 items-center justify-center min-h-[3rem] min-w-[3.75rem] px-3 pl-4 transition-colors active:brightness-95 sm:min-h-[3.25rem] sm:min-w-[4.25rem] sm:pl-5 ${ui.categoryStripHover} border-r ${ui.categoryStripBorder}`}
              >
                <svg
                  className={`h-7 w-7 shrink-0 sm:h-8 sm:w-8 ${kassaAppearanceDark ? 'text-[#f0f0f0]' : ui.categoryStripIcon}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div
                ref={kassaCategoryStripRef}
                data-testid="kassa-category-strip"
                role="tablist"
                aria-label={t('kassaApp.categories')}
                onPointerDown={handleCategoryStripPointerDown}
                onPointerUp={handleCategoryStripPointerUp}
                onPointerCancel={handleCategoryStripPointerCancel}
                onClick={handleCategoryStripClick}
                className={`flex min-w-0 flex-1 touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain select-none [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] ${
                  kassaSxgaDenseTiles ? 'gap-2 px-2 py-2' : 'gap-1.5 px-1.5 py-1.5'
                }`}
              >
                {categories.map((cat) => {
                  const active =
                    cat.id !== undefined &&
                    cat.id !== null &&
                    selectedCategory.id !== undefined &&
                    selectedCategory.id !== null &&
                    String(cat.id) === String(selectedCategory.id)
                  return (
                    <button
                      key={cat.id ?? cat.name}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      data-kassa-strip-category-id={cat.id != null ? String(cat.id) : undefined}
                      className={`shrink-0 touch-pan-x whitespace-nowrap border font-bold leading-tight transition-colors active:brightness-95 ${
                        kassaSxgaDenseTiles
                          ? 'px-3 py-1.5 text-sm'
                          : 'px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm'
                      } ${
                        kassaAppearanceDark
                          ? kassaPosButtonClass(active)
                          : active
                            ? 'rounded-lg border-[#58CCFF] bg-[#58CCFF] text-black shadow-sm'
                            : `rounded-lg border-gray-300 bg-white ${ui.categoryStripText} ${ui.categoryStripHover}`
                      }`}
                    >
                      {cat.icon ? <span className="mr-0.5 text-sm sm:text-base">{cat.icon}</span> : null}
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className={`flex min-h-0 flex-1 flex-col ${kassaAppearanceDark ? 'px-3 pb-3 pt-1.5' : ''}`}>
            <div
              className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
                kassaAppearanceDark ? `${KASSA_POS_MENU_RECESS_TRAY_CLASS} ${KASSA_POS_BTN_SHAPE}` : ''
              }`}
            >
          {/* Grid — min-h-0 nodig: anders groeit de flex-child mee met alle tegels en wordt onderaan afgekapt zonder scroll */}
          <div
            ref={kassaMenuScrollRef}
            data-testid="kassa-menu-scroll"
            className={`relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4 touch-manipulation [overflow-anchor:none] [scrollbar-gutter:stable] ${
              kassaAppearanceDark ? 'gks-menu-vignette' : ''
            }`}
          >
            {menuLoading ? (
              <div data-testid="kassa-menu-loading" className={`flex items-center justify-center h-full text-lg ${ui.menuEmptyMuted}`}>{t('kassaApp.loading')}</div>
            ) : !selectedCategory ? (
              /* Categorieën: responsief raster; rijhoogte vult viewport; gap-4 = KASSA_MENU_GRID_GAP_PX */
              categories.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-full ${ui.menuEmptyMuted}`}>
                  <span className="text-5xl mb-3">📂</span>
                  <p className="font-semibold">{t('kassaApp.noCategoriesTitle')}</p>
                  <p className="text-sm mt-1">{t('kassaApp.noCategoriesHint')}</p>
                </div>
              ) : (
                <div
                  ref={kassaCategoryGridRef}
                  data-testid="kassa-category-grid"
                  data-kassa-sxga-tiles={kassaSxgaDenseTiles ? '1' : '0'}
                  onPointerDown={handleCategoryGridPointerDown}
                  onPointerUp={handleCategoryGridPointerUp}
                  onPointerCancel={handleCategoryGridPointerCancel}
                  onClick={handleCategoryGridClick}
                  className={`grid min-h-0 w-full grid-cols-2 pb-8 touch-manipulation select-none ${kassaSxgaDenseTiles ? 'gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5' : 'gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'} [&>*]:min-h-0 ${kassaSxgaDenseTiles ? 'items-start' : 'items-stretch'}`}
                  style={
                    kassaSxgaDenseTiles ?
                      { gridAutoRows: 'max-content' }
                    : { gridAutoRows: `${kassaMenuRowPx}px` }
                  }
                >
                  {categories.map((cat) => {
                    const tile = cat.id ? categoryTileImageByCategoryId.get(cat.id) : undefined
                    return (
                      <KassaCategoryTileButton
                        key={cat.id}
                        category={cat}
                        imageUrl={tile?.url}
                        sxgaDenseTileLayout={kassaSxgaDenseTiles}
                        posLuxuryAppearance={kassaAppearanceDark}
                      />
                    )
                  })}
                </div>
              )
            ) : (
              /* Producten: zelfde raster als categorieën */
              productsInSelectedCategory.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center h-full ${ui.menuEmptyMuted}`}>
                    <span className="text-5xl mb-3">🍽️</span>
                    <p className="font-semibold">{t('kassaApp.noProductsInCategory')}</p>
                  </div>
                ) : (
                  <div
                    ref={kassaProductGridRef}
                    data-testid="kassa-product-grid"
                    data-kassa-sxga-tiles={kassaSxgaDenseTiles ? '1' : '0'}
                    onPointerDown={handleProductGridPointerDown}
                    onPointerUp={handleProductGridPointerUp}
                    onPointerCancel={handleProductGridPointerCancel}
                    onClick={handleProductGridClick}
                    className={`grid min-h-0 w-full grid-cols-2 pb-8 touch-manipulation select-none ${kassaSxgaDenseTiles ? 'gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5' : 'gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'} [&>*]:min-h-0 ${kassaSxgaDenseTiles ? 'items-start' : 'items-stretch'}`}
                    style={
                      kassaSxgaDenseTiles ?
                        { gridAutoRows: 'max-content' }
                      : { gridAutoRows: `${kassaMenuRowPx}px` }
                    }
                  >
                    {productsInSelectedCategory.map((product) => {
                      const inCart = product.id
                        ? (cartQtyByProductId.get(String(product.id)) ?? 0)
                        : 0
                      const hasOpts = product.id ? productIdsWithOptionsSet.has(product.id) : false
                      return (
                        <KassaProductTileButton
                          key={product.id}
                          product={product}
                          inCart={inCart}
                          hasOpts={hasOpts}
                          sxgaDenseTileLayout={kassaSxgaDenseTiles}
                          posLuxuryAppearance={kassaAppearanceDark}
                        />
                      )
                    })}
                  </div>
                )
            )}
          </div>
            </div>
          </div>

          {quickMenuPanelOpen ? (
            <div
              data-testid="kassa-quick-menu-panel"
              className="pointer-events-auto absolute inset-x-0 bottom-0 z-[60] px-3 pb-3 pt-6"
              style={{
                background: kassaAppearanceDark
                  ? 'linear-gradient(to top, rgba(12,12,12,0.97) 72%, transparent)'
                  : 'linear-gradient(to top, rgba(0,0,0,0.88) 72%, transparent)',
              }}
            >
              <div className="grid w-full grid-cols-8 gap-1.5 sm:gap-2">
                {kassaQuickMenuActions.map((action) => {
                  const enabled = isKassaQuickMenuActionEnabled(action)
                  const label = t(action.labelKey)
                  if (action.kind === 'clock') {
                    return (
                      <button
                        key={action.key}
                        type="button"
                        disabled={!enabled}
                        aria-disabled={!enabled}
                        className={kassaQuickMenuPanelBtnClass(enabled)}
                        onClick={() => {
                          if (!enabled) return
                          setQuickMenuPanelOpen(false)
                          openStaffClockModal()
                        }}
                      >
                        {label}
                      </button>
                    )
                  }
                  if (!enabled || !action.href) {
                    return (
                      <button
                        key={action.key}
                        type="button"
                        disabled
                        aria-disabled
                        className={kassaQuickMenuPanelBtnClass(false)}
                      >
                        {label}
                      </button>
                    )
                  }
                  return (
                    <Link
                      key={action.key}
                      href={action.href}
                      prefetch={false}
                      className={kassaQuickMenuPanelBtnClass(true)}
                      onClick={() => {
                        playClick()
                        setQuickMenuPanelOpen(false)
                      }}
                    >
                      {label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Rechts: numpad / cart ── */}
        <div
          className={`${
            kassaSxgaDenseTiles ? 'w-[332px] max-w-[38vw]' : 'w-80 sm:w-96 lg:w-[380px]'
          } flex min-h-0 min-w-0 flex-shrink-0 flex-col overflow-y-hidden ${
            kassaSxgaDenseTiles ? 'overflow-x-visible' : 'overflow-hidden'
          } ${
            kassaAppearanceDark
              ? `border-l ${KASSA_POS_RULE_BLACK} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`
              : ui.sidebarBg
          }`}
        >

        {/* Zone: Verkoop / Binnen / Terras — drie gelijke knoppen; geen aparte klok-/datumbalk. */}
        <div
          className={`shrink-0 ${kassaAppearanceDark ? 'px-2.5 pt-3 pb-3 sm:px-3' : 'px-2 pt-1.5'}`}
        >
            <div className={`flex min-w-0 ${kassaSidebarRowGapClass}`}>
              <button
                type="button"
                aria-pressed={kassaZoneTab === 'sales'}
                title={showKassaStaffClockButton ? t('staffClock.buttonTitle') : undefined}
                onClick={() => {
                  playClick()
                  setKassaZoneTab('sales')
                  setShowTablePicker(false)
                  if (showKassaStaffClockButton && requiresStaffSelectionForSale) {
                    openStaffClockModal()
                  }
                }}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center px-2 transition-colors sm:px-3 ${kassaFloorZoneButtonTouchClass(
                  kassaSxgaDenseTiles,
                )} ${
                  kassaAppearanceDark
                    ? `font-semibold ${kassaPosButtonClass(kassaZoneTab === 'sales')}`
                    : `rounded-xl font-bold ${
                        kassaZoneTab === 'sales'
                          ? `bg-[#3C4D6B] text-white ring-2 ring-[#58CCFF]/55 ring-offset-2 ${ui.ringOffset}`
                          : 'bg-[#3C4D6B] text-white hover:bg-[#2D3A52]'
                      }`
                }`}
              >
                <span className={kassaSidebarZoneLabelClass}>{t('kassaApp.floorZoneSales')}</span>
              </button>
              <button
                type="button"
                aria-pressed={kassaZoneTab === 'inside'}
                onClick={() => {
                  playClick()
                  if (kassaZoneTab === 'inside' && showTablePicker) {
                    setShowTablePicker(false)
                    setKassaZoneTab(null)
                    return
                  }
                  setPickerBrowseZone(FLOOR_PLAN_ZONE_INSIDE)
                  setKassaZoneTab('inside')
                  setShowTablePicker(true)
                }}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center px-2 transition-colors sm:px-3 ${kassaFloorZoneButtonTouchClass(
                  kassaSxgaDenseTiles,
                )} ${
                  kassaAppearanceDark
                    ? `font-semibold ${kassaPosButtonClass(kassaZoneTab === 'inside')}`
                    : `rounded-xl font-bold ${
                        kassaZoneTab === 'inside'
                          ? `bg-[#3C4D6B] text-white ring-2 ring-[#58CCFF]/55 ring-offset-2 ${ui.ringOffset}`
                          : 'bg-[#3C4D6B] text-white hover:bg-[#2D3A52]'
                      }`
                }`}
              >
                <span className={kassaSidebarZoneLabelClass}>{t('kassaApp.floorZoneInside')}</span>
                {orderType === 'DINE_IN' && tableNumber && dineInFloorZone === FLOOR_PLAN_ZONE_INSIDE ? (
                  <span className="mt-0.5 text-xs font-semibold opacity-95">
                    {kassaStoolsByZone[FLOOR_PLAN_ZONE_INSIDE].some((s) => s.stoolNumber === tableNumber)
                      ? `🍺 ${tableNumber}`
                      : `🪑 ${tableNumber}`}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                aria-pressed={kassaZoneTab === 'terrace'}
                onClick={() => {
                  playClick()
                  if (kassaZoneTab === 'terrace' && showTablePicker) {
                    setShowTablePicker(false)
                    setKassaZoneTab(null)
                    return
                  }
                  setPickerBrowseZone(FLOOR_PLAN_ZONE_TERRACE)
                  setKassaZoneTab('terrace')
                  setShowTablePicker(true)
                }}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center px-2 transition-colors sm:px-3 ${kassaFloorZoneButtonTouchClass(
                  kassaSxgaDenseTiles,
                )} ${
                  kassaAppearanceDark
                    ? `font-semibold ${kassaPosButtonClass(kassaZoneTab === 'terrace')}`
                    : `rounded-xl font-bold ${
                        kassaZoneTab === 'terrace'
                          ? `bg-emerald-600 text-white ring-2 ring-emerald-300/80 ring-offset-2 ${ui.ringOffset}`
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`
                }`}
              >
                <span className={kassaSidebarZoneLabelClass}>{t('kassaApp.floorZoneTerrace')}</span>
                {orderType === 'DINE_IN' && tableNumber && dineInFloorZone === FLOOR_PLAN_ZONE_TERRACE ? (
                  <span className="mt-0.5 text-xs font-semibold opacity-95">
                    {kassaStoolsByZone[FLOOR_PLAN_ZONE_TERRACE].some((s) => s.stoolNumber === tableNumber)
                      ? `🍺 ${tableNumber}`
                      : `🪑 ${tableNumber}`}
                  </span>
                ) : null}
              </button>
            </div>
        </div>

        {/* Besteltype: drie losse knoppen (ter plaatse / afhalen / leveren) */}
        <div
          className={`shrink-0 ${
            kassaAppearanceDark
              ? kassaSxgaDenseTiles
                ? 'mx-2.5 mb-3 mt-2 space-y-2'
                : 'mx-3 mb-3 mt-2.5 space-y-3'
              : 'mx-2 mt-1'
          }`}
          data-testid="kassa-order-type-bar"
        >
          <div className={`flex ${kassaSidebarRowGapClass}`}>
            <button
              type="button"
              aria-pressed={orderType === 'DINE_IN'}
              onClick={() => selectOrderType('DINE_IN')}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center text-center ${
                kassaAppearanceDark
                  ? `px-2 ${kassaOrderTypeButtonTouchClass(kassaSxgaDenseTiles)} ${kassaPosButtonClass(orderType === 'DINE_IN')}`
                  : `rounded-lg px-1 text-xs shadow-sm ring-1 ring-black/10 transition-colors active:brightness-95 ${
                      kassaSxgaDenseTiles ? 'min-h-[32px] py-1.5' : 'min-h-[28px] py-1'
                    } ${
                      orderType === 'DINE_IN'
                        ? 'bg-[#58CCFF] text-[#063042] hover:bg-[#47c6fe]'
                        : 'bg-[#2a3548] text-white/75 hover:bg-[#354158]'
                    }`
              }`}
            >
              <span className={kassaSidebarActionLabelClass}>{t('kassaApp.orderTypeDineIn')}</span>
              {orderType === 'DINE_IN' && tableNumber ? (
                <span className="mt-0.5 max-w-full truncate text-[10px] font-semibold normal-case opacity-95 sm:text-xs">
                  {t('kassaApp.tableWord')} {tableNumber}
                  {dineInFloorZone === FLOOR_PLAN_ZONE_TERRACE
                    ? ` (${t('kassaApp.floorZoneTerraceShort')})`
                    : ''}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              aria-pressed={orderType === 'TAKEAWAY'}
              onClick={() => selectOrderType('TAKEAWAY')}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center text-center ${
                kassaAppearanceDark
                  ? `px-2 ${kassaOrderTypeButtonTouchClass(kassaSxgaDenseTiles)} ${kassaPosButtonClass(orderType === 'TAKEAWAY')}`
                  : `rounded-lg px-1 text-xs shadow-sm ring-1 ring-black/10 transition-colors active:brightness-95 ${
                      kassaSxgaDenseTiles ? 'min-h-[32px] py-1.5' : 'min-h-[28px] py-1'
                    } ${
                      orderType === 'TAKEAWAY'
                        ? 'bg-[#58CCFF] text-[#063042] hover:bg-[#47c6fe]'
                        : 'bg-[#2a3548] text-white/75 hover:bg-[#354158]'
                    }`
              }`}
            >
              <span className={kassaSidebarActionLabelClass}>{t('kassaApp.orderTypeTakeaway')}</span>
            </button>
            <button
              type="button"
              aria-pressed={orderType === 'DELIVERY'}
              onClick={() => selectOrderType('DELIVERY')}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center text-center ${
                kassaAppearanceDark
                  ? `px-2 ${kassaOrderTypeButtonTouchClass(kassaSxgaDenseTiles)} ${kassaPosButtonClass(orderType === 'DELIVERY')}`
                  : `rounded-lg px-1 text-xs shadow-sm ring-1 ring-black/10 transition-colors active:brightness-95 ${
                      kassaSxgaDenseTiles ? 'min-h-[32px] py-1.5' : 'min-h-[28px] py-1'
                    } ${
                      orderType === 'DELIVERY'
                        ? 'bg-[#58CCFF] text-[#063042] hover:bg-[#47c6fe]'
                        : 'bg-[#2a3548] text-white/75 hover:bg-[#354158]'
                    }`
              }`}
            >
              <span className={kassaSidebarActionLabelClass}>{t('kassaApp.orderTypeDelivery')}</span>
            </button>
          </div>
          {orderType === 'DINE_IN' && tableNumber ? (
            <button
              type="button"
              title={t('kassaApp.clearTableBanner')}
              aria-label={t('kassaApp.clearTableBanner')}
              onClick={() => {
                playClick()
                setTableNumber('')
              }}
              className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-red-500/40 bg-red-950/40 py-1 text-[11px] font-bold text-red-200 transition-colors hover:bg-red-600/30 active:bg-red-600/50"
            >
              <span aria-hidden>✕</span>
              {t('kassaApp.clearTableBanner')}
            </button>
          ) : null}
        </div>

        {/* Cart / numpad (toggle via footer) */}
        <div
          className={`flex min-h-0 flex-1 flex-col overflow-hidden touch-pan-y ${
            kassaAppearanceDark ? 'px-3 pt-1' : 'px-2.5 pt-1.5'
          }`}
        >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {parkedLinesByCategory.length > 0 &&
              (parkedOnlySidebarView || numpadPanelVisible) ? (
                <div
                  className={
                    parkedOnlySidebarView
                      ? 'mb-2 flex min-h-0 flex-1 flex-col overflow-hidden'
                      : 'mb-2 max-h-[min(38vh,11rem)] shrink-0 overflow-y-auto overscroll-y-contain'
                  }
                  data-testid="kassa-parked-on-table"
                >
                  <p className={`mb-1 shrink-0 text-xs font-bold uppercase tracking-wide ${ui.numpadMeta}`}>
                    {t('kassaApp.parkedOnTableSection')}
                  </p>
                  <div
                    className={
                      parkedOnlySidebarView
                        ? 'min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-y-contain'
                        : 'space-y-1'
                    }
                  >
                    {parkedLinesByCategory.map((item) => {
                      const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
                      return (
                        <div
                          key={`parked-${item.cartKey}`}
                          className={`flex items-center gap-2 rounded-lg px-2 py-1.5 opacity-80 ${ui.cartRowBg}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`truncate text-sm font-semibold ${ui.cartTitle}`}>{item.product.name}</p>
                            <p className={`text-xs ${ui.cartChoices}`}>
                              {item.quantity}× · €{((item.product.price + choicesTotal) * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
              {kassaAppearanceDark ? (
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              {cart.length > 0 ? (
              <div
                className={`flex min-h-0 flex-1 flex-col overflow-hidden ${KASSA_NUMPAD_CART_RECESS_MOTION} ${
                  numpadPanelVisible ? 'pointer-events-none opacity-[0.28]' : 'opacity-100'
                } ${
                  kassaSidebarFooterTier === 'comfort' ? 'gap-2' : kassaSidebarFooterTier === 'compact' ? 'gap-1.5' : 'gap-1'
                }`}
              >
              {parkedLinesByCategory.length > 0 ? (
                <div
                  className="max-h-[min(20vh,6.5rem)] shrink-0 overflow-y-auto overscroll-y-contain"
                  data-testid="kassa-parked-on-table"
                >
                  <p className={`mb-1 text-xs font-bold uppercase tracking-wide ${ui.numpadMeta}`}>
                    {t('kassaApp.parkedOnTableSection')}
                  </p>
                  <div className="space-y-1">
                    {parkedLinesByCategory.map((item) => {
                      const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
                      return (
                        <div
                          key={`parked-cart-${item.cartKey}`}
                          className={`flex items-center gap-2 rounded-lg px-2 py-1.5 opacity-80 ${ui.cartRowBg}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`truncate text-sm font-semibold ${ui.cartTitle}`}>{item.product.name}</p>
                            <p className={`text-xs ${ui.cartChoices}`}>
                              {item.quantity}× · €{((item.product.price + choicesTotal) * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
              <p className={sidebarCartSectionLabelClass}>{t('kassaApp.cartNewLinesSection')}</p>
              <div
                ref={cartLinesScrollRef}
                className={sidebarCartLinesScrollClass}
                data-testid="kassa-cart-lines"
              >
                {cartLinesByCategory.map(renderSidebarCartLine)}
              </div>
              </div>
              ) : null}
              <div
                className={`absolute inset-0 z-[3] flex min-h-0 flex-col justify-end overflow-hidden ${KASSA_NUMPAD_PANEL_SLIDE_MOTION} ${
                  numpadPanelVisible ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
                }`}
                data-testid="kassa-numpad-panel"
                aria-hidden={!numpadPanelVisible}
              >
              <div className="flex min-h-[15rem] flex-1 flex-col justify-end">
              <div className={`mb-3 flex shrink-0 items-center gap-2.5 rounded-xl px-2.5 py-2 ${ui.numpadBarBg}`}>
                {!kassaAppearanceDark && tenantInfo?.kassa_staff_clock_enabled && !demoViewOnly ? (
                  <button
                    type="button"
                    onClick={openStaffClockModal}
                    className={`shrink-0 active:scale-[0.98] transition-all ${ui.clockTileBg} ${ui.clockTileHover}`}
                    title={t('staffClock.buttonTitle')}
                    aria-label={t('staffClock.buttonTitle')}
                  >
                    <KassaAnalogClock size={72} />
                  </button>
                ) : null}
                <div
                  className={`min-w-0 flex flex-col justify-center gap-0.5 ${
                    !kassaAppearanceDark && tenantInfo?.kassa_staff_clock_enabled && !demoViewOnly ? 'flex-1' : 'w-full'
                  }`}
                >
                  {!kassaAppearanceDark ? (
                    <p
                      className={`truncate whitespace-nowrap text-right text-xs font-semibold leading-tight tracking-tight sm:text-sm ${ui.numpadMeta}`}
                      title={numpadHeaderDateLabel}
                      aria-live="polite"
                    >
                      {numpadHeaderDateLabel}
                    </p>
                  ) : null}
                  <input
                    type="text"
                    value={numpadValue}
                    readOnly
                    aria-label={t('kassaApp.numpadPlaceholder')}
                    className={`w-full min-w-0 border-none bg-transparent text-right text-2xl font-bold outline-none sm:text-3xl ${ui.numpadInput}`}
                  />
                </div>
              </div>
              <div
                className={`grid shrink-0 grid-cols-4 touch-manipulation select-none [grid-template-rows:repeat(4,minmax(2.75rem,1fr))] ${
                  kassaAppearanceDark ? 'gap-2.5' : 'gap-2'
                }`}
                onClick={(e) => {
                  const el = (e.target as HTMLElement).closest('[data-kassa-numpad-key]')
                  if (!el || !(el instanceof HTMLElement)) return
                  const k = el.dataset.kassaNumpadKey
                  if (k) handleNumpad(k)
                }}
              >
                {KASSA_NUMPAD_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    data-kassa-numpad-key={key}
                    className={
                      kassaAppearanceDark
                        ? ui.numpadKeyNum
                        : `min-h-[2.75rem] rounded-xl font-bold text-2xl shadow-sm touch-manipulation active:brightness-95 ${
                            key === 'C' || ['+', '-', '×', '='].includes(key)
                              ? 'bg-[#3C4D6B] text-white hover:bg-[#2D3A52]'
                              : ui.numpadKeyNum
                          }`
                    }
                  >
                    {key}
                  </button>
                ))}
              </div>
              {numpadValue && parseFloat(numpadValue) > 0 && (
                <button
                  type="button"
                  data-testid="kassa-add-custom-amount"
                  onClick={addCustomAmount}
                  className={
                    kassaAppearanceDark
                      ? `mt-3 shrink-0 touch-manipulation py-4 font-bold text-base ${kassaPosButtonClass(true)}`
                      : 'mt-3 shrink-0 touch-manipulation py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg active:brightness-95'
                  }
                >
                  {t('kassaApp.addAmount').replace(
                    '{amount}',
                    parseFloat(numpadValue || '0').toFixed(2),
                  )}
                </button>
              )}
              </div>
              </div>
              </div>
              ) : numpadPanelVisible ? (
              <div className="flex min-h-[15rem] flex-1 flex-col justify-end" data-testid="kassa-numpad-panel">
              <div className={`mb-3 flex shrink-0 items-center gap-2.5 rounded-xl px-2.5 py-2 ${ui.numpadBarBg}`}>
                {!kassaAppearanceDark && tenantInfo?.kassa_staff_clock_enabled && !demoViewOnly ? (
                  <button
                    type="button"
                    onClick={openStaffClockModal}
                    className={`shrink-0 active:scale-[0.98] transition-all ${ui.clockTileBg} ${ui.clockTileHover}`}
                    title={t('staffClock.buttonTitle')}
                    aria-label={t('staffClock.buttonTitle')}
                  >
                    <KassaAnalogClock size={72} />
                  </button>
                ) : null}
                <div
                  className={`min-w-0 flex flex-col justify-center gap-0.5 ${
                    !kassaAppearanceDark && tenantInfo?.kassa_staff_clock_enabled && !demoViewOnly ? 'flex-1' : 'w-full'
                  }`}
                >
                  {!kassaAppearanceDark ? (
                    <p
                      className={`truncate whitespace-nowrap text-right text-xs font-semibold leading-tight tracking-tight sm:text-sm ${ui.numpadMeta}`}
                      title={numpadHeaderDateLabel}
                      aria-live="polite"
                    >
                      {numpadHeaderDateLabel}
                    </p>
                  ) : null}
                  <input
                    type="text"
                    value={numpadValue}
                    readOnly
                    aria-label={t('kassaApp.numpadPlaceholder')}
                    className={`w-full min-w-0 border-none bg-transparent text-right text-2xl font-bold outline-none sm:text-3xl ${ui.numpadInput}`}
                  />
                </div>
              </div>
              <div
                className="grid shrink-0 grid-cols-4 gap-2 touch-manipulation select-none [grid-template-rows:repeat(4,minmax(2.75rem,1fr))]"
                onClick={(e) => {
                  const el = (e.target as HTMLElement).closest('[data-kassa-numpad-key]')
                  if (!el || !(el instanceof HTMLElement)) return
                  const k = el.dataset.kassaNumpadKey
                  if (k) handleNumpad(k)
                }}
              >
                {KASSA_NUMPAD_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    data-kassa-numpad-key={key}
                    className={`min-h-[2.75rem] rounded-xl font-bold text-2xl shadow-sm touch-manipulation active:brightness-95 ${
                      key === 'C' || ['+', '-', '×', '='].includes(key)
                        ? 'bg-[#3C4D6B] text-white hover:bg-[#2D3A52]'
                        : ui.numpadKeyNum
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
              {numpadValue && parseFloat(numpadValue) > 0 && (
                <button
                  type="button"
                  data-testid="kassa-add-custom-amount"
                  onClick={addCustomAmount}
                  className="mt-3 shrink-0 touch-manipulation py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg active:brightness-95"
                >
                  {t('kassaApp.addAmount').replace(
                    '{amount}',
                    parseFloat(numpadValue || '0').toFixed(2),
                  )}
                </button>
              )}
              </div>
              ) : cart.length > 0 ? (
              <div
                className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
                  kassaSidebarFooterTier === 'comfort' ? 'gap-2' : kassaSidebarFooterTier === 'compact' ? 'gap-1.5' : 'gap-1'
                }`}
              >
              {!kassaAppearanceDark ? (
                <div
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-2 py-1 ${ui.numpadBarBg} ${tenantInfo?.kassa_staff_clock_enabled && !demoViewOnly ? '' : 'justify-end'}`}
                >
                  {tenantInfo?.kassa_staff_clock_enabled && !demoViewOnly ? (
                    <button
                      type="button"
                      onClick={openStaffClockModal}
                      className={`shrink-0 active:scale-[0.98] transition-all ${ui.clockTileBg} ${ui.clockTileHover}`}
                      title={t('staffClock.buttonTitle')}
                      aria-label={t('staffClock.buttonTitle')}
                    >
                      <KassaAnalogClock size={48} />
                    </button>
                  ) : null}
                  <p
                    className={`min-w-0 truncate whitespace-nowrap text-right text-[11px] font-semibold leading-tight tracking-tight ${ui.numpadMeta} ${tenantInfo?.kassa_staff_clock_enabled && !demoViewOnly ? 'flex-1' : 'w-full'}`}
                    title={numpadHeaderDateLabel}
                    aria-live="polite"
                  >
                    {numpadHeaderDateLabel}
                  </p>
                </div>
              ) : null}
              {parkedLinesByCategory.length > 0 ? (
                <div
                  className="max-h-[min(20vh,6.5rem)] shrink-0 overflow-y-auto overscroll-y-contain"
                  data-testid="kassa-parked-on-table"
                >
                  <p className={`mb-1 text-xs font-bold uppercase tracking-wide ${ui.numpadMeta}`}>
                    {t('kassaApp.parkedOnTableSection')}
                  </p>
                  <div className="space-y-1">
                    {parkedLinesByCategory.map((item) => {
                      const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
                      return (
                        <div
                          key={`parked-${item.cartKey}`}
                          className={`flex items-center gap-2 rounded-lg px-2 py-1.5 opacity-80 ${ui.cartRowBg}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`truncate text-sm font-semibold ${ui.cartTitle}`}>{item.product.name}</p>
                            <p className={`text-xs ${ui.cartChoices}`}>
                              {item.quantity}× · €{((item.product.price + choicesTotal) * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
              <p className={sidebarCartSectionLabelClass}>{t('kassaApp.cartNewLinesSection')}</p>
              <div
                ref={cartLinesScrollRef}
                className={sidebarCartLinesScrollClass}
                data-testid="kassa-cart-lines"
              >
                {cartLinesByCategory.map(renderSidebarCartLine)}
              </div>
            </div>
              ) : null}
            </div>
        </div>

        {/* Totaal + knoppen — zelfde flow/labels als vóór UI-pass; donker = alleen POS-styling */}
        {kassaAppearanceDark ? (
          <div
            className={`sticky bottom-0 z-10 shrink-0 border-t ${KASSA_POS_RULE_BLACK} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} ${
              kassaSxgaDenseTiles ? 'px-2.5 py-2 space-y-2' : 'px-3 py-2.5 space-y-2.5'
            }`}
          >
            <div
              className={`flex w-full touch-manipulation select-none ${kassaSxgaDenseTiles ? 'gap-2' : 'gap-3'} ${kassaFooterActionTouchMinHClass(
                kassaSxgaDenseTiles,
                kassaSidebarFooterTier === 'dense',
              )}`}
            >
              <button
                type="button"
                data-testid="kassa-quick-menu"
                aria-pressed={quickMenuPanelOpen}
                onClick={toggleKassaQuickMenu}
                className={`flex items-center justify-center px-3 ${KASSA_SIDEBAR_FOOTER_LEFT_COL} ${kassaPosButtonClass(quickMenuPanelOpen)}`}
                title={t('kassaApp.quickMenu')}
              >
                <span className={`leading-tight ${kassaSidebarActionLabelClass}`}>{t('kassaApp.quickMenu')}</span>
              </button>
              <div
                role="status"
                aria-live="polite"
                className={`flex min-w-0 flex-1 items-center justify-between gap-2 px-2.5 ${kassaPosRaisedStripClass()}`}
              >
                <span className={`shrink-0 text-base font-bold tracking-[0.04em] sm:text-lg ${ui.numpadMeta}`}>
                  {t('kassaApp.cartTotal')}
                </span>
                <span
                  className={`min-w-0 truncate text-right font-bold tabular-nums tracking-tight text-red-500 ${
                    kassaSxgaDenseTiles || kassaSidebarFooterTier !== 'dense' ? 'text-2xl sm:text-[1.65rem]' : 'text-xl'
                  }`}
                >
                  €{total.toFixed(2)}
                </span>
              </div>
            </div>
            <div
              className={`grid grid-cols-3 touch-manipulation select-none ${kassaSxgaDenseTiles ? 'gap-2' : 'gap-3'}`}
            >
              <button
                type="button"
                onClick={() => { void openCashDrawer() }}
                className={`flex items-center justify-center px-1 ${kassaPosButtonClass(false)} ${kassaFooterActionTouchMinHClass(
                  kassaSxgaDenseTiles,
                  kassaSidebarFooterTier === 'dense',
                )}`}
                title={t('kassaApp.drawerOpen')}
              >
                <span className={kassaSidebarActionLabelClass}>{t('kassaApp.drawerOpen')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void printDraftBonFromCart({ draftCopies: 1 })
                }}
                disabled={draftBonLineItems.length === 0 || draftBonPrinting}
                className={`flex items-center justify-center px-1 ${kassaPosButtonClass(false)} ${kassaFooterActionTouchMinHClass(
                  kassaSxgaDenseTiles,
                  kassaSidebarFooterTier === 'dense',
                )}`}
                title={t('kassaApp.cartBonTitle')}
                aria-label={t('kassaApp.cartBonTitle')}
              >
                <span className={kassaSidebarActionLabelClass}>{t('kassaApp.cartBon')}</span>
              </button>
              <button
                type="button"
                onClick={clearCart}
                disabled={billLines.length === 0}
                className={`flex items-center justify-center px-1 ${kassaPosButtonClass(false)} ${kassaFooterActionTouchMinHClass(
                  kassaSxgaDenseTiles,
                  kassaSidebarFooterTier === 'dense',
                )}`}
                title={t('kassaApp.remove')}
                aria-label={t('kassaApp.remove')}
              >
                <span className={kassaSidebarActionLabelClass}>{t('kassaApp.remove')}</span>
              </button>
            </div>
            {orderType === 'DINE_IN' && tableNumber && cart.length > 0 && (
              <div className="flex w-full gap-2.5 touch-manipulation select-none" data-testid="kassa-park-table-split">
                <button
                  type="button"
                  onClick={() => parkOrder({ printKitchen: true, printKassaSlip: false })}
                  className={`min-w-0 flex-1 font-semibold flex items-center justify-center text-center px-2 py-3 text-[11px] leading-tight sm:text-xs ${kassaPosButtonClass(false)} ${
                    kassaSxgaDenseTiles ? 'min-h-[2.875rem]' : 'min-h-[2.5rem]'
                  }`}
                >
                  {t('kassaApp.parkTableKitchenBon')}
                </button>
                <button
                  type="button"
                  onClick={() => parkOrder({ printKitchen: false, printKassaSlip: true })}
                  className={`min-w-0 flex-1 font-semibold flex items-center justify-center text-center px-2 py-3 text-[11px] leading-tight sm:text-xs ${kassaPosButtonClass(false)} ${
                    kassaSxgaDenseTiles ? 'min-h-[2.875rem]' : 'min-h-[2.5rem]'
                  }`}
                >
                  {t('kassaApp.parkTableKassaBon')}
                </button>
              </div>
            )}
            <div className={`flex touch-manipulation select-none ${kassaSxgaDenseTiles ? 'gap-2' : 'gap-2.5'}`}>
              <button
                type="button"
                aria-pressed={numpadPanelVisible}
                data-testid="kassa-numpad-toggle"
                title={t('kassaApp.numpadToggle')}
                aria-label={t('kassaApp.numpadToggle')}
                onClick={() => {
                  playClick()
                  setNumpadPanelVisible((v) => !v)
                }}
                className={`flex items-center justify-center px-3 ${KASSA_SIDEBAR_FOOTER_LEFT_COL} ${kassaPosButtonClass(numpadPanelVisible)} ${
                  kassaSxgaDenseTiles ? 'min-h-[4rem] py-3.5' : 'min-h-[3.5rem] py-3'
                }`}
              >
                <span className={kassaSidebarActionLabelClass}>{t('kassaApp.numpadToggle')}</span>
              </button>
              <button
                type="button"
                data-testid="kassa-checkout"
                onClick={() => {
                  if (billLines.length === 0) return
                  scheduleKassaTapSound(playCheckout)
                  setShowPaymentModal(true)
                }}
                disabled={billLines.length === 0}
                className={`flex min-w-0 flex-1 items-center justify-center ${KASSA_POS_CHECKOUT_BTN} ${
                  kassaSxgaDenseTiles ? 'min-h-[4rem] py-3.5 text-lg' : 'min-h-[3.5rem] py-3 text-lg'
                }`}
              >
                {t('kassaApp.checkout')}
              </button>
            </div>
          </div>
        ) : (
          <div className="shrink-0 border-t border-gray-200 px-3 py-2.5 space-y-2.5">
            <div
              className={`flex w-full gap-2 ${kassaFooterActionTouchMinHClass(
                kassaSxgaDenseTiles,
                kassaSidebarFooterTier === 'dense',
              )}`}
            >
              <button
                type="button"
                data-testid="kassa-quick-menu"
                aria-pressed={quickMenuPanelOpen}
                onClick={toggleKassaQuickMenu}
                className={`flex items-center justify-center rounded-xl px-3 py-2 text-xs font-bold leading-tight text-white ${KASSA_SIDEBAR_FOOTER_LEFT_COL} ${
                  quickMenuPanelOpen ? 'bg-[#2D3A52] ring-2 ring-[#58CCFF]/60' : 'bg-[#3C4D6B] hover:bg-[#2D3A52]'
                }`}
                title={t('kassaApp.quickMenu')}
              >
                {t('kassaApp.quickMenu')}
              </button>
              <div
                role="status"
                aria-live="polite"
                className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2"
              >
                <span className={`text-sm font-bold ${ui.numpadMeta}`}>{t('kassaApp.cartTotal')}</span>
                <span className={`truncate text-right font-bold ${ui.priceAccentClass} text-xl`}>
                  €{total.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 touch-manipulation select-none">
              <button
                type="button"
                onClick={() => { void openCashDrawer() }}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl bg-[#58CCFF] text-[#063042] hover:bg-[#47c6fe] active:brightness-95 ${kassaFooterActionTouchMinHClass(
                  kassaSxgaDenseTiles,
                  kassaSidebarFooterTier === 'dense',
                )}`}
                title={t('kassaApp.drawerOpen')}
              >
                <span className="text-center text-xs font-bold">{t('kassaApp.drawerOpen')}</span>
              </button>
              <button
                type="button"
                onClick={() => { void printDraftBonFromCart({ draftCopies: 1 }) }}
                disabled={draftBonLineItems.length === 0 || draftBonPrinting}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl bg-yellow-400 text-yellow-950 hover:bg-yellow-300 active:brightness-95 disabled:pointer-events-none disabled:opacity-45 ${kassaFooterActionTouchMinHClass(
                  kassaSxgaDenseTiles,
                  kassaSidebarFooterTier === 'dense',
                )}`}
              >
                <span className="text-center text-xs font-bold">{t('kassaApp.cartBon')}</span>
              </button>
              <button
                type="button"
                onClick={clearCart}
                disabled={billLines.length === 0}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl bg-rose-500 text-white hover:bg-rose-600 active:brightness-95 disabled:bg-rose-900/50 ${kassaFooterActionTouchMinHClass(
                  kassaSxgaDenseTiles,
                  kassaSidebarFooterTier === 'dense',
                )}`}
              >
                <span className="text-center text-xs font-bold">{t('kassaApp.remove')}</span>
              </button>
            </div>
            <div className="flex gap-2.5 touch-manipulation select-none">
              <button
                type="button"
                aria-pressed={numpadPanelVisible}
                data-testid="kassa-numpad-toggle"
                title={t('kassaApp.numpadToggle')}
                aria-label={t('kassaApp.numpadToggle')}
                onClick={() => {
                  playClick()
                  setNumpadPanelVisible((v) => !v)
                }}
                className={`flex items-center justify-center rounded-xl bg-black px-3 font-bold text-white hover:bg-zinc-800 min-h-[3.5rem] py-3 text-sm sm:text-base ${KASSA_SIDEBAR_FOOTER_LEFT_COL} ${
                  numpadPanelVisible ? 'ring-2 ring-white/40' : ''
                }`}
              >
                {t('kassaApp.numpadToggle')}
              </button>
              <button
                type="button"
                data-testid="kassa-checkout"
                onClick={() => {
                  if (billLines.length === 0) return
                  scheduleKassaTapSound(playCheckout)
                  setShowPaymentModal(true)
                }}
                disabled={billLines.length === 0}
                className="flex min-w-0 flex-1 items-center justify-center rounded-xl bg-emerald-500 font-bold text-white hover:bg-emerald-600 disabled:bg-emerald-900/45 min-h-[3.5rem] py-3 text-lg"
              >
                {t('kassaApp.checkout')}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* ── Bevestiging: Tafel wisselen ── */}
      {switchConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className={ui.modalConfirmBg}>
            <div className="text-center">
              <div className="text-4xl mb-2">🪑</div>
              <h2 className={ui.modalConfirmTitle}>{t('kassaApp.switchTableTitle')}</h2>
              <p className={ui.modalConfirmBody}>
                {t('kassaApp.switchTableBody')
                  .replace(/\{current\}/g, String(tableNumber ?? ''))
                  .replace(/\{next\}/g, switchConfirmDisplay)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  openPaymentAfterFloorPlanSwitchRef.current = false
                  setSwitchConfirm(null)
                }}
                className={ui.modalGhostBtn}
              >
                {t('kassaApp.cancel')}
              </button>
              <button
                onClick={() => {
                  const p = switchConfirm ? parseTableOrderMapKey(switchConfirm) : null
                  if (p) doSwitchToTable(p.tableNumber, p.zone)
                }}
                className="flex-1 py-3 rounded-xl bg-[#3C4D6B] text-white font-bold hover:bg-[#2D3A52] transition-colors"
              >
                {t('kassaApp.switchToTable').replace(/\{number\}/g, switchConfirmDisplay)}
              </button>
            </div>
          </div>
        </div>
      )}

      <KassaStaffClockModal
        open={staffClockOpen}
        listLoading={staffClockListLoading}
        staffList={staffClockList}
        busy={staffClockBusy}
        pinModal={staffClockPinModal}
        pinInput={staffClockPinInput}
        pinError={staffClockPinError}
        onClose={() => {
          playClick()
          staffClockPinReqGen.current += 1
          setStaffClockBusy(false)
          setStaffClockOpen(false)
          setStaffClockPinModal(null)
          setStaffClockPinInput('')
          setStaffClockPinError(null)
        }}
        onPinInputChange={setStaffClockPinInput}
        onStartClockIn={(s) => {
          playClick()
          setStaffClockPinModal({ staffId: s.id, staffName: s.name, action: 'in' })
          setStaffClockPinInput('')
          setStaffClockPinError(null)
        }}
        onStartClockOut={(s) => {
          playClick()
          setStaffClockPinModal({ staffId: s.id, staffName: s.name, action: 'out' })
          setStaffClockPinInput('')
          setStaffClockPinError(null)
        }}
        onSales={(s) => startStaffSales(s)}
        onPinCancel={() => {
          playClick()
          staffClockPinReqGen.current += 1
          setStaffClockBusy(false)
          setStaffClockPinModal(null)
          setStaffClockPinInput('')
          setStaffClockPinError(null)
        }}
        onPinConfirm={() => void submitStaffClockPin()}
      />

      {staffClockSummary ? (
        <KassaStaffSalesSummaryModal
          summary={staffClockSummary}
          onPrint={() => void printStaffClockSalesSummary()}
          onClose={() => {
            playClick()
            setStaffClockSummary(null)
          }}
        />
      ) : null}

      <KassaProductStaffGatePopup
        open={productStaffGatePopupOpen}
        onDismiss={() => {
          playClick()
          setProductStaffGatePopupOpen(false)
        }}
      />

      {optionsModal ? (
        <KassaProductOptionsModal
          model={optionsModal}
          onClose={() => setOptionsModal(null)}
          onToggleChoice={toggleChoice}
          onConfirm={confirmOptions}
          appearance={kassaAppearanceDark ? 'dark' : 'light'}
        />
      ) : null}

      {/* ── Plattegrond / Tafelkeuze ── */}
      {showFloorPlan && kassaFloorPlanEnabled && (
        <KassaFloorPlan
          tenant={tenant}
          planZone={pickerBrowseZone}
          seedTables={pickerTables}
          onFloorPlanTablesPersisted={onFloorPlanTablesPersisted}
          onFloorPlanTablesPersistLifecycle={onFloorPlanTablesPersistLifecycle}
          onSelectTable={(nr) => switchToTable(nr)}
          onCheckoutTable={(nr) => {
            playCheckout()
            openPaymentAfterFloorPlanSwitchRef.current = true
            switchToTable(nr)
          }}
          onClose={() => {
            openPaymentAfterFloorPlanSwitchRef.current = false
            setShowFloorPlan(false)
          }}
          tableOrders={tableOrders}
        />
      )}

      {/* Reservatie-actie: blijft tot geen PENDING/WAITLIST meer (zelfde teller als badge) */}
      {effectiveAccess.reservaties && pendingReservCount > 0 && !showReservations && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex max-w-[95vw] items-center gap-4 bg-amber-500 text-white px-8 py-5 rounded-2xl shadow-2xl cursor-pointer border-4 border-amber-700"
          onClick={() => {
            newReservAlertRef.current = null
            setNewReservAlert(null)
            setShowReservations(true)
          }}
        >
          <span className="text-4xl shrink-0" aria-hidden>📅</span>
          <div className="min-w-0">
            <p className="font-black text-xl md:text-2xl leading-tight">
              {pendingReservCount === 1
                ? t('kassaApp.reservationsOneWaiting')
                : t('kassaApp.reservationsManyWaiting').replace(/\{count\}/g, String(pendingReservCount))}
            </p>
            <p className="text-base font-semibold opacity-95 mt-1">{t('kassaApp.tapToView')}</p>
          </div>
        </div>
      )}

      {showReservations && (
        <KassaReservationsView
          tenant={tenant}
          kassaTables={kassaTablesByZone.inside}
          onClose={() => setShowReservations(false)}
          onStartOrder={(tableNr) => {
            setPickerBrowseZone(FLOOR_PLAN_ZONE_INSIDE)
            doSwitchToTable(tableNr, FLOOR_PLAN_ZONE_INSIDE)
            setShowReservations(false)
          }}
        />
      )}

      {/* Tafelkiezer: gecentreerd over de kassa (niet in de rechterkolom) */}
      {showTablePicker && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kassa-table-picker-title"
          data-testid="kassa-table-picker-modal"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 touch-manipulation"
            aria-label={t('kassaApp.closeAria')}
            onClick={() => {
              setShowTablePicker(false)
              setKassaZoneTab(null)
            }}
          />
          <div
            className={`relative z-10 flex w-full max-w-3xl max-h-[min(88vh,780px)] min-h-0 flex-col overflow-hidden rounded-2xl border shadow-2xl ${ui.tablePickerBorder} ${
              kassaAppearanceDark ? KASSA_POS_MENU_PLATE_SHELL_BG_CLASS : 'bg-white'
            }`}
          >
            <div className={`flex shrink-0 items-center gap-3 border-b px-4 py-3 ${ui.tablePickerHeader}`}>
              <div className="min-w-0 flex-1 text-center">
                <p
                  id="kassa-table-picker-title"
                  className={`text-xs font-bold uppercase tracking-wider ${ui.tablePickerEmpty}`}
                >
                  {t('kassaApp.pickTableTitle')}
                </p>
                <p className={`mt-0.5 text-base font-bold ${ui.flyMenuText}`}>
                  {pickerBrowseZone === FLOOR_PLAN_ZONE_TERRACE
                    ? t('kassaApp.floorZoneTerrace')
                    : t('kassaApp.floorZoneInside')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  playClick()
                  setShowTablePicker(false)
                  setKassaZoneTab(null)
                }}
                className={`shrink-0 rounded-xl px-3 py-2 text-lg font-bold leading-none transition-colors ${ui.categoryStripHover} ${ui.flyMenuText}`}
                aria-label={t('kassaApp.closeAria')}
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y">
              {pickerTables.length === 0 && pickerStools.length === 0 ? (
                <div className={`p-8 text-center text-base ${ui.tablePickerEmpty}`}>
                  {t('kassaApp.noTablesYet')}
                </div>
              ) : (
                <>
                  {pickerTables.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 md:grid-cols-5">
                      {pickerTables.map((tbl) => (
                        <button
                          key={tbl.id}
                          type="button"
                          onClick={() => switchToTable(tbl.number)}
                          className={`relative touch-manipulation rounded-xl border-2 py-4 font-bold transition-colors active:brightness-95 ${
                            tableNumber === tbl.number && dineInFloorZone === pickerBrowseZone
                              ? 'border-[#3C4D6B] bg-[#3C4D6B] text-white'
                              : tbl.status === 'FREE'
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : tbl.status === 'UNPAID'
                                  ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          <div className="text-2xl">🪑</div>
                          <div className="text-lg">{tbl.number}</div>
                          <div className="text-[11px] opacity-70">
                            {tbl.status === 'FREE'
                              ? t('kassaApp.tableStatusFree')
                              : tbl.status === 'OCCUPIED'
                                ? t('kassaApp.tableStatusOccupied')
                                : t('kassaApp.tableStatusUnpaid')}
                          </div>
                          {(tableOrders[tableOrderMapKey(pickerBrowseZone, tbl.number)]?.length ?? 0) > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                              {tableOrders[tableOrderMapKey(pickerBrowseZone, tbl.number)]!.length}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {pickerStools.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 border-t border-amber-100 bg-amber-50 px-4 py-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                          🍺 {t('kassaApp.stoolsSection')}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 md:grid-cols-5">
                        {pickerStools.map((s) => (
                          <button
                            key={s.segmentId + s.stoolNumber}
                            type="button"
                            onClick={() => switchToTable(s.stoolNumber)}
                            className={`relative touch-manipulation rounded-xl border-2 py-4 font-bold transition-colors active:brightness-95 ${
                              tableNumber === s.stoolNumber && dineInFloorZone === pickerBrowseZone
                                ? 'border-[#3C4D6B] bg-[#3C4D6B] text-white'
                                : (tableOrders[tableOrderMapKey(pickerBrowseZone, s.stoolNumber)]?.length ?? 0) > 0
                                  ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                  : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            <div className="text-2xl">🍺</div>
                            <div className="text-lg">{s.stoolNumber}</div>
                            <div className="text-[11px] opacity-70">
                              {(tableOrders[tableOrderMapKey(pickerBrowseZone, s.stoolNumber)]?.length ?? 0) > 0
                                ? t('kassaApp.tableStatusOccupied')
                                : t('kassaApp.tableStatusFree')}
                            </div>
                            {(tableOrders[tableOrderMapKey(pickerBrowseZone, s.stoolNumber)]?.length ?? 0) > 0 && (
                              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                                {tableOrders[tableOrderMapKey(pickerBrowseZone, s.stoolNumber)]!.length}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <div className={`flex shrink-0 gap-2 border-t p-3 ${ui.tablePickerFooterBar}`}>
              {tableNumber && (
                <button
                  type="button"
                  onClick={() => {
                    playClick()
                    setTableNumber('')
                    setDineInFloorZone(pickerBrowseZone)
                    setShowTablePicker(false)
                    setKassaZoneTab(null)
                  }}
                  className="flex-1 rounded-xl bg-red-50 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                >
                  ✕ {t('kassaApp.clearTable')}
                </button>
              )}
              {kassaFloorPlanEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    playClick()
                    setShowTablePicker(false)
                    setShowFloorPlan(true)
                  }}
                  className={`flex items-center justify-center py-3 text-sm font-semibold ${tableNumber ? 'flex-1' : 'w-full'} ${
                    kassaAppearanceDark
                      ? kassaPosButtonClass(false)
                      : 'rounded-xl bg-[#3C4D6B] text-white transition-colors hover:bg-[#2D3A52]'
                  }`}
                >
                  {t('kassaApp.floorPlan')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Betaalmodal / split / succes ── */}
      <KassaPaymentModal
        open={showPaymentModal}
        total={total}
        options={paymentMethodOptions}
        onClose={() => setShowPaymentModal(false)}
        onPay={(method) => void completePayment(method)}
        onOpenSplit={() => {
          setSplitCash(0)
          setSplitCard(total)
          setShowSplitModal(true)
          setShowPaymentModal(false)
        }}
        appearance={kassaAppearanceDark ? 'dark' : 'light'}
      />

      <KassaSplitPaymentModal
        open={showSplitModal}
        total={total}
        splitCash={splitCash}
        splitCard={splitCard}
        setSplitCash={setSplitCash}
        setSplitCard={setSplitCard}
        onCloseBack={() => {
          setShowSplitModal(false)
          setShowPaymentModal(true)
        }}
        onConfirm={() => void completePayment('SPLIT', { cash: splitCash, card: splitCard })}
        appearance={kassaAppearanceDark ? 'dark' : 'light'}
      />

      {printAgentFallbackHtml !== null && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="print-agent-fallback-title"
        >
          <div className={ui.printFallbackPanel}>
            <h2 id="print-agent-fallback-title" className={ui.printFallbackTitle}>
              {t('kassaApp.printAgentFallbackModalTitle')}
            </h2>
            <p className={ui.printFallbackBody}>{t('kassaApp.printAgentFallbackModalBody')}</p>
            <a
              href="https://www.vysionhoreca.com/download/print-agent-windows"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-[#3C4D6B] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#2D3A52]"
            >
              {t('kassaApp.printAgentFallbackModalDownloadLink')}
            </a>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={`w-full sm:w-auto ${ui.modalGhostBtn}`}
                onClick={() => setPrintAgentFallbackHtml(null)}
              >
                {t('kassaApp.printAgentFallbackModalClose')}
              </button>
              <button
                type="button"
                title={
                  isAndroidTabletPrintClient()
                    ? t('kassaApp.printAgentFallbackEmergencyPrintDisabledHint')
                    : undefined
                }
                disabled={
                  !printAgentFallbackHtml ||
                  printAgentFallbackHtml.length === 0 ||
                  isAndroidTabletPrintClient()
                }
                className={`w-full sm:w-auto ${ui.printFallbackGhost.replace(/^mt-3\s+/, '')} disabled:cursor-not-allowed disabled:opacity-50`}
                onClick={() => {
                  const h = printAgentFallbackHtml
                  setPrintAgentFallbackHtml(null)
                  if (h && h.length > 0 && !isAndroidTabletPrintClient()) printReceiptHtmlDocument(h)
                }}
              >
                {t('kassaApp.printAgentFallbackModalContinue')}
              </button>
            </div>
          </div>
        </div>
      )}

      {thermalPrintBanner && (
        <div
          className="fixed inset-x-2 bottom-2 z-[400] max-h-[45vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-white shadow-xl sm:inset-x-6"
          role="alert"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p
              className={`whitespace-pre-wrap text-sm leading-relaxed ${
                thermalPrintBanner.variant === 'error' ? 'text-red-200' : 'text-emerald-200'
              }`}
            >
              {thermalPrintBanner.message}
            </p>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start">
              <button
                type="button"
                onClick={() => setThermalPrintBanner(null)}
                className="touch-manipulation rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {lastOrder ? (
        <KassaSuccessReceiptModal
          open={showSuccessModal}
          order={lastOrder}
          tenantInfo={tenantInfo}
          locale={locale}
          onClose={() => setShowSuccessModal(false)}
          printDisabled={successReceiptPrintBusy}
          onPrint={async () => {
            try {
              setSuccessReceiptPrintBusy(true)
              await printReceipt(lastOrder)
            } finally {
              setSuccessReceiptPrintBusy(false)
              setShowSuccessModal(false)
            }
          }}
        />
      ) : null}

      {/* ── ORANJE SCHERM: Nieuwe online bestelling (exact donor) ── */}
      {newOrderAlert && !demoViewOnly && (
        <div
          className="fixed inset-0 z-[200] bg-orange-500 flex flex-col items-center justify-center animate-pulse cursor-pointer"
          onClick={() => {
            // Voeg toe aan dismissed zodat polling dit order niet opnieuw toont
            if (newOrderAlert) {
              dismissedOrderIdsRef.current = [...dismissedOrderIdsRef.current, newOrderAlert.id]
            }
            newOrderAlertRef.current = null
            setNewOrderAlert(null)
            router.push(`/shop/${tenant}/admin/bestellingen`)
          }}
        >
          <div className="text-white text-center px-8">
            <div className="text-6xl mb-4">🔔</div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">{t('kassaApp.newOrderSplashTitle')}</h1>
            <div className="text-3xl md:text-5xl font-bold mb-6">#{newOrderAlert.orderNumber}</div>
            <div className="text-2xl md:text-4xl mb-8">€{newOrderAlert.total.toFixed(2)}</div>
            <div className="text-xl opacity-80 mt-8">{t('kassaApp.newOrderSplashTap')}</div>
            <p className="text-white/60 mt-4 text-sm">{t('kassaApp.newOrderSoundNote')}</p>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default function KassaAdminPage(props: { params: { tenant: string } }) {
  return (
    <Suspense fallback={<KassaRegisterSuspenseFallback />}>
      <KassaAdminPageInner {...props} />
    </Suspense>
  )
}
