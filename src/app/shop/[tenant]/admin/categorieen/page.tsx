'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, Reorder, useDragControls } from 'framer-motion'
import {
  getMenuCategories,
  getMenuProducts,
  saveMenuCategory,
  deleteMenuCategory,
  bulkSaveMenuCategories,
  dedupeCatalogById,
  MenuCategory,
} from '@/lib/admin-api'
import { CATEGORY_VAT_PERCENT_OPTIONS } from '@/lib/order-vat'
import { useLanguage } from '@/i18n'
import PinGate from '@/components/PinGate'
import { useAdminConfirm } from '@/hooks/useAdminConfirm'
import MediaPicker from '@/components/MediaPicker'

const CATEGORIEEN_SCROLL_CLASS =
  '-mx-4 -mt-4 md:-mx-6 md:-mt-6 min-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] px-4 pt-4 md:px-6 md:pt-6 pb-[max(8rem,env(safe-area-inset-bottom))]'

type CategoryRowProps = {
  category: MenuCategory
  tenant: string
  editingId: string | null
  setEditingId: (id: string | null) => void
  productCounts: Record<string, number>
  updateName: (id: string, name: string) => void
  updateCategoryImage: (id: string, image_url: string) => void
  updateCategoryDefaultBtw: (id: string, value: string) => void
  toggleVisible: (id: string) => void
  handleDelete: (id: string) => void
  t: (key: string) => string
  optionsPlacement: 'below' | 'above'
}

function CategoryReorderRow({
  category,
  tenant,
  editingId,
  setEditingId,
  productCounts,
  updateName,
  updateCategoryImage,
  updateCategoryDefaultBtw,
  toggleVisible,
  handleDelete,
  t,
  optionsPlacement,
}: CategoryRowProps) {
  const dragControls = useDragControls()
  const cid = category.id ? String(category.id) : ''
  const cnt = cid ? (productCounts[cid] ?? 0) : 0
  const countLabel =
    cnt === 0
      ? t('adminPages.categorieen.productCountZero')
      : t('adminPages.categorieen.productCount').replace('{count}', String(cnt))

  return (
    <Reorder.Item
      value={category}
      dragListener={false}
      dragControls={dragControls}
      className="bg-white hover:bg-gray-50 transition-colors touch-pan-y"
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-3 px-4 py-3.5 sm:items-center sm:flex-nowrap">
        <span
          className="text-gray-300 text-lg select-none shrink-0 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={(e) => dragControls.start(e)}
          aria-hidden
        >
          ⠿
        </span>

        <div className="shrink-0 w-full min-[480px]:w-[9.5rem] sm:max-w-[9.5rem]">
          <MediaPicker
            tenantSlug={tenant}
            value={(category.image_url || '').trim()}
            onChange={(url) => updateCategoryImage(category.id!, url)}
            label={t('adminPages.categorieen.image')}
            optionsPlacement={optionsPlacement}
          />
        </div>

        <div className="flex flex-1 min-w-[120px] flex-col gap-1">
          {editingId === category.id ? (
            <input
              type="text"
              value={category.name}
              onChange={(e) => updateName(category.id!, e.target.value)}
              onBlur={() => setEditingId(null)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
              autoFocus
              className="w-full px-3 py-1.5 border-2 border-blue-500 rounded-lg focus:outline-none text-base font-medium"
            />
          ) : (
            <span
              className="font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => category.id && setEditingId(category.id)}
              title="Klik om naam te bewerken"
            >
              {category.name}
            </span>
          )}
          {cid ? (
            <button
              type="button"
              onClick={() => void handleDelete(cid)}
              className="w-fit text-left text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
            >
              {t('adminPages.categorieen.deleteCategory')}
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <label className="sr-only" htmlFor={`cat-btw-${category.id}`}>
            {t('adminPages.categorieen.categoryVatShort')}
          </label>
          <select
            id={`cat-btw-${category.id}`}
            value={
              category.default_btw_percentage === 6 ||
              category.default_btw_percentage === 9 ||
              category.default_btw_percentage === 12 ||
              category.default_btw_percentage === 21
                ? String(category.default_btw_percentage)
                : 'tenant'
            }
            onChange={(e) => updateCategoryDefaultBtw(category.id!, e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-800 max-w-[9.5rem]"
          >
            <option value="tenant">{t('adminPages.categorieen.categoryVatUseTenant')}</option>
            {CATEGORY_VAT_PERCENT_OPTIONS.map((p) => (
              <option key={p} value={String(p)}>
                {p}%
              </option>
            ))}
          </select>
        </div>

        <span
          className="shrink-0 text-xs font-medium text-gray-500 tabular-nums sm:w-36 sm:text-right"
          title={t('adminPages.categorieen.productCountTitle')}
        >
          {countLabel}
        </span>

        <button
          onClick={() => toggleVisible(category.id!)}
          className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${category.is_active ? 'bg-green-500' : 'bg-gray-200'}`}
          title={category.is_active ? t('adminPages.categorieen.visible') : t('adminPages.categorieen.hidden')}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${category.is_active ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>

        <span
          className={`text-xs font-medium w-16 text-right ${category.is_active ? 'text-green-600' : 'text-gray-400'}`}
        >
          {category.is_active ? t('adminPages.categorieen.visible') : t('adminPages.categorieen.hidden')}
        </span>
      </div>
    </Reorder.Item>
  )
}

export default function CategorieenPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const { ask, ConfirmModal } = useAdminConfirm(t)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [newCategoryImageUrl, setNewCategoryImageUrl] = useState('')
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
    setCategories(dedupeCatalogById(cats))
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
    const idStr = String(id || '').trim()
    if (!idStr) {
      setError(t('adminPages.categorieen.deleteFailed'))
      return
    }
    const n = productCounts[idStr] ?? 0
    const confirmMsg =
      n > 0
        ? t('adminPages.categorieen.confirmDeleteHasProducts').replace('{count}', String(n))
        : t('adminPages.categorieen.confirmDelete')
    if (!(await ask(confirmMsg))) return
    const success = await deleteMenuCategory(idStr, params.tenant)
    if (success) {
      setCategories((prev) => prev.filter((c) => String(c.id) !== idStr))
      setSaved(false)
      await refreshCategoriesAndProductCounts()
    } else {
      setError(t('adminPages.categorieen.deleteFailed'))
    }
  }

  const addCategory = async () => {
    if (newCategory.trim()) {
      const img = newCategoryImageUrl.trim()
      const newCat: MenuCategory = {
        tenant_slug: params.tenant,
        name: newCategory.trim(),
        description: '',
        sort_order: categories.length,
        is_active: true,
        ...(img ? { image_url: img } : {}),
      }
      
      const saved = await saveMenuCategory(newCat)
      if (saved) {
        await refreshCategoriesAndProductCounts()
        setNewCategory('')
        setNewCategoryImageUrl('')
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

  const updateCategoryImage = (id: string, image_url: string) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, image_url } : c)))
    setSaved(false)
  }

  const updateCategoryDefaultBtw = (id: string, value: string) => {
    const next: number | null =
      value === '' || value === 'tenant'? null : parseInt(value, 10)
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              default_btw_percentage:
                next === 6 || next === 9 || next === 12 || next === 21 ? next : null,
            }
          : c,
      ),
    )
    setSaved(false)
  }

  const handleSave = async () => {
    if (saveInFlightRef.current) return
    saveInFlightRef.current = true
    setSaving(true)
    setError('')

    try {
      const deduped = dedupeCatalogById(categories)
      if (deduped.length !== categories.length) {
        setCategories(deduped)
      }

      const missingId = deduped.some((c) => !c.id || String(c.id).trim() === '')
      if (missingId) {
        setError(t('adminPages.categorieen.saveFailed'))
        return
      }

      const bulk = await bulkSaveMenuCategories(params.tenant, deduped)
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
    <div
      className={CATEGORIEEN_SCROLL_CLASS}
     
    >
    <div className="max-w-3xl mx-auto">
      <ConfirmModal />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adminPages.categorieen.title')}</h1>
          <p className="text-gray-500">{t('adminPages.categorieen.subtitle')}</p>
          <p className="text-gray-500 text-sm mt-2 max-w-xl">
            {t('adminPages.categorieen.categoryVatHint')}
          </p>
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2 max-w-xl">
            {t('adminPages.categorieen.categoryVatTypicalRatesHint')}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
            saved 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-900 hover:bg-black text-white'
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
              <span></span>
              <span>{t('adminPages.common.saved')}</span>
            </>
          ) : (
            <>
              <span></span>
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
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 border border-dashed border-blue-200 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <span className="text-2xl shrink-0 hidden sm:block"></span>
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder={t('adminPages.categorieen.newCategoryPlaceholder')}
            className="flex-1 min-w-0 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          />
          <button
            type="button"
            onClick={addCategory}
            disabled={!newCategory.trim()}
            className="px-5 py-2.5 bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-medium transition-colors whitespace-nowrap shrink-0"
          >
            {t('adminPages.categorieen.add')}
          </button>
        </div>
        <div className="sm:pl-10">
          <p className="text-xs text-gray-500 mb-2">{t('adminPages.categorieen.categoryImageHelp')}</p>
          <div className="max-w-xl">
            <MediaPicker
              tenantSlug={params.tenant}
              value={newCategoryImageUrl}
              onChange={setNewCategoryImageUrl}
              label={t('adminPages.categorieen.image')}
            />
          </div>
        </div>
      </div>

      {/* Categories List */}
      <motion.div className="bg-white rounded-2xl shadow-sm overflow-visible">
        <div className="px-4 py-3 border-b bg-gray-50 flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-gray-400 text-sm"></span>
          <p className="text-sm text-gray-500 flex-1">
            {t('adminPages.categorieen.dragHintShort')}
          </p>
          <span className="hidden sm:inline text-xs text-gray-400 font-medium whitespace-nowrap">
            {t('adminPages.categorieen.categoryVatShort')}
          </span>
        </div>
        {categories.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-5xl mb-4 block"></span>
            <p className="text-gray-500 font-medium mb-1">Nog geen categorieën</p>
            <p className="text-gray-400 text-sm">Voeg hierboven een eerste categorie toe</p>
          </div>
        ) : (
          <Reorder.Group
            values={categories}
            onReorder={setCategories}
            className="divide-y divide-gray-100 touch-pan-y overflow-hidden rounded-b-2xl"
          >
            {categories.map((category, index) => (
              <CategoryReorderRow
                key={
                  category.id
                    ? String(category.id)
                    : `cat-${category.name}-${category.sort_order}`
                }
                category={category}
                tenant={params.tenant}
                editingId={editingId}
                setEditingId={setEditingId}
                productCounts={productCounts}
                updateName={updateName}
                updateCategoryImage={updateCategoryImage}
                updateCategoryDefaultBtw={updateCategoryDefaultBtw}
                toggleVisible={toggleVisible}
                handleDelete={handleDelete}
                t={t}
                optionsPlacement={index === categories.length - 1 ? 'above' : 'below'}
              />
            ))}
          </Reorder.Group>
        )}
      </motion.div>

      <p className="mt-6 text-center text-sm text-gray-500">
        {t('adminPages.categorieen.saveReminder')}
      </p>
    </div>
    </div>
    </PinGate>
  )
}
