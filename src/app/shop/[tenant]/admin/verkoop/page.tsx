'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function VerkoopPage({ params }: { params: { tenant: string } }) {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('week')

  const stats = {
    today: { orders: 24, revenue: 486.50, average: 20.27 },
    week: { orders: 156, revenue: 3245.80, average: 20.81 },
    month: { orders: 623, revenue: 12890.40, average: 20.69 },
    year: { orders: 7456, revenue: 154230.80, average: 20.68 },
  }

  const current = stats[period]

  const weeklyData = [
    { day: 'Ma', value: 420 },
    { day: 'Di', value: 380 },
    { day: 'Wo', value: 0 },
    { day: 'Do', value: 510 },
    { day: 'Vr', value: 780 },
    { day: 'Za', value: 890 },
    { day: 'Zo', value: 520 },
  ]
  const maxValue = Math.max(...weeklyData.map(d => d.value))

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
          <p className="text-3xl font-bold text-gray-900">€{current.revenue.toFixed(2)}</p>
          <p className="text-green-500 text-sm mt-1">+12.5% vs vorige periode</p>
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
          <p className="text-3xl font-bold text-gray-900">{current.orders}</p>
          <p className="text-green-500 text-sm mt-1">+8.3% vs vorige periode</p>
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
          <p className="text-3xl font-bold text-gray-900">€{current.average.toFixed(2)}</p>
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
        <div className="flex items-end justify-between gap-2 h-48">
          {weeklyData.map((day, i) => (
            <div key={day.day} className="flex-1 flex flex-col items-center">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(day.value / maxValue) * 100}%` }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`w-full rounded-t-lg ${day.value === 0 ? 'bg-gray-200' : 'bg-orange-500'}`}
                style={{ minHeight: day.value > 0 ? '20px' : '4px' }}
              />
              <p className="mt-2 text-sm text-gray-500">{day.day}</p>
              <p className="text-xs text-gray-400">€{day.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Top Products */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top producten</h2>
        <div className="space-y-4">
          {[
            { name: 'Grote Friet', sales: 89, revenue: 400.50 },
            { name: 'Bicky Burger', sales: 67, revenue: 368.50 },
            { name: 'Stoofvleessaus', sales: 54, revenue: 162.00 },
            { name: 'Frikandel Speciaal', sales: 48, revenue: 192.00 },
            { name: 'Cola 33cl', sales: 45, revenue: 112.50 },
          ].map((product, i) => (
            <div key={product.name} className="flex items-center gap-4">
              <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-500">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{product.name}</p>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${(product.sales / 89) * 100}%` }} />
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">€{product.revenue.toFixed(2)}</p>
                <p className="text-sm text-gray-500">{product.sales}x</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
