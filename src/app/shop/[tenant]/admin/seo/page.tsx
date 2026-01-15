'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function SeoPage({ params }: { params: { tenant: string } }) {
  const [saving, setSaving] = useState(false)
  const [seo, setSeo] = useState({
    title: 'Frituur De Gouden Friet | Beste frieten van Pelt',
    description: 'Bestel online de lekkerste frieten, burgers en snacks. Afhalen of levering in Pelt en omgeving. Ambachtelijk bereid sinds 1985.',
    keywords: 'frituur, friet, pelt, afhaal, levering, burgers, snacks',
    ogImage: '',
  })

  const handleChange = (key: string, value: string) => {
    setSeo(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setSaving(false)
  }

  const titleLength = seo.title.length
  const descLength = seo.description.length

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO</h1>
          <p className="text-gray-500">Optimaliseer voor zoekmachines</p>
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

      {/* SEO Fields */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-sm space-y-6"
      >
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pagina titel
          </label>
          <input
            type="text"
            value={seo.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <div className="flex justify-between mt-2">
            <p className="text-sm text-gray-500">Dit verschijnt in de browsertab en zoekresultaten</p>
            <p className={`text-sm ${titleLength > 60 ? 'text-red-500' : 'text-gray-400'}`}>
              {titleLength}/60
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meta beschrijving
          </label>
          <textarea
            value={seo.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
          />
          <div className="flex justify-between mt-2">
            <p className="text-sm text-gray-500">Korte beschrijving voor zoekresultaten</p>
            <p className={`text-sm ${descLength > 160 ? 'text-red-500' : 'text-gray-400'}`}>
              {descLength}/160
            </p>
          </div>
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zoekwoorden
          </label>
          <input
            type="text"
            value={seo.keywords}
            onChange={(e) => handleChange('keywords', e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="frituur, friet, afhaal, levering..."
          />
          <p className="text-sm text-gray-500 mt-2">Gescheiden door komma&apos;s</p>
        </div>

        {/* OG Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Social media afbeelding
          </label>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-orange-500 transition-colors cursor-pointer">
            <span className="text-4xl mb-2 block">🖼️</span>
            <p className="text-gray-500">Klik om een afbeelding te uploaden</p>
            <p className="text-sm text-gray-400">Aanbevolen: 1200 x 630 pixels</p>
          </div>
        </div>
      </motion.div>

      {/* Google Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 bg-white rounded-2xl p-6 shadow-sm"
      >
        <h3 className="font-semibold text-gray-900 mb-4">🔍 Google preview</h3>
        <div className="border rounded-xl p-4 bg-gray-50">
          <p className="text-blue-600 text-lg hover:underline cursor-pointer truncate">
            {seo.title || 'Pagina titel'}
          </p>
          <p className="text-green-700 text-sm mb-1">
            {params.tenant}.ordervysion.com
          </p>
          <p className="text-gray-600 text-sm line-clamp-2">
            {seo.description || 'Voeg een meta beschrijving toe...'}
          </p>
        </div>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-6"
      >
        <h3 className="font-semibold text-green-900 mb-2">💡 SEO Tips</h3>
        <ul className="text-green-700 text-sm space-y-1">
          <li>• Gebruik je plaatsnaam in de titel (bijv. &quot;Frituur Pelt&quot;)</li>
          <li>• Houd de titel onder 60 karakters</li>
          <li>• Beschrijf je unieke selling points in de beschrijving</li>
          <li>• Voeg relevante zoekwoorden toe die klanten gebruiken</li>
        </ul>
      </motion.div>
    </div>
  )
}
