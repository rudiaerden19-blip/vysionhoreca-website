'use client'

import { useState, useEffect, useRef } from 'react'
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
import { adminDineInSeatAuditLine, dineInSeatLineNl } from '@/lib/admin-order-display'
import {
  SHOP_DISPLAY_PAGE_SHELL,
  SHOP_DISPLAY_HEADER,
  SHOP_DISPLAY_BTN,
  SHOP_DISPLAY_BTN_ACCENT,
  SHOP_DISPLAY_BTN_MENU,
  SHOP_DISPLAY_LANG_DROPDOWN,
  SHOP_DISPLAY_MODAL_OVERLAY,
  SHOP_DISPLAY_MODAL_PANEL,
  SHOP_DISPLAY_MUTED,
  SHOP_DISPLAY_RECESS,
  SHOP_DISPLAY_BTN_SHAPE,
  SHOP_DISPLAY_ACCENT_TEXT,
  KITCHEN_POS_BTN,
  KITCHEN_POS_BTN_ACCENT,
  KITCHEN_CARD_HEAD,
} from '@/lib/shop-display-surface'
import { KitchenStyleOrderCard } from '@/components/shop-display/KitchenStyleOrderCard'

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
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const alertIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const knownOrderIdsRef = useRef<Set<string>>(new Set())
  const [keukenLangOpen, setKeukenLangOpen] = useState(false)
  const keukenLangRef = useRef<HTMLDivElement>(null)

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

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
    /** Probeer eerst de lokale Vysion Print Agent (ESC/POS bonprinter).
     *  Lukt niet? Val terug op browser-printvenster (HTML). */
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
      ? `${new Date(order.scheduled_date).toLocaleDateString('nl-BE')}${order.scheduled_time ? ' '+ order.scheduled_time : ''}`
      : ''
    const printResult = await sendToVysionPrintAgent({
      winkelnaam: business?.business_name || '',
      bonInhoud: '',
      copies: 1,
      receiptMode: 'keuken',
      orderData: {
        orderNumber: order.order_number,
        orderType: order.order_type,
        tableNumber: null,
        items,
        subtotal: 0,
        tax: 0,
        total: 0,
        // Extra velden die buildKitchenReceipt gebruikt:
        ...(order.customer_name ? { customerName: order.customer_name } : {}),
        ...(order.customer_phone ? { customerPhone: order.customer_phone } : {}),
        ...((order as any).customer_address || (order as any).delivery_address
          ? { customerAddress: (order as any).customer_address || (order as any).delivery_address }
          : {}),
        ...(order.customer_notes ? { customerNotes: order.customer_notes } : {}),
        ...(requestedDateTime ? { requestedDateTime } : {}),
      } as any,
      businessInfo: {
        name: business?.business_name,
        address: (business as any)?.address ?? undefined,
        postalCode: (business as any)?.postal_code ?? undefined,
        city: (business as any)?.city ?? undefined,
        phone: (business as any)?.phone ?? undefined,
        vatNumber: (business as any)?.btw_number ?? undefined,
      },
    })
    if (printResult.ok) return

    window.alert(
      `${t('kassaApp.printAgentFailedDebugTitle')}\n\n${printResult.error}\n\n${t('kassaApp.printAgentFailedDebugFooter')}`,
    )
    browserPrintOrder(order)
  }

  function browserPrintOrder(order: Order) {
    const printWindow = window.open('', '_blank', 'width=300,height=600')
    if (!printWindow) return

    const nlDineInSeat = dineInSeatLineNl(order.order_type, order.table_number, order.floor_plan_zone)

    const itemsHtml = order.items?.map((item: unknown) => {
      const label = orderItemDisplayName(item)
      const optLines = orderItemDisplayOptionLines(item)
      const qty = Number((item as { quantity?: unknown }).quantity) || 1
      return `
      <tr>
        <td style="font-size: 18px; font-weight: bold; padding: 4px 0;">${qty}x</td>
        <td style="font-size: 18px; padding: 4px 0;">${label}</td>
      </tr>
      ${optLines.map((line) => `
        <tr><td></td><td style="font-size: 14px; color: #666; padding-left: 10px;">+ ${line}</td></tr>
      `).join('')}
      ${(item as { notes?: unknown }).notes ? `<tr><td></td><td style="font-size: 14px; color: #666; font-style: italic; padding-left: 10px;"> ${String((item as { notes?: unknown }).notes)}</td></tr>`: ''}
    `
    }).join('') || ''

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Keuken Bon #${order.order_number}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              padding: 10px; 
              max-width: 280px;
              margin: 0 auto;
            }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .order-number { font-size: 32px; font-weight: bold; }
            .order-type { font-size: 24px; margin: 10px 0; padding: 5px; background: #000; color: #fff; display: inline-block; }
            table { width: 100%; border-collapse: collapse; }
            .notes { margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 5px; }
            .footer { text-align: center; margin-top: 15px; border-top: 2px dashed #000; padding-top: 10px; font-size: 12px; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">*** KEUKEN BON ***</div>
            <div class="order-number">#${order.order_number}</div>
            <div class="order-type">${order.order_type === 'delivery' || order.order_type === 'DELIVERY'? 'BEZORGEN': order.order_type === 'DINE_IN'? 'TER PLAATSE': order.order_type === 'TAKEAWAY'? 'AFHALEN': 'AFHALEN'}</div>
            ${nlDineInSeat ? `<div style="font-size: 16px; font-weight: bold; margin-top: 6px;">${nlDineInSeat}</div>`: ''}
            ${(order.scheduled_date || order.scheduled_time) ? `
            <div style="margin: 6px 0; padding: 6px; background: #000; color: #fff; font-size: 16px; font-weight: bold; border-radius: 4px;">
               LEVEREN OP: ${order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric'}) : ''}${order.scheduled_time ? 'om '+ order.scheduled_time : ''}
            </div>`: ''}
            <div style="font-size: 14px; margin-top: 5px;">
              ${new Date(order.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit'})}
            </div>
          </div>
          
          <div style="margin-bottom: 10px;">
            <strong>Klant: ${order.customer_name}</strong>
            ${order.customer_phone ? `<br>Tel: ${order.customer_phone}`: ''}
          </div>

          <table>
            ${itemsHtml}
          </table>

          ${order.customer_notes ? `
            <div class="notes">
              <strong> OPMERKING:</strong><br>
              ${order.customer_notes}
            </div>
          `: ''}

          <div class="footer">
            ${business?.business_name || ''}<br>
            ${business?.address || ''}<br>
            ${business?.phone ? `Tel: ${business.phone}`: ''}<br>
            ${business?.btw_number ? `BTW: ${business.btw_number}`: ''}<br>
            ${new Date().toLocaleDateString('nl-BE')}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
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

  const orderTypeLabelShort = (order: Pick<Order, 'order_type'>) => {
    const key = shopDisplayOrderTypeKey(order.order_type)
    if (key === 'delivery') return ` ${t('shopDisplay.delivery')}`
    if (key === 'dineIn') return ` ${t('shopDisplay.dineIn')}`
    if ((order.order_type || '').toString().toUpperCase() === 'TAKEAWAY') return ` ${t('shopDisplay.pickup')}`
    return ` ${t('shopDisplay.pickup')}`
  }

  if (loading) {
    return (
      <div
        className={`min-h-[100dvh] w-full min-w-0 max-w-full ${SHOP_DISPLAY_PAGE_SHELL} flex items-center justify-center`}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-16 w-16 rounded-full border-4 border-accent border-t-transparent"
        />
      </div>
    )
  }


  return (
    <div
      className={`flex min-h-0 h-[100dvh] max-h-[100dvh] w-full min-w-0 max-w-full flex-col overflow-hidden ${SHOP_DISPLAY_PAGE_SHELL}`}
     
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {!soundActivated && (
        <OnlineDisplaySoundActivationScreen onActivate={activateSound} />
      )}

      {/* Header */}
      <header className={`shrink-0 px-4 py-3 ${SHOP_DISPLAY_HEADER}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {kassaEntryHref && (
              <Link href={kassaEntryHref} className={`flex shrink-0 items-center gap-2 text-sm ${SHOP_DISPLAY_BTN_ACCENT}`}>
                <span className="text-base leading-none" aria-hidden>
                  
                </span>
                {t('adminLayout.pos')}
              </Link>
            )}
            {!kassaEntryHref && adminMenuHref && (
              <Link href={adminMenuHref} className={`flex shrink-0 items-center gap-2 ${SHOP_DISPLAY_BTN_MENU}`}>
                ← {t('adminLayout.menu')}
              </Link>
            )}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl bg-gray-200 text-gray-700">
              
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold sm:text-xl">{tx('title')}</h1>
              <p className="truncate text-xs text-gray-600 sm:text-sm">{business?.business_name}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            <span
              onClick={enableSound}
              className={`flex cursor-pointer items-center gap-2 text-sm rounded-xl px-3 py-2 ${
                soundActivated
                  ? SHOP_DISPLAY_BTN
                  : 'bg-amber-100 text-amber-900 ring-2 ring-amber-400'
              }`}
            >
              {soundActivated ? tx('soundEnabled') : tx('soundOn')}
            </span>

            {/* Order count */}
            <div className={`px-4 py-2 font-bold ${SHOP_DISPLAY_BTN}`}>
               {orders.length} {tx('toMake')}
            </div>

            {/* Alles klaar */}
            <button type="button" onClick={handleAllReady} className={SHOP_DISPLAY_BTN_ACCENT}>
               Alles klaar
            </button>

            {/* New order indicator */}
            {newOrderIds.size > 0 && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="rounded-xl border border-red-300 bg-red-100 px-4 py-2 font-bold text-red-800"
              >
                 {newOrderIds.size} {tx('newOrder')}
              </motion.div>
            )}

            {/* Clock */}
            <div className={`font-mono text-2xl font-bold tabular-nums ${SHOP_DISPLAY_ACCENT_TEXT}`}>
              {currentTime.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit'})}
            </div>

            <Link href={displayHref} className={`text-sm font-bold ${SHOP_DISPLAY_BTN_ACCENT}`}>
              {t('adminLayout.onlineDisplay')}
            </Link>

            <div className="relative z-[130]" ref={keukenLangRef}>
              <button
                type="button"
                onClick={() => setKeukenLangOpen((o) => !o)}
                className={`inline-flex items-center gap-1 text-sm font-bold ${SHOP_DISPLAY_BTN}`}
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
                <div
                  className={SHOP_DISPLAY_LANG_DROPDOWN}
                >
                  {locales.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setLocale(lang)
                        setKeukenLangOpen(false)
                      }}
                      className={`flex w-full items-center gap-2 border-b border-gray-100 px-4 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-gray-50 ${
                        locale === lang ? 'bg-teal-50 font-semibold text-accent': 'text-gray-800'
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

      {/* Orders Grid — flex-1 + min-h-0: correcte scroll op iPad Safari / PWA */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
        {orders.length === 0 ? (
          <div className={`flex h-full flex-col items-center justify-center ${SHOP_DISPLAY_MUTED}`}>
            <span className="mb-6 text-8xl"></span>
            <p className="text-2xl font-bold text-gray-900">{tx('allDone')}</p>
            <p className="mt-2 text-lg">{tx('ordersAppearHere')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {orders.map((order) => (
              <KitchenStyleOrderCard
                key={order.id}
                order={order}
                locale={locale}
                isNew={newOrderIds.has(order.id)}
                headerStatus={kitchenHeaderStatus(order.status)}
                onlineOrderLabel={t('shopDisplay.onlineOrder')}
                orderTypeLabel={(ot) => t(`shopDisplay.${shopDisplayOrderTypeKey(ot)}`)}
                orderTypeLabelShort={orderTypeLabelShort}
                timeSince={getTimeSince(order.created_at)}
                printLabel={tx('print')}
                readyLabel={tx('ready')}
                t={t}
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex items-center justify-center ${SHOP_DISPLAY_MODAL_OVERLAY} p-4`}
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className={`max-h-[90vh] w-full max-w-3xl overflow-y-auto ${SHOP_DISPLAY_MODAL_PANEL}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`rounded-t-2xl border-b border-gray-200 p-6 text-gray-900 ${KITCHEN_CARD_HEAD}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">#{selectedOrder.order_number}</h2>
                    <p className="text-sm font-medium text-gray-700 mt-1 uppercase tracking-wide">
                      {kitchenHeaderStatus(selectedOrder.status)}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
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
                        <p className="text-sm text-sky-900 font-semibold mt-2 bg-sky-50 border border-sky-200 px-2 py-1 rounded-md inline-block">
                          {seat}
                        </p>
                      )
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center text-xl ${SHOP_DISPLAY_BTN}`}
                    aria-label={t('shopDisplay.cancel')}
                  >
                    
                  </button>
                </div>
              </div>

              <div className="p-6">
                {(() => {
                  const schedStr = formatOrderScheduleDetail(selectedOrder, locale)
                  if (!schedStr) return null
                  return (
                    <div className={`mb-4 p-4 text-center ${SHOP_DISPLAY_BTN_SHAPE} ${SHOP_DISPLAY_RECESS}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('shopDisplay.desiredTimeLabel')}</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">{schedStr}</p>
                    </div>
                  )
                })()}

                <div className={`mb-4 p-4 ${SHOP_DISPLAY_BTN_SHAPE} ${SHOP_DISPLAY_RECESS}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className={`text-sm ${SHOP_DISPLAY_MUTED}`}>{tx('customer')}</p>
                      <p className="text-xl font-semibold text-gray-900">{selectedOrder.customer_name}</p>
                    </div>
                    {selectedOrder.customer_phone && (
                      <div className="text-left sm:text-right">
                        <p className={`text-sm ${SHOP_DISPLAY_MUTED}`}>{tx('phone')}</p>
                        <p className="text-lg font-semibold tabular-nums text-gray-900">{selectedOrder.customer_phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`mb-4 min-h-0 p-4 ${SHOP_DISPLAY_BTN_SHAPE} ${SHOP_DISPLAY_RECESS}`}>
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">{tx('toPrepare')}</h3>
                  <div
                    className={`max-h-[min(62vh,32rem)] space-y-4 overflow-y-auto overscroll-y-contain rounded-lg p-4 pr-1 [scrollbar-gutter:stable] ${SHOP_DISPLAY_RECESS}`}
                  >
                    {selectedOrder.items?.map((item: unknown, i: number) => {
                      const label = orderItemDisplayName(item)
                      const optLines = orderItemDisplayOptionLines(item)
                      const qty = Number((item as { quantity?: unknown }).quantity) || 1
                      const noteRaw = (item as { notes?: unknown }).notes
                      const noteStr =
                        noteRaw != null && String(noteRaw).trim() !== ''? String(noteRaw) : ''
                      return (
                      <div key={i} className="flex items-start gap-4 border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center text-xl font-bold sm:h-14 sm:w-14 sm:text-2xl ${KITCHEN_POS_BTN}`}>
                          {qty}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xl font-semibold leading-tight text-gray-900 sm:text-2xl">
                            {label}
                          </p>
                          {optLines.map((line, j) => (
                            <p key={j} className="mt-1 border-l-2 border-gray-300 pl-3 text-base font-medium text-gray-700">
                              + {line}
                            </p>
                          ))}
                          {noteStr ? (
                            <p className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2 text-base font-medium text-gray-700">
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
                  <div className={`mb-4 p-4 ${SHOP_DISPLAY_BTN_SHAPE} ${SHOP_DISPLAY_RECESS}`}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{tx('notes')}</p>
                    <p className="text-lg font-medium text-gray-900">{selectedOrder.customer_notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="button"
                    onClick={() => printOrder(selectedOrder)}
                    className={`py-5 text-lg ${KITCHEN_POS_BTN}`}
                  >
                    {tx('printReceipt')}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="button"
                    onClick={() => handleReady(selectedOrder)}
                    className={`py-5 text-lg ${KITCHEN_POS_BTN_ACCENT}`}
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
