'use client'

import { Suspense, useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  MenuProduct,
  MenuCategory,
  ProductOption,
  ProductOptionChoice,
  getMenuCategories,
  getMenuProducts,
  getProductsWithOptions,
  getOptionsForProduct,
  getTenantSettings,
  TenantSettings,
  clampKassaProductImageZoom,
  compareMenuProductsBySortOrder,
} from '@/lib/admin-api'
import { supabase } from '@/lib/supabase'
import { adminDb } from '@/lib/admin-db-client'
import { useLanguage } from '@/i18n'
import { getSoundsEnabled, setSoundsEnabled, playClick, playAddToCart, playRemove, playSuccess, playCashRegister, playCheckout, initAudio, prewarmAudio, playOrderNotification, activateAudioForIOS } from '@/lib/sounds'
import { prefetchProductImageUrls } from '@/lib/offline-product-images'
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
import { sendToVysionPrintAgent, openCashDrawer } from '@/lib/vysion-print-agent-client'
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
import {
  flushOfflineOrdersToSupabase,
  mergeOfflineOrderQueues,
  offlineOrdersQueueStorageKey,
} from '@/lib/kassa-offline-order-queue'
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
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('tenant_slug', tenant).eq('status', 'new'),
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
            .select('id,order_number,total,status')
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

        // ── Orders (zelfde als voorheen, alarm stop/start via gezamenlijke stap onderaan) ──
        const currentOrderIds = list.map((o: any) => o.id)
        const prevOrderIds = previousOrderIdsRef.current
        if (!isFirstOrderCheck) {
          const newOrderOnes = list.filter((o: any) => !prevOrderIds.includes(o.id))
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
          if (list.length > 0) startAlarm()
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

        // ── Alarm aan/uit: nieuwe bestelling OF reservering-alarm na echte nieuwe binnenkomst (niet bij openen met oude backlog) ──
        const needOrderAlarm = list.length > 0
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

  /** gap-4 = 16px; 3 rijen categorieën in view. */
  const KASSA_MENU_VISIBLE_ROWS = 3
  const KASSA_MENU_GRID_GAP_PX = 16

  function computeInitialKassaMenuRowPx(): number {
    if (typeof window === 'undefined') return 220
    const vh = window.visualViewport?.height ?? window.innerHeight
    const overhead = 68 + 56
    const innerApprox = Math.max(0, vh - overhead - 48)
    const row =
      (innerApprox - (KASSA_MENU_VISIBLE_ROWS - 1) * KASSA_MENU_GRID_GAP_PX) / KASSA_MENU_VISIBLE_ROWS
    return Math.max(140, Math.floor(row))
  }

  /** Menu-paneel: 4×3 volle tegels in het zicht; rijhoogte = f(scrollport). gap-4 = 16px. */
  const kassaMenuScrollRef = useRef<HTMLDivElement>(null)
  const [kassaMenuRowPx, setKassaMenuRowPx] = useState(computeInitialKassaMenuRowPx)

  const [showReservations, setShowReservations] = useState(false)
  const [pendingReservCount, setPendingReservCount] = useState(0)
  const [showFloorPlan, setShowFloorPlan] = useState(false)
  const [showTablePicker, setShowTablePicker] = useState(false)
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
  // Openstaande bestellingen per tafel: { "1": CartItem[], "2": CartItem[], ... }
  const [tableOrders, setTableOrders] = useState<Record<string, CartItem[]>>({})

  const tableOrdersKey = `vysion_table_orders_${tenant}`
  const persistTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

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
    const el = kassaMenuScrollRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const st = getComputedStyle(el)
      const pt = parseFloat(st.paddingTop) || 0
      const pb = parseFloat(st.paddingBottom) || 0
      const innerH = el.clientHeight - pt - pb
      if (innerH <= 0) return
      const rowH =
        (innerH - (KASSA_MENU_VISIBLE_ROWS - 1) * KASSA_MENU_GRID_GAP_PX) / KASSA_MENU_VISIBLE_ROWS
      setKassaMenuRowPx(Math.max(80, Math.floor(rowH)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [selectedCategory, menuLoading])

  // Laad tafels + barkrukken + openstaande bestellingen (localStorage + Supabase sync)

  useEffect(() => {
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
  }, [tenant, tableOrdersKey, applyOpenOrdersFromServerRows, applyKassaFloorPlanTablesPayload])

  // ── Realtime sync: tafelstatus tussen apparaten ───────────────────────────
  useEffect(() => {
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
  }, [tenant, applyKassaFloorPlanTablesPayload])

  // ── Realtime sync: plattegrond-decor / barkrukken ─────────────────────────
  useEffect(() => {
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
  }, [tenant])

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
      pullFloorAndDecor()
      pullOpenOrders()
    }

    const onActive = () => {
      if (document.visibilityState !== 'visible') return
      pullAll()
    }

    document.addEventListener('visibilitychange', onActive)
    window.addEventListener('focus', onActive)
    const timerFloor = window.setInterval(() => {
      if (document.visibilityState === 'visible') pullFloorAndDecor()
    }, 45_000)
    const timerOrders = window.setInterval(() => {
      if (document.visibilityState === 'visible') pullOpenOrders()
    }, 12_000)

    return () => {
      document.removeEventListener('visibilitychange', onActive)
      window.removeEventListener('focus', onActive)
      window.clearInterval(timerFloor)
      window.clearInterval(timerOrders)
    }
  }, [tenant, applyOpenOrdersFromServerRows, applyKassaFloorPlanTablesPayload])

  const cancelPersistTimer = (slotKey: string) => {
    const timers = persistTimersRef.current
    const prev = timers[slotKey]
    if (prev) {
      clearTimeout(prev)
      delete timers[slotKey]
    }
  }

  const persistOpenOrderRowToSupabase = async (
    zone: FloorPlanZone,
    tblNr: string,
    items: CartItem[],
  ) => {
    const run = async (attempt: number): Promise<void> => {
      const delOpen = await adminDb.delete(
        'orders',
        { tenant_slug: tenant, table_number: tblNr, status: 'open', floor_plan_zone: zone },
        { tenantSlug: tenant },
      )
      if (!delOpen.ok) {
        console.warn('[kassa] open order delete failed:', delOpen.error)
      }
      const delPrep = await adminDb.delete(
        'orders',
        { tenant_slug: tenant, table_number: tblNr, status: 'preparing', floor_plan_zone: zone },
        { tenantSlug: tenant },
      )
      if (!delPrep.ok) {
        console.warn('[kassa] preparing draft delete failed:', delPrep.error)
      }
      if (items.length === 0) return
      let customerTableLabel = t('kassaReceipt.tableLabel').replace(/\{number\}/g, String(tblNr))
      if (zone === FLOOR_PLAN_ZONE_TERRACE) {
        customerTableLabel = `${customerTableLabel} (${t('kassaApp.floorZoneTerrace')})`
      }
      const insRes = await adminDb.insert(
        'orders',
        {
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
          created_at: new Date().toISOString(),
        },
        { tenantSlug: tenant },
      )
      if (insRes.ok) return
      console.warn('[kassa] open order insert failed:', insRes.error)
      const errMsg = insRes.error || ''
      const uniqueOrConflict =
        insRes.status === 409 || /duplicate|unique|23505/i.test(errMsg)
      if (attempt < 2 && (insRes.status === 0 || insRes.status >= 500 || uniqueOrConflict)) {
        window.setTimeout(() => void run(attempt + 1), 650 * (attempt + 1))
      }
    }
    await run(0)
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
      saveCartToTable(dineInFloorZone, tableNumber, cart)
    }
    const slotKey = tableOrderMapKey(zone, newTableNr)
    const existingOrder = tableOrders[slotKey] || []
    setCart(existingOrder)
    setTableNumber(newTableNr)
    setDineInFloorZone(zone)
    setOrderType('DINE_IN')
    setShowTablePicker(false)
    setSwitchConfirm(null)
  }

  // "Naar tafel" knop: sla bestelling op en leeg de kassa voor volgende tafel
  const parkOrder = () => {
    if (!tableNumber || cart.length === 0) return
    saveCartToTable(dineInFloorZone, tableNumber, cart)
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
  /** HTML bon wacht op modal als lokale Print Agent faalt; daarna printReceiptHtmlDocument */
  const [printAgentFallbackHtml, setPrintAgentFallbackHtml] = useState<string | null>(null)
  const [splitCash, setSplitCash] = useState(0)
  const [splitCard, setSplitCard] = useState(0)
  const [lastOrder, setLastOrder] = useState<KassaLastOrderReceipt | null>(null)
  const [tenantInfo, setTenantInfo] = useState<TenantSettings | null>(null)

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
  const CACHE_SETTINGS = `vysion_settings_${tenant}`

  // Laad categorieën, producten en welke producten opties hebben
  // Offline: laad uit localStorage-cache; online: laad van Supabase en update cache
  const loadMenu = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent
    if (!silent) setMenuLoading(true)

    // 1) IndexedDB (meest recente snapshot na eerdere sessie)
    try {
      const snap = await offlineDbLoadMenuSnapshot(tenant)
      if (snap) {
        setCategories(JSON.parse(snap.categoriesJson))
        setProducts(JSON.parse(snap.productsJson))
        setProductsWithOptions(JSON.parse(snap.productsWithOptionsJson))
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
        setCategories(JSON.parse(cachedCats))
        setProducts(JSON.parse(cachedProds))
        setProductsWithOptions(JSON.parse(cachedOpts))
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
      const activeCats = cats.filter(c => c.is_active)
      const activeProds = prods.filter(p => p.is_active)
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
    // TenantSettings: ook met cache
    const cachedSettings = localStorage.getItem(CACHE_SETTINGS)
    if (cachedSettings) { try { setTenantInfo(JSON.parse(cachedSettings)) } catch { /* ignore */ } }
    getTenantSettings(tenant).then(s => {
      setTenantInfo(s)
      try { localStorage.setItem(CACHE_SETTINGS, JSON.stringify(s)) } catch { /* ignore */ }
    }).catch(() => { /* offline: al geladen uit cache */ })
  }, [tenant, loadMenu, CACHE_SETTINGS])

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
  const syncTableOrder = (tblNr: string | '', updatedCart: CartItem[]) => {
    if (!tblNr) return
    const zone = dineInFloorZone
    const slotKey = tableOrderMapKey(zone, tblNr)
    setTableOrders((prev) => {
      const next = { ...prev, [slotKey]: updatedCart }
      localStorage.setItem(tableOrdersKey, JSON.stringify(next))
      return next
    })
    schedulePersistOpenOrder(zone, tblNr, updatedCart)
  }

  const addToCart = (product: MenuProduct, choices: SelectedChoice[] = []) => {
    playAddToCart()
    const cartKey = choices.length > 0
      ? `${product.id}-${choices.map(c => c.choiceId).sort().join('-')}`
      : product.id!
    setCart(prev => {
      const existing = prev.find(i => i.cartKey === cartKey)
      const updated = existing
        ? prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { product, quantity: 1, choices, cartKey }]
      if (tableNumber) {
        syncTableOrder(tableNumber, updated)
      }
      return updated
    })
  }

  const handleProductClick = async (product: MenuProduct) => {
    if (blockSaleWithoutStaffIfNeededRef.current()) return
    if (product.id && productIdsWithOptionsSet.has(product.id)) {
      const opts = await getOptionsForProduct(product.id!)
      setOptionsModal({ product, options: opts, selected: [] })
    } else {
      addToCart(product)
    }
  }

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
      playAddToCart()
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
          updateTableStatus(tableNumber, updated.length > 0, dineInFloorZone)
          syncTableOrder(tableNumber, updated)
        }
        return updated
      })
    } else {
      addToCart(product, selected)
    }
    setOptionsModal(null)
  }

  const updateQty = (cartKey: string, qty: number) => {
    if (qty <= 0) playRemove(); else playClick()
    setCart(prev => {
      const updated = qty <= 0
        ? prev.filter(i => i.cartKey !== cartKey)
        : prev.map(i => i.cartKey === cartKey ? { ...i, quantity: qty } : i)
      if (tableNumber) {
        updateTableStatus(tableNumber, updated.length > 0, dineInFloorZone)
        syncTableOrder(tableNumber, updated)
      }
      return updated
    })
  }

  const clearCart = () => {
    playRemove()
    setCart([])
    if (tableNumber) {
      syncTableOrder(tableNumber, [])
      updateTableStatus(tableNumber, false, dineInFloorZone)
    }
  }
  const total = cart.reduce((sum, i) => {
    const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
    return sum + (i.product.price + choicesTotal) * i.quantity
  }, 0)

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

  const dineInBannerLabel =
    tableNumber
      ? `🍽️ ${t('kassaApp.tableWord')} ${tableNumber}${
          dineInFloorZone === FLOOR_PLAN_ZONE_TERRACE
            ? ` (${t('kassaApp.floorZoneTerraceShort')})`
            : ''
        }`
      : `🍽️ ${t('kassaApp.orderTypeDineIn').toUpperCase()}`

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

  useEffect(() => {
    const bc = customerDisplayBcRef.current
    if (!bc || !customerDisplayToken) return

    const businessName =
      tenantInfo?.business_name ??
      tenant
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    const vatRate = tenantInfo?.btw_percentage ?? 6
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
    } else if (cart.length === 0 && !showPaymentModal && !showSplitModal) {
      msg = { v: 1, phase: 'idle', tenantSlug: tenant, businessName }
    } else if ((showPaymentModal || showSplitModal) && cart.length > 0) {
      const subtotalExVatRaw = totalInclVat / (1 + vatRate / 100)
      const subtotalExVat = Math.round(subtotalExVatRaw * 100) / 100
      const vatAmount = Math.round((totalInclVat - subtotalExVat) * 100) / 100
      msg = {
        v: 1,
        phase: 'checkout',
        tenantSlug: tenant,
        businessName,
        lines: buildKassaCustomerDisplayLines(cart),
        subtotalExVat,
        vatRate,
        vatAmount,
        totalInclVat,
        dineInSubtitle: customerDisplayDineInSubtitle,
      }
    } else if (cart.length > 0) {
      msg = {
        v: 1,
        phase: 'cart',
        tenantSlug: tenant,
        businessName,
        lines: buildKassaCustomerDisplayLines(cart),
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
    cart,
    total,
    showPaymentModal,
    showSplitModal,
    tenantInfo?.business_name,
    tenantInfo?.btw_percentage,
    customerDisplayThankYou,
    customerDisplayDineInSubtitle,
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

  /** Eerste productafbeelding per categorie (zelfde volgorde als vroeger: door products-array). */
  const categoryTileImageUrlByCategoryId = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of products) {
      const cid = p.category_id
      if (!cid || !p.image_url) continue
      if (!m.has(cid)) m.set(cid, p.image_url)
    }
    return m
  }, [products])

  const productsInSelectedCategory = useMemo(() => {
    if (!selectedCategory) return []
    return products
      .filter(p => p.category_id === selectedCategory.id)
      .sort(compareMenuProductsBySortOrder)
  }, [products, selectedCategory])

  // ── Numpad ────────────────────────────────────────────────────────────────
  const handleNumpad = (key: string) => {
    if (key === 'C') { setNumpadValue(''); return }
    if (key === '=') {
      try {
        const expr = numpadValue.replace(/×/g, '*')
        // eslint-disable-next-line no-new-func
        const result = Function('"use strict"; return (' + expr + ')')()
        setNumpadValue(String(result))
      } catch { /* ongeldige expressie */ }
      return
    }
    if (['+', '-', '×'].includes(key)) {
      if (numpadValue && !['+', '-', '×'].some(op => numpadValue.endsWith(op)))
        setNumpadValue(numpadValue + key)
      return
    }
    if (key === '.') {
      const parts = numpadValue.split(/[+\-×]/)
      if (!parts[parts.length - 1].includes('.')) setNumpadValue(numpadValue + '.')
      return
    }
    setNumpadValue(numpadValue + key)
  }

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
      setCart(prev => [...prev, { product: custom, quantity: 1, cartKey: custom.id! }])
      setNumpadValue('')
    }
  }

  const cycleOrderType = () => {
    const types: OrderType[] = ['DINE_IN', 'TAKEAWAY', 'DELIVERY']
    setOrderType(types[(types.indexOf(orderType) + 1) % types.length])
  }

  useKassaOfflineFlushBridge(tenant, flushOfflineOrdersRef)

  const clearTableAfterPayment = (zone: FloorPlanZone, tblNr: string) => {
    const slotKey = tableOrderMapKey(zone, tblNr)
    cancelPersistTimer(slotKey)
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

  const completePayment = async (
    method: PaymentMethodType,
    splitAmounts?: { cash: number; card: number },
  ) => {
    if (cart.length === 0) return

    if (method === 'SPLIT') {
      const sc = splitAmounts?.cash ?? 0
      const sd = splitAmounts?.card ?? 0
      if (Math.abs(total - sc - sd) > 0.02) return
    }

    const vatRate = tenantInfo?.btw_percentage ?? 6
    const subtotal = total / (1 + vatRate / 100)
    const tax = total - subtotal
    const createdAt = new Date()
    const kassa_client_uuid =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${tenant}-${createdAt.getTime()}-${Math.random().toString(36).slice(2, 12)}`

    const shortRef = kassa_client_uuid.replace(/-/g, '').slice(-10).toUpperCase()

    const customerTableLabel =
      tableNumber
        ? (() => {
            let lbl = t('kassaReceipt.tableLabel').replace(/\{number\}/g, String(tableNumber))
            if (orderType === 'DINE_IN' && dineInFloorZone === FLOOR_PLAN_ZONE_TERRACE) {
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
      items: cart.map(i => ({
        product_id: i.product.id,
        name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
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
      items: [...cart],
      total,
      paymentMethod: method,
      splitCash: method === 'SPLIT' ? splitAmounts?.cash : undefined,
      splitCard: method === 'SPLIT' ? splitAmounts?.card : undefined,
      orderType,
      tableNumber,
      floorPlanZone: orderType === 'DINE_IN' && tableNumber ? dineInFloorZone : undefined,
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

  const printReceipt = async (order: typeof lastOrder, opts?: { draft?: boolean }) => {
    if (!order) return
    const isDraft = !!opts?.draft
    const vatRate = tenantInfo?.btw_percentage ?? 6
    const subtotal = order.total / (1 + vatRate / 100)
    const tax = order.total - subtotal
    const orderTypeLabel =
      order.orderType === 'DINE_IN'
        ? `🍽️ ${t('kassaReceipt.orderTypeDineIn')}`
        : order.orderType === 'TAKEAWAY'
          ? `📦 ${t('kassaReceipt.orderTypeTakeaway')}`
          : `🚗 ${t('kassaReceipt.orderTypeDelivery')}`
    const receiptRefDisplay = isDraft
      ? t('kassaReceipt.draftReceiptRef')
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
    const vatRowLabel = escapeReceiptHtml(t('kassaReceipt.vat').replace('{rate}', String(vatRate)))

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
      bonLines.push(t('kassaReceipt.draftBanner'))
      bonLines.push('--------------------------------')
    }
    bonLines.push(
      order.tableNumber
        ? `${orderTypePlain} | ${t('kassaReceipt.tablePrefix')} ${order.tableNumber}${terraceSuffix}`
        : orderTypePlain,
    )
    bonLines.push(`${t('kassaReceipt.receiptNo')}${receiptRefDisplay}  ${dateStr}`)
    bonLines.push('--------------------------------')
    for (const i of order.items) {
      const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
      const lineTotal = (i.product.price + choicesTotal) * i.quantity
      bonLines.push(`${i.quantity}x ${i.product.name}  EUR ${lineTotal.toFixed(2)}`)
      for (const c of i.choices || []) {
        bonLines.push(`  + ${c.choiceName}${c.price > 0 ? `  EUR ${c.price.toFixed(2)}` : ''}`)
      }
    }
    bonLines.push('--------------------------------')
    bonLines.push(`${t('kassaReceipt.subtotal')}  EUR ${subtotal.toFixed(2)}`)
    bonLines.push(`${t('kassaReceipt.vat').replace('{rate}', String(vatRate))}  EUR ${tax.toFixed(2)}`)
    bonLines.push(`${t('kassaReceipt.total')}  EUR ${order.total.toFixed(2)}`)
    bonLines.push(`${t('kassaReceipt.paidWith')} ${payLabel}`)
    if (order.helpedByStaffName) {
      bonLines.push(t('kassaReceipt.helpedBy').replace('{name}', order.helpedByStaffName))
    }
    if (tenantInfo?.btw_number) {
      bonLines.push(t('kassaReceipt.businessVatLabel').replace('{vatNumber}', tenantInfo.btw_number))
    }
    bonLines.push(isDraft ? t('kassaReceipt.draftFooter') : t('kassaReceipt.thanks'))
    if (tenantInfo?.website) bonLines.push(tenantInfo.website)

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeReceiptHtml(docTitle)}</title><style>${KASSA_PRINT_RECEIPT_STYLES}</style></head><body>
      <div class="center">
        <div class="bold big">${bizName}</div>
        ${tenantInfo?.address ? `<div class="small">${escapeReceiptHtml(tenantInfo.address)}</div>` : ''}
        ${tenantInfo?.postal_code || tenantInfo?.city ? `<div class="small">${escapeReceiptHtml(tenantInfo.postal_code ?? '')} ${escapeReceiptHtml(tenantInfo.city ?? '')}</div>` : ''}
        ${tenantInfo?.phone ? `<div class="small">${escapeReceiptHtml(t('kassaReceipt.telPrefix'))} ${escapeReceiptHtml(tenantInfo.phone)}</div>` : ''}
      </div>
      <div class="divider"></div>
      ${isDraft ? `<div class="center bold">${escapeReceiptHtml(t('kassaReceipt.draftBanner'))}</div><div class="divider-solid"></div>` : ''}
      <div class="center order-type">${escapeReceiptHtml(orderTypeLabel)}${order.tableNumber ? `<br/>${escapeReceiptHtml(t('kassaReceipt.tablePrefix'))} ${escapeReceiptHtml(String(order.tableNumber))}${escapeReceiptHtml(terraceSuffix)}` : ''}</div>
      <div class="row small">
        <span>${escapeReceiptHtml(t('kassaReceipt.receiptNo'))}${escapeReceiptHtml(receiptRefDisplay)}</span>
        <span>${escapeReceiptHtml(dateStr)}</span>
      </div>
      <div class="divider-solid"></div>
      ${order.items.map(i => {
        const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
        const lineTotal = (i.product.price + choicesTotal) * i.quantity
        return `<div class="row"><span>${i.quantity}x ${escapeReceiptHtml(i.product.name)}</span><span>€${lineTotal.toFixed(2)}</span></div>
        ${(i.choices || []).map(c => `<div class="row small" style="margin-left:15px;color:#666;"><span>+ ${escapeReceiptHtml(c.choiceName)}</span><span>${c.price > 0 ? '€' + c.price.toFixed(2) : ''}</span></div>`).join('')}`
      }).join('')}
      <div class="divider-solid"></div>
      <div class="row"><span>${escapeReceiptHtml(t('kassaReceipt.subtotal'))}</span><span>€${subtotal.toFixed(2)}</span></div>
      <div class="row"><span>${vatRowLabel}</span><span>€${tax.toFixed(2)}</span></div>
      <div class="row total"><span>${escapeReceiptHtml(t('kassaReceipt.total'))}</span><span>€${order.total.toFixed(2)}</span></div>
      <div class="divider"></div>
      <div class="center small">${escapeReceiptHtml(t('kassaReceipt.paidWith'))} ${escapeReceiptHtml(payLabel)}</div>
      ${order.helpedByStaffName ? `<div class="divider"></div><div class="center bold">${t('kassaReceipt.helpedBy').replace('{name}', escapeReceiptHtml(order.helpedByStaffName))}</div>` : ''}
      <div class="divider"></div>
      <div class="center small">
        ${tenantInfo?.btw_number ? `${escapeReceiptHtml(t('kassaReceipt.businessVatLabel').replace('{vatNumber}', tenantInfo.btw_number))}<br/>` : ''}
        ${escapeReceiptHtml(isDraft ? t('kassaReceipt.draftFooter') : t('kassaReceipt.thanks'))}
        ${tenantInfo?.website ? `<br/>${escapeReceiptHtml(tenantInfo.website)}` : ''}
      </div>
    </body></html>`

    /** Kassa-lade alleen openen bij contante betaling — PIN/online hebben dat niet nodig. Voorlopige bon: nooit. */
    const isCash =
      !isDraft && ['CASH', 'cash', 'CONTANT', 'contant'].includes(String(order.paymentMethod || ''))

    const agentOk = await sendToVysionPrintAgent({
      winkelnaam: tenantInfo?.business_name || t('kassaApp.defaultBusinessName'),
      bonInhoud: bonLines.join('\n'),
      copies: isDraft ? 1 : 2,
      openDrawer: isCash,
      receiptMode: 'kassa',
      orderData: {
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        tableNumber: order.tableNumber || null,
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
        vatRate: tenantInfo?.btw_percentage ?? 6,
      },
    })
    if (agentOk) return

    setPrintAgentFallbackHtml(html)
  }

  /** Voorlopige bon zonder afrekenen — alleen als er lijnen in de kar zijn. */
  const printDraftBonFromCart = () => {
    if (cart.length === 0) return
    playClick()
    const draftOrder: KassaLastOrderReceipt = {
      orderNumber: 0,
      items: cart,
      total,
      paymentMethod: 'CARD',
      orderType,
      tableNumber: tableNumber || '',
      floorPlanZone: orderType === 'DINE_IN' ? dineInFloorZone : undefined,
      createdAt: new Date(),
      helpedByStaffName: activeKassaStaff?.name ?? null,
    }
    void printReceipt(draftOrder, { draft: true })
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
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        staffName?: string
        summary?: { total: number; order_count: number; orders: { order_number: number; total: number }[] }
      }
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
      setStaffClockPinError(t('staffClock.errors.server'))
    }
    setStaffClockBusy(false)
  }

  const startStaffSales = (s: { id: string; name: string }) => {
    flushSync(() => {
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
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#e3e3e3] p-8">
        <div className="max-w-md text-center text-gray-900">
          <div className="mb-8 text-8xl">🔔</div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900">{t('kassaApp.soundTitle')}</h1>
          <p className="mb-8 text-xl text-gray-700">
            {t('kassaApp.soundBody')}
            <br /><br />
            <strong className="text-gray-900">{t('kassaApp.soundOncePerDay')}</strong>
          </p>
          <button
            onClick={activateSound}
            className="flex w-full transform items-center justify-center gap-4 rounded-2xl bg-green-500 py-6 text-2xl font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-green-600"
          >
            <span className="text-4xl">🔊</span>
            {t('kassaApp.soundActivateButton').toUpperCase()}
          </button>
          <p className="mt-6 text-sm text-gray-600">
            💡 {t('kassaApp.soundHintFooter')}
          </p>
        </div>
      </div>
    )
  }

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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#e3e3e3]">

      {/* ── Blauwe balk: één rij — kleine tenantnaam zodat snelkoppelingen naast elkaar passen zonder horizontale scrollbar ── */}
      <div className="relative z-30 flex min-h-[52px] w-full min-w-0 shrink-0 items-center gap-1 bg-[#1e293b] px-2 py-1.5 sm:gap-1.5 sm:px-3">

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
            className={`flex items-center gap-1.5 rounded-xl px-2 py-1.5 transition-colors sm:gap-2 sm:px-3 ${hamburgerOpen ? 'bg-[#47c6fe] text-[#063042]' : 'bg-[#58CCFF] text-[#063042] hover:bg-[#47c6fe]'}`}
            type="button"
            title={t('kassaApp.hamburgerMenu')}
            aria-expanded={hamburgerOpen}
          >
            <svg className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            <span className="font-bold text-xs leading-tight sm:text-sm">{t('kassaApp.hamburgerMenu')}</span>
          </button>
          {hamburgerOpen && (() => {
            const modules = filteredHamburgerModules
            const activeMod = modules.find(m => m.rowKey === hamburgerSubOpen)
            return (
              <div className="absolute top-full left-0 mt-1 flex z-30">
                {/* Eerste kolom: modules */}
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-y-auto" style={{ width: 240, maxHeight: '85vh' }}>
                  <div className="px-4 py-2.5 bg-[#1e293b] text-white text-xs font-bold uppercase tracking-wider sticky top-0 rounded-t-2xl">
                    {t('adminLayout.menu')}
                  </div>
                  <Link
                    href={baseUrl}
                    prefetch={false}
                    onClick={() => {
                      setHamburgerOpen(false)
                      setHamburgerSubOpen(null)
                    }}
                    className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-blue-50"
                  >
                    <span className="text-lg" aria-hidden>
                      🏠
                    </span>
                    <span>{t('adminLayout.overview')}</span>
                  </Link>
                  {modules.map(mod => (
                    <div key={mod.rowKey} className="border-b border-gray-100 last:border-0">
                      {(
                        <button onClick={() => setHamburgerSubOpen(hamburgerSubOpen === mod.rowKey ? null : mod.rowKey)}
                          className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${hamburgerSubOpen === mod.rowKey ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{mod.icon}</span>
                            <span className="font-semibold text-sm text-gray-700">
                              {mod.labelKey ? t(mod.labelKey) : mod.label}
                            </span>
                          </div>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {/* Tweede popup rechts: sub-items */}
                {activeMod && (
                  <div className="ml-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-y-auto self-start" style={{ width: 220, maxHeight: '85vh' }}>
                    <div className="px-4 py-2.5 bg-[#1e293b] text-white text-xs font-bold uppercase tracking-wider sticky top-0 rounded-t-2xl flex items-center gap-2">
                      <span>{activeMod.icon}</span>{' '}
                      {activeMod.labelKey ? t(activeMod.labelKey) : activeMod.label}
                    </div>
                    {activeMod.items.map(item => (
                      <Link key={item.id} href={item.href} prefetch={item.href === baseUrl ? false : undefined} onClick={() => {
                        setHamburgerOpen(false)
                        setHamburgerSubOpen(null)
                      }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 border-b border-gray-100 text-sm text-gray-700 transition-colors">
                        <span>{item.icon}</span>
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
        <div className="relative z-20 flex min-w-0 max-w-[6.5rem] shrink-0 flex-col justify-center px-0.5 sm:max-w-[8.5rem] md:max-w-[11rem] lg:max-w-[13rem] ml-[2cm]">
          <button
            type="button"
            onClick={printDraftBonFromCart}
            disabled={cart.length === 0}
            className="max-w-full truncate rounded-md px-1 py-0.5 text-center text-[10px] font-semibold leading-tight tracking-tight text-white/95 transition-colors hover:bg-white/15 active:bg-white/25 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent sm:text-[11px] md:text-xs"
            title={t('kassaApp.cartBonTitle')}
            aria-label={t('kassaApp.cartBonTitle')}
          >
            {tenantInfo?.business_name ||
              tenant.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </button>
        </div>

        {/* Snelkoppelingen: geen extra ml hier — tenant heeft ml-[2cm], zo blijven deze knoppen op dezelfde horizontale positie */}
        <div className="relative z-20 flex min-h-0 min-w-0 flex-1 items-center">
          <nav
            aria-label={t('kassaApp.quickLinksAria')}
            className="flex min-h-0 min-w-0 flex-1 flex-nowrap items-center justify-start gap-0.5 sm:gap-1"
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
              className="relative inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-lg bg-[#3C4D6B] px-1.5 py-1 font-bold text-white transition-colors hover:bg-[#2D3A52] sm:gap-1 sm:px-2 sm:py-1.5"
            >
              <span className="text-sm leading-none sm:text-base" aria-hidden>📅</span>
              <span className="text-[11px] leading-snug sm:text-xs">{t('kassaApp.navReservations')}</span>
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
              className="relative inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-lg bg-[#3C4D6B] px-1.5 py-1 font-bold text-white transition-colors hover:bg-[#2D3A52] sm:gap-1 sm:px-2 sm:py-1.5"
            >
              <span className="text-sm leading-none sm:text-base" aria-hidden>
                👤
              </span>
              <span className="text-[11px] leading-snug sm:text-xs">{t('kassaApp.openCustomerDisplay')}</span>
            </button>
          )}

          {effectiveAccess['online-bestellingen'] && (
            <Link
              href={`/shop/${tenant}/display`}
              title={t('kassaApp.navShopDisplay')}
              className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-lg bg-[#3C4D6B] px-1.5 py-1 font-bold text-white transition-colors hover:bg-[#2D3A52] sm:gap-1 sm:px-2 sm:py-1.5"
            >
              <span className="text-sm leading-none sm:text-base" aria-hidden>🖥️</span>
              <span className="text-[11px] leading-snug sm:text-xs">{t('kassaApp.navShopDisplay')}</span>
            </Link>
          )}

          {effectiveAccess['online-bestellingen'] && (
            <Link
              href={`/keuken/${tenant}`}
              title={t('kassaApp.navKitchenDisplay')}
              className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-lg bg-[#3C4D6B] px-1.5 py-1 font-bold text-white transition-colors hover:bg-[#2D3A52] sm:gap-1 sm:px-2 sm:py-1.5"
            >
              <span className="text-sm leading-none sm:text-base" aria-hidden>👨‍🍳</span>
              <span className="text-[11px] leading-snug sm:text-xs">{t('kassaApp.navKitchenDisplay')}</span>
            </Link>
          )}

          <button
            type="button"
            onClick={toggleSound}
            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-lg transition-colors sm:size-9 sm:text-xl ${soundsOn ? 'bg-[#3C4D6B] text-white hover:bg-[#2D3A52]' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
            title={soundsOn ? t('kassaApp.soundOnTitle') : t('kassaApp.soundOffTitle')}
          >
            <span aria-hidden>{soundsOn ? '🔔' : '🔕'}</span>
          </button>

          {isOnline !== null && (
            <div
              className={`inline-flex max-w-[5.5rem] shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-bold leading-tight sm:max-w-[7rem] sm:text-[11px] md:max-w-none md:text-xs ${
                isOnline ? 'bg-[#3C4D6B] text-white' : 'bg-red-600/95 text-white'
              }`}
              title={isOnline ? t('kassaApp.onlineModeLiveTitle') : t('kassaApp.offlineModeActive')}
              role="status"
              aria-live="polite"
            >
              <span className="text-sm leading-none sm:text-base" aria-hidden>☁️</span>
              <span className="truncate">{isOnline ? t('kassaApp.onlineModeLive') : t('kassaApp.offlineModeActive')}</span>
            </div>
          )}

          {activeKassaStaff && !demoViewOnly && (
            <div className="hidden max-w-[7rem] shrink-0 items-center rounded-md bg-emerald-600/90 px-1.5 py-1 text-[10px] font-bold text-white sm:flex md:max-w-[10rem] md:text-xs">
              <span className="truncate" title={activeKassaStaff.name}>
                🛒 {activeKassaStaff.name}
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
              className="inline-flex touch-manipulation items-center gap-0.5 whitespace-nowrap rounded-lg bg-white/10 px-1.5 py-1.5 font-medium text-white transition-colors hover:bg-white/20 sm:gap-1 sm:rounded-xl sm:px-2 sm:py-2 md:px-3"
            >
              <LocaleFlagEmoji locale={locale} variant="inline" className="text-sm text-white sm:text-[15px]" />
              <svg className={`size-4 shrink-0 transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full z-[130] mt-1 min-w-[180px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                {locales.map(lang => (
                  <button key={lang} type="button" onClick={() => { setLocale(lang); setLangOpen(false) }}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${locale === lang ? 'bg-blue-50 font-semibold text-blue-600' : 'text-gray-700'}`}>
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
          className="relative z-20 inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-lg bg-[#58CCFF] px-1.5 py-1 text-[11px] font-bold text-black transition-colors hover:bg-[#47c6fe] sm:gap-1 sm:px-2.5 sm:py-1.5 sm:text-sm"
        >
          <span className="text-sm sm:text-base" aria-hidden>🚪</span>
          <span className="leading-snug">{t('kassaApp.logout')}</span>
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
            <button onClick={handleInstallPWA} className="rounded-full bg-white px-3 py-0.5 text-xs font-bold text-[#3C4D6B] hover:bg-slate-100">{t('kassaApp.install')}</button>
            <button onClick={() => setInstallPrompt(null)} className="text-white/70 hover:text-white text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {/* ── Body: midden + rechts ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden w-full">

        {/* ── Midden: categorieën / producten ── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Sub-header: tik op balk om naar categorieën te gaan (geen aparte Terug-knop) */}
          {selectedCategory && (
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="flex-shrink-0 flex w-full items-center gap-2 px-4 py-2.5 bg-[#e3e3e3] border-b border-gray-300 text-left hover:bg-[#d8d8d8] transition-colors"
            >
              <svg className="h-5 w-5 shrink-0 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-lg font-bold text-gray-800">
                {selectedCategory.icon && <span className="mr-1">{selectedCategory.icon}</span>}
                {selectedCategory.name}
              </span>
            </button>
          )}

          {/* Grid — min-h-0 nodig: anders groeit de flex-child mee met alle tegels en wordt onderaan afgekapt zonder scroll */}
          <div
            ref={kassaMenuScrollRef}
            data-testid="kassa-menu-scroll"
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4 touch-pan-y [overflow-anchor:none]"
          >
            {menuLoading ? (
              <div data-testid="kassa-menu-loading" className="flex items-center justify-center h-full text-gray-400 text-lg">{t('kassaApp.loading')}</div>
            ) : !selectedCategory ? (
              /* Categorieën: vaste 4 kolommen; rijhoogte = (scrollport − gaps) / 3 → altijd 12 volle tegels zichtbaar, rest scrollen */
              categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <span className="text-5xl mb-3">📂</span>
                  <p className="font-semibold">{t('kassaApp.noCategoriesTitle')}</p>
                  <p className="text-sm mt-1">{t('kassaApp.noCategoriesHint')}</p>
                </div>
              ) : (
                <div
                  data-testid="kassa-category-grid"
                  className="grid w-full grid-cols-4 gap-4 pb-8"
                  style={{ gridAutoRows: `${kassaMenuRowPx}px` }}
                >
                  {categories.map(cat => {
                    const catImage = cat.id ? categoryTileImageUrlByCategoryId.get(cat.id) : undefined
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat)}
                        className="group relative h-full min-h-0 w-full min-w-0 overflow-hidden rounded-xl border border-neutral-200/90 bg-neutral-100 shadow-[0_8px_30px_rgba(0,0,0,0.35)] active:scale-95 transition-transform"
                      >
                        {catImage ? (
                          <>
                            <img
                              src={catImage}
                              alt={cat.name}
                              decoding="async"
                              loading="lazy"
                              className="pointer-events-none absolute inset-0 block h-full min-h-0 w-full select-none object-cover object-center !h-full !w-full !max-w-none"
                            />
                            <div
                              className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-32 bg-gradient-to-t from-neutral-950/[0.94] via-neutral-950/55 to-transparent sm:h-36"
                              aria-hidden
                            />
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-2 pb-2.5 pt-12 sm:px-3 sm:pb-3 sm:pt-14">
                              <div className="flex flex-col items-center gap-1.5 text-center">
                                {cat.icon ? (
                                  <span className="text-2xl text-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,.95)] sm:text-3xl md:text-4xl">
                                    {cat.icon}
                                  </span>
                                ) : null}
                                <span className="line-clamp-2 text-xl font-black leading-tight tracking-tight text-amber-50 [text-shadow:0_0_1px_rgba(0,0,0,1),0_2px_4px_rgba(0,0,0,.98),0_4px_18px_rgba(0,0,0,.85)] sm:text-2xl md:text-3xl lg:text-4xl">
                                  {cat.name}
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="pointer-events-none flex h-full w-full flex-col items-center justify-center gap-3 bg-neutral-100 pt-10 pb-20">
                              {cat.icon ? <span className="text-5xl text-neutral-700">{cat.icon}</span> : null}
                            </div>
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-neutral-50/95 px-2 pb-2.5 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5">
                              <span className="block text-center text-xl font-black leading-snug text-neutral-950 sm:text-2xl md:text-3xl">
                                {cat.name}
                              </span>
                            </div>
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            ) : (
              /* Producten: zelfde 4×3 viewport-grid als categorieën */
              productsInSelectedCategory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <span className="text-5xl mb-3">🍽️</span>
                    <p className="font-semibold">{t('kassaApp.noProductsInCategory')}</p>
                  </div>
                ) : (
                  <div
                    data-testid="kassa-product-grid"
                    className="grid w-full grid-cols-4 gap-4 pb-8"
                    style={{ gridAutoRows: `${kassaMenuRowPx}px` }}
                  >
                    {productsInSelectedCategory.map(product => {
                      const inCart = product.id
                        ? (cartQtyByProductId.get(String(product.id)) ?? 0)
                        : 0
                      const hasOpts = product.id ? productIdsWithOptionsSet.has(product.id) : false
                      const kioskZoom = clampKassaProductImageZoom(product.kassa_image_zoom)
                      return (
                        <button
                          key={product.id}
                          onClick={() => handleProductClick(product)}
                          className="group relative h-full min-h-0 w-full min-w-0 overflow-hidden rounded-xl bg-neutral-100 text-left active:scale-95 transition-transform"
                          style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.35)' }}
                        >
                          {product.image_url ? (
                            <>
                              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  decoding="async"
                                  loading="lazy"
                                  style={{
                                    transform: `scale(${kioskZoom})`,
                                    transformOrigin: 'center 78%',
                                  }}
                                  className="pointer-events-none block h-full min-h-0 w-full select-none object-cover object-center !h-full !w-full !max-w-none"
                                />
                              </div>
                              <div
                                className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-36 bg-gradient-to-t from-neutral-950/[0.94] via-neutral-950/55 to-transparent sm:h-[8.75rem]"
                                aria-hidden
                              />
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-2 pb-2.5 pt-12 sm:px-3 sm:pb-3 sm:pt-14">
                                <p className="line-clamp-2 text-lg font-black leading-snug tracking-tight text-amber-50 [text-shadow:0_0_1px_rgba(0,0,0,1),0_2px_4px_rgba(0,0,0,.98),0_4px_18px_rgba(0,0,0,.85)] sm:text-xl md:text-2xl">
                                  {product.name}
                                </p>
                                <p className="mt-1 text-xl font-black tabular-nums text-[#58CCFF] [text-shadow:0_0_1px_rgba(0,0,0,1),0_2px_6px_rgba(0,0,0,.95)] sm:text-2xl md:text-3xl">
                                  €{product.price.toFixed(2)}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="pointer-events-none flex h-full w-full items-center justify-center bg-neutral-100 pb-28 pt-10">
                                <span className="text-5xl text-neutral-300">🍽️</span>
                              </div>
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-neutral-50/95 px-2 pb-2.5 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5">
                                <p className="line-clamp-2 text-lg font-black leading-snug text-neutral-950 sm:text-xl md:text-2xl">
                                  {product.name}
                                </p>
                                <p className="mt-1 text-xl font-black tabular-nums text-[#58CCFF] sm:text-2xl md:text-3xl">
                                  €{product.price.toFixed(2)}
                                </p>
                              </div>
                            </>
                          )}
                          {inCart > 0 && (
                            <div className="absolute top-1.5 right-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-md">
                              {inCart}
                            </div>
                          )}
                          {hasOpts && (
                            <div className="absolute top-1.5 left-1.5 z-20 rounded-md bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-white shadow">
                              ⚙️
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
            )}
          </div>
        </div>

        {/* ── Rechts: numpad / cart ── */}
        <div className="w-80 sm:w-96 lg:w-[380px] bg-white border-l border-gray-200 flex flex-col flex-shrink-0 min-h-0 min-w-0 overflow-hidden">

        {/* Dine-in: één rij — twee halve knoppen (Binnen / Terras). Geen aparte “Kies tafel…”. */}
        {orderType === 'DINE_IN' && (
          <div className="px-3 pt-3 relative shrink-0">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  playClick()
                  if (showTablePicker && pickerBrowseZone === FLOOR_PLAN_ZONE_INSIDE) {
                    setShowTablePicker(false)
                    return
                  }
                  setPickerBrowseZone(FLOOR_PLAN_ZONE_INSIDE)
                  setShowTablePicker(true)
                }}
                className={`flex min-h-[48px] flex-1 flex-col items-center justify-center rounded-xl px-2 py-2.5 font-bold transition-colors sm:py-3 ${
                  pickerBrowseZone === FLOOR_PLAN_ZONE_INSIDE && showTablePicker
                    ? 'bg-[#3C4D6B] text-white ring-2 ring-[#58CCFF]/55 ring-offset-2 ring-offset-white'
                    : 'bg-[#3C4D6B] text-white hover:bg-[#2D3A52]'
                }`}
              >
                <span className="text-sm sm:text-base">{t('kassaApp.floorZoneInside')}</span>
                {tableNumber && dineInFloorZone === FLOOR_PLAN_ZONE_INSIDE ? (
                  <span className="mt-0.5 text-xs font-semibold opacity-95">
                    {kassaStoolsByZone[FLOOR_PLAN_ZONE_INSIDE].some((s) => s.stoolNumber === tableNumber)
                      ? `🍺 ${tableNumber}`
                      : `🪑 ${tableNumber}`}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick()
                  if (showTablePicker && pickerBrowseZone === FLOOR_PLAN_ZONE_TERRACE) {
                    setShowTablePicker(false)
                    return
                  }
                  setPickerBrowseZone(FLOOR_PLAN_ZONE_TERRACE)
                  setShowTablePicker(true)
                }}
                className={`flex min-h-[48px] flex-1 flex-col items-center justify-center rounded-xl px-2 py-2.5 font-bold transition-colors sm:py-3 ${
                  pickerBrowseZone === FLOOR_PLAN_ZONE_TERRACE && showTablePicker
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-300/80 ring-offset-2 ring-offset-white'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                <span className="text-sm sm:text-base">{t('kassaApp.floorZoneTerrace')}</span>
                {tableNumber && dineInFloorZone === FLOOR_PLAN_ZONE_TERRACE ? (
                  <span className="mt-0.5 text-xs font-semibold opacity-95">
                    {kassaStoolsByZone[FLOOR_PLAN_ZONE_TERRACE].some((s) => s.stoolNumber === tableNumber)
                      ? `🍺 ${tableNumber}`
                      : `🪑 ${tableNumber}`}
                  </span>
                ) : null}
              </button>
            </div>

            {/* Tafel picker popup */}
            {showTablePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTablePicker(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                  <div className="p-3 border-b bg-gray-50">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">{t('kassaApp.pickTableTitle')}</p>
                  </div>
                  {pickerTables.length === 0 && pickerStools.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      {t('kassaApp.noTablesYet')}
                    </div>
                  ) : (
                    <>
                      {pickerTables.length > 0 && (
                        <div className="p-2 grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                          {pickerTables.map((tbl) => (
                            <button
                              key={tbl.id}
                              onClick={() => switchToTable(tbl.number)}
                              className={`py-3 rounded-xl font-bold text-sm transition-colors border-2 relative ${
                                tableNumber === tbl.number && dineInFloorZone === pickerBrowseZone
                                  ? 'bg-[#3C4D6B] text-white border-[#3C4D6B]'
                                  : tbl.status === 'FREE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                  : tbl.status === 'UNPAID'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                  : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                              }`}
                            >
                              <div className="text-lg">🪑</div>
                              <div>{tbl.number}</div>
                              <div className="text-[10px] opacity-70">
                                {tbl.status === 'FREE'
                                  ? t('kassaApp.tableStatusFree')
                                  : tbl.status === 'OCCUPIED'
                                    ? t('kassaApp.tableStatusOccupied')
                                    : t('kassaApp.tableStatusUnpaid')}
                              </div>
                              {(tableOrders[tableOrderMapKey(pickerBrowseZone, tbl.number)]?.length ?? 0) > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                  {tableOrders[tableOrderMapKey(pickerBrowseZone, tbl.number)]!.length}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {pickerStools.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">🍺 {t('kassaApp.stoolsSection')}</span>
                          </div>
                          <div className="p-2 grid grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                            {pickerStools.map((s) => (
                              <button
                                key={s.segmentId + s.stoolNumber}
                                onClick={() => switchToTable(s.stoolNumber)}
                                className={`py-3 rounded-xl font-bold text-sm transition-colors border-2 relative ${
                                  tableNumber === s.stoolNumber && dineInFloorZone === pickerBrowseZone
                                    ? 'bg-[#3C4D6B] text-white border-[#3C4D6B]'
                                    : (tableOrders[tableOrderMapKey(pickerBrowseZone, s.stoolNumber)]?.length ?? 0) >
                                      0
                                    ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                                    : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                }`}
                              >
                                <div className="text-lg">🍺</div>
                                <div>{s.stoolNumber}</div>
                                <div className="text-[10px] opacity-70">
                                  {(tableOrders[tableOrderMapKey(pickerBrowseZone, s.stoolNumber)]?.length ?? 0) > 0
                                    ? t('kassaApp.tableStatusOccupied')
                                    : t('kassaApp.tableStatusFree')}
                                </div>
                                {(tableOrders[tableOrderMapKey(pickerBrowseZone, s.stoolNumber)]?.length ?? 0) > 0 && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
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
                  <div className="p-2 border-t bg-gray-50 flex gap-2">
                    {tableNumber && (
                      <button
                        onClick={() => {
                          setTableNumber('')
                          setDineInFloorZone(pickerBrowseZone)
                          setShowTablePicker(false)
                        }}
                        className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors"
                      >
                        ✕ {t('kassaApp.clearTable')}
                      </button>
                    )}
                    <button
                      onClick={() => { setShowTablePicker(false); setShowFloorPlan(true) }}
                      className="flex-1 py-2 rounded-xl bg-[#3C4D6B] text-white font-semibold text-sm hover:bg-[#2D3A52] transition-colors"
                    >
                      🗺️ {t('kassaApp.floorPlan')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Besteltype banner — dine-in met tafel: tafel wissen via kruisje (geen order-type cycle) */}
        {orderType === 'DINE_IN' && tableNumber ? (
          <div className="mx-3 mt-2 flex shrink-0 overflow-hidden rounded-xl bg-[#3C4D6B] text-white shadow-sm ring-1 ring-black/10">
            <button
              type="button"
              onClick={() => {
                playClick()
                cycleOrderType()
              }}
              className="min-w-0 flex-1 py-3 text-center text-lg font-bold uppercase tracking-wide transition-colors hover:bg-[#2D3A52]/95"
            >
              {dineInBannerLabel}
            </button>
            <button
              type="button"
              title={t('kassaApp.clearTableBanner')}
              aria-label={t('kassaApp.clearTableBanner')}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                playClick()
                setTableNumber('')
              }}
              className="flex shrink-0 items-center justify-center border-l border-white/20 px-4 text-xl font-bold leading-none transition-colors hover:bg-red-600 active:bg-red-700"
            >
              <span aria-hidden>✕</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              playClick()
              cycleOrderType()
            }}
            className={`mx-3 mt-2 shrink-0 rounded-xl py-3 text-lg font-bold uppercase tracking-wide transition-colors ${
              orderType === 'DINE_IN'
                ? 'bg-[#3C4D6B] text-white hover:bg-[#2D3A52]'
                : orderType === 'TAKEAWAY'
                  ? 'bg-amber-500 text-black hover:bg-amber-400'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {orderType === 'DINE_IN' && dineInBannerLabel}
            {orderType === 'TAKEAWAY' && `📦 ${t('kassaApp.orderTypeTakeaway').toUpperCase()}`}
            {orderType === 'DELIVERY' && `🚗 ${t('kassaApp.orderTypeDelivery').toUpperCase()}`}
          </button>
        )}

        {/* Cart of Numpad */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-2 flex flex-col touch-pan-y">
          {cart.length === 0 ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-[#e3e3e3] px-2.5 py-2">
                {tenantInfo?.kassa_staff_clock_enabled && !demoViewOnly ? (
                  <button
                    type="button"
                    onClick={openStaffClockModal}
                    className="shrink-0 rounded-xl bg-white p-1 shadow-md border border-slate-300 hover:border-[#3C4D6B] hover:bg-slate-50 active:scale-[0.98] transition-all"
                    title={t('staffClock.buttonTitle')}
                    aria-label={t('staffClock.buttonTitle')}
                  >
                    <KassaAnalogClock size={72} />
                  </button>
                ) : null}
                <div
                  className={`min-w-0 flex flex-col justify-center gap-0.5 ${tenantInfo?.kassa_staff_clock_enabled && !demoViewOnly ? 'flex-1' : 'w-full'}`}
                >
                  <p
                    className="truncate whitespace-nowrap text-right text-xs font-semibold leading-tight tracking-tight text-gray-700 sm:text-sm"
                    title={numpadHeaderDateLabel}
                    aria-live="polite"
                  >
                    {numpadHeaderDateLabel}
                  </p>
                  <input
                    type="text"
                    value={numpadValue}
                    readOnly
                    aria-label={t('kassaApp.numpadPlaceholder')}
                    className="w-full min-w-0 border-none bg-transparent text-right text-2xl font-bold text-black outline-none sm:text-3xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 grid-rows-4 gap-2 flex-1 min-h-0">
                {['7','8','9','+','4','5','6','-','1','2','3','×','C','0','.','='].map(key => (
                  <button
                    key={key}
                    onClick={() => handleNumpad(key)}
                    className={`rounded-xl font-bold text-2xl transition-colors active:scale-95 shadow-sm ${
                      key === 'C' ? 'bg-[#3C4D6B] text-white hover:bg-[#2D3A52]'
                      : ['+','-','×','='].includes(key) ? 'bg-[#3C4D6B] text-white hover:bg-[#2D3A52]'
                      : 'bg-[#e3e3e3] text-black hover:bg-gray-200'
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
                  className="mt-3 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg transition-colors"
                >
                  {t('kassaApp.addAmount').replace(
                    '{amount}',
                    parseFloat(numpadValue || '0').toFixed(2),
                  )}
                </button>
              )}
            </div>
          ) : (
              <div className="space-y-2">
              <div
                className={`flex items-center gap-2.5 rounded-xl bg-[#e3e3e3] px-2.5 py-2 ${tenantInfo?.kassa_staff_clock_enabled && !demoViewOnly ? '' : 'justify-end'}`}
              >
                {tenantInfo?.kassa_staff_clock_enabled && !demoViewOnly ? (
                  <button
                    type="button"
                    onClick={openStaffClockModal}
                    className="shrink-0 rounded-xl bg-white p-1 shadow-sm border border-slate-300 hover:border-[#3C4D6B] active:scale-[0.98] transition-all"
                    title={t('staffClock.buttonTitle')}
                    aria-label={t('staffClock.buttonTitle')}
                  >
                    <KassaAnalogClock size={64} />
                  </button>
                ) : null}
                <p
                  className={`min-w-0 truncate whitespace-nowrap text-right text-xs font-semibold leading-tight tracking-tight text-gray-700 sm:text-sm ${tenantInfo?.kassa_staff_clock_enabled && !demoViewOnly ? 'flex-1' : 'w-full'}`}
                  title={numpadHeaderDateLabel}
                  aria-live="polite"
                >
                  {numpadHeaderDateLabel}
                </p>
              </div>
              <div data-testid="kassa-cart-lines">
              {cart.map(item => {
                const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
                return (
                  <div key={item.cartKey} className="bg-white rounded-xl p-2.5 flex items-center gap-2.5 border border-gray-100 shadow-sm">
                    {/* Productfoto */}
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name}
                        decoding="async"
                        loading="lazy"
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-xl">🍽️</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-800 truncate">{item.product.name}</p>
                      {item.choices && item.choices.length > 0 && (
                        <p className="text-xs text-gray-400 truncate">{item.choices.map(c => c.choiceName).join(', ')}</p>
                      )}
                      <p className="text-emerald-600 font-bold text-sm">€{((item.product.price + choicesTotal) * item.quantity).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQty(item.cartKey, item.quantity - 1)}
                        className="w-8 h-8 rounded-lg bg-red-500 text-white font-bold text-base flex items-center justify-center hover:bg-red-600 transition-colors active:scale-95"
                        aria-label={
                          item.quantity === 1 ? t('kassaApp.ariaRemoveLine') : t('kassaApp.ariaDecreaseQty')
                        }
                      >
                        {item.quantity === 1 ? '🗑' : '−'}
                      </button>
                      {!demoViewOnly &&
                        item.product.id &&
                        !String(item.product.id).startsWith('custom-') &&
                        productIdsWithOptionsSet.has(item.product.id) && (
                          <button
                            type="button"
                            onClick={() => void openEditCartItem(item)}
                            className="w-8 h-8 rounded-lg bg-amber-500 text-white text-sm flex items-center justify-center hover:bg-amber-600 transition-colors active:scale-95"
                            title={t('kassaApp.ariaEditOptions')}
                            aria-label={t('kassaApp.ariaEditOptions')}
                          >
                            ✏️
                          </button>
                        )}
                      <span className="w-6 text-center font-bold text-base">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.cartKey, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg bg-[#3C4D6B] text-white font-bold text-base flex items-center justify-center hover:bg-[#2D3A52] transition-colors active:scale-95"
                        aria-label={t('kassaApp.ariaIncreaseQty')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
              </div>
            </div>
          )}
        </div>

        {/* Totaal + knoppen */}
        <div className="flex-shrink-0 border-t border-gray-200 p-3 space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="font-bold text-gray-700 text-lg">{t('kassaApp.cartTotal')}</span>
            <span className="font-bold text-[#3C4D6B] text-2xl">€{total.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { void openCashDrawer() }}
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-[#58CCFF] py-5 text-[#063042] transition-colors hover:bg-[#47c6fe] active:scale-[0.99]"
              title={t('kassaApp.drawerOpen')}
            >
              <span className="text-3xl leading-none">💰</span>
              <span className="text-sm font-bold">{t('kassaApp.drawerOpen')}</span>
            </button>
            <button
              type="button"
              onClick={clearCart}
              disabled={cart.length === 0}
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-rose-500 py-5 text-white transition-colors hover:bg-rose-600 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
            >
              <span className="text-3xl leading-none">🗑️</span>
              <span className="text-sm font-bold">{t('kassaApp.remove')}</span>
            </button>
          </div>
          {orderType === 'DINE_IN' && tableNumber && cart.length > 0 && (
            <button
              onClick={parkOrder}
              className="w-full py-3 rounded-xl bg-[#3C4D6B] hover:bg-[#2D3A52] text-white font-bold text-base transition-colors flex items-center justify-center gap-2"
            >
              🪑{' '}
              {t('kassaApp.parkToTable')
                .replace(/\{number\}/g, String(tableNumber))
                .replace(
                  /\{zone\}/g,
                  dineInFloorZone === FLOOR_PLAN_ZONE_TERRACE
                    ? t('kassaApp.floorZoneTerrace')
                    : t('kassaApp.floorZoneInside'),
                )}
            </button>
          )}
          <button
            onClick={() => {
              if (cart.length === 0) return
              playCheckout()
              setShowPaymentModal(true)
            }}
            disabled={cart.length === 0}
            className="w-full py-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            💳 {t('kassaApp.checkout')}
          </button>
        </div>
        </div>
      </div>

      {/* ── Bevestiging: Tafel wisselen ── */}
      {switchConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-4">
            <div className="text-center">
              <div className="text-4xl mb-2">🪑</div>
              <h2 className="font-bold text-xl text-gray-800">{t('kassaApp.switchTableTitle')}</h2>
              <p className="text-gray-500 mt-1 text-sm">
                {t('kassaApp.switchTableBody')
                  .replace(/\{current\}/g, String(tableNumber ?? ''))
                  .replace(/\{next\}/g, switchConfirmDisplay)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSwitchConfirm(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
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
          setStaffClockOpen(false)
          setStaffClockPinModal(null)
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
          setStaffClockPinModal(null)
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
        />
      ) : null}

      {/* ── Plattegrond / Tafelkeuze ── */}
      {showFloorPlan && (
        <KassaFloorPlan
          tenant={tenant}
          planZone={pickerBrowseZone}
          seedTables={pickerTables}
          onFloorPlanTablesPersisted={onFloorPlanTablesPersisted}
          onFloorPlanTablesPersistLifecycle={onFloorPlanTablesPersistLifecycle}
          onSelectTable={(nr) => switchToTable(nr)}
          onClose={() => setShowFloorPlan(false)}
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
      />

      {printAgentFallbackHtml !== null && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="print-agent-fallback-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <h2 id="print-agent-fallback-title" className="text-lg font-bold text-gray-900">
              {t('kassaApp.printAgentFallbackModalTitle')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              {t('kassaApp.printAgentFallbackModalBody')}
            </p>
            <a
              href="https://www.vysionhoreca.com/download/print-agent-windows"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-[#3C4D6B] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#2D3A52]"
            >
              {t('kassaApp.printAgentFallbackModalDownloadLink')}
            </a>
            <button
              type="button"
              className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              onClick={() => {
                const h = printAgentFallbackHtml
                setPrintAgentFallbackHtml(null)
                if (h) printReceiptHtmlDocument(h)
              }}
            >
              {t('kassaApp.printAgentFallbackModalContinue')}
            </button>
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
          onPrint={async () => {
            try {
              await printReceipt(lastOrder)
            } finally {
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
