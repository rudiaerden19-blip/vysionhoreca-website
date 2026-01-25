'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/i18n'

const ALLERGEN_DATA = [
  { id: 'gluten', icon: '🌾', enabled: true },
  { id: 'ei', icon: '🥚', enabled: true },
  { id: 'melk', icon: '🥛', enabled: true },
  { id: 'noten', icon: '🥜', enabled: true },
  { id: 'pinda', icon: '🥜', enabled: true },
  { id: 'soja', icon: '🫘', enabled: true },
  { id: 'vis', icon: '🐟', enabled: true },
  { id: 'schaaldieren', icon: '🦐', enabled: true },
  { id: 'weekdieren', icon: '🐚', enabled: false },
  { id: 'selderij', icon: '🥬', enabled: true },
  { id: 'mosterd', icon: '🟡', enabled: true },
  { id: 'sesam', icon: '⚪', enabled: true },
  { id: 'sulfiet', icon: '🍷', enabled: false },
  { id: 'lupine', icon: '🌸', enabled: false },
]

export default function AllergenenPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [allergens, setAllergens] = useState(ALLERGEN_DATA)
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
          <h1 className="text-2xl font-bold text-gray-900">{t('adminPages.allergenen.title')}</h1>
          <p className="text-gray-500">{t('adminPages.allergenen.subtitle')}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center gap-2"
        >
          {saving ? '⏳' : '💾'} {t('adminPages.common.save')}
        </motion.button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-sm"
      >
        <p className="text-gray-500 mb-6">
          {t('adminPages.allergenen.selectRelevant')}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {allergens.map((allergen) => {
            const allergenName = t(`adminPages.allergenen.allergenNames.${allergen.id}`)
            return (
              <motion.button
                key={allergen.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleAllergen(allergen.id)}
                className={`p-4 rounded-xl text-left transition-all ${
                  allergen.enabled 
                    ? 'bg-blue-50 border-2 border-blue-500' 
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{allergen.icon}</span>
                  <div>
                    <p className={`font-medium ${allergen.enabled ? 'text-blue-700' : 'text-gray-600'}`}>
                      {allergenName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {allergen.enabled ? t('adminPages.allergenen.active') : t('adminPages.allergenen.notActive')}
                    </p>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 bg-yellow-50 border border-yellow-200 rounded-2xl p-6"
      >
        <h3 className="font-semibold text-yellow-900 mb-2">{t('adminPages.allergenen.legalWarning')}</h3>
        <p className="text-yellow-700 text-sm">
          {t('adminPages.allergenen.legalText')}
        </p>
      </motion.div>

      {/* Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 bg-white rounded-2xl p-6 shadow-sm"
      >
        <h3 className="font-semibold text-gray-900 mb-4">{t('adminPages.allergenen.preview')}</h3>
        <div className="flex flex-wrap gap-2">
          {allergens.filter(a => a.enabled).map((allergen) => (
            <span 
              key={allergen.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
            >
              <span>{allergen.icon}</span>
              <span>{t(`adminPages.allergenen.allergenNames.${allergen.id}`)}</span>
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
