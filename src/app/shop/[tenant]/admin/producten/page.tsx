'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  image: string
  available: boolean
  popular: boolean
  new: boolean
  vegetarian: boolean
  allergens: string[]
}

const demoProducts: Product[] = [
  { id: '1', name: 'Grote Friet', description: 'Krokante verse frieten, ruim portie', price: 4.50, category: 'Frieten', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', available: true, popular: true, new: false, vegetarian: true, allergens: [] },
  { id: '2', name: 'Bicky Burger', description: 'De echte Bicky met pickles, ui en Bickysaus', price: 5.50, category: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', available: true, popular: true, new: false, vegetarian: false, allergens: ['gluten', 'ei', 'melk'] },
  { id: '3', name: 'Frikandel Speciaal', description: 'Frikandel met curry, mayo en uitjes', price: 4.00, category: 'Snacks', image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400', available: true, popular: true, new: false, vegetarian: false, allergens: ['gluten'] },
  { id: '4', name: 'Kipnuggets (6 st)', description: 'Krokante kipnuggets met saus naar keuze', price: 6.00, category: 'Snacks', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400', available: true, popular: false, new: true, vegetarian: false, allergens: ['gluten', 'ei'] },
  { id: '5', name: 'Cheese Burger Deluxe', description: 'Dubbele burger met cheddar, bacon en BBQ saus', price: 9.50, category: 'Burgers', image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400', available: true, popular: true, new: false, vegetarian: false, allergens: ['gluten', 'melk', 'ei'] },
  { id: '6', name: 'Veggie Burger', description: 'Huisgemaakte groenteburger met verse groenten', price: 7.50, category: 'Burgers', image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400', available: false, popular: false, new: true, vegetarian: true, allergens: ['gluten', 'ei'] },
]

const categories = ['Alle', 'Frieten', 'Snacks', 'Burgers', 'Sauzen', 'Dranken']

export default function ProductenPage({ params }: { params: { tenant: string } }) {
  const [products, setProducts] = useState(demoProducts)
  const [selectedCategory, setSelectedCategory] = useState('Alle')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'Alle' || p.category === selectedCategory
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const toggleAvailable = (id: string) => {
    setProducts(prev => prev.map(p => 
      p.id === id ? { ...p, available: !p.available } : p
    ))
  }

  const togglePopular = (id: string) => {
    setProducts(prev => prev.map(p => 
      p.id === id ? { ...p, popular: !p.popular } : p
    ))
  }

  const deleteProduct = (id: string) => {
    if (confirm('Weet je zeker dat je dit product wilt verwijderen?')) {
      setProducts(prev => prev.filter(p => p.id !== id))
    }
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
          onClick={() => setShowAddModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-xl flex items-center gap-2"
        >
          <span>➕</span>
          <span>Nieuw product</span>
        </motion.button>
      </div>

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
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
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
              className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${!product.available ? 'opacity-60' : ''}`}
            >
              {/* Image */}
              <div className="relative h-40">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {product.new && (
                    <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">NIEUW</span>
                  )}
                  {product.popular && (
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">🔥</span>
                  )}
                  {product.vegetarian && (
                    <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">🌱</span>
                  )}
                </div>
                {!product.available && (
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
                    <p className="text-sm text-gray-500">{product.category}</p>
                  </div>
                  <span className="text-lg font-bold text-orange-500">€{product.price.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4">{product.description}</p>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleAvailable(product.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        product.available 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-400'
                      }`}
                      title={product.available ? 'Beschikbaar' : 'Niet beschikbaar'}
                    >
                      {product.available ? '✓' : '✕'}
                    </button>
                    <button
                      onClick={() => togglePopular(product.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        product.popular 
                          ? 'bg-orange-100 text-orange-600' 
                          : 'bg-gray-100 text-gray-400'
                      }`}
                      title={product.popular ? 'Populair' : 'Niet populair'}
                    >
                      🔥
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Bewerken"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
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
            onClick={() => setShowAddModal(true)}
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
            onClick={() => { setShowAddModal(false); setEditingProduct(null); }}
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
                    onClick={() => { setShowAddModal(false); setEditingProduct(null); }}
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
                    defaultValue={editingProduct?.name || ''}
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
                    defaultValue={editingProduct?.description || ''}
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
                        defaultValue={editingProduct?.price || ''}
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
                      defaultValue={editingProduct?.category || ''}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Selecteer...</option>
                      {categories.filter(c => c !== 'Alle').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Afbeelding
                  </label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-orange-500 transition-colors cursor-pointer">
                    <span className="text-4xl mb-2 block">📷</span>
                    <p className="text-gray-500">Klik om een afbeelding te uploaden</p>
                    <p className="text-sm text-gray-400">JPG, PNG tot 5MB</p>
                  </div>
                </div>

                {/* Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opties
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl cursor-pointer hover:bg-gray-200">
                      <input type="checkbox" defaultChecked={editingProduct?.popular} className="rounded" />
                      <span>🔥 Populair</span>
                    </label>
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl cursor-pointer hover:bg-gray-200">
                      <input type="checkbox" defaultChecked={editingProduct?.new} className="rounded" />
                      <span>✨ Nieuw</span>
                    </label>
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl cursor-pointer hover:bg-gray-200">
                      <input type="checkbox" defaultChecked={editingProduct?.vegetarian} className="rounded" />
                      <span>🌱 Vegetarisch</span>
                    </label>
                  </div>
                </div>

                {/* Allergens */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allergenen
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Gluten', 'Ei', 'Melk', 'Noten', 'Soja', 'Vis', 'Schaaldieren', 'Selderij', 'Mosterd', 'Sesam'].map(allergen => (
                      <label key={allergen} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 text-sm">
                        <input 
                          type="checkbox" 
                          defaultChecked={editingProduct?.allergens.includes(allergen.toLowerCase())} 
                          className="rounded"
                        />
                        <span>{allergen}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t bg-gray-50 flex justify-end gap-4">
                <button
                  onClick={() => { setShowAddModal(false); setEditingProduct(null); }}
                  className="px-6 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Annuleren
                </button>
                <button className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors">
                  {editingProduct ? 'Opslaan' : 'Toevoegen'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
