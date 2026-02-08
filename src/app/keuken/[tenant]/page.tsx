'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getTenantSettings, updateOrderStatus } from '@/lib/admin-api'
import { useLanguage } from '@/i18n'
import Link from 'next/link'
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
  order_type: 'pickup' | 'delivery'
  status: string
  total: number
  items: any[]
  customer_notes?: string
  created_at: string
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
  const [audioActivated, setAudioActivated] = useState(() => isAudioActivatedThisSession())
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
          .eq('status', 'confirmed')
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

      // Only fetch confirmed orders (ready to be made)
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_slug', params.tenant)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: true }) // Oldest first (FIFO)
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

  async function handleReady(order: Order) {
    await updateOrderStatus(order.id, 'ready')
    
    // WhatsApp notifications only at confirmed/rejected (not at ready)
    
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
            <div class="order-type">${order.order_type === 'delivery' ? '🚗 BEZORGEN' : '🛍️ AFHALEN'}</div>
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

  const getTimeColor = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 5) return 'text-green-400'
    if (mins < 10) return 'text-yellow-400'
    if (mins < 15) return 'text-orange-400'
    return 'text-red-400'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  // VERPLICHT ACTIVATIESCHERM VOOR iPAD/iOS - alleen EERSTE KEER per sessie
  if (!audioActivated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <motion.button
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            // KRITIEK: Activeer audio TIJDENS user gesture (VEREIST voor iOS/Safari)
            activateAudioForIOS()
            prewarmAudio()
            markAudioActivated()
            setAudioActivated(true)
            setSoundEnabled(true)
            playOrderNotification()
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-3xl p-12 text-center shadow-2xl max-w-lg"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-8xl mb-6"
          >
            👨‍🍳
          </motion.div>
          <h1 className="text-3xl font-bold mb-4">Tik om te starten</h1>
          <p className="text-xl opacity-80 mb-6">
            Geluidsmeldingen worden geactiveerd
          </p>
          <div className="bg-white/20 rounded-xl px-6 py-3 inline-block">
            <span className="text-lg font-bold">▶️ START KEUKEN</span>
          </div>
        </motion.button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <header className="bg-blue-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
              👨‍🍳
            </div>
            <div>
              <h1 className="text-xl font-bold">{tx('title')}</h1>
              <p className="text-blue-200 text-sm">{business?.business_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
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

            {/* Back to admin */}
            <Link
              href={`/shop/${params.tenant}/admin`}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm"
            >
              ✕
            </Link>
          </div>
        </div>
      </header>

      {/* Orders Grid */}
      <div className="p-4 h-[calc(100vh-64px)] overflow-y-auto">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <span className="text-8xl mb-6">✅</span>
            <p className="text-2xl font-bold">{tx('allDone')}</p>
            <p className="text-lg mt-2">{tx('ordersAppearHere')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`bg-gray-800 rounded-2xl overflow-hidden cursor-pointer transition-all ${
                  newOrderIds.has(order.id)
                    ? 'ring-4 ring-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.6)]'
                    : 'hover:ring-2 hover:ring-gray-600'
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
                {/* Order Header */}
                <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
                  <span className="font-bold text-2xl">#{order.order_number}</span>
                  <span className={`font-mono font-bold ${getTimeColor(order.created_at)}`}>
                    {getTimeSince(order.created_at)}
                  </span>
                </div>

                {/* Order Type Badge */}
                <div className={`px-4 py-2 text-center font-bold text-lg ${
                  order.order_type === 'delivery' 
                    ? 'bg-purple-600' 
                    : 'bg-green-600'
                }`}>
                  {order.order_type === 'delivery' ? `🚗 ${tx('delivery')}` : `🛍️ ${tx('pickup')}`}
                </div>

                {/* Items List */}
                <div className="p-4">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {order.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 pb-2 border-b border-gray-700 last:border-0">
                        <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg shrink-0">
                          {item.quantity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg truncate">{item.product_name || item.name}</p>
                          {item.options?.map((opt: any, j: number) => (
                            <p key={j} className="text-sm text-gray-400">+ {opt.name}</p>
                          ))}
                          {item.notes && (
                            <p className="text-sm text-yellow-400 italic">📝 {item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  {order.customer_notes && (
                    <div className="mt-3 p-2 bg-yellow-500/20 rounded-lg">
                      <p className="text-sm text-yellow-400">📝 {order.customer_notes}</p>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="p-3 bg-gray-700/50 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      printOrder(order)
                    }}
                    className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl font-bold text-lg"
                  >
                    🖨️ {tx('print')}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleReady(order)
                    }}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 rounded-xl font-bold text-lg"
                  >
                    ✓ {tx('ready')}
                  </button>
                </div>
              </motion.div>
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
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-blue-600 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-5xl font-bold">#{selectedOrder.order_number}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-3 py-1 rounded-lg font-bold ${
                        selectedOrder.order_type === 'delivery' ? 'bg-purple-500' : 'bg-green-500'
                      }`}>
                        {selectedOrder.order_type === 'delivery' ? `🚗 ${tx('delivery')}` : `🛍️ ${tx('pickup')}`}
                      </span>
                      <span className={`font-mono font-bold text-lg ${getTimeColor(selectedOrder.created_at)}`}>
                        ⏱️ {getTimeSince(selectedOrder.created_at)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-3xl hover:bg-white/30"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Customer Info */}
                <div className="bg-gray-700/50 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">{tx('customer')}</p>
                      <p className="font-bold text-2xl">{selectedOrder.customer_name}</p>
                    </div>
                    {selectedOrder.customer_phone && (
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">{tx('phone')}</p>
                        <p className="font-bold text-xl">{selectedOrder.customer_phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items - BIG for kitchen */}
                <div className="bg-gray-700/50 rounded-2xl p-4 mb-4">
                  <h3 className="font-bold text-xl mb-4 text-blue-400">{tx('toPrepare')}</h3>
                  <div className="space-y-4">
                    {selectedOrder.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-start gap-4 pb-4 border-b border-gray-600 last:border-0">
                        <span className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-3xl shrink-0">
                          {item.quantity}
                        </span>
                        <div className="flex-1">
                          <p className="font-bold text-2xl">{item.product_name || item.name}</p>
                          {item.options?.map((opt: any, j: number) => (
                            <p key={j} className="text-lg text-gray-400 mt-1">+ {opt.name}</p>
                          ))}
                          {item.notes && (
                            <p className="text-lg text-yellow-400 mt-2 p-2 bg-yellow-500/20 rounded-lg">
                              📝 {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.customer_notes && (
                  <div className="bg-yellow-500/20 rounded-2xl p-4 mb-4">
                    <h3 className="font-bold text-lg mb-2 text-yellow-400">📝 {tx('notes')}</h3>
                    <p className="text-xl">{selectedOrder.customer_notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => printOrder(selectedOrder)}
                    className="py-6 bg-gray-600 hover:bg-gray-500 rounded-2xl font-bold text-2xl"
                  >
                    🖨️ {tx('printReceipt')}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleReady(selectedOrder)}
                    className="py-6 bg-green-500 hover:bg-green-600 rounded-2xl font-bold text-2xl"
                  >
                    ✓ {tx('markReady')}
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
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPrinterSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-3xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-2 text-center">🖨️ Printer Instellingen</h2>
              <p className="text-gray-400 text-center mb-6">Verbind met de Vysion Print iPad app</p>

              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">iPad IP Adres</label>
                <input
                  type="text"
                  defaultValue={printerIP || ''}
                  placeholder="bijv. 192.168.1.100"
                  className="w-full px-4 py-3 bg-gray-700 rounded-xl border-none text-white placeholder-gray-500"
                  id="keuken-printer-ip-input"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Je vindt dit IP adres in de Vysion Print app op de iPad
                </p>
              </div>

              {/* Status indicator */}
              <div className={`mb-6 p-4 rounded-xl ${
                printerStatus === 'online' 
                  ? 'bg-green-500/20 text-green-400' 
                  : printerStatus === 'offline'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-gray-700 text-gray-400'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {printerStatus === 'online' ? '✅' : printerStatus === 'offline' ? '❌' : '❓'}
                  </span>
                  <div>
                    <p className="font-bold">
                      {printerStatus === 'online' 
                        ? 'Printer Verbonden' 
                        : printerStatus === 'offline'
                        ? 'Printer Niet Bereikbaar'
                        : 'Nog Niet Geconfigureerd'}
                    </p>
                    {printerIP && (
                      <p className="text-sm opacity-80">{printerIP}:3001</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowPrinterSettings(false)}
                  className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-2xl font-bold text-lg"
                >
                  Annuleren
                </button>
                <button
                  onClick={() => {
                    const input = document.getElementById('keuken-printer-ip-input') as HTMLInputElement
                    if (input?.value) {
                      savePrinterIP(input.value.trim())
                    }
                  }}
                  className="flex-1 py-4 bg-blue-500 hover:bg-blue-600 rounded-2xl font-bold text-lg"
                >
                  Opslaan
                </button>
              </div>

              {printerIP && (
                <button
                  onClick={() => checkPrinterStatus(printerIP)}
                  className="w-full mt-4 py-3 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-xl font-bold"
                >
                  🔄 Verbinding Testen
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
