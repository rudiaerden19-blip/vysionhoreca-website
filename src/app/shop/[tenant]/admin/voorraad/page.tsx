'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { adminDb } from '@/lib/admin-db-client'
import { getMenuCategories, MenuCategory } from '@/lib/admin-api'
import { buildRetailSkusFromRows, type RetailPosSku } from '@/lib/retail-pos-catalog'
import { useLanguage } from '@/i18n'

type FilterType = 'all' | 'tracked' | 'low' | 'out'

export default function VoorraadPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const { t } = useLanguage()

  const [skus, setSkus] = useState<RetailPosSku[]>([])
  const [productNames, setProductNames] = useState<{ id: string; name: string }[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState<string>('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editStock, setEditStock] = useState(0)
  const [editThreshold, setEditThreshold] = useState(5)
  const [metaDraft, setMetaDraft] = useState({
    article_number: '',
    barcode: '',
    size_label: '',
    color_label: '',
  })
  const [saving, setSaving] = useState<string | null>(null)
  const [newVariantProductId, setNewVariantProductId] = useState('')
  const [newVariantDraft, setNewVariantDraft] = useState({
    size_label: '',
    color_label: '',
    barcode: '',
    article_number: '',
    stock_quantity: 0,
  })
  const [addingVariant, setAddingVariant] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: prods }, { data: vars }, cats] = await Promise.all([
      supabase
        .from('menu_products')
        .select(
          'id, name, description, price, image_url, category_id, article_number, barcode, size_label, color_label, track_stock, stock_quantity, low_stock_threshold',
        )
        .eq('tenant_slug', tenant)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('menu_product_variants')
        .select(
          'id, product_id, article_number, barcode, size_label, color_label, price_override, track_stock, stock_quantity, low_stock_threshold, is_active, sort_order',
        )
        .eq('tenant_slug', tenant),
      getMenuCategories(tenant),
    ])
    const products = (prods || []).map((p) => ({
      id: p.id as string,
      name: p.name as string,
      description: (p.description as string) || '',
      price: Number(p.price) || 0,
      image_url: (p.image_url as string) || '',
      category_id: p.category_id as string | null,
      article_number: p.article_number?.trim() || null,
      barcode: p.barcode?.trim() || null,
      size_label: p.size_label?.trim() || null,
      color_label: p.color_label?.trim() || null,
      track_stock: p.track_stock ?? false,
      stock_quantity: p.stock_quantity ?? 0,
      low_stock_threshold: p.low_stock_threshold ?? 5,
    }))
    setProductNames(products.map((p) => ({ id: p.id, name: p.name })))
    setSkus(
      buildRetailSkusFromRows(
        products,
        (vars || []).map((v) => ({
          id: v.id as string,
          product_id: v.product_id as string,
          article_number: v.article_number as string | null,
          barcode: v.barcode as string | null,
          size_label: v.size_label as string | null,
          color_label: v.color_label as string | null,
          price_override: v.price_override as number | null,
          track_stock: !!v.track_stock,
          stock_quantity: Number(v.stock_quantity) || 0,
          low_stock_threshold: Number(v.low_stock_threshold) || 5,
          is_active: v.is_active !== false,
          sort_order: Number(v.sort_order) || 0,
        })),
      ),
    )
    setCategories(cats)
    setLoading(false)
  }, [tenant])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const updateSku = async (sku: RetailPosSku, patch: Record<string, unknown>) => {
    setSaving(sku.lineKey)
    const table = sku.variantId ? 'menu_product_variants' : 'menu_products'
    const id = sku.variantId ?? sku.productId
    const r = await adminDb.update(table, patch, { id, tenant_slug: tenant }, { tenantSlug: tenant })
    if (!r.ok) {
      alert(`${t('stockPage.saveFailed')}: ${r.error}`)
    } else {
      await loadData()
    }
    setSaving(null)
  }

  const quickAdjust = async (sku: RetailPosSku, delta: number) => {
    const newQty = Math.max(0, sku.stock_quantity + delta)
    await updateSku(sku, { stock_quantity: newQty, track_stock: true })
  }

  const saveEdit = async (sku: RetailPosSku) => {
    await updateSku(sku, {
      stock_quantity: editStock,
      low_stock_threshold: editThreshold,
      article_number: metaDraft.article_number.trim() || null,
      barcode: metaDraft.barcode.trim() || null,
      size_label: metaDraft.size_label.trim() || null,
      color_label: metaDraft.color_label.trim() || null,
      track_stock: true,
    })
    setEditingKey(null)
  }

  const startEdit = (sku: RetailPosSku) => {
    setEditingKey(sku.lineKey)
    setEditStock(sku.stock_quantity)
    setEditThreshold(sku.low_stock_threshold)
    setMetaDraft({
      article_number: sku.article_number || '',
      barcode: sku.barcode || '',
      size_label: sku.size_label || '',
      color_label: sku.color_label || '',
    })
  }

  const addVariant = async () => {
    if (!newVariantProductId) return
    setAddingVariant(true)
    const r = await adminDb.insert(
      'menu_product_variants',
      {
        tenant_slug: tenant,
        product_id: newVariantProductId,
        size_label: newVariantDraft.size_label.trim() || null,
        color_label: newVariantDraft.color_label.trim() || null,
        barcode: newVariantDraft.barcode.trim() || null,
        article_number: newVariantDraft.article_number.trim() || null,
        stock_quantity: Math.max(0, newVariantDraft.stock_quantity),
        track_stock: true,
        low_stock_threshold: 5,
        is_active: true,
        sort_order: 0,
      },
      { tenantSlug: tenant },
    )
    setAddingVariant(false)
    if (!r.ok) {
      alert(`${t('stockPage.variantAddFailed')}: ${r.error}`)
      return
    }
    setNewVariantDraft({ size_label: '', color_label: '', barcode: '', article_number: '', stock_quantity: 0 })
    await loadData()
  }

  const getCatName = (catId: string | null) => categories.find((c) => c.id === catId)?.name ?? '—'

  const getStatus = (sku: RetailPosSku) => {
    if (!sku.track_stock) return { label: t('stockPage.statusNotTracked'), color: 'text-gray-400', bg: 'bg-gray-100' }
    if (sku.stock_quantity === 0)
      return { label: t('stockPage.statusOut'), color: 'text-red-600', bg: 'bg-red-100' }
    if (sku.stock_quantity <= sku.low_stock_threshold)
      return { label: t('stockPage.statusLow'), color: 'text-amber-600', bg: 'bg-amber-100' }
    return { label: t('stockPage.statusOk'), color: 'text-emerald-600', bg: 'bg-emerald-100' }
  }

  const filtered = useMemo(() => {
    let list = skus
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.article_number && s.article_number.toLowerCase().includes(q)) ||
          (s.barcode && s.barcode.toLowerCase().includes(q)),
      )
    }
    if (selectedCat) list = list.filter((s) => s.category_id === selectedCat)
    if (filter === 'tracked') list = list.filter((s) => s.track_stock)
    if (filter === 'low')
      list = list.filter(
        (s) => s.track_stock && s.stock_quantity > 0 && s.stock_quantity <= s.low_stock_threshold,
      )
    if (filter === 'out') list = list.filter((s) => s.track_stock && s.stock_quantity === 0)
    return list
  }, [skus, search, selectedCat, filter])

  const stats = useMemo(() => {
    const tracked = skus.filter((s) => s.track_stock)
    return {
      total: skus.length,
      tracked: tracked.length,
      low: tracked.filter((s) => s.stock_quantity > 0 && s.stock_quantity <= s.low_stock_threshold).length,
      out: tracked.filter((s) => s.stock_quantity === 0).length,
    }
  }, [skus])

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📦 {t('stockPage.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('stockPage.subtitle')}</p>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800">{t('stockPage.addVariantTitle')}</p>
        <div className="flex flex-wrap gap-2">
          <select
            value={newVariantProductId}
            onChange={(e) => setNewVariantProductId(e.target.value)}
            className="min-w-[180px] flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm"
          >
            <option value="">{t('stockPage.pickProduct')}</option>
            {productNames.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            className="w-24 px-2 py-2 border rounded-xl text-sm"
            placeholder={t('stockPage.size')}
            value={newVariantDraft.size_label}
            onChange={(e) => setNewVariantDraft((d) => ({ ...d, size_label: e.target.value }))}
          />
          <input
            className="w-24 px-2 py-2 border rounded-xl text-sm"
            placeholder={t('stockPage.color')}
            value={newVariantDraft.color_label}
            onChange={(e) => setNewVariantDraft((d) => ({ ...d, color_label: e.target.value }))}
          />
          <input
            className="w-32 px-2 py-2 border rounded-xl text-sm font-mono"
            placeholder={t('stockPage.barcode')}
            value={newVariantDraft.barcode}
            onChange={(e) => setNewVariantDraft((d) => ({ ...d, barcode: e.target.value }))}
          />
          <input
            type="number"
            min={0}
            className="w-20 px-2 py-2 border rounded-xl text-sm text-center"
            placeholder={t('stockPage.stock')}
            value={newVariantDraft.stock_quantity}
            onChange={(e) =>
              setNewVariantDraft((d) => ({ ...d, stock_quantity: Math.max(0, parseInt(e.target.value, 10) || 0) }))
            }
          />
          <button
            type="button"
            disabled={!newVariantProductId || addingVariant}
            onClick={() => void addVariant()}
            className="px-4 py-2 rounded-xl bg-[#1e293b] text-white text-sm font-semibold disabled:opacity-40"
          >
            {t('stockPage.addVariant')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: t('stockPage.statTotal'), value: stats.total },
          { label: t('stockPage.statTracked'), value: stats.tracked },
          { label: t('stockPage.statLow'), value: stats.low },
          { label: t('stockPage.statOut'), value: stats.out },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder={t('stockPage.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm"
        />
        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm min-w-[160px]"
        >
          <option value="">{t('stockPage.allCategories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-12">{t('stockPage.loading')}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((sku) => {
            const status = getStatus(sku)
            const isEditing = editingKey === sku.lineKey
            const isSaving = saving === sku.lineKey
            return (
              <div key={sku.lineKey} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex flex-wrap gap-4 items-start">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-semibold text-gray-900">{sku.name}</p>
                    <p className="text-xs text-gray-400">
                      {getCatName(sku.category_id)} · €{sku.price.toFixed(2)}
                      {sku.variantId ? ` · ${t('stockPage.variantBadge')}` : ` · ${t('stockPage.singleSkuBadge')}`}
                    </p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs min-w-[280px]">
                    <div>
                      <span className="text-gray-400">{t('stockPage.article')}</span>
                      <p className="font-medium font-mono">{sku.article_number || sku.barcode || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">{t('stockPage.barcode')}</span>
                      <p className="font-medium font-mono">{sku.barcode || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">{t('stockPage.size')}</span>
                      <p className="font-medium">{sku.size_label || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">{t('stockPage.color')}</span>
                      <p className="font-medium">{sku.color_label || '—'}</p>
                    </div>
                  </div>
                  {isSaving ? (
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                  ) : isEditing ? (
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                      <div className="flex gap-2 flex-wrap">
                        <input
                          className="w-28 px-2 py-1 border rounded-lg text-sm"
                          placeholder={t('stockPage.article')}
                          value={metaDraft.article_number}
                          onChange={(e) => setMetaDraft((m) => ({ ...m, article_number: e.target.value }))}
                        />
                        <input
                          className="w-36 px-2 py-1 border rounded-lg text-sm font-mono"
                          placeholder={t('stockPage.barcode')}
                          value={metaDraft.barcode}
                          onChange={(e) => setMetaDraft((m) => ({ ...m, barcode: e.target.value }))}
                        />
                        <input
                          className="w-24 px-2 py-1 border rounded-lg text-sm"
                          placeholder={t('stockPage.size')}
                          value={metaDraft.size_label}
                          onChange={(e) => setMetaDraft((m) => ({ ...m, size_label: e.target.value }))}
                        />
                        <input
                          className="w-24 px-2 py-1 border rounded-lg text-sm"
                          placeholder={t('stockPage.color')}
                          value={metaDraft.color_label}
                          onChange={(e) => setMetaDraft((m) => ({ ...m, color_label: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          value={editStock}
                          onChange={(e) => setEditStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-16 px-2 py-1 border rounded-lg text-center font-bold"
                          min={0}
                        />
                        <input
                          type="number"
                          value={editThreshold}
                          onChange={(e) => setEditThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-16 px-2 py-1 border rounded-lg text-center"
                          min={0}
                        />
                        <button
                          type="button"
                          onClick={() => void saveEdit(sku)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold"
                        >
                          {t('stockPage.saveMeta')}
                        </button>
                        <button type="button" onClick={() => setEditingKey(null)} className="text-sm text-gray-500">
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : sku.track_stock ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void quickAdjust(sku, -1)}
                        className="w-9 h-9 rounded-xl bg-red-100 text-red-600 font-bold"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(sku)}
                        className="min-w-[48px] px-3 py-2 rounded-xl bg-gray-100 font-bold"
                      >
                        {sku.stock_quantity}
                      </button>
                      <button
                        type="button"
                        onClick={() => void quickAdjust(sku, 1)}
                        className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 font-bold"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void updateSku(sku, { track_stock: true, stock_quantity: 0, low_stock_threshold: 5 })}
                      className="px-4 py-2 rounded-xl bg-[#1e293b] text-white text-sm"
                    >
                      {t('stockPage.enableTracking')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
