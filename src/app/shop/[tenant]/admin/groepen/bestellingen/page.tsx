'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/i18n'

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  options_json: Record<string, unknown> | null
  notes: string | null
}

interface GroupMember {
  name: string
  email: string | null
  department: string | null
}

interface GroupOrder {
  id: string
  order_number: number
  customer_name: string
  status: string
  total: number
  created_at: string
  order_items: OrderItem[]
  group_members: GroupMember | null
}

interface SessionInfo {
  id: string
  title: string | null
  order_deadline: string
  delivery_time: string | null
  status: string
  order_groups: {
    name: string
  }
}

export default function GroupOrdersPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')
  
  const [orders, setOrders] = useState<GroupOrder[]>([])
  const [ordersByMember, setOrdersByMember] = useState<Record<string, GroupOrder[]>>({})
  const [summary, setSummary] = useState({ totalOrders: 0, totalAmount: 0 })
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'grouped' | 'labels'>('grouped')

  useEffect(() => {
    if (sessionId) {
      loadOrders()
      loadSession()
    } else {
      setLoading(false)
    }
  }, [sessionId, params.tenant])

  async function loadSession() {
    const res = await fetch(`/api/groups/sessions?tenant_slug=${params.tenant}`)
    if (res.ok) {
      const data = await res.json()
      const found = data.find((s: SessionInfo) => s.id === sessionId)
      setSession(found || null)
    }
  }

  async function loadOrders() {
    setLoading(true)
    const res = await fetch(`/api/groups/orders?session_id=${sessionId}`)
    if (res.ok) {
      const data = await res.json()
      setOrders(data.orders || [])
      setOrdersByMember(data.byMember || {})
      setSummary(data.summary || { totalOrders: 0, totalAmount: 0 })
    }
    setLoading(false)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('nl-NL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function printLabels() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const labelsHtml = orders.map(order => `
      <div style="
        border: 2px dashed #ccc;
        padding: 20px;
        margin: 10px;
        width: 300px;
        display: inline-block;
        page-break-inside: avoid;
        font-family: Arial, sans-serif;
      ">
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">
          ${order.group_members?.name || order.customer_name}
        </div>
        ${order.group_members?.department ? `<div style="color: #666; margin-bottom: 10px;">${order.group_members.department}</div>` : ''}
        <div style="border-top: 1px solid #eee; padding-top: 10px;">
          ${order.order_items.map(item => `
            <div style="margin-bottom: 5px;">
              <strong>${item.quantity}x</strong> ${item.product_name}
              ${item.notes ? `<br><small style="color: #666;">${item.notes}</small>` : ''}
            </div>
          `).join('')}
        </div>
        <div style="border-top: 1px solid #eee; margin-top: 10px; padding-top: 10px; font-weight: bold;">
          Totaal: €${order.total.toFixed(2)}
        </div>
      </div>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Labels - ${session?.title || 'Groepsbestelling'}</title>
          <style>
            @media print {
              body { margin: 0; }
              @page { margin: 10mm; }
            }
          </style>
        </head>
        <body>
          ${labelsHtml}
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (!sessionId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <span className="text-4xl mb-4 block">📦</span>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Selecteer een sessie</h2>
          <p className="text-gray-600 mb-4">Ga naar Bestelsessies om een sessie te selecteren</p>
          <a
            href={`/shop/${params.tenant}/admin/groepen/sessies`}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl"
          >
            Naar sessies
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📦 Groepsbestellingen</h1>
          {session && (
            <p className="text-gray-600">
              {session.title || session.order_groups?.name} - {formatDate(session.order_deadline)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="bg-gray-100 rounded-xl p-1 flex">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1 rounded-lg text-sm ${viewMode === 'grouped' ? 'bg-white shadow' : ''}`}
            >
              👥 Per persoon
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg text-sm ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
            >
              📋 Lijst
            </button>
          </div>
          <button
            onClick={printLabels}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium"
          >
            🏷️ Print labels
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-3xl font-bold text-gray-900">{summary.totalOrders}</div>
          <div className="text-gray-500">Bestellingen</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-3xl font-bold text-green-600">€{summary.totalAmount.toFixed(2)}</div>
          <div className="text-gray-500">Totaal</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-3xl font-bold text-blue-600">{Object.keys(ordersByMember).length}</div>
          <div className="text-gray-500">Personen</div>
        </div>
      </div>

      {/* Orders */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-50 rounded-2xl p-12 text-center"
        >
          <span className="text-6xl mb-4 block">📭</span>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Nog geen bestellingen</h2>
          <p className="text-gray-600">Wacht tot groepsleden hun bestelling plaatsen</p>
        </motion.div>
      ) : viewMode === 'grouped' ? (
        // Grouped by member view
        <div className="space-y-4">
          {Object.entries(ordersByMember).map(([memberName, memberOrders]) => (
            <motion.div
              key={memberName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-4 shadow-sm border"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    {memberName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{memberName}</div>
                    {memberOrders[0]?.group_members?.department && (
                      <div className="text-sm text-gray-500">{memberOrders[0].group_members.department}</div>
                    )}
                  </div>
                </div>
                <div className="text-lg font-bold text-green-600">
                  €{memberOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-3">
                {memberOrders.flatMap(order => order.order_items).map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1 text-sm">
                    <span>
                      <span className="font-medium">{item.quantity}x</span> {item.product_name}
                      {item.notes && <span className="text-gray-500 ml-2">({item.notes})</span>}
                    </span>
                    <span className="text-gray-600">€{item.total_price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        // List view
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Naam</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Afdeling</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Items</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Totaal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {order.group_members?.name || order.customer_name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {order.group_members?.department || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {order.order_items.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">
                    €{order.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Kitchen Summary */}
      {orders.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🍳 Keuken overzicht</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            {(() => {
              const productSummary: Record<string, number> = {}
              orders.forEach(order => {
                order.order_items.forEach(item => {
                  const key = item.product_name
                  productSummary[key] = (productSummary[key] || 0) + item.quantity
                })
              })
              
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(productSummary)
                    .sort((a, b) => b[1] - a[1])
                    .map(([product, qty]) => (
                      <div key={product} className="flex justify-between bg-white rounded-lg p-2">
                        <span className="truncate">{product}</span>
                        <span className="font-bold text-yellow-700 ml-2">{qty}x</span>
                      </div>
                    ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
