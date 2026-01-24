'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'
import { searchSupplierProducts, SupplierProduct } from '@/lib/admin-api'

interface Product {
  id: string
  name: string
  price: number
  category_id: string
  price_multiplier: number | null
}

interface Ingredient {
  id: string
  name: string
  unit: string
  purchase_price: number
  cost_category_id: string | null
}

interface ProductIngredient {
  id: string
  product_id: string
  ingredient_id: string
  quantity: number
  ingredient?: Ingredient
}

interface CostCategory {
  id: string
  name: string
  multiplier: number
}

interface ProductCostData {
  product: Product
  ingredients: ProductIngredient[]
  totalCost: number
  requiredPrice: number
  status: 'good' | 'low' | 'high'
  difference: number
  usedMultiplier: number
}

export default function ProductCostsPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [productIngredients, setProductIngredients] = useState<ProductIngredient[]>([])
  const [categories, setCategories] = useState<CostCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [defaultMultiplier, setDefaultMultiplier] = useState(3.0)

  // For adding ingredients to product
  const [addingIngredient, setAddingIngredient] = useState<string>('')
  const [addingQuantity, setAddingQuantity] = useState<number>(1)

  // Product multiplier editing
  const [editingMultiplier, setEditingMultiplier] = useState<{[key: string]: string}>({})

  // Ingredient search state
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [searchResults, setSearchResults] = useState<{
    own: Ingredient[]
    database: SupplierProduct[]
  }>({ own: [], database: [] })
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Vaste standaardprijzen state
  const [standardPrices, setStandardPrices] = useState({
    saus: 0.12,
    sla: 0.13,
    tomaat: 0.14,
    ei: 0.12,
    potje_saus: 0.16,
    verpakking: 0.30,
    kosten_per_stuk: 0.40
  })
  const [savingStandardPrices, setSavingStandardPrices] = useState(false)
  const [standardPricesSaved, setStandardPricesSaved] = useState(false)

  useEffect(() => {
    loadData()
  }, [params.tenant])

  // Click outside to close search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadData() {
    
    // Use tenant_slug directly
    setBusinessId(params.tenant)

    // Load all data in parallel
    const [productsRes, ingredientsRes, categoriesRes, productIngsRes] = await Promise.all([
      supabase.from('menu_products').select('id, name, price, category_id, price_multiplier').eq('tenant_slug', params.tenant).order('name'),
      supabase.from('ingredients').select('*').eq('tenant_slug', params.tenant).order('name'),
      supabase.from('cost_categories').select('*').eq('tenant_slug', params.tenant),
      supabase.from('product_ingredients').select('*').eq('tenant_slug', params.tenant)
    ])

    if (productsRes.data) setProducts(productsRes.data)
    if (ingredientsRes.data) setIngredients(ingredientsRes.data)
    if (categoriesRes.data) setCategories(categoriesRes.data)
    if (productIngsRes.data) setProductIngredients(productIngsRes.data)

    // Calculate average multiplier
    if (categoriesRes.data && categoriesRes.data.length > 0) {
      const avg = categoriesRes.data.reduce((sum, c) => sum + c.multiplier, 0) / categoriesRes.data.length
      setDefaultMultiplier(avg)
    }

    // Load standard prices from localStorage
    try {
      const savedPrices = localStorage.getItem(`standard_prices_${params.tenant}`)
      if (savedPrices) {
        setStandardPrices(JSON.parse(savedPrices))
      }
    } catch (e) {
      console.error('Failed to load standard prices:', e)
    }

    setLoading(false)
  }

  // Save standard prices to localStorage
  async function saveStandardPrices() {
    setSavingStandardPrices(true)
    try {
      localStorage.setItem(`standard_prices_${params.tenant}`, JSON.stringify(standardPrices))
      setStandardPricesSaved(true)
      setTimeout(() => setStandardPricesSaved(false), 2000)
    } catch (e) {
      console.error('Failed to save standard prices:', e)
    }
    setSavingStandardPrices(false)
  }

  // Search function for both own ingredients and database
  async function handleIngredientSearch(query: string, productIngredientIds: string[]) {
    setIngredientSearch(query)
    
    if (query.length < 2) {
      setSearchResults({ own: [], database: [] })
      return
    }

    setSearching(true)
    setShowSearchResults(true)

    // Search own ingredients (already loaded)
    const ownResults = ingredients.filter(i => 
      i.name.toLowerCase().includes(query.toLowerCase()) &&
      !productIngredientIds.includes(i.id)
    ).slice(0, 10)

    // Search database
    console.log('Searching for:', query)
    const dbResults = await searchSupplierProducts(query, undefined, 10)
    console.log('Database results:', dbResults)

    setSearchResults({
      own: ownResults,
      database: dbResults
    })
    setSearching(false)
  }

  // Add ingredient from database (creates new ingredient first)
  async function addDatabaseIngredient(product: SupplierProduct, productId: string) {
    if (!businessId) return

    // Check if already exists by article number
    const existing = ingredients.find(i => i.notes?.includes(`Art. #${product.article_number}`))
    
    let ingredientId: string

    if (existing) {
      ingredientId = existing.id
    } else {
      // Create new ingredient
      const { data: newIng } = await supabase
        .from('ingredients')
        .insert({
          tenant_slug: businessId,
          name: product.name,
          unit: product.unit || 'stuk',
          purchase_price: product.unit_price,
          units_per_package: product.units_per_package,
          package_price: product.package_price,
          notes: `Art. #${product.article_number}`
        })
        .select()
        .single()

      if (!newIng) return
      ingredientId = newIng.id
      setIngredients(prev => [...prev, newIng].sort((a, b) => a.name.localeCompare(b.name)))
    }

    // Add to product
    const { data: pi } = await supabase
      .from('product_ingredients')
      .insert({
        tenant_slug: businessId,
        product_id: productId,
        ingredient_id: ingredientId,
        quantity: addingQuantity
      })
      .select()
      .single()

    if (pi) {
      setProductIngredients(prev => [...prev, pi])
    }

    // Reset search
    setIngredientSearch('')
    setSearchResults({ own: [], database: [] })
    setShowSearchResults(false)
    setAddingQuantity(1)
  }

  // Add own ingredient directly
  async function addOwnIngredient(ingredient: Ingredient, productId: string) {
    if (!businessId) return

    const { data: pi } = await supabase
      .from('product_ingredients')
      .insert({
        tenant_slug: businessId,
        product_id: productId,
        ingredient_id: ingredient.id,
        quantity: addingQuantity
      })
      .select()
      .single()

    if (pi) {
      setProductIngredients(prev => [...prev, pi])
    }

    // Reset search
    setIngredientSearch('')
    setSearchResults({ own: [], database: [] })
    setShowSearchResults(false)
    setAddingQuantity(1)
  }

  function getProductCostData(product: Product): ProductCostData {
    const prodIngs = productIngredients.filter(pi => pi.product_id === product.id)
    
    let totalCost = 0
    let totalMultiplier = 0
    let ingredientCount = 0

    prodIngs.forEach(pi => {
      const ing = ingredients.find(i => i.id === pi.ingredient_id)
      if (ing) {
        totalCost += ing.purchase_price * pi.quantity
        
        // Get multiplier from ingredient's category
        if (ing.cost_category_id) {
          const cat = categories.find(c => c.id === ing.cost_category_id)
          if (cat) {
            totalMultiplier += cat.multiplier
            ingredientCount++
          }
        }
      }
    })

    // Use product-specific multiplier if set, otherwise use category average or default
    const avgMultiplier = product.price_multiplier 
      ? product.price_multiplier 
      : (ingredientCount > 0 ? totalMultiplier / ingredientCount : defaultMultiplier)
    const requiredPrice = totalCost * avgMultiplier

    let status: 'good' | 'low' | 'high' = 'good'
    const difference = product.price - requiredPrice

    if (totalCost === 0) {
      status = 'good' // No ingredients yet
    } else if (product.price < requiredPrice * 0.95) {
      status = 'low'
    } else if (product.price > requiredPrice * 1.3) {
      status = 'high'
    }

    return {
      product,
      ingredients: prodIngs.map(pi => ({
        ...pi,
        ingredient: ingredients.find(i => i.id === pi.ingredient_id)
      })),
      totalCost,
      requiredPrice,
      status,
      difference,
      usedMultiplier: avgMultiplier
    }
  }

  async function addIngredientToProduct() {
    if (!selectedProduct || !addingIngredient || !businessId) return

    
    const { data } = await supabase
      .from('product_ingredients')
      .insert({
        tenant_slug: businessId,
        product_id: selectedProduct,
        ingredient_id: addingIngredient,
        quantity: addingQuantity
      })
      .select()
      .single()

    if (data) {
      setProductIngredients(prev => [...prev, data])
      setAddingIngredient('')
      setAddingQuantity(1)
    }
  }

  async function removeIngredientFromProduct(piId: string) {
    await supabase.from('product_ingredients').delete().eq('id', piId)
    setProductIngredients(prev => prev.filter(pi => pi.id !== piId))
  }

  async function updateIngredientQuantity(piId: string, quantity: number) {
    await supabase.from('product_ingredients').update({ quantity }).eq('id', piId)
    setProductIngredients(prev => prev.map(pi => pi.id === piId ? { ...pi, quantity } : pi))
  }

  async function updateProductMultiplier(productId: string, multiplier: number | null) {
    await supabase.from('menu_products').update({ price_multiplier: multiplier }).eq('id', productId)
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, price_multiplier: multiplier } : p))
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const productCosts = filteredProducts.map(p => getProductCostData(p))

  // Stats
  const stats = {
    total: productCosts.length,
    configured: productCosts.filter(pc => pc.ingredients.length > 0).length,
    good: productCosts.filter(pc => pc.status === 'good' && pc.ingredients.length > 0).length,
    low: productCosts.filter(pc => pc.status === 'low').length,
    high: productCosts.filter(pc => pc.status === 'high').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📊 {t('dashboard.productCosts.title')}</h1>
        <p className="text-gray-500 mt-1">
          {t('dashboard.productCosts.subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">{t('dashboard.productCosts.products')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.configured}</div>
          <div className="text-sm text-gray-500">{t('dashboard.productCosts.configured')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow text-center">
          <div className="text-2xl font-bold text-green-600">{stats.good}</div>
          <div className="text-sm text-gray-500">{t('dashboard.productCosts.good')} ✓</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow text-center">
          <div className="text-2xl font-bold text-red-600">{stats.low}</div>
          <div className="text-sm text-gray-500">{t('dashboard.productCosts.tooLow')} ⚠️</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
          <div className="text-sm text-gray-500">{t('dashboard.productCosts.tooHigh')}</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder={`🔍 ${t('dashboard.productCosts.searchProduct')}`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      {/* Vaste Standaardprijzen Kader */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-blue-900 flex items-center gap-2">
            💰 Vaste Standaardprijzen
          </h3>
          <button
            onClick={saveStandardPrices}
            disabled={savingStandardPrices}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
              standardPricesSaved 
                ? 'bg-green-500 text-white' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            } disabled:opacity-50`}
          >
            {savingStandardPrices ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Opslaan...</>
            ) : standardPricesSaved ? (
              <>✓ Opgeslagen!</>
            ) : (
              <>💾 Opslaan</>
            )}
          </button>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Saus */}
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <label className="block text-xs text-gray-600 mb-1">Saus</label>
            <div className="flex items-center">
              <span className="text-gray-400 text-sm mr-1">€</span>
              <input
                type="text"
                inputMode="decimal"
                value={standardPrices.saus}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.')
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setStandardPrices(prev => ({ ...prev, saus: parseFloat(val) || 0 }))
                  }
                }}
                className="w-full px-2 py-1 border rounded text-sm text-center font-mono"
              />
            </div>
          </div>
          
          {/* Sla */}
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <label className="block text-xs text-gray-600 mb-1">Sla</label>
            <div className="flex items-center">
              <span className="text-gray-400 text-sm mr-1">€</span>
              <input
                type="text"
                inputMode="decimal"
                value={standardPrices.sla}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.')
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setStandardPrices(prev => ({ ...prev, sla: parseFloat(val) || 0 }))
                  }
                }}
                className="w-full px-2 py-1 border rounded text-sm text-center font-mono"
              />
            </div>
          </div>
          
          {/* Tomaat */}
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <label className="block text-xs text-gray-600 mb-1">Tomaat</label>
            <div className="flex items-center">
              <span className="text-gray-400 text-sm mr-1">€</span>
              <input
                type="text"
                inputMode="decimal"
                value={standardPrices.tomaat}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.')
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setStandardPrices(prev => ({ ...prev, tomaat: parseFloat(val) || 0 }))
                  }
                }}
                className="w-full px-2 py-1 border rounded text-sm text-center font-mono"
              />
            </div>
          </div>
          
          {/* Ei */}
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <label className="block text-xs text-gray-600 mb-1">Ei</label>
            <div className="flex items-center">
              <span className="text-gray-400 text-sm mr-1">€</span>
              <input
                type="text"
                inputMode="decimal"
                value={standardPrices.ei}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.')
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setStandardPrices(prev => ({ ...prev, ei: parseFloat(val) || 0 }))
                  }
                }}
                className="w-full px-2 py-1 border rounded text-sm text-center font-mono"
              />
            </div>
          </div>
          
          {/* Potje saus */}
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <label className="block text-xs text-gray-600 mb-1">Potje saus</label>
            <div className="flex items-center">
              <span className="text-gray-400 text-sm mr-1">€</span>
              <input
                type="text"
                inputMode="decimal"
                value={standardPrices.potje_saus}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.')
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setStandardPrices(prev => ({ ...prev, potje_saus: parseFloat(val) || 0 }))
                  }
                }}
                className="w-full px-2 py-1 border rounded text-sm text-center font-mono"
              />
            </div>
          </div>
          
          {/* Verpakking */}
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <label className="block text-xs text-gray-600 mb-1">Verpakking</label>
            <div className="flex items-center">
              <span className="text-gray-400 text-sm mr-1">€</span>
              <input
                type="text"
                inputMode="decimal"
                value={standardPrices.verpakking}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.')
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setStandardPrices(prev => ({ ...prev, verpakking: parseFloat(val) || 0 }))
                  }
                }}
                className="w-full px-2 py-1 border rounded text-sm text-center font-mono"
              />
            </div>
          </div>
          
          {/* Kosten per stuk */}
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <label className="block text-xs text-gray-600 mb-1">Kosten/stuk</label>
            <div className="flex items-center">
              <span className="text-gray-400 text-sm mr-1">€</span>
              <input
                type="text"
                inputMode="decimal"
                value={standardPrices.kosten_per_stuk}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.')
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setStandardPrices(prev => ({ ...prev, kosten_per_stuk: parseFloat(val) || 0 }))
                  }
                }}
                className="w-full px-2 py-1 border rounded text-sm text-center font-mono"
              />
            </div>
          </div>
        </div>
        
        <p className="text-xs text-blue-700 mt-3 italic">
          💡 Deze vaste prijzen zijn gecalculeerd door 150 frituristen. Indien u andere porties geeft kan dit handmatig aangepast worden.
        </p>
      </div>

      {/* Products List */}
      <div className="space-y-3">
        {productCosts.map((pc) => (
          <motion.div
            key={pc.product.id}
            layout
            className={`bg-white rounded-xl shadow-lg border-2 ${
              pc.status === 'low' ? 'border-red-300' :
              pc.status === 'high' ? 'border-orange-300' :
              pc.ingredients.length > 0 ? 'border-green-300' : 'border-gray-200'
            }`}
            style={{ overflow: 'visible' }}
          >
            {/* Product Header */}
            <div
              onClick={() => setSelectedProduct(selectedProduct === pc.product.id ? null : pc.product.id)}
              className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                  pc.status === 'low' ? 'bg-red-100' :
                  pc.status === 'high' ? 'bg-orange-100' :
                  pc.ingredients.length > 0 ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {pc.status === 'low' ? '🔴' :
                   pc.status === 'high' ? '🟠' :
                   pc.ingredients.length > 0 ? '🟢' : '⚪'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{pc.product.name}</h3>
                  <p className="text-sm text-gray-500">
                    {pc.ingredients.length} {t('dashboard.productCosts.ingredients')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Marge Input */}
                <div className="text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="text-sm text-gray-500 mb-1">Marge</div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">×</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editingMultiplier[pc.product.id] !== undefined 
                        ? editingMultiplier[pc.product.id] 
                        : (pc.product.price_multiplier || '')}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.')
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setEditingMultiplier(prev => ({ ...prev, [pc.product.id]: val }))
                        }
                      }}
                      onBlur={() => {
                        const val = editingMultiplier[pc.product.id]
                        if (val !== undefined) {
                          updateProductMultiplier(pc.product.id, val === '' ? null : parseFloat(val) || null)
                          setEditingMultiplier(prev => {
                            const newVals = { ...prev }
                            delete newVals[pc.product.id]
                            return newVals
                          })
                        }
                      }}
                      placeholder="auto"
                      className="w-16 px-2 py-1 text-center border-2 border-orange-200 rounded-lg font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
                {pc.ingredients.length > 0 && (
                  <>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">{t('dashboard.productCosts.costPrice')}</div>
                      <div className="font-mono font-semibold">€{pc.totalCost.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">{t('dashboard.productCosts.advisedPrice')} (×{pc.usedMultiplier.toFixed(1)})</div>
                      <div className="font-mono font-semibold">€{pc.requiredPrice.toFixed(2)}</div>
                    </div>
                  </>
                )}
                <div className="text-right">
                  <div className="text-sm text-gray-500">{t('dashboard.productCosts.sellingPrice')}</div>
                  <div className="font-mono font-bold text-lg">€{pc.product.price.toFixed(2)}</div>
                </div>
                {pc.ingredients.length > 0 && (
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                    pc.status === 'low' ? 'bg-red-100 text-red-700' :
                    pc.status === 'high' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {pc.status === 'low' ? `↑ €${Math.abs(pc.difference).toFixed(2)}` :
                     pc.status === 'high' ? `${t('dashboard.productCosts.high')} +€${pc.difference.toFixed(2)}` :
                     `✓ ${t('dashboard.productCosts.good')}`}
                  </div>
                )}
                <div className="text-gray-400">
                  {selectedProduct === pc.product.id ? '▲' : '▼'}
                </div>
              </div>
            </div>

            {/* Expanded Ingredients */}
            <AnimatePresence>
              {selectedProduct === pc.product.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200 overflow-visible"
                >
                  <div className="p-4 bg-gray-50 overflow-visible">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold">{t('dashboard.productCosts.ingredientsInProduct')}</h4>
                      {pc.ingredients.length > 0 && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (!confirm(t('dashboard.productCosts.confirmReset'))) return
                            for (const pi of pc.ingredients) {
                              await supabase.from('product_ingredients').delete().eq('id', pi.id)
                            }
                            setProductIngredients(prev => prev.filter(pi => pi.product_id !== pc.product.id))
                          }}
                          className="text-sm text-red-500 hover:text-red-700 hover:underline"
                        >
                          🗑️ {t('dashboard.productCosts.resetIngredients')}
                        </button>
                      )}
                    </div>
                    
                    {/* Ingredients List */}
                    {pc.ingredients.length > 0 ? (
                      <table className="w-full mb-4">
                        <thead>
                          <tr className="text-left text-sm text-gray-500">
                            <th className="pb-2">{t('dashboard.productCosts.ingredient')}</th>
                            <th className="pb-2 text-center">{t('dashboard.productCosts.quantity')}</th>
                            <th className="pb-2 text-right">{t('dashboard.productCosts.pricePerUnit')}</th>
                            <th className="pb-2 text-right">{t('dashboard.productCosts.total')}</th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {pc.ingredients.map((pi) => (
                            <tr key={pi.id} className="border-t border-gray-200">
                              <td className="py-2">{pi.ingredient?.name || t('dashboard.productCosts.unknown')}</td>
                              <td className="py-2 text-center">
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={pi.quantity}
                                  onChange={(e) => updateIngredientQuantity(pi.id, parseFloat(e.target.value) || 1)}
                                  className="w-16 px-2 py-1 text-center border rounded"
                                />
                              </td>
                              <td className="py-2 text-right font-mono">
                                €{(pi.ingredient?.purchase_price || 0).toFixed(4)}
                              </td>
                              <td className="py-2 text-right font-mono font-semibold">
                                €{((pi.ingredient?.purchase_price || 0) * pi.quantity).toFixed(2)}
                              </td>
                              <td className="py-2 text-right">
                                <button
                                  onClick={() => removeIngredientFromProduct(pi.id)}
                                  className="text-red-400 hover:text-red-600"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-gray-300 font-bold">
                            <td className="py-2" colSpan={3}>{t('dashboard.productCosts.totalCostPrice')}</td>
                            <td className="py-2 text-right font-mono">€{pc.totalCost.toFixed(2)}</td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-gray-500 mb-4">{t('dashboard.productCosts.noIngredientsYet')}</p>
                    )}

                    {/* Add Ingredient - Search */}
                    <div className="relative bg-white p-3 rounded-lg border" ref={searchRef}>
                      <div className="flex gap-3 items-center">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder={`🔍 ${t('dashboard.productCosts.searchPlaceholder')}`}
                            value={ingredientSearch}
                            onChange={(e) => handleIngredientSearch(e.target.value, pc.ingredients.map(pi => pi.ingredient_id))}
                            onFocus={() => setShowSearchResults(true)}
                            className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                          {searching && (
                            <div className="absolute right-3 top-3">
                              <div className="animate-spin h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full"></div>
                            </div>
                          )}
                        </div>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={addingQuantity}
                          onChange={(e) => setAddingQuantity(parseFloat(e.target.value) || 1)}
                          className="w-20 px-3 py-3 border rounded-lg text-center"
                          placeholder="Aantal"
                        />
                      </div>

                      {/* Search Results Dropdown - Always show when focused */}
                      {showSearchResults && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-green-300 rounded-lg shadow-xl z-50 max-h-80 overflow-auto">
                          
                          {/* Hint when not enough characters */}
                          {ingredientSearch.length < 2 && (
                            <div className="p-4 text-center text-gray-500">
                              <div className="text-2xl mb-2">🔍</div>
                              <p>{t('dashboard.productCosts.typeToSearch')}</p>
                              <p className="text-sm mt-1">{t('dashboard.productCosts.searchExample')}</p>
                            </div>
                          )}

                          {/* Loading */}
                          {ingredientSearch.length >= 2 && searching && (
                            <div className="p-4 text-center text-gray-500">
                              <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                              <p>{t('dashboard.productCosts.searching')}</p>
                            </div>
                          )}

                          {/* Own Ingredients */}
                          {ingredientSearch.length >= 2 && !searching && searchResults.own.length > 0 && (
                            <div>
                              <div className="px-3 py-2 bg-blue-50 text-sm font-semibold text-blue-700 sticky top-0">
                                📦 {t('dashboard.productCosts.myIngredients')} ({searchResults.own.length})
                              </div>
                              {searchResults.own.map(ing => (
                                <button
                                  key={ing.id}
                                  onClick={() => addOwnIngredient(ing, pc.product.id)}
                                  className="w-full px-4 py-3 text-left hover:bg-blue-50 flex justify-between items-center border-b"
                                >
                                  <span className="font-medium">{ing.name}</span>
                                  <span className="text-green-600 font-mono">€{ing.purchase_price.toFixed(4)}/{ing.unit}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Database Products */}
                          {ingredientSearch.length >= 2 && !searching && searchResults.database.length > 0 && (
                            <div>
                              <div className="px-3 py-2 bg-green-50 text-sm font-semibold text-green-700 sticky top-0">
                                🔍 {t('dashboard.productCosts.supplierDatabase')} ({searchResults.database.length})
                              </div>
                              {searchResults.database.map(product => {
                                const alreadyOwned = ingredients.some(i => 
                                  i.notes?.includes(`Art. #${product.article_number}`)
                                )
                                return (
                                  <button
                                    key={product.id}
                                    onClick={() => addDatabaseIngredient(product, pc.product.id)}
                                    className="w-full px-4 py-3 text-left hover:bg-green-50 flex justify-between items-center border-b"
                                  >
                                    <div>
                                      <span className="font-medium">{product.name}</span>
                                      {alreadyOwned && <span className="ml-2 text-xs text-green-600">({t('dashboard.productCosts.alreadyAdded')})</span>}
                                      <div className="text-xs text-gray-500">
                                        {t('dashboard.productCosts.box')} €{product.package_price.toFixed(2)} • {product.units_per_package}x
                                      </div>
                                    </div>
                                    <span className="text-green-600 font-mono font-bold">€{product.unit_price.toFixed(4)}/st</span>
                                  </button>
                                )
                              })}
                            </div>
                          )}

                          {/* No results message */}
                          {ingredientSearch.length >= 2 && !searching && 
                           searchResults.own.length === 0 && searchResults.database.length === 0 && (
                            <div className="p-4 text-center">
                              <div className="text-2xl mb-2">😕</div>
                              <p className="text-gray-700 font-medium">{t('dashboard.productCosts.noResults')} "{ingredientSearch}"</p>
                              <p className="text-sm text-gray-500 mt-1">
                                {t('dashboard.productCosts.runSqlFirst')}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Summary */}
                    {pc.ingredients.length > 0 && (
                      <div className={`mt-4 p-4 rounded-lg ${
                        pc.status === 'low' ? 'bg-red-50 border border-red-200' :
                        pc.status === 'high' ? 'bg-orange-50 border border-orange-200' :
                        'bg-green-50 border border-green-200'
                      }`}>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-sm text-gray-600">{t('dashboard.productCosts.costPrice')}</div>
                            <div className="text-xl font-bold">€{pc.totalCost.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">{t('dashboard.productCosts.advisedPrice')} (×{pc.usedMultiplier.toFixed(1)})</div>
                            <div className="text-xl font-bold">€{pc.requiredPrice.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">{t('dashboard.productCosts.yourPrice')}</div>
                            <div className="text-xl font-bold">€{pc.product.price.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className={`mt-3 text-center text-lg font-bold ${
                          pc.status === 'low' ? 'text-red-700' :
                          pc.status === 'high' ? 'text-orange-700' :
                          'text-green-700'
                        }`}>
                          {pc.status === 'low' && `⚠️ ${t('dashboard.productCosts.priceTooLow').replace('{amount}', Math.abs(pc.difference).toFixed(2)).replace('{target}', pc.requiredPrice.toFixed(2))}`}
                          {pc.status === 'high' && `💰 ${t('dashboard.productCosts.highMargin').replace('{amount}', pc.difference.toFixed(2))}`}
                          {pc.status === 'good' && `✓ ${t('dashboard.productCosts.goodPricing').replace('{amount}', pc.difference.toFixed(2))}`}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-gray-700">{t('dashboard.productCosts.noProductsFound')}</h3>
          <p className="text-gray-500">{t('dashboard.productCosts.addProductsFirst')}</p>
        </div>
      )}

      {ingredients.length === 0 && products.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-yellow-800">
            ⚠️ {t('dashboard.productCosts.noIngredientsWarning')} 
            <a href={`/shop/${params.tenant}/admin/kosten/ingredienten`} className="underline ml-1">
              {t('dashboard.productCosts.addIngredientsFirst')}
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
