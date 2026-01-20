'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface OrderItem {
  name?: string
  product_name?: string
  quantity: number
  price?: number
  unit_price?: number
  category?: string
}

interface PopularProduct {
  rank: number
  name: string
  category: string
  sales: number
  revenue: number
  trend: number
}

export default function PopulairPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week')
  const [products, setProducts] = useState<PopularProduct[]>([])
  const [loading, setLoading] = useState(true)

  // Process orders into product stats
  const processOrders = (orders: { items: unknown }[]): Record<string, { sales: number; revenue: number; category: string }> => {
    const stats: Record<string, { sales: number; revenue: number; category: string }> = {}
    
    for (const order of orders) {
      let items: OrderItem[] = []
      
      if (typeof order.items === 'string') {
        try {
          items = JSON.parse(order.items)
        } catch {
          continue
        }
      } else if (Array.isArray(order.items)) {
        items = order.items as OrderItem[]
      }
      
      for (const item of items) {
        const name = item.name || item.product_name || 'Onbekend'
        const quantity = item.quantity || 1
        const price = item.price || item.unit_price || 0
        const category = item.category || 'Overig'
        
        if (!stats[name]) {
          stats[name] = { sales: 0, revenue: 0, category }
        }
        
        stats[name].sales += quantity
        stats[name].revenue += price * quantity
      }
    }
    
    return stats
  }

  const loadPopularItems = useCallback(async () => {
    setLoading(true)
    
    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    let previousStartDate: Date
    let previousEndDate: Date
    
    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      previousEndDate = startDate
    } else if (period === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      previousEndDate = startDate
    } else {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      previousStartDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000)
      previousEndDate = startDate
    }

    try {
      // Fetch current period orders
      const { data: currentOrders } = await supabase
        .from('orders')
        .select('items, created_at')
        .eq('tenant_slug', params.tenant)
        .gte('created_at', startDate.toISOString())
        .not('status', 'in', '("cancelled","rejected")')

      // Fetch previous period orders for trend calculation
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('items, created_at')
        .eq('tenant_slug', params.tenant)
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', previousEndDate.toISOString())
        .not('status', 'in', '("cancelled","rejected")')

      // Process current period
      const currentStats = processOrders(currentOrders || [])
      const previousStats = processOrders(previousOrders || [])

      // Calculate trends and create product list
      const popularProducts: PopularProduct[] = Object.entries(currentStats)
        .map(([name, data]) => {
          const prevData = previousStats[name]
          let trend = 0
          if (prevData && prevData.sales > 0) {
            trend = Math.round(((data.sales - prevData.sales) / prevData.sales) * 100)
          } else if (data.sales > 0 && !prevData) {
            trend = 100 // New product
          }
          
          return {
            rank: 0,
            name,
            category: data.category || 'Overig',
            sales: data.sales,
            revenue: data.revenue,
            trend
          }
        })
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 20)
        .map((product, index) => ({ ...product, rank: index + 1 }))

      setProducts(popularProducts)
    } catch (error) {
      console.error('Error loading popular items:', error)
    }
    
    setLoading(false)
  }, [params.tenant, period])

  useEffect(() => {
    loadPopularItems()
  }, [loadPopularItems])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('popularPage.title')}</h1>
          <p className="text-gray-500">{t('popularPage.subtitle')}</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                period === p ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              {t(`popularPage.periods.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {products.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-white rounded-2xl shadow-sm"
        >
          <span className="text-6xl mb-4 block">📊</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('popularPage.noSalesData')}</h3>
          <p className="text-gray-500">
            {t('popularPage.noOrdersPeriod').replace('{period}', t(`popularPage.periodLabels.${period}`))}
          </p>
        </motion.div>
      )}

      {/* Top 3 */}
      {products.length > 0 && (
        <>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {products.slice(0, 3).map((product, i) => (
              <motion.div
                key={product.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-6 text-white ${
                  i === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                  i === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                  'bg-gradient-to-br from-orange-300 to-orange-500'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl font-black">#{product.rank}</span>
                  <span className="text-3xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                </div>
                <h3 className="text-xl font-bold mb-1">{product.name}</h3>
                <p className="text-white/70 text-sm mb-4">{product.category}</p>
                <div className="flex justify-between">
                  <div>
                    <p className="text-2xl font-bold">{product.sales}</p>
                    <p className="text-white/70 text-sm">{t('popularPage.sold')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">€{product.revenue.toFixed(0)}</p>
                    <p className="text-white/70 text-sm">{t('popularPage.revenue')}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Full List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-500">{t('popularPage.table.rank')}</th>
                  <th className="text-left p-4 font-medium text-gray-500">{t('popularPage.table.product')}</th>
                  <th className="text-left p-4 font-medium text-gray-500">{t('popularPage.table.category')}</th>
                  <th className="text-right p-4 font-medium text-gray-500">{t('popularPage.table.sold')}</th>
                  <th className="text-right p-4 font-medium text-gray-500">{t('popularPage.table.revenue')}</th>
                  <th className="text-right p-4 font-medium text-gray-500">{t('popularPage.table.trend')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((product, i) => (
                  <motion.tr
                    key={product.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="p-4">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        product.rank <= 3 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {product.rank}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gray-900">{product.name}</td>
                    <td className="p-4 text-gray-500">{product.category}</td>
                    <td className="p-4 text-right font-medium text-gray-900">{product.sales}</td>
                    <td className="p-4 text-right font-medium text-gray-900">€{product.revenue.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                        product.trend > 0 ? 'bg-green-100 text-green-700' : 
                        product.trend < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {product.trend > 0 ? '↑' : product.trend < 0 ? '↓' : '→'}
                        {Math.abs(product.trend)}%
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </>
      )}
    </div>
  )
}
