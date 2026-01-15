'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface DashboardStats {
  todayOrders: number
  todayRevenue: number
  weekOrders: number
  weekRevenue: number
  pendingOrders: number
  averageRating: number
  totalReviews: number
  popularItems: { name: string; count: number }[]
}

export default function AdminDashboard({ params }: { params: { tenant: string } }) {
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 24,
    todayRevenue: 486.50,
    weekOrders: 156,
    weekRevenue: 3245.80,
    pendingOrders: 3,
    averageRating: 4.8,
    totalReviews: 127,
    popularItems: [
      { name: 'Grote Friet', count: 89 },
      { name: 'Bicky Burger', count: 67 },
      { name: 'Frikandel Speciaal', count: 54 },
      { name: 'Stoofvleessaus', count: 48 },
    ]
  })

  const [recentOrders] = useState([
    { id: '#1234', customer: 'Jan V.', items: 3, total: 24.50, status: 'new', time: '2 min geleden' },
    { id: '#1233', customer: 'Lisa M.', items: 5, total: 38.00, status: 'preparing', time: '8 min geleden' },
    { id: '#1232', customer: 'Kevin D.', items: 2, total: 15.50, status: 'ready', time: '15 min geleden' },
    { id: '#1231', customer: 'Sarah B.', items: 4, total: 29.00, status: 'completed', time: '25 min geleden' },
  ])

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Nieuw' },
    preparing: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'In bereiding' },
    ready: { bg: 'bg-green-100', text: 'text-green-700', label: 'Klaar' },
    completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Afgerond' },
  }

  const quickActions = [
    { name: 'Product toevoegen', href: `/shop/${params.tenant}/admin/producten`, icon: '➕', color: 'bg-green-500' },
    { name: 'Openingstijden', href: `/shop/${params.tenant}/admin/openingstijden`, icon: '🕐', color: 'bg-blue-500' },
    { name: 'QR-code maken', href: `/shop/${params.tenant}/admin/qr-codes`, icon: '📱', color: 'bg-purple-500' },
    { name: 'Promotie starten', href: `/shop/${params.tenant}/admin/promoties`, icon: '🎁', color: 'bg-pink-500' },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-gray-900"
        >
          Welkom terug! 👋
        </motion.h1>
        <p className="text-gray-500 mt-1">Hier is een overzicht van je zaak vandaag.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm">Bestellingen vandaag</span>
            <span className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">📦</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.todayOrders}</p>
          <p className="text-green-500 text-sm mt-1">+12% vs gisteren</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm">Omzet vandaag</span>
            <span className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">💰</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">€{stats.todayRevenue.toFixed(2)}</p>
          <p className="text-green-500 text-sm mt-1">+8% vs gisteren</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm">Wachtende bestellingen</span>
            <span className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">⏳</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.pendingOrders}</p>
          <p className="text-orange-500 text-sm mt-1">Actie vereist</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm">Beoordeling</span>
            <span className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">⭐</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.averageRating}</p>
          <p className="text-gray-500 text-sm mt-1">{stats.totalReviews} reviews</p>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-8"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Snelle acties</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link key={action.name} href={action.href}>
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center text-2xl mb-3`}>
                  {action.icon}
                </div>
                <p className="font-medium text-gray-900">{action.name}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recente bestellingen</h2>
            <Link href={`/shop/${params.tenant}/admin/bestellingen`} className="text-orange-500 hover:text-orange-600 text-sm font-medium">
              Bekijk alles →
            </Link>
          </div>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-500 font-bold text-sm">{order.customer[0]}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{order.id} · {order.customer}</p>
                    <p className="text-sm text-gray-500">{order.items} items · {order.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">€{order.total.toFixed(2)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[order.status].bg} ${statusColors[order.status].text}`}>
                    {statusColors[order.status].label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Popular Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Populaire items</h2>
            <Link href={`/shop/${params.tenant}/admin/populair`} className="text-orange-500 hover:text-orange-600 text-sm font-medium">
              Bekijk alles →
            </Link>
          </div>
          <div className="space-y-4">
            {stats.popularItems.map((item, index) => (
              <div key={item.name} className="flex items-center gap-4">
                <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-500">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                    <div 
                      className="bg-orange-500 h-2 rounded-full" 
                      style={{ width: `${(item.count / stats.popularItems[0].count) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-500">{item.count}x</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Weekly Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white"
      >
        <h2 className="text-lg font-semibold mb-4">Deze week</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-white/70 text-sm">Totaal bestellingen</p>
            <p className="text-3xl font-bold">{stats.weekOrders}</p>
          </div>
          <div>
            <p className="text-white/70 text-sm">Totaal omzet</p>
            <p className="text-3xl font-bold">€{stats.weekRevenue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-white/70 text-sm">Gemiddelde bestelling</p>
            <p className="text-3xl font-bold">€{(stats.weekRevenue / stats.weekOrders).toFixed(2)}</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
