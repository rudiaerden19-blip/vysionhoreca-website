'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { orderCountsTowardRevenueAndZReport, type Order } from '@/lib/admin-api'

/** PostgREST-range; hoog genoeg voor throughput, laag genoeg voor payload. */
const ORDERS_PAGE = 800

interface PopularProduct {
  rank: number
  name: string
  category: string
  sales: number
  revenue: number
  trend: number
}

function coerceNonNegativeNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseFloat(v.replace(',', '.'))
    if (Number.isFinite(n) && n >= 0) return n
  }
  return null
}

function pickLineQuantity(item: Record<string, unknown>): number {
  const q = coerceNonNegativeNumber(item.quantity)
  if (q != null && q > 0) return q
  return 1
}

/** Naam uit platte velden óf uit kassa CartItem `{ product: { name } }`. */
function pickDisplayName(item: Record<string, unknown>): string {
  for (const key of ['name', 'product_name', 'title', 'label'] as const) {
    const v = item[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  const prod = item.product
  if (prod && typeof prod === 'object' && prod !== null) {
    const n = (prod as Record<string, unknown>).name
    if (typeof n === 'string' && n.trim()) return n.trim()
  }
  return 'Onbekend'
}

function extrasFromOptionList(opts: unknown): number {
  if (!Array.isArray(opts)) return 0
  let s = 0
  for (const o of opts) {
    if (!o || typeof o !== 'object') continue
    const p = coerceNonNegativeNumber((o as Record<string, unknown>).price)
    if (p != null) s += p
  }
  return s
}

/** Regelomzet: webshop gebruikt vaak total_price; kassa base price + option/choice toeslag. */
function lineRevenueEuro(item: Record<string, unknown>, qty: number): number {
  const tp =
    coerceNonNegativeNumber(item.total_price) ?? coerceNonNegativeNumber(item.totalPrice)
  if (tp != null && tp > 0) return tp

  const prod =
    item.product && typeof item.product === 'object'
      ? (item.product as Record<string, unknown>)
      : null
  const unit =
    coerceNonNegativeNumber(item.price) ??
    coerceNonNegativeNumber(item.unit_price) ??
    (prod ? coerceNonNegativeNumber(prod.price) : null) ??
    0

  const extras =
    extrasFromOptionList(item.options) + extrasFromOptionList(item.choices)
  return (unit + extras) * qty
}

function parseOrderItemsRaw(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[]
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw)
      return Array.isArray(p) ? (p as Record<string, unknown>[]) : []
    } catch {
      return []
    }
  }
  return []
}

async function fetchOrdersItemsWindow(params: {
  tenantSlug: string
  startISO: string
  endISOExclusive?: string | null
}): Promise<{ items: unknown; status?: string; order_type?: string; payment_status?: string }[]> {
  const out: { items: unknown }[] = []
  let from = 0
  for (let page = 0; page < 200; page++) {
    let q = supabase
      .from('orders')
      .select('items, created_at, status, order_type, payment_status')
      .eq('tenant_slug', params.tenantSlug)
      .gte('created_at', params.startISO)
      .not('status', 'in', '("cancelled","rejected")')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + ORDERS_PAGE - 1)

    if (params.endISOExclusive) {
      q = q.lt('created_at', params.endISOExclusive)
    }

    const { data, error } = await q
    if (error) {
      console.error('[populair] orders fetch:', error)
      break
    }
    const chunk = data || []
    out.push(...chunk)
    if (chunk.length < ORDERS_PAGE) break
    from += ORDERS_PAGE
  }
  return out
}

export default function PopulairPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week')
  const [products, setProducts] = useState<PopularProduct[]>([])
  const [loading, setLoading] = useState(true)

  const processOrders = (
    orders: { items: unknown }[],
  ): Record<string, { sales: number; revenue: number; category: string }> => {
    const stats: Record<string, { sales: number; revenue: number; category: string }> = {}

    for (const order of orders) {
      const lines = parseOrderItemsRaw(order.items)

      for (const raw of lines) {
        const name = pickDisplayName(raw)
        const quantity = pickLineQuantity(raw)
        const category =
          typeof raw.category === 'string' && raw.category.trim()
            ? raw.category.trim()
            : 'Overig'

        const prod =
          raw.product && typeof raw.product === 'object'
            ? (raw.product as Record<string, unknown>)
            : null
        const catFromProd =
          prod && typeof prod.category === 'string' && prod.category.trim()
            ? String(prod.category).trim()
            : null
        const resolvedCategory = catFromProd || category

        if (!stats[name]) {
          stats[name] = { sales: 0, revenue: 0, category: resolvedCategory }
        }

        stats[name].sales += quantity
        stats[name].revenue += lineRevenueEuro(raw, quantity)
      }
    }

    return stats
  }

  const loadPopularItems = useCallback(async () => {
    setLoading(true)

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
      const [currentRaw, previousRaw] = await Promise.all([
        fetchOrdersItemsWindow({
          tenantSlug: params.tenant,
          startISO: startDate.toISOString(),
        }),
        fetchOrdersItemsWindow({
          tenantSlug: params.tenant,
          startISO: previousStartDate.toISOString(),
          endISOExclusive: previousEndDate.toISOString(),
        }),
      ])

      const currentOrders = currentRaw.filter((o) =>
        orderCountsTowardRevenueAndZReport(
          o as Pick<Order, 'order_type' | 'status' | 'payment_status'>,
        ),
      )
      const previousOrders = previousRaw.filter((o) =>
        orderCountsTowardRevenueAndZReport(
          o as Pick<Order, 'order_type' | 'status' | 'payment_status'>,
        ),
      )

      const currentStats = processOrders(currentOrders)
      const previousStats = processOrders(previousOrders)

      const popularProducts: PopularProduct[] = Object.entries(currentStats)
        .map(([name, data]) => {
          const prevData = previousStats[name]
          let trend = 0
          if (prevData && prevData.sales > 0) {
            trend = Math.round(((data.sales - prevData.sales) / prevData.sales) * 100)
          } else if (data.sales > 0 && !prevData) {
            trend = 100
          }

          return {
            rank: 0,
            name,
            category: data.category || 'Overig',
            sales: data.sales,
            revenue: data.revenue,
            trend,
          }
        })
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 50)
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
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
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
                  i === 0
                    ? 'bg-gradient-to-br from-yellow-400 to-blue-600'
                    : i === 1
                      ? 'bg-gradient-to-br from-gray-400 to-gray-600'
                      : 'bg-gradient-to-br from-amber-400 to-amber-600'
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
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          product.rank <= 3 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {product.rank}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gray-900">{product.name}</td>
                    <td className="p-4 text-gray-500">{product.category}</td>
                    <td className="p-4 text-right font-medium text-gray-900">{product.sales}</td>
                    <td className="p-4 text-right font-medium text-gray-900">€{product.revenue.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                          product.trend > 0
                            ? 'bg-green-100 text-green-700'
                            : product.trend < 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
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
