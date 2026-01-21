'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useLanguage } from '@/i18n'

interface Ingredient {
  id: string
  name: string
  unit: string
  purchase_price: number
  units_per_package: number
  package_price: number
  cost_category_id: string | null
  notes: string | null
}

interface CostCategory {
  id: string
  name: string
  multiplier: number
}

const unitOptions = [
  { value: 'stuk', label: 'Stuk' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'gram', label: 'Gram (g)' },
  { value: 'liter', label: 'Liter (L)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'portie', label: 'Portie' },
  { value: 'schijf', label: 'Schijf' },
  { value: 'plak', label: 'Plak' },
  { value: 'doos', label: 'Doos' },
]

export default function IngredientsPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [categories, setCategories] = useState<CostCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    unit: 'stuk',
    purchase_price: 0,
    units_per_package: 1,
    package_price: 0,
    cost_category_id: '',
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [params.tenant])

  async function loadData() {
    const supabase = createClient()
    
    const { data: business } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('tenant_slug', params.tenant)
      .single()

    if (!business) {
      setLoading(false)
      return
    }

    setBusinessId(business.id)

    // Load categories
    const { data: cats } = await supabase
      .from('cost_categories')
      .select('*')
      .eq('business_id', business.id)
      .order('name')

    if (cats) setCategories(cats)

    // Load ingredients
    const { data: ings } = await supabase
      .from('ingredients')
      .select('*')
      .eq('business_id', business.id)
      .order('name')

    if (ings) setIngredients(ings)

    setLoading(false)
  }

  function resetForm() {
    setFormData({
      name: '',
      unit: 'stuk',
      purchase_price: 0,
      units_per_package: 1,
      package_price: 0,
      cost_category_id: '',
      notes: ''
    })
    setEditingId(null)
    setShowAddForm(false)
  }

  function startEdit(ing: Ingredient) {
    setFormData({
      name: ing.name,
      unit: ing.unit,
      purchase_price: ing.purchase_price,
      units_per_package: ing.units_per_package,
      package_price: ing.package_price,
      cost_category_id: ing.cost_category_id || '',
      notes: ing.notes || ''
    })
    setEditingId(ing.id)
    setShowAddForm(true)
  }

  async function saveIngredient() {
    if (!formData.name || !businessId) return
    
    setSaving(true)
    const supabase = createClient()

    // Calculate price per unit if package info is provided
    let pricePerUnit = formData.purchase_price
    if (formData.package_price > 0 && formData.units_per_package > 0) {
      pricePerUnit = formData.package_price / formData.units_per_package
    }

    const ingredientData = {
      business_id: businessId,
      name: formData.name,
      unit: formData.unit,
      purchase_price: pricePerUnit,
      units_per_package: formData.units_per_package,
      package_price: formData.package_price,
      cost_category_id: formData.cost_category_id || null,
      notes: formData.notes || null
    }

    if (editingId) {
      // Update
      const { data } = await supabase
        .from('ingredients')
        .update(ingredientData)
        .eq('id', editingId)
        .select()
        .single()

      if (data) {
        setIngredients(prev => prev.map(i => i.id === editingId ? data : i))
      }
    } else {
      // Insert
      const { data } = await supabase
        .from('ingredients')
        .insert(ingredientData)
        .select()
        .single()

      if (data) {
        setIngredients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      }
    }

    resetForm()
    setSaving(false)
  }

  async function deleteIngredient(id: string) {
    if (!confirm('Weet je zeker dat je dit ingrediënt wilt verwijderen?')) return
    
    const supabase = createClient()
    await supabase.from('ingredients').delete().eq('id', id)
    setIngredients(prev => prev.filter(i => i.id !== id))
  }

  const filteredIngredients = ingredients.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getCategoryName = (catId: string | null) => {
    if (!catId) return '-'
    const cat = categories.find(c => c.id === catId)
    return cat ? cat.name : '-'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🥬 Ingrediënten</h1>
          <p className="text-gray-500 mt-1">
            Beheer alle ingrediënten met hun inkoopprijzen
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddForm(true) }}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          + Ingrediënt toevoegen
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Zoek ingrediënt..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-200"
          >
            <h3 className="font-semibold mb-4">
              {editingId ? 'Ingrediënt bewerken' : 'Nieuw ingrediënt toevoegen'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Naam */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
                <input
                  type="text"
                  placeholder="bijv. Hamburger vlees"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Eenheid */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Eenheid</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  {unitOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Categorie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
                <select
                  value={formData.cost_category_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost_category_id: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Selecteer --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name} (×{cat.multiplier})</option>
                  ))}
                </select>
              </div>

              {/* Prijs per stuk OF doosprijs */}
              <div className="bg-gray-50 p-3 rounded-lg col-span-full">
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Optie 1:</strong> Vul direct de prijs per eenheid in, <strong>OF</strong><br/>
                  <strong>Optie 2:</strong> Vul doosprijs en aantal stuks in (prijs wordt automatisch berekend)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prijs per {formData.unit}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">€</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.purchase_price || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: parseFloat(e.target.value) || 0 }))}
                        className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Doos/verpakkingsprijs</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">€</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.package_price || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, package_price: parseFloat(e.target.value) || 0 }))}
                        className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aantal in doos</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.units_per_package}
                      onChange={(e) => setFormData(prev => ({ ...prev, units_per_package: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                {formData.package_price > 0 && formData.units_per_package > 0 && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ Berekende prijs per {formData.unit}: €{(formData.package_price / formData.units_per_package).toFixed(4)}
                  </p>
                )}
              </div>

              {/* Notities */}
              <div className="col-span-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notities (optioneel)</label>
                <input
                  type="text"
                  placeholder="bijv. Leverancier: Sligro"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveIngredient}
                disabled={saving || !formData.name}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {saving ? 'Opslaan...' : (editingId ? 'Bijwerken' : 'Toevoegen')}
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Annuleren
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ingredients Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ingrediënt</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Eenheid</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Categorie</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Prijs/eenheid</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Doosprijs</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredIngredients.map((ing) => (
              <tr key={ing.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{ing.name}</td>
                <td className="px-4 py-3 text-gray-600">{ing.unit}</td>
                <td className="px-4 py-3 text-gray-600">{getCategoryName(ing.cost_category_id)}</td>
                <td className="px-4 py-3 text-right font-mono">€{ing.purchase_price.toFixed(4)}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-500">
                  {ing.package_price > 0 ? `€${ing.package_price.toFixed(2)} (${ing.units_per_package}st)` : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => startEdit(ing)}
                    className="text-blue-500 hover:text-blue-700 mr-3"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteIngredient(ing.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredIngredients.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? 'Geen ingrediënten gevonden' : 'Nog geen ingrediënten toegevoegd'}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-600">
        <strong>{ingredients.length}</strong> ingrediënten in totaal
      </div>
    </div>
  )
}
