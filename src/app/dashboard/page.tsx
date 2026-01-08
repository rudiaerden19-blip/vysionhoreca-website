'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getBusinessId } from '@/lib/get-business-id'
import { useLanguage } from '@/i18n'

interface DashboardStats {
  totalOrders: number
  totalRevenue: number
  totalCustomers: number
  averageOrderValue: number
  todayOrders: number
  todayRevenue: number
  onlineOrders: number
  pendingOrders: number
}

interface RecentOrder {
  id: string
  order_number: string
  total: number
  status: string
  order_type: string
  customer_name: string
  created_at: string
  is_online: boolean
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    averageOrderValue: 0,
    todayOrders: 0,
    todayRevenue: 0,
    onlineOrders: 0,
    pendingOrders: 0,
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()
  const trans = (key: string) => t(`dashboardPage.${key}`)
  const common = (key: string) => t(`common.${key}`)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    const businessId = getBusinessId()
    if (!businessId || !supabase) {
      setLoading(false)
      return
    }

    try {
      // Fetch orders filtered by business_id
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Fetch customers filtered by business_id
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', businessId)

      if (customersError) throw customersError

      // Calculate stats
      const today = new Date().toISOString().split('T')[0]
      const todayOrders = orders?.filter((o: any) => o.created_at?.startsWith(today)) || []
      const onlineOrders = orders?.filter((o: any) => o.is_online) || []
      const pendingOrders = orders?.filter((o: any) => o.status === 'pending' || o.status === 'preparing') || []

      const totalRevenue = orders?.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0) || 0
      const todayRevenue = todayOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0)

      setStats({
        totalOrders: orders?.length || 0,
        totalRevenue,
        totalCustomers: customers?.length || 0,
        averageOrderValue: orders?.length ? totalRevenue / orders.length : 0,
        todayOrders: todayOrders.length,
        todayRevenue,
        onlineOrders: onlineOrders.length,
        pendingOrders: pendingOrders.length,
      })

      // Set recent orders (last 10)
      setRecentOrders(orders?.slice(0, 10) || [])

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('nl-BE', {
      day: '2-digit',
      month: '2-digit',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{trans('title')}</h1>
        <p className="text-gray-400 mt-1">{trans('welcome')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Revenue */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{trans('stats.todayRevenue')}</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.todayRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            <span className="text-green-500 font-medium">{stats.todayOrders}</span> {trans('stats.todayOrders')}
          </p>
        </div>

        {/* Total Revenue */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{trans('stats.totalRevenue')}</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            <span className="font-medium text-gray-300">{stats.totalOrders}</span> {trans('stats.totalOrders')}
          </p>
        </div>

        {/* Customers */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{trans('stats.customers')}</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalCustomers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            {trans('stats.avgPerOrder')} <span className="font-medium text-gray-300">{formatCurrency(stats.averageOrderValue)}</span> {trans('stats.perOrder')}
          </p>
        </div>

        {/* Online Orders */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{trans('stats.onlineOrders')}</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.onlineOrders}</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            <span className="text-yellow-500 font-medium">{stats.pendingOrders}</span> {trans('stats.pending')}
          </p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{trans('recentOrders.title')}</h2>
            <a href="/dashboard/bestellingen" className="text-accent hover:underline text-sm font-medium">
              {trans('recentOrders.viewAll')}
            </a>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0f0f0f]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{trans('recentOrders.headers.order')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{trans('recentOrders.headers.customer')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{trans('recentOrders.headers.type')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{trans('recentOrders.headers.total')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{trans('recentOrders.headers.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{trans('recentOrders.headers.date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {trans('recentOrders.noOrders')}
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#0f0f0f]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-white">#{order.order_number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {order.customer_name || common('anonymous')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${order.is_online ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-300'}`}>
                        {order.is_online ? `🌐 ${trans('orderType.online')}` : `🏪 ${trans('orderType.pos')}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-white">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
