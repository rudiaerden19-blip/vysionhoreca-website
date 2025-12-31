'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Order {
  id: string
  order_number: string
  items: any
  subtotal: number
  tax: number
  total: number
  order_type: string
  payment_method: string
  payment_status: string
  status: string
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_notes: string
  table_number: string
  is_online: boolean
  created_at: string
}

export default function BestellingenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    if (!supabase) return
    
    try {
      const stored = localStorage.getItem('vysion_tenant')
      if (!stored) return
      const tenant = JSON.parse(stored)
      if (!tenant?.business_id) return
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', tenant.business_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount || 0)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('nl-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'voltooid':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'wachtend':
        return 'bg-yellow-100 text-yellow-800'
      case 'preparing':
      case 'in behandeling':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
      case 'geannuleerd':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true
    if (filter === 'online') return order.is_online
    if (filter === 'kassa') return !order.is_online
    if (filter === 'pending') return order.status === 'pending' || order.status === 'preparing'
    return true
  })

  const stats = {
    total: orders.length,
    online: orders.filter(o => o.is_online).length,
    kassa: orders.filter(o => !o.is_online).length,
    pending: orders.filter(o => o.status === 'pending' || o.status === 'preparing').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bestellingen</h1>
          <p className="text-gray-500 mt-1">Bekijk en beheer alle bestellingen</p>
        </div>
        <button 
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Vernieuwen
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button 
          onClick={() => setFilter('all')}
          className={`p-4 rounded-xl border transition-colors ${filter === 'all' ? 'bg-accent text-white border-accent' : 'bg-white border-gray-200 hover:border-accent'}`}
        >
          <p className={`text-2xl font-bold ${filter === 'all' ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
          <p className={`text-sm ${filter === 'all' ? 'text-white/80' : 'text-gray-500'}`}>Totaal</p>
        </button>
        <button 
          onClick={() => setFilter('online')}
          className={`p-4 rounded-xl border transition-colors ${filter === 'online' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-200 hover:border-purple-600'}`}
        >
          <p className={`text-2xl font-bold ${filter === 'online' ? 'text-white' : 'text-gray-900'}`}>{stats.online}</p>
          <p className={`text-sm ${filter === 'online' ? 'text-white/80' : 'text-gray-500'}`}>Online</p>
        </button>
        <button 
          onClick={() => setFilter('kassa')}
          className={`p-4 rounded-xl border transition-colors ${filter === 'kassa' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 hover:border-gray-800'}`}
        >
          <p className={`text-2xl font-bold ${filter === 'kassa' ? 'text-white' : 'text-gray-900'}`}>{stats.kassa}</p>
          <p className={`text-sm ${filter === 'kassa' ? 'text-white/80' : 'text-gray-500'}`}>Kassa</p>
        </button>
        <button 
          onClick={() => setFilter('pending')}
          className={`p-4 rounded-xl border transition-colors ${filter === 'pending' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white border-gray-200 hover:border-yellow-500'}`}
        >
          <p className={`text-2xl font-bold ${filter === 'pending' ? 'text-white' : 'text-gray-900'}`}>{stats.pending}</p>
          <p className={`text-sm ${filter === 'pending' ? 'text-white/80' : 'text-gray-500'}`}>Wachtend</p>
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bestelling</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Klant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Betaling</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Totaal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Geen bestellingen gevonden
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">#{order.order_number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-gray-900">{order.customer_name || 'Anoniem'}</p>
                        {order.customer_phone && (
                          <p className="text-gray-500 text-sm">{order.customer_phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${order.is_online ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {order.is_online ? '🌐 Online' : '🏪 Kassa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {order.payment_method || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                      {formatCurrency(Number(order.total) || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="text-accent hover:underline text-sm"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Bestelling #{selectedOrder.order_number}</h2>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Klant</p>
                  <p className="font-medium">{selectedOrder.customer_name || 'Anoniem'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telefoon</p>
                  <p className="font-medium">{selectedOrder.customer_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{selectedOrder.is_online ? 'Online' : 'Kassa'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Betaalmethode</p>
                  <p className="font-medium">{selectedOrder.payment_method || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Datum</p>
                  <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
                </div>
              </div>

              {selectedOrder.customer_address && (
                <div>
                  <p className="text-sm text-gray-500">Adres</p>
                  <p className="font-medium">{selectedOrder.customer_address}</p>
                </div>
              )}

              {selectedOrder.customer_notes && (
                <div>
                  <p className="text-sm text-gray-500">Opmerkingen</p>
                  <p className="font-medium">{selectedOrder.customer_notes}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Items</p>
                {selectedOrder.items && Array.isArray(selectedOrder.items) ? (
                  <div className="space-y-2">
                    {selectedOrder.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Geen items beschikbaar</p>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotaal</span>
                  <span>{formatCurrency(parseFloat(String(selectedOrder.subtotal)) || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>BTW</span>
                  <span>{formatCurrency(parseFloat(String(selectedOrder.tax)) || 0)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Totaal</span>
                  <span>{formatCurrency(Number(selectedOrder.total) || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
