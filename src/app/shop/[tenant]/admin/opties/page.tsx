'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface Option {
  id: string
  name: string
  type: 'single' | 'multiple'
  required: boolean
  choices: { id: string; name: string; price: number }[]
}

export default function OptiesPage({ params }: { params: { tenant: string } }) {
  const [options, setOptions] = useState<Option[]>([
    {
      id: '1',
      name: 'Formaat friet',
      type: 'single',
      required: true,
      choices: [
        { id: '1a', name: 'Klein', price: 0 },
        { id: '1b', name: 'Medium', price: 0.50 },
        { id: '1c', name: 'Groot', price: 1.00 },
      ]
    },
    {
      id: '2',
      name: 'Saus',
      type: 'single',
      required: false,
      choices: [
        { id: '2a', name: 'Mayonaise', price: 0 },
        { id: '2b', name: 'Ketchup', price: 0 },
        { id: '2c', name: 'Curry', price: 0 },
        { id: '2d', name: 'Stoofvleessaus', price: 1.50 },
      ]
    },
    {
      id: '3',
      name: 'Extra toppings',
      type: 'multiple',
      required: false,
      choices: [
        { id: '3a', name: 'Extra kaas', price: 0.75 },
        { id: '3b', name: 'Bacon', price: 1.00 },
        { id: '3c', name: 'Ui', price: 0.25 },
      ]
    },
  ])
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setSaving(false)
  }

  const deleteOption = (id: string) => {
    if (confirm('Weet je zeker dat je deze optie wilt verwijderen?')) {
      setOptions(prev => prev.filter(o => o.id !== id))
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opties & Extra&apos;s</h1>
          <p className="text-gray-500">Beheer keuzes die klanten kunnen maken</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium"
          >
            + Nieuwe optie
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium"
          >
            {saving ? '⏳' : '💾'} Opslaan
          </motion.button>
        </div>
      </div>

      {/* Options List */}
      <div className="space-y-4">
        {options.map((option, index) => (
          <motion.div
            key={option.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{option.name}</h3>
                <div className="flex gap-2 mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    option.type === 'single' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {option.type === 'single' ? '☝️ Enkele keuze' : '✅ Meerdere keuzes'}
                  </span>
                  {option.required && (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                      Verplicht
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">✏️</button>
                <button 
                  onClick={() => deleteOption(option.id)}
                  className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {option.choices.map((choice) => (
                <div 
                  key={choice.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <span className="text-gray-700">{choice.name}</span>
                  <span className={`font-medium ${choice.price > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                    {choice.price > 0 ? `+€${choice.price.toFixed(2)}` : 'Gratis'}
                  </span>
                </div>
              ))}
              <button className="flex items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-orange-500 hover:text-orange-500 transition-colors">
                + Keuze toevoegen
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {options.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <span className="text-6xl mb-4 block">⚙️</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Nog geen opties</h3>
          <p className="text-gray-500 mb-6">Voeg opties toe zoals formaten, sauzen of extra&apos;s</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-xl"
          >
            + Eerste optie toevoegen
          </button>
        </div>
      )}

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6"
      >
        <h3 className="font-semibold text-blue-900 mb-2">💡 Hoe werken opties?</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• <strong>Enkele keuze:</strong> Klant kiest 1 optie (bijv. formaat)</li>
          <li>• <strong>Meerdere keuzes:</strong> Klant kan meerdere selecteren (bijv. toppings)</li>
          <li>• <strong>Verplicht:</strong> Klant moet kiezen voordat ze bestellen</li>
          <li>• Koppel opties aan producten in het producten beheer</li>
        </ul>
      </motion.div>
    </div>
  )
}
