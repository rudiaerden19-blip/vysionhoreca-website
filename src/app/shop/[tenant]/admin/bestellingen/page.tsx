'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getOrders, getOrderWithItems, updateOrderStatus, Order } from '@/lib/admin-api'

const statusConfig: Record<string, { bg: string; text: string; label: string; next?: Order['status'] }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-700', label: '🆕 Nieuw', next: 'confirmed' },
  confirmed: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '✓ Bevestigd', next: 'preparing' },
  preparing: { bg: 'bg-orange-100', text: 'text-orange-700', label: '👨‍🍳 In bereiding', next: 'ready' },
  ready: { bg: 'bg-green-100', text: 'text-green-700', label: '✅ Klaar', next: 'completed' },
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

  useEffect(() => {
    loadOrders()
    
    // Auto-refresh elke 30 seconden
    const interval = setInterval(loadOrders, 30000)
    return () => clearInterval(interval)
  }, [params.tenant])

  async function loadOrders() {
    const data = await getOrders(params.tenant)
    setOrders(data)
    setLoading(false)
  }

  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    const nextStatus = statusConfig[currentStatus]?.next
    if (!nextStatus) return
    
    setUpdatingId(orderId)
    const success = await updateOrderStatus(orderId, nextStatus)
    if (success) {
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: nextStatus } : o
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
    if (minutes < 60) return `${minutes} min geleden`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} uur geleden`
    return date.toLocaleDateString('nl-BE')
  }

  const filteredOrders = orders.filter(o => {
    if (filter === 'active') return !['completed', 'cancelled'].includes(o.status)
    if (filter === 'completed') return o.status === 'completed'
    return true
  })

  const activeCount = orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length

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

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bestellingen</h1>
          <p className="text-gray-500">{activeCount} actieve bestellingen</p>
        </div>
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadOrders}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl"
            title="Vernieuwen"
          >
            🔄
          </motion.button>
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
              className={`bg-white rounded-2xl p-6 shadow-sm ${order.status === 'new' ? 'ring-2 ring-blue-500' : ''}`}
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
                {/* Customer */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Klant</p>
                  <p className="font-semibold text-gray-900">{order.customer_name}</p>
                  {order.customer_phone && <p className="text-gray-600">{order.customer_phone}</p>}
                  {order.delivery_address && (
                    <p className="text-gray-600 text-sm mt-1">📍 {order.delivery_address}</p>
                  )}
                </div>

                {/* Order Info */}
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
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Korting {order.discount_code && `(${order.discount_code})`}</span>
                        <span>-€{order.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {!['completed', 'cancelled'].includes(order.status) && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleUpdateStatus(order.id!, order.status)}
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
                        {order.status === 'new' && '✓ Bevestigen'}
                        {order.status === 'confirmed' && '👨‍🍳 Start bereiding'}
                        {order.status === 'preparing' && '✅ Klaar voor afhalen'}
                        {order.status === 'ready' && '✔️ Afronden'}
                        {order.status === 'delivered' && '✔️ Afronden'}
                      </>
                    )}
                  </motion.button>
                )}
                <button 
                  onClick={() => handleViewDetails(order)}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  title="Details"
                >
                  📋
                </button>
                {order.customer_phone && (
                  <a 
                    href={`tel:${order.customer_phone}`}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    title="Bellen"
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
          <p className="text-gray-500">
            {filter === 'active' ? 'Er zijn momenteel geen actieve bestellingen' : 
             filter === 'completed' ? 'Er zijn nog geen afgeronde bestellingen' : 
             'Er zijn nog geen bestellingen'}
          </p>
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
                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[selectedOrder.status]?.bg} ${statusConfig[selectedOrder.status]?.text}`}>
                    {statusConfig[selectedOrder.status]?.label}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${selectedOrder.order_type === 'pickup' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {selectedOrder.order_type === 'pickup' ? '🛍️ Afhalen' : '🚗 Levering'}
                  </span>
                </div>

                {/* Customer */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-2">Klantgegevens</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.customer_name}</p>
                  {selectedOrder.customer_phone && (
                    <p className="text-gray-600">{selectedOrder.customer_phone}</p>
                  )}
                  {selectedOrder.customer_email && (
                    <p className="text-gray-600">{selectedOrder.customer_email}</p>
                  )}
                  {selectedOrder.delivery_address && (
                    <p className="text-gray-600 mt-2">📍 {selectedOrder.delivery_address}</p>
                  )}
                  {selectedOrder.delivery_notes && (
                    <p className="text-gray-500 text-sm mt-2 italic">"{selectedOrder.delivery_notes}"</p>
                  )}
                </div>

                {/* Items */}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-2">Producten</p>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-gray-900">
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="font-medium">€{item.total_price?.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Totals */}
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
                      <span>Korting {selectedOrder.discount_code && `(${selectedOrder.discount_code})`}</span>
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
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-100 font-medium"
                >
                  Sluiten
                </button>
                {selectedOrder.customer_phone && (
                  <a
                    href={`tel:${selectedOrder.customer_phone}`}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center gap-2"
                  >
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
