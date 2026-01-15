'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getDeliverySettings, saveDeliverySettings, DeliverySettings } from '@/lib/admin-api'

export default function LeveringPage({ params }: { params: { tenant: string } }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [settings, setSettings] = useState<DeliverySettings>({
    tenant_slug: params.tenant,
    pickup_enabled: true,
    pickup_time_minutes: 15,
    delivery_enabled: true,
    delivery_fee: 2.50,
    min_order_amount: 15,
    delivery_radius_km: 5,
    delivery_time_minutes: 30,
    payment_cash: true,
    payment_card: true,
    payment_online: false,
  })

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const data = await getDeliverySettings(params.tenant)
      if (data) {
        setSettings(data)
      }
      setLoading(false)
    }
    loadData()
  }, [params.tenant])

  const handleChange = (field: keyof DeliverySettings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    setSaved(false)
    setError('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    
    const success = await saveDeliverySettings(settings)
    
    if (success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError('Opslaan mislukt. Probeer opnieuw.')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">Laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Levering & afhaal</h1>
          <p className="text-gray-500">Beheer hoe klanten kunnen bestellen</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
            saved 
              ? 'bg-green-500 text-white' 
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          {saving ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
              <span>Opslaan...</span>
            </>
          ) : saved ? (
            <>
              <span>✓</span>
              <span>Opgeslagen!</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>Opslaan</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Pickup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🛍️</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Afhalen</h2>
                <p className="text-gray-500 text-sm">Klanten halen bestelling op bij je zaak</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.pickup_enabled}
                onChange={(e) => handleChange('pickup_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          {settings.pickup_enabled && (
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bereidingstijd (minuten)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Bijv. 15"
                  value={settings.pickup_time_minutes || ''}
                  onChange={(e) => handleChange('pickup_time_minutes', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Delivery */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🚗</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Levering</h2>
                <p className="text-gray-500 text-sm">Bestellingen worden thuisbezorgd</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.delivery_enabled}
                onChange={(e) => handleChange('delivery_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          {settings.delivery_enabled && (
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Levertijd (minuten)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Bijv. 30"
                  value={settings.delivery_time_minutes || ''}
                  onChange={(e) => handleChange('delivery_time_minutes', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leveringskosten
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Bijv. 2.50"
                    value={settings.delivery_fee || ''}
                    onChange={(e) => handleChange('delivery_fee', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bezorgradius (km)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Bijv. 10"
                  value={settings.delivery_radius_km || ''}
                  onChange={(e) => handleChange('delivery_radius_km', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimumbedrag
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Bijv. 15"
                    value={settings.min_order_amount || ''}
                    onChange={(e) => handleChange('min_order_amount', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span>💳</span> Betaalmethodes
          </h2>
          
          <div className="space-y-4">
            <label className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={settings.payment_cash}
                onChange={(e) => handleChange('payment_cash', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-2xl">💵</span>
              <div>
                <p className="font-medium text-gray-900">Cash</p>
                <p className="text-sm text-gray-500">Klanten betalen bij levering of afhaling</p>
              </div>
            </label>

            <label className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={settings.payment_card}
                onChange={(e) => handleChange('payment_card', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-2xl">💳</span>
              <div>
                <p className="font-medium text-gray-900">Bancontact / Kaart</p>
                <p className="text-sm text-gray-500">Betalen met bankkaart bij levering of afhaling</p>
              </div>
            </label>

            <label className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={settings.payment_online}
                onChange={(e) => handleChange('payment_online', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-2xl">🌐</span>
              <div>
                <p className="font-medium text-gray-900">Online betalen</p>
                <p className="text-sm text-gray-500">Klanten betalen vooraf via de website</p>
              </div>
            </label>
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white"
        >
          <h3 className="font-semibold text-lg mb-4">Samenvatting</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>🛍️</span>
                <span className="font-medium">Afhalen</span>
              </div>
              <p className="text-white/80 text-sm">
                {settings.pickup_enabled 
                  ? `Klaar in ${settings.pickup_time_minutes} min` 
                  : 'Uitgeschakeld'}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>🚗</span>
                <span className="font-medium">Levering</span>
              </div>
              <p className="text-white/80 text-sm">
                {settings.delivery_enabled 
                  ? `€${settings.delivery_fee} · ${settings.delivery_radius_km}km · min €${settings.min_order_amount}` 
                  : 'Uitgeschakeld'}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>💳</span>
                <span className="font-medium">Betaling</span>
              </div>
              <p className="text-white/80 text-sm">
                {[
                  settings.payment_cash && 'Cash',
                  settings.payment_card && 'Kaart',
                  settings.payment_online && 'Online',
                ].filter(Boolean).join(', ') || 'Geen'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
