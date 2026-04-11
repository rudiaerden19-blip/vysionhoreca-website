'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'
import { useAdminConfirm } from '@/hooks/useAdminConfirm'

interface CostCategory {
  id: string
  name: string
  multiplier: number
}

// Geen default categorieën meer - tenant vult zelf in

export default function CostSettingsPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const { ask, ConfirmModal } = useAdminConfirm(t)
  const [categories, setCategories] = useState<CostCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState({ name: '', multiplier: '' })
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingValues, setEditingValues] = useState<{[key: string]: string}>({})

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant])

  async function loadData() {
    
    // Use tenant_slug directly
    setBusinessId(params.tenant)

    // Load categories
    const { data: cats } = await supabase
      .from('cost_categories')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .order('name')

    if (cats) {
      setCategories(cats)
    }

    setLoading(false)
  }

  async function updateMultiplier(id: string, multiplier: number) {
    await supabase
      .from('cost_categories')
      .update({ multiplier })
      .eq('id', id)

    setCategories(prev => prev.map(c => c.id === id ? { ...c, multiplier } : c))
  }

  async function addCategory() {
    if (!newCategory.name || !newCategory.multiplier || !businessId) return
    
    const multiplierValue = typeof newCategory.multiplier === 'string' 
      ? parseFloat(newCategory.multiplier.replace(',', '.')) 
      : newCategory.multiplier
    
    if (!multiplierValue || multiplierValue <= 0) return
    
    setSaving(true)
    
    const { data } = await supabase
      .from('cost_categories')
      .insert({
        tenant_slug: businessId,
        name: newCategory.name,
        multiplier: multiplierValue
      })
      .select()
      .single()

    if (data) {
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCategory({ name: '', multiplier: '' })
      setShowAddForm(false)
    }
    setSaving(false)
  }

  async function deleteCategory(id: string) {
    if (!(await ask(t('kostenInstellingenPage.deleteConfirm')))) return

    await supabase.from('cost_categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ConfirmModal />
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🧮 {t('kostenInstellingenPage.title')}</h1>
          <p className="text-gray-500 mt-1">
            {t('kostenInstellingenPage.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + {t('kostenInstellingenPage.addCategory')}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-800 mb-2">💡 {t('kostenInstellingenPage.howTitle')}</h3>
        <p className="text-blue-700 text-sm">
          {t('kostenInstellingenPage.howDesc')}<br/>
          <strong>{t('kostenInstellingenPage.example')}:</strong> {t('kostenInstellingenPage.exampleDesc')}
        </p>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200"
        >
          <h3 className="font-semibold mb-4">{t('kostenInstellingenPage.newCategoryTitle')}</h3>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder={t('kostenInstellingenPage.categoryNamePlaceholder')}
              value={newCategory.name}
              onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex items-center gap-2">
              <span className="text-gray-600">×</span>
              <input
                type="text"
                inputMode="decimal"
                value={newCategory.multiplier}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.')
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setNewCategory(prev => ({ ...prev, multiplier: val }))
                  }
                }}
                placeholder={t('kostenInstellingenPage.multiplierPlaceholder')}
                className="w-28 px-3 py-2 border rounded-lg text-center focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={addCategory}
              disabled={saving || !newCategory.name || !newCategory.multiplier}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {saving ? t('kostenInstellingenPage.adding') : t('kostenInstellingenPage.add')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
              <button
                onClick={() => deleteCategory(category.id)}
                className="text-red-400 hover:text-red-600 text-sm"
              >
                🗑️
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-gray-600 text-lg">×</span>
              <input
                type="text"
                inputMode="decimal"
                value={editingValues[category.id] !== undefined ? editingValues[category.id] : (category.multiplier || '')}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.')
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setEditingValues(prev => ({ ...prev, [category.id]: val }))
                  }
                }}
                onBlur={() => {
                  const val = editingValues[category.id]
                  if (val !== undefined) {
                    updateMultiplier(category.id, val === '' ? 0 : parseFloat(val) || 0)
                    setEditingValues(prev => {
                      const newVals = { ...prev }
                      delete newVals[category.id]
                      return newVals
                    })
                  }
                }}
                placeholder={t('kostenInstellingenPage.multiplierPlaceholder')}
                className="flex-1 px-4 py-3 text-2xl font-bold text-center border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <p className="text-sm text-gray-500 mt-3">
              €1.00 {t('kostenInstellingenPage.buySell')} €{category.multiplier.toFixed(2)} {t('kostenInstellingenPage.sell')}
            </p>
          </motion.div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {t('kostenInstellingenPage.noCategories')}
        </div>
      )}
    </div>
  )
}
