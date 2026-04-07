'use client'

import { Suspense, useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { MenuProduct, MenuCategory, ProductOption, ProductOptionChoice, getMenuCategories, getMenuProducts, getProductsWithOptions, getOptionsForProduct, getTenantSettings, TenantSettings } from '@/lib/admin-api'
import KassaFloorPlan from '@/components/KassaFloorPlan'
import KassaReservationsView from '@/components/KassaReservationsView'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'
import { getSoundsEnabled, setSoundsEnabled, playClick, playAddToCart, playRemove, playSuccess, playCashRegister, playCheckout, initAudio, prewarmAudio, playOrderNotification, activateAudioForIOS } from '@/lib/sounds'
import { prefetchProductImageUrls } from '@/lib/offline-product-images'
import { allTenantModulesTrue, type TenantModuleId } from '@/lib/tenant-modules'
import {
  buildHamburgerModules,
  filterHamburgerModulesForAccess,
} from '@/lib/admin-hamburger-modules'
import { useTenantModuleFlags } from '@/lib/use-tenant-modules'
import PostTrialModulePickerModal from '@/components/PostTrialModulePickerModal'
import { AccountMenuSessionBlock } from '@/components/AccountMenuSessionBlock'
import {
  clearPublicDemoSession,
  isMarketingDemoTenantSlug,
  publicDemoSessionMatchesTenant,
} from '@/lib/demo-links'
import { buildShopInternalReturnPath } from '@/lib/auth-headers'

interface SelectedChoice {
  optionId: string
  optionName: string
  choiceId: string
  choiceName: string
  price: number
}

interface CartItem {
  product: MenuProduct
  quantity: number
  choices?: SelectedChoice[]
  cartKey: string
}

type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'

/** Wandtijd in een IANA-zone (kassa = altijd België, los van verkeerde PC-tijdzone). */
function getWallClockHms(date: Date, timeZone: string): { h: number; m: number; s: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const n = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0)
  return { h: n('hour'), m: n('minute'), s: n('second') }
}

const KASSA_DISPLAY_TIMEZONE = 'Europe/Brussels'

/** Analoge klok met wijzers (live) — echte tijd + tik opent personeelsklok */
function KassaAnalogClock({ size = 80 }: { size?: number }) {
  const [now, setNow] = useState(() => new Date())
  useLayoutEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])
  const { h, m, s } = getWallClockHms(now, KASSA_DISPLAY_TIMEZONE)
  /* Wijzers zijn getekend naar 12 uur (naar y=32); positieve rotate = met de klok mee in SVG. */
  const hDeg = ((h % 12) + m / 60 + s / 3600) * 30
  const mDeg = (m + s / 60) * 6
  const sDeg = s * 6
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="select-none"
      aria-hidden
    >
      <circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <line
          key={i}
          x1="50"
          y1="6"
          x2="50"
          y2="14"
          stroke="#475569"
          strokeWidth={i % 3 === 0 ? 2.2 : 1.2}
          strokeLinecap="round"
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}
      <g transform={`rotate(${hDeg} 50 50)`}>
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="32"
          stroke="#0f172a"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      <g transform={`rotate(${mDeg} 50 50)`}>
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="22"
          stroke="#334155"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </g>
      <g transform={`rotate(${sDeg} 50 50)`}>
        <line
          x1="50"
          y1="52"
          x2="50"
          y2="20"
          stroke="#dc2626"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </g>
      <circle cx="50" cy="50" r="4" fill="#0f172a" />
    </svg>
  )
}

function KassaAdminPageInner({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
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
  const { t, locale, setLocale, locales, localeNames, localeFlags } = useLanguage()

  const {
    moduleAccess,
    enabledModulesJson,
    featureGroupOrders,
    featureLabelPrinting,
    loading: moduleFlagsLoading,
    needsPostTrialModulePicker,
    refetch: refetchModules,
  } = useTenantModuleFlags(tenant)
  const effectiveAccess =
    demoViewOnly || moduleFlagsLoading ? allTenantModulesTrue() : moduleAccess
  const effectiveGroupOrders = demoViewOnly || moduleFlagsLoading ? true : featureGroupOrders
  const effectiveLabelPrinting = demoViewOnly || moduleFlagsLoading ? true : featureLabelPrinting
  const effectiveJson =
    demoViewOnly || moduleFlagsLoading ? null : enabledModulesJson

  const filteredHamburgerModules = useMemo(() => {
    const all = buildHamburgerModules(baseUrl, tenant)
    return filterHamburgerModulesForAccess(
      all,
      effectiveAccess,
      effectiveGroupOrders,
      effectiveLabelPrinting,
      effectiveJson
    )
  }, [baseUrl, tenant, effectiveAccess, effectiveGroupOrders, effectiveLabelPrinting, effectiveJson])

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
  const [soundsOn, setSoundsOn] = useState(true)
  const [isOnline, setIsOnline] = useState<boolean | null>(null)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  // ── Nieuwe bestelling alarm (exact donor) ────────────────────────────────
  const [newOrderAlert, setNewOrderAlert] = useState<{id: string; orderNumber: number; total: number} | null>(null)
  const [newReservAlert, setNewReservAlert] = useState<{ id: string } | null>(null)
  const newOrderAlertRef = useRef<{id: string; orderNumber: number; total: number} | null>(null)
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousOrderIdsRef = useRef<string[]>([])
  const dismissedOrderIdsRef = useRef<string[]>([]) // oranje scherm al getoond, niet opnieuw tonen

  const newReservAlertRef = useRef<{ id: string } | null>(null)
  const previousReservIdsRef = useRef<string[]>([])

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

  // Poll elke 3s: online bestellingen + reserveringen — één alarm (startAlarm/stopAlarm) zoals voor orders
  useEffect(() => {
    if (demoViewOnly) return
    let isFirstOrderCheck = true
    let isFirstReservCheck = true
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
                new Notification('🔔 NIEUWE BESTELLING!', {
                  body: `Bestelling #${newOrderOnes[0].order_number} is binnengekomen!`,
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
            startAlarm()
            try {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('📅 Nieuwe reservatie!', {
                  body: 'Er is een nieuwe reservatie binnengekomen.',
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
          if (pendingAndWl > 0) startAlarm()
        }
        previousReservIdsRef.current = currentReservIds

        // ── Alarm aan/uit: nieuwe bestelling OF wachtende reservering (zelfde gedrag als alleen orders) ──
        const needOrderAlarm = list.length > 0
        const needReservAlarm = pendingAndWl > 0 || newReservOnes.length > 0
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
    check()
    const interval = setInterval(check, 3000)
    return () => clearInterval(interval)
  }, [tenant, startAlarm, stopAlarm, demoViewOnly])

  // Menu
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [products, setProducts] = useState<MenuProduct[]>([])
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null)
  const [menuLoading, setMenuLoading] = useState(true)
  const [productsWithOptions, setProductsWithOptions] = useState<string[]>([])

  const [showReservations, setShowReservations] = useState(false)
  const [pendingReservCount, setPendingReservCount] = useState(0)
  const [showFloorPlan, setShowFloorPlan] = useState(false)
  const [showTablePicker, setShowTablePicker] = useState(false)
  const [kassaTables, setKassaTables] = useState<{ id: string; number: string; seats: number; status: string }[]>([])
  const [kassaStools, setKassaStools] = useState<{ stoolNumber: string; segmentId: string }[]>([])
  // Openstaande bestellingen per tafel: { "1": CartItem[], "2": CartItem[], ... }
  const [tableOrders, setTableOrders] = useState<Record<string, CartItem[]>>({})

  const tableOrdersKey = `vysion_table_orders_${tenant}`

  // Laad tafels + barkrukken + openstaande bestellingen (localStorage + Supabase sync)

  useEffect(() => {
    const raw = localStorage.getItem(`vysion_tables_${tenant}`)
    if (raw) {
      try { setKassaTables(JSON.parse(raw)) } catch { /* empty */ }
    }

    // Barkrukken laden uit localStorage
    const decorRaw = localStorage.getItem(`vysion_decor_${tenant}`)
    if (decorRaw) {
      try {
        const decors = JSON.parse(decorRaw)
        const stools = decors
          .filter((d: { type: string }) => d.type === 'bar_segment')
          .flatMap((d: { id: string; stool1?: string; stool2?: string }) => [
            d.stool1 ? { stoolNumber: d.stool1, segmentId: d.id } : null,
            d.stool2 ? { stoolNumber: d.stool2, segmentId: d.id } : null,
          ].filter(Boolean))
        setKassaStools(stools)
      } catch { /* empty */ }
    }
    // Sync barkrukken vanuit Supabase
    supabase.from('floor_plan_decor').select('data').eq('tenant_slug', tenant).single().then(({ data }) => {
      if (data?.data) {
        const stools = (data.data as { id: string; type: string; stool1?: string; stool2?: string }[])
          .filter(d => d.type === 'bar_segment')
          .flatMap(d => [
            d.stool1 ? { stoolNumber: d.stool1, segmentId: d.id } : null,
            d.stool2 ? { stoolNumber: d.stool2, segmentId: d.id } : null,
          ].filter(Boolean)) as { stoolNumber: string; segmentId: string }[]
        if (stools.length > 0) setKassaStools(stools)
      }
    })
    // Laad eerst uit localStorage (snel)
    const ordersRaw = localStorage.getItem(tableOrdersKey)
    if (ordersRaw) {
      try { setTableOrders(JSON.parse(ordersRaw)) } catch { /* empty */ }
    }
    // Sync met Supabase open orders (cross-device)
    supabase
      .from('orders')
      .select('table_number, items')
      .eq('tenant_slug', tenant)
      .eq('status', 'open')
      .then(({ data }) => {
        if (!data || data.length === 0) return
        const fromSupabase: Record<string, CartItem[]> = {}
        data.forEach(row => {
          if (row.table_number && row.items) {
            fromSupabase[row.table_number] = row.items as CartItem[]
          }
        })
        // Merge: Supabase wint bij conflicten (meest recent)
        setTableOrders(prev => {
          const merged = { ...prev, ...fromSupabase }
          localStorage.setItem(tableOrdersKey, JSON.stringify(merged))
          return merged
        })
      })
  }, [tenant, showTablePicker, tableOrdersKey])

  // ── Realtime sync: tafelstatus tussen apparaten ───────────────────────────
  useEffect(() => {
    const tableChannel = supabase
      .channel(`kassa_fpt_${tenant}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'floor_plan_tables', filter: `tenant_slug=eq.${tenant}` },
        ({ new: row }: any) => {
          if (row?.data) {
            setKassaTables(row.data)
            localStorage.setItem(`vysion_tables_${tenant}`, JSON.stringify(row.data))
          }
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(tableChannel).catch(() => {})
    }
  }, [tenant])

  // ── Realtime sync: open bestellingen per tafel tussen apparaten ───────────
  useEffect(() => {
    const ordersChannel = supabase
      .channel(`kassa_open_orders_${tenant}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `tenant_slug=eq.${tenant}` },
        () => {
          // Herlaad alle open orders bij elke wijziging (insert/update/delete)
          supabase
            .from('orders')
            .select('table_number, items')
            .eq('tenant_slug', tenant)
            .eq('status', 'open')
            .then(({ data }) => {
              if (!data) return
              const fromSupabase: Record<string, CartItem[]> = {}
              data.forEach(row => {
                if (row.table_number && row.items) {
                  fromSupabase[row.table_number] = row.items as CartItem[]
                }
              })
              setTableOrders(fromSupabase)
              localStorage.setItem(tableOrdersKey, JSON.stringify(fromSupabase))
            })
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(ordersChannel).catch(() => {})
    }
  }, [tenant, tableOrdersKey])

  // Sla cart op voor huidige tafel
  const updateTableStatus = (tblNr: string, occupied: boolean) => {
    const tablesRaw = localStorage.getItem(`vysion_tables_${tenant}`)
    if (!tablesRaw) return
    try {
      const tbls = JSON.parse(tablesRaw)
      const newStatus = occupied ? 'OCCUPIED' : 'FREE'
      const updatedTbls = tbls.map((t: { number: string; status: string }) =>
        t.number === tblNr ? { ...t, status: newStatus } : t
      )
      localStorage.setItem(`vysion_tables_${tenant}`, JSON.stringify(updatedTbls))
      setKassaTables(updatedTbls)
      // Sync naar Supabase zodat plattegrond ook up-to-date is
      supabase.from('floor_plan_tables').upsert({ tenant_slug: tenant, data: updatedTbls }, { onConflict: 'tenant_slug' })
    } catch { /* empty */ }
  }

  const saveCartToTable = (tblNr: string, items: CartItem[]) => {
    const updated = { ...tableOrders, [tblNr]: items }
    setTableOrders(updated)
    localStorage.setItem(tableOrdersKey, JSON.stringify(updated))
    updateTableStatus(tblNr, items.length > 0)
    // Sync open bestelling naar Supabase voor cross-device toegang
    supabase
      .from('orders')
      .delete()
      .eq('tenant_slug', tenant)
      .eq('table_number', tblNr)
      .eq('status', 'open')
      .then(() => {
        if (items.length > 0) {
          supabase.from('orders').insert({
            tenant_slug: tenant,
            order_number: 0,
            status: 'open',
            payment_status: 'pending',
            order_type: 'DINE_IN',
            table_number: tblNr,
            subtotal: 0,
            tax: 0,
            total: 0,
            items: items as unknown as Record<string, unknown>[],
            created_at: new Date().toISOString(),
          })
        }
      })
  }

  // Bevestiging popup voor tafel wisselen
  const [switchConfirm, setSwitchConfirm] = useState<string | null>(null)

  const switchToTable = (newTableNr: string) => {
    if (tableNumber && cart.length > 0 && tableNumber !== newTableNr) {
      // Vraag bevestiging voordat je wisselt
      setSwitchConfirm(newTableNr)
      return
    }
    doSwitchToTable(newTableNr)
  }

  const doSwitchToTable = (newTableNr: string) => {
    if (tableNumber && cart.length > 0) {
      saveCartToTable(tableNumber, cart)
    }
    const existingOrder = tableOrders[newTableNr] || []
    setCart(existingOrder)
    setTableNumber(newTableNr)
    setOrderType('DINE_IN')
    setShowTablePicker(false)
    setSwitchConfirm(null)
  }

  // "Naar tafel" knop: sla bestelling op en leeg de kassa voor volgende tafel
  const parkOrder = () => {
    if (!tableNumber || cart.length === 0) return
    saveCartToTable(tableNumber, cart)
    setCart([])
    setTableNumber('')
  }

  // Betaling
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  type PaymentMethodType = 'CASH' | 'CARD' | 'IDEAL' | 'BANCONTACT'
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [splitCash, setSplitCash] = useState(0)
  const [splitCard, setSplitCard] = useState(0)
  const [lastOrder, setLastOrder] = useState<{
    orderNumber: number
    items: CartItem[]
    total: number
    paymentMethod: PaymentMethodType
    orderType: OrderType
    tableNumber: string
    createdAt: Date
    /** Medewerker in verkoopmodus (klok) op moment van betalen */
    helpedByStaffName?: string | null
  } | null>(null)
  const [tenantInfo, setTenantInfo] = useState<TenantSettings | null>(null)

  const [staffClockOpen, setStaffClockOpen] = useState(false)
  const [staffClockList, setStaffClockList] = useState<
    { id: string; name: string; hasOpenSession: boolean }[]
  >([])
  const [staffClockListLoading, setStaffClockListLoading] = useState(false)
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
  const loadMenu = async () => {
    setMenuLoading(true)

    // Laad meteen uit cache als beschikbaar (ook als online – snellere first render)
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
    } catch { /* geen geldige cache */ }

    // Probeer van Supabase te laden (ook als we net uit cache laadden: refresh op achtergrond)
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
      // Cache opslaan voor offline gebruik
      localStorage.setItem(CACHE_CATS, JSON.stringify(activeCats))
      localStorage.setItem(CACHE_PRODS, JSON.stringify(activeProds))
      localStorage.setItem(CACHE_OPTS, JSON.stringify(withOpts))
    } catch {
      // Netwerkfout – cache is al geladen hierboven, geen extra actie nodig
    }
    setMenuLoading(false)
  }

  useEffect(() => {
    loadMenu()
    // TenantSettings: ook met cache
    const cachedSettings = localStorage.getItem(CACHE_SETTINGS)
    if (cachedSettings) { try { setTenantInfo(JSON.parse(cachedSettings)) } catch { /* ignore */ } }
    getTenantSettings(tenant).then(s => {
      setTenantInfo(s)
      try { localStorage.setItem(CACHE_SETTINGS, JSON.stringify(s)) } catch { /* ignore */ }
    }).catch(() => { /* offline: al geladen uit cache */ })
  }, [tenant])

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

  // Herlaad menu wanneer pagina weer focus krijgt (na terugkeren van producten/categorieen pagina)
  useEffect(() => {
    const onFocus = () => loadMenu()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [tenant])

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

  // Close language dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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
  const syncTableOrder = (updatedCart: CartItem[]) => {
    if (!tableNumber) return
    const newOrders = { ...tableOrders, [tableNumber]: updatedCart }
    setTableOrders(newOrders)
    localStorage.setItem(tableOrdersKey, JSON.stringify(newOrders))
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
      syncTableOrder(updated)
      return updated
    })
  }

  const handleProductClick = async (product: MenuProduct) => {
    if (productsWithOptions.includes(product.id!)) {
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
    if (!productsWithOptions.includes(pid)) return
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
    if (missing.length > 0) { playClick(); alert(`Kies een ${missing[0].name}`); return }

    const { product, selected, editingCartKey } = optionsModal

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
          const newOrders = { ...tableOrders, [tableNumber]: updated }
          setTableOrders(newOrders)
          localStorage.setItem(tableOrdersKey, JSON.stringify(newOrders))
          updateTableStatus(tableNumber, updated.length > 0)
        }
        syncTableOrder(updated)
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
        const newOrders = { ...tableOrders, [tableNumber]: updated }
        setTableOrders(newOrders)
        localStorage.setItem(tableOrdersKey, JSON.stringify(newOrders))
        // Zet tafel status bij via centrale functie
        updateTableStatus(tableNumber, updated.length > 0)
      }
      return updated
    })
  }

  const clearCart = () => {
    playRemove()
    setCart([])
    if (tableNumber) {
      const newOrders = { ...tableOrders, [tableNumber]: [] }
      setTableOrders(newOrders)
      localStorage.setItem(tableOrdersKey, JSON.stringify(newOrders))
    }
  }
  const total = cart.reduce((sum, i) => {
    const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
    return sum + (i.product.price + choicesTotal) * i.quantity
  }, 0)

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

  const offlineQueueKey = `vysion_offline_orders_${tenant}`

  // Retry offline queue bij reconnect
  // Web Locks API zorgt dat bij meerdere open tabs slechts 1 tab de wachtrij verwerkt.
  // De andere tab wacht, ziet daarna een lege wachtrij en doet niets.
  useEffect(() => {
    const retryQueue = async () => {
      const raw = localStorage.getItem(offlineQueueKey)
      if (!raw) return
      try {
        const queue: object[] = JSON.parse(raw)
        if (queue.length === 0) return

        const processQueue = async () => {
          // Lees wachtrij opnieuw binnen het slot (andere tab kan hem al leeg gemaakt hebben)
          const freshRaw = localStorage.getItem(offlineQueueKey)
          if (!freshRaw) return
          const freshQueue: object[] = JSON.parse(freshRaw)
          if (freshQueue.length === 0) return

          const remaining: object[] = []
          for (const order of freshQueue) {
            const { error } = await supabase.from('orders').insert(order)
            if (error) remaining.push(order)
          }
          localStorage.setItem(offlineQueueKey, JSON.stringify(remaining))
        }

        // Web Locks API beschikbaar (alle moderne browsers)
        if ('locks' in navigator) {
          await (navigator as any).locks.request(`vysion_queue_${tenant}`, processQueue)
        } else {
          // Fallback zonder locking (enkeltab-scenario of oudere browser)
          await processQueue()
        }
      } catch { /* empty */ }
    }
    window.addEventListener('online', retryQueue)
    retryQueue() // ook bij pagina laden
    return () => window.removeEventListener('online', retryQueue)
  }, [tenant, offlineQueueKey])

  const clearTableAfterPayment = (tblNr: string) => {
    const updated = { ...tableOrders }
    delete updated[tblNr]
    setTableOrders(updated)
    localStorage.setItem(tableOrdersKey, JSON.stringify(updated))
    updateTableStatus(tblNr, false)
    // Stoel/kruk status resetten (K1, K2, ...) — auto-VRIJ via getStoolStatus maar ook localStorage cleanen
    const stoolStatusKey = `vysion_stool_status_${tenant}`
    try {
      const raw = localStorage.getItem(stoolStatusKey)
      if (raw) {
        const statuses = JSON.parse(raw)
        if (statuses[tblNr]) {
          delete statuses[tblNr]
          localStorage.setItem(stoolStatusKey, JSON.stringify(statuses))
        }
      }
    } catch { /* empty */ }
    // Verwijder open order uit Supabase
    supabase
      .from('orders')
      .delete()
      .eq('tenant_slug', tenant)
      .eq('table_number', tblNr)
      .eq('status', 'open')
  }

  const completePayment = async (method: PaymentMethodType) => {
    if (cart.length === 0) return
    playCashRegister()
    setTimeout(() => playSuccess(), 400)
    const vatRate = tenantInfo?.btw_percentage ?? 6
    const subtotal = total / (1 + vatRate / 100)
    const tax = total - subtotal
    const createdAt = new Date()

    // Lokaal ordernummer berekenen (werkt ook offline)
    let orderNumber = Date.now() % 100000
    try {
      const { data: lastOrderRow } = await supabase
        .from('orders')
        .select('order_number')
        .eq('tenant_slug', tenant)
        .order('order_number', { ascending: false })
        .limit(1)
        .single()
      orderNumber = (lastOrderRow?.order_number ?? 1000) + 1
    } catch { /* offline: gebruik timestamp-gebaseerd nummer */ }

    const orderPayload = {
      tenant_slug: tenant,
      order_number: orderNumber,
      customer_name: tableNumber ? `Tafel ${tableNumber}` : 'Kassa',
      status: 'confirmed',
      payment_status: 'paid',
      payment_method: method,
      order_type: orderType,
      customer_notes: tableNumber ? `Tafel ${tableNumber}` : null,
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

    // Probeer Supabase, bij netwerkfout: sla op in offline queue
    const { error } = await supabase.from('orders').insert(orderPayload)
    if (error) {
      const isNetworkError = !navigator.onLine || error.message?.includes('fetch') || error.message?.includes('network')
      if (isNetworkError) {
        // Gebruik Web Locks om race conditions bij gelijktijdige tabs te voorkomen
        const addToQueue = () => {
          const raw = localStorage.getItem(offlineQueueKey)
          const queue = raw ? JSON.parse(raw) : []
          // Dubbele order voorkomen (zelfde order_number al in wachtrij?)
          if (!queue.some((o: any) => o.order_number === orderPayload.order_number)) {
            queue.push(orderPayload)
            localStorage.setItem(offlineQueueKey, JSON.stringify(queue))
          }
        }
        if ('locks' in navigator) {
          await (navigator as any).locks.request(`vysion_queue_${tenant}`, async () => addToQueue())
        } else {
          addToQueue()
        }
        alert(`⚠️ Geen internetverbinding. Order #${orderNumber} is lokaal opgeslagen en wordt automatisch verstuurd zodra je weer online bent.`)
      } else {
        console.error('Supabase order insert error:', error)
      }
    }

    setLastOrder({
      orderNumber,
      items: [...cart],
      total,
      paymentMethod: method,
      orderType,
      tableNumber,
      createdAt,
      helpedByStaffName: activeKassaStaff?.name?.trim() || null,
    })

    if (tableNumber) clearTableAfterPayment(tableNumber)

    clearCart()
    setTableNumber('')
    setShowPaymentModal(false)
    setShowSuccessModal(true)
  }

  const escapeReceiptHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const printReceipt = (order: typeof lastOrder) => {
    if (!order) return
    const vatRate = tenantInfo?.btw_percentage ?? 6
    const subtotal = order.total / (1 + vatRate / 100)
    const tax = order.total - subtotal
    const orderTypeLabel =
      order.orderType === 'DINE_IN' ? '🍽️ Hier Opeten' :
      order.orderType === 'TAKEAWAY' ? '📦 Afhalen' : '🚗 Bezorgen'
    const payLabel =
      order.paymentMethod === 'CASH' ? 'Contant' :
      order.paymentMethod === 'CARD' ? 'PIN/Kaart' :
      order.paymentMethod === 'IDEAL' ? 'iDEAL' : 'Bancontact'

    const html = `<!DOCTYPE html><html><head><title>Bon #${order.orderNumber}</title><style>
      * { margin:0;padding:0;box-sizing:border-box; }
      body { font-family:'Courier New',monospace;font-size:12px;width:80mm;padding:10px; }
      .center { text-align:center; }
      .bold { font-weight:bold; }
      .big { font-size:16px; }
      .small { font-size:10px; }
      .divider { border-top:1px dashed #000;margin:8px 0; }
      .divider-solid { border-top:1px solid #000;margin:8px 0; }
      .row { display:flex;justify-content:space-between;margin:2px 0; }
      .total { font-size:18px;font-weight:bold;margin-top:8px; }
      .order-type { font-size:20px;font-weight:bold;margin:10px 0;padding:8px;border:2px solid #000; }
      @media print { body { width:auto; } }
    </style></head><body>
      <div class="center">
        <div class="bold big">${tenantInfo?.business_name || 'Vysion Horeca'}</div>
        ${tenantInfo?.address ? `<div class="small">${tenantInfo.address}</div>` : ''}
        ${(tenantInfo?.postal_code || tenantInfo?.city) ? `<div class="small">${tenantInfo.postal_code ?? ''} ${tenantInfo.city ?? ''}</div>` : ''}
        ${tenantInfo?.phone ? `<div class="small">Tel: ${tenantInfo.phone}</div>` : ''}
      </div>
      <div class="divider"></div>
      <div class="center order-type">${orderTypeLabel}${order.tableNumber ? `<br/>TAFEL ${order.tableNumber}` : ''}</div>
      <div class="row small">
        <span>Bon #${order.orderNumber}</span>
        <span>${order.createdAt.toLocaleString('nl-NL', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
      </div>
      <div class="divider-solid"></div>
      ${order.items.map(i => {
        const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
        const lineTotal = (i.product.price + choicesTotal) * i.quantity
        return `<div class="row"><span>${i.quantity}x ${i.product.name}</span><span>€${lineTotal.toFixed(2)}</span></div>
        ${(i.choices || []).map(c => `<div class="row small" style="margin-left:15px;color:#666;"><span>+ ${c.choiceName}</span><span>${c.price > 0 ? '€' + c.price.toFixed(2) : ''}</span></div>`).join('')}`
      }).join('')}
      <div class="divider-solid"></div>
      <div class="row"><span>Subtotaal</span><span>€${subtotal.toFixed(2)}</span></div>
      <div class="row"><span>BTW (${vatRate}%)</span><span>€${tax.toFixed(2)}</span></div>
      <div class="row total"><span>TOTAAL</span><span>€${order.total.toFixed(2)}</span></div>
      <div class="divider"></div>
      <div class="center small">Betaald met: ${payLabel}</div>
      ${order.helpedByStaffName ? `<div class="divider"></div><div class="center bold">${t('kassaReceipt.helpedBy').replace('{name}', escapeReceiptHtml(order.helpedByStaffName))}</div>` : ''}
      <div class="divider"></div>
      <div class="center small">
        ${tenantInfo?.btw_number ? `BTW: ${tenantInfo.btw_number}<br/>` : ''}
        Bedankt voor uw bezoek!
        ${tenantInfo?.website ? `<br/>${tenantInfo.website}` : ''}
      </div>
    </body></html>`

    // iPad-safe print via blob URL + verborgen iframe
    try {
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.top = '-9999px'
      iframe.style.left = '-9999px'
      iframe.style.width = '80mm'
      iframe.style.height = '1px'
      iframe.src = url
      document.body.appendChild(iframe)
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print()
          setTimeout(() => {
            document.body.removeChild(iframe)
            URL.revokeObjectURL(url)
          }, 1000)
        }, 300)
      }
    } catch {
      // Fallback: window.open voor browsers die blob niet ondersteunen
      const w = window.open('', '_blank', 'width=400,height=600')
      if (w) { w.document.write(html); w.document.close() }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('vysion_tenant')
    try {
      sessionStorage.removeItem(`vysion_welcomed_${tenant}`)
      sessionStorage.removeItem(`vysion_kassa_audio_ok_${tenant}`)
      sessionStorage.removeItem(`vysion_audio_activated_${tenant}`)
    } catch { /* ignore */ }
    if (demoViewOnly) {
      clearPublicDemoSession()
      window.location.href = `/shop/${tenant}/admin/kassa?demo=bekijk`
      return
    }
    const next = buildShopInternalReturnPath(tenant, window.location.pathname, window.location.search)
    window.location.href = `/login?next=${encodeURIComponent(next)}`
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
      const res = await fetch(`/api/kassa/staff-clock?tenant_slug=${encodeURIComponent(tenant)}`, {
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
    }
  }, [tenant])

  useEffect(() => {
    if (!tenantInfo?.kassa_staff_clock_enabled || demoViewOnly) return
    void loadStaffClockList({ background: true })
  }, [tenant, tenantInfo?.kassa_staff_clock_enabled, demoViewOnly, loadStaffClockList])

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
      const res = await fetch('/api/kassa/staff-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // ── Geluid activatie scherm (exact donor) — toon elke sessie ───────────
  if (showSoundActivation && !soundActivated && !demoViewOnly) {
    return (
      <div className="fixed inset-0 z-[200] bg-gradient-to-br from-[#2D3A52] to-[#5A7BA8] flex flex-col items-center justify-center p-8">
        <div className="text-white text-center max-w-md">
          <div className="text-8xl mb-8">🔔</div>
          <h1 className="text-4xl font-bold mb-4">Activeer Geluid</h1>
          <p className="text-xl text-white mb-8">
            Klik op de knop om geluid en meldingen te activeren voor nieuwe bestellingen.
            <br /><br />
            <strong>Dit doe je maar 1 keer per dag.</strong>
          </p>
          <button
            onClick={activateSound}
            className="w-full py-6 bg-green-500 hover:bg-green-600 text-white text-2xl font-bold rounded-2xl shadow-2xl transform hover:scale-105 transition-all flex items-center justify-center gap-4"
          >
            <span className="text-4xl">🔊</span>
            ACTIVEER GELUID
          </button>
          <p className="text-white/80 mt-6 text-sm">
            💡 Zonder activatie kunnen nieuwe bestellingen geen alarm afspelen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }} data-testid="kassa-app">
      <PostTrialModulePickerModal
        tenantSlug={tenant}
        open={needsPostTrialModulePicker && !demoViewOnly}
        onConfirmed={refetchModules}
      />
      <div className="flex flex-col bg-[#e3e3e3] overflow-hidden flex-1 min-h-0">

      {/* ── Blauwe navigatiebalk — volledige breedte ── */}
      <div className="flex-shrink-0 bg-[#1e293b] flex items-center px-3 gap-2 relative z-30" style={{ height: 68 }}>

        {/* Backdrop sluit alles */}
        {(hamburgerOpen || flyoutOpen) && <div className="fixed inset-0 z-10" onClick={() => { setHamburgerOpen(false); setHamburgerSubOpen(null); setFlyoutOpen(null) }} />}

        {/* ── LINKS: Hamburger menu ── */}
        <div className="relative z-20">
          <button onClick={() => { setHamburgerOpen(!hamburgerOpen); setHamburgerSubOpen(null) }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${hamburgerOpen ? 'bg-orange-600 text-white' : 'bg-orange-500 hover:bg-orange-400 text-white'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            <span className="font-bold text-sm">Menu</span>
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
                    onClick={() => { setHamburgerOpen(false); setHamburgerSubOpen(null) }}
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
                            <span className="font-semibold text-sm text-gray-700">{mod.label}</span>
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
                      <span>{activeMod.icon}</span> {activeMod.label}
                    </div>
                    {activeMod.items.map(item => (
                      <Link key={item.id} href={item.href} prefetch={item.href === baseUrl ? false : undefined} onClick={() => { setHamburgerOpen(false); setHamburgerSubOpen(null) }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 border-b border-gray-100 text-sm text-gray-700 transition-colors">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
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

        {/* Tenant naam */}
        <div className="flex-1 flex items-center justify-center">
          <span className="text-red-700 font-medium text-xl tracking-normal">
            {tenantInfo?.business_name || tenant.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </span>
        </div>

        {/* ── RECHTS ── */}

        {/* Reserveringen */}
        {effectiveAccess.reservaties && (
          <button
            onClick={() => {
              newReservAlertRef.current = null
              setNewReservAlert(null)
              setShowReservations(true)
            }}
            className="relative flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-bold transition-colors"
          >
            <span className="text-lg">📅</span>
            <span>Reserveringen</span>
            {pendingReservCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-sm font-black rounded-full min-w-[26px] h-7 flex items-center justify-center px-1.5 shadow-lg border-2 border-white">
                {pendingReservCount}
              </span>
            )}
          </button>
        )}

        {/* Onlinescherm */}
        {effectiveAccess['online-bestellingen'] && (
          <Link href={`/shop/${tenant}/display`}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-bold transition-colors">
            <span className="text-lg">🖥️</span>
            <span>Onlinescherm</span>
          </Link>
        )}

        {/* Keukenscherm */}
        {effectiveAccess['online-bestellingen'] && (
          <Link href={`/keuken/${tenant}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-bold transition-colors">
            <span className="text-lg">👨‍🍳</span>
            <span>Keukenscherm</span>
          </Link>
        )}

        {/* Geluid */}
        <button onClick={toggleSound}
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-colors ${soundsOn ? 'bg-green-500/80 text-white' : 'bg-white/10 text-white/60'}`}
          title={soundsOn ? 'Geluid aan' : 'Geluid uit'}>
          {soundsOn ? '🔔' : '🔕'}
        </button>

        {activeKassaStaff && !demoViewOnly && (
          <div className="hidden sm:flex items-center gap-1.5 max-w-[10rem] md:max-w-xs rounded-lg bg-emerald-600/90 text-white text-xs font-bold px-2 py-1.5">
            <span className="truncate" title={activeKassaStaff.name}>
              🛒 {activeKassaStaff.name}
            </span>
            <button
              type="button"
              onClick={() => {
                playClick()
                setActiveKassaStaff(null)
              }}
              className="shrink-0 rounded bg-white/20 px-1.5 py-0.5 hover:bg-white/30"
            >
              ×
            </button>
          </div>
        )}

        {/* Taal */}
        <div ref={langRef} className="relative z-20">
          <button onClick={() => setLangOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-medium text-white transition-colors">
            <span className="text-2xl">{localeFlags[locale]}</span>
            <span className="text-sm font-bold">{(localeNames[locale] || '').slice(0, 3).toUpperCase()}</span>
            <svg className={`w-4 h-4 transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {langOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 min-w-[160px] overflow-hidden">
              {locales.map(lang => (
                <button key={lang} onClick={() => { setLocale(lang); setLangOpen(false) }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm ${locale === lang ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'}`}>
                  <span>{localeFlags[lang]}</span>
                  <span>{localeNames[lang]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Uitloggen */}
        <button onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600/80 hover:bg-red-600 rounded-lg text-white text-sm font-bold transition-colors ml-1">
          <span className="text-lg">🚪</span>
          <span>Uitloggen</span>
        </button>

      </div>

      {/* ── Offline / PWA banner ── */}
      {isOnline === false && (
        <div className="flex-shrink-0 bg-red-600 text-white text-xs font-semibold flex items-center justify-center gap-2 py-1 px-4">
          <span>📴</span>
          <span>Offline – menu geladen uit cache. Bestellingen worden bewaard en verstuurd bij reconnect.</span>
        </div>
      )}
      {installPrompt && !isInstalled && (
        <div className="flex-shrink-0 bg-orange-500 text-white text-xs font-semibold flex items-center justify-between gap-2 py-1.5 px-4">
          <span>📲 Installeer de Kassa als app voor volledig offline gebruik</span>
          <div className="flex gap-2">
            <button onClick={handleInstallPWA} className="bg-white text-orange-600 px-3 py-0.5 rounded-full text-xs font-bold hover:bg-orange-50">Installeer</button>
            <button onClick={() => setInstallPrompt(null)} className="text-white/70 hover:text-white text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {/* ── Body: midden + rechts ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

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

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {menuLoading ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-lg">Laden...</div>
            ) : !selectedCategory ? (
              /* Categorieën grid — 4 kolommen */
              categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <span className="text-5xl mb-3">📂</span>
                  <p className="font-semibold">Nog geen categorieën</p>
                  <p className="text-sm mt-1">Voeg categorieën toe via het Online Platform</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {categories.map(cat => {
                    const catImage = products.find(p => p.category_id === cat.id && p.image_url)?.image_url
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat)}
                        className="aspect-square relative rounded-xl overflow-hidden active:scale-95 transition-transform"
                        style={{ backgroundColor: '#3C4D6B', boxShadow: '0 8px 30px rgba(0,0,0,0.35)' }}
                      >
                        {catImage && (
                          <img src={catImage} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute inset-0 flex flex-col items-center justify-end p-2">
                          {cat.icon && <span className="text-2xl mb-0.5">{cat.icon}</span>}
                          <span className="font-bold text-white text-xl text-center leading-tight drop-shadow-lg">{cat.name}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            ) : (
              /* Producten grid — 4 kolommen */
              (() => {
                const filtered = products.filter(p => p.category_id === selectedCategory.id)
                return filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <span className="text-5xl mb-3">🍽️</span>
                    <p className="font-semibold">Geen producten in deze categorie</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    {filtered.map(product => {
                      const inCart = cart.filter(i => i.product.id === product.id).reduce((s, i) => s + i.quantity, 0)
                      const hasOpts = productsWithOptions.includes(product.id!)
                      return (
                        <button
                          key={product.id}
                          onClick={() => handleProductClick(product)}
                          className="flex flex-col bg-white rounded-xl overflow-hidden active:scale-95 transition-transform relative"
                          style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.35)' }}
                        >
                          <div className="aspect-square w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                            {product.image_url
                              ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                              : <span className="text-4xl text-gray-300">🍽️</span>
                            }
                          </div>
                          {/* In-cart badge */}
                          {inCart > 0 && (
                            <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shadow-md">
                              {inCart}
                            </div>
                          )}
                          {/* Opties indicator */}
                          {hasOpts && (
                            <div className="absolute top-1.5 left-1.5 bg-amber-400 text-white text-xs font-bold px-1.5 py-0.5 rounded-md shadow">⚙️</div>
                          )}
                          <div className="p-2 text-left">
                            <p className="font-bold text-sm text-gray-800 leading-tight line-clamp-2">{product.name}</p>
                            <p className="text-emerald-600 font-bold text-base mt-0.5">€{product.price.toFixed(2)}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })()
            )}
          </div>
        </div>

        {/* ── Rechts: numpad / cart ── */}
        <div className="w-80 sm:w-96 lg:w-[380px] bg-white border-l border-gray-200 flex flex-col flex-shrink-0 min-h-0 overflow-hidden">

        {/* Tafel knop */}
        {orderType === 'DINE_IN' && (
          <div className="px-3 pt-3 relative">
            <button
              onClick={() => setShowTablePicker(p => !p)}
              className="w-full py-3 rounded-xl bg-[#3C4D6B] hover:bg-[#2D3A52] text-white font-bold text-base transition-colors"
            >
              {tableNumber
                ? kassaStools.some(s => s.stoolNumber === tableNumber)
                  ? `🍺 Kruk ${tableNumber}`
                  : `🪑 Tafel ${tableNumber}`
                : 'Kies tafel...'}
            </button>

            {/* Tafel picker popup */}
            {showTablePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTablePicker(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                  <div className="p-3 border-b bg-gray-50">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Kies tafel</p>
                  </div>
                  {kassaTables.length === 0 && kassaStools.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      Nog geen tafels aangemaakt
                    </div>
                  ) : (
                    <>
                      {kassaTables.length > 0 && (
                        <div className="p-2 grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                          {kassaTables.map(t => (
                            <button
                              key={t.id}
                              onClick={() => switchToTable(t.number)}
                              className={`py-3 rounded-xl font-bold text-sm transition-colors border-2 relative ${
                                tableNumber === t.number
                                  ? 'bg-[#3C4D6B] text-white border-[#3C4D6B]'
                                  : t.status === 'FREE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                  : t.status === 'UNPAID'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                  : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                              }`}
                            >
                              <div className="text-lg">🪑</div>
                              <div>{t.number}</div>
                              <div className="text-[10px] opacity-70">
                                {t.status === 'FREE' ? 'Vrij' : t.status === 'OCCUPIED' ? 'Bezet' : 'Onbetaald'}
                              </div>
                              {tableOrders[t.number] && tableOrders[t.number].length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                  {tableOrders[t.number].length}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {kassaStools.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">🍺 Barkrukken</span>
                          </div>
                          <div className="p-2 grid grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                            {kassaStools.map(s => (
                              <button
                                key={s.segmentId + s.stoolNumber}
                                onClick={() => switchToTable(s.stoolNumber)}
                                className={`py-3 rounded-xl font-bold text-sm transition-colors border-2 relative ${
                                  tableNumber === s.stoolNumber
                                    ? 'bg-[#3C4D6B] text-white border-[#3C4D6B]'
                                    : tableOrders[s.stoolNumber]?.length > 0
                                    ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                                    : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                }`}
                              >
                                <div className="text-lg">🍺</div>
                                <div>{s.stoolNumber}</div>
                                <div className="text-[10px] opacity-70">
                                  {tableOrders[s.stoolNumber]?.length > 0 ? 'Bezet' : 'Vrij'}
                                </div>
                                {tableOrders[s.stoolNumber]?.length > 0 && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                    {tableOrders[s.stoolNumber].length}
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
                        onClick={() => { setTableNumber(''); setShowTablePicker(false) }}
                        className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors"
                      >
                        ✕ Geen tafel
                      </button>
                    )}
                    <button
                      onClick={() => { setShowTablePicker(false); setShowFloorPlan(true) }}
                      className="flex-1 py-2 rounded-xl bg-[#3C4D6B] text-white font-semibold text-sm hover:bg-[#2D3A52] transition-colors"
                    >
                      🗺️ Plattegrond
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Besteltype banner */}
        <button
          onClick={cycleOrderType}
          className={`mx-3 mt-2 py-3 rounded-xl font-bold text-lg uppercase tracking-wide transition-colors ${
            orderType === 'DINE_IN' ? 'bg-[#3C4D6B] text-white' :
            orderType === 'TAKEAWAY' ? 'bg-amber-500 text-black' :
            'bg-blue-600 text-white'
          }`}
        >
          {orderType === 'DINE_IN' && `🍽️ HIER OPETEN${tableNumber ? ` • Tafel ${tableNumber}` : ''}`}
          {orderType === 'TAKEAWAY' && '📦 AFHALEN'}
          {orderType === 'DELIVERY' && '🚗 LEVERING'}
        </button>

        {/* Cart of Numpad */}
        <div className="flex-1 overflow-y-auto px-3 pt-2 flex flex-col">
          {cart.length === 0 ? (
            <div className="flex flex-col flex-1">
              <div className="bg-[#e3e3e3] rounded-xl px-3 py-2.5 mb-3 flex items-center gap-3 min-h-[5.5rem]">
                {tenantInfo?.kassa_staff_clock_enabled && !demoViewOnly ? (
                  <button
                    type="button"
                    onClick={openStaffClockModal}
                    className="shrink-0 rounded-xl bg-white p-1 shadow-md border-2 border-slate-300 hover:border-[#3C4D6B] hover:bg-slate-50 active:scale-[0.98] transition-all"
                    title={t('staffClock.buttonTitle')}
                    aria-label={t('staffClock.buttonTitle')}
                  >
                    <KassaAnalogClock size={76} />
                  </button>
                ) : null}
                <input
                  type="text"
                  value={numpadValue}
                  readOnly
                  placeholder="0.00"
                  className={`min-w-0 text-right text-3xl font-bold bg-transparent border-none outline-none text-black ${tenantInfo?.kassa_staff_clock_enabled && !demoViewOnly ? 'flex-1' : 'w-full'}`}
                />
              </div>
              <div className="grid grid-cols-4 grid-rows-4 gap-2 flex-1">
                {['7','8','9','+','4','5','6','-','1','2','3','×','C','0','.','='].map(key => (
                  <button
                    key={key}
                    onClick={() => handleNumpad(key)}
                    className={`rounded-xl font-bold text-2xl transition-colors active:scale-95 shadow-sm ${
                      key === 'C' ? 'bg-[#3C4D6B] text-white hover:bg-[#2D3A52]'
                      : key === '=' ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : ['+','-','×'].includes(key) ? 'bg-[#3C4D6B] text-white hover:bg-[#2D3A52]'
                      : 'bg-[#e3e3e3] text-black hover:bg-gray-200'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
              {numpadValue && parseFloat(numpadValue) > 0 && (
                <button
                  onClick={addCustomAmount}
                  className="mt-3 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg transition-colors"
                >
                  + €{parseFloat(numpadValue || '0').toFixed(2)} toevoegen
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {tenantInfo?.kassa_staff_clock_enabled && !demoViewOnly && (
                <div className="flex justify-start pb-1">
                  <button
                    type="button"
                    onClick={openStaffClockModal}
                    className="rounded-xl bg-[#e3e3e3] p-1.5 shadow-sm border-2 border-slate-300 hover:border-[#3C4D6B] active:scale-[0.98] transition-all"
                    title={t('staffClock.buttonTitle')}
                    aria-label={t('staffClock.buttonTitle')}
                  >
                    <KassaAnalogClock size={64} />
                  </button>
                </div>
              )}
              {cart.map(item => {
                const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
                return (
                  <div key={item.cartKey} className="bg-white rounded-xl p-2.5 flex items-center gap-2.5 border border-gray-100 shadow-sm">
                    {/* Productfoto */}
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name}
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
                        aria-label={item.quantity === 1 ? 'Verwijderen' : 'Minder'}
                      >
                        {item.quantity === 1 ? '🗑' : '−'}
                      </button>
                      {!demoViewOnly &&
                        item.product.id &&
                        !String(item.product.id).startsWith('custom-') &&
                        productsWithOptions.includes(item.product.id) && (
                          <button
                            type="button"
                            onClick={() => void openEditCartItem(item)}
                            className="w-8 h-8 rounded-lg bg-amber-500 text-white text-sm flex items-center justify-center hover:bg-amber-600 transition-colors active:scale-95"
                            title="Opties wijzigen"
                            aria-label="Opties wijzigen"
                          >
                            ✏️
                          </button>
                        )}
                      <span className="w-6 text-center font-bold text-base">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.cartKey, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg bg-[#3C4D6B] text-white font-bold text-base flex items-center justify-center hover:bg-[#2D3A52] transition-colors active:scale-95"
                        aria-label="Meer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Totaal + knoppen */}
        <div className="border-t border-gray-200 p-3 space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="font-bold text-gray-700 text-lg">Totaal</span>
            <span className="font-bold text-[#3C4D6B] text-2xl">€{total.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button className="flex flex-col items-center gap-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors">
              <span className="text-xl">💰</span>
              <span className="text-xs font-semibold">Lade open</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-colors">
              <span className="text-xl">🖨️</span>
              <span className="text-xs font-semibold">Print opnieuw</span>
            </button>
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="flex flex-col items-center gap-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors disabled:opacity-40"
            >
              <span className="text-xl">🗑️</span>
              <span className="text-xs font-semibold">Verwijder</span>
            </button>
          </div>
          {orderType === 'DINE_IN' && tableNumber && cart.length > 0 && (
            <button
              onClick={parkOrder}
              className="w-full py-3 rounded-xl bg-[#3C4D6B] hover:bg-[#2D3A52] text-white font-bold text-base transition-colors flex items-center justify-center gap-2"
            >
              🪑 Naar tafel {tableNumber}
            </button>
          )}
          <button
            onClick={() => { if (cart.length > 0) { playCheckout(); setShowPaymentModal(true) } }}
            disabled={cart.length === 0}
            className="w-full py-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            💳 Afrekenen
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
              <h2 className="font-bold text-xl text-gray-800">Tafel wisselen?</h2>
              <p className="text-gray-500 mt-1 text-sm">
                Je hebt nog items op tafel <strong>{tableNumber}</strong>.<br/>
                Die bestelling wordt opgeslagen. Wil je verder naar tafel <strong>{switchConfirm}</strong>?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSwitchConfirm(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
              >
                Annuleer
              </button>
              <button
                onClick={() => doSwitchToTable(switchConfirm)}
                className="flex-1 py-3 rounded-xl bg-[#3C4D6B] text-white font-bold hover:bg-[#2D3A52] transition-colors"
              >
                Wissel naar {switchConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {staffClockOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden z-[61]">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <h2 className="font-bold text-xl text-gray-900">{t('staffClock.modalTitle')}</h2>
              <button
                type="button"
                onClick={() => {
                  playClick()
                  setStaffClockOpen(false)
                  setStaffClockPinModal(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-500"
                aria-label={t('staffClock.close')}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {staffClockListLoading && staffClockList.length === 0 ? (
                <div className="py-12 text-center text-gray-500">{t('staffClock.loadingList')}</div>
              ) : staffClockList.length === 0 ? (
                <div className="py-10 text-center text-gray-500">{t('staffClock.noStaff')}</div>
              ) : (
                staffClockList.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 sm:p-5 flex flex-col gap-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="font-bold text-gray-900 text-base sm:text-lg break-words leading-snug">
                        {s.name}
                      </p>
                      {s.hasOpenSession ? (
                        <p className="text-sm font-semibold text-emerald-600">{t('staffClock.statusClockedIn')}</p>
                      ) : (
                        <p className="text-sm text-gray-500">{t('staffClock.statusClockedOut')}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                      <button
                        type="button"
                        disabled={staffClockBusy}
                        onClick={() => {
                          playClick()
                          setStaffClockPinModal({ staffId: s.id, staffName: s.name, action: 'in' })
                          setStaffClockPinInput('')
                          setStaffClockPinError(null)
                        }}
                        className="min-h-[44px] py-3 px-4 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {t('staffClock.clockInCode')}
                      </button>
                      <button
                        type="button"
                        disabled={staffClockBusy || !s.hasOpenSession}
                        onClick={() => {
                          playClick()
                          setStaffClockPinModal({ staffId: s.id, staffName: s.name, action: 'out' })
                          setStaffClockPinInput('')
                          setStaffClockPinError(null)
                        }}
                        className="min-h-[44px] py-3 px-4 rounded-xl bg-[#3C4D6B] text-white text-sm font-bold hover:bg-[#2D3A52] disabled:opacity-40 disabled:grayscale"
                      >
                        {t('staffClock.clockOutCode')}
                      </button>
                      <button
                        type="button"
                        disabled={!s.hasOpenSession}
                        onClick={(e) => {
                          e.stopPropagation()
                          startStaffSales(s)
                        }}
                        className="min-h-[44px] py-3 px-4 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-40 disabled:grayscale"
                        title={s.hasOpenSession ? t('staffClock.salesHint') : t('staffClock.salesNeedsClock')}
                      >
                        {t('staffClock.sales')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-gray-100 p-4">
              <button
                type="button"
                onClick={() => {
                  playClick()
                  setStaffClockOpen(false)
                  setStaffClockPinModal(null)
                }}
                className="w-full min-h-[44px] py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
              >
                {t('staffClock.close')}
              </button>
            </div>
          </div>

          {staffClockPinModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5 flex flex-col gap-3">
                <p className="font-bold text-gray-900">
                  {(staffClockPinModal.action === 'in'
                    ? t('staffClock.pinTitleIn')
                    : t('staffClock.pinTitleOut')
                  ).replace('{name}', staffClockPinModal.staffName)}
                </p>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={staffClockPinInput}
                  onChange={(e) => setStaffClockPinInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder={t('staffClock.pinPlaceholder')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-mono tracking-widest"
                />
                {staffClockPinError && <p className="text-sm font-medium text-red-600">{staffClockPinError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={staffClockBusy}
                    onClick={() => {
                      playClick()
                      setStaffClockPinModal(null)
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold"
                  >
                    {t('staffClock.cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={staffClockBusy}
                    onClick={() => void submitStaffClockPin()}
                    className="flex-1 py-2.5 rounded-xl bg-[#3C4D6B] text-white font-bold disabled:opacity-50"
                  >
                    {t('staffClock.confirmPin')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {staffClockSummary && (
        <div className="fixed inset-0 bg-black/60 z-[65] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4 max-h-[85vh] overflow-hidden">
            <h2 className="font-bold text-xl text-gray-900">{t('staffClock.summaryTitle')}</h2>
            <p className="text-gray-600 text-sm">
              {t('staffClock.summaryIntro').replace('{name}', staffClockSummary.staffName)}
            </p>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <p className="text-sm text-emerald-800 font-medium">{t('staffClock.summaryTotalLabel')}</p>
              <p className="text-3xl font-black text-emerald-700">€{staffClockSummary.total.toFixed(2)}</p>
              <p className="text-xs text-emerald-700 mt-1">
                {t('staffClock.summaryOrderCount').replace('{count}', String(staffClockSummary.orderCount))}
              </p>
            </div>
            {staffClockSummary.orders.length > 0 && (
              <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl max-h-48">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-semibold text-gray-700">#</th>
                      <th className="text-right p-2 font-semibold text-gray-700">{t('staffClock.summaryAmount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffClockSummary.orders.map((o) => (
                      <tr key={o.order_number} className="border-t border-gray-100">
                        <td className="p-2 font-mono">{o.order_number}</td>
                        <td className="p-2 text-right font-medium">€{o.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {staffClockSummary.orders.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">{t('staffClock.noOrdersToday')}</p>
            )}
            <button
              type="button"
              onClick={() => {
                playClick()
                setStaffClockSummary(null)
              }}
              className="w-full py-3 rounded-xl bg-[#3C4D6B] text-white font-bold hover:bg-[#2D3A52]"
            >
              {t('staffClock.summaryClose')}
            </button>
          </div>
        </div>
      )}

      {/* ── Opties Modal ── */}
      {optionsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b">
              {optionsModal.product.image_url && (
                <img src={optionsModal.product.image_url} alt={optionsModal.product.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg truncate">
                  {optionsModal.editingCartKey ? '✏️ ' : ''}
                  {optionsModal.product.name}
                </p>
                <p className="text-[#3C4D6B] font-bold">
                  €{(optionsModal.product.price + optionsModal.selected.reduce((s, c) => s + c.price, 0)).toFixed(2)}
                </p>
              </div>
              <button type="button" onClick={() => setOptionsModal(null)} className="p-2 hover:bg-gray-100 rounded-xl" aria-label="Sluiten">✕</button>
            </div>

            {/* Opties */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {optionsModal.options.map(option => (
                <div key={option.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="font-bold text-base text-gray-900">{option.name}</p>
                    {option.required && <span className="text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full font-semibold">Verplicht</span>}
                    {option.type === 'multiple' && <span className="text-xs bg-blue-50 text-blue-500 border border-blue-200 px-2 py-0.5 rounded-full">Meerdere mogelijk</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(option.choices || []).map(choice => {
                      const isSelected = optionsModal.selected.some(s => s.choiceId === choice.id)
                      return (
                        <button
                          key={choice.id}
                          onClick={() => toggleChoice(option, choice)}
                          className={`relative flex flex-col items-center justify-center px-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                            isSelected
                              ? 'border-[#3C4D6B] bg-[#3C4D6B]/10 ring-2 ring-[#3C4D6B] scale-[1.03]'
                              : 'border-gray-200 hover:border-[#3C4D6B] bg-white text-gray-700'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#3C4D6B] flex items-center justify-center">
                              <span className="text-white text-xs font-bold">✓</span>
                            </div>
                          )}
                          <span className={`text-center leading-tight font-semibold ${isSelected ? 'text-[#3C4D6B]' : 'text-gray-800'}`}>{choice.name}</span>
                          <span className={`text-xs font-bold mt-1 ${choice.price > 0 ? 'text-amber-500' : 'text-green-500'}`}>
                            {choice.price > 0 ? `+€${choice.price.toFixed(2)}` : 'Gratis'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex gap-3 bg-gray-50">
              <button type="button" onClick={() => setOptionsModal(null)} className="flex-1 py-3 rounded-xl bg-white border border-gray-200 font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Annuleer</button>
              <button type="button" onClick={confirmOptions} className="flex-[2] py-3.5 rounded-xl bg-[#3C4D6B] hover:bg-[#2D3A52] text-white font-bold text-lg shadow-md transition-colors">
                {optionsModal.editingCartKey ? 'Opslaan' : 'Toevoegen'} — €
                {(optionsModal.product.price + optionsModal.selected.reduce((s, c) => s + c.price, 0)).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Plattegrond / Tafelkeuze ── */}
      {showFloorPlan && (
        <KassaFloorPlan
          tenant={tenant}
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
              {pendingReservCount} reservatie{pendingReservCount !== 1 ? 's' : ''} wacht{pendingReservCount === 1 ? '' : 'en'} op goedkeuring
            </p>
            <p className="text-base font-semibold opacity-95 mt-1">Tik hier om te bekijken</p>
          </div>
        </div>
      )}

      {showReservations && (
        <KassaReservationsView
          tenant={tenant}
          kassaTables={kassaTables}
          onClose={() => setShowReservations(false)}
          onStartOrder={(tableNr) => { switchToTable(tableNr); setShowReservations(false) }}
        />
      )}

      {/* ── Betaalmodal ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-semibold">Betalen</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-2xl">✕</button>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-gray-500">Te betalen</p>
                <p className="text-5xl font-bold text-[#3C4D6B]">€{total.toFixed(2)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {([
                  { method: 'CASH' as const, label: 'Contant', icon: '💵', color: '#10b981' },
                  { method: 'CARD' as const, label: 'PIN/Kaart', icon: '💳', color: '#3b82f6' },
                  { method: 'IDEAL' as const, label: 'iDEAL', icon: '📱', color: '#ec4899' },
                  { method: 'BANCONTACT' as const, label: 'Bancontact', icon: '🏦', color: '#f59e0b' },
                ] as const).map(pm => (
                  <button
                    key={pm.method}
                    onClick={() => completePayment(pm.method)}
                    className="flex flex-col items-center justify-center h-32 gap-3 rounded-xl border-2 bg-gray-50 hover:scale-[1.02] transition-transform font-semibold text-lg"
                    style={{ borderColor: pm.color }}
                  >
                    <span className="text-4xl">{pm.icon}</span>
                    <span style={{ color: pm.color }}>{pm.label}</span>
                  </button>
                ))}
                {/* Gesplitst Betalen — volle breedte */}
                <button
                  onClick={() => { setSplitCash(0); setSplitCard(total); setShowSplitModal(true); setShowPaymentModal(false) }}
                  className="col-span-2 flex flex-col items-center justify-center h-32 gap-3 rounded-xl border-2 bg-gray-50 hover:scale-[1.02] transition-transform font-semibold text-lg"
                  style={{ borderColor: '#8b5cf6' }}
                >
                  <span className="text-4xl">👛</span>
                  <span style={{ color: '#8b5cf6' }}>Gesplitst Betalen</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Gesplitst Betalen modal ── */}
      {showSplitModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span className="text-purple-500">👛</span> Gesplitst Betalen
              </h3>
              <button onClick={() => { setShowSplitModal(false); setShowPaymentModal(true) }} className="p-2 rounded-lg hover:bg-gray-100 text-2xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Totaal */}
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-gray-500">Totaal te betalen</p>
                <p className="text-4xl font-bold text-[#3C4D6B]">€{total.toFixed(2)}</p>
              </div>
              {/* Contant */}
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-gray-500 text-sm">💵 Contant bedrag</label>
                <input
                  type="number"
                  value={splitCash || ''}
                  onChange={(e) => { const v = parseFloat(e.target.value) || 0; setSplitCash(v); setSplitCard(Math.max(0, total - v)) }}
                  className="w-full px-4 py-4 text-2xl font-bold rounded-xl bg-white border-2 border-green-400 focus:border-green-500 outline-none"
                  placeholder="0.00" step="0.01" min="0"
                />
              </div>
              {/* Kaart */}
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-gray-500 text-sm">💳 Kaart bedrag</label>
                <input
                  type="number"
                  value={splitCard || ''}
                  onChange={(e) => { const v = parseFloat(e.target.value) || 0; setSplitCard(v); setSplitCash(Math.max(0, total - v)) }}
                  className="w-full px-4 py-4 text-2xl font-bold rounded-xl bg-white border-2 border-blue-400 focus:border-blue-500 outline-none"
                  placeholder="0.00" step="0.01" min="0"
                />
              </div>
              {/* Snelle knoppen */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '50/50', cash: total / 2, card: total / 2 },
                  { label: '100% 💵', cash: total, card: 0 },
                  { label: '100% 💳', cash: 0, card: total },
                ].map(opt => (
                  <button key={opt.label} onClick={() => { setSplitCash(opt.cash); setSplitCard(opt.card) }}
                    className="py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold transition-colors">
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Resterende indicator */}
              {Math.abs(total - splitCash - splitCard) > 0.01 && (
                <div className={`p-3 rounded-xl text-center text-sm font-semibold ${(total - splitCash - splitCard) > 0 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                  {(total - splitCash - splitCard) > 0
                    ? `Nog te betalen: €${(total - splitCash - splitCard).toFixed(2)}`
                    : `Te veel: €${Math.abs(total - splitCash - splitCard).toFixed(2)}`}
                </div>
              )}
              {/* Bevestigen */}
              <button
                onClick={() => { if (Math.abs(total - splitCash - splitCard) < 0.01) { completePayment('CASH'); setShowSplitModal(false) } }}
                disabled={Math.abs(total - splitCash - splitCard) > 0.01}
                className="w-full py-4 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ✓ Betalen €{(splitCash + splitCard).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Succes modal met kassabon ── */}
      {showSuccessModal && lastOrder && (() => {
        const vatRate = tenantInfo?.btw_percentage ?? 6
        const subtotal = lastOrder.total / (1 + vatRate / 100)
        const tax = lastOrder.total - subtotal
        const orderTypeLabel =
          lastOrder.orderType === 'DINE_IN' ? '🍽️ Hier Opeten' :
          lastOrder.orderType === 'TAKEAWAY' ? '📦 Afhalen' : '🚗 Bezorgen'
        const payLabel =
          lastOrder.paymentMethod === 'CASH' ? 'Contant' :
          lastOrder.paymentMethod === 'CARD' ? 'PIN/Kaart' :
          lastOrder.paymentMethod === 'IDEAL' ? 'iDEAL' : 'Bancontact'
        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl overflow-hidden max-w-md w-full my-4 shadow-2xl">
              {/* Header */}
              <div className="p-4 bg-emerald-500 text-white text-center">
                <div className="w-16 h-16 rounded-full bg-white/20 mx-auto mb-2 flex items-center justify-center text-4xl">✓</div>
                <h3 className="text-xl font-bold">Betaling Geslaagd!</h3>
                <p className="opacity-80">Bestelling #{lastOrder.orderNumber}</p>
              </div>

              {/* Kassabon — exact zelfde als referentie */}
              <div className="p-4 max-h-[50vh] overflow-y-auto">
                <div className="bg-white text-black p-4 rounded-lg max-w-[300px] mx-auto font-mono text-sm">
                  {/* Header */}
                  <div className="text-center mb-4">
                    <h1 className="font-bold text-lg">{tenantInfo?.business_name || 'Vysion Horeca'}</h1>
                    {tenantInfo?.address && <p className="text-xs">{tenantInfo.address}</p>}
                    {(tenantInfo?.postal_code || tenantInfo?.city) && (
                      <p className="text-xs">{tenantInfo?.postal_code} {tenantInfo?.city}</p>
                    )}
                    {tenantInfo?.phone && <p className="text-xs">Tel: {tenantInfo.phone}</p>}
                  </div>
                  <div className="border-t-2 border-dashed border-gray-400 my-3" />
                  {/* Besteltype */}
                  <div className="text-center mb-3">
                    <p className="font-bold text-lg">{orderTypeLabel}</p>
                    {lastOrder.tableNumber && <p className="font-bold">Tafel {lastOrder.tableNumber}</p>}
                  </div>
                  {/* Bon info */}
                  <div className="text-xs mb-3">
                    <div className="flex justify-between">
                      <span>Bon #{lastOrder.orderNumber}</span>
                      <span>{lastOrder.createdAt.toLocaleString('nl-NL', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-300 my-2" />
                  {/* Items */}
                  <div className="space-y-2">
                    {lastOrder.items.map((item, idx) => {
                      const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
                      const lineTotal = (item.product.price + choicesTotal) * item.quantity
                      return (
                        <div key={idx}>
                          <div className="flex justify-between">
                            <div className="flex-1">
                              <span className="font-medium">{item.quantity}x</span>{' '}
                              <span>{item.product.name}</span>
                            </div>
                            <span>€{lineTotal.toFixed(2)}</span>
                          </div>
                          {(item.choices || []).length > 0 && (
                            <div className="ml-4 text-xs text-gray-600">
                              {(item.choices || []).map((c, ci) => (
                                <div key={ci} className="flex justify-between">
                                  <span>+ {c.choiceName}</span>
                                  {c.price > 0 && <span>€{c.price.toFixed(2)}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="border-t border-gray-300 my-3" />
                  {/* Totalen */}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Subtotaal</span><span>€{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>BTW ({vatRate}%)</span><span>€{tax.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t border-gray-400 pt-2 mt-2">
                      <span>TOTAAL</span><span>€{lastOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                  {/* Betaalmethode */}
                  <div className="text-center mt-3 text-xs">
                    <p>Betaald met: {payLabel}</p>
                  </div>
                  {lastOrder.helpedByStaffName && (
                    <div className="text-center mt-3 text-sm font-semibold text-gray-800 px-1">
                      {t('kassaReceipt.helpedBy').replace('{name}', lastOrder.helpedByStaffName)}
                    </div>
                  )}
                  <div className="border-t-2 border-dashed border-gray-400 my-3" />
                  <div className="text-center text-xs">
                    {tenantInfo?.btw_number && <p>BTW: {tenantInfo.btw_number}</p>}
                    <p className="mt-2">Bedankt voor uw bezoek!</p>
                    {tenantInfo?.website && <p className="mt-1">{tenantInfo.website}</p>}
                  </div>
                </div>
              </div>

              {/* Knoppen */}
              <div className="p-4 border-t flex gap-3">
                <button
                  onClick={() => { printReceipt(lastOrder); setShowSuccessModal(false) }}
                  className="flex-1 py-3 rounded-xl bg-gray-100 font-semibold text-gray-700 flex items-center justify-center gap-2"
                >
                  🖨️ printReceipt
                </button>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 py-3 rounded-xl bg-[#3C4D6B] text-white font-bold"
                >
                  Sluiten
                </button>
              </div>
            </div>
          </div>
        )
      })()}

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
            <h1 className="text-4xl md:text-6xl font-bold mb-4">NIEUWE BESTELLING!</h1>
            <div className="text-3xl md:text-5xl font-bold mb-6">#{newOrderAlert.orderNumber}</div>
            <div className="text-2xl md:text-4xl mb-8">€{newOrderAlert.total.toFixed(2)}</div>
            <div className="text-xl opacity-80 mt-8">👆 Klik om te bekijken</div>
            <p className="text-white/60 mt-4 text-sm">Geluid stopt na accepteren of weigeren</p>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default function KassaAdminPage(props: { params: { tenant: string } }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-[#e3e3e3] text-gray-600">
          Laden…
        </div>
      }
    >
      <KassaAdminPageInner {...props} />
    </Suspense>
  )
}
