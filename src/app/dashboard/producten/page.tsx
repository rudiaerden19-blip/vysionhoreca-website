'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category_id: string
  image_url: string
  is_active: boolean
  is_available: boolean
  stock_quantity: number
  created_at: string
}

interface Category {
  id: string
  name: string
  color: string
}

export default function ProductenPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    if (!supabase) return
    
    try {
      const stored = localStorage.getItem('vysion_tenant')
      if (!stored) return
      const tenant = JSON.parse(stored)
      if (!tenant?.business_id) return
      
      const [itemsRes, categoriesRes] = await Promise.all([
        supabase.from('menu_items').select('*').eq('business_id', tenant.business_id).order('name'),
        supabase.from('categories').select('*').eq('business_id', tenant.business_id).order('sort_order'),
      ])

      if (itemsRes.error) throw itemsRes.error
      if (categoriesRes.error) throw categoriesRes.error

      setItems(itemsRes.data || [])
      setCategories(categoriesRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount || 0)
  }

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Geen categorie'
  }

  const filteredItems = items.filter(item => {
    if (selectedCategory === 'all') return true
    return item.category_id === selectedCategory
  })

  const activeItems = items.filter(i => i.is_active).length
  const outOfStock = items.filter(i => !i.is_available).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Producten & Menu</h1>
        <p className="text-gray-500 mt-1">Bekijk je producten en menu-items</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Totaal producten</p>
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Categorieën</p>
          <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Actief</p>
          <p className="text-2xl font-bold text-green-600">{activeItems}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Niet beschikbaar</p>
          <p className="text-2xl font-bold text-red-600">{outOfStock}</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === 'all' 
              ? 'bg-accent text-white' 
              : 'bg-white border border-gray-200 text-gray-700 hover:border-accent'
          }`}
        >
          Alles ({items.length})
        </button>
        {categories.map(category => {
          const count = items.filter(i => i.category_id === category.id).length
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.id 
                  ? 'bg-accent text-white' 
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-accent'
              }`}
            >
              {category.name} ({count})
            </button>
          )
        })}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl p-12 text-center text-gray-500">
            Geen producten gevonden
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
              {item.image_url ? (
                <img 
                  src={item.image_url} 
                  alt={item.name}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <span className="text-accent font-bold">{formatCurrency(item.price)}</span>
                </div>
                {item.description && (
                  <p className="text-gray-500 text-sm mt-1 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {getCategoryName(item.category_id)}
                  </span>
                  {item.is_available ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                      Beschikbaar
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                      Uitverkocht
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
