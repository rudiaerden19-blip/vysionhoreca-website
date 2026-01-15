'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  getMenuProducts, 
  getMenuCategories, 
  saveMenuProduct, 
  deleteMenuProduct, 
  MenuProduct, 
  MenuCategory 
} from '@/lib/admin-api'

export default function ProductenPage({ params }: { params: { tenant: string } }) {
  const [products, setProducts] = useState<MenuProduct[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState('Alle')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingProduct, setEditingProduct] = useState<MenuProduct | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state for add/edit modal
  const [formData, setFormData] = useState<Partial<MenuProduct>>({
    name: '',
    description: '',
    price: 0,
    category_id: null,
    image_url: '',
    is_active: true,
    is_popular: false,
    allergens: [],
  })

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [productsData, categoriesData] = await Promise.all([
        getMenuProducts(params.tenant),
        getMenuCategories(params.tenant),
      ])
      setProducts(productsData)
      setCategories(categoriesData)
      setLoading(false)
    }
    loadData()
  }, [params.tenant])

  const filteredProducts = products.filter(p => {
    const category = categories.find(c => c.id === p.category_id)
    const matchesCategory = selectedCategory === 'Alle' || category?.name === selectedCategory
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const toggleAvailable = async (id: string) => {
    const product = products.find(p => p.id === id)
    if (product) {
      const updated = { ...product, is_active: !product.is_active }
      const result = await saveMenuProduct(updated)
      if (result) {
        setProducts(prev => prev.map(p => p.id === id ? result : p))
      }
    }
  }

  const togglePopular = async (id: string) => {
    const product = products.find(p => p.id === id)
    if (product) {
      const updated = { ...product, is_popular: !product.is_popular }
      const result = await saveMenuProduct(updated)
      if (result) {
        setProducts(prev => prev.map(p => p.id === id ? result : p))
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Weet je zeker dat je dit product wilt verwijderen?')) {
      const success = await deleteMenuProduct(id)
      if (success) {
        setProducts(prev => prev.filter(p => p.id !== id))
      } else {
        setError('Verwijderen mislukt')
      }
    }
  }

  const openEditModal = (product: MenuProduct) => {
    setFormData({
      ...product,
    })
    setEditingProduct(product)
  }

  const openAddModal = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      category_id: categories[0]?.id || null,
      image_url: '',
      is_active: true,
      is_popular: false,
      allergens: [],
    })
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingProduct(null)
    setFormData({})
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    const productData: MenuProduct = {
      id: editingProduct?.id,
      tenant_slug: params.tenant,
      category_id: formData.category_id || null,
      name: formData.name || '',
      description: formData.description || '',
      price: formData.price || 0,
      image_url: formData.image_url || '',
      is_active: formData.is_active ?? true,
      is_popular: formData.is_popular ?? false,
      sort_order: editingProduct?.sort_order || products.length,
      allergens: formData.allergens || [],
    }

    const result = await saveMenuProduct(productData)
    
    if (result) {
      if (editingProduct) {
        setProducts(prev => prev.map(p => p.id === result.id ? result : p))
      } else {
        setProducts(prev => [...prev, result])
      }
      closeModal()
    } else {
      setError('Opslaan mislukt. Probeer opnieuw.')
    }
    setSaving(false)
  }

  const getCategoryName = (categoryId: string | null) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.name || 'Geen categorie'
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
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Producten</h1>
          <p className="text-gray-500">{products.length} producten in je menu</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAddModal}
          className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-xl flex items-center gap-2"
        >
          <span>➕</span>
          <span>Nieuw product</span>
        </motion.button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek producten..."
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('Alle')}
            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
              selectedCategory === 'Alle'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Alle
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.name
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${!product.is_active ? 'opacity-60' : ''}`}
            >
              {/* Image */}
              <div className="relative h-40 bg-gray-100">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    🍟
                  </div>
                )}
                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {product.is_popular && (
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">🔥</span>
                  )}
                </div>
                {!product.is_active && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-red-500 text-white font-bold px-3 py-1 rounded-full text-sm">Uitgeschakeld</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500">{getCategoryName(product.category_id)}</p>
                  </div>
                  <span className="text-lg font-bold text-orange-500">€{product.price.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4">{product.description}</p>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleAvailable(product.id!)}
                      className={`p-2 rounded-lg transition-colors ${
                        product.is_active 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-400'
                      }`}
                      title={product.is_active ? 'Beschikbaar' : 'Niet beschikbaar'}
                    >
                      {product.is_active ? '✓' : '✕'}
                    </button>
                    <button
                      onClick={() => togglePopular(product.id!)}
                      className={`p-2 rounded-lg transition-colors ${
                        product.is_popular 
                          ? 'bg-orange-100 text-orange-600' 
                          : 'bg-gray-100 text-gray-400'
                      }`}
                      title={product.is_popular ? 'Populair' : 'Niet populair'}
                    >
                      🔥
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Bewerken"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(product.id!)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                      title="Verwijderen"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">🍟</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Geen producten gevonden</h3>
          <p className="text-gray-500 mb-6">Pas je filters aan of voeg een nieuw product toe</p>
          <button
            onClick={openAddModal}
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-xl"
          >
            + Nieuw product
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || editingProduct) && (
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
                    {editingProduct ? 'Product bewerken' : 'Nieuw product'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Productnaam *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Bijv. Grote Friet"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschrijving
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    placeholder="Beschrijf het product..."
                  />
                </div>

                {/* Price & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prijs *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categorie *
                    </label>
                    <select
                      value={formData.category_id || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value || null }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Selecteer...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Afbeelding URL
                  </label>
                  <input
                    type="url"
                    value={formData.image_url || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>

                {/* Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opties
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl cursor-pointer hover:bg-gray-200">
                      <input 
                        type="checkbox" 
                        checked={formData.is_active ?? true}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="rounded" 
                      />
                      <span>✓ Beschikbaar</span>
                    </label>
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl cursor-pointer hover:bg-gray-200">
                      <input 
                        type="checkbox" 
                        checked={formData.is_popular ?? false}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_popular: e.target.checked }))}
                        className="rounded" 
                      />
                      <span>🔥 Populair</span>
                    </label>
                  </div>
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
                    <span>{editingProduct ? 'Opslaan' : 'Toevoegen'}</span>
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
