'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/i18n'

const defaultAllergens = [
  { id: 'gluten', name: 'Gluten', icon: '🌾', enabled: true },
  { id: 'ei', name: 'Eieren', icon: '🥚', enabled: true },
  { id: 'melk', name: 'Melk', icon: '🥛', enabled: true },
  { id: 'noten', name: 'Noten', icon: '🥜', enabled: true },
  { id: 'pinda', name: 'Pinda', icon: '🥜', enabled: true },
  { id: 'soja', name: 'Soja', icon: '🫘', enabled: true },
  { id: 'vis', name: 'Vis', icon: '🐟', enabled: true },
  { id: 'schaaldieren', name: 'Schaaldieren', icon: '🦐', enabled: true },
  { id: 'weekdieren', name: 'Weekdieren', icon: '🐚', enabled: false },
  { id: 'selderij', name: 'Selderij', icon: '🥬', enabled: true },
  { id: 'mosterd', name: 'Mosterd', icon: '🟡', enabled: true },
  { id: 'sesam', name: 'Sesamzaad', icon: '⚪', enabled: true },
  { id: 'sulfiet', name: 'Sulfiet', icon: '🍷', enabled: false },
  { id: 'lupine', name: 'Lupine', icon: '🌸', enabled: false },
]

export default function AllergenenPage({ params }: { params: { tenant: string } }) {
  const [allergens, setAllergens] = useState(defaultAllergens)
  const [saving, setSaving] = useState(false)

  const toggleAllergen = (id: string) => {
    setAllergens(prev => prev.map(a => 
      a.id === id ? { ...a, enabled: !a.enabled } : a
    ))
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Allergenen</h1>
          <p className="text-gray-500">Beheer welke allergenen je wilt tonen</p>
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-sm"
      >
        <p className="text-gray-500 mb-6">
          Selecteer welke allergenen relevant zijn voor jouw zaak. 
          Deze kun je dan bij elk product aangeven.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {allergens.map((allergen) => (
            <motion.button
              key={allergen.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleAllergen(allergen.id)}
              className={`p-4 rounded-xl text-left transition-all ${
                allergen.enabled 
                  ? 'bg-orange-50 border-2 border-orange-500' 
                  : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{allergen.icon}</span>
                <div>
                  <p className={`font-medium ${allergen.enabled ? 'text-orange-700' : 'text-gray-600'}`}>
                    {allergen.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {allergen.enabled ? '✓ Actief' : 'Niet actief'}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 bg-yellow-50 border border-yellow-200 rounded-2xl p-6"
      >
        <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Wettelijke verplichting</h3>
        <p className="text-yellow-700 text-sm">
          In België en Nederland ben je wettelijk verplicht om de 14 hoofdallergenen te vermelden. 
          Zorg ervoor dat je bij elk product de juiste allergenen aangeeft.
        </p>
      </motion.div>

      {/* Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 bg-white rounded-2xl p-6 shadow-sm"
      >
        <h3 className="font-semibold text-gray-900 mb-4">Preview op website</h3>
        <div className="flex flex-wrap gap-2">
          {allergens.filter(a => a.enabled).map((allergen) => (
            <span 
              key={allergen.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
            >
              <span>{allergen.icon}</span>
              <span>{allergen.name}</span>
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
