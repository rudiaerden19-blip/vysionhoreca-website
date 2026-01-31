'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getTenantSettings, saveTenantSettings, TenantSettings } from '@/lib/admin-api'

const colorPresets = [
  // Rij 1 - Warm
  { nameKey: 'orange', primary: '#FF6B35', secondary: '#FFA500' },
  { nameKey: 'red', primary: '#E53935', secondary: '#FF5252' },
  { nameKey: 'coral', primary: '#FF6F61', secondary: '#FF8A80' },
  { nameKey: 'amber', primary: '#FF8F00', secondary: '#FFB300' },
  // Rij 2 - Koel
  { nameKey: 'blue', primary: '#1E88E5', secondary: '#42A5F5' },
  { nameKey: 'indigo', primary: '#3949AB', secondary: '#5C6BC0' },
  { nameKey: 'teal', primary: '#00897B', secondary: '#26A69A' },
  { nameKey: 'cyan', primary: '#00ACC1', secondary: '#26C6DA' },
  // Rij 3 - Natuur
  { nameKey: 'green', primary: '#43A047', secondary: '#66BB6A' },
  { nameKey: 'lime', primary: '#7CB342', secondary: '#9CCC65' },
  { nameKey: 'forest', primary: '#2E7D32', secondary: '#4CAF50' },
  { nameKey: 'mint', primary: '#00BFA5', secondary: '#64FFDA' },
  // Rij 4 - Luxe
  { nameKey: 'purple', primary: '#8E24AA', secondary: '#AB47BC' },
  { nameKey: 'pink', primary: '#D81B60', secondary: '#EC407A' },
  { nameKey: 'gold', primary: '#C9A227', secondary: '#D4AF37' },
  { nameKey: 'bronze', primary: '#8D6E63', secondary: '#A1887F' },
  // Rij 5 - Neutraal
  { nameKey: 'dark', primary: '#37474F', secondary: '#546E7A' },
  { nameKey: 'black', primary: '#212121', secondary: '#424242' },
  { nameKey: 'slate', primary: '#455A64', secondary: '#607D8B' },
  { nameKey: 'brown', primary: '#5D4037', secondary: '#795548' },
]

export default function DesignPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [primaryColor, setPrimaryColor] = useState('#FF6B35')
  const [secondaryColor, setSecondaryColor] = useState('#FFA500')
  const [darkMode, setDarkMode] = useState(false)

  // Load current settings
  useEffect(() => {
    async function loadSettings() {
      setLoading(true)
      const data = await getTenantSettings(params.tenant)
      if (data) {
        setSettings(data)
        setPrimaryColor(data.primary_color || '#FF6B35')
        setSecondaryColor(data.secondary_color || '#FFA500')
        setDarkMode(data.dark_mode || false)
      }
      setLoading(false)
    }
    loadSettings()
  }, [params.tenant])

  const handleSave = async () => {
    if (!settings) return
    
    setSaving(true)
    setError('')
    
    const updatedSettings: TenantSettings = {
      ...settings,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      dark_mode: darkMode,
    }
    
    const success = await saveTenantSettings(updatedSettings)
    
    if (success) {
      setSettings(updatedSettings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError(t('websiteDesign.saveFailed'))
    }
    setSaving(false)
  }

  const applyPreset = (preset: typeof colorPresets[0]) => {
    setPrimaryColor(preset.primary)
    setSecondaryColor(preset.secondary)
    setSaved(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">{t('adminPages.common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Floating Save Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSave}
        disabled={saving}
        className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl font-medium shadow-2xl flex items-center gap-2 ${
          saved ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {saving ? (
          <>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            <span>{t('adminPages.common.saving')}</span>
          </>
        ) : saved ? (
          <><span>✓</span><span>{t('adminPages.common.saved')}</span></>
        ) : (
          <><span>💾</span><span>{t('adminPages.common.save')}</span></>
        )}
      </motion.button>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('websiteDesign.title')}</h1>
          <p className="text-gray-500">{t('websiteDesign.subtitle')}</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="space-y-6">
          {/* Color Presets */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🎨</span> {t('websiteDesign.colorScheme')}
            </h2>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {colorPresets.map((preset) => (
                <button
                  key={preset.nameKey}
                  onClick={() => applyPreset(preset)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    primaryColor === preset.primary 
                      ? 'border-gray-900 shadow-lg' 
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <div 
                    className="w-full aspect-square rounded-lg mb-2"
                    style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }}
                  />
                  <p className="text-xs text-gray-600 text-center">{t(`websiteDesign.colors.${preset.nameKey}`)}</p>
                </button>
              ))}
            </div>

            {/* Custom Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('websiteDesign.primaryColor')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => { setPrimaryColor(e.target.value); setSaved(false); }}
                    className="w-12 h-12 rounded-lg cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => { setPrimaryColor(e.target.value); setSaved(false); }}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('websiteDesign.secondaryColor')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => { setSecondaryColor(e.target.value); setSaved(false); }}
                    className="w-12 h-12 rounded-lg cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => { setSecondaryColor(e.target.value); setSaved(false); }}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Dark Mode Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🌙</span> {t('websiteDesign.darkMode') || 'Donker thema'}
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{t('websiteDesign.darkModeTitle') || 'Donker thema voor webshop'}</p>
                <p className="text-sm text-gray-500">{t('websiteDesign.darkModeDesc') || 'Geef je shop een warme, donkere uitstraling'}</p>
              </div>
              <button
                onClick={() => { setDarkMode(!darkMode); setSaved(false); }}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  darkMode ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <div 
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    darkMode ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
            {darkMode && (
              <div className="mt-4 p-4 bg-[#1a1a1a] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#2a2a2a] flex items-center justify-center">
                    <span style={{ color: primaryColor }}>🍟</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Preview donker thema</p>
                    <p className="text-gray-400 text-xs">Zo ziet je shop eruit</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-50 border border-blue-200 rounded-2xl p-6"
          >
            <h3 className="font-semibold text-blue-900 mb-2">💡 {t('websiteDesign.tip')}</h3>
            <p className="text-blue-700 text-sm">
              {t('websiteDesign.tipText')}
            </p>
          </motion.div>
        </div>

        {/* Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:sticky lg:top-6"
        >
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>👁️</span> {t('websiteDesign.livePreview')}
            </h2>
            
            {/* Mini Preview */}
            <div 
              className={`rounded-xl overflow-hidden border ${darkMode ? 'bg-[#0d0d0d] border-[#333]' : 'bg-white'}`}
              style={{ minHeight: '400px' }}
            >
              {/* Mini Header */}
              <div 
                className={`h-32 relative ${darkMode ? 'bg-[#1a1a1a]' : ''}`}
                style={!darkMode ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` } : {}}
              >
                <div className="absolute bottom-4 left-4">
                  <div className={`text-xs font-bold mb-1 ${darkMode ? 'text-white' : 'text-white'}`}>
                    {settings?.business_name || 'Je Zaak Naam'}
                  </div>
                  <div className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-white/70'}`}>{settings?.tagline || t('websiteDesign.taglineHere')}</div>
                </div>
              </div>

              {/* Mini Content */}
              <div className="p-4">
                {/* Mini Category Pills */}
                <div className="flex gap-2 mb-4 overflow-hidden">
                  <div 
                    className="px-3 py-1 text-xs font-medium text-white rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {t('websiteDesign.previewAll')}
                  </div>
                  <div className={`px-3 py-1 text-xs font-medium rounded-full ${darkMode ? 'bg-[#2a2a2a] text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    {t('websiteDesign.previewFries')}
                  </div>
                  <div className={`px-3 py-1 text-xs font-medium rounded-full ${darkMode ? 'bg-[#2a2a2a] text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    {t('websiteDesign.previewSnacks')}
                  </div>
                </div>

                {/* Mini Product Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2].map((i) => (
                    <div 
                      key={i} 
                      className={`rounded-xl overflow-hidden ${darkMode ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}
                    >
                      <div className={`h-16 ${darkMode ? 'bg-[#2a2a2a]' : 'bg-gray-300'}`} />
                      <div className="p-2">
                        <div className={`h-2 w-16 rounded mb-1 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`} />
                        <div 
                          className="h-2 w-10 rounded"
                          style={{ backgroundColor: primaryColor }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mini CTA Button */}
                <button 
                  className="w-full mt-4 py-2 text-white text-xs font-medium rounded-xl"
                  style={{ backgroundColor: primaryColor }}
                >
                  {t('websiteDesign.orderNow')}
                </button>
              </div>
            </div>

            <a
              href={`/shop/${params.tenant}`}
              target="_blank"
              className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <span>{t('websiteDesign.viewFullWebsite')}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
