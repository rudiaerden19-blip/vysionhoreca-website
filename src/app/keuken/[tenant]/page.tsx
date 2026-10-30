'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getTenantSettings, updateOrderStatus, isWebshopOrder } from '@/lib/admin-api'
import { authFetch } from '@/lib/auth-headers'
import { formatOrderScheduleDetail } from '@/lib/format-order-schedule'
import { useLanguage } from '@/i18n'
import Link from 'next/link'
import { LocaleFlagEmoji } from '@/components/LocaleFlagEmoji'
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
import { adminDineInSeatAuditLine } from '@/lib/admin-order-display'
import { getShopDisplaySurface } from '@/lib/shop-display-surface'
import { KassaIconClose } from '@/lib/kassa-ui-icons'
import { useKassaUiDarkSync } from '@/lib/kassa-register-ui-dark-preference'
import { KitchenKdsColumn } from '@/components/keuken/KitchenKdsColumn'
import {
  KASSA_SPEELS_GREEN_GLOW_SWEEP_CLASS,
  KASSA_SPEELS_MENU_PLATE_SHELL_BG_CLASS,
  kassaSpeelsBlueGlossButtonClass,
  kassaSpeelsGrayChromeButtonClass,
  kassaSpeelsGreenGlossButtonClass,
} from '@/lib/kassa-pos-surface'

/** Minimale kolombreedte. Minder bonnen op een rij, elk vak duidelijk breder. */
const KDS_COL_PX = 460
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
  const { t, locale, setLocale, locales, localeNames } = useLanguage()
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
  const displayHref = `/shop/${params.tenant}/display`
  
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
  const [keukenLangOpen, setKeukenLangOpen] = useState(false)
  const keukenLangRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const [colsPerPage, setColsPerPage] = useState(5)
  const [kdsPage, setKdsPage] = useState(0)
  const ticketBodyRefs = useRef(new Map<string, HTMLDivElement>())
  const [ticketScroll, setTicketScroll] = useState({ up: false, down: false })
  const kdsChromeBtn = `${kassaSpeelsGrayChromeButtonClass()} px-3 py-2 text-sm`
  const kdsChromeOn = `${kassaSpeelsBlueGlossButtonClass(true)} px-3 py-2 text-sm`

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
    const el = boardRef.current
    if (!el) return
    const measure = () => {
      const inner = Math.max(0, el.clientWidth - KDS_BOARD_PAD_PX)
      const n = Math.max(1, Math.floor((inner + KDS_COL_GAP_PX) / (KDS_COL_PX + KDS_COL_GAP_PX)))
      setColsPerPage(n)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [loading])

  useEffect(() => {
    const count = Math.max(1, Math.ceil(orders.length / Math.max(1, colsPerPage)))
    setKdsPage((p) => Math.min(p, count - 1))
  }, [orders.length, colsPerPage])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant])

  useEffect(() => {
    function handlePointerOutside(e: PointerEvent) {
      if (keukenLangRef.current && !keukenLangRef.current.contains(e.target as Node)) {
        setKeukenLangOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerOutside, true)
    return () => document.removeEventListener('pointerdown', handlePointerOutside, true)
  }, [])

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
        const parsed = (await fetchKitchenQueueOrders(supabase, params.tenant)) as unknown as Order[]

        const trulyNewOrders = parsed.filter((o) => !knownOrderIdsRef.current.has(o.id))

        parsed.forEach((o) => knownOrderIdsRef.current.add(o.id))

        if (trulyNewOrders.length > 0) {
          console.log(` ${trulyNewOrders.length} nieuwe keuken bestelling(en)!`)
          trulyNewOrders.forEach((order) => {
            setNewOrderIds((prev) => new Set([...prev, order.id]))
          })
          if (soundActivated) {
            playOrderNotification()
          }
        }

        setOrders(parsed)
      } catch (error) {
        console.error('Polling error:', error)
      }
    }

    // Poll every 3 seconds
    const pollInterval = setInterval(pollOrders, 3000)

    return () => {
      clearInterval(pollInterval)
    }
  }, [params.tenant, initialLoadDone, soundActivated])

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

      const parsed = (await fetchKitchenQueueOrders(supabase, params.tenant)) as unknown as Order[]
      setOrders(parsed)

      parsed.forEach((o) => knownOrderIdsRef.current.add(o.id))
      console.log(`Initial load: ${parsed.length} keuken orders`)
    } catch (error) {
      console.error('Error loading data:', error)
    }

    setLoading(false)
    setInitialLoadDone(true)
  }

  function enableSound() {
    activateSound()
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
    const items = (order.items || []).map((item: unknown) => {
      const optLines = orderItemDisplayOptionLines(item)
      return {
        quantity: Number((item as { quantity?: unknown }).quantity) || 1,
        name: orderItemDisplayName(item) || 'Item',
        price: orderItemLineTotalEur(item),
        choices: optLines.map((name) => ({ name, price: 0 })),
        notes: (item as { notes?: unknown }).notes ? String((item as { notes?: unknown }).notes) : undefined,
      }
    })
    const requestedDateTime = order.scheduled_date
      ? `${new Date(order.scheduled_date).toLocaleDateString('nl-BE')}${order.scheduled_time ? ' ' + order.scheduled_time : ''}`
      : ''
    const bonLines = [
      '*** KEUKEN BON ***',
      `#${order.order_number}`,
      ...(tableNumber != null ? [`Tafel ${tableNumber}`] : []),
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
  const kdsPageOrders = orders.slice(
    kdsPageSafe * colsPerPage,
    kdsPageSafe * colsPerPage + colsPerPage,
  )
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {kassaEntryHref && (
              <Link href={kassaEntryHref} className={`flex shrink-0 items-center gap-2 ${kdsChromeBtn}`}>
                <span className="text-base leading-none" aria-hidden>
                  
                </span>
                {t('adminLayout.pos')}
              </Link>
            )}
            {!kassaEntryHref && adminMenuHref && (
              <Link href={adminMenuHref} className={`flex shrink-0 items-center gap-2 ${kdsChromeBtn}`}>
                ← {t('adminLayout.menu')}
              </Link>
            )}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
              style={{ backgroundColor: business?.primary_color }}
            >
              
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-white sm:text-xl">{tx('title')}</h1>
              <p className="truncate text-xs text-white/60 sm:text-sm">{business?.business_name}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            <button
              type="button"
              onClick={enableSound}
              className={`flex items-center gap-2 ${soundActivated ? kdsChromeOn : kdsChromeBtn}`}
            >
              {soundActivated ? tx('soundEnabled') : tx('soundOn')}
            </button>

            <div className={kdsChromeBtn}>
               {orders.length} {tx('toMake')}
            </div>

            <button type="button" onClick={handleAllReady} className={kdsChromeBtn}>
               Alles klaar
            </button>

            {newOrderIds.size > 0 && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className={ui.newOrderBanner}
              >
                 {newOrderIds.size} {tx('newOrder')}
              </motion.div>
            )}

            <div className="font-mono text-2xl font-bold tabular-nums text-white">
              {currentTime.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit'})}
            </div>

            <Link href={displayHref} className={kdsChromeBtn}>
              {t('adminLayout.onlineDisplay')}
            </Link>

            <div className="relative z-[130]" ref={keukenLangRef}>
              <button
                type="button"
                onClick={() => setKeukenLangOpen((o) => !o)}
                className={`flex items-center gap-1 ${kdsChromeBtn}`}
                title={t('languageSwitcher.selectLanguage')}
              >
                <LocaleFlagEmoji locale={locale} className="text-base" />
                <svg
                  className={`size-3.5 shrink-0 transition-transform ${keukenLangOpen ? 'rotate-180': ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {keukenLangOpen && (
                <div className={ui.langDropdown}>
                  {locales.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setLocale(lang)
                        setKeukenLangOpen(false)
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                        locale === lang ? ui.langItemActive : ui.langItem
                      }`}
                    >
                      <LocaleFlagEmoji locale={lang} />
                      <span>{localeNames[lang]}</span>
                    </button>
                  ))}
                </div>
              )}
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
          <div className="flex h-full gap-4 px-3 py-3">
            {kdsPageOrders.map((order) => (
              <KitchenKdsColumn
                key={order.id}
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
            setKdsPage(0)
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
            setKdsPage((p) => Math.max(0, p - 1))
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
            onClick={() => setKdsPage(i)}
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
            setKdsPage((p) => Math.min(kdsPageCount - 1, p + 1))
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
            setKdsPage(kdsPageCount - 1)
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
                      const noteRaw = (item as { notes?: unknown }).notes
                      const noteStr =
                        noteRaw != null && String(noteRaw).trim() !== ''? String(noteRaw) : ''
                      return (
                      <div key={i} className={`flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0 ${ui.panelDivider}`}>
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center text-xl font-bold sm:h-14 sm:w-14 sm:text-2xl ${ui.btn}`}>
                          {qty}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xl font-semibold leading-tight sm:text-2xl ${ui.panelText}`}>
                            {label}
                          </p>
                          {optLines.map((line, j) => (
                            <p key={j} className={ui.optionLine}>
                              + {line}
                            </p>
                          ))}
                          {noteStr ? (
                            <p className={ui.itemNoteBox}>
                              Opmerking: {noteStr}
                            </p>
                          ) : null}
                        </div>
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
