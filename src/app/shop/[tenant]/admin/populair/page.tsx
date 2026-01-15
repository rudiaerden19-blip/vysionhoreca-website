'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function PopulairPage({ params }: { params: { tenant: string } }) {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  const products = [
    { rank: 1, name: 'Grote Friet', category: 'Frieten', sales: 234, revenue: 1053.00, trend: 12 },
    { rank: 2, name: 'Bicky Burger', category: 'Burgers', sales: 189, revenue: 1039.50, trend: 8 },
    { rank: 3, name: 'Stoofvleessaus', category: 'Sauzen', sales: 156, revenue: 468.00, trend: -3 },
    { rank: 4, name: 'Frikandel Speciaal', category: 'Snacks', sales: 134, revenue: 536.00, trend: 15 },
    { rank: 5, name: 'Cola 33cl', category: 'Dranken', sales: 128, revenue: 320.00, trend: 5 },
    { rank: 6, name: 'Cheese Burger Deluxe', category: 'Burgers', sales: 98, revenue: 931.00, trend: 22 },
    { rank: 7, name: 'Kipnuggets (6st)', category: 'Snacks', sales: 87, revenue: 522.00, trend: -8 },
    { rank: 8, name: 'Medium Friet', category: 'Frieten', sales: 76, revenue: 266.00, trend: 3 },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Populaire items</h1>
          <p className="text-gray-500">Ontdek wat het beste verkoopt</p>
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
              {p === 'week' ? 'Week' : p === 'month' ? 'Maand' : 'Jaar'}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 */}
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
                <p className="text-white/70 text-sm">verkocht</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">€{product.revenue.toFixed(0)}</p>
                <p className="text-white/70 text-sm">omzet</p>
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
              <th className="text-left p-4 font-medium text-gray-500">#</th>
              <th className="text-left p-4 font-medium text-gray-500">Product</th>
              <th className="text-left p-4 font-medium text-gray-500">Categorie</th>
              <th className="text-right p-4 font-medium text-gray-500">Verkocht</th>
              <th className="text-right p-4 font-medium text-gray-500">Omzet</th>
              <th className="text-right p-4 font-medium text-gray-500">Trend</th>
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
    </div>
  )
}
