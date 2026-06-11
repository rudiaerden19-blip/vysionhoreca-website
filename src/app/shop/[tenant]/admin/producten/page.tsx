'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTenantModuleFlagsContext } from '@/lib/tenant-module-flags-context'
import {
  isHorecaKassaPosScreenEnabled,
  isRetailKassaPosScreenEnabled,
} from '@/lib/tenant-modules'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
  ProductOption,
  clampKassaProductImageZoom,
  KASSA_PRODUCT_IMAGE_ZOOM_MIN,
  KASSA_PRODUCT_IMAGE_ZOOM_MAX,
  compareMenuProductsBySortOrder,
} from '@/lib/admin-api'
import MediaPicker from '@/components/MediaPicker'
import { useLanguage } from '@/i18n'
import PinGate from '@/components/PinGate'
import { useAdminConfirm } from '@/hooks/useAdminConfirm'

type ProductCatalogMode = 'horeca' | 'retail'

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

function normalizeProductBarcodeScan(raw: string): string {
  return raw.replace(/\s/g, '').trim()
}

/** Tekst prijs zoals gebruiker tikt — komma of punt als decimaal (BE/NL). */
function parseLocalizedMoneyInput(raw: string): number {
  const n = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (n === '' || n === '.') return NaN
  const v = parseFloat(n)
  return Number.isFinite(v) ? v : NaN
}

function isPartialMoneyInput(raw: string): boolean {
  const t = raw.trim().replace(/\s/g, '')
  if (t === '') return true
  if (t.includes(',') && t.includes('.')) return false
  const normalized = t.includes(',') ? t.replace(',', '.') : t
  return /^\d*\.?\d*$/.test(normalized)
}

/** Bestaande prijs naar invoerveld (komma waar nodig). */
function loadedPriceToInputStr(v: number | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return ''
  const num = Number(v)
  if (num === 0) return ''
  if (Math.abs(num % 1) < 1e-9) return String(num)
  return num.toFixed(2).replace('.', ',')
}

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
        className="touch-none select-none bg-gray-50 px-4 py-2 cursor-grab active:cursor-grabbing flex items-center justify-center gap-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors border-b"
      >
        <span className="text-lg">⠿</span>
        <span className="text-xs font-medium">Sleep om te verplaatsen</span>
      </div>

      {/* Image — object-fit volgt image_display_mode (zelfde als webshop/kassa) */}
      <div
        className={`relative h-40 overflow-hidden ${product.image_display_mode === 'contain' ? 'bg-gray-50' : 'bg-white'}`}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            draggable={false}
            className={`w-full h-full pointer-events-none ${product.image_display_mode === 'contain' ? 'object-contain object-center' : 'object-cover object-center'}`}
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
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[5]">
            <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
              Niet beschikbaar
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] px-2 pb-2">
          <h3 className="font-bold text-black text-sm line-clamp-2">{product.name}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-2">
          <span className="text-sm text-gray-500">{category?.name || 'Geen categorie'}</span>
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
  const searchParams = useSearchParams()
  const { moduleAccess, enabledModulesJson } = useTenantModuleFlagsContext()
  const horecaKassaOn = isHorecaKassaPosScreenEnabled(moduleAccess)
  const retailKassaOn = isRetailKassaPosScreenEnabled(moduleAccess, enabledModulesJson)
  const forcedCatalogMode: ProductCatalogMode | null = !horecaKassaOn
    ? 'retail'
    : !retailKassaOn
      ? 'horeca'
      : null
  const showCatalogSlider = horecaKassaOn && retailKassaOn
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
    kassa_image_zoom: 1,
    print_label: false,
  })

  /** Invoeveld tekst voor prijs (komma ok); numerieke payload zit pas in save. */
  const [priceInputStr, setPriceInputStr] = useState('')
  const [promoPriceInputStr, setPromoPriceInputStr] = useState('')
  const [catalogMode, setCatalogMode] = useState<ProductCatalogMode>('horeca')
  const productBarcodeScanRef = useRef<HTMLInputElement>(null)
  const [productBarcodeScanActive, setProductBarcodeScanActive] = useState(false)

  const isRetailForm = catalogMode === 'retail'

  const retailPricePackHint = useMemo(() => {
    if (!isRetailForm) return ''
    const unit = formData.retail_sale_unit || 'stuk'
    const qty = Math.floor(Number(formData.retail_unit_quantity) || 0)
    const unitLabel = t(`adminPages.producten.retailSaleUnit_${unit}`)
    if (unit === 'stuk' && qty <= 1) {
      return t('adminPages.producten.retailPricePerScanStuk')
    }
    if (qty > 1) {
      return t('adminPages.producten.retailPricePackHint')
        .replace('{unit}', unitLabel)
        .replace('{n}', String(qty))
    }
    return t('adminPages.producten.retailPricePackHintSingle').replace('{unit}', unitLabel)
  }, [isRetailForm, formData.retail_sale_unit, formData.retail_unit_quantity, t])

  function resolveCatalogModeForProduct(product?: MenuProduct | null): ProductCatalogMode {
    if (forcedCatalogMode) return forcedCatalogMode
    const saved = product?.catalog_mode
    if (saved === 'retail' || saved === 'horeca') return saved
    if (product && (product.barcode || product.track_stock || product.article_number)) {
      return 'retail'
    }
    const q = searchParams.get('mode')
    if (q === 'retail') return 'retail'
    return horecaKassaOn ? 'horeca' : 'retail'
  }

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

  const filteredProducts = useMemo(() => {
    const filt = products.filter((p) => {
      const category = categories.find((c) => c.id === p.category_id)
      const matchesCategory =
        selectedCategory === 'Promoties'
          ? (p as { is_promo?: boolean }).is_promo === true
          : selectedCategory === 'Alle'
            ? true
            : category?.name === selectedCategory
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
    return [...filt].sort(compareMenuProductsBySortOrder)
  }, [products, categories, selectedCategory, searchQuery])

  const modalParsedPricePreview = useMemo(() => {
    const p = parseLocalizedMoneyInput(priceInputStr)
    return Number.isFinite(p) ? p : (formData.price ?? 0)
  }, [priceInputStr, formData.price])

  const modalParsedPromoPreview = useMemo(() => {
    const p = parseLocalizedMoneyInput(promoPriceInputStr)
    return Number.isFinite(p) ? p : (formData.promo_price ?? 0)
  }, [promoPriceInputStr, formData.promo_price])

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
    const success = await deleteMenuProduct(id, params.tenant)
    if (success) {
      setProducts(prev => prev.filter(p => p.id !== id))
    } else {
      setError(t('adminPages.producten.deleteFailed'))
    }
  }

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Herneem volgorde zoals in admin: sort_order is per categorie; bij "Alle" globaal genummerd.
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    if (searchQuery.trim()) return

    let scopeList: MenuProduct[]
    if (selectedCategory === 'Alle') {
      scopeList = [...products].sort(compareMenuProductsBySortOrder)
    } else if (selectedCategory === 'Promoties') {
      scopeList = [...products.filter((p) => (p as { is_promo?: boolean }).is_promo)].sort(
        compareMenuProductsBySortOrder
      )
    } else {
      const cat = categories.find((c) => c.name === selectedCategory)
      if (!cat?.id) return
      scopeList = [...products.filter((p) => p.category_id === cat.id)].sort(
        compareMenuProductsBySortOrder
      )
    }

    const oldIndex = scopeList.findIndex((p) => p.id === active.id)
    const newIndex = scopeList.findIndex((p) => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(scopeList, oldIndex, newIndex)
    const updates = newOrder.map((product, index) => ({
      ...product,
      sort_order: index,
    }))

    setProducts((prev) => {
      const byId = new Map(updates.map((u) => [u.id!, u]))
      const merged = prev.map((p) => (byId.has(p.id!) ? byId.get(p.id!)! : p))
      return merged.sort(compareMenuProductsBySortOrder)
    })

    void Promise.all(updates.map((p) => saveMenuProduct(p)))
  }

  const openEditModal = async (product: MenuProduct) => {
    setError('')
    // Reload categories in case new ones were added
    const freshCategories = await getMenuCategories(params.tenant)
    setCategories(freshCategories)
    
    setCatalogMode(resolveCatalogModeForProduct(product))
    setFormData({
      ...product,
    })
    setPriceInputStr(loadedPriceToInputStr(Number(product.price)))
    const promo = product.promo_price != null ? Number(product.promo_price) : NaN
    setPromoPriceInputStr(Number.isFinite(promo) && promo > 0 ? loadedPriceToInputStr(promo) : '')
    setEditingProduct(product)
    // Load linked options
    if (product.id) {
      const linkedOptions = await getProductOptionLinks(product.id)
      setSelectedOptionIds(linkedOptions)
    }
  }

  const openAddModal = async () => {
    setError('')
    // Reload categories in case new ones were added
    const freshCategories = await getMenuCategories(params.tenant)
    setCategories(freshCategories)
    
    const mode = resolveCatalogModeForProduct(null)
    setCatalogMode(mode)
    setFormData({
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
      image_display_mode: mode === 'retail' ? null : 'contain',
      kassa_image_zoom: 1,
      print_label: false,
      track_stock: mode === 'retail',
      stock_quantity: 0,
      low_stock_threshold: 5,
      article_number: '',
      barcode: '',
      size_label: '',
      color_label: '',
      catalog_mode: mode,
      retail_sale_unit: 'stuk',
      retail_unit_quantity: undefined,
    })
    setSelectedOptionIds([])
    setPriceInputStr('')
    setPromoPriceInputStr('')
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingProduct(null)
    setFormData({})
    setSelectedOptionIds([])
    setError('')
    setPriceInputStr('')
    setPromoPriceInputStr('')
    setProductBarcodeScanActive(false)
  }

  const applyProductBarcodeScan = useCallback((raw: string) => {
    const code = normalizeProductBarcodeScan(raw)
    if (!code) return
    setFormData((prev) => ({ ...prev, barcode: code }))
    setProductBarcodeScanActive(false)
    if (productBarcodeScanRef.current) productBarcodeScanRef.current.value = ''
  }, [])

  const startProductBarcodeScan = useCallback(() => {
    setProductBarcodeScanActive(true)
    if (productBarcodeScanRef.current) productBarcodeScanRef.current.value = ''
    requestAnimationFrame(() => productBarcodeScanRef.current?.focus({ preventScroll: true }))
  }, [])

  const onProductBarcodeScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    applyProductBarcodeScan(e.currentTarget.value)
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

    try {
      const priceNum = parseLocalizedMoneyInput(priceInputStr)
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        setError(t('adminPages.producten.invalidPrice'))
        setSaving(false)
        return
      }

      let promoNum: number | undefined
      if (formData.is_promo) {
        const pr = parseLocalizedMoneyInput(promoPriceInputStr)
        if (!Number.isFinite(pr) || pr < 0) {
          setError(t('adminPages.producten.invalidPrice'))
          setSaving(false)
          return
        }
        promoNum = pr
      } else {
        promoNum = undefined
      }

      const saveMode = forcedCatalogMode ?? catalogMode
      if (saveMode === 'retail') {
        const bc = normalizeProductBarcodeScan(formData.barcode || '')
        if (!bc) {
          setError(t('adminPages.producten.barcodeRequired'))
          setSaving(false)
          return
        }
      }

      const productData: MenuProduct = {
        id: editingProduct?.id,
        tenant_slug: params.tenant,
        category_id: formData.category_id || null,
        name: formData.name || '',
        description: formData.description || '',
        price: priceNum,
        image_url: formData.image_url || '',
        is_active: formData.is_active ?? true,
        is_popular: saveMode === 'retail' ? false : (formData.is_popular ?? false),
        is_promo: saveMode === 'retail' ? false : (formData.is_promo ?? false),
        promo_price: saveMode === 'retail' ? undefined : promoNum,
        sort_order: editingProduct?.sort_order || products.length,
        allergens: saveMode === 'retail' ? [] : formData.allergens || [],
        image_display_mode: saveMode === 'retail' ? null : formData.image_display_mode || null,
        kassa_image_zoom:
          saveMode === 'retail' ? 1 : clampKassaProductImageZoom(formData.kassa_image_zoom as number),
        print_label: saveMode === 'retail' ? false : (formData.print_label ?? false),
        catalog_mode: saveMode,
        barcode:
          saveMode === 'retail'
            ? normalizeProductBarcodeScan(formData.barcode || '') || null
            : formData.barcode ?? null,
        article_number:
          saveMode === 'retail' ? formData.article_number?.trim() || null : formData.article_number ?? null,
        size_label: saveMode === 'retail' ? formData.size_label?.trim() || null : formData.size_label ?? null,
        color_label: saveMode === 'retail' ? formData.color_label?.trim() || null : formData.color_label ?? null,
        track_stock: saveMode === 'retail' ? !!formData.track_stock : formData.track_stock,
        stock_quantity:
          saveMode === 'retail' && formData.track_stock
            ? Math.max(0, Math.floor(Number(formData.stock_quantity) || 0))
            : formData.stock_quantity,
        low_stock_threshold:
          saveMode === 'retail'
            ? Math.max(0, Math.floor(Number(formData.low_stock_threshold) || 0))
            : formData.low_stock_threshold,
        retail_sale_unit:
          saveMode === 'retail'
            ? (formData.retail_sale_unit as MenuProduct['retail_sale_unit']) || 'stuk'
            : null,
        retail_unit_quantity:
          saveMode === 'retail'
            ? (() => {
                const n = Math.floor(Number(formData.retail_unit_quantity) || 0)
                return n > 0 ? n : null
              })()
            : null,
      }

      const { data: result, error: saveError } = await saveMenuProduct(productData)

      if (!result) {
        setError(saveError || t('adminPages.producten.saveFailed'))
        return
      }

      if (result.id && saveMode === 'horeca') {
        await saveProductOptionLinks(result.id, selectedOptionIds, params.tenant)
      }

      if (editingProduct) {
        setProducts((prev) => prev.map((p) => (p.id === result.id ? result : p)))
      } else {
        setProducts((prev) => [...prev, result])
      }
      closeModal()
    } catch (e) {
      console.error('saveMenuProduct failed', e)
      setError(
        e instanceof Error ? e.message : t('adminPages.producten.saveFailed')
      )
    } finally {
      setSaving(false)
    }
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
        <div className="flex flex-col sm:flex-row gap-2">
          {retailKassaOn ? (
            <Link
              href={`/shop/${params.tenant}/admin/producten/intake`}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-6 py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <span>📱</span>
              <span>{t('adminPages.productIntake.title')}</span>
            </Link>
          ) : null}
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
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
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
                    type="button"
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
                {error ? (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}
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
                      placeholder=""
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
                      placeholder=""
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
                          type="text"
                          inputMode="decimal"
                          value={priceInputStr}
                          onChange={(e) => {
                            const raw = e.target.value
                            if (isPartialMoneyInput(raw)) setPriceInputStr(raw)
                          }}
                          className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base font-semibold"
                          placeholder="0,00"
                        />
                      </div>
                      {isRetailForm && retailPricePackHint ? (
                        <p className="mt-1.5 text-xs text-gray-500">{retailPricePackHint}</p>
                      ) : null}
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
                        <option value="">{isRetailForm ? '' : t('adminPages.producten.selectCategory')}</option>
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
                  {!isRetailForm ? (
                  <>
                  <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                    <label className="block text-sm font-medium text-gray-800">
                      {t('adminPages.producten.imageDisplayMode')}
                    </label>
                    <p className="text-xs text-gray-600">{t('adminPages.producten.productImageFitHint')}</p>
                    <div className="flex flex-wrap gap-2">
                      {(['contain', 'cover'] as const).map((mode) => {
                        const selected =
                          (formData.image_display_mode === 'contain') === (mode === 'contain')
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                image_display_mode: mode,
                              }))
                            }
                            className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                              selected
                                ? 'border-orange-500 bg-orange-50 text-orange-900'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {mode === 'contain'
                              ? t('adminPages.producten.imageContain')
                              : t('adminPages.producten.imageCover')}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {!!formData.image_url?.trim() && (
                    <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                      {formData.image_display_mode === 'contain' ? (
                        <>
                          <p className="text-sm font-medium text-gray-800">{t('adminPages.producten.kassaImageZoomPreview')}</p>
                          <p className="text-xs text-gray-600">{t('adminPages.producten.productImageContainNoZoomNote')}</p>
                          <div className="relative mx-auto aspect-[4/5] w-full max-w-[200px] overflow-hidden rounded-xl bg-neutral-300 ring-2 ring-neutral-400/30">
                            <img
                              src={formData.image_url}
                              alt=""
                              className="h-full w-full object-contain object-center"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-800">
                              {t('adminPages.producten.kassaImageZoom')}
                            </label>
                            <p className="text-xs text-gray-600">{t('adminPages.producten.kassaImageZoomHint')}</p>
                          </div>
                          <p className="text-xs font-medium text-gray-500">
                            {t('adminPages.producten.kassaImageZoomPreview')}
                          </p>
                          <div className="relative mx-auto aspect-[4/5] w-full max-w-[200px] overflow-hidden rounded-xl bg-neutral-300 ring-2 ring-neutral-400/30">
                            <img
                              src={formData.image_url}
                              alt=""
                              className="h-full w-full object-cover object-center"
                              style={{
                                transform: `scale(${clampKassaProductImageZoom(formData.kassa_image_zoom as number)})`,
                                transformOrigin: 'center 78%',
                              }}
                            />
                          </div>
                          <input
                            type="range"
                            min={KASSA_PRODUCT_IMAGE_ZOOM_MIN}
                            max={KASSA_PRODUCT_IMAGE_ZOOM_MAX}
                            step={0.05}
                            value={clampKassaProductImageZoom(formData.kassa_image_zoom as number)}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                kassa_image_zoom: parseFloat(e.target.value),
                              }))
                            }
                            className="w-full accent-orange-500"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{Math.round(KASSA_PRODUCT_IMAGE_ZOOM_MIN * 100)}%</span>
                            <span>{Math.round(clampKassaProductImageZoom(formData.kassa_image_zoom as number) * 100)}%</span>
                            <span>{Math.round(KASSA_PRODUCT_IMAGE_ZOOM_MAX * 100)}%</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  </>
                  ) : null}
                </div>

                {/* ── SECTIE 3: Status toggles ── */}
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">⚙️ Instellingen</p>

                  {[
                    { key: 'is_active', label: 'Beschikbaar', sub: 'Zichtbaar in menu & kassa', color: 'bg-green-500' },
                    ...(isRetailForm
                      ? []
                      : [
                          { key: 'is_popular', label: '🔥 Populair', sub: 'Wordt gemarkeerd als bestseller', color: 'bg-blue-500' },
                          { key: 'is_promo', label: '🎁 Promotie', sub: 'Toon actieprijs', color: 'bg-orange-500' },
                          { key: 'print_label', label: '🏷️ Print label', sub: 'Druk sticker af bij bestelling', color: 'bg-purple-500' },
                        ]),
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
                  {formData.is_promo && !isRetailForm && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                      <label className="block text-sm font-semibold text-orange-800 mb-2">Actieprijs</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-600 font-bold">€</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={promoPriceInputStr}
                          onChange={(e) => {
                            const raw = e.target.value
                            if (isPartialMoneyInput(raw)) setPromoPriceInputStr(raw)
                          }}
                          className="w-full pl-10 pr-4 py-3 border-2 border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-bold"
                          placeholder="0,00"
                        />
                      </div>
                      {(modalParsedPromoPreview || 0) > 0 && (
                        <p className="text-sm text-orange-600 mt-2">
                          €{modalParsedPricePreview.toFixed(2)} →{' '}
                          <strong>€{(modalParsedPromoPreview || 0).toFixed(2)}</strong>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* ── SECTIE 4: Opties ── */}
                {availableOptions.length > 0 && !isRetailForm && (
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

                {/* ── Catalogus: Horeca / Retail ── */}
                <div className="space-y-3 pt-2 border-t">
                  {showCatalogSlider ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">
                        {t('adminPages.producten.catalogModeLabel')}
                      </p>
                      <div className="flex gap-2 rounded-xl bg-gray-100 p-1">
                        <button
                          type="button"
                          onClick={() => setCatalogMode('horeca')}
                          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                            catalogMode === 'horeca'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {t('adminPages.producten.catalogModeHoreca')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCatalogMode('retail')
                            setFormData((prev) => ({ ...prev, allergens: [] }))
                          }}
                          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                            catalogMode === 'retail'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {t('adminPages.producten.catalogModeRetail')}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {isRetailForm ? (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {t('adminPages.producten.retailFieldsTitle')}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('adminPages.producten.barcode')}{' '}
                            <span className="text-red-500">*</span>
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              value={formData.barcode || ''}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  barcode: normalizeProductBarcodeScan(e.target.value),
                                }))
                              }
                              className="flex-1 min-w-0 px-3 py-2.5 border border-gray-200 rounded-xl font-mono tabular-nums"
                              placeholder=""
                            />
                            <button
                              type="button"
                              onClick={startProductBarcodeScan}
                              className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                                productBarcodeScanActive
                                  ? 'border-blue-600 bg-blue-50 text-blue-800'
                                  : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
                              }`}
                            >
                              {productBarcodeScanActive
                                ? t('adminPages.producten.scanProductListening')
                                : t('adminPages.producten.scanProductButton')}
                            </button>
                          </div>
                          <p className="mt-1.5 text-xs text-gray-500">
                            {productBarcodeScanActive
                              ? t('adminPages.producten.scanProductListeningHint')
                              : t('adminPages.producten.scanProductHint')}
                          </p>
                          <input
                            ref={productBarcodeScanRef}
                            type="text"
                            tabIndex={-1}
                            autoComplete="off"
                            aria-hidden
                            onKeyDown={onProductBarcodeScanKeyDown}
                            onBlur={() => {
                              window.setTimeout(() => setProductBarcodeScanActive(false), 120)
                            }}
                            className="fixed left-0 top-0 h-px w-px opacity-0 overflow-hidden pointer-events-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('adminPages.producten.articleNumber')}
                          </label>
                          <input
                            type="text"
                            value={formData.article_number || ''}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, article_number: e.target.value }))
                            }
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl"
                            placeholder=""
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('adminPages.producten.sizeLabel')}
                          </label>
                          <input
                            type="text"
                            value={formData.size_label || ''}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, size_label: e.target.value }))
                            }
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl"
                            placeholder=""
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('adminPages.producten.colorLabel')}
                          </label>
                          <input
                            type="text"
                            value={formData.color_label || ''}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, color_label: e.target.value }))
                            }
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl"
                            placeholder=""
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('adminPages.producten.retailSaleUnitLabel')}
                          </label>
                          <select
                            value={formData.retail_sale_unit || 'stuk'}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                retail_sale_unit: e.target.value as MenuProduct['retail_sale_unit'],
                              }))
                            }
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white"
                          >
                            <option value="stuk">{t('adminPages.producten.retailSaleUnit_stuk')}</option>
                            <option value="doos">{t('adminPages.producten.retailSaleUnit_doos')}</option>
                            <option value="bak">{t('adminPages.producten.retailSaleUnit_bak')}</option>
                            <option value="pallet">{t('adminPages.producten.retailSaleUnit_pallet')}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('adminPages.producten.retailUnitQuantityLabel')}
                          </label>
                          <input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            value={
                              formData.retail_unit_quantity != null &&
                              formData.retail_unit_quantity !== undefined
                                ? formData.retail_unit_quantity
                                : ''
                            }
                            onChange={(e) => {
                              const raw = e.target.value.trim()
                              setFormData((prev) => ({
                                ...prev,
                                retail_unit_quantity: raw
                                  ? Math.max(1, parseInt(raw, 10) || 0)
                                  : undefined,
                              }))
                            }}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white"
                            placeholder=""
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            {t('adminPages.producten.retailUnitQuantityHint')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">
                            {t('adminPages.producten.trackStock')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, track_stock: !prev.track_stock }))
                          }
                          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                            formData.track_stock ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                              formData.track_stock ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      {formData.track_stock ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t('adminPages.producten.stockQuantity')}
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={formData.stock_quantity ?? 0}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  stock_quantity: parseInt(e.target.value || '0', 10) || 0,
                                }))
                              }
                              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t('adminPages.producten.lowStockThreshold')}
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={formData.low_stock_threshold ?? 5}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  low_stock_threshold: parseInt(e.target.value || '0', 10) || 0,
                                }))
                              }
                              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-3">
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
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="p-6 border-t bg-gray-50 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  {t('adminPages.common.cancel')}
                </button>
                <button
                  type="button"
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
