'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getMenuCategories, MenuCategory } from '@/lib/admin-api'

interface Product {
  id: string
  name: string
  image_url: string
  category_id: string | null
  track_stock: boolean
  stock_quantity: number
  low_stock_threshold: number
}

type FilterType = 'all' | 'tracked' | 'low' | 'out'

export default function VoorraadPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState<string>('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStock, setEditStock] = useState(0)
  const [editThreshold, setEditThreshold] = useState(5)
  const [saving, setSaving] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: prods }, cats] = await Promise.all([
      supabase
        .from('menu_products')
        .select('id, name, image_url, category_id, track_stock, stock_quantity, low_stock_threshold')
        .eq('tenant_slug', tenant)
        .eq('is_active', true)
        .order('name'),
      getMenuCategories(tenant),
    ])
    setProducts(
      (prods || []).map(p => ({
        ...p,
        track_stock: p.track_stock ?? false,
        stock_quantity: p.stock_quantity ?? 0,
        low_stock_threshold: p.low_stock_threshold ?? 5,
      }))
    )
    setCategories(cats)
    setLoading(false)
  }, [tenant])

  useEffect(() => { loadData() }, [loadData])

  const updateProduct = async (id: string, patch: Partial<Product>) => {
    setSaving(id)
    await supabase.from('menu_products').update(patch).eq('id', id)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
    setSaving(null)
  }

  const quickAdjust = async (p: Product, delta: number) => {
    const newQty = Math.max(0, p.stock_quantity + delta)
    await updateProduct(p.id, { stock_quantity: newQty })
  }

  const saveEdit = async (p: Product) => {
    await updateProduct(p.id, { stock_quantity: editStock, low_stock_threshold: editThreshold })
    setEditingId(null)
  }

  const startEdit = (p: Product) => {
    setEditingId(p.id)
    setEditStock(p.stock_quantity)
    setEditThreshold(p.low_stock_threshold)
  }

  const getCatName = (catId: string | null) =>
    categories.find(c => c.id === catId)?.name ?? '—'

  const getStatus = (p: Product) => {
    if (!p.track_stock) return { label: 'Niet bijgehouden', color: 'text-gray-400', bg: 'bg-gray-100' }
    if (p.stock_quantity === 0) return { label: 'Uitverkocht', color: 'text-red-600', bg: 'bg-red-100' }
    if (p.stock_quantity <= p.low_stock_threshold) return { label: 'Laag', color: 'text-amber-600', bg: 'bg-amber-100' }
    return { label: 'Op voorraad', color: 'text-emerald-600', bg: 'bg-emerald-100' }
  }

  const filtered = useMemo(() => {
    let list = products
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    if (selectedCat) list = list.filter(p => p.category_id === selectedCat)
    if (filter === 'tracked') list = list.filter(p => p.track_stock)
    if (filter === 'low') list = list.filter(p => p.track_stock && p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold)
    if (filter === 'out') list = list.filter(p => p.track_stock && p.stock_quantity === 0)
    return list
  }, [products, search, selectedCat, filter])

  const stats = useMemo(() => {
    const tracked = products.filter(p => p.track_stock)
    return {
      total: products.length,
      tracked: tracked.length,
      low: tracked.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold).length,
      out: tracked.filter(p => p.stock_quantity === 0).length,
    }
  }, [products])

  const lowStockItems = useMemo(() =>
    products.filter(p => p.track_stock && p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0),
    [products]
  )

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📦 Voorraad</h1>
          <p className="text-sm text-gray-500 mt-0.5">Beheer de stockniveaus van je producten</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Totaal', value: stats.total, icon: '📦', color: 'bg-gray-50 border-gray-200' },
          { label: 'Bijgehouden', value: stats.tracked, icon: '✅', color: 'bg-blue-50 border-blue-200' },
          { label: 'Laag', value: stats.low, icon: '⚠️', color: 'bg-amber-50 border-amber-200' },
          { label: 'Uitverkocht', value: stats.out, icon: '❌', color: 'bg-red-50 border-red-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Lage voorraad alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <p className="font-semibold text-amber-700 mb-2">⚠️ Lage voorraad</p>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map(p => (
              <span key={p.id} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                {p.name}: {p.stock_quantity} stuks
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="🔍 Zoek product..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none bg-white text-sm"
        />
        <select
          value={selectedCat}
          onChange={e => setSelectedCat(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none bg-white text-sm min-w-[160px]"
        >
          <option value="">Alle categorieën</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-1.5">
          {([
            { id: 'all', label: 'Alle' },
            { id: 'tracked', label: 'Bijgehouden' },
            { id: 'low', label: 'Laag' },
            { id: 'out', label: 'Uitverkocht' },
          ] as { id: FilterType; label: string }[]).map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === f.id
                  ? 'bg-[#1e293b] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Productenlijst */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Laden...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <span className="text-4xl mb-2">📦</span>
          <p className="font-medium">Geen producten gevonden</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const status = getStatus(p)
            const isEditing = editingId === p.id
            const isSaving = saving === p.id

            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
                {/* Afbeelding */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">🍽️</div>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{getCatName(p.category_id)}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                {/* Controls */}
                {isSaving ? (
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                ) : p.track_stock ? (
                  isEditing ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 mb-0.5">Stuks</p>
                        <input
                          type="number"
                          value={editStock}
                          onChange={e => setEditStock(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-center text-sm font-bold focus:border-blue-400 focus:outline-none"
                          min={0}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 mb-0.5">Min.</p>
                        <input
                          type="number"
                          value={editThreshold}
                          onChange={e => setEditThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-center text-sm font-bold focus:border-blue-400 focus:outline-none"
                          min={0}
                        />
                      </div>
                      <button
                        onClick={() => saveEdit(p)}
                        className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => quickAdjust(p, -1)}
                        disabled={p.stock_quantity === 0}
                        className="w-9 h-9 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 font-bold text-lg flex items-center justify-center transition-colors disabled:opacity-30"
                      >
                        −
                      </button>
                      <button
                        onClick={() => startEdit(p)}
                        className="min-w-[48px] px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-center font-bold text-lg transition-colors"
                      >
                        {p.stock_quantity}
                      </button>
                      <button
                        onClick={() => quickAdjust(p, 1)}
                        className="w-9 h-9 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-600 font-bold text-lg flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                      <button
                        onClick={() => updateProduct(p.id, { track_stock: false })}
                        className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs font-medium transition-colors"
                      >
                        Uit
                      </button>
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => updateProduct(p.id, { track_stock: true, stock_quantity: 0, low_stock_threshold: 5 })}
                    className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#0f172a] text-white text-sm font-medium transition-colors flex-shrink-0"
                  >
                    Bijhouden
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Info onderaan */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-700">
        <p className="font-semibold mb-1">💡 Hoe werkt voorraad?</p>
        <ul className="space-y-1 text-blue-600 text-xs">
          <li>• Klik op <strong>Bijhouden</strong> om stockbeheer in te schakelen voor een product.</li>
          <li>• Gebruik <strong>+</strong> en <strong>−</strong> voor snelle aanpassingen.</li>
          <li>• Klik op het getal om stock en minimumniveau in te stellen.</li>
          <li>• Bij <strong>laag</strong> of <strong>uitverkocht</strong> verschijnt een waarschuwing bovenaan.</li>
        </ul>
      </div>
    </div>
  )
}
