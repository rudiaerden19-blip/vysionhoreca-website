'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function BetalingPage({ params }: { params: { tenant: string } }) {
  const [methods, setMethods] = useState({
    cash: true,
    bancontact: true,
    visa: false,
    mastercard: false,
    paypal: false,
    ideal: false,
  })
  const [vatRate, setVatRate] = useState('6')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setSaving(false)
  }

  const paymentMethods = [
    { id: 'cash', name: 'Contant', icon: '💵', description: 'Betalen bij afhalen/levering' },
    { id: 'bancontact', name: 'Bancontact', icon: '💳', description: 'Belgische betaalkaart' },
    { id: 'visa', name: 'Visa', icon: '💳', description: 'Kredietkaart' },
    { id: 'mastercard', name: 'Mastercard', icon: '💳', description: 'Kredietkaart' },
    { id: 'paypal', name: 'PayPal', icon: '🅿️', description: 'Online betalen' },
    { id: 'ideal', name: 'iDEAL', icon: '🏦', description: 'Nederlandse banken' },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Betaalmethodes & BTW</h1>
          <p className="text-gray-500">Configureer hoe klanten kunnen betalen</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center gap-2"
        >
          {saving ? '⏳' : '💾'} Opslaan
        </motion.button>
      </div>

      {/* Payment Methods */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-sm mb-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>💳</span> Betaalmethodes
        </h2>
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <label 
              key={method.id}
              className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors ${
                methods[method.id as keyof typeof methods] 
                  ? 'bg-orange-50 border-2 border-orange-500' 
                  : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{method.icon}</span>
                <div>
                  <p className="font-medium text-gray-900">{method.name}</p>
                  <p className="text-sm text-gray-500">{method.description}</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={methods[method.id as keyof typeof methods]}
                onChange={(e) => setMethods(prev => ({ ...prev, [method.id]: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
            </label>
          ))}
        </div>
      </motion.div>

      {/* VAT Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📊</span> BTW-tarief
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {['6', '12', '21'].map((rate) => (
            <button
              key={rate}
              onClick={() => setVatRate(rate)}
              className={`p-4 rounded-xl font-bold text-xl transition-all ${
                vatRate === rate 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {rate}%
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-4">
          💡 In België geldt 6% BTW voor afhaal, 12% voor ter plaatse consumptie
        </p>
      </motion.div>

      {/* Online Payments Setup */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-6 text-white"
      >
        <h3 className="font-semibold text-lg mb-2">💡 Online betalingen activeren</h3>
        <p className="text-white/80 mb-4">
          Wil je online betalingen accepteren? Neem contact op om Stripe of Mollie te koppelen.
        </p>
        <button className="bg-white text-blue-600 font-medium px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors">
          Contact opnemen
        </button>
      </motion.div>
    </div>
  )
}
