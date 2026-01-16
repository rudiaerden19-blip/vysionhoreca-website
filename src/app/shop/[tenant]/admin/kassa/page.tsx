'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getTenantSettings, updateOrderStatus } from '@/lib/admin-api'

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  delivery_address?: string
  order_type: 'pickup' | 'delivery'
  status: string
  total: number
  subtotal?: number
  delivery_fee?: number
  discount_amount?: number
  payment_status: string
  payment_method?: string
  items: any[]
  customer_notes?: string
  created_at: string
}

interface BusinessSettings {
  business_name: string
  primary_color: string
}

const REJECTION_REASONS = [
  { id: 'busy', label: 'Te druk', icon: '🔥' },
  { id: 'closed', label: 'Gesloten', icon: '🚫' },
  { id: 'no_stock', label: 'Niet op voorraad', icon: '📦' },
  { id: 'technical', label: 'Technisch probleem', icon: '⚠️' },
  { id: 'other', label: 'Andere reden', icon: '💬' },
]

export default function KassaDisplayPage({ params }: { params: { tenant: string } }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectNotes, setRejectNotes] = useState('')
  const [business, setBusiness] = useState<BusinessSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const audioContextRef = useRef<AudioContext | null>(null)
  const lastOrderCountRef = useRef(0)

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Load initial data
  useEffect(() => {
    loadData()
    const savedSound = localStorage.getItem(`kassa_sound_${params.tenant}`)
    if (savedSound === 'true') {
      setSoundEnabled(true)
      initAudio()
    }
  }, [params.tenant])

  // Real-time subscription
  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel('kassa-orders')
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
            // Parse items if string
            if (typeof newOrder.items === 'string') {
              try {
                newOrder.items = JSON.parse(newOrder.items)
              } catch (e) {
                newOrder.items = []
              }
            }
            setOrders(prev => [newOrder, ...prev])
            setNewOrderIds(prev => new Set([...prev, newOrder.id]))
            if (soundEnabled) playAlertSound()
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.tenant, soundEnabled])

  async function loadData() {
    const settings = await getTenantSettings(params.tenant)
    if (settings) {
      setBusiness({
        business_name: settings.business_name,
        primary_color: settings.primary_color || '#FF6B35',
      })
    }

    if (!supabase) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      const parsed = data.map(order => ({
        ...order,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items || []
      }))
      setOrders(parsed)
      lastOrderCountRef.current = parsed.length
    }

    setLoading(false)
  }

  function initAudio() {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  function playAlertSound() {
    if (!audioContextRef.current) initAudio()
    const ctx = audioContextRef.current
    if (!ctx) return

    // Play a pleasant chime
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    }

    // Chime pattern
    playTone(880, 0, 0.15)
    playTone(1100, 0.15, 0.15)
    playTone(1320, 0.3, 0.3)
  }

  function enableSound() {
    initAudio()
    playAlertSound()
    setSoundEnabled(true)
    localStorage.setItem(`kassa_sound_${params.tenant}`, 'true')
  }

  async function handleApprove(order: Order) {
    await updateOrderStatus(order.id, 'confirmed')
    setNewOrderIds(prev => {
      const next = new Set(prev)
      next.delete(order.id)
      return next
    })
    setSelectedOrder(null)
  }

  async function handleReject(order: Order) {
    await updateOrderStatus(order.id, 'rejected', rejectReason, rejectNotes)
    setNewOrderIds(prev => {
      const next = new Set(prev)
      next.delete(order.id)
      return next
    })
    setShowRejectModal(false)
    setSelectedOrder(null)
    setRejectReason('')
    setRejectNotes('')
  }

  async function handleComplete(order: Order) {
    await updateOrderStatus(order.id, 'completed')
    setSelectedOrder(null)
  }

  async function handleReady(order: Order) {
    await updateOrderStatus(order.id, 'ready')
    setSelectedOrder(null)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'bg-orange-500'
      case 'confirmed': return 'bg-blue-500'
      case 'preparing': return 'bg-yellow-500'
      case 'ready': return 'bg-green-500'
      case 'completed': return 'bg-gray-500'
      case 'rejected': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'NIEUW'
      case 'confirmed': return 'BEVESTIGD'
      case 'preparing': return 'IN BEREIDING'
      case 'ready': return 'KLAAR'
      case 'completed': return 'AFGEROND'
      case 'rejected': return 'GEWEIGERD'
      default: return status.toUpperCase()
    }
  }

  const getTimeSince = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Zojuist'
    if (mins < 60) return `${mins} min`
    return `${Math.floor(mins / 60)}u ${mins % 60}m`
  }

  const activeOrders = orders.filter(o => !['completed', 'rejected'].includes(o.status.toLowerCase()))
  const completedOrders = orders.filter(o => ['completed', 'rejected'].includes(o.status.toLowerCase()))

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: business?.primary_color }}
            >
              🍟
            </div>
            <div>
              <h1 className="text-2xl font-bold">{business?.business_name}</h1>
              <p className="text-gray-400">Kassa Display</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Sound Toggle */}
            {!soundEnabled ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={enableSound}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold flex items-center gap-2"
              >
                🔔 Geluid Activeren
              </motion.button>
            ) : (
              <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl flex items-center gap-2">
                🔊 Geluid Aan
              </span>
            )}

            {/* Clock */}
            <div className="text-right">
              <p className="text-3xl font-mono font-bold">
                {currentTime.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-gray-400 text-sm">
                {currentTime.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-88px)]">
        {/* Active Orders */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              Actieve Bestellingen ({activeOrders.length})
            </h2>
          </div>

          {activeOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <span className="text-6xl mb-4">📭</span>
              <p className="text-xl">Geen actieve bestellingen</p>
              <p className="text-sm mt-2">Nieuwe bestellingen verschijnen hier automatisch</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {activeOrders.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    boxShadow: newOrderIds.has(order.id) ? '0 0 30px rgba(249, 115, 22, 0.5)' : 'none'
                  }}
                  className={`bg-gray-800 rounded-2xl overflow-hidden cursor-pointer hover:bg-gray-750 transition-colors ${
                    newOrderIds.has(order.id) ? 'ring-2 ring-orange-500 animate-pulse' : ''
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
                  <div className={`${getStatusColor(order.status)} px-4 py-3 flex items-center justify-between`}>
                    <span className="font-bold text-lg">#{order.order_number}</span>
                    <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded">
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  {/* Order Content */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-lg">{order.customer_name}</span>
                      <span className="text-gray-400 text-sm">{getTimeSince(order.created_at)}</span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.order_type === 'delivery' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {order.order_type === 'delivery' ? '🚗 Levering' : '🛍️ Afhalen'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {order.payment_status === 'paid' ? '✓ Betaald' : '⏳ Niet betaald'}
                      </span>
                    </div>

                    {/* Items Preview */}
                    <div className="space-y-1 text-sm text-gray-300 mb-3">
                      {order.items?.slice(0, 3).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span>{item.quantity}x {item.product_name || item.name}</span>
                        </div>
                      ))}
                      {order.items?.length > 3 && (
                        <p className="text-gray-500">+{order.items.length - 3} meer...</p>
                      )}
                    </div>

                    {/* Total */}
                    <div className="text-2xl font-bold" style={{ color: business?.primary_color }}>
                      €{order.total?.toFixed(2)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Orders Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
          <h2 className="text-lg font-bold mb-4 text-gray-400">Recente Afgerond</h2>
          <div className="space-y-2">
            {completedOrders.slice(0, 10).map((order) => (
              <div
                key={order.id}
                className="bg-gray-700/50 rounded-xl p-3 cursor-pointer hover:bg-gray-700 transition-colors"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">#{order.order_number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    order.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {order.status === 'completed' ? '✓' : '✗'}
                  </span>
                </div>
                <p className="text-sm text-gray-400">{order.customer_name}</p>
                <p className="text-sm font-medium">€{order.total?.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && !showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`${getStatusColor(selectedOrder.status)} p-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold">#{selectedOrder.order_number}</h2>
                    <p className="text-white/80">{getStatusLabel(selectedOrder.status)}</p>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl hover:bg-white/30"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Customer Info */}
                <div className="bg-gray-700/50 rounded-2xl p-4 mb-6">
                  <h3 className="font-bold text-lg mb-3">👤 Klantgegevens</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Naam</p>
                      <p className="font-medium text-lg">{selectedOrder.customer_name}</p>
                    </div>
                    {selectedOrder.customer_phone && (
                      <div>
                        <p className="text-gray-400 text-sm">Telefoon</p>
                        <p className="font-medium text-lg">{selectedOrder.customer_phone}</p>
                      </div>
                    )}
                    {selectedOrder.customer_email && (
                      <div className="col-span-2">
                        <p className="text-gray-400 text-sm">Email</p>
                        <p className="font-medium">{selectedOrder.customer_email}</p>
                      </div>
                    )}
                    {selectedOrder.delivery_address && (
                      <div className="col-span-2">
                        <p className="text-gray-400 text-sm">Adres</p>
                        <p className="font-medium">{selectedOrder.delivery_address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Type & Payment */}
                <div className="flex gap-4 mb-6">
                  <div className={`flex-1 rounded-2xl p-4 ${
                    selectedOrder.order_type === 'delivery' ? 'bg-blue-500/20' : 'bg-green-500/20'
                  }`}>
                    <p className="text-2xl mb-1">{selectedOrder.order_type === 'delivery' ? '🚗' : '🛍️'}</p>
                    <p className="font-bold">{selectedOrder.order_type === 'delivery' ? 'Levering' : 'Afhalen'}</p>
                  </div>
                  <div className={`flex-1 rounded-2xl p-4 ${
                    selectedOrder.payment_status === 'paid' ? 'bg-green-500/20' : 'bg-yellow-500/20'
                  }`}>
                    <p className="text-2xl mb-1">{selectedOrder.payment_status === 'paid' ? '✓' : '⏳'}</p>
                    <p className="font-bold">{selectedOrder.payment_status === 'paid' ? 'Betaald' : 'Niet betaald'}</p>
                    {selectedOrder.payment_method && (
                      <p className="text-sm text-gray-400">{selectedOrder.payment_method}</p>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="bg-gray-700/50 rounded-2xl p-4 mb-6">
                  <h3 className="font-bold text-lg mb-3">🍟 Bestelling</h3>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-600 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center font-bold">
                            {item.quantity}
                          </span>
                          <span className="font-medium">{item.product_name || item.name}</span>
                        </div>
                        <span className="font-bold">€{(item.total_price || item.price * item.quantity)?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="mt-4 pt-4 border-t border-gray-600 space-y-2">
                    {selectedOrder.subtotal && (
                      <div className="flex justify-between text-gray-400">
                        <span>Subtotaal</span>
                        <span>€{selectedOrder.subtotal.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.delivery_fee && selectedOrder.delivery_fee > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Bezorgkosten</span>
                        <span>€{selectedOrder.delivery_fee.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.discount_amount && selectedOrder.discount_amount > 0 && (
                      <div className="flex justify-between text-green-400">
                        <span>Korting</span>
                        <span>-€{selectedOrder.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-2xl font-bold pt-2">
                      <span>Totaal</span>
                      <span style={{ color: business?.primary_color }}>€{selectedOrder.total?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.customer_notes && (
                  <div className="bg-yellow-500/20 rounded-2xl p-4 mb-6">
                    <h3 className="font-bold mb-2">📝 Opmerkingen</h3>
                    <p>{selectedOrder.customer_notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedOrder.status.toLowerCase() === 'new' && (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowRejectModal(true)}
                        className="py-4 bg-red-500 hover:bg-red-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
                      >
                        ✗ Afwijzen
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleApprove(selectedOrder)}
                        className="py-4 bg-green-500 hover:bg-green-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
                      >
                        ✓ Goedkeuren
                      </motion.button>
                    </>
                  )}
                  {selectedOrder.status.toLowerCase() === 'confirmed' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleReady(selectedOrder)}
                      className="col-span-2 py-4 bg-green-500 hover:bg-green-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
                    >
                      ✓ Klaar voor afhalen
                    </motion.button>
                  )}
                  {selectedOrder.status.toLowerCase() === 'ready' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleComplete(selectedOrder)}
                      className="col-span-2 py-4 bg-blue-500 hover:bg-blue-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
                    >
                      ✓ Afgerond
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-3xl max-w-lg w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6 text-center">Bestelling Afwijzen</h2>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {REJECTION_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => setRejectReason(reason.id)}
                    className={`p-4 rounded-2xl text-left transition-all ${
                      rejectReason === reason.id
                        ? 'bg-red-500 ring-2 ring-red-400'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <span className="text-2xl mb-1 block">{reason.icon}</span>
                    <span className="font-medium">{reason.label}</span>
                  </button>
                ))}
              </div>

              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Extra notities (optioneel)..."
                className="w-full px-4 py-3 bg-gray-700 rounded-xl border-none resize-none h-24 mb-6"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectReason('')
                    setRejectNotes('')
                  }}
                  className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-2xl font-bold"
                >
                  Annuleren
                </button>
                <button
                  onClick={() => handleReject(selectedOrder)}
                  disabled={!rejectReason}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 rounded-2xl font-bold disabled:opacity-50"
                >
                  Afwijzen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
