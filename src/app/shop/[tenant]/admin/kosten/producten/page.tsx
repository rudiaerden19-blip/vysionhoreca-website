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

  // Vaste standaardprijzen state - stored as strings for editing
  const [standardPrices, setStandardPrices] = useState({
    saus: '0.12',
    sla: '0.13',
    tomaat: '0.14',
    ei: '0.12',
    potje_saus: '0.16',
    verpakking: '0.30',
    kosten_per_stuk: '0.40'
  })
  const [savingStandardPrices, setSavingStandardPrices] = useState(false)
  const [standardPricesSaved, setStandardPricesSaved] = useState(false)
  const [addingStandardItem, setAddingStandardItem] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<{ name: string, price: number } | null>(null)
  const [dropTargetProduct, setDropTargetProduct] = useState<string | null>(null)

  // Simulatie calculator state
  const [showSimulator, setShowSimulator] = useState(false)
  const [simulatorItems, setSimulatorItems] = useState<Array<{ name: string, price: number, quantity: number }>>([])
  const [simulatorName, setSimulatorName] = useState('')
  const [simulatorMultiplier, setSimulatorMultiplier] = useState('3')
  const [simulatorSearch, setSimulatorSearch] = useState('')
  const [simulatorSearchResults, setSimulatorSearchResults] = useState<Ingredient[]>([])
  const [simulatorDatabaseResults, setSimulatorDatabaseResults] = useState<SupplierProduct[]>([])
  const [simulatorSearching, setSimulatorSearching] = useState(false)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant])

  // Auto-save simulator data to Supabase (debounced)
  useEffect(() => {
    if (!loading && simulatorItems.length > 0) {
      const timeoutId = setTimeout(async () => {
        try {
          await supabase
            .from('cost_settings')
            .upsert({
              tenant_slug: params.tenant,
              simulator_items: simulatorItems,
              simulator_name: simulatorName,
              simulator_multiplier: parseFloat(simulatorMultiplier.replace(',', '.')) || 3,
              updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_slug' })
        } catch (e) {
          console.error('Failed to save simulator data:', e)
        }
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [simulatorItems, simulatorName, simulatorMultiplier, params.tenant, loading])

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

    // Load cost settings - try Supabase first, fallback to localStorage
    try {
      const { data: costSettings, error } = await supabase
        .from('cost_settings')
        .select('*')
        .eq('tenant_slug', params.tenant)
        .maybeSingle()
      
      if (costSettings && !error) {
        // Load from Supabase
        setStandardPrices({
          saus: costSettings.saus?.toString() || '0.12',
          sla: costSettings.sla?.toString() || '0.13',
          tomaat: costSettings.tomaat?.toString() || '0.14',
          ei: costSettings.ei?.toString() || '0.12',
          potje_saus: costSettings.potje_saus?.toString() || '0.16',
          verpakking: costSettings.verpakking?.toString() || '0.30',
          kosten_per_stuk: costSettings.kosten_per_stuk?.toString() || '0.40'
        })
        if (costSettings.simulator_items) setSimulatorItems(costSettings.simulator_items)
        if (costSettings.simulator_name) setSimulatorName(costSettings.simulator_name)
        if (costSettings.simulator_multiplier) setSimulatorMultiplier(costSettings.simulator_multiplier.toString())
      } else {
        // Fallback to localStorage
        const savedPrices = localStorage.getItem(`standard_prices_${params.tenant}`)
        if (savedPrices) {
          const parsed = JSON.parse(savedPrices)
          const stringPrices: any = {}
          for (const key of Object.keys(parsed)) {
            stringPrices[key] = typeof parsed[key] === 'number' ? parsed[key].toString() : parsed[key]
          }
          setStandardPrices(prev => ({ ...prev, ...stringPrices }))
        }
        const savedSimulator = localStorage.getItem(`simulator_data_${params.tenant}`)
        if (savedSimulator) {
          const parsed = JSON.parse(savedSimulator)
          if (parsed.items) setSimulatorItems(parsed.items)
          if (parsed.name) setSimulatorName(parsed.name)
          if (parsed.multiplier) setSimulatorMultiplier(parsed.multiplier)
        }
      }
    } catch (e) {
      console.error('Failed to load cost settings:', e)
      // Fallback to localStorage on any error
      try {
        const savedPrices = localStorage.getItem(`standard_prices_${params.tenant}`)
        if (savedPrices) {
          const parsed = JSON.parse(savedPrices)
          setStandardPrices(prev => ({ ...prev, ...parsed }))
        }
      } catch {}
    }

    setLoading(false)
  }

  // Save standard prices to Supabase
  async function saveStandardPrices() {
    setSavingStandardPrices(true)
    try {
      const { error } = await supabase
        .from('cost_settings')
        .upsert({
          tenant_slug: params.tenant,
          saus: parseFloat(standardPrices.saus.replace(',', '.')) || 0.12,
          sla: parseFloat(standardPrices.sla.replace(',', '.')) || 0.13,
          tomaat: parseFloat(standardPrices.tomaat.replace(',', '.')) || 0.14,
          ei: parseFloat(standardPrices.ei.replace(',', '.')) || 0.12,
          potje_saus: parseFloat(standardPrices.potje_saus.replace(',', '.')) || 0.16,
          verpakking: parseFloat(standardPrices.verpakking.replace(',', '.')) || 0.30,
          kosten_per_stuk: parseFloat(standardPrices.kosten_per_stuk.replace(',', '.')) || 0.40,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_slug' })
      
      if (error) throw error
      setStandardPricesSaved(true)
      setTimeout(() => setStandardPricesSaved(false), 2000)
    } catch (e) {
      console.error('Failed to save standard prices:', e)
    }
    setSavingStandardPrices(false)
  }

  // Add standard price item to product
  async function addStandardPriceToProduct(name: string, price: number, productId: string) {
    if (!businessId) return
    setAddingStandardItem(name)

    // Check if ingredient already exists with this name
    let ingredient = ingredients.find(i => i.name.toLowerCase() === name.toLowerCase())
    
    if (!ingredient) {
      // Create new ingredient
      const { data: newIng } = await supabase
        .from('ingredients')
        .insert({
          tenant_slug: businessId,
          name: name,
          unit: 'stuk',
          purchase_price: price,
          notes: 'Standaardprijs'
        })
        .select()
        .single()
      
      if (newIng) {
        ingredient = newIng
        setIngredients(prev => [...prev, newIng].sort((a, b) => a.name.localeCompare(b.name)))
      }
    }

    if (ingredient) {
      // Check if already added to this product
      const alreadyAdded = productIngredients.some(
        pi => pi.product_id === productId && pi.ingredient_id === ingredient!.id
      )

      if (!alreadyAdded) {
        // Add to product
        const { data: pi } = await supabase
          .from('product_ingredients')
          .insert({
            tenant_slug: businessId,
            product_id: productId,
            ingredient_id: ingredient.id,
            quantity: 1
          })
          .select()
          .single()

        if (pi) {
          setProductIngredients(prev => [...prev, pi])
        }
      }
    }

    setAddingStandardItem(null)
    setDraggedItem(null)
    setDropTargetProduct(null)
  }

  // Handle drag start
  function handleDragStart(e: React.DragEvent, name: string, price: number) {
    setDraggedItem({ name, price })
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/plain', JSON.stringify({ name, price }))
  }

  // Handle drag end
  function handleDragEnd() {
    setDraggedItem(null)
    setDropTargetProduct(null)
  }

  // Handle drop on product
  function handleDrop(e: React.DragEvent, productId: string) {
    e.preventDefault()
    if (draggedItem) {
      addStandardPriceToProduct(draggedItem.name, draggedItem.price, productId)
    }
    setDropTargetProduct(null)
  }

  // Handle drop on simulator
  function handleDropOnSimulator(e: React.DragEvent) {
    e.preventDefault()
    if (draggedItem) {
      // Check if already exists
      const existing = simulatorItems.find(i => i.name === draggedItem.name)
      if (existing) {
        setSimulatorItems(prev => prev.map(i => 
          i.name === draggedItem.name ? { ...i, quantity: i.quantity + 1 } : i
        ))
      } else {
        setSimulatorItems(prev => [...prev, { name: draggedItem.name, price: draggedItem.price, quantity: 1 }])
      }
    }
    setDraggedItem(null)
  }

  // Add ingredient to simulator manually
  function addIngredientToSimulator(ingredient: Ingredient) {
    const existing = simulatorItems.find(i => i.name === ingredient.name)
    if (existing) {
      setSimulatorItems(prev => prev.map(i => 
        i.name === ingredient.name ? { ...i, quantity: i.quantity + 1 } : i
      ))
    } else {
      setSimulatorItems(prev => [...prev, { name: ingredient.name, price: ingredient.purchase_price, quantity: 1 }])
    }
  }

  // Calculate simulator totals
  const simulatorTotalCost = simulatorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const simulatorMultiplierNum = parseFloat(simulatorMultiplier.replace(',', '.')) || 3
  const simulatorAdvicedPrice = simulatorTotalCost * simulatorMultiplierNum

  // Search ingredients for simulator - search in supplier_products database
  async function handleSimulatorSearch(query: string) {
    setSimulatorSearch(query)
    if (query.length < 2) {
      setSimulatorSearchResults([])
      setSimulatorDatabaseResults([])
      return
    }
    setSimulatorSearching(true)
    
    // Search own ingredients
    const ownResults = ingredients.filter(i => 
      i.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10)
    setSimulatorSearchResults(ownResults)
    
    // Search supplier_products database
    const dbResults = await searchSupplierProducts(query, undefined, 20)
    setSimulatorDatabaseResults(dbResults)
    
    setSimulatorSearching(false)
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

  // Add ingredient from database - ALTIJD nieuw ingrediënt aanmaken
  async function addDatabaseIngredient(product: SupplierProduct, productId: string) {
    if (!businessId) return
    
    console.log('Adding database ingredient:', product.name)

    // ALTIJD nieuw ingrediënt aanmaken met de juiste naam
    const { data: newIng } = await supabase
      .from('ingredients')
      .insert({
        tenant_slug: businessId,
        name: product.name,
        unit: product.unit || 'stuk',
        purchase_price: product.unit_price || 0,
        units_per_package: product.units_per_package || 1,
        package_price: product.package_price || 0,
        notes: product.article_number ? `Art. #${product.article_number}` : ''
      })
      .select()
      .single()

    if (!newIng) {
      console.error('Failed to create ingredient')
      return
    }
    
    const ingredientId = newIng.id
    setIngredients(prev => [...prev, newIng].sort((a, b) => a.name.localeCompare(b.name)))

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
          <div className="text-2xl font-bold text-blue-600">{stats.high}</div>
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
          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Vaste Standaardprijzen Kader - Fixed onderaan wanneer product OF simulator open is */}
      <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200 shadow-sm transition-all ${
        (selectedProduct || showSimulator) ? 'fixed bottom-0 left-0 right-0 z-50 shadow-2xl rounded-none border-t-4 border-blue-400' : ''
      }`}>
        <div className="flex items-center justify-between mb-3 max-w-7xl mx-auto">
          <div>
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              💰 {t('dashboard.productCosts.standardPricesTitle')}
              {selectedProduct && (
                <span className="ml-2 px-3 py-1 bg-green-500 text-white text-sm rounded-full">
                  ➜ {products.find(p => p.id === selectedProduct)?.name}
                </span>
              )}
              {showSimulator && !selectedProduct && (
                <span className="ml-2 px-3 py-1 bg-purple-500 text-white text-sm rounded-full">
                  ➜ Simulator
                </span>
              )}
            </h3>
            <p className="text-sm text-blue-600 mt-1">
              {selectedProduct 
                ? `✅ Klik op + om toe te voegen aan "${products.find(p => p.id === selectedProduct)?.name}"`
                : showSimulator
                  ? `✅ Klik op + om toe te voegen aan de Simulator`
                  : `⚠️ ${t('dashboard.productCosts.openProductFirst')}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            {/* Sluit knop - alleen tonen als panel fixed is */}
            {(selectedProduct || showSimulator) && (
              <button
                onClick={() => {
                  setSelectedProduct(null)
                  setShowSimulator(false)
                }}
                className="w-10 h-10 rounded-lg bg-red-500 text-white hover:bg-red-600 flex items-center justify-center text-xl font-bold transition-all hover:scale-105"
                title="Sluiten"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-3 max-w-7xl mx-auto">
          {/* Klikbare items met aparte + knop */}
          {[
            { key: 'saus', label: 'Saus', price: standardPrices.saus },
            { key: 'sla', label: 'Sla', price: standardPrices.sla },
            { key: 'tomaat', label: 'Tomaat', price: standardPrices.tomaat },
            { key: 'ei', label: 'Ei', price: standardPrices.ei },
            { key: 'potje_saus', label: 'Potje saus', price: standardPrices.potje_saus },
            { key: 'verpakking', label: 'Verpakking', price: standardPrices.verpakking },
            { key: 'kosten_per_stuk', label: 'Kosten/stuk', price: standardPrices.kosten_per_stuk },
          ].map((item) => (
            <div
              key={item.key}
              className={`bg-white rounded-lg p-2 sm:p-3 shadow-sm transition-all border-2 ${
                addingStandardItem === item.label ? 'border-green-500 bg-green-100' : 'border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs sm:text-sm text-gray-600 font-medium truncate">{item.label}</label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm flex-shrink-0">€</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.price}
                  onChange={(e) => {
                    const val = e.target.value.replace(',', '.')
                    setStandardPrices(prev => ({ ...prev, [item.key]: val }))
                  }}
                  className="w-16 sm:w-20 px-1 sm:px-2 py-1.5 border rounded text-sm text-center font-mono"
                />
                {/* Duidelijke + knop om toe te voegen */}
                <button
                  onClick={() => {
                    const price = parseFloat(item.price.replace(',', '.')) || 0
                    if (selectedProduct) {
                      addStandardPriceToProduct(item.label, price, selectedProduct)
                    } else if (showSimulator) {
                      // Voeg toe aan simulator
                      const existing = simulatorItems.find(i => i.name === item.label)
                      if (existing) {
                        setSimulatorItems(prev => prev.map(i => 
                          i.name === item.label ? { ...i, quantity: i.quantity + 1 } : i
                        ))
                      } else {
                        setSimulatorItems(prev => [...prev, { name: item.label, price: price, quantity: 1 }])
                      }
                    }
                  }}
                  disabled={(!selectedProduct && !showSimulator) || addingStandardItem === item.label}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold transition-all flex-shrink-0 ${
                    (selectedProduct || showSimulator)
                      ? addingStandardItem === item.label
                        ? 'bg-green-500 text-white'
                        : selectedProduct 
                          ? 'bg-green-500 text-white hover:bg-green-600 hover:scale-110 active:scale-95'
                          : 'bg-purple-500 text-white hover:bg-purple-600 hover:scale-110 active:scale-95'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title={selectedProduct ? `${item.label} toevoegen aan product` : showSimulator ? `${item.label} toevoegen aan simulator` : 'Open eerst een product of simulator'}
                >
                  {addingStandardItem === item.label ? '✓' : '+'}
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <p className="text-xs text-blue-700 mt-3 italic max-w-7xl mx-auto">
          💡 {t('dashboard.productCosts.standardPricesHint')}
        </p>
      </div>
      
      {/* Spacer voor fixed standaardprijzen panel */}
      {(selectedProduct || showSimulator) && <div className="h-48"></div>}

      {/* Simulatie Calculator - Normaal in de pagina */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowSimulator(!showSimulator)}
          className="w-full p-4 flex items-center justify-between hover:bg-purple-100/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧮</span>
            <div className="text-left">
              <h3 className="font-semibold text-purple-900">{t('simulator.title')}</h3>
              <p className="text-sm text-purple-600">{t('simulator.subtitle')}</p>
            </div>
          </div>
          <span className="text-purple-500 text-xl">{showSimulator ? '▲' : '▼'}</span>
        </button>

        <AnimatePresence>
          {showSimulator && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-purple-200"
            >
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'copy'
                }}
                onDrop={handleDropOnSimulator}
                className={`p-4 ${draggedItem ? 'bg-purple-100 border-2 border-dashed border-purple-400' : ''}`}
              >
                {/* Simulator Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm text-purple-700 mb-1">{t('simulator.productName')}</label>
                    <input
                      type="text"
                      value={simulatorName}
                      onChange={(e) => setSimulatorName(e.target.value)}
                      placeholder={t('simulator.productNamePlaceholder')}
                      className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-sm text-purple-700 mb-1">{t('simulator.margin')}</label>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">×</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={simulatorMultiplier}
                        onChange={(e) => {
                          const val = e.target.value.replace(',', '.')
                          setSimulatorMultiplier(val)
                        }}
                        className="w-full px-2 py-2 border border-purple-200 rounded-lg text-center font-bold focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Search in database */}
                <div className="mb-4">
                  <label className="block text-sm text-purple-700 mb-1">🔍 {t('simulator.searchDatabase')}</label>
                  <input
                    type="text"
                    value={simulatorSearch}
                    onChange={(e) => handleSimulatorSearch(e.target.value)}
                    placeholder={t('simulator.searchPlaceholder')}
                    className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  {simulatorSearching && (
                    <p className="text-sm text-purple-400 mt-2">Zoeken...</p>
                  )}
                  {(simulatorSearchResults.length > 0 || simulatorDatabaseResults.length > 0) && (
                    <div className="mt-2 bg-white border border-purple-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {/* Eigen ingrediënten */}
                      {simulatorSearchResults.length > 0 && (
                        <>
                          <div className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium">Jouw ingrediënten</div>
                          {simulatorSearchResults.map(ing => (
                            <button
                              key={ing.id}
                              onClick={() => {
                                addIngredientToSimulator(ing)
                                setSimulatorSearch('')
                                setSimulatorSearchResults([])
                                setSimulatorDatabaseResults([])
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-green-50 flex justify-between items-center border-b border-purple-100"
                            >
                              <span className="font-medium">{ing.name}</span>
                              <span className="text-green-600 font-mono">€{ing.purchase_price.toFixed(4)}</span>
                            </button>
                          ))}
                        </>
                      )}
                      {/* Database producten */}
                      {simulatorDatabaseResults.length > 0 && (
                        <>
                          <div className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium">Database ({simulatorDatabaseResults.length} resultaten)</div>
                          {simulatorDatabaseResults.map(prod => (
                            <button
                              key={prod.id}
                              onClick={() => {
                                setSimulatorItems(prev => [...prev, { 
                                  name: prod.name, 
                                  price: prod.unit_price || 0, 
                                  quantity: 1 
                                }])
                                setSimulatorSearch('')
                                setSimulatorSearchResults([])
                                setSimulatorDatabaseResults([])
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-purple-50 flex justify-between items-center border-b border-purple-100"
                            >
                              <div>
                                <span className="font-medium">{prod.name}</span>
                                <span className="text-xs text-gray-500 ml-2">{prod.unit}</span>
                              </div>
                              <span className="text-purple-600 font-mono">€{(prod.unit_price || 0).toFixed(4)}</span>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                  {simulatorSearch.length >= 2 && simulatorSearchResults.length === 0 && simulatorDatabaseResults.length === 0 && !simulatorSearching && (
                    <p className="text-sm text-purple-400 mt-2">{t('simulator.noResults')}</p>
                  )}
                </div>

                {/* Drop zone hint */}
                {simulatorItems.length === 0 && (
                  <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center bg-white/50">
                    <p className="text-purple-600 font-medium">👆 {t('simulator.dragHere')}</p>
                    <p className="text-sm text-purple-400 mt-1">{t('simulator.orClick')}</p>
                  </div>
                )}

                {/* Simulator Items */}
                {simulatorItems.length > 0 && (
                  <div className="bg-white rounded-lg border border-purple-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-purple-50">
                        <tr>
                          <th className="px-3 py-2 text-left">{t('simulator.ingredient')}</th>
                          <th className="px-3 py-2 text-center w-24">{t('simulator.quantity')}</th>
                          <th className="px-3 py-2 text-right w-28">{t('simulator.pricePerUnit')}</th>
                          <th className="px-3 py-2 text-right w-28">{t('simulator.total')}</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {simulatorItems.map((item, idx) => (
                          <tr key={idx} className="border-t border-purple-100">
                            <td className="px-3 py-2 font-medium">{item.name}</td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value.replace(',', '.')) || 0
                                  setSimulatorItems(prev => prev.map((i, index) => 
                                    index === idx ? { ...i, quantity: val } : i
                                  ))
                                }}
                                className="w-full px-2 py-1 border rounded text-center"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-mono">€{item.price.toFixed(4)}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold">€{(item.price * item.quantity).toFixed(2)}</td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => setSimulatorItems(prev => prev.filter((_, index) => index !== idx))}
                                className="text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-purple-50 font-bold">
                        <tr className="border-t-2 border-purple-200">
                          <td colSpan={3} className="px-3 py-2 text-right">{t('simulator.totalCost')}:</td>
                          <td className="px-3 py-2 text-right font-mono text-lg">€{simulatorTotalCost.toFixed(2)}</td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-right text-purple-700">
                            {t('simulator.advisedPrice')} (×{simulatorMultiplierNum.toFixed(1)}):
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-lg text-purple-700">€{simulatorAdvicedPrice.toFixed(2)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Quick add from own ingredients */}
                {ingredients.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-purple-700 mb-2">{t('simulator.quickAdd')}:</p>
                    <div className="flex flex-wrap gap-2">
                      {ingredients.slice(0, 8).map(ing => (
                        <button
                          key={ing.id}
                          onClick={() => addIngredientToSimulator(ing)}
                          className="px-3 py-1 bg-white border border-purple-200 rounded-full text-sm hover:bg-purple-100 hover:border-purple-400 transition-colors"
                        >
                          {ing.name} <span className="text-purple-500">€{ing.purchase_price.toFixed(2)}</span>
                        </button>
                      ))}
                      {ingredients.length > 8 && (
                        <span className="text-sm text-purple-400 py-1">+{ingredients.length - 8} {t('simulator.more')}...</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Clear button */}
                {simulatorItems.length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => {
                        setSimulatorItems([])
                        setSimulatorName('')
                      }}
                      className="px-4 py-2 text-purple-600 hover:text-purple-800 text-sm"
                    >
                      🗑️ {t('simulator.clear')}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Products List */}
      <div className="space-y-3">
        {productCosts.map((pc) => (
          <motion.div
            key={pc.product.id}
            layout
            className={`bg-white rounded-xl shadow-lg border-2 transition-all ${
              selectedProduct === pc.product.id
                ? 'border-green-500 ring-2 ring-green-200' 
                : pc.status === 'low' ? 'border-red-300' :
                  pc.status === 'high' ? 'border-blue-300' :
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
                  pc.status === 'high' ? 'bg-blue-100' :
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
                      className="w-16 px-2 py-1 text-center border-2 border-blue-200 rounded-lg font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    pc.status === 'high' ? 'bg-blue-100 text-blue-700' :
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
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-green-300 rounded-lg shadow-xl z-50 max-h-[70vh] overflow-auto">
                          
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
                          {searchResults.own.length > 0 && (
                            <div>
                              <div className="px-3 py-2 bg-blue-50 text-sm font-semibold text-blue-700 sticky top-0">
                                📦 Jouw ingrediënten ({searchResults.own.length})
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

                          {/* Database Products - ALTIJD TONEN ALS ER RESULTATEN ZIJN */}
                          {searchResults.database.length > 0 && (
                            <div>
                              <div className="px-3 py-2 bg-green-50 text-sm font-semibold text-green-700 sticky top-0">
                                🔍 Database ({searchResults.database.length} producten)
                              </div>
                              {searchResults.database.map(product => (
                                <button
                                  key={product.id}
                                  onClick={() => addDatabaseIngredient(product, pc.product.id)}
                                  className="w-full px-4 py-3 text-left hover:bg-green-50 flex justify-between items-center border-b"
                                >
                                  <div>
                                    <span className="font-medium">{product.name}</span>
                                    <div className="text-xs text-gray-500">
                                      Doos €{product.package_price?.toFixed(2) || '0.00'} • {product.units_per_package || 1}x
                                    </div>
                                  </div>
                                  <span className="text-green-600 font-mono font-bold">€{(product.unit_price || 0).toFixed(4)}/st</span>
                                </button>
                              ))}
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
                        pc.status === 'high' ? 'bg-blue-50 border border-blue-200' :
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
                          pc.status === 'high' ? 'text-blue-700' :
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

      {/* Extra scroll ruimte + footer */}
      <div className="h-80"></div>
      <div className="text-center text-xs text-gray-400 pb-8">
        Vysion 2025
      </div>
    </div>
  )
}
