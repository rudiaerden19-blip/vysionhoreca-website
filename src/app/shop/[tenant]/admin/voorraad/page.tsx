'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { adminDb } from '@/lib/admin-db-client'
import { getMenuCategories, MenuCategory } from '@/lib/admin-api'
import { useLanguage } from '@/i18n'

interface Product {
  id: string
  name: string
  image_url: string
  category_id: string | null
  price: number
  description: string
  article_number: string | null
  barcode: string | null
  size_label: string | null
  track_stock: boolean
  stock_quantity: number
  low_stock_threshold: number
}

type FilterType = 'all' | 'tracked' | 'low' | 'out'

export default function VoorraadPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const { t } = useLanguage()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState<string>('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStock, setEditStock] = useState(0)
  const [editThreshold, setEditThreshold] = useState(5)
  const [metaDraft, setMetaDraft] = useState({
    article_number: '',
    barcode: '',
    size_label: '',
  })
  const [saving, setSaving] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: prods }, cats] = await Promise.all([
      supabase
        .from('menu_products')
        .select(
          'id, name, description, price, image_url, category_id, article_number, barcode, size_label, track_stock, stock_quantity, low_stock_threshold',
        )
        .eq('tenant_slug', tenant)
        .eq('is_active', true)
        .order('name'),
      getMenuCategories(tenant),
    ])
    setProducts(
      (prods || []).map((p) => ({
        ...p,
        price: Number(p.price) || 0,
        description: p.description || '',
        article_number: p.article_number?.trim() || null,
        barcode: p.barcode?.trim() || null,
        size_label: p.size_label?.trim() || null,
        track_stock: p.track_stock ?? false,
        stock_quantity: p.stock_quantity ?? 0,
        low_stock_threshold: p.low_stock_threshold ?? 5,
      })),
    )
    setCategories(cats)
    setLoading(false)
  }, [tenant])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const updateProduct = async (id: string, patch: Partial<Product>) => {
    setSaving(id)
    const r = await adminDb.update('menu_products', patch as Record<string, unknown>, { id, tenant_slug: tenant }, {
      tenantSlug: tenant,
    })
    if (!r.ok) {
      alert(`Bijwerken mislukt: ${r.error}`)
    } else {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    }
    setSaving(null)
  }

  const quickAdjust = async (p: Product, delta: number) => {
    const newQty = Math.max(0, p.stock_quantity + delta)
    await updateProduct(p.id, { stock_quantity: newQty })
  }

  const saveEdit = async (p: Product) => {
    await updateProduct(p.id, {
      stock_quantity: editStock,
      low_stock_threshold: editThreshold,
      article_number: metaDraft.article_number.trim() || null,
      barcode: metaDraft.barcode.trim() || null,
      size_label: metaDraft.size_label.trim() || null,
    })
    setEditingId(null)
  }

  const startEdit = (p: Product) => {
    setEditingId(p.id)
    setEditStock(p.stock_quantity)
    setEditThreshold(p.low_stock_threshold)
    setMetaDraft({
      article_number: p.article_number || '',
      barcode: p.barcode || '',
      size_label: p.size_label || '',
    })
  }

  const getCatName = (catId: string | null) => categories.find((c) => c.id === catId)?.name ?? '—'

  const getStatus = (p: Product) => {
    if (!p.track_stock) return { label: 'Niet bijgehouden', color: 'text-gray-400', bg: 'bg-gray-100' }
    if (p.stock_quantity === 0) return { label: 'Uitverkocht', color: 'text-red-600', bg: 'bg-red-100' }
    if (p.stock_quantity <= p.low_stock_threshold)
      return { label: 'Laag', color: 'text-amber-600', bg: 'bg-amber-100' }
    return { label: 'Op voorraad', color: 'text-emerald-600', bg: 'bg-emerald-100' }
  }

  const filtered = useMemo(() => {
    let list = products
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.article_number && p.article_number.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)),
      )
    }
    if (selectedCat) list = list.filter((p) => p.category_id === selectedCat)
    if (filter === 'tracked') list = list.filter((p) => p.track_stock)
    if (filter === 'low')
      list = list.filter(
        (p) => p.track_stock && p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold,
      )
    if (filter === 'out') list = list.filter((p) => p.track_stock && p.stock_quantity === 0)
    return list
  }, [products, search, selectedCat, filter])

  const stats = useMemo(() => {
    const tracked = products.filter((p) => p.track_stock)
    return {
      total: products.length,
      tracked: tracked.length,
      low: tracked.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold).length,
      out: tracked.filter((p) => p.stock_quantity === 0).length,
    }
  }, [products])

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📦 {t('stockPage.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('stockPage.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Totaal', value: stats.total },
          { label: 'Bijgehouden', value: stats.tracked },
          { label: 'Laag', value: stats.low },
          { label: 'Uitverkocht', value: stats.out },
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
          <option value="">Alle categorieën</option>
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
          {filtered.map((p) => {
            const status = getStatus(p)
            const isEditing = editingId === p.id
            const isSaving = saving === p.id
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex flex-wrap gap-4 items-start">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400">{getCatName(p.category_id)} · €{p.price.toFixed(2)}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs min-w-[240px]">
                    <div>
                      <span className="text-gray-400">{t('stockPage.article')}</span>
                      <p className="font-medium">{p.article_number || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">{t('stockPage.barcode')}</span>
                      <p className="font-medium font-mono">{p.barcode || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">{t('stockPage.size')}</span>
                      <p className="font-medium">{p.size_label || '—'}</p>
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
                          onClick={() => void saveEdit(p)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold"
                        >
                          {t('stockPage.saveMeta')}
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="text-sm text-gray-500">
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : p.track_stock ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void quickAdjust(p, -1)}
                        className="w-9 h-9 rounded-xl bg-red-100 text-red-600 font-bold"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="min-w-[48px] px-3 py-2 rounded-xl bg-gray-100 font-bold"
                      >
                        {p.stock_quantity}
                      </button>
                      <button
                        type="button"
                        onClick={() => void quickAdjust(p, 1)}
                        className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 font-bold"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        void updateProduct(p.id, {
                          track_stock: true,
                          stock_quantity: 0,
                          low_stock_threshold: 5,
                        })
                      }
                      className="px-4 py-2 rounded-xl bg-[#1e293b] text-white text-sm"
                    >
                      Bijhouden
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
