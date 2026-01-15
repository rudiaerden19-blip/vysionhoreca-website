'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  getProductOptions, 
  saveProductOption, 
  deleteProductOption, 
  ProductOption, 
  ProductOptionChoice 
} from '@/lib/admin-api'

export default function OptiesPage({ params }: { params: { tenant: string } }) {
  const [options, setOptions] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingOption, setEditingOption] = useState<ProductOption | null>(null)
  const [formData, setFormData] = useState<ProductOption>({
    tenant_slug: params.tenant,
    name: '',
    type: 'single',
    required: false,
    sort_order: 0,
    is_active: true,
    choices: []
  })

  // Load options on mount
  useEffect(() => {
    loadOptions()
  }, [params.tenant])

  const loadOptions = async () => {
    setLoading(true)
    const data = await getProductOptions(params.tenant)
    setOptions(data)
    setLoading(false)
  }

  const openAddModal = () => {
    setFormData({
      tenant_slug: params.tenant,
      name: '',
      type: 'single',
      required: false,
      sort_order: options.length,
      is_active: true,
      choices: [{ tenant_slug: params.tenant, name: '', price: 0, sort_order: 0, is_active: true }]
    })
    setEditingOption(null)
    setShowModal(true)
  }

  const openEditModal = (option: ProductOption) => {
    setFormData({
      ...option,
      choices: option.choices && option.choices.length > 0 
        ? option.choices 
        : [{ tenant_slug: params.tenant, name: '', price: 0, sort_order: 0, is_active: true }]
    })
    setEditingOption(option)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingOption(null)
    setError('')
  }

  const addChoice = () => {
    setFormData(prev => ({
      ...prev,
      choices: [
        ...(prev.choices || []),
        { tenant_slug: params.tenant, name: '', price: 0, sort_order: (prev.choices?.length || 0), is_active: true }
      ]
    }))
  }

  const removeChoice = (index: number) => {
    setFormData(prev => ({
      ...prev,
      choices: prev.choices?.filter((_, i) => i !== index) || []
    }))
  }

  const updateChoice = (index: number, field: keyof ProductOptionChoice, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      choices: prev.choices?.map((choice, i) => 
        i === index ? { ...choice, [field]: value } : choice
      ) || []
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Vul een naam in voor de optie')
      return
    }

    const validChoices = formData.choices?.filter(c => c.name.trim() !== '') || []
    if (validChoices.length === 0) {
      setError('Voeg minstens één keuze toe')
      return
    }

    setSaving(true)
    setError('')

    const optionToSave: ProductOption = {
      ...formData,
      id: editingOption?.id,
      choices: validChoices
    }

    const result = await saveProductOption(optionToSave)

    if (result) {
      await loadOptions()
      closeModal()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError('Opslaan mislukt. Probeer opnieuw.')
    }

    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Weet je zeker dat je deze optie wilt verwijderen? Alle keuzes worden ook verwijderd.')) {
      const success = await deleteProductOption(id)
      if (success) {
        setOptions(prev => prev.filter(o => o.id !== id))
      } else {
        setError('Verwijderen mislukt')
      }
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Opties & Extra&apos;s</h1>
          <p className="text-gray-500">Beheer keuzes die klanten kunnen maken</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAddModal}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center gap-2"
        >
          <span>➕</span>
          <span>Nieuwe optie</span>
        </motion.button>
      </div>

      {/* Success Message */}
      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 flex items-center gap-2"
        >
          <span>✓</span> Opgeslagen!
        </motion.div>
      )}

      {/* Error Message */}
      {error && !showModal && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

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
                <button 
                  onClick={() => openEditModal(option)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => handleDelete(option.id!)}
                  className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {option.choices?.map((choice) => (
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
            onClick={openAddModal}
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
        </ul>
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingOption ? 'Optie bewerken' : 'Nieuwe optie'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Error in Modal */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                    {error}
                  </div>
                )}

                {/* Option Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Naam van de optie *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Bijv. Formaat, Saus, Extra toppings"
                  />
                </div>

                {/* Type & Required */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type keuze
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'single' | 'multiple' }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="single">☝️ Enkele keuze</option>
                      <option value="multiple">✅ Meerdere keuzes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verplicht?
                    </label>
                    <div className="flex items-center gap-4 h-12">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.required}
                          onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                          className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span>Ja, klant moet kiezen</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Choices */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Keuzes *
                  </label>
                  <div className="space-y-3">
                    {formData.choices?.map((choice, index) => (
                      <div key={index} className="flex gap-3 items-center">
                        <input
                          type="text"
                          value={choice.name}
                          onChange={(e) => updateChoice(index, 'name', e.target.value)}
                          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Naam (bijv. Klein, Medium, Groot)"
                        />
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={choice.price || ''}
                            onChange={(e) => updateChoice(index, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full pl-8 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                        {(formData.choices?.length || 0) > 1 && (
                          <button
                            onClick={() => removeChoice(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addChoice}
                    className="mt-3 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-orange-500 hover:text-orange-500 transition-colors"
                  >
                    + Keuze toevoegen
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t bg-gray-50 flex justify-end gap-4">
                <button
                  onClick={closeModal}
                  className="px-6 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
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
                  ) : (
                    <span>{editingOption ? 'Opslaan' : 'Toevoegen'}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
