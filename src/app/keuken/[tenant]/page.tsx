'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getTenantSettings, updateOrderStatus, isWebshopOrder } from '@/lib/admin-api'
import { authFetch } from '@/lib/auth-headers'
import { formatOrderScheduleDetail } from '@/lib/format-order-schedule'
import { useLanguage } from '@/i18n'
import Link from 'next/link'
import { useTenantModuleFlags } from '@/lib/use-tenant-modules'
import { getAdminKassaEntryHref, getFirstAccessibleAdminPath } from '@/lib/tenant-modules'
import { shopDisplayOrderTypeKey } from '@/lib/shop-display-order-type'
import { 
  playOrderNotification,
} from '@/lib/sounds'
import {
  OnlineDisplaySoundActivationScreen,
  useOnlineDisplaySoundGate,
} from '@/components/shop-display/OnlineDisplaySoundGate'
import { sendToVysionPrintAgent } from '@/lib/vysion-print-agent-client'
import { fetchKitchenQueueOrders } from '@/lib/kitchen-queue-orders'
import {
  orderItemDisplayName,
  orderItemDisplayOptionLines,
  orderItemLineTotalEur,
} from '@/lib/order-items-display'
import {
  kassaOrderItemHeadingNames,
  kassaOrderItemKitchenLineNote,
} from '@/lib/kassa-cart-line-key'
import { adminDineInSeatAuditLine } from '@/lib/admin-order-display'
import { getShopDisplaySurface } from '@/lib/shop-display-surface'
import { KassaIconClose } from '@/lib/kassa-ui-icons'
import { useKassaUiDarkSync } from '@/lib/kassa-register-ui-dark-preference'
import {
  kdsColumnWidthPx,
  type KitchenKdsDensity,
  KitchenItemMadeMark,
  KitchenKdsColumn,
  kitchenItemLineKey,
} from '@/components/keuken/KitchenKdsColumn'
import { readKassaViewportProfileFromWindow } from '@/lib/kassa-viewport-profile'
import {
  KASSA_SPEELS_GREEN_GLOW_SWEEP_CLASS,
  KASSA_SPEELS_MENU_PLATE_SHELL_BG_CLASS,
  kassaSpeelsBlueGlossButtonClass,
  kassaSpeelsGrayChromeButtonClass,
  kassaSpeelsGreenGlossButtonClass,
} from '@/lib/kassa-pos-surface'

const KDS_COL_GAP_PX = 16
const KDS_BOARD_PAD_PX = 24

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone?: string
  order_type: string
  status: string
  total: number
  payment_status?: string
  items: any[]
  customer_notes?: string
  created_at: string
  scheduled_date?: string
  scheduled_time?: string
  table_number?: string | number | null
  floor_plan_zone?: string | null
}

interface BusinessSettings {
  business_name: string
  primary_color: string
  address?: string
  phone?: string
  btw_number?: string
}

export default function KeukenDisplayPage({ params }: { params: { tenant: string } }) {
  const { t, locale } = useLanguage()
  const { moduleAccess, enabledModulesJson, loading: modulesLoading } = useTenantModuleFlags(params.tenant)
  const adminBase = `/shop/${params.tenant}/admin`
  const kassaEntryHref =
    !modulesLoading && moduleAccess.kassa
      ? getAdminKassaEntryHref(params.tenant, moduleAccess, enabledModulesJson) ?? `${adminBase}/kassa`
      : null
  const adminMenuHref =
    !modulesLoading && !kassaEntryHref
      ? getFirstAccessibleAdminPath(params.tenant, moduleAccess, enabledModulesJson)
      : null
  
  // Translation helper for kitchenDisplay keys
  const tx = (key: string) => t(`kitchenDisplay.${key}`)
  
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [business, setBusiness] = useState<BusinessSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const { soundActivated, activateSound } = useOnlineDisplaySoundGate(params.tenant)
  const { dark: kassaKitchenDark } = useKassaUiDarkSync(params.tenant)
  const ui = useMemo(() => getShopDisplaySurface(kassaKitchenDark), [kassaKitchenDark])
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const [startedOrderIds, setStartedOrderIds] = useState<Set<string>>(new Set())
  const alertIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const knownOrderIdsRef = useRef<Set<string>>(new Set())

  const applyKitchenQueueSnapshot = useCallback((parsed: Order[]) => {
    const liveIds = new Set(parsed.map((o) => o.id))

    setNewOrderIds((prev) => {
      const next = new Set([...prev].filter((id) => liveIds.has(id)))
      if (next.size === prev.size && [...next].every((id) => prev.has(id))) return prev
      return next
    })

    for (const id of [...knownOrderIdsRef.current]) {
      if (!liveIds.has(id)) knownOrderIdsRef.current.delete(id)
    }

    const trulyNewOrders = parsed.filter((o) => !knownOrderIdsRef.current.has(o.id))
    parsed.forEach((o) => knownOrderIdsRef.current.add(o.id))

    if (trulyNewOrders.length > 0) {
      console.log(` ${trulyNewOrders.length} nieuwe keuken bestelling(en)!`)
      setNewOrderIds((prev) => {
        const next = new Set(prev)
        trulyNewOrders.forEach((order) => next.add(order.id))
        return next
      })
      if (soundActivated) {
        playOrderNotification()
      }
    }

    setOrders(parsed)
  }, [soundActivated])
  const boardRef = useRef<HTMLDivElement>(null)
  const boardScrollRef = useRef<HTMLDivElement>(null)
  const [kdsDensity, setKdsDensity] = useState<KitchenKdsDensity>('default')
  const kdsColPx = useMemo(() => kdsColumnWidthPx(kdsDensity), [kdsDensity])
  const [colsPerPage, setColsPerPage] = useState(5)
  const [kdsPage, setKdsPage] = useState(0)
  const ticketBodyRefs = useRef(new Map<string, HTMLDivElement>())
  const [ticketScroll, setTicketScroll] = useState({ up: false, down: false })
  const [madeByOrder, setMadeByOrder] = useState<Record<string, string[]>>({})
  const kdsChromeBtn = `${kassaSpeelsGrayChromeButtonClass()} px-4 py-2.5 text-lg`
  const kdsChromeOn = `${kassaSpeelsBlueGlossButtonClass(true)} px-4 py-2.5 text-lg`

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`kds-started:${params.tenant}`)
      const ids = raw ? JSON.parse(raw) : []
      if (Array.isArray(ids)) {
        setStartedOrderIds(new Set(ids.filter((id) => typeof id === 'string')))
      }
    } catch {
      setStartedOrderIds(new Set())
    }
  }, [params.tenant])

  useEffect(() => {
    if (!initialLoadDone) return
    const live = new Set(orders.map((o) => o.id))
    setStartedOrderIds((prev) => {
      const next = new Set([...prev].filter((id) => live.has(id)))
      if (next.size === prev.size) return prev
      try {
        localStorage.setItem(`kds-started:${params.tenant}`, JSON.stringify([...next]))
      } catch {
        /* scherm blijft rood in dit tabblad */
      }
      return next
    })
  }, [orders, initialLoadDone, params.tenant])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`kds-item-made:${params.tenant}`)
      const parsed = raw ? JSON.parse(raw) : {}
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return
      const next: Record<string, string[]> = {}
      for (const [orderId, keys] of Object.entries(parsed as Record<string, unknown>)) {
        if (!Array.isArray(keys)) continue
        const lineKeys = keys.filter((key) => typeof key === 'string')
        if (lineKeys.length) next[orderId] = lineKeys
      }
      setMadeByOrder(next)
    } catch {
      setMadeByOrder({})
    }
  }, [params.tenant])

  useEffect(() => {
    if (!initialLoadDone) return
    const live = new Set(orders.map((o) => o.id))
    setMadeByOrder((prev) => {
      const next: Record<string, string[]> = {}
      for (const [orderId, keys] of Object.entries(prev)) {
        if (live.has(orderId) && keys.length) next[orderId] = keys
      }
      if (Object.keys(next).length === Object.keys(prev).length) return prev
      try {
        localStorage.setItem(`kds-item-made:${params.tenant}`, JSON.stringify(next))
      } catch {
        /* vinkjes blijven in dit tabblad */
      }
      return next
    })
  }, [orders, initialLoadDone, params.tenant])

  function toggleItemMade(orderId: string, lineKey: string) {
    setMadeByOrder((prev) => {
      const current = prev[orderId] ?? []
      const nextKeys = current.includes(lineKey)
        ? current.filter((key) => key !== lineKey)
        : [...current, lineKey]
      const next = { ...prev }
      if (nextKeys.length) next[orderId] = nextKeys
      else delete next[orderId]
      try {
        localStorage.setItem(`kds-item-made:${params.tenant}`, JSON.stringify(next))
      } catch {
        /* vinkjes blijven in dit tabblad */
      }
      return next
    })
  }

  function markOrderStarted(orderId: string) {
    setStartedOrderIds((prev) => {
      if (prev.has(orderId)) return prev
      const next = new Set(prev)
      next.add(orderId)
      try {
        localStorage.setItem(`kds-started:${params.tenant}`, JSON.stringify([...next]))
      } catch {
        /* scherm blijft rood in dit tabblad */
      }
      return next
    })
  }

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const syncVp = () => {
      const d: KitchenKdsDensity = readKassaViewportProfileFromWindow() === 'wide15' ? 'wide15' : 'default'
      setKdsDensity((prev) => (prev === d ? prev : d))
    }
    syncVp()
    window.addEventListener('resize', syncVp)
    return () => window.removeEventListener('resize', syncVp)
  }, [])

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const measure = () => {
      const inner = Math.max(0, el.clientWidth - KDS_BOARD_PAD_PX)
      const n = Math.max(1, Math.floor((inner + KDS_COL_GAP_PX) / (kdsColPx + KDS_COL_GAP_PX)))
      setColsPerPage(n)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [loading, kdsColPx])

  useEffect(() => {
    const count = Math.max(1, Math.ceil(orders.length / Math.max(1, colsPerPage)))
    setKdsPage((p) => Math.min(p, count - 1))
  }, [orders.length, colsPerPage])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant])

  useEffect(() => {
    if (!soundActivated) return
    if (newOrderIds.size > 0) {
      // Play immediately
      playOrderNotification()
      
      // Repeat every 5 seconds
      alertIntervalRef.current = setInterval(() => {
        playOrderNotification()
      }, 5000)
    } else {
      if (alertIntervalRef.current) {
        clearInterval(alertIntervalRef.current)
        alertIntervalRef.current = null
      }
    }

    return () => {
      if (alertIntervalRef.current) {
        clearInterval(alertIntervalRef.current)
      }
    }
  }, [newOrderIds.size, soundActivated])

  // Polling - check for orders every 3 seconds
  // Only starts AFTER initial load is complete
  useEffect(() => {
    if (!supabase || !initialLoadDone) return

    const pollOrders = async () => {
      try {
        if (!supabase) return
        const { orders, queryFailed } = await fetchKitchenQueueOrders(supabase, params.tenant)
        if (queryFailed) {
          console.warn('[keuken] poll mislukt — laatste bonnen op scherm houden')
          return
        }
        applyKitchenQueueSnapshot(orders as unknown as Order[])
      } catch (error) {
        console.error('Polling error:', error)
      }
    }

    // Poll every 3 seconds
    const pollInterval = setInterval(pollOrders, 3000)

    return () => {
      clearInterval(pollInterval)
    }
  }, [params.tenant, initialLoadDone, applyKitchenQueueSnapshot])

  async function loadData() {
    try {
      const settings = await getTenantSettings(params.tenant)
      if (settings) {
        setBusiness({
          business_name: settings.business_name,
          primary_color: settings.primary_color || '#FF6B35',
          address: settings.address,
          phone: settings.phone,
          btw_number: settings.btw_number,
        })
      }

      if (!supabase) {
        setLoading(false)
        setInitialLoadDone(true)
        return
      }

      const { orders, queryFailed } = await fetchKitchenQueueOrders(supabase, params.tenant)
      if (!queryFailed) {
        applyKitchenQueueSnapshot(orders as unknown as Order[])
        console.log(`Initial load: ${orders.length} keuken orders`)
      } else {
        console.warn('[keuken] initial fetch mislukt')
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }

    setLoading(false)
    setInitialLoadDone(true)
  }

  async function handleAllReady() {
    await Promise.all(
      orders.map((o) => {
        const st = (o.status || '').toLowerCase()
        const isOpenTab = st === 'open' && (o.order_type || '').toString().toUpperCase() === 'DINE_IN'
        return updateOrderStatus(params.tenant, o.id, isOpenTab ? 'preparing': 'ready')
      }),
    )
    setOrders([])
  }

  async function handleReady(order: Order) {
    const st = (order.status || '').toLowerCase()
    const isOpenTab = st === 'open' && (order.order_type || '').toString().toUpperCase() === 'DINE_IN'

    if (isOpenTab) {
      await updateOrderStatus(params.tenant, order.id, 'preparing')
    } else {
      await updateOrderStatus(params.tenant, order.id, 'ready')

      console.log('handleReady called, customer_phone:', order.customer_phone)
      if (order.customer_phone) {
        try {
          const response = await authFetch('/api/whatsapp/send-status', {
            method: 'POST',
            body: JSON.stringify({
              tenantSlug: params.tenant,
              customerPhone: order.customer_phone,
              orderNumber: order.order_number,
              status: 'ready',
            }),
          })
          const data = await response.json()
          if (response.ok) {
            console.log('WhatsApp ready notification sent successfully:', data)
          } else {
            console.error('WhatsApp ready notification failed:', response.status, data)
          }
        } catch (err) {
          console.error('Failed to send WhatsApp ready notification:', err)
        }
      } else {
        console.log('No customer_phone on order, skipping WhatsApp notification')
      }
    }

    setNewOrderIds((prev) => {
      const next = new Set(prev)
      next.delete(order.id)
      return next
    })
    knownOrderIdsRef.current.delete(order.id)
    setOrders((prev) => prev.filter((o) => o.id !== order.id))
    setSelectedOrder(null)
  }

  async function printOrder(order: Order) {
    const tableNumber =
      order.table_number == null || String(order.table_number).trim() === ''
        ? null
        : order.floor_plan_zone?.trim()
          ? `${order.table_number} (${order.floor_plan_zone.trim()})`
          : order.table_number
    const headingNames = kassaOrderItemHeadingNames(order.items)
    const items = (order.items || []).map((item: unknown) => {
      const optLines = orderItemDisplayOptionLines(item)
      const kitchenNote = kassaOrderItemKitchenLineNote(item)
      return {
        quantity: Number((item as { quantity?: unknown }).quantity) || 1,
        name: orderItemDisplayName(item) || 'Item',
        price: orderItemLineTotalEur(item),
        choices: optLines.map((name) => ({ name, price: 0 })),
        notes: kitchenNote,
      }
    })
    const requestedDateTime = order.scheduled_date
      ? `${new Date(order.scheduled_date).toLocaleDateString('nl-BE')}${order.scheduled_time ? ' ' + order.scheduled_time : ''}`
      : ''
    const bonLines = [
      '*** KEUKEN BON ***',
      `#${order.order_number}`,
      ...(tableNumber != null ? [`Tafel ${tableNumber}`] : []),
      ...headingNames,
      ...items.flatMap((item) => [
        `${item.quantity}x ${item.name}`,
        ...(item.choices || []).map((c) => ` + ${c.name}`),
        ...(item.notes ? [`  ! ${item.notes}`] : []),
      ]),
      ...(order.customer_notes ? [String(order.customer_notes)] : []),
    ]
    await sendToVysionPrintAgent({
      winkelnaam: business?.business_name || '',
      bonInhoud: bonLines.join('\n'),
      copies: 1,
      receiptMode: 'keuken',
      orderData: {
        orderNumber: order.order_number,
        orderType: order.order_type,
        tableNumber,
        items,
        subtotal: 0,
        tax: 0,
        total: 0,
        ...(order.customer_name ? { customerName: order.customer_name } : {}),
        ...(order.customer_phone ? { customerPhone: order.customer_phone } : {}),
        ...((order as { customer_address?: string }).customer_address ||
        (order as { delivery_address?: string }).delivery_address
          ? {
              customerAddress:
                (order as { customer_address?: string }).customer_address ||
                (order as { delivery_address?: string }).delivery_address,
            }
          : {}),
        ...(order.customer_notes ? { customerNotes: order.customer_notes } : {}),
        ...(requestedDateTime ? { requestedDateTime } : {}),
      } as never,
      businessInfo: {
        name: business?.business_name,
        address: (business as { address?: string } | null)?.address,
        postalCode: (business as { postal_code?: string } | null)?.postal_code,
        city: (business as { city?: string } | null)?.city,
        phone: business?.phone,
        vatNumber: business?.btw_number,
      },
    })
  }

  const getTimeSince = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return tx('justNow')
    if (mins < 60) return `${mins} ${tx('min')}`
    return `${Math.floor(mins / 60)}u ${mins % 60}m`
  }

  /** Statusregel in kaartkop (zelfde vertalingen als shop display, multi-tenant) */
  const kitchenHeaderStatus = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'open') return tx('statusOpenCart')
    if (s === 'preparing') return t('shopDisplay.statusPreparing')
    return t('shopDisplay.statusKitchen')
  }

  const orderTypeLabel = useCallback(
    (orderType: string) => t(`shopDisplay.${shopDisplayOrderTypeKey(orderType)}`),
    [t],
  )

  const orderTypeLabelShort = (order: Pick<Order, 'order_type'>) => {
    const key = shopDisplayOrderTypeKey(order.order_type)
    if (key === 'delivery') return ` ${t('shopDisplay.delivery')}`
    if (key === 'dineIn') return ` ${t('shopDisplay.dineIn')}`
    if ((order.order_type || '').toString().toUpperCase() === 'TAKEAWAY') return ` ${t('shopDisplay.pickup')}`
    return ` ${t('shopDisplay.pickup')}`
  }

  const kdsPageCount = Math.max(1, Math.ceil(orders.length / Math.max(1, colsPerPage)))
  const kdsPageSafe = Math.min(kdsPage, kdsPageCount - 1)
  const kdsPageStride = Math.max(1, colsPerPage) * (kdsColPx + KDS_COL_GAP_PX)
  const scrollBoardToPage = useCallback(
    (page: number) => {
      const el = boardScrollRef.current
      const next = Math.max(0, Math.min(kdsPageCount - 1, page))
      if (!el) {
        setKdsPage(next)
        return
      }
      el.scrollTo({ left: next * kdsPageStride, behavior: 'smooth' })
      setKdsPage(next)
    },
    [kdsPageCount, kdsPageStride],
  )
  const onBoardScroll = useCallback(() => {
    const el = boardScrollRef.current
    if (!el) return
    const page = Math.max(0, Math.min(kdsPageCount - 1, Math.round(el.scrollLeft / kdsPageStride)))
    setKdsPage((prev) => (prev === page ? prev : page))
  }, [kdsPageCount, kdsPageStride])
  const kdsPageIndexes = (() => {
    const maxButtons = 7
    if (kdsPageCount <= maxButtons) return Array.from({ length: kdsPageCount }, (_, i) => i)
    let start = Math.max(0, kdsPageSafe - 3)
    const end = Math.min(kdsPageCount, start + maxButtons)
    start = Math.max(0, end - maxButtons)
    return Array.from({ length: end - start }, (_, i) => start + i)
  })()

  const syncTicketScroll = useCallback(() => {
    let up = false
    let down = false
    for (const el of ticketBodyRefs.current.values()) {
      const max = el.scrollHeight - el.clientHeight
      if (el.scrollTop > 2) up = true
      if (max > 2 && el.scrollTop < max - 2) down = true
    }
    setTicketScroll((prev) => (prev.up === up && prev.down === down ? prev : { up, down }))
  }, [])

  const scrollTicketBodies = useCallback((dir: 'up' | 'down' | 'top' | 'bottom') => {
    let moved = false
    for (const el of ticketBodyRefs.current.values()) {
      const max = el.scrollHeight - el.clientHeight
      if (max <= 2) continue
      const top = el.scrollTop
      const step = Math.max(180, Math.round(el.clientHeight * 0.72))
      if (dir === 'up' && top > 2) {
        el.scrollBy({ top: -step, behavior: 'smooth' })
        moved = true
      } else if (dir === 'down' && top < max - 2) {
        el.scrollBy({ top: step, behavior: 'smooth' })
        moved = true
      } else if (dir === 'top' && top > 2) {
        el.scrollTo({ top: 0, behavior: 'smooth' })
        moved = true
      } else if (dir === 'bottom' && top < max - 2) {
        el.scrollTo({ top: max, behavior: 'smooth' })
        moved = true
      }
    }
    window.setTimeout(syncTicketScroll, 350)
    return moved
  }, [syncTicketScroll])

  useEffect(() => {
    const id = window.requestAnimationFrame(syncTicketScroll)
    return () => window.cancelAnimationFrame(id)
  }, [kdsPageSafe, orders, syncTicketScroll])

  if (loading) {
    return (
      <div
        className={`min-h-[100dvh] w-full min-w-0 max-w-full ${KASSA_SPEELS_MENU_PLATE_SHELL_BG_CLASS} flex items-center justify-center text-white`}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className={`h-16 w-16 rounded-full border-4 ${ui.loaderRing} border-t-transparent`}
        />
      </div>
    )
  }


  return (
    <div
      className={`flex min-h-0 h-[100dvh] max-h-[100dvh] w-full min-w-0 max-w-full flex-col overflow-hidden ${KASSA_SPEELS_MENU_PLATE_SHELL_BG_CLASS} text-white`}
     
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {!soundActivated && (
        <OnlineDisplaySoundActivationScreen onActivate={activateSound} />
      )}

      <header className="shrink-0 border-b border-black/50 bg-transparent px-3 py-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 shrink items-center gap-2">
            {kassaEntryHref && (
              <Link href={kassaEntryHref} className={`flex shrink-0 items-center gap-2 ${kdsChromeBtn}`}>
                {t('adminLayout.pos')}
              </Link>
            )}
            {!kassaEntryHref && adminMenuHref && (
              <Link href={adminMenuHref} className={`flex shrink-0 items-center gap-2 ${kdsChromeBtn}`}>
                ← {t('adminLayout.menu')}
              </Link>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">{tx('title')}</h1>
              <p className="hidden truncate text-sm text-white/70 sm:block sm:text-lg">
                {business?.business_name}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1.5 overflow-x-auto sm:gap-2">
            <div className={`shrink-0 whitespace-nowrap ${kdsChromeBtn}`}>
              {orders.length} {tx('toMake')}
            </div>

            <button type="button" onClick={handleAllReady} className={`shrink-0 whitespace-nowrap ${kdsChromeBtn}`}>
              Alles klaar
            </button>

            {newOrderIds.size > 0 && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className={`shrink-0 ${ui.newOrderBanner}`}
              >
                {newOrderIds.size} {tx('newOrder')}
              </motion.div>
            )}

            <div className="shrink-0 whitespace-nowrap font-mono text-2xl font-bold tabular-nums text-white sm:text-4xl">
              {currentTime.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </header>

      <div ref={boardRef} className="min-h-0 flex-1 overflow-hidden">
        {orders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-white/50">
            <p className="text-2xl font-semibold text-white/80">{tx('allDone')}</p>
            <p className="mt-2 text-lg">{tx('ordersAppearHere')}</p>
          </div>
        ) : (
          <div
            ref={boardScrollRef}
            onScroll={onBoardScroll}
            className={`flex h-full w-full min-w-0 touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain px-3 py-3 [-webkit-overflow-scrolling:touch] ${
              kdsDensity === 'wide15' ? 'gap-3' : 'gap-4'
            }`}
          >
            {orders.map((order) => (
              <KitchenKdsColumn
                key={order.id}
                density={kdsDensity}
                order={order}
                locale={locale}
                now={currentTime}
                isNew={newOrderIds.has(order.id)}
                headerStatus={kitchenHeaderStatus(order.status)}
                onlineOrderLabel={t('shopDisplay.onlineOrder')}
                orderTypeLabel={orderTypeLabel}
                orderTypeLabelShort={orderTypeLabelShort}
                printLabel={tx('print')}
                readyLabel={tx('ready')}
                startLabel={tx('start')}
                started={startedOrderIds.has(order.id)}
                madeLineKeys={new Set(madeByOrder[order.id] ?? [])}
                madeLabel={tx('itemMade')}
                onToggleMade={(lineKey) => toggleItemMade(order.id, lineKey)}
                t={t}
                bodyRef={(el) => {
                  if (el) ticketBodyRefs.current.set(order.id, el)
                  else ticketBodyRefs.current.delete(order.id)
                }}
                onBodyScroll={syncTicketScroll}
                onOpen={() => {
                  setSelectedOrder(order)
                  setNewOrderIds((prev) => {
                    const next = new Set(prev)
                    next.delete(order.id)
                    return next
                  })
                }}
                onPrint={(e) => {
                  e.stopPropagation()
                  printOrder(order)
                }}
                onReady={(e) => {
                  e.stopPropagation()
                  handleReady(order)
                }}
                onStart={(e) => {
                  e.stopPropagation()
                  markOrderStarted(order.id)
                }}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-center gap-2 border-t border-black/50 bg-transparent px-3 py-2">
        <button
          type="button"
          className={`${kdsChromeBtn} disabled:opacity-40`}
          onClick={() => {
            if (scrollTicketBodies('top')) return
            scrollBoardToPage(0)
          }}
          disabled={!ticketScroll.up && kdsPageSafe <= 0}
          aria-label="Naar boven"
        >
          «
        </button>
        <button
          type="button"
          className={`${kdsChromeBtn} disabled:opacity-40`}
          onClick={() => {
            if (scrollTicketBodies('up')) return
            scrollBoardToPage(kdsPageSafe - 1)
          }}
          disabled={!ticketScroll.up && kdsPageSafe <= 0}
          aria-label="Omhoog scrollen"
        >
          ‹
        </button>
        {kdsPageIndexes.map((i) => (
          <button
            key={i}
            type="button"
            className={`min-w-[2.5rem] ${i === kdsPageSafe ? kdsChromeOn : kdsChromeBtn}`}
            onClick={() => scrollBoardToPage(i)}
            aria-current={i === kdsPageSafe ? 'page' : undefined}
          >
            {i + 1}
          </button>
        ))}
        <button
          type="button"
          className={`${kdsChromeBtn} disabled:opacity-40`}
          onClick={() => {
            if (scrollTicketBodies('down')) return
            scrollBoardToPage(kdsPageSafe + 1)
          }}
          disabled={!ticketScroll.down && kdsPageSafe >= kdsPageCount - 1}
          aria-label="Omlaag scrollen"
        >
          ›
        </button>
        <button
          type="button"
          className={`${kdsChromeBtn} disabled:opacity-40`}
          onClick={() => {
            if (scrollTicketBodies('bottom')) return
            scrollBoardToPage(kdsPageCount - 1)
          }}
          disabled={!ticketScroll.down && kdsPageSafe >= kdsPageCount - 1}
          aria-label="Naar beneden"
        >
          »
        </button>
      </footer>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${ui.modalOverlay}`}
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className={`max-h-[90vh] w-full max-w-3xl overflow-y-auto ${ui.modalPanel}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`rounded-t-2xl border-b p-6 ${ui.modalHeader}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className={`text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums ${ui.panelText}`}>#{selectedOrder.order_number}</h2>
                    <p className={`text-sm font-medium mt-1 uppercase tracking-wide ${ui.muted}`}>
                      {kitchenHeaderStatus(selectedOrder.status)}
                    </p>
                    <p className={`text-sm mt-2 ${ui.muted}`}>
                      {(() => {
                        const sched = formatOrderScheduleDetail(selectedOrder, locale)
                        if (!isWebshopOrder(selectedOrder)) {
                          return `${orderTypeLabelShort(selectedOrder)} · ${getTimeSince(selectedOrder.created_at)}`
                        }
                        const ch = t(`shopDisplay.${shopDisplayOrderTypeKey(selectedOrder.order_type)}`)
                        return `${t('shopDisplay.onlineOrder')} · ${ch}${sched ? `· ${sched}`: ''}`
                      })()}
                    </p>
                    {(() => {
                      const seat = adminDineInSeatAuditLine(selectedOrder, t)
                      if (!seat) return null
                      return (
                        <p className={`text-sm font-semibold mt-2 px-2 py-1 rounded-md inline-block ${kassaKitchenDark ? 'text-white bg-white/10' : 'text-gray-900 bg-gray-100'}`}>
                          {seat}
                        </p>
                      )
                    })()}
                    {kassaOrderItemHeadingNames(selectedOrder.items).map((name) => (
                      <p
                        key={name}
                        className={`mt-3 text-4xl font-black leading-tight ${ui.panelText}`}
                      >
                        {name}
                      </p>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center text-xl ${kdsChromeBtn}`}
                    aria-label={t('shopDisplay.cancel')}
                  >
                    <KassaIconClose className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {(() => {
                  const schedStr = formatOrderScheduleDetail(selectedOrder, locale)
                  if (!schedStr) return null
                  return (
                    <div className={`mb-4 p-4 text-center ${ui.recessTray}`}>
                      <p className={ui.noteLabel}>{t('shopDisplay.desiredTimeLabel')}</p>
                      <p className={`mt-1 text-lg font-semibold ${ui.panelText}`}>{schedStr}</p>
                    </div>
                  )
                })()}

                <div className={`mb-4 p-4 ${ui.recessTray}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className={`text-sm ${ui.muted}`}>{tx('customer')}</p>
                      <p className={`text-xl font-semibold ${ui.panelText}`}>{selectedOrder.customer_name}</p>
                    </div>
                    {selectedOrder.customer_phone && (
                      <div className="text-left sm:text-right">
                        <p className={`text-sm ${ui.muted}`}>{tx('phone')}</p>
                        <p className={`text-lg font-semibold tabular-nums ${ui.panelText}`}>{selectedOrder.customer_phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`mb-4 min-h-0 p-4 ${ui.recessTray}`}>
                  <h3 className={`mb-4 text-sm font-semibold uppercase tracking-wide ${ui.muted}`}>{tx('toPrepare')}</h3>
                  <div
                    className={`max-h-[min(62vh,32rem)] space-y-4 overflow-y-auto overscroll-y-contain rounded-lg p-4 pr-1 [scrollbar-gutter:stable] ${ui.recessTray}`}
                  >
                    {selectedOrder.items?.map((item: unknown, i: number) => {
                      const label = orderItemDisplayName(item)
                      const optLines = orderItemDisplayOptionLines(item)
                      const qty = Number((item as { quantity?: unknown }).quantity) || 1
                      const noteStr = kassaOrderItemKitchenLineNote(item) ?? ''
                      const lineKey = kitchenItemLineKey(i)
                      const made = (madeByOrder[selectedOrder.id] ?? []).includes(lineKey)
                      return (
                      <div key={lineKey} className={`flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0 ${ui.panelDivider}`}>
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center text-xl font-bold sm:h-14 sm:w-14 sm:text-2xl ${made ? 'bg-red-600 text-white' : ui.btn}`}>
                          {qty}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xl font-semibold leading-tight sm:text-2xl ${made ? 'text-red-600' : ui.panelText}`}>
                            {label}
                          </p>
                          {optLines.map((line, j) => (
                            <p key={j} className={made ? 'text-lg text-red-500' : ui.optionLine}>
                              + {line}
                            </p>
                          ))}
                          {noteStr ? (
                            <p className={made ? 'mt-1 text-lg text-red-500' : ui.itemNoteBox}>
                              Opmerking: {noteStr}
                            </p>
                          ) : null}
                        </div>
                        <KitchenItemMadeMark
                          made={made}
                          label={tx('itemMade')}
                          onDark={kassaKitchenDark}
                          onToggle={() => toggleItemMade(selectedOrder.id, lineKey)}
                        />
                      </div>
                      )
                    })}
                  </div>
                </div>

                {selectedOrder.customer_notes && (
                  <div className={`mb-4 p-4 ${ui.recessTray}`}>
                    <p className={ui.noteLabel}>{tx('notes')}</p>
                    <p className={`text-lg font-medium ${ui.panelText}`}>{selectedOrder.customer_notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="button"
                    onClick={() => printOrder(selectedOrder)}
                    className={`py-5 text-lg ${kdsChromeBtn}`}
                  >
                    {tx('printReceipt')}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="button"
                    onClick={() => handleReady(selectedOrder)}
                    className={`py-5 text-lg ${kassaSpeelsGreenGlossButtonClass(false)} ${KASSA_SPEELS_GREEN_GLOW_SWEEP_CLASS}`}
                  >
                    {tx('markReady')}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
