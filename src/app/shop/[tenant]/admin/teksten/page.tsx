'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function TekstenPage({ params }: { params: { tenant: string } }) {
  const [saving, setSaving] = useState(false)
  const [texts, setTexts] = useState({
    heroTitle: 'Welkom bij onze zaak',
    heroSubtitle: 'De lekkerste frieten van de streek',
    aboutTitle: 'Ons verhaal',
    aboutText: 'Al meer dan 35 jaar serveren wij de lekkerste frieten...',
    orderButtonText: 'Bestel Nu',
    pickupLabel: 'Afhalen',
    deliveryLabel: 'Levering',
    closedMessage: 'Momenteel gesloten',
    minOrderMessage: 'Minimum bestelbedrag: €{amount}',
    cartEmptyMessage: 'Je winkelwagen is leeg',
    checkoutButtonText: 'Afrekenen',
  })

  const handleChange = (key: string, value: string) => {
    setTexts(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setSaving(false)
  }

  const textFields = [
    { section: 'Hero sectie', fields: [
      { key: 'heroTitle', label: 'Titel', placeholder: 'Welkom bij...' },
      { key: 'heroSubtitle', label: 'Ondertitel', placeholder: 'De lekkerste...' },
    ]},
    { section: 'Over ons', fields: [
      { key: 'aboutTitle', label: 'Titel', placeholder: 'Ons verhaal' },
      { key: 'aboutText', label: 'Tekst', placeholder: 'Vertel je verhaal...', multiline: true },
    ]},
    { section: 'Knoppen', fields: [
      { key: 'orderButtonText', label: 'Bestel knop', placeholder: 'Bestel Nu' },
      { key: 'pickupLabel', label: 'Afhalen label', placeholder: 'Afhalen' },
      { key: 'deliveryLabel', label: 'Levering label', placeholder: 'Levering' },
      { key: 'checkoutButtonText', label: 'Afrekenen knop', placeholder: 'Afrekenen' },
    ]},
    { section: 'Berichten', fields: [
      { key: 'closedMessage', label: 'Gesloten melding', placeholder: 'Momenteel gesloten' },
      { key: 'minOrderMessage', label: 'Minimum bestelling', placeholder: 'Gebruik {amount} voor bedrag' },
      { key: 'cartEmptyMessage', label: 'Lege winkelwagen', placeholder: 'Je winkelwagen is leeg' },
    ]},
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teksten</h1>
          <p className="text-gray-500">Pas alle teksten op je website aan</p>
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

      <div className="space-y-6">
        {textFields.map((section, sectionIndex) => (
          <motion.div
            key={section.section}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{section.section}</h2>
            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                  </label>
                  {field.multiline ? (
                    <textarea
                      value={texts[field.key as keyof typeof texts]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={texts[field.key as keyof typeof texts]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Language Note */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6"
      >
        <h3 className="font-semibold text-blue-900 mb-2">🌍 Meerdere talen?</h3>
        <p className="text-blue-700 text-sm">
          Wil je je website in meerdere talen aanbieden? 
          Neem contact op voor het activeren van meertaligheid.
        </p>
      </motion.div>
    </div>
  )
}
