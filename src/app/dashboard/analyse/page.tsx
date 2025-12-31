'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'

export default function AnalysePage() {
  const [orders, setOrders] = useState<any[]>([])
  const [fixedCosts, setFixedCosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const t = useTranslations('analysisPage')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    if (!supabase) return
    
    try {
      const stored = localStorage.getItem('vysion_tenant')
      if (!stored) return
      const tenant = JSON.parse(stored)
      if (!tenant?.business_id) return
      
      const [ordersRes, costsRes] = await Promise.all([
        supabase.from('orders').select('*').eq('business_id', tenant.business_id),
        supabase.from('fixed_costs').select('*').eq('business_id', tenant.business_id),
      ])

      if (ordersRes.error) throw ordersRes.error
      setOrders(ordersRes.data || [])
      setFixedCosts(costsRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  // Calculate metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const totalCosts = fixedCosts.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)
  const netProfit = totalRevenue - totalCosts
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  // Group by payment method
  const paymentMethods: Record<string, number> = {}
  orders.forEach(order => {
    const method = order.payment_method || 'Onbekend'
    paymentMethods[method] = (paymentMethods[method] || 0) + (Number(order.total) || 0)
  })

  // Group by order type
  const onlineRevenue = orders.filter(o => o.is_online).reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const kassaRevenue = orders.filter(o => !o.is_online).reduce((sum, o) => sum + (Number(o.total) || 0), 0)

  // Top hours
  const ordersByHour: Record<number, number> = {}
  orders.forEach(order => {
    if (order.created_at) {
      const hour = new Date(order.created_at).getHours()
      ordersByHour[hour] = (ordersByHour[hour] || 0) + 1
    }
  })
  const topHours = Object.entries(ordersByHour)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-500 mt-1">{t('subtitle')}</p>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">{t('stats.totalRevenue')}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-gray-500 mt-2">{orders.length} {t('stats.orders')}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">{t('stats.fixedCosts')}</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(totalCosts)}</p>
          <p className="text-sm text-gray-500 mt-2">{fixedCosts.length} {t('stats.costItems')}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">{t('stats.netProfit')}</p>
          <p className={`text-3xl font-bold mt-1 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(netProfit)}
          </p>
          <p className="text-sm text-gray-500 mt-2">{t('stats.afterCosts')}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">{t('stats.profitMargin')}</p>
          <p className={`text-3xl font-bold mt-1 ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {profitMargin.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500 mt-2">{t('stats.ofRevenue')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Channel */}
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('charts.revenueByChannel')}</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">🏪 {t('charts.pos')}</span>
                <span className="font-semibold">{formatCurrency(kassaRevenue)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gray-800 h-3 rounded-full" 
                  style={{ width: `${totalRevenue > 0 ? (kassaRevenue / totalRevenue) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">🌐 {t('charts.online')}</span>
                <span className="font-semibold">{formatCurrency(onlineRevenue)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-purple-600 h-3 rounded-full" 
                  style={{ width: `${totalRevenue > 0 ? (onlineRevenue / totalRevenue) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('charts.paymentMethods')}</h2>
          <div className="space-y-3">
            {Object.entries(paymentMethods)
              .sort((a, b) => b[1] - a[1])
              .map(([method, amount]) => (
                <div key={method} className="flex items-center justify-between">
                  <span className="text-gray-600">{method}</span>
                  <div className="flex items-center gap-4">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-accent h-2 rounded-full" 
                        style={{ width: `${totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="font-semibold w-24 text-right">{formatCurrency(amount)}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Busiest Hours */}
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('charts.busiestHours')}</h2>
          <div className="space-y-3">
            {topHours.length === 0 ? (
              <p className="text-gray-500">{t('charts.noData')}</p>
            ) : (
              topHours.map(([hour, count], index) => (
                <div key={hour} className="flex items-center justify-between">
                  <span className="text-gray-600">
                    {index === 0 && '🥇 '}
                    {index === 1 && '🥈 '}
                    {index === 2 && '🥉 '}
                    {hour}:00 - {parseInt(hour) + 1}:00
                  </span>
                  <span className="font-semibold">{count} {t('charts.orders')}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Fixed Costs Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('charts.fixedCostsBreakdown')}</h2>
          <div className="space-y-3">
            {fixedCosts.length === 0 ? (
              <p className="text-gray-500">{t('charts.noCosts')}</p>
            ) : (
              fixedCosts.map((cost: any) => (
                <div key={cost.id} className="flex items-center justify-between">
                  <span className="text-gray-600">{cost.name || cost.description || t('charts.cost')}</span>
                  <span className="font-semibold text-red-600">{formatCurrency(parseFloat(cost.amount) || 0)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
