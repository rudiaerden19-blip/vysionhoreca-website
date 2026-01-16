'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent 
} from '@dnd-kit/core'
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  useSortable,
  rectSortingStrategy 
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  getMenuProducts, 
  getMenuCategories, 
  saveMenuProduct, 
  deleteMenuProduct, 
  getProductOptions,
  getProductOptionLinks,
  saveProductOptionLinks,
  MenuProduct, 
  MenuCategory,
  ProductOption
} from '@/lib/admin-api'
import MediaPicker from '@/components/MediaPicker'

const ALLERGENS = [
  { id: 'gluten', name: 'Gluten', icon: '🌾' },
  { id: 'ei', name: 'Eieren', icon: '🥚' },
  { id: 'melk', name: 'Melk', icon: '🥛' },
  { id: 'noten', name: 'Noten', icon: '🥜' },
  { id: 'pinda', name: 'Pinda', icon: '🥜' },
  { id: 'soja', name: 'Soja', icon: '🫘' },
  { id: 'vis', name: 'Vis', icon: '🐟' },
  { id: 'schaaldieren', name: 'Schaaldieren', icon: '🦐' },
  { id: 'selderij', name: 'Selderij', icon: '🥬' },
  { id: 'mosterd', name: 'Mosterd', icon: '🟡' },
  { id: 'sesam', name: 'Sesamzaad', icon: '⚪' },
  { id: 'sulfiet', name: 'Sulfiet', icon: '🍷' },
  { id: 'lupine', name: 'Lupine', icon: '🌸' },
  { id: 'weekdieren', name: 'Weekdieren', icon: '🐚' },
]

// Sortable Product Card Component
function SortableProductCard({ 
  product, 
  categories,
  onToggleAvailable,
  onTogglePopular,
  onEdit,
  onDelete 
}: {
  product: MenuProduct
  categories: MenuCategory[]
  onToggleAvailable: () => void
  onTogglePopular: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id! })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  }

  const category = categories.find(c => c.id === product.category_id)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-2xl shadow-sm overflow-hidden ${isDragging ? 'shadow-xl ring-2 ring-orange-500' : ''}`}
    >
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners}
        className="bg-gray-50 px-4 py-2 cursor-grab active:cursor-grabbing flex items-center justify-center gap-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors border-b"
      >
        <span className="text-lg">⠿</span>
        <span className="text-xs font-medium">Sleep om te verplaatsen</span>
      </div>

      {/* Image */}
      <div className="relative h-40 bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            🍟
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.is_promo && (
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              🎁 PROMO
            </span>
          )}
          {product.is_popular && (
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              🔥 POPULAIR
            </span>
          )}
        </div>
        {!product.is_active && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
              Niet beschikbaar
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-gray-900">{product.name}</h3>
            <span className="text-sm text-gray-500">{category?.name || 'Geen categorie'}</span>
          </div>
          <div className="text-right">
            {product.is_promo && product.promo_price ? (
              <>
                <span className="text-gray-400 line-through text-sm">€{product.price.toFixed(2)}</span>
                <span className="text-green-500 font-bold text-lg block">€{product.promo_price.toFixed(2)}</span>
              </>
            ) : (
              <span className="text-orange-500 font-bold text-lg">€{product.price.toFixed(2)}</span>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{product.description}</p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            <button
              onClick={onToggleAvailable}
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
              onClick={onTogglePopular}
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
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Bewerken"
            >
              ✏️
            </button>
            <button
              onClick={onDelete}
              className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
              title="Verwijderen"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProductenPage({ params }: { params: { tenant: string } }) {
  const [products, setProducts] = useState<MenuProduct[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [availableOptions, setAvailableOptions] = useState<ProductOption[]>([])
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('Promoties')
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
    is_promo: false,
    promo_price: undefined,
    allergens: [],
  })

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [productsData, categoriesData, optionsData] = await Promise.all([
        getMenuProducts(params.tenant),
        getMenuCategories(params.tenant),
        getProductOptions(params.tenant),
      ])
      setProducts(productsData)
      setCategories(categoriesData)
      setAvailableOptions(optionsData)
      setLoading(false)
    }
    loadData()
  }, [params.tenant])

  const filteredProducts = products.filter(p => {
    const category = categories.find(c => c.id === p.category_id)
    const matchesCategory = selectedCategory === 'Promoties' 
      ? (p as any).is_promo === true
      : selectedCategory === 'Alle'
        ? true
        : category?.name === selectedCategory
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

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) return
    
    const oldIndex = filteredProducts.findIndex(p => p.id === active.id)
    const newIndex = filteredProducts.findIndex(p => p.id === over.id)
    
    if (oldIndex === -1 || newIndex === -1) return
    
    // Reorder locally first for instant feedback
    const newOrder = arrayMove(filteredProducts, oldIndex, newIndex)
    
    // Update sort_order for all affected products
    const updates = newOrder.map((product, index) => ({
      ...product,
      sort_order: index
    }))
    
    // Update state immediately
    setProducts(prev => {
      const otherProducts = prev.filter(p => !newOrder.find(np => np.id === p.id))
      return [...updates, ...otherProducts].sort((a, b) => a.sort_order - b.sort_order)
    })
    
    // Save to database in background
    Promise.all(updates.map(p => saveMenuProduct(p)))
  }

  const openEditModal = async (product: MenuProduct) => {
    setFormData({
      ...product,
    })
    setEditingProduct(product)
    // Load linked options
    if (product.id) {
      const linkedOptions = await getProductOptionLinks(product.id)
      setSelectedOptionIds(linkedOptions)
    }
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
      is_promo: false,
      promo_price: undefined,
      allergens: [],
    })
    setSelectedOptionIds([])
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingProduct(null)
    setFormData({})
    setSelectedOptionIds([])
  }

  const toggleOptionSelection = (optionId: string) => {
    setSelectedOptionIds(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    )
  }

  const toggleAllergen = (allergenId: string) => {
    setFormData(prev => {
      const currentAllergens = prev.allergens || []
      const isSelected = currentAllergens.includes(allergenId)
      return {
        ...prev,
        allergens: isSelected
          ? currentAllergens.filter(id => id !== allergenId)
          : [...currentAllergens, allergenId]
      }
    })
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
      is_promo: formData.is_promo ?? false,
      promo_price: formData.is_promo ? (formData.promo_price || 0) : undefined,
      sort_order: editingProduct?.sort_order || products.length,
      allergens: formData.allergens || [],
    }

    const result = await saveMenuProduct(productData)
    
    if (result) {
      // Save option links
      if (result.id) {
        await saveProductOptionLinks(result.id, selectedOptionIds, params.tenant)
      }
      
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
            onClick={() => setSelectedCategory('Promoties')}
            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
              selectedCategory === 'Promoties'
                ? 'bg-green-500 text-white'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            🎁 Promoties
          </button>
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

      {/* Products Grid with Drag & Drop */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={filteredProducts.map(p => p.id!)}
          strategy={rectSortingStrategy}
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <SortableProductCard
                key={product.id}
                product={product}
                categories={categories}
                onToggleAvailable={() => toggleAvailable(product.id!)}
                onTogglePopular={() => togglePopular(product.id!)}
                onEdit={() => openEditModal(product)}
                onDelete={() => handleDelete(product.id!)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
                    onChange={(e) => {
                      const val = e.target.value
                      const capitalized = val.charAt(0).toUpperCase() + val.slice(1)
                      setFormData(prev => ({ ...prev, name: capitalized }))
                    }}
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

                {/* Product Afbeelding */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Afbeelding
                  </label>
                  <MediaPicker
                    tenantSlug={params.tenant}
                    value={formData.image_url || ''}
                    onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                  />
                </div>

                {/* Koppel Opties */}
                {availableOptions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opties & Extra&apos;s koppelen
                    </label>
                    <p className="text-sm text-gray-500 mb-3">
                      Selecteer welke opties klanten kunnen kiezen bij dit product
                    </p>
                    <div className="space-y-2">
                      {availableOptions.map(option => (
                        <label 
                          key={option.id} 
                          className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                            selectedOptionIds.includes(option.id!)
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedOptionIds.includes(option.id!)}
                            onChange={() => toggleOptionSelection(option.id!)}
                            className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{option.name}</span>
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                              option.type === 'single' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {option.type === 'single' ? 'Enkele keuze' : 'Meerdere keuzes'}
                            </span>
                            {option.required && (
                              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                Verplicht
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {option.choices?.length || 0} keuzes
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allergenen */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allergenen
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    Selecteer welke allergenen in dit product zitten
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALLERGENS.map(allergen => {
                      const isSelected = formData.allergens?.includes(allergen.id) || false
                      return (
                        <label
                          key={allergen.id}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-orange-50 border-2 border-orange-500'
                              : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAllergen(allergen.id)}
                            className="sr-only"
                          />
                          <span className="text-lg">{allergen.icon}</span>
                          <span className={`text-sm font-medium ${isSelected ? 'text-orange-700' : 'text-gray-600'}`}>
                            {allergen.name}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Status Opties */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
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
                    <label className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-xl cursor-pointer hover:bg-green-200">
                      <input 
                        type="checkbox" 
                        checked={formData.is_promo ?? false}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_promo: e.target.checked }))}
                        className="rounded" 
                      />
                      <span>🎁 Promotie</span>
                    </label>
                  </div>
                  
                  {/* Promo Price - alleen tonen als promotie aan staat */}
                  {formData.is_promo && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <label className="block text-sm font-medium text-green-800 mb-2">
                        🎁 Actieprijs
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600 font-bold">€</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.promo_price || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, promo_price: parseFloat(e.target.value) || 0 }))}
                          className="w-full pl-10 pr-4 py-3 border-2 border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-bold"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-sm text-green-600 mt-2">
                        Originele prijs: €{(formData.price || 0).toFixed(2)} → Actieprijs: €{(formData.promo_price || 0).toFixed(2)}
                      </p>
                    </div>
                  )}
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
