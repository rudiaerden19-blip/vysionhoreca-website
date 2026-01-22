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

  // Ingredient search state
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [searchResults, setSearchResults] = useState<{
    own: Ingredient[]
    database: SupplierProduct[]
  }>({ own: [], database: [] })
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

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
      supabase.from('menu_products').select('id, name, price, category_id').eq('tenant_slug', params.tenant).order('name'),
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

    setLoading(false)
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

    // Average multiplier or default
    const avgMultiplier = ingredientCount > 0 ? totalMultiplier / ingredientCount : defaultMultiplier
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
      difference
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
        <h1 className="text-2xl font-bold text-gray-900">📊 Product Kostprijs Analyse</h1>
        <p className="text-gray-500 mt-1">
          Alle producten uit je menu - klik om ingrediënten toe te voegen en je marge te berekenen
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Producten</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.configured}</div>
          <div className="text-sm text-gray-500">Geconfigureerd</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow text-center">
          <div className="text-2xl font-bold text-green-600">{stats.good}</div>
          <div className="text-sm text-gray-500">Goed ✓</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow text-center">
          <div className="text-2xl font-bold text-red-600">{stats.low}</div>
          <div className="text-sm text-gray-500">Te laag ⚠️</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
          <div className="text-sm text-gray-500">Te hoog</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Zoek product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      {/* Products List */}
      <div className="space-y-3">
        {productCosts.map((pc) => (
          <motion.div
            key={pc.product.id}
            layout
            className={`bg-white rounded-xl shadow-lg overflow-hidden border-2 ${
              pc.status === 'low' ? 'border-red-300' :
              pc.status === 'high' ? 'border-orange-300' :
              pc.ingredients.length > 0 ? 'border-green-300' : 'border-gray-200'
            }`}
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
                    {pc.ingredients.length} ingrediënten
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {pc.ingredients.length > 0 && (
                  <>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Kostprijs</div>
                      <div className="font-mono font-semibold">€{pc.totalCost.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Adviesprijs</div>
                      <div className="font-mono font-semibold">€{pc.requiredPrice.toFixed(2)}</div>
                    </div>
                  </>
                )}
                <div className="text-right">
                  <div className="text-sm text-gray-500">Verkoopprijs</div>
                  <div className="font-mono font-bold text-lg">€{pc.product.price.toFixed(2)}</div>
                </div>
                {pc.ingredients.length > 0 && (
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                    pc.status === 'low' ? 'bg-red-100 text-red-700' :
                    pc.status === 'high' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {pc.status === 'low' ? `↑ €${Math.abs(pc.difference).toFixed(2)}` :
                     pc.status === 'high' ? `Hoog +€${pc.difference.toFixed(2)}` :
                     '✓ Goed'}
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
                  className="border-t border-gray-200"
                >
                  <div className="p-4 bg-gray-50">
                    <h4 className="font-semibold mb-3">Ingrediënten in dit product:</h4>
                    
                    {/* Ingredients List */}
                    {pc.ingredients.length > 0 ? (
                      <table className="w-full mb-4">
                        <thead>
                          <tr className="text-left text-sm text-gray-500">
                            <th className="pb-2">Ingrediënt</th>
                            <th className="pb-2 text-center">Aantal</th>
                            <th className="pb-2 text-right">Prijs/stuk</th>
                            <th className="pb-2 text-right">Totaal</th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {pc.ingredients.map((pi) => (
                            <tr key={pi.id} className="border-t border-gray-200">
                              <td className="py-2">{pi.ingredient?.name || 'Onbekend'}</td>
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
                            <td className="py-2" colSpan={3}>TOTAAL KOSTPRIJS</td>
                            <td className="py-2 text-right font-mono">€{pc.totalCost.toFixed(2)}</td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-gray-500 mb-4">Nog geen ingrediënten toegevoegd</p>
                    )}

                    {/* Add Ingredient - Search */}
                    <div className="relative bg-white p-3 rounded-lg border" ref={searchRef}>
                      <div className="flex gap-3 items-center">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="🔍 Typ om te zoeken (bijv. hamburger, saus, broodje)..."
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
                              <p>Typ minstens 2 letters om te zoeken</p>
                              <p className="text-sm mt-1">bijv. "ham", "fri", "sau"</p>
                            </div>
                          )}

                          {/* Loading */}
                          {ingredientSearch.length >= 2 && searching && (
                            <div className="p-4 text-center text-gray-500">
                              <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                              <p>Zoeken...</p>
                            </div>
                          )}

                          {/* Own Ingredients */}
                          {ingredientSearch.length >= 2 && !searching && searchResults.own.length > 0 && (
                            <div>
                              <div className="px-3 py-2 bg-blue-50 text-sm font-semibold text-blue-700 sticky top-0">
                                📦 Mijn Ingrediënten ({searchResults.own.length})
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
                                🔍 Leveranciers Database ({searchResults.database.length})
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
                                      {alreadyOwned && <span className="ml-2 text-xs text-green-600">(al toegevoegd)</span>}
                                      <div className="text-xs text-gray-500">
                                        Doos €{product.package_price.toFixed(2)} • {product.units_per_package}x
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
                              <p className="text-gray-700 font-medium">Geen resultaten voor "{ingredientSearch}"</p>
                              <p className="text-sm text-gray-500 mt-1">
                                Voer eerst de SQL uit in Supabase om de database te laden
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
                            <div className="text-sm text-gray-600">Kostprijs</div>
                            <div className="text-xl font-bold">€{pc.totalCost.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Adviesprijs (×{defaultMultiplier.toFixed(1)})</div>
                            <div className="text-xl font-bold">€{pc.requiredPrice.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Jouw prijs</div>
                            <div className="text-xl font-bold">€{pc.product.price.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className={`mt-3 text-center text-lg font-bold ${
                          pc.status === 'low' ? 'text-red-700' :
                          pc.status === 'high' ? 'text-orange-700' :
                          'text-green-700'
                        }`}>
                          {pc.status === 'low' && `⚠️ Prijs te laag! Verhoog met €${Math.abs(pc.difference).toFixed(2)} naar €${pc.requiredPrice.toFixed(2)}`}
                          {pc.status === 'high' && `💰 Hoge marge: +€${pc.difference.toFixed(2)} winst`}
                          {pc.status === 'good' && `✓ Goede prijszetting! Marge: €${pc.difference.toFixed(2)}`}
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
          <h3 className="text-lg font-semibold text-gray-700">Geen producten gevonden</h3>
          <p className="text-gray-500">Voeg eerst producten toe aan je menu</p>
        </div>
      )}

      {ingredients.length === 0 && products.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-yellow-800">
            ⚠️ Je hebt nog geen ingrediënten toegevoegd. 
            <a href={`/shop/${params.tenant}/admin/kosten/ingredienten`} className="underline ml-1">
              Voeg eerst ingrediënten toe
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
