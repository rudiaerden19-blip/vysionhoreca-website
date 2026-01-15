'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  todayOrders: number
  todayRevenue: number
  yesterdayOrders: number
  yesterdayRevenue: number
  weekOrders: number
  weekRevenue: number
  pendingOrders: number
  averageRating: number
  totalReviews: number
  popularItems: { name: string; count: number }[]
}

interface RecentOrder {
  id: string
  order_number: string
  customer_name: string
  total: number
  status: string
  created_at: string
  items: any[]
}

export default function AdminDashboard({ params }: { params: { tenant: string } }) {
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    todayRevenue: 0,
    yesterdayOrders: 0,
    yesterdayRevenue: 0,
    weekOrders: 0,
    weekRevenue: 0,
    pendingOrders: 0,
    averageRating: 0,
    totalReviews: 0,
    popularItems: []
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [params.tenant])

  async function loadDashboardData() {
    setLoading(true)
    
    // Check if supabase is available
    if (!supabase) {
      console.warn('Supabase not configured - showing empty dashboard')
      setLoading(false)
      return
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayISO = yesterday.toISOString()
    
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoISO = weekAgo.toISOString()

    // Fetch all orders
    const { data: allOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .order('created_at', { ascending: false })

    const orders = allOrders || []

    // Today's stats
    const todayOrders = orders.filter(o => new Date(o.created_at) >= today)
    const todayOrdersCount = todayOrders.length
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0)

    // Yesterday's stats
    const yesterdayOrders = orders.filter(o => {
      const date = new Date(o.created_at)
      return date >= yesterday && date < today
    })
    const yesterdayOrdersCount = yesterdayOrders.length
    const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + (o.total || 0), 0)

    // Week stats
    const weekOrders = orders.filter(o => new Date(o.created_at) >= weekAgo)
    const weekOrdersCount = weekOrders.length
    const weekRevenue = weekOrders.reduce((sum, o) => sum + (o.total || 0), 0)

    // Pending orders
    const pendingOrders = orders.filter(o => 
      o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing'
    ).length

    // Recent orders (last 5)
    const recentOrdersData = orders.slice(0, 5).map(o => ({
      id: o.id,
      order_number: o.order_number || `#${o.id.slice(-4)}`,
      customer_name: o.customer_name || 'Onbekend',
      total: o.total || 0,
      status: o.status || 'pending',
      created_at: o.created_at,
      items: o.items || []
    }))

    // Popular items from order_items
    const itemCounts: Record<string, number> = {}
    orders.forEach(order => {
      const items = order.items || []
      items.forEach((item: any) => {
        const name = item.product_name || item.name || 'Onbekend'
        const qty = item.quantity || 1
        itemCounts[name] = (itemCounts[name] || 0) + qty
      })
    })
    
    const popularItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count }))

    // Fetch reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('tenant_slug', params.tenant)

    const totalReviews = reviews?.length || 0
    const averageRating = totalReviews > 0 
      ? reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
      : 0

    setStats({
      todayOrders: todayOrdersCount,
      todayRevenue,
      yesterdayOrders: yesterdayOrdersCount,
      yesterdayRevenue,
      weekOrders: weekOrdersCount,
      weekRevenue,
      pendingOrders,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      popularItems
    })

    setRecentOrders(recentOrdersData)
    setLoading(false)
  }

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Nieuw' },
    confirmed: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Bevestigd' },
    preparing: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'In bereiding' },
    ready: { bg: 'bg-green-100', text: 'text-green-700', label: 'Klaar' },
    delivered: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Bezorgd' },
    completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Afgerond' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Geannuleerd' },
  }

  const quickActions = [
    { name: 'Product toevoegen', href: `/shop/${params.tenant}/admin/producten`, icon: '➕', color: 'bg-green-500' },
    { name: 'Openingstijden', href: `/shop/${params.tenant}/admin/openingstijden`, icon: '🕐', color: 'bg-blue-500' },
    { name: 'QR-code maken', href: `/shop/${params.tenant}/admin/qr-codes`, icon: '📱', color: 'bg-purple-500' },
    { name: 'Promotie starten', href: `/shop/${params.tenant}/admin/promoties`, icon: '🎁', color: 'bg-pink-500' },
  ]

  function getTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Zojuist'
    if (diffMins < 60) return `${diffMins} min geleden`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} uur geleden`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} dag${diffDays > 1 ? 'en' : ''} geleden`
  }

  function getPercentageChange(current: number, previous: number): { value: string; positive: boolean } {
    if (previous === 0) {
      return current > 0 ? { value: '+100%', positive: true } : { value: '0%', positive: true }
    }
    const change = ((current - previous) / previous) * 100
    return {
      value: `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`,
      positive: change >= 0
    }
  }

  const ordersChange = getPercentageChange(stats.todayOrders, stats.yesterdayOrders)
  const revenueChange = getPercentageChange(stats.todayRevenue, stats.yesterdayRevenue)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    )
  }

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
          <p className={`text-sm mt-1 ${ordersChange.positive ? 'text-green-500' : 'text-red-500'}`}>
            {ordersChange.value} vs gisteren
          </p>
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
          <p className={`text-sm mt-1 ${revenueChange.positive ? 'text-green-500' : 'text-red-500'}`}>
            {revenueChange.value} vs gisteren
          </p>
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
          <p className={`text-sm mt-1 ${stats.pendingOrders > 0 ? 'text-orange-500' : 'text-green-500'}`}>
            {stats.pendingOrders > 0 ? 'Actie vereist' : 'Alles verwerkt'}
          </p>
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
          <p className="text-3xl font-bold text-gray-900">{stats.averageRating || '-'}</p>
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
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-2">📦</p>
              <p>Nog geen bestellingen</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-500 font-bold text-sm">{order.customer_name[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{order.order_number} · {order.customer_name}</p>
                      <p className="text-sm text-gray-500">{order.items?.length || 0} items · {getTimeAgo(order.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">€{order.total.toFixed(2)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[order.status]?.bg || 'bg-gray-100'} ${statusColors[order.status]?.text || 'text-gray-700'}`}>
                      {statusColors[order.status]?.label || order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
            <Link href={`/shop/${params.tenant}/admin/verkoop`} className="text-orange-500 hover:text-orange-600 text-sm font-medium">
              Bekijk alles →
            </Link>
          </div>
          {stats.popularItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-2">🍟</p>
              <p>Nog geen verkopen</p>
            </div>
          ) : (
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
          )}
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
            <p className="text-3xl font-bold">€{stats.weekOrders > 0 ? (stats.weekRevenue / stats.weekOrders).toFixed(2) : '0.00'}</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
