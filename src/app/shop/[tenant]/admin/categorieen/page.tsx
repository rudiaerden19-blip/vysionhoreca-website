'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, Reorder } from 'framer-motion'
import {
  getMenuCategories,
  getMenuProducts,
  saveMenuCategory,
  deleteMenuCategory,
  bulkSaveMenuCategories,
  MenuCategory,
} from '@/lib/admin-api'
import { useLanguage } from '@/i18n'
import PinGate from '@/components/PinGate'
import { useAdminConfirm } from '@/hooks/useAdminConfirm'

export default function CategorieenPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const { ask, ConfirmModal } = useAdminConfirm(t)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [productCounts, setProductCounts] = useState<Record<string, number>>({})
  const saveInFlightRef = useRef(false)

  const refreshCategoriesAndProductCounts = useCallback(async () => {
    const [cats, prods] = await Promise.all([
      getMenuCategories(params.tenant),
      getMenuProducts(params.tenant),
    ])
    setCategories(cats)
    const counts: Record<string, number> = {}
    for (const p of prods) {
      const cid = p.category_id
      if (cid == null || cid === '') continue
      const key = String(cid)
      counts[key] = (counts[key] ?? 0) + 1
    }
    setProductCounts(counts)
  }, [params.tenant])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await refreshCategoriesAndProductCounts()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshCategoriesAndProductCounts])

  const toggleVisible = (id: string) => {
    setCategories(prev => prev.map(c => 
      c.id === id ? { ...c, is_active: !c.is_active } : c
    ))
    setSaved(false)
  }

  const handleDelete = async (id: string) => {
    const n = productCounts[id] ?? 0
    const confirmMsg =
      n > 0
        ? t('adminPages.categorieen.confirmDeleteHasProducts').replace('{count}', String(n))
        : t('adminPages.categorieen.confirmDelete')
    if (!(await ask(confirmMsg))) return
    const success = await deleteMenuCategory(id, params.tenant)
    if (success) {
      await refreshCategoriesAndProductCounts()
    } else {
      setError(t('adminPages.categorieen.deleteFailed'))
    }
  }

  const addCategory = async () => {
    if (newCategory.trim()) {
      const newCat: MenuCategory = {
        tenant_slug: params.tenant,
        name: newCategory.trim(),
        description: '',
        sort_order: categories.length,
        is_active: true,
      }
      
      const saved = await saveMenuCategory(newCat)
      if (saved) {
        await refreshCategoriesAndProductCounts()
        setNewCategory('')
      } else {
        setError(t('adminPages.categorieen.addFailed'))
      }
    }
  }

  const updateName = (id: string, name: string) => {
    setCategories(prev => prev.map(c => 
      c.id === id ? { ...c, name } : c
    ))
    setSaved(false)
  }

  const handleSave = async () => {
    if (saveInFlightRef.current) return
    saveInFlightRef.current = true
    setSaving(true)
    setError('')

    try {
      const missingId = categories.some((c) => !c.id || String(c.id).trim() === '')
      if (missingId) {
        setError(t('adminPages.categorieen.saveFailed'))
        return
      }

      const bulk = await bulkSaveMenuCategories(params.tenant, categories)
      await refreshCategoriesAndProductCounts()

      if (bulk.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        setError(bulk.error || t('adminPages.categorieen.saveFailed'))
      }
    } finally {
      saveInFlightRef.current = false
      setSaving(false)
    }
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
    <PinGate tenant={params.tenant}>
    <div className="max-w-3xl mx-auto">
      <ConfirmModal />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adminPages.categorieen.title')}</h1>
          <p className="text-gray-500">{t('adminPages.categorieen.subtitle')}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
            saved 
              ? 'bg-green-500 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {saving ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
              <span>{t('adminPages.common.saving')}</span>
            </>
          ) : saved ? (
            <>
              <span>✓</span>
              <span>{t('adminPages.common.saved')}</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>{t('adminPages.common.save')}</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      {/* Add New */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 flex gap-3 items-center border border-dashed border-blue-200">
        <span className="text-2xl">📂</span>
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Naam nieuwe categorie..."
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
          onKeyDown={(e) => e.key === 'Enter' && addCategory()}
        />
        <button
          onClick={addCategory}
          disabled={!newCategory.trim()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-medium transition-colors whitespace-nowrap"
        >
          + Toevoegen
        </button>
      </div>

      {/* Categories List */}
      <motion.div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
          <span className="text-gray-400 text-sm">☰</span>
          <p className="text-sm text-gray-500">
            {t('adminPages.categorieen.dragHintShort')}
          </p>
        </div>
        {categories.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-5xl mb-4 block">📂</span>
            <p className="text-gray-500 font-medium mb-1">Nog geen categorieën</p>
            <p className="text-gray-400 text-sm">Voeg hierboven een eerste categorie toe</p>
          </div>
        ) : (
          <Reorder.Group values={categories} onReorder={setCategories} className="divide-y divide-gray-100">
            {categories.map((category) => {
              const cid = category.id ? String(category.id) : ''
              const cnt = cid ? (productCounts[cid] ?? 0) : 0
              const countLabel =
                cnt === 0
                  ? t('adminPages.categorieen.productCountZero')
                  : t('adminPages.categorieen.productCount').replace('{count}', String(cnt))
              return (
              <Reorder.Item key={category.id} value={category} className="bg-white hover:bg-gray-50 cursor-grab active:cursor-grabbing transition-colors">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span className="text-gray-300 text-lg select-none">⠿</span>

                  {editingId === category.id ? (
                    <input
                      type="text"
                      value={category.name}
                      onChange={(e) => updateName(category.id!, e.target.value)}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                      autoFocus
                      className="flex-1 px-3 py-1.5 border-2 border-blue-500 rounded-lg focus:outline-none text-base font-medium"
                    />
                  ) : (
                    <span
                      className="flex-1 font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => setEditingId(category.id!)}
                      title="Klik om naam te bewerken"
                    >
                      {category.name}
                    </span>
                  )}

                  <span
                    className="shrink-0 text-xs font-medium text-gray-500 tabular-nums sm:w-36 sm:text-right"
                    title={t('adminPages.categorieen.productCountTitle')}
                  >
                    {countLabel}
                  </span>

                  {/* Zichtbaar toggle */}
                  <button
                    onClick={() => toggleVisible(category.id!)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${category.is_active ? 'bg-green-500' : 'bg-gray-200'}`}
                    title={category.is_active ? t('adminPages.categorieen.visible') : t('adminPages.categorieen.hidden')}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${category.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>

                  <span className={`text-xs font-medium w-16 text-right ${category.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                    {category.is_active ? t('adminPages.categorieen.visible') : t('adminPages.categorieen.hidden')}
                  </span>

                  <button
                    onClick={() => handleDelete(category.id!)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('adminPages.common.delete')}
                  >
                    🗑️
                  </button>
                </div>
              </Reorder.Item>
              )
            })}
          </Reorder.Group>
        )}
      </motion.div>

      <p className="mt-6 text-center text-sm text-gray-500">
        {t('adminPages.categorieen.saveReminder')}
      </p>
    </div>
    </PinGate>
  )
}
