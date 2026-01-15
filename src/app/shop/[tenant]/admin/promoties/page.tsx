'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface Promo {
  id: string
  name: string
  type: 'percentage' | 'fixed' | 'freeItem'
  value: number
  code: string
  usageCount: number
  maxUsage: number | null
  active: boolean
  expiresAt: string | null
}

export default function PromotiesPage({ params }: { params: { tenant: string } }) {
  const [promos, setPromos] = useState<Promo[]>([
    { id: '1', name: 'Welkom10', type: 'percentage', value: 10, code: 'WELKOM10', usageCount: 45, maxUsage: 100, active: true, expiresAt: '2026-02-28' },
    { id: '2', name: 'Gratis friet', type: 'freeItem', value: 0, code: 'FRIETFREE', usageCount: 12, maxUsage: 50, active: true, expiresAt: null },
    { id: '3', name: '€5 korting', type: 'fixed', value: 5, code: 'VIJFEUR', usageCount: 78, maxUsage: null, active: false, expiresAt: '2025-12-31' },
  ])

  const toggleActive = (id: string) => {
    setPromos(prev => prev.map(p => 
      p.id === id ? { ...p, active: !p.active } : p
    ))
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promoties</h1>
          <p className="text-gray-500">Beheer kortingscodes en acties</p>
        </div>
        <button className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center gap-2">
          ➕ Nieuwe promotie
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <p className="text-gray-500 text-sm">Actieve promoties</p>
          <p className="text-3xl font-bold text-green-500">{promos.filter(p => p.active).length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <p className="text-gray-500 text-sm">Totaal gebruikt</p>
          <p className="text-3xl font-bold text-orange-500">{promos.reduce((sum, p) => sum + p.usageCount, 0)}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <p className="text-gray-500 text-sm">Deze maand</p>
          <p className="text-3xl font-bold text-blue-500">57</p>
        </motion.div>
      </div>

      {/* Promos List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="divide-y">
          {promos.map((promo) => (
            <div key={promo.id} className={`p-4 flex items-center gap-4 ${!promo.active ? 'opacity-60' : ''}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${
                promo.type === 'percentage' ? 'bg-green-500' :
                promo.type === 'fixed' ? 'bg-blue-500' : 'bg-purple-500'
              }`}>
                {promo.type === 'percentage' ? '%' :
                 promo.type === 'fixed' ? '€' : '🎁'}
              </div>

              <div className="flex-1">
                <p className="font-semibold text-gray-900">{promo.name}</p>
                <p className="text-sm text-gray-500">
                  Code: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{promo.code}</span>
                </p>
              </div>

              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {promo.type === 'percentage' ? `${promo.value}%` :
                   promo.type === 'fixed' ? `€${promo.value}` : 'Gratis item'}
                </p>
                <p className="text-xs text-gray-500">korting</p>
              </div>

              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{promo.usageCount}</p>
                <p className="text-xs text-gray-500">
                  {promo.maxUsage ? `/ ${promo.maxUsage}` : 'gebruikt'}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={promo.active}
                  onChange={() => toggleActive(promo.id)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>

              <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">⋯</button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Empty State */}
      {promos.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <span className="text-6xl mb-4 block">🎁</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Nog geen promoties</h3>
          <p className="text-gray-500 mb-6">Maak je eerste kortingscode aan</p>
          <button className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-xl">
            + Eerste promotie maken
          </button>
        </div>
      )}
    </div>
  )
}
