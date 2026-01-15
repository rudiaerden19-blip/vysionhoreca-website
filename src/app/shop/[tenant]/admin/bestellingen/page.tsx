'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface Order {
  id: string
  customer: string
  items: { name: string; qty: number; price: number }[]
  total: number
  status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'completed'
  type: 'pickup' | 'delivery'
  time: string
  address?: string
  phone: string
}

export default function BestellingenPage({ params }: { params: { tenant: string } }) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active')
  const [orders, setOrders] = useState<Order[]>([
    { id: '#1234', customer: 'Jan Vermeer', items: [{ name: 'Grote Friet', qty: 2, price: 4.50 }, { name: 'Bicky Burger', qty: 1, price: 5.50 }], total: 14.50, status: 'new', type: 'pickup', time: '2 min geleden', phone: '+32 471 12 34 56' },
    { id: '#1233', customer: 'Lisa Maes', items: [{ name: 'Friet + Stoofvlees', qty: 1, price: 7.50 }, { name: 'Cola', qty: 2, price: 2.50 }], total: 12.50, status: 'preparing', type: 'delivery', time: '8 min geleden', address: 'Kerkstraat 15, 3900 Pelt', phone: '+32 472 23 45 67' },
    { id: '#1232', customer: 'Kevin De Smet', items: [{ name: 'Bicky Burger', qty: 2, price: 5.50 }], total: 11.00, status: 'ready', type: 'pickup', time: '15 min geleden', phone: '+32 473 34 56 78' },
    { id: '#1231', customer: 'Sarah Bervoets', items: [{ name: 'Cheese Burger Deluxe', qty: 1, price: 9.50 }, { name: 'Grote Friet', qty: 1, price: 4.50 }], total: 14.00, status: 'completed', type: 'delivery', time: '25 min geleden', address: 'Markt 8, 3900 Pelt', phone: '+32 474 45 67 89' },
  ])

  const statusConfig: Record<string, { bg: string; text: string; label: string; next?: string }> = {
    new: { bg: 'bg-blue-100', text: 'text-blue-700', label: '🆕 Nieuw', next: 'confirmed' },
    confirmed: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '✓ Bevestigd', next: 'preparing' },
    preparing: { bg: 'bg-orange-100', text: 'text-orange-700', label: '👨‍🍳 In bereiding', next: 'ready' },
    ready: { bg: 'bg-green-100', text: 'text-green-700', label: '✅ Klaar', next: 'completed' },
    delivered: { bg: 'bg-purple-100', text: 'text-purple-700', label: '🚗 Onderweg', next: 'completed' },
    completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: '✔️ Afgerond' },
  }

  const updateStatus = (id: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        const next = statusConfig[o.status].next
        return next ? { ...o, status: next as Order['status'] } : o
      }
      return o
    }))
  }

  const filteredOrders = orders.filter(o => {
    if (filter === 'active') return o.status !== 'completed'
    if (filter === 'completed') return o.status === 'completed'
    return true
  })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bestellingen</h1>
          <p className="text-gray-500">{orders.filter(o => o.status !== 'completed').length} actieve bestellingen</p>
        </div>
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

      {/* Orders */}
      <div className="space-y-4">
        {filteredOrders.map((order, index) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-white rounded-2xl p-6 shadow-sm ${order.status === 'new' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-gray-900">{order.id}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[order.status].bg} ${statusConfig[order.status].text}`}>
                    {statusConfig[order.status].label}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${order.type === 'pickup' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {order.type === 'pickup' ? '🛍️ Afhalen' : '🚗 Levering'}
                  </span>
                </div>
                <p className="text-gray-500 mt-1">{order.time}</p>
              </div>
              <p className="text-2xl font-bold text-orange-500">€{order.total.toFixed(2)}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {/* Customer */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">Klant</p>
                <p className="font-semibold text-gray-900">{order.customer}</p>
                <p className="text-gray-600">{order.phone}</p>
                {order.address && <p className="text-gray-600 text-sm mt-1">📍 {order.address}</p>}
              </div>

              {/* Items */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">Items</p>
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-gray-900">
                    <span>{item.qty}x {item.name}</span>
                    <span>€{(item.qty * item.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {order.status !== 'completed' && (
              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus(order.id)}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  {order.status === 'new' && '✓ Bevestigen'}
                  {order.status === 'confirmed' && '👨‍🍳 Start bereiding'}
                  {order.status === 'preparing' && '✅ Klaar voor afhalen'}
                  {order.status === 'ready' && '✔️ Afronden'}
                </button>
                <button className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  📞
                </button>
                <button className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  🖨️
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <span className="text-6xl mb-4 block">📦</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Geen bestellingen</h3>
          <p className="text-gray-500">Er zijn momenteel geen {filter === 'active' ? 'actieve' : filter === 'completed' ? 'afgeronde' : ''} bestellingen</p>
        </div>
      )}
    </div>
  )
}
