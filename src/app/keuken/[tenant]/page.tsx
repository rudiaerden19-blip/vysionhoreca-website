'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getTenantSettings, updateOrderStatus, isWebshopOrder } from '@/lib/admin-api'
import { formatOrderScheduleDetail } from '@/lib/format-order-schedule'
import { useLanguage } from '@/i18n'
import Link from 'next/link'
import { useTenantModuleFlags } from '@/lib/use-tenant-modules'
import { getAdminKassaEntryHref } from '@/lib/tenant-modules'
import { 
  activateAudioForIOS,
  prewarmAudio,
  playOrderNotification,
  isAudioActivatedThisSession,
  markAudioActivated
} from '@/lib/sounds'

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone?: string
  order_type: string
  status: string
  total: number
  items: any[]
  customer_notes?: string
  created_at: string
  scheduled_date?: string
  scheduled_time?: string
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
  const [printerIP, setPrinterIP] = useState<string | null>(null)
  const [showPrinterSettings, setShowPrinterSettings] = useState(false)
  const [printerStatus, setPrinterStatus] = useState<'unknown' | 'online' | 'offline'>('unknown')
  const alertIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const knownOrderIdsRef = useRef<Set<string>>(new Set())

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
    
    // Load printer IP
    const savedIP = localStorage.getItem(`printer_ip_${params.tenant}`)
    if (savedIP) {
      setPrinterIP(savedIP)
      checkPrinterStatus(savedIP)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant, audioActivated])

  // Check printer status via server proxy
  async function checkPrinterStatus(ip: string) {
    try {
      const response = await fetch(`/api/print-proxy?printerIP=${encodeURIComponent(ip)}`)
      const data = await response.json()
      setPrinterStatus(data.status === 'online' ? 'online' : 'offline')
    } catch {
      setPrinterStatus('offline')
    }
  }

  function savePrinterIP(ip: string) {
    localStorage.setItem(`printer_ip_${params.tenant}`, ip)
    setPrinterIP(ip)
    checkPrinterStatus(ip)
    setShowPrinterSettings(false)
  }

  // Print to thermal printer via server proxy
  async function printToThermal(order: Order) {
    if (!printerIP) return false
    console.log('🖨️ Sending kitchen receipt to printer...')
    try {
      const response = await fetch('/api/print-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerIP,
          order: {
            order_number: order.order_number,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            order_type: order.order_type,
            items: order.items,
            total: order.total,
            notes: order.customer_notes,
            created_at: order.created_at,
          },
          businessInfo: {
            name: business?.business_name,
            address: business?.address,
            phone: business?.phone,
            btw_number: business?.btw_number,
          },
          printType: 'kitchen',
        }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        console.log('✅ Kitchen receipt printed')
        return true
      } else {
        console.error('❌ Print failed:', data.error)
        return false
      }
    } catch (error) {
      console.error('❌ Print error:', error)
      return false
    }
  }


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
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('tenant_slug', params.tenant)
          .in('status', ['confirmed', 'preparing'])
          .order('created_at', { ascending: true })
          .limit(50)

        if (data) {
          const parsed = data.map(order => ({
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items || []
          }))
          
          // Find TRULY new orders (not in known set)
          const trulyNewOrders = parsed.filter(o => !knownOrderIdsRef.current.has(o.id))
          
          // Add ALL current order IDs to known set
          parsed.forEach(o => knownOrderIdsRef.current.add(o.id))
          
          // Alert for truly new orders
          if (trulyNewOrders.length > 0) {
            console.log(`👨‍🍳 ${trulyNewOrders.length} nieuwe keuken bestelling(en)!`)
            trulyNewOrders.forEach(order => {
              setNewOrderIds(prev => new Set([...prev, order.id]))
            })
            // ALTIJD geluid spelen bij nieuwe bestelling
            playOrderNotification()
          }
          
          setOrders(parsed)
        }
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

      // Alle bevestigde orders — exact zoals donor frituur nolim
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_slug', params.tenant)
        .in('status', ['confirmed', 'preparing'])
        .order('created_at', { ascending: true })
        .limit(50)

      if (data) {
        const parsed = data.map(order => ({
          ...order,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items || []
        }))
        setOrders(parsed)
        
        // CRITICAL: Initialize known IDs with ALL current orders
        parsed.forEach(o => knownOrderIdsRef.current.add(o.id))
        console.log(`👨‍🍳 Initial load: ${parsed.length} keuken orders`)
      }
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
    await Promise.all(orders.map(o => updateOrderStatus(o.id, 'ready')))
    setOrders([])
  }

  async function handleReady(order: Order) {
    await updateOrderStatus(order.id, 'ready')
    
    // Send WhatsApp notification that order is ready
    console.log('🔔 handleReady called, customer_phone:', order.customer_phone)
    if (order.customer_phone) {
      try {
        const response = await fetch('/api/whatsapp/send-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantSlug: params.tenant,
            customerPhone: order.customer_phone,
            orderNumber: order.order_number,
            status: 'ready'
          })
        })
        const data = await response.json()
        if (response.ok) {
          console.log('✅ WhatsApp ready notification sent successfully:', data)
        } else {
          console.error('❌ WhatsApp ready notification failed:', response.status, data)
        }
      } catch (err) {
        console.error('❌ Failed to send WhatsApp ready notification:', err)
      }
    } else {
      console.log('⚠️ No customer_phone on order, skipping WhatsApp notification')
    }
    
    setNewOrderIds(prev => {
      const next = new Set(prev)
      next.delete(order.id)
      return next
    })
    // Remove from known IDs so it doesn't show up again
    knownOrderIdsRef.current.delete(order.id)
    // Remove from orders list immediately
    setOrders(prev => prev.filter(o => o.id !== order.id))
    setSelectedOrder(null)
  }

  // Main print function - tries thermal first, falls back to browser
  async function printOrder(order: Order) {
    // If printer is configured and online, use thermal printer
    if (printerIP && printerStatus === 'online') {
      const success = await printToThermal(order)
      if (success) {
        console.log('✅ Keukenbon geprint via thermal printer')
        return
      }
    }
    
    // Fallback to browser print
    browserPrintOrder(order)
  }

  function browserPrintOrder(order: Order) {
    const printWindow = window.open('', '_blank', 'width=300,height=600')
    if (!printWindow) return

    const itemsHtml = order.items?.map((item: any) => `
      <tr>
        <td style="font-size: 18px; font-weight: bold; padding: 4px 0;">${item.quantity}x</td>
        <td style="font-size: 18px; padding: 4px 0;">${item.product_name || item.name}</td>
      </tr>
      ${item.options?.map((opt: any) => `
        <tr><td></td><td style="font-size: 14px; color: #666; padding-left: 10px;">+ ${opt.name}</td></tr>
      `).join('') || ''}
      ${item.notes ? `<tr><td></td><td style="font-size: 14px; color: #666; font-style: italic; padding-left: 10px;">📝 ${item.notes}</td></tr>` : ''}
    `).join('') || ''

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
            <div class="order-type">${order.order_type === 'delivery' || order.order_type === 'DELIVERY' ? '🚗 BEZORGEN' : order.order_type === 'DINE_IN' ? '🍽️ TER PLAATSE' : order.order_type === 'TAKEAWAY' ? '📦 AFHALEN' : '🛍️ AFHALEN'}</div>
            ${(order.scheduled_date || order.scheduled_time) ? `
            <div style="margin: 6px 0; padding: 6px; background: #000; color: #fff; font-size: 16px; font-weight: bold; border-radius: 4px;">
              📅 LEVEREN OP: ${order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}${order.scheduled_time ? ' om ' + order.scheduled_time : ''}
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
              <strong>⚠️ OPMERKING:</strong><br>
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
    if (s === 'preparing') return t('shopDisplay.statusPreparing')
    return t('shopDisplay.statusKitchen')
  }

  const orderTypeLabelShort = (order: Order) => {
    if (order.order_type === 'delivery' || order.order_type === 'DELIVERY') return `🚗 ${tx('delivery')}`
    if (order.order_type === 'DINE_IN') return '🍽️ Ter plaatse'
    if (order.order_type === 'TAKEAWAY') return '📦 Afhalen'
    return `🛍️ ${tx('pickup')}`
  }

  if (loading) {
    return (
      <div
        className="min-h-[100dvh] bg-[#e3e3e3] flex items-center justify-center"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }


  return (
    <div
      className="flex min-h-0 h-[100dvh] max-h-[100dvh] max-w-[100vw] flex-col overflow-hidden bg-[#e3e3e3] text-gray-900"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Header */}
      <header className="shrink-0 bg-blue-600 px-4 py-3 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href={adminBase}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-bold text-white shadow-md transition-colors hover:bg-orange-400"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('adminLayout.back')}
            </Link>
            {kassaEntryHref && (
              <Link
                href={kassaEntryHref}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-bold text-white shadow-md transition-colors hover:bg-orange-400"
              >
                <span className="text-base leading-none" aria-hidden>
                  🧾
                </span>
                {t('adminLayout.pos')}
              </Link>
            )}
            <div className="h-10 w-10 shrink-0 bg-white/20 rounded-xl flex items-center justify-center text-xl">
              👨‍🍳
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold sm:text-xl">{tx('title')}</h1>
              <p className="truncate text-blue-200 text-xs sm:text-sm">{business?.business_name}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            {/* Sound - ALTIJD AAN */}
            <span 
              onClick={enableSound}
              className="px-3 py-2 bg-green-500/30 text-green-300 rounded-xl flex items-center gap-2 text-sm cursor-pointer"
            >
              🔊 {tx('soundEnabled')}
            </span>

            {/* Order count */}
            <div className="px-4 py-2 bg-white/20 rounded-xl font-bold">
              📋 {orders.length} {tx('toMake')}
            </div>

            {/* Alles klaar */}
            <button
              onClick={handleAllReady}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-xl font-bold text-white transition-colors"
            >
              ✓ Alles klaar
            </button>

            {/* New order indicator */}
            {newOrderIds.size > 0 && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="px-4 py-2 bg-red-500 rounded-xl font-bold"
              >
                🚨 {newOrderIds.size} {tx('newOrder')}
              </motion.div>
            )}

            {/* Clock */}
            <div className="text-2xl font-mono font-bold">
              {currentTime.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
            </div>

            {/* Printer Status */}
            <button
              onClick={() => setShowPrinterSettings(true)}
              className={`px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${
                printerStatus === 'online' 
                  ? 'bg-green-500/20 text-green-300' 
                  : printerStatus === 'offline'
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-white/20 text-white'
              }`}
            >
              🖨️ {printerStatus === 'online' ? 'Online' : printerStatus === 'offline' ? 'Offline' : 'Printer'}
            </button>

          </div>
        </div>
      </header>

      {/* Orders Grid — flex-1 + min-h-0: correcte scroll op iPad Safari / PWA */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <span className="text-8xl mb-6">✅</span>
            <p className="text-2xl font-bold">{tx('allDone')}</p>
            <p className="text-lg mt-2">{tx('ordersAppearHere')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {orders.map((order) => {
              const schedLine = formatOrderScheduleDetail(order, locale)
              return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`rounded-xl overflow-hidden cursor-pointer transition-all border border-gray-200 bg-white shadow-sm text-gray-900 ${
                  newOrderIds.has(order.id)
                    ? 'ring-2 ring-[#0f2744] shadow-md'
                    : 'hover:border-gray-300'
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
                <div className="bg-[#0f2744] text-white px-4 py-2.5 flex items-center justify-between border-b border-black/20">
                  <span className="font-bold text-lg tabular-nums">#{order.order_number}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-white bg-white/15 px-2 py-1 rounded-md border border-white/25 max-w-[55%] text-right leading-tight">
                    {kitchenHeaderStatus(order.status)}
                  </span>
                </div>

                {isWebshopOrder(order) ? (
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-center">
                    <div className="text-sm font-bold text-gray-900">{t('shopDisplay.onlineOrder')}</div>
                    <div className="text-xs sm:text-sm text-gray-700 mt-1 leading-snug">
                      {(order.order_type === 'delivery' || order.order_type === 'DELIVERY')
                        ? t('shopDisplay.delivery')
                        : t('shopDisplay.pickup')}
                      {schedLine ? ` · ${schedLine}` : ''}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="px-3 py-2 text-sm font-medium text-gray-800 bg-gray-50 border-b border-gray-100 text-center">
                      {orderTypeLabelShort(order)}
                    </div>
                    {(order.scheduled_date || order.scheduled_time) && (
                      <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 text-gray-800 text-sm font-medium text-center">
                        📅 {order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit' }) : ''}{order.scheduled_time ? ` om ${order.scheduled_time}` : ''}
                      </div>
                    )}
                  </>
                )}

                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold truncate">{order.customer_name}</span>
                    <span className="text-gray-500 text-xs shrink-0 ml-2 tabular-nums">{getTimeSince(order.created_at)}</span>
                  </div>

                  <div className="space-y-2 max-h-[min(20rem,48vh)] overflow-y-auto overscroll-y-contain rounded-lg border border-gray-200 bg-white px-2 py-1 [scrollbar-gutter:stable]">
                    {order.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 pb-2 border-b border-gray-100 last:border-0">
                        <span className="w-9 h-9 bg-[#0f2744] text-white rounded-md flex items-center justify-center font-bold text-sm shrink-0">
                          {item.quantity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm leading-snug">{item.product_name || item.name}</p>
                          {item.options?.map((opt: any, j: number) => (
                            <p key={j} className="text-sm text-gray-800 font-medium mt-0.5 pl-2 border-l-2 border-gray-200">
                              + {opt.name}
                            </p>
                          ))}
                          {item.notes && (
                            <p className="text-sm text-gray-700 mt-0.5 font-medium">Opmerking: {item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.customer_notes && (
                    <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Opmerking</p>
                      <p className="text-sm text-gray-800">{order.customer_notes}</p>
                    </div>
                  )}
                </div>

                <div className="p-3 border-t border-gray-200 bg-gray-50 flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      printOrder(order)
                    }}
                    className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 bg-white hover:bg-gray-50 text-gray-800"
                  >
                    {tx('print')}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleReady(order)
                    }}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold"
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 shadow-2xl text-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Kop — donkerblauw + wit (zelfde als onlinescherm) */}
              <div className="bg-[#0f2744] text-white p-6 rounded-t-2xl border-b border-black/20">
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
                        const ch =
                          selectedOrder.order_type === 'delivery' || selectedOrder.order_type === 'DELIVERY'
                            ? t('shopDisplay.delivery')
                            : t('shopDisplay.pickup')
                        return `${t('shopDisplay.onlineOrder')} · ${ch}${sched ? ` · ${sched}` : ''}`
                      })()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="w-11 h-11 shrink-0 rounded-full bg-white/15 flex items-center justify-center text-xl text-white hover:bg-white/25"
                    aria-label={t('shopDisplay.cancel')}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6">
                {(() => {
                  const schedStr = formatOrderScheduleDetail(selectedOrder, locale)
                  if (!schedStr) return null
                  return (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 text-center">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('shopDisplay.desiredTimeLabel')}</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{schedStr}</p>
                    </div>
                  )
                })()}

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-gray-500 text-sm">{tx('customer')}</p>
                      <p className="font-semibold text-xl">{selectedOrder.customer_name}</p>
                    </div>
                    {selectedOrder.customer_phone && (
                      <div className="text-left sm:text-right">
                        <p className="text-gray-500 text-sm">{tx('phone')}</p>
                        <p className="font-semibold text-lg tabular-nums">{selectedOrder.customer_phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 min-h-0">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-600 mb-4">{tx('toPrepare')}</h3>
                  <div className="max-h-[min(62vh,32rem)] overflow-y-auto overscroll-y-contain space-y-4 pr-1 rounded-lg border border-gray-200 bg-white p-4 [scrollbar-gutter:stable]">
                    {selectedOrder.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                        <span className="w-12 h-12 sm:w-14 sm:h-14 bg-[#0f2744] text-white rounded-lg flex items-center justify-center font-bold text-xl sm:text-2xl shrink-0">
                          {item.quantity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xl sm:text-2xl leading-tight text-gray-900">
                            {item.product_name || item.name}
                          </p>
                          {item.options?.map((opt: any, j: number) => (
                            <p key={j} className="text-base text-gray-800 font-medium mt-1 pl-3 border-l-2 border-gray-200">
                              + {opt.name}
                            </p>
                          ))}
                          {item.notes && (
                            <p className="text-base text-gray-800 mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg font-medium">
                              Opmerking: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedOrder.customer_notes && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{tx('notes')}</p>
                    <p className="text-lg font-medium text-gray-900">{selectedOrder.customer_notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="button"
                    onClick={() => printOrder(selectedOrder)}
                    className="py-5 rounded-xl font-semibold text-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-900"
                  >
                    {tx('printReceipt')}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="button"
                    onClick={() => handleReady(selectedOrder)}
                    className="py-5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-lg"
                  >
                    {tx('markReady')}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Printer Settings Modal */}
      <AnimatePresence>
        {showPrinterSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPrinterSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 border border-gray-200 shadow-2xl text-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-1 text-center">Printer</h2>
              <p className="text-gray-600 text-sm text-center mb-6">Verbind met de Vysion Print iPad app</p>

              <div className="mb-6">
                <label className="block text-sm text-gray-600 mb-2 font-medium">iPad IP-adres</label>
                <input
                  type="text"
                  defaultValue={printerIP || ''}
                  placeholder="bijv. 192.168.1.100"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400"
                  id="keuken-printer-ip-input"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Je vindt dit IP-adres in de Vysion Print app op de iPad
                </p>
              </div>

              <div className={`mb-6 p-4 rounded-lg border ${
                printerStatus === 'online'
                  ? 'bg-gray-50 border-gray-200 text-gray-800'
                  : printerStatus === 'offline'
                  ? 'bg-gray-50 border-gray-200 text-gray-800'
                  : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold">
                      {printerStatus === 'online'
                        ? 'Printer verbonden'
                        : printerStatus === 'offline'
                        ? 'Printer niet bereikbaar'
                        : 'Nog niet geconfigureerd'}
                    </p>
                    {printerIP && (
                      <p className="text-sm text-gray-600 mt-0.5 tabular-nums">{printerIP}:3001</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPrinterSettings(false)}
                  className="flex-1 py-3.5 rounded-lg font-semibold border border-gray-300 bg-white hover:bg-gray-50 text-gray-800"
                >
                  Annuleren
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('keuken-printer-ip-input') as HTMLInputElement
                    if (input?.value) {
                      savePrinterIP(input.value.trim())
                    }
                  }}
                  className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold"
                >
                  Opslaan
                </button>
              </div>

              {printerIP && (
                <button
                  type="button"
                  onClick={() => checkPrinterStatus(printerIP)}
                  className="w-full mt-3 py-3 rounded-lg font-semibold border border-gray-300 bg-white hover:bg-gray-50 text-gray-800"
                >
                  Verbinding testen
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
