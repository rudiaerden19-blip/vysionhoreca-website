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
import { useLanguage } from '@/i18n'
import PinGate from '@/components/PinGate'
import { useAdminConfirm } from '@/hooks/useAdminConfirm'

const ALLERGEN_IDS = [
  { id: 'gluten', icon: '🌾' },
  { id: 'ei', icon: '🥚' },
  { id: 'melk', icon: '🥛' },
  { id: 'noten', icon: '🥜' },
  { id: 'pinda', icon: '🥜' },
  { id: 'soja', icon: '🫘' },
  { id: 'vis', icon: '🐟' },
  { id: 'schaaldieren', icon: '🦐' },
  { id: 'selderij', icon: '🥬' },
  { id: 'mosterd', icon: '🟡' },
  { id: 'sesam', icon: '⚪' },
  { id: 'sulfiet', icon: '🍷' },
  { id: 'lupine', icon: '🌸' },
  { id: 'weekdieren', icon: '🐚' },
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
      className={`bg-white rounded-2xl shadow-sm overflow-hidden ${isDragging ? 'shadow-xl ring-2 ring-blue-500' : ''}`}
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

      {/* Image - vaste grootte voor uniformiteit */}
      <div className="relative h-40 bg-white overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gray-50">
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
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
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
              <span className="text-blue-600 font-bold text-lg">€{product.price.toFixed(2)}</span>
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
                  ? 'bg-blue-100 text-blue-600' 
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
  const { t } = useLanguage()
  const { ask, ConfirmModal } = useAdminConfirm(t)
  const [products, setProducts] = useState<MenuProduct[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [availableOptions, setAvailableOptions] = useState<ProductOption[]>([])
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])
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
    is_promo: false,
    promo_price: undefined,
    allergens: [],
    image_display_mode: null,
    print_label: false,
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
      const { data: result } = await saveMenuProduct(updated)
      if (result) {
        const saved = result
        setProducts(prev => prev.map(p => p.id === id ? saved : p))
      }
    }
  }

  const togglePopular = async (id: string) => {
    const product = products.find(p => p.id === id)
    if (product) {
      const updated = { ...product, is_popular: !product.is_popular }
      const { data: result } = await saveMenuProduct(updated)
      if (result) {
        const saved = result
        setProducts(prev => prev.map(p => p.id === id ? saved : p))
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!(await ask(t('adminPages.producten.confirmDelete')))) return
    const success = await deleteMenuProduct(id)
    if (success) {
      setProducts(prev => prev.filter(p => p.id !== id))
    } else {
      setError(t('adminPages.producten.deleteFailed'))
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
    // Reload categories in case new ones were added
    const freshCategories = await getMenuCategories(params.tenant)
    setCategories(freshCategories)
    
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

  const openAddModal = async () => {
    // Reload categories in case new ones were added
    const freshCategories = await getMenuCategories(params.tenant)
    setCategories(freshCategories)
    
    setFormData({
      name: '',
      description: '',
      price: 0,
      category_id: freshCategories[0]?.id || null,
      image_url: '',
      is_active: true,
      is_popular: false,
      is_promo: false,
      promo_price: undefined,
      allergens: [],
      image_display_mode: null,
      print_label: false,
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
      image_display_mode: formData.image_display_mode || null,
      print_label: formData.print_label ?? false,
    }

    const { data: result, error: saveError } = await saveMenuProduct(productData)
    
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
      setError(saveError || t('adminPages.producten.saveFailed'))
    }
    setSaving(false)
  }

  const getCategoryName = (categoryId: string | null) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.name || t('adminPages.producten.noCategory')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">{t('adminPages.common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
      <PinGate tenant={params.tenant}>
      <div className="max-w-6xl mx-auto">
      <ConfirmModal />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adminPages.producten.title')}</h1>
          <p className="text-gray-500">{products.length} {t('adminPages.producten.subtitle')}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAddModal}
          className="bg-blue-700 hover:bg-blue-800 text-white font-medium px-6 py-3 rounded-xl flex items-center gap-2"
        >
          <span>➕</span>
          <span>{t('adminPages.producten.newProduct')}</span>
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
            placeholder={t('adminPages.producten.searchPlaceholder')}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('Alle')}
            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
              selectedCategory === 'Alle'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('adminPages.producten.all')}
          </button>
          <button
            onClick={() => setSelectedCategory('Promoties')}
            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
              selectedCategory === 'Promoties'
                ? 'bg-green-500 text-white'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            🎁 {t('adminPages.producten.promotions')}
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.name
                  ? 'bg-blue-600 text-white'
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
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('adminPages.producten.noProductsFound')}</h3>
          <p className="text-gray-500 mb-6">{t('adminPages.producten.adjustFilters')}</p>
          <button
            onClick={openAddModal}
            className="bg-blue-700 hover:bg-blue-800 text-white font-medium px-6 py-3 rounded-xl"
          >
            + {t('adminPages.producten.newProduct')}
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
                    {editingProduct ? t('adminPages.producten.editProduct') : t('adminPages.producten.newProduct')}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">

                {/* ── SECTIE 1: Basis ── */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Basisinfo</p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('adminPages.producten.name')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setFormData(prev => ({ ...prev, name: val.charAt(0).toUpperCase() + val.slice(1) }))
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      placeholder={t('adminPages.producten.namePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('adminPages.producten.description')}
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder={t('adminPages.producten.descriptionPlaceholder')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('adminPages.producten.price')} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">€</span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.price || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base font-semibold"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('adminPages.producten.category')} <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.category_id || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value || null }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">{t('adminPages.producten.selectCategory')}</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── SECTIE 2: Foto ── */}
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">📸 Foto</p>
                  <MediaPicker
                    tenantSlug={params.tenant}
                    value={formData.image_url || ''}
                    onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                  />
                </div>

                {/* ── SECTIE 3: Status toggles ── */}
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">⚙️ Instellingen</p>

                  {[
                    { key: 'is_active', label: 'Beschikbaar', sub: 'Zichtbaar in menu & kassa', color: 'bg-green-500' },
                    { key: 'is_popular', label: '🔥 Populair', sub: 'Wordt gemarkeerd als bestseller', color: 'bg-blue-500' },
                    { key: 'is_promo', label: '🎁 Promotie', sub: 'Toon actieprijs', color: 'bg-orange-500' },
                    { key: 'print_label', label: '🏷️ Print label', sub: 'Druk sticker af bij bestelling', color: 'bg-purple-500' },
                  ].map(({ key, label, sub, color }) => {
                    const val = !!(formData as any)[key]
                    return (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{label}</p>
                          <p className="text-xs text-gray-400">{sub}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, [key]: !val }))}
                          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${val ? color : 'bg-gray-300'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${val ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    )
                  })}

                  {/* Promo prijs */}
                  {formData.is_promo && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                      <label className="block text-sm font-semibold text-orange-800 mb-2">Actieprijs</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-600 font-bold">€</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.promo_price || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, promo_price: parseFloat(e.target.value) || 0 }))}
                          className="w-full pl-10 pr-4 py-3 border-2 border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-bold"
                          placeholder="0.00"
                        />
                      </div>
                      {(formData.promo_price || 0) > 0 && (
                        <p className="text-sm text-orange-600 mt-2">
                          €{(formData.price || 0).toFixed(2)} → <strong>€{(formData.promo_price || 0).toFixed(2)}</strong>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* ── SECTIE 4: Opties ── */}
                {availableOptions.length > 0 && (
                  <div className="space-y-3 pt-2 border-t">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">🔧 Opties koppelen</p>
                    <div className="space-y-2">
                      {availableOptions.map(option => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleOptionSelection(option.id!)}
                          className={`w-full flex items-center gap-3 p-3 border-2 rounded-xl text-left transition-all ${
                            selectedOptionIds.includes(option.id!)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedOptionIds.includes(option.id!) ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                          }`}>
                            {selectedOptionIds.includes(option.id!) && <span className="text-white text-xs">✓</span>}
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{option.name}</span>
                            <div className="flex gap-1 mt-0.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${option.type === 'single' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                {option.type === 'single' ? 'Enkelvoudig' : 'Meervoudig'}
                              </span>
                              {option.required && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Verplicht</span>}
                            </div>
                          </div>
                          <span className="text-sm text-gray-400">{option.choices?.length || 0} keuzes</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── SECTIE 5: Allergenen ── */}
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">⚠️ Allergenen</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALLERGEN_IDS.map(allergen => {
                      const isSelected = formData.allergens?.includes(allergen.id) || false
                      const allergenName = t(`adminPages.allergenen.allergenNames.${allergen.id}`)
                      return (
                        <button
                          key={allergen.id}
                          type="button"
                          onClick={() => toggleAllergen(allergen.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-all border-2 ${
                            isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <span className="text-xl">{allergen.icon}</span>
                          <span className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                            {allergenName}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-6 border-t bg-gray-50 flex justify-end gap-4">
                <button
                  onClick={closeModal}
                  className="px-6 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  {t('adminPages.common.cancel')}
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
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
                  ) : (
                    <span>{editingProduct ? t('adminPages.common.save') : t('adminPages.common.add')}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
      </PinGate>
  )
}
