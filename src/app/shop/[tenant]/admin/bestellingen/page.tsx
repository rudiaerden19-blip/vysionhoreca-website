'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getOrders, updateOrderStatus, confirmOrder, rejectOrder, Order, getTenantSettings, TenantSettings } from '@/lib/admin-api'
import { supabase } from '@/lib/supabase'

// Parse items from JSONB
interface OrderItemJson {
  name?: string
  product_name?: string
  quantity: number
  price?: number
  unit_price?: number
  total_price?: number
}

const statusConfig: Record<string, { bg: string; text: string; label: string; next?: string; prev?: string }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-700', label: '🆕 Nieuw', next: 'confirmed' },
  NEW: { bg: 'bg-blue-100', text: 'text-blue-700', label: '🆕 Nieuw', next: 'confirmed' },
  confirmed: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '✓ Bevestigd', next: 'preparing', prev: 'new' },
  CONFIRMED: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '✓ Bevestigd', next: 'preparing', prev: 'new' },
  preparing: { bg: 'bg-orange-100', text: 'text-orange-700', label: '👨‍🍳 In bereiding', next: 'ready', prev: 'confirmed' },
  PREPARING: { bg: 'bg-orange-100', text: 'text-orange-700', label: '👨‍🍳 In bereiding', next: 'ready', prev: 'confirmed' },
  ready: { bg: 'bg-green-100', text: 'text-green-700', label: '✅ Klaar', next: 'completed', prev: 'preparing' },
  READY: { bg: 'bg-green-100', text: 'text-green-700', label: '✅ Klaar', next: 'completed', prev: 'preparing' },
  delivered: { bg: 'bg-purple-100', text: 'text-purple-700', label: '🚗 Onderweg', next: 'completed' },
  DELIVERED: { bg: 'bg-purple-100', text: 'text-purple-700', label: '🚗 Onderweg', next: 'completed' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: '✔️ Afgerond' },
  COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-700', label: '✔️ Afgerond' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Geannuleerd' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Geannuleerd' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '🚫 Geweigerd' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: '🚫 Geweigerd' },
}

const paymentStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '⏳ Wacht op betaling' },
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '⏳ Wacht op betaling' },
  paid: { bg: 'bg-green-100', text: 'text-green-700', label: '✅ BETAALD' },
  PAID: { bg: 'bg-green-100', text: 'text-green-700', label: '✅ BETAALD' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Betaling mislukt' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Betaling mislukt' },
}

const paymentMethodLabels: Record<string, string> = {
  cash: '💵 Cash',
  CASH: '💵 Cash',
  card: '💳 Kaart',
  CARD: '💳 Kaart',
  online: '🌐 Online',
  ONLINE: '🌐 Online',
  ideal: '🏦 iDEAL',
  IDEAL: '🏦 iDEAL',
  bancontact: '💳 Bancontact',
  BANCONTACT: '💳 Bancontact',
}

export default function BestellingenPage({ params }: { params: { tenant: string } }) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [kitchenMode, setKitchenMode] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null)
  const [audioReady, setAudioReady] = useState(false)
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionNotes, setRejectionNotes] = useState('')
  
  const rejectionReasons = [
    { value: 'too_busy', label: '🔥 Te druk op dit moment' },
    { value: 'closed', label: '🚪 We zijn gesloten' },
    { value: 'sold_out', label: '❌ Product(en) uitverkocht' },
    { value: 'delivery_unavailable', label: '🚗 Levering niet beschikbaar' },
    { value: 'technical', label: '⚙️ Technisch probleem' },
    { value: 'other', label: '📝 Andere reden' },
  ]
  
  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Track which orders are "new" and need attention
  const hasNewOrders = orders.some(o => o.status === 'new' || o.status === 'NEW')
  
  // Load sound preference from localStorage on mount
  useEffect(() => {
    const savedSoundEnabled = localStorage.getItem(`sound_enabled_${params.tenant}`)
    if (savedSoundEnabled === 'true') {
      setSoundEnabled(true)
    }
  }, [params.tenant])

  // Helper: parse items from JSONB or array
  const parseItems = (order: Order): OrderItemJson[] => {
    if (!order.items) return []
    // Could be already parsed or could be a JSON string
    if (typeof order.items === 'string') {
      try {
        return JSON.parse(order.items)
      } catch {
        return []
      }
    }
    return order.items as OrderItemJson[]
  }

  // Initialize Web Audio API (iPad-compatible)
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    // Resume if suspended (iOS requirement)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
  }, [])

  // Play beep sound using Web Audio API
  const playBeep = useCallback(() => {
    if (!audioContextRef.current) return
    
    try {
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      // Create a pleasant notification sound (3 beeps)
      oscillator.frequency.value = 880 // A5 note
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.5)
      
      // Second beep
      setTimeout(() => {
        if (!audioContextRef.current) return
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.frequency.value = 1100
        osc2.type = 'sine'
        gain2.gain.setValueAtTime(0.3, ctx.currentTime)
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
        osc2.start(ctx.currentTime)
        osc2.stop(ctx.currentTime + 0.5)
      }, 150)
      
      // Third beep (higher)
      setTimeout(() => {
        if (!audioContextRef.current) return
        const osc3 = ctx.createOscillator()
        const gain3 = ctx.createGain()
        osc3.connect(gain3)
        gain3.connect(ctx.destination)
        osc3.frequency.value = 1320
        osc3.type = 'sine'
        gain3.gain.setValueAtTime(0.3, ctx.currentTime)
        gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
        osc3.start(ctx.currentTime)
        osc3.stop(ctx.currentTime + 0.5)
      }, 300)
    } catch (e) {
      console.log('Audio play failed:', e)
    }
  }, [])
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current)
      }
    }
  }, [])

  // Play repeating sound when there are new orders
  useEffect(() => {
    if (hasNewOrders && soundEnabled) {
      // Play immediately and repeat every 3 seconds
      playBeep()
      audioIntervalRef.current = setInterval(playBeep, 3000)
      
    } else {
      // Stop sound
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current)
        audioIntervalRef.current = null
      }
    }
    
    return () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current)
      }
    }
  }, [hasNewOrders, soundEnabled, playBeep])

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // We'll ask for permission when user enables notifications
    }
  }, [])

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotificationsEnabled(true)
      }
    }
  }

  const showNotification = useCallback((order: Order) => {
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('🍟 Nieuwe bestelling!', {
        body: `${order.customer_name} - €${order.total?.toFixed(2)}`,
        icon: '/icon-192.png',
        tag: order.id,
        requireInteraction: true,
      })
    }
  }, [notificationsEnabled])

  // Load orders and tenant settings
  const loadOrders = useCallback(async () => {
    const [ordersData, settingsData] = await Promise.all([
      getOrders(params.tenant),
      getTenantSettings(params.tenant)
    ])
    setOrders(ordersData)
    setTenantSettings(settingsData)
    setLoading(false)
  }, [params.tenant])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Real-time subscription for new orders
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `tenant_slug=eq.${params.tenant}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order
            setOrders(prev => [newOrder, ...prev])
            showNotification(newOrder)
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o))
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id
            if (deletedId) {
              setOrders(prev => prev.filter(o => o.id !== deletedId))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.tenant, showNotification])

  // Enable sound on first user interaction (iOS requirement)
  const enableSound = () => {
    initAudio()
    playBeep()
    setSoundEnabled(true)
    setAudioReady(true)
    localStorage.setItem(`sound_enabled_${params.tenant}`, 'true')
  }
  
  // Disable sound
  const disableSound = () => {
    setSoundEnabled(false)
    localStorage.setItem(`sound_enabled_${params.tenant}`, 'false')
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current)
      audioIntervalRef.current = null
    }
  }
  
  // Auto-init audio if previously enabled (needs user gesture first time only)
  useEffect(() => {
    if (soundEnabled && !audioReady) {
      // User needs to click once to activate audio after page refresh
      // This is a browser security requirement
    }
  }, [soundEnabled, audioReady])

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    const success = await updateOrderStatus(orderId, newStatus)
    if (success) {
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ))
    }
    setUpdatingId(null)
  }
  
  // Handle confirm order (goedkeuren)
  const handleConfirmOrder = async (order: Order) => {
    if (!order.id) return
    setUpdatingId(order.id)
    const success = await confirmOrder(order.id)
    if (success) {
      setOrders(prev => prev.map(o => 
        o.id === order.id ? { ...o, status: 'confirmed', confirmed_at: new Date().toISOString() } : o
      ))
      // TODO: Send confirmation email to customer
    }
    setUpdatingId(null)
  }
  
  // Handle reject order (weigeren)
  const handleRejectOrder = async () => {
    if (!rejectingOrder?.id || !rejectionReason) return
    setUpdatingId(rejectingOrder.id)
    const success = await rejectOrder(rejectingOrder.id, rejectionReason, rejectionNotes)
    if (success) {
      setOrders(prev => prev.map(o => 
        o.id === rejectingOrder.id ? { 
          ...o, 
          status: 'rejected', 
          rejection_reason: rejectionReason,
          rejection_notes: rejectionNotes,
          rejected_at: new Date().toISOString() 
        } : o
      ))
      // TODO: Send rejection email to customer
      setRejectingOrder(null)
      setRejectionReason('')
      setRejectionNotes('')
    }
    setUpdatingId(null)
  }

  // Print receipt function - Officiële kassabon met alle verplichte gegevens
  const printReceipt = (order: Order) => {
    const items = parseItems(order)
    const printWindow = window.open('', '_blank', 'width=400,height=800')
    if (!printWindow) return

    // BTW berekening - gebruik percentage uit instellingen of standaard 21%
    const btwPercentage = tenantSettings?.btw_percentage || 21
    const totalExclBtw = order.total ? order.total / (1 + btwPercentage / 100) : 0
    const btwBedrag = order.total ? order.total - totalExclBtw : 0

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kassabon #${order.order_number || order.id?.slice(0, 8)}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 15px; max-width: 300px; margin: 0 auto; font-size: 12px; }
          h1 { text-align: center; font-size: 16px; margin-bottom: 5px; }
          .business-name { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 3px; }
          .business-info { text-align: center; font-size: 11px; color: #333; line-height: 1.4; }
          .order-num { text-align: center; font-size: 20px; font-weight: bold; margin: 8px 0; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .divider-double { border-top: 2px solid #000; margin: 8px 0; }
          .item { display: flex; justify-content: space-between; margin: 4px 0; }
          .total { font-size: 14px; font-weight: bold; }
          .center { text-align: center; }
          .small { font-size: 10px; color: #666; }
          .badge { display: inline-block; padding: 2px 6px; background: #f0f0f0; border-radius: 3px; margin: 2px; font-size: 10px; }
          .btw-section { background: #f5f5f5; padding: 8px; margin: 8px 0; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <!-- ZAAKGEGEVENS - VERPLICHT -->
        <div class="business-name">${tenantSettings?.business_name || 'Horecazaak'}</div>
        <div class="business-info">
          ${tenantSettings?.address || ''}<br>
          ${tenantSettings?.postal_code || ''} ${tenantSettings?.city || ''}<br>
          ${tenantSettings?.phone ? `Tel: ${tenantSettings.phone}` : ''}<br>
          ${tenantSettings?.email ? `${tenantSettings.email}` : ''}<br>
          ${tenantSettings?.btw_number ? `<strong>BTW: ${tenantSettings.btw_number}</strong>` : ''}
        </div>
        
        <div class="divider-double"></div>
        
        <!-- KASSABON INFO -->
        <div class="center">
          <strong>KASSABON</strong><br>
          <span class="order-num">#${order.order_number || order.id?.slice(0, 8)}</span>
        </div>
        <div class="center small">
          ${new Date(order.created_at || '').toLocaleString('nl-BE')}<br>
          ${order.order_type === 'pickup' || order.order_type === 'PICKUP' ? 'AFHALEN' : 'LEVERING'}
        </div>
        
        <div class="divider"></div>
        
        <!-- KLANTGEGEVENS -->
        <div style="margin: 6px 0;">
          <strong>Klant:</strong> ${order.customer_name}<br>
          ${order.customer_phone ? `Tel: ${order.customer_phone}<br>` : ''}
          ${order.customer_email ? `${order.customer_email}<br>` : ''}
          ${order.customer_address || order.delivery_address ? `Adres: ${order.customer_address || order.delivery_address}<br>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <!-- PRODUCTEN -->
        <div style="margin: 6px 0;">
          <strong>ARTIKELEN:</strong>
        </div>
        ${items.map(item => `
          <div class="item">
            <span>${item.quantity}x ${item.name || item.product_name}</span>
            <span>€${((item.price || item.unit_price || 0) * item.quantity).toFixed(2)}</span>
          </div>
        `).join('')}
        
        <div class="divider"></div>
        
        <!-- TOTALEN -->
        ${(order.delivery_fee || 0) > 0 ? `
          <div class="item">
            <span>Bezorgkosten</span>
            <span>€${order.delivery_fee?.toFixed(2)}</span>
          </div>
        ` : ''}
        ${(order.discount_amount || 0) > 0 ? `
          <div class="item" style="color: green;">
            <span>Korting ${order.discount_code ? `(${order.discount_code})` : ''}</span>
            <span>-€${order.discount_amount?.toFixed(2)}</span>
          </div>
        ` : ''}
        
        <div class="divider-double"></div>
        
        <!-- BTW SECTIE - VERPLICHT -->
        <div class="btw-section">
          <div class="item">
            <span>Totaal excl. BTW</span>
            <span>€${totalExclBtw.toFixed(2)}</span>
          </div>
          <div class="item">
            <span>BTW ${btwPercentage}%</span>
            <span>€${btwBedrag.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="item total" style="font-size: 16px; margin: 10px 0;">
          <span>TOTAAL INCL. BTW</span>
          <span>€${order.total?.toFixed(2) || '0.00'}</span>
        </div>
        
        <div class="divider"></div>
        
        <!-- BETALING -->
        <div class="center">
          ${order.payment_method ? `Betaalmethode: ${paymentMethodLabels[order.payment_method] || order.payment_method}<br>` : ''}
          ${order.payment_status?.toLowerCase() === 'paid' ? '<strong>✓ BETAALD</strong>' : 'Betaling: In afwachting'}
        </div>
        
        ${order.customer_notes ? `
          <div class="divider"></div>
          <div class="small"><strong>Opmerking:</strong> ${order.customer_notes}</div>
        ` : ''}
        
        <div class="divider-double"></div>
        
        <!-- FOOTER -->
        <div class="center small">
          Bedankt voor uw bestelling!<br>
          ${tenantSettings?.website ? tenantSettings.website : ''}<br>
          <br>
          Dit is uw kassabon.<br>
          Bewaar deze bon als bewijs van aankoop.
        </div>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    
    if (minutes < 1) return 'Zojuist'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}u`
    return date.toLocaleDateString('nl-BE')
  }

  const filteredOrders = orders.filter(o => {
    const status = o.status?.toLowerCase()
    if (filter === 'active') return !['completed', 'cancelled'].includes(status)
    if (filter === 'completed') return status === 'completed'
    return true
  })

  const activeCount = orders.filter(o => !['completed', 'cancelled'].includes(o.status?.toLowerCase())).length
  const newCount = orders.filter(o => o.status === 'new' || o.status === 'NEW').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">Bestellingen laden...</p>
        </div>
      </div>
    )
  }

  // Kitchen Mode - Fullscreen tablet view
  if (kitchenMode) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 overflow-auto">
        {/* Header */}
        <div className="bg-gray-800 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">🍳 Keuken</h1>
            {newCount > 0 && (
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="bg-red-500 text-white text-xl font-bold px-4 py-2 rounded-full"
              >
                {newCount} NIEUW!
              </motion.span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => soundEnabled ? disableSound() : enableSound()}
              className={`p-4 rounded-xl text-2xl ${soundEnabled && audioReady ? 'bg-green-500' : 'bg-gray-600'}`}
            >
              {soundEnabled && audioReady ? '🔔' : '🔕'}
            </button>
            <button
              onClick={() => setKitchenMode(false)}
              className="p-4 bg-gray-600 hover:bg-gray-500 text-white rounded-xl text-xl"
            >
              ✕ Sluiten
            </button>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const items = parseItems(order)
            const status = order.status?.toLowerCase() || 'new'
            const config = statusConfig[status] || statusConfig.new
            
            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-2xl p-6 ${
                  status === 'new' 
                    ? 'bg-blue-500 text-white ring-4 ring-yellow-400' 
                    : status === 'confirmed'
                    ? 'bg-yellow-500 text-gray-900'
                    : status === 'preparing'
                    ? 'bg-orange-500 text-white'
                    : status === 'ready'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-white'
                }`}
              >
                {/* Order Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-3xl font-black">#{order.order_number || order.id?.slice(0, 4)}</p>
                    <p className="text-lg opacity-80">{formatTime(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">€{order.total?.toFixed(2)}</p>
                    <p className="text-lg">
                      {order.order_type === 'pickup' || order.order_type === 'PICKUP' ? '🛍️ Afhalen' : '🚗 Levering'}
                    </p>
                  </div>
                </div>

                {/* Payment Status */}
                {order.payment_status && (
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-3 ${
                    order.payment_status.toLowerCase() === 'paid' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
                  }`}>
                    {paymentStatusConfig[order.payment_status]?.label || order.payment_status}
                  </div>
                )}

                {/* Customer */}
                <div className="mb-4 p-3 bg-black/20 rounded-xl">
                  <p className="text-xl font-bold">{order.customer_name}</p>
                  {order.customer_phone && <p className="opacity-80">{order.customer_phone}</p>}
                  {(order.delivery_address || order.customer_address) && (
                    <p className="opacity-80 text-sm mt-1">📍 {order.delivery_address || order.customer_address}</p>
                  )}
                </div>

                {/* Items */}
                {items.length > 0 && (
                  <div className="mb-4 p-3 bg-black/20 rounded-xl">
                    <p className="font-bold mb-2">Producten:</p>
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.name || item.product_name}</span>
                        <span>€{((item.price || item.unit_price || 0) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {status === 'new' && (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleConfirmOrder(order)}
                        disabled={updatingId === order.id}
                        className="p-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xl font-bold"
                      >
                        ✓ GOEDKEUREN
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setRejectingOrder(order)}
                        disabled={updatingId === order.id}
                        className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xl font-bold"
                      >
                        ✕ WEIGEREN
                      </motion.button>
                    </>
                  )}
                  {status === 'confirmed' && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleUpdateStatus(order.id!, 'preparing')}
                      disabled={updatingId === order.id}
                      className="col-span-2 p-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xl font-bold"
                    >
                      👨‍🍳 START BEREIDING
                    </motion.button>
                  )}
                  {status === 'preparing' && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleUpdateStatus(order.id!, 'ready')}
                      disabled={updatingId === order.id}
                      className="col-span-2 p-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xl font-bold"
                    >
                      ✅ KLAAR
                    </motion.button>
                  )}
                  {status === 'ready' && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleUpdateStatus(order.id!, 'completed')}
                      disabled={updatingId === order.id}
                      className="col-span-2 p-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-xl font-bold"
                    >
                      ✔️ AFGEROND
                    </motion.button>
                  )}
                  {/* Print button */}
                  <button
                    onClick={() => printReceipt(order)}
                    className="col-span-2 p-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    🖨️ BON PRINTEN
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>

        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-white">
            <span className="text-8xl mb-4">✨</span>
            <h2 className="text-3xl font-bold">Geen bestellingen</h2>
            <p className="text-xl text-gray-400 mt-2">Wachten op nieuwe bestellingen...</p>
          </div>
        )}
      </div>
    )
  }

  // Normal Mode
  return (
    <div className="max-w-5xl mx-auto">
      {/* Sound activation prompt for iOS */}
      {/* Show banner if sound not enabled OR if enabled but audio not ready (after refresh) */}
      {(!soundEnabled || (soundEnabled && !audioReady)) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-between"
        >
          <p className="text-yellow-800">
            {soundEnabled && !audioReady 
              ? '🔔 Geluid staat aan - klik om te activeren (browser vereiste)' 
              : '🔔 Klik om geluidsmeldingen te activeren'}
          </p>
          <button
            onClick={enableSound}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium"
          >
            {soundEnabled && !audioReady ? 'Heractiveren' : 'Activeren'}
          </button>
        </motion.div>
      )}

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bestellingen</h1>
          <p className="text-gray-500">
            {activeCount} actief
            {newCount > 0 && <span className="text-red-500 font-bold ml-2">• {newCount} nieuw!</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Notification toggle */}
          <button
            onClick={() => notificationsEnabled ? setNotificationsEnabled(false) : requestNotificationPermission()}
            className={`p-2 rounded-xl transition-colors ${notificationsEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
            title="Browser notificaties"
          >
            {notificationsEnabled ? '🔔' : '🔕'}
          </button>
          
          {/* Sound toggle */}
          <button
            onClick={() => soundEnabled ? disableSound() : enableSound()}
            className={`p-2 rounded-xl transition-colors ${soundEnabled && audioReady ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
            title="Geluid"
          >
            {soundEnabled && audioReady ? '🔊' : '🔇'}
          </button>

          {/* Kitchen mode */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { enableSound(); setKitchenMode(true); }}
            className="px-4 py-2 bg-gray-900 text-white rounded-xl font-medium flex items-center gap-2"
          >
            🍳 Keuken modus
          </motion.button>

          {/* Refresh */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadOrders}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl"
            title="Vernieuwen"
          >
            🔄
          </motion.button>

          {/* Filter */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {(['active', 'completed', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === f ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                {f === 'active' ? 'Actief' : f === 'completed' ? 'Afgerond' : 'Alles'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* New orders alert */}
      {newCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-red-500 text-white rounded-2xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="text-3xl"
            >
              🔔
            </motion.span>
            <div>
              <p className="font-bold text-lg">{newCount} nieuwe bestelling{newCount > 1 ? 'en' : ''}!</p>
              <p className="text-white/80">Klik op bevestigen om het geluid te stoppen</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Orders */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredOrders.map((order, index) => {
            const items = parseItems(order)
            const status = order.status?.toLowerCase() || 'new'
            const config = statusConfig[status] || statusConfig.new
            
            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-2xl p-6 shadow-sm ${
                  status === 'new' ? 'ring-2 ring-red-500 animate-pulse' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xl font-bold text-gray-900">#{order.order_number || order.id?.slice(0, 8)}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${order.order_type === 'pickup' || order.order_type === 'PICKUP' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {order.order_type === 'pickup' || order.order_type === 'PICKUP' ? '🛍️ Afhalen' : '🚗 Levering'}
                      </span>
                      {/* Payment Status Badge */}
                      {order.payment_status && (
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          paymentStatusConfig[order.payment_status]?.bg || 'bg-gray-100'
                        } ${paymentStatusConfig[order.payment_status]?.text || 'text-gray-700'}`}>
                          {paymentStatusConfig[order.payment_status]?.label || order.payment_status}
                        </span>
                      )}
                      {/* Payment Method */}
                      {order.payment_method && (
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                          {paymentMethodLabels[order.payment_method] || order.payment_method}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 mt-1">{formatTime(order.created_at)}</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-500">€{order.total?.toFixed(2) || '0.00'}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Klant</p>
                    <p className="font-semibold text-gray-900">{order.customer_name}</p>
                    {order.customer_phone && (
                      <p className="text-gray-600">📞 {order.customer_phone}</p>
                    )}
                    {order.customer_email && (
                      <p className="text-gray-600">
                        <a href={`mailto:${order.customer_email}`} className="hover:text-orange-500">✉️ {order.customer_email}</a>
                      </p>
                    )}
                    {(order.delivery_address || order.customer_address) && (
                      <p className="text-gray-600 text-sm mt-1">📍 {order.delivery_address || order.customer_address}</p>
                    )}
                    {order.customer_notes && (
                      <p className="text-gray-500 text-sm mt-2 italic">💬 {order.customer_notes}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Bestelling ({items.length} items)</p>
                    {items.length > 0 ? (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm text-gray-700">
                            <span>{item.quantity}x {item.name || item.product_name}</span>
                            <span>€{((item.price || item.unit_price || 0) * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic">Geen items beschikbaar</p>
                    )}
                  </div>
                </div>

                {/* Totals summary */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-xl">
                  <span>Subtotaal: €{order.subtotal?.toFixed(2) || '0.00'}</span>
                  {(order.delivery_fee || 0) > 0 && <span>Bezorg: €{order.delivery_fee?.toFixed(2)}</span>}
                  {(order.discount_amount || 0) > 0 && <span className="text-green-600">Korting: -€{order.discount_amount?.toFixed(2)}</span>}
                  {(order.tax || 0) > 0 && <span>BTW: €{order.tax?.toFixed(2)}</span>}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {status === 'new' && (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleConfirmOrder(order)}
                        disabled={updatingId === order.id}
                        className="flex-1 min-w-[140px] bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-3 rounded-xl transition-colors"
                      >
                        ✓ Goedkeuren
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setRejectingOrder(order)}
                        disabled={updatingId === order.id}
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium rounded-xl transition-colors"
                      >
                        ✕ Weigeren
                      </motion.button>
                    </>
                  )}
                  {status.toLowerCase() !== 'new' && !['completed', 'cancelled'].includes(status.toLowerCase()) && config.next && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleUpdateStatus(order.id!, config.next!)}
                      disabled={updatingId === order.id}
                      className="flex-1 min-w-[200px] bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {updatingId === order.id ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        <>
                          {status.toLowerCase() === 'confirmed' && '👨‍🍳 Start bereiding'}
                          {status.toLowerCase() === 'preparing' && '✅ Klaar'}
                          {status.toLowerCase() === 'ready' && '✔️ Afronden'}
                        </>
                      )}
                    </motion.button>
                  )}
                  <button 
                    onClick={() => setSelectedOrder(order)}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    title="Details bekijken"
                  >
                    📋
                  </button>
                  <button 
                    onClick={() => printReceipt(order)}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    title="Bon printen"
                  >
                    🖨️
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {filteredOrders.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 bg-white rounded-2xl shadow-sm"
        >
          <span className="text-6xl mb-4 block">📦</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Geen bestellingen</h3>
          <p className="text-gray-500">Wachten op nieuwe bestellingen...</p>
        </motion.div>
      )}

      {/* Order Detail Modal - GROOT FORMAAT */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="p-6 border-b bg-gray-50 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Bestelling #{selectedOrder.order_number || selectedOrder.id?.slice(0, 8)}
                  </h2>
                  <p className="text-gray-500">{new Date(selectedOrder.created_at || '').toLocaleString('nl-BE')}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 text-3xl w-10 h-10 flex items-center justify-center hover:bg-gray-200 rounded-full"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Status & Payment Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${statusConfig[selectedOrder.status]?.bg || 'bg-gray-100'} ${statusConfig[selectedOrder.status]?.text || 'text-gray-700'}`}>
                    {statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                  </span>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${selectedOrder.order_type === 'pickup' || selectedOrder.order_type === 'PICKUP' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {selectedOrder.order_type === 'pickup' || selectedOrder.order_type === 'PICKUP' ? '🛍️ Afhalen' : '🚗 Levering'}
                  </span>
                  {selectedOrder.payment_status && (
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${paymentStatusConfig[selectedOrder.payment_status]?.bg || 'bg-gray-100'} ${paymentStatusConfig[selectedOrder.payment_status]?.text || 'text-gray-700'}`}>
                      {paymentStatusConfig[selectedOrder.payment_status]?.label || selectedOrder.payment_status}
                    </span>
                  )}
                  {selectedOrder.payment_method && (
                    <span className="px-4 py-2 rounded-full text-sm bg-gray-100 text-gray-600">
                      {paymentMethodLabels[selectedOrder.payment_method] || selectedOrder.payment_method}
                    </span>
                  )}
                </div>

                {/* Customer Info */}
                <div className="bg-blue-50 rounded-xl p-5">
                  <p className="text-sm text-blue-600 font-medium mb-2">👤 Klantgegevens</p>
                  <p className="text-xl font-bold text-gray-900">{selectedOrder.customer_name}</p>
                  {selectedOrder.customer_phone && (
                    <p className="text-gray-600 text-lg">📞 {selectedOrder.customer_phone}</p>
                  )}
                  {selectedOrder.customer_email && <p className="text-gray-600">✉️ {selectedOrder.customer_email}</p>}
                  {(selectedOrder.delivery_address || selectedOrder.customer_address) && (
                    <p className="text-gray-600 mt-2">📍 {selectedOrder.delivery_address || selectedOrder.customer_address}</p>
                  )}
                  {(selectedOrder.delivery_notes || selectedOrder.customer_notes) && (
                    <p className="text-gray-500 text-sm mt-2 italic bg-white p-3 rounded-lg">
                      💬 "{selectedOrder.delivery_notes || selectedOrder.customer_notes}"
                    </p>
                  )}
                </div>

                {/* Items */}
                <div className="bg-orange-50 rounded-xl p-5">
                  <p className="text-sm text-orange-600 font-medium mb-3">🍟 Bestelde producten</p>
                  {(() => {
                    const items = parseItems(selectedOrder)
                    return items.length > 0 ? (
                      <div className="space-y-3">
                        {items.map((item, i) => (
                          <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg">
                            <div>
                              <span className="font-bold text-orange-600 mr-2">{item.quantity}x</span>
                              <span className="text-gray-900 font-medium">{item.name || item.product_name}</span>
                            </div>
                            <span className="font-bold text-gray-900">€{((item.price || item.unit_price || 0) * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic">Geen items beschikbaar</p>
                    )
                  })()}
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-gray-600 text-lg">
                    <span>Subtotaal</span>
                    <span>€{selectedOrder.subtotal?.toFixed(2) || '0.00'}</span>
                  </div>
                  {(selectedOrder.delivery_fee || 0) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Bezorgkosten</span>
                      <span>€{selectedOrder.delivery_fee?.toFixed(2)}</span>
                    </div>
                  )}
                  {(selectedOrder.tax || 0) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>BTW</span>
                      <span>€{selectedOrder.tax?.toFixed(2)}</span>
                    </div>
                  )}
                  {(selectedOrder.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Korting {selectedOrder.discount_code && `(${selectedOrder.discount_code})`}</span>
                      <span>-€{selectedOrder.discount_amount?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-2xl font-bold text-gray-900 pt-3 border-t">
                    <span>Totaal</span>
                    <span className="text-orange-500">€{selectedOrder.total?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t bg-gray-50 flex gap-3 flex-wrap">
                <button 
                  onClick={() => setSelectedOrder(null)} 
                  className="flex-1 min-w-[120px] px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-100 font-medium"
                >
                  Sluiten
                </button>
                <button 
                  onClick={() => printReceipt(selectedOrder)}
                  className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium flex items-center gap-2"
                >
                  🖨️ Bon printen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Rejection Modal */}
      <AnimatePresence>
        {rejectingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setRejectingOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b bg-red-50">
                <h2 className="text-2xl font-bold text-red-700">🚫 Bestelling Weigeren</h2>
                <p className="text-red-600 mt-1">#{rejectingOrder.order_number} - {rejectingOrder.customer_name}</p>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-lg font-semibold text-gray-900 mb-3">
                    Reden voor weigering *
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {rejectionReasons.map(reason => (
                      <button
                        key={reason.value}
                        onClick={() => setRejectionReason(reason.value)}
                        className={`p-4 text-left rounded-xl border-2 transition-all ${
                          rejectionReason === reason.value
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {reason.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {rejectionReason === 'other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Toelichting (optioneel)
                    </label>
                    <textarea
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      placeholder="Geef een korte toelichting..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                )}
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ De klant ontvangt automatisch een e-mail met de reden van weigering.
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={() => {
                    setRejectingOrder(null)
                    setRejectionReason('')
                    setRejectionNotes('')
                  }}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-100 font-medium"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleRejectOrder}
                  disabled={!rejectionReason || updatingId === rejectingOrder.id}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  {updatingId === rejectingOrder.id ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    '🚫 Bestelling Weigeren'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
