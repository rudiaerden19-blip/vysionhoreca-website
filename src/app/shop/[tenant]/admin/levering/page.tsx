'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function LeveringPage({ params }: { params: { tenant: string } }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  const [settings, setSettings] = useState({
    pickupEnabled: true,
    pickupTime: '15',
    deliveryEnabled: true,
    deliveryTime: '30',
    deliveryFee: '2.50',
    deliveryRadius: '5',
    minimumOrder: '15',
    freeDeliveryFrom: '25',
    dineInEnabled: false,
    tableReservation: false,
  })

  const handleChange = (field: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
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
                checked={settings.pickupEnabled}
                onChange={(e) => handleChange('pickupEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          {settings.pickupEnabled && (
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bereidingstijd (minuten)
                </label>
                <select
                  value={settings.pickupTime}
                  onChange={(e) => handleChange('pickupTime', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="10">10 minuten</option>
                  <option value="15">15 minuten</option>
                  <option value="20">20 minuten</option>
                  <option value="30">30 minuten</option>
                  <option value="45">45 minuten</option>
                </select>
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
                checked={settings.deliveryEnabled}
                onChange={(e) => handleChange('deliveryEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          {settings.deliveryEnabled && (
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Levertijd (minuten)
                </label>
                <select
                  value={settings.deliveryTime}
                  onChange={(e) => handleChange('deliveryTime', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="20">20 minuten</option>
                  <option value="30">30 minuten</option>
                  <option value="45">45 minuten</option>
                  <option value="60">60 minuten</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leveringskosten
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                  <input
                    type="number"
                    step="0.50"
                    value={settings.deliveryFee}
                    onChange={(e) => handleChange('deliveryFee', e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bezorgradius (km)
                </label>
                <select
                  value={settings.deliveryRadius}
                  onChange={(e) => handleChange('deliveryRadius', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="3">3 km</option>
                  <option value="5">5 km</option>
                  <option value="10">10 km</option>
                  <option value="15">15 km</option>
                  <option value="20">20 km</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimumbedrag
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                  <input
                    type="number"
                    step="1"
                    value={settings.minimumOrder}
                    onChange={(e) => handleChange('minimumOrder', e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gratis levering vanaf
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                  <input
                    type="number"
                    step="1"
                    value={settings.freeDeliveryFrom}
                    onChange={(e) => handleChange('freeDeliveryFrom', e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Laat leeg voor nooit gratis"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Laat op 0 voor geen gratis levering</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Dine In */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🍽️</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Ter plaatse eten</h2>
                <p className="text-gray-500 text-sm">Klanten eten in je zaak</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.dineInEnabled}
                onChange={(e) => handleChange('dineInEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          {settings.dineInEnabled && (
            <div className="pt-4 border-t">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.tableReservation}
                  onChange={(e) => handleChange('tableReservation', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Tafelreserveringen toestaan</p>
                  <p className="text-sm text-gray-500">Klanten kunnen online een tafel reserveren</p>
                </div>
              </label>
            </div>
          )}
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
                {settings.pickupEnabled 
                  ? `Klaar in ${settings.pickupTime} min` 
                  : 'Uitgeschakeld'}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>🚗</span>
                <span className="font-medium">Levering</span>
              </div>
              <p className="text-white/80 text-sm">
                {settings.deliveryEnabled 
                  ? `€${settings.deliveryFee} · ${settings.deliveryRadius}km · min €${settings.minimumOrder}` 
                  : 'Uitgeschakeld'}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>🍽️</span>
                <span className="font-medium">Ter plaatse</span>
              </div>
              <p className="text-white/80 text-sm">
                {settings.dineInEnabled 
                  ? (settings.tableReservation ? 'Met reservatie' : 'Zonder reservatie')
                  : 'Uitgeschakeld'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
