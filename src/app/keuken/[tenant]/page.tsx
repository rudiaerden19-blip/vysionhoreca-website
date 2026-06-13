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
import { getAdminKassaEntryHref } from '@/lib/tenant-modules'
import { shopDisplayOrderTypeKey } from '@/lib/shop-display-order-type'
import { 
  activateAudioForIOS,
  prewarmAudio,
  playOrderNotification,
  isAudioActivatedThisSession,
  markAudioActivated
} from '@/lib/sounds'
import { sendToVysionPrintAgent } from '@/lib/vysion-print-agent-client'
import { fetchKitchenQueueOrders } from '@/lib/kitchen-queue-orders'
import {
  orderItemDisplayName,
  orderItemDisplayOptionLines,
  orderItemLineTotalEur,
} from '@/lib/order-items-display'
import { adminDineInSeatAuditLine, dineInSeatLineNl } from '@/lib/admin-order-display'
import {
  KASSA_POS_MENU_PLATE_SHELL_BG_CLASS,
  KASSA_POS_MENU_RECESS_TRAY_CLASS,
  KASSA_POS_BTN_SHAPE,
  KASSA_POS_SELECTED_ACCENT_TEXT,
  kassaPosButtonClass,
} from '@/lib/kassa-pos-surface'

const KITCHEN_POS_BTN = `${kassaPosButtonClass(false)} touch-manipulation font-semibold text-[#f0f0f0]`
const KITCHEN_POS_BTN_ACCENT = `${kassaPosButtonClass(true)} touch-manipulation font-bold`
const KITCHEN_CARD_SHELL = `${KASSA_POS_BTN_SHAPE} border border-[#2a2a2a] ${KASSA_POS_MENU_RECESS_TRAY_CLASS} text-[#f0f0f0]`
const KITCHEN_CARD_HEAD = 'border-b border-black/40 bg-[linear-gradient(180deg,#1c1c1c_0%,#101010_48%,#060606_100%)]'
const KITCHEN_MUTED = 'text-white/70'
const KITCHEN_SUBSTRIP = 'border-b border-white/10 bg-black/25 text-center text-sm font-medium text-white/90'

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
  
  // Translation helper for kitchenDisplay keys
  const tx = (key: string) => t(`kitchenDisplay.${key}`)
  
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [business, setBusiness] = useState<BusinessSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [soundEnabled, setSoundEnabled] = useState(true)
  // Check if already activated this session - skip activation screen if so
  const [audioActivated, setAudioActivated] = useState(() => isAudioActivatedThisSession(params.tenant))
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

  // Load initial data - GELUID ALTIJD AAN
  useEffect(() => {
    loadData()
    setSoundEnabled(true)
    
    // Prewarm audio system bij laden (nieuwe robuuste methode)
    if (audioActivated) {
      prewarmAudio()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant, audioActivated])

  useEffect(() => {
    function handlePointerOutside(e: PointerEvent) {
      if (keukenLangRef.current && !keukenLangRef.current.contains(e.target as Node)) {
        setKeukenLangOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerOutside, true)
    return () => document.removeEventListener('pointerdown', handlePointerOutside, true)
  }, [])

  // Continuous alert for new orders - plays every 5 seconds
  // KRITIEK: Altijd proberen geluid te spelen
  useEffect(() => {
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
  }, [newOrderIds.size])

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
          playOrderNotification()
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
  }, [params.tenant, initialLoadDone])

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
      console.log(` Initial load: ${parsed.length} keuken orders`)
    } catch (error) {
      console.error('Error loading data:', error)
    }

    setLoading(false)
    setInitialLoadDone(true)
  }

  function enableSound() {
    activateAudioForIOS()
    setSoundEnabled(true)
    playOrderNotification()
  }

  async function handleAllReady() {
    await Promise.all(
      orders.map((o) => {
        const st = (o.status || '').toLowerCase()
        const isOpenTab = st === 'open' && (o.order_type || '').toString().toUpperCase() === 'DINE_IN'
        return updateOrderStatus(params.tenant, o.id, isOpenTab ? 'preparing' : 'ready')
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

      console.log(' handleReady called, customer_phone:', order.customer_phone)
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
            console.log(' WhatsApp ready notification sent successfully:', data)
          } else {
            console.error(' WhatsApp ready notification failed:', response.status, data)
          }
        } catch (err) {
          console.error(' Failed to send WhatsApp ready notification:', err)
        }
      } else {
        console.log(' No customer_phone on order, skipping WhatsApp notification')
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
      ? `${new Date(order.scheduled_date).toLocaleDateString('nl-BE')}${order.scheduled_time ? ' ' + order.scheduled_time : ''}`
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
      ${(item as { notes?: unknown }).notes ? `<tr><td></td><td style="font-size: 14px; color: #666; font-style: italic; padding-left: 10px;"> ${String((item as { notes?: unknown }).notes)}</td></tr>` : ''}
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
            <div class="order-type">${order.order_type === 'delivery' || order.order_type === 'DELIVERY' ? ' BEZORGEN' : order.order_type === 'DINE_IN' ? ' TER PLAATSE' : order.order_type === 'TAKEAWAY' ? ' AFHALEN' : ' AFHALEN'}</div>
            ${nlDineInSeat ? `<div style="font-size: 16px; font-weight: bold; margin-top: 6px;">${nlDineInSeat}</div>` : ''}
            ${(order.scheduled_date || order.scheduled_time) ? `
            <div style="margin: 6px 0; padding: 6px; background: #000; color: #fff; font-size: 16px; font-weight: bold; border-radius: 4px;">
               LEVEREN OP: ${order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}${order.scheduled_time ? ' om ' + order.scheduled_time : ''}
            </div>` : ''}
            <div style="font-size: 14px; margin-top: 5px;">
              ${new Date(order.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          
          <div style="margin-bottom: 10px;">
            <strong>Klant: ${order.customer_name}</strong>
            ${order.customer_phone ? `<br>Tel: ${order.customer_phone}` : ''}
          </div>

          <table>
            ${itemsHtml}
          </table>

          ${order.customer_notes ? `
            <div class="notes">
              <strong> OPMERKING:</strong><br>
              ${order.customer_notes}
            </div>
          ` : ''}

          <div class="footer">
            ${business?.business_name || ''}<br>
            ${business?.address || ''}<br>
            ${business?.phone ? `Tel: ${business.phone}` : ''}<br>
            ${business?.btw_number ? `BTW: ${business.btw_number}` : ''}<br>
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

  const orderTypeLabelShort = (order: Order) => {
    const key = shopDisplayOrderTypeKey(order.order_type)
    if (key === 'delivery') return ` ${t('shopDisplay.delivery')}`
    if (key === 'dineIn') return ` ${t('shopDisplay.dineIn')}`
    if ((order.order_type || '').toString().toUpperCase() === 'TAKEAWAY') return ` ${t('shopDisplay.pickup')}`
    return ` ${t('shopDisplay.pickup')}`
  }

  if (loading) {
    return (
      <div
        className={`min-h-[100dvh] w-full min-w-0 max-w-full ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} flex items-center justify-center text-white`}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-16 w-16 rounded-full border-4 border-[#5a9fd4] border-t-transparent"
        />
      </div>
    )
  }


  return (
    <div
      className={`flex min-h-0 h-[100dvh] max-h-[100dvh] w-full min-w-0 max-w-full flex-col overflow-hidden ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} text-[#f0f0f0]`}
      data-vysion-kb-scroll-host
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Header */}
      <header className={`shrink-0 border-b border-black px-4 py-3 ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {kassaEntryHref && (
              <Link href={kassaEntryHref} className={`flex shrink-0 items-center gap-2 px-3 py-2 text-sm ${KITCHEN_POS_BTN_ACCENT}`}>
                <span className="text-base leading-none" aria-hidden>
                  
                </span>
                {t('adminLayout.pos')}
              </Link>
            )}
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center text-xl ${KITCHEN_POS_BTN}`}>
              
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold sm:text-xl">{tx('title')}</h1>
              <p className="truncate text-xs text-white/95 sm:text-sm">{business?.business_name}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            {/* Sound - ALTIJD AAN */}
            <span onClick={enableSound} className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${KITCHEN_POS_BTN}`}>
               {tx('soundEnabled')}
            </span>

            {/* Order count */}
            <div className={`px-4 py-2 font-bold ${KITCHEN_POS_BTN}`}>
               {orders.length} {tx('toMake')}
            </div>

            {/* Alles klaar */}
            <button type="button" onClick={handleAllReady} className={`px-4 py-2 ${KITCHEN_POS_BTN_ACCENT}`}>
               Alles klaar
            </button>

            {/* New order indicator */}
            {newOrderIds.size > 0 && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className={`border border-red-500/60 bg-red-950/80 px-4 py-2 font-bold text-red-200 ${KASSA_POS_BTN_SHAPE}`}
              >
                 {newOrderIds.size} {tx('newOrder')}
              </motion.div>
            )}

            {/* Clock */}
            <div className={`font-mono text-2xl font-bold tabular-nums ${KASSA_POS_SELECTED_ACCENT_TEXT}`}>
              {currentTime.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
            </div>

            <div className="relative z-[130]" ref={keukenLangRef}>
              <button
                type="button"
                onClick={() => setKeukenLangOpen((o) => !o)}
                className={`inline-flex items-center gap-1 px-3 py-2 text-sm font-bold ${KITCHEN_POS_BTN}`}
                title={t('languageSwitcher.selectLanguage')}
              >
                <LocaleFlagEmoji locale={locale} className="text-base text-white" />
                <svg
                  className={`size-3.5 shrink-0 transition-transform ${keukenLangOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {keukenLangOpen && (
                <div
                  className={`absolute right-0 top-full z-[130] mt-1 max-h-80 min-w-[180px] overflow-y-auto border border-black shadow-xl ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`}
                >
                  {locales.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setLocale(lang)
                        setKeukenLangOpen(false)
                      }}
                      className={`flex w-full items-center gap-2 border-b border-white/10 px-4 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-white/10 ${
                        locale === lang ? 'bg-white/10 font-semibold text-white' : 'text-white/90'
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
          <div className={`flex h-full flex-col items-center justify-center ${KITCHEN_MUTED}`}>
            <span className="mb-6 text-8xl"></span>
            <p className="text-2xl font-bold text-white">{tx('allDone')}</p>
            <p className="mt-2 text-lg">{tx('ordersAppearHere')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {orders.map((order) => {
              const schedLine = formatOrderScheduleDetail(order, locale)
              const dineInSeat = adminDineInSeatAuditLine(order, t)
              return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`cursor-pointer overflow-hidden transition-all ${KITCHEN_CARD_SHELL} ${
                  newOrderIds.has(order.id)
                    ? 'shadow-[0_0_0_2px_rgba(90,159,212,0.75),0_8px_24px_rgba(0,0,0,0.45)]'
                    : 'hover:brightness-[1.04]'
                }`}
                onClick={() => {
                  setSelectedOrder(order)
                  setNewOrderIds(prev => {
                    const next = new Set(prev)
                    next.delete(order.id)
                    return next
                  })
                }}
              >
                {/* Orderkop — zelfde donkerblauw + wit als onlinescherm */}
                <div className={`${KITCHEN_CARD_HEAD} flex items-center justify-between px-4 py-2.5 text-white`}>
                  <span className="text-lg font-bold tabular-nums">#{order.order_number}</span>
                  <span className={`max-w-[55%] text-right text-xs font-semibold uppercase leading-tight tracking-wide ${KITCHEN_POS_BTN} px-2 py-1`}>
                    {kitchenHeaderStatus(order.status)}
                  </span>
                </div>

                {isWebshopOrder(order) ? (
                  <div className={`px-3 py-2 ${KITCHEN_SUBSTRIP}`}>
                    <div className="text-sm font-bold text-white">{t('shopDisplay.onlineOrder')}</div>
                    <div className={`mt-1 text-xs leading-snug sm:text-sm ${KITCHEN_MUTED}`}>
                      {t(`shopDisplay.${shopDisplayOrderTypeKey(order.order_type)}`)}
                      {schedLine ? ` · ${schedLine}` : ''}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={KITCHEN_SUBSTRIP}>{orderTypeLabelShort(order)}</div>
                    {dineInSeat && (
                      <div className="border-b border-[#5a9fd4]/30 bg-[#5a9fd4]/10 px-3 py-1.5 text-center text-xs font-bold text-[#b8d4ef] sm:text-sm">
                        {dineInSeat}
                      </div>
                    )}
                    {(order.scheduled_date || order.scheduled_time) && (
                      <div className={`px-3 py-2 text-sm font-medium ${KITCHEN_SUBSTRIP}`}>
                         {order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit' }) : ''}{order.scheduled_time ? ` om ${order.scheduled_time}` : ''}
                      </div>
                    )}
                  </>
                )}

                <div className="p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="truncate font-semibold">{order.customer_name}</span>
                    <span className={`ml-2 shrink-0 text-xs tabular-nums ${KITCHEN_MUTED}`}>{getTimeSince(order.created_at)}</span>
                  </div>

                  <div
                    className={`max-h-[min(20rem,48vh)] space-y-2 overflow-y-auto overscroll-y-contain px-2 py-1 [scrollbar-gutter:stable] ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_RECESS_TRAY_CLASS}`}
                  >
                    {order.items?.map((item: unknown, i: number) => {
                      const label = orderItemDisplayName(item)
                      const optLines = orderItemDisplayOptionLines(item)
                      const qty = Number((item as { quantity?: unknown }).quantity) || 1
                      const noteRaw = (item as { notes?: unknown }).notes
                      const noteStr =
                        noteRaw != null && String(noteRaw).trim() !== '' ? String(noteRaw) : ''
                      return (
                      <div key={i} className="flex items-start gap-3 border-b border-white/10 pb-2 last:border-0">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center text-sm font-bold ${KITCHEN_POS_BTN}`}>
                          {qty}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-snug text-white">{label}</p>
                          {optLines.map((line, j) => (
                            <p key={j} className="mt-0.5 border-l-2 border-white/20 pl-2 text-sm font-medium text-white/85">
                              + {line}
                            </p>
                          ))}
                          {noteStr ? (
                            <p className="mt-0.5 text-sm font-medium text-white/75">Opmerking: {noteStr}</p>
                          ) : null}
                        </div>
                      </div>
                      )
                    })}
                  </div>

                  {order.customer_notes && (
                    <div className={`mt-3 p-2 ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_RECESS_TRAY_CLASS}`}>
                      <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-white/60">Opmerking</p>
                      <p className="text-sm text-white/90">{order.customer_notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 border-t border-black/40 bg-black/20 p-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      printOrder(order)
                    }}
                    className={`flex-1 py-3 ${KITCHEN_POS_BTN}`}
                  >
                    {tx('print')}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleReady(order)
                    }}
                    className={`flex-1 py-3 ${KITCHEN_POS_BTN_ACCENT}`}
                  >
                    {tx('ready')}
                  </button>
                </div>
              </motion.div>
              )
            })}
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className={`max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-black shadow-2xl ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} text-[#f0f0f0]`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`rounded-t-2xl border-b border-black p-6 text-white ${KITCHEN_CARD_HEAD}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">#{selectedOrder.order_number}</h2>
                    <p className="text-sm font-medium text-white/85 mt-1 uppercase tracking-wide">
                      {kitchenHeaderStatus(selectedOrder.status)}
                    </p>
                    <p className="text-sm text-white/70 mt-2">
                      {(() => {
                        const sched = formatOrderScheduleDetail(selectedOrder, locale)
                        if (!isWebshopOrder(selectedOrder)) {
                          return `${orderTypeLabelShort(selectedOrder)} · ${getTimeSince(selectedOrder.created_at)}`
                        }
                        const ch = t(`shopDisplay.${shopDisplayOrderTypeKey(selectedOrder.order_type)}`)
                        return `${t('shopDisplay.onlineOrder')} · ${ch}${sched ? ` · ${sched}` : ''}`
                      })()}
                    </p>
                    {(() => {
                      const seat = adminDineInSeatAuditLine(selectedOrder, t)
                      if (!seat) return null
                      return (
                        <p className="text-sm text-white font-semibold mt-2 bg-white/10 px-2 py-1 rounded-md inline-block">
                          {seat}
                        </p>
                      )
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center text-xl ${KITCHEN_POS_BTN}`}
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
                    <div className={`mb-4 p-4 text-center ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_RECESS_TRAY_CLASS}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{t('shopDisplay.desiredTimeLabel')}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{schedStr}</p>
                    </div>
                  )
                })()}

                <div className={`mb-4 p-4 ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_RECESS_TRAY_CLASS}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className={`text-sm ${KITCHEN_MUTED}`}>{tx('customer')}</p>
                      <p className="text-xl font-semibold text-white">{selectedOrder.customer_name}</p>
                    </div>
                    {selectedOrder.customer_phone && (
                      <div className="text-left sm:text-right">
                        <p className={`text-sm ${KITCHEN_MUTED}`}>{tx('phone')}</p>
                        <p className="text-lg font-semibold tabular-nums text-white">{selectedOrder.customer_phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`mb-4 min-h-0 p-4 ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_RECESS_TRAY_CLASS}`}>
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/70">{tx('toPrepare')}</h3>
                  <div
                    className={`max-h-[min(62vh,32rem)] space-y-4 overflow-y-auto overscroll-y-contain rounded-lg p-4 pr-1 [scrollbar-gutter:stable] ${KASSA_POS_MENU_RECESS_TRAY_CLASS}`}
                  >
                    {selectedOrder.items?.map((item: unknown, i: number) => {
                      const label = orderItemDisplayName(item)
                      const optLines = orderItemDisplayOptionLines(item)
                      const qty = Number((item as { quantity?: unknown }).quantity) || 1
                      const noteRaw = (item as { notes?: unknown }).notes
                      const noteStr =
                        noteRaw != null && String(noteRaw).trim() !== '' ? String(noteRaw) : ''
                      return (
                      <div key={i} className="flex items-start gap-4 border-b border-white/10 pb-4 last:border-0 last:pb-0">
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center text-xl font-bold sm:h-14 sm:w-14 sm:text-2xl ${KITCHEN_POS_BTN}`}>
                          {qty}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xl font-semibold leading-tight text-white sm:text-2xl">
                            {label}
                          </p>
                          {optLines.map((line, j) => (
                            <p key={j} className="mt-1 border-l-2 border-white/20 pl-3 text-base font-medium text-white/85">
                              + {line}
                            </p>
                          ))}
                          {noteStr ? (
                            <p className="mt-2 rounded-lg border border-white/10 bg-black/30 p-2 text-base font-medium text-white/80">
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
                  <div className={`mb-4 p-4 ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_RECESS_TRAY_CLASS}`}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/60">{tx('notes')}</p>
                    <p className="text-lg font-medium text-white">{selectedOrder.customer_notes}</p>
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
