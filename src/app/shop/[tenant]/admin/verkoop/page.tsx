'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getSalesStats, getDailyRevenue, getTopProducts, SalesStats } from '@/lib/admin-api'

const dayLabels = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']

export default function VerkoopPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('week')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SalesStats>({ total_orders: 0, total_revenue: 0, average_order: 0, orders_by_status: {} })
  const [dailyData, setDailyData] = useState<{ date: string; revenue: number; orders: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; sales: number; revenue: number }[]>([])

  useEffect(() => {
    loadData()
  }, [params.tenant, period])

  async function loadData() {
    setLoading(true)
    
    const [statsData, dailyDataResult, topProductsResult] = await Promise.all([
      getSalesStats(params.tenant, period),
      getDailyRevenue(params.tenant, period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365),
      getTopProducts(params.tenant, period === 'today' ? 'week' : period),
    ])
    
    setStats(statsData)
    setDailyData(dailyDataResult)
    setTopProducts(topProductsResult)
    setLoading(false)
  }

  const formatDayLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    if (period === 'week') {
      return dayLabels[date.getDay()]
    }
    return date.getDate().toString()
  }

  const maxRevenue = Math.max(...dailyData.map(d => d.revenue), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">{t('adminPages.common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verkoop</h1>
          <p className="text-gray-500">Analyseer je omzet en bestellingen</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(['today', 'week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                period === p ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              {p === 'today' ? 'Vandaag' : p === 'week' ? 'Week' : p === 'month' ? 'Maand' : 'Jaar'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Totale omzet</span>
            <span className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">💰</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">€{stats.total_revenue.toFixed(2)}</p>
          <p className="text-gray-400 text-sm mt-1">
            {period === 'today' ? 'Vandaag' : period === 'week' ? 'Deze week' : period === 'month' ? 'Deze maand' : 'Dit jaar'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Bestellingen</span>
            <span className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">📦</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total_orders}</p>
          <p className="text-gray-400 text-sm mt-1">
            {stats.orders_by_status.completed || 0} afgerond
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Gem. bestelling</span>
            <span className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">📊</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">€{stats.average_order.toFixed(2)}</p>
          <p className="text-gray-400 text-sm mt-1">Per bestelling</p>
        </motion.div>
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl p-6 shadow-sm mb-8"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Omzet per dag</h2>
        
        {dailyData.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">📊</span>
            <p className="text-gray-500">Nog geen verkoopdata voor deze periode</p>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-2 h-48">
            {dailyData.slice(-7).map((day, i) => (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(day.revenue / maxRevenue) * 100}%` }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className={`w-full rounded-t-lg ${day.revenue === 0 ? 'bg-gray-200' : 'bg-orange-500'}`}
                  style={{ minHeight: day.revenue > 0 ? '20px' : '4px' }}
                />
                <p className="mt-2 text-sm text-gray-500">{formatDayLabel(day.date)}</p>
                <p className="text-xs text-gray-400">€{day.revenue.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Top Products */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top producten</h2>
        
        {topProducts.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">🍟</span>
            <p className="text-gray-500">Nog geen producten verkocht in deze periode</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topProducts.slice(0, 5).map((product, i) => (
              <div key={product.name} className="flex items-center gap-4">
                <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-500">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                    <div 
                      className="bg-orange-500 h-2 rounded-full" 
                      style={{ width: `${(product.revenue / (topProducts[0]?.revenue || 1)) * 100}%` }} 
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">€{product.revenue.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">{product.sales}x</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6"
      >
        <h3 className="font-semibold text-blue-900 mb-2">💡 Over deze statistieken</h3>
        <p className="text-blue-700 text-sm">
          Deze statistieken worden berekend op basis van alle bestellingen in je systeem. 
          Geannuleerde bestellingen worden niet meegeteld. De data wordt real-time bijgewerkt 
          wanneer er nieuwe bestellingen binnenkomen.
        </p>
      </motion.div>
    </div>
  )
}
