'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

const colorPresets = [
  { name: 'Oranje', primary: '#FF6B35', secondary: '#FFA500' },
  { name: 'Rood', primary: '#E53935', secondary: '#FF5252' },
  { name: 'Blauw', primary: '#1E88E5', secondary: '#42A5F5' },
  { name: 'Groen', primary: '#43A047', secondary: '#66BB6A' },
  { name: 'Paars', primary: '#8E24AA', secondary: '#AB47BC' },
  { name: 'Roze', primary: '#D81B60', secondary: '#EC407A' },
  { name: 'Teal', primary: '#00897B', secondary: '#26A69A' },
  { name: 'Donker', primary: '#37474F', secondary: '#546E7A' },
]

export default function DesignPage({ params }: { params: { tenant: string } }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#FF6B35')
  const [secondaryColor, setSecondaryColor] = useState('#FFA500')
  const [darkMode, setDarkMode] = useState(false)
  const [roundedCorners, setRoundedCorners] = useState(true)
  const [showAnimations, setShowAnimations] = useState(true)

  const handleSave = async () => {
    setSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const applyPreset = (preset: typeof colorPresets[0]) => {
    setPrimaryColor(preset.primary)
    setSecondaryColor(preset.secondary)
    setSaved(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Design & kleuren</h1>
          <p className="text-gray-500">Pas het uiterlijk van je website aan</p>
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
              <span>🎨</span> Kleurenschema
            </h2>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {colorPresets.map((preset) => (
                <button
                  key={preset.name}
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
                  <p className="text-xs text-gray-600 text-center">{preset.name}</p>
                </button>
              ))}
            </div>

            {/* Custom Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hoofdkleur
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
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accentkleur
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
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent uppercase"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Style Options */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>✨</span> Stijl opties
            </h2>
            
            <div className="space-y-4">
              {/* Dark Mode */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">Donkere modus</p>
                  <p className="text-sm text-gray-500">Website in donkere kleuren</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(e) => { setDarkMode(e.target.checked); setSaved(false); }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              {/* Rounded Corners */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">Afgeronde hoeken</p>
                  <p className="text-sm text-gray-500">Moderne, zachte vormgeving</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roundedCorners}
                    onChange={(e) => { setRoundedCorners(e.target.checked); setSaved(false); }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              {/* Animations */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">Animaties</p>
                  <p className="text-sm text-gray-500">Vloeiende overgangen en effecten</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAnimations}
                    onChange={(e) => { setShowAnimations(e.target.checked); setSaved(false); }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
            </div>
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
              <span>👁️</span> Live preview
            </h2>
            
            {/* Mini Preview */}
            <div 
              className={`rounded-xl overflow-hidden border ${darkMode ? 'bg-gray-900' : 'bg-white'}`}
              style={{ minHeight: '400px' }}
            >
              {/* Mini Header */}
              <div 
                className="h-32 relative"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                <div className="absolute bottom-4 left-4">
                  <div className={`text-xs font-bold mb-1 ${darkMode ? 'text-white' : 'text-white'}`}>
                    Je Zaak Naam
                  </div>
                  <div className="text-white/70 text-[10px]">Tagline hier</div>
                </div>
              </div>

              {/* Mini Content */}
              <div className="p-4">
                {/* Mini Category Pills */}
                <div className="flex gap-2 mb-4 overflow-hidden">
                  <div 
                    className={`px-3 py-1 text-xs font-medium text-white ${roundedCorners ? 'rounded-full' : 'rounded'}`}
                    style={{ backgroundColor: primaryColor }}
                  >
                    Alles
                  </div>
                  <div className={`px-3 py-1 text-xs font-medium ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'} ${roundedCorners ? 'rounded-full' : 'rounded'}`}>
                    Frieten
                  </div>
                  <div className={`px-3 py-1 text-xs font-medium ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'} ${roundedCorners ? 'rounded-full' : 'rounded'}`}>
                    Snacks
                  </div>
                </div>

                {/* Mini Product Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2].map((i) => (
                    <div 
                      key={i} 
                      className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} ${roundedCorners ? 'rounded-xl' : 'rounded'} overflow-hidden`}
                    >
                      <div className="h-16 bg-gray-300" />
                      <div className="p-2">
                        <div className={`h-2 w-16 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-1`} />
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
                  className={`w-full mt-4 py-2 text-white text-xs font-medium ${roundedCorners ? 'rounded-xl' : 'rounded'}`}
                  style={{ backgroundColor: primaryColor }}
                >
                  Bestel Nu
                </button>
              </div>
            </div>

            <a
              href={`/shop/${params.tenant}`}
              target="_blank"
              className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <span>Bekijk volledige website</span>
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
