'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getOrders, getOrderWithItems, updateOrderStatus, Order } from '@/lib/admin-api'
import { supabase } from '@/lib/supabase'

const statusConfig: Record<string, { bg: string; text: string; label: string; next?: Order['status']; prev?: Order['status'] }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-700', label: '🆕 Nieuw', next: 'confirmed' },
  confirmed: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '✓ Bevestigd', next: 'preparing', prev: 'new' },
  preparing: { bg: 'bg-orange-100', text: 'text-orange-700', label: '👨‍🍳 In bereiding', next: 'ready', prev: 'confirmed' },
  ready: { bg: 'bg-green-100', text: 'text-green-700', label: '✅ Klaar', next: 'completed', prev: 'preparing' },
  delivered: { bg: 'bg-purple-100', text: 'text-purple-700', label: '🚗 Onderweg', next: 'completed' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: '✔️ Afgerond' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Geannuleerd' },
}

export default function BestellingenPage({ params }: { params: { tenant: string } }) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [kitchenMode, setKitchenMode] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  
  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Track which orders are "new" and need attention
  const hasNewOrders = orders.some(o => o.status === 'new')

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

  // Load orders
  const loadOrders = useCallback(async () => {
    const data = await getOrders(params.tenant)
    setOrders(data)
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
  }

  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    setUpdatingId(orderId)
    const success = await updateOrderStatus(orderId, newStatus)
    if (success) {
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ))
    }
    setUpdatingId(null)
  }

  const handleViewDetails = async (order: Order) => {
    if (order.items && order.items.length > 0) {
      setSelectedOrder(order)
    } else {
      const fullOrder = await getOrderWithItems(order.id!)
      setSelectedOrder(fullOrder)
    }
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
    if (filter === 'active') return !['completed', 'cancelled'].includes(o.status)
    if (filter === 'completed') return o.status === 'completed'
    return true
  })

  const activeCount = orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length
  const newCount = orders.filter(o => o.status === 'new').length

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
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-4 rounded-xl text-2xl ${soundEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
            >
              {soundEnabled ? '🔔' : '🔕'}
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
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-2xl p-6 ${
                order.status === 'new' 
                  ? 'bg-blue-500 text-white ring-4 ring-yellow-400' 
                  : order.status === 'confirmed'
                  ? 'bg-yellow-500 text-gray-900'
                  : order.status === 'preparing'
                  ? 'bg-orange-500 text-white'
                  : order.status === 'ready'
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
                    {order.order_type === 'pickup' ? '🛍️ Afhalen' : '🚗 Levering'}
                  </p>
                </div>
              </div>

              {/* Customer */}
              <div className="mb-4 p-3 bg-black/20 rounded-xl">
                <p className="text-xl font-bold">{order.customer_name}</p>
                {order.customer_phone && <p className="opacity-80">{order.customer_phone}</p>}
                {order.delivery_address && (
                  <p className="opacity-80 text-sm mt-1">📍 {order.delivery_address}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                {order.status === 'new' && (
                  <>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleUpdateStatus(order.id!, 'confirmed')}
                      disabled={updatingId === order.id}
                      className="p-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xl font-bold"
                    >
                      ✓ BEVESTIG
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleUpdateStatus(order.id!, 'cancelled')}
                      disabled={updatingId === order.id}
                      className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xl font-bold"
                    >
                      ✕ ANNULEER
                    </motion.button>
                  </>
                )}
                {order.status === 'confirmed' && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleUpdateStatus(order.id!, 'preparing')}
                    disabled={updatingId === order.id}
                    className="col-span-2 p-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xl font-bold"
                  >
                    👨‍🍳 START BEREIDING
                  </motion.button>
                )}
                {order.status === 'preparing' && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleUpdateStatus(order.id!, 'ready')}
                    disabled={updatingId === order.id}
                    className="col-span-2 p-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xl font-bold"
                  >
                    ✅ KLAAR
                  </motion.button>
                )}
                {order.status === 'ready' && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleUpdateStatus(order.id!, 'completed')}
                    disabled={updatingId === order.id}
                    className="col-span-2 p-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-xl font-bold"
                  >
                    ✔️ AFGEROND
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
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
      {!soundEnabled && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-between"
        >
          <p className="text-yellow-800">🔔 Klik om geluidsmeldingen te activeren</p>
          <button
            onClick={enableSound}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium"
          >
            Activeren
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
            onClick={() => { enableSound(); setSoundEnabled(!soundEnabled); }}
            className={`p-2 rounded-xl transition-colors ${soundEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
            title="Geluid"
          >
            {soundEnabled ? '🔊' : '🔇'}
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
          {filteredOrders.map((order, index) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-2xl p-6 shadow-sm ${
                order.status === 'new' ? 'ring-2 ring-red-500 animate-pulse' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xl font-bold text-gray-900">#{order.order_number || order.id?.slice(0, 8)}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[order.status]?.bg || 'bg-gray-100'} ${statusConfig[order.status]?.text || 'text-gray-700'}`}>
                      {statusConfig[order.status]?.label || order.status}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${order.order_type === 'pickup' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {order.order_type === 'pickup' ? '🛍️ Afhalen' : '🚗 Levering'}
                    </span>
                  </div>
                  <p className="text-gray-500 mt-1">{formatTime(order.created_at)}</p>
                </div>
                <p className="text-2xl font-bold text-orange-500">€{order.total?.toFixed(2) || '0.00'}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Klant</p>
                  <p className="font-semibold text-gray-900">{order.customer_name}</p>
                  {order.customer_phone && <p className="text-gray-600">{order.customer_phone}</p>}
                  {order.delivery_address && (
                    <p className="text-gray-600 text-sm mt-1">📍 {order.delivery_address}</p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Bestelling</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-gray-700">
                      <span>Subtotaal</span>
                      <span>€{order.subtotal?.toFixed(2) || '0.00'}</span>
                    </div>
                    {order.delivery_fee > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Bezorgkosten</span>
                        <span>€{order.delivery_fee.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {order.status === 'new' && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleUpdateStatus(order.id!, 'confirmed')}
                      disabled={updatingId === order.id}
                      className="flex-1 min-w-[140px] bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-3 rounded-xl transition-colors"
                    >
                      ✓ Bevestigen
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleUpdateStatus(order.id!, 'cancelled')}
                      disabled={updatingId === order.id}
                      className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium rounded-xl transition-colors"
                    >
                      ✕ Annuleren
                    </motion.button>
                  </>
                )}
                {order.status !== 'new' && !['completed', 'cancelled'].includes(order.status) && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleUpdateStatus(order.id!, statusConfig[order.status]?.next!)}
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
                        {order.status === 'confirmed' && '👨‍🍳 Start bereiding'}
                        {order.status === 'preparing' && '✅ Klaar'}
                        {order.status === 'ready' && '✔️ Afronden'}
                      </>
                    )}
                  </motion.button>
                )}
                <button 
                  onClick={() => handleViewDetails(order)}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  📋
                </button>
                {order.customer_phone && (
                  <a 
                    href={`tel:${order.customer_phone}`}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    📞
                  </a>
                )}
              </div>
            </motion.div>
          ))}
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

      {/* Order Detail Modal */}
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
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Bestelling #{selectedOrder.order_number || selectedOrder.id?.slice(0, 8)}
                  </h2>
                  <p className="text-gray-500">{formatTime(selectedOrder.created_at)}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[selectedOrder.status]?.bg} ${statusConfig[selectedOrder.status]?.text}`}>
                    {statusConfig[selectedOrder.status]?.label}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${selectedOrder.order_type === 'pickup' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {selectedOrder.order_type === 'pickup' ? '🛍️ Afhalen' : '🚗 Levering'}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-2">Klantgegevens</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.customer_name}</p>
                  {selectedOrder.customer_phone && <p className="text-gray-600">{selectedOrder.customer_phone}</p>}
                  {selectedOrder.customer_email && <p className="text-gray-600">{selectedOrder.customer_email}</p>}
                  {selectedOrder.delivery_address && <p className="text-gray-600 mt-2">📍 {selectedOrder.delivery_address}</p>}
                  {selectedOrder.delivery_notes && <p className="text-gray-500 text-sm mt-2 italic">"{selectedOrder.delivery_notes}"</p>}
                </div>

                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-2">Producten</p>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-gray-900">{item.quantity}x {item.product_name}</span>
                          <span className="font-medium">€{item.total_price?.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotaal</span>
                    <span>€{selectedOrder.subtotal?.toFixed(2)}</span>
                  </div>
                  {selectedOrder.delivery_fee > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Bezorgkosten</span>
                      <span>€{selectedOrder.delivery_fee.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Korting</span>
                      <span>-€{selectedOrder.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                    <span>Totaal</span>
                    <span className="text-orange-500">€{selectedOrder.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button onClick={() => setSelectedOrder(null)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-100 font-medium">
                  Sluiten
                </button>
                {selectedOrder.customer_phone && (
                  <a href={`tel:${selectedOrder.customer_phone}`} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center gap-2">
                    📞 Bellen
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
