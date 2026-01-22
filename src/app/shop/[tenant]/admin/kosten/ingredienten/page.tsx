'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'
import { searchSupplierProducts, getSupplierProductCategories, SupplierProduct } from '@/lib/admin-api'

interface Ingredient {
  id: string
  name: string
  unit: string
  purchase_price: number
  units_per_package: number
  package_price: number
  cost_category_id: string | null
  notes: string | null
}

interface CostCategory {
  id: string
  name: string
  multiplier: number
}

const unitOptions = [
  { value: 'stuk', label: 'Stuk' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'gram', label: 'Gram (g)' },
  { value: 'liter', label: 'Liter (L)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'portie', label: 'Portie' },
  { value: 'schijf', label: 'Schijf' },
  { value: 'plak', label: 'Plak' },
  { value: 'doos', label: 'Doos' },
]

export default function IngredientsPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [categories, setCategories] = useState<CostCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    unit: 'stuk',
    purchase_price: '',
    units_per_package: '',
    package_price: '',
    cost_category_id: '',
    notes: ''
  })

  // Import Van Zon state
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importPreview, setImportPreview] = useState<Array<{name: string, articleNr: string, price: number}>>([])
  const [importing, setImporting] = useState(false)

  // Database search state
  const [showDatabaseSearch, setShowDatabaseSearch] = useState(false)
  const [dbSearchQuery, setDbSearchQuery] = useState('')
  const [dbSearchResults, setDbSearchResults] = useState<SupplierProduct[]>([])
  const [dbCategories, setDbCategories] = useState<string[]>([])
  const [dbSelectedCategory, setDbSelectedCategory] = useState('')
  const [dbSearching, setDbSearching] = useState(false)
  const [addingProduct, setAddingProduct] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    loadDbCategories()
  }, [params.tenant])

  // Database search functions
  async function loadDbCategories() {
    const cats = await getSupplierProductCategories()
    setDbCategories(cats)
  }

  async function handleDbSearch() {
    if (!dbSearchQuery.trim() && !dbSelectedCategory) return
    setDbSearching(true)
    const results = await searchSupplierProducts(dbSearchQuery, dbSelectedCategory, 50)
    setDbSearchResults(results)
    setDbSearching(false)
  }

  async function addFromDatabase(product: SupplierProduct) {
    if (!businessId) return
    setAddingProduct(product.id)

    // Check if already exists (by article number in notes)
    const existingArticleNrs = ingredients
      .map(i => i.notes?.match(/Art\. #(\d+)/)?.[1])
      .filter(Boolean)
    
    if (existingArticleNrs.includes(product.article_number)) {
      alert('Dit product bestaat al in je ingrediëntenlijst!')
      setAddingProduct(null)
      return
    }

    const { data } = await supabase
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

    if (data) {
      setIngredients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setAddingProduct(null)
  }

  async function loadData() {
    
    // Use tenant_slug directly
    setBusinessId(params.tenant)

    // Load categories
    const { data: cats } = await supabase
      .from('cost_categories')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .order('name')

    if (cats) setCategories(cats)

    // Load ingredients
    const { data: ings } = await supabase
      .from('ingredients')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .order('name')

    if (ings) setIngredients(ings)

    setLoading(false)
  }

  function resetForm() {
    setFormData({
      name: '',
      unit: 'stuk',
      purchase_price: '',
      units_per_package: '',
      package_price: '',
      cost_category_id: '',
      notes: ''
    })
    setEditingId(null)
    setShowAddForm(false)
  }

  function startEdit(ing: Ingredient) {
    setFormData({
      name: ing.name,
      unit: ing.unit,
      purchase_price: ing.purchase_price ? String(ing.purchase_price) : '',
      units_per_package: ing.units_per_package ? String(ing.units_per_package) : '',
      package_price: ing.package_price ? String(ing.package_price) : '',
      cost_category_id: ing.cost_category_id || '',
      notes: ing.notes || ''
    })
    setEditingId(ing.id)
    setShowAddForm(true)
  }

  async function saveIngredient() {
    if (!formData.name || !businessId) return
    
    setSaving(true)

    // Parse string values to numbers
    const purchasePrice = parseFloat(String(formData.purchase_price).replace(',', '.')) || 0
    const packagePrice = parseFloat(String(formData.package_price).replace(',', '.')) || 0
    const unitsPerPackage = parseInt(String(formData.units_per_package)) || 1

    // Calculate price per unit if package info is provided
    let pricePerUnit = purchasePrice
    if (packagePrice > 0 && unitsPerPackage > 0) {
      pricePerUnit = packagePrice / unitsPerPackage
    }

    const ingredientData = {
      tenant_slug: businessId,
      name: formData.name,
      unit: formData.unit,
      purchase_price: pricePerUnit,
      units_per_package: unitsPerPackage,
      package_price: packagePrice,
      cost_category_id: formData.cost_category_id || null,
      notes: formData.notes || null
    }

    if (editingId) {
      // Update
      const { data } = await supabase
        .from('ingredients')
        .update(ingredientData)
        .eq('id', editingId)
        .select()
        .single()

      if (data) {
        setIngredients(prev => prev.map(i => i.id === editingId ? data : i))
      }
    } else {
      // Insert
      const { data } = await supabase
        .from('ingredients')
        .insert(ingredientData)
        .select()
        .single()

      if (data) {
        setIngredients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      }
    }

    resetForm()
    setSaving(false)
  }

  async function deleteIngredient(id: string) {
    if (!confirm('Weet je zeker dat je dit ingrediënt wilt verwijderen?')) return
    
    await supabase.from('ingredients').delete().eq('id', id)
    setIngredients(prev => prev.filter(i => i.id !== id))
  }

  // Parse Van Zon copied text
  function parseVanZonText(text: string) {
    const products: Array<{name: string, articleNr: string, price: number}> = []
    
    // Split by product patterns - look for price patterns
    const lines = text.split('\n').filter(l => l.trim())
    
    let currentName = ''
    let currentArticleNr = ''
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Check for article number pattern (number followed by status)
      const articleMatch = line.match(/^(\d+)\s+(Op voorraad|Beperkte voorraad|Volgens beschikbaarheid)/)
      if (articleMatch) {
        currentArticleNr = articleMatch[1]
        // Previous non-empty line that's not a duplicate is the name
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j].trim()
          if (prevLine && !prevLine.endsWith('.') && !prevLine.match(/^Prijs|^€|maateenheid|Aantal|Verwijder|−|\+|^CU$|^WUK$/)) {
            currentName = prevLine
            break
          }
        }
        continue
      }
      
      // Check for price pattern
      const priceMatch = line.match(/€\s*(\d+)[,.](\d{2})/)
      if (priceMatch && currentName && currentArticleNr) {
        const price = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`)
        
        // Clean up name - remove trailing dot
        let cleanName = currentName.replace(/\.$/, '').trim()
        
        // Don't add duplicates
        if (!products.some(p => p.articleNr === currentArticleNr)) {
          products.push({
            name: cleanName,
            articleNr: currentArticleNr,
            price: price
          })
        }
        
        currentName = ''
        currentArticleNr = ''
      }
    }
    
    return products
  }

  function handleImportTextChange(text: string) {
    setImportText(text)
    const parsed = parseVanZonText(text)
    setImportPreview(parsed)
  }

  async function importProducts() {
    if (!businessId || importPreview.length === 0) return
    
    setImporting(true)
    
    const newIngredients: Ingredient[] = []
    const existingArticleNrs = ingredients
      .map(i => i.notes?.match(/Van Zon #(\d+)/)?.[1])
      .filter(Boolean)
    
    let skipped = 0
    
    for (const product of importPreview) {
      // Skip if already exists in database (check by article number in notes)
      if (existingArticleNrs.includes(product.articleNr)) {
        skipped++
        continue
      }
      
      // Skip if already added in this batch
      if (newIngredients.some(i => i.notes?.includes(`Van Zon #${product.articleNr}`))) {
        skipped++
        continue
      }
      
      const { data } = await supabase
        .from('ingredients')
        .insert({
          tenant_slug: businessId,
          name: product.name,
          unit: 'doos',
          purchase_price: product.price,
          units_per_package: 1,
          package_price: product.price,
          notes: `Van Zon #${product.articleNr}`
        })
        .select()
        .single()
      
      if (data) {
        newIngredients.push(data)
      }
    }
    
    if (skipped > 0) {
      alert(`${newIngredients.length} producten toegevoegd, ${skipped} dubbelen overgeslagen`)
    }
    
    setIngredients(prev => [...prev, ...newIngredients].sort((a, b) => a.name.localeCompare(b.name)))
    setShowImport(false)
    setImportText('')
    setImportPreview([])
    setImporting(false)
  }

  const filteredIngredients = ingredients.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getCategoryName = (catId: string | null) => {
    if (!catId) return '-'
    const cat = categories.find(c => c.id === catId)
    return cat ? cat.name : '-'
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🥬 Ingrediënten</h1>
          <p className="text-gray-500 mt-1">
            Beheer alle ingrediënten met hun inkoopprijzen
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowDatabaseSearch(true)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            🔍 Zoek in Database
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            📥 Excel Import
          </button>
          <button
            onClick={() => { resetForm(); setShowAddForm(true) }}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            + Handmatig
          </button>
        </div>
      </div>

      {/* Database Search Modal */}
      <AnimatePresence>
        {showDatabaseSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDatabaseSearch(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b bg-green-50">
                <h2 className="text-xl font-bold text-gray-900">🔍 Zoek in Leveranciers Database</h2>
                <p className="text-gray-600 mt-1">
                  Zoek uit 334 frituurproducten met automatische prijsberekening per stuk
                </p>
              </div>
              
              <div className="p-6">
                {/* Search bar */}
                <div className="flex gap-3 mb-4">
                  <input
                    type="text"
                    placeholder="Zoek bijv. hamburger, frikandel, saus..."
                    value={dbSearchQuery}
                    onChange={(e) => setDbSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDbSearch()}
                    className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                  <select
                    value={dbSelectedCategory}
                    onChange={(e) => setDbSelectedCategory(e.target.value)}
                    className="px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Alle categorieën</option>
                    {dbCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleDbSearch}
                    disabled={dbSearching}
                    className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50"
                  >
                    {dbSearching ? '...' : '🔍 Zoek'}
                  </button>
                </div>

                {/* Results */}
                <div className="max-h-[50vh] overflow-auto border rounded-xl">
                  {dbSearchResults.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Product</th>
                          <th className="px-3 py-2 text-left">Categorie</th>
                          <th className="px-3 py-2 text-right">Doos</th>
                          <th className="px-3 py-2 text-center">Aantal</th>
                          <th className="px-3 py-2 text-right font-bold text-green-700">Per stuk</th>
                          <th className="px-3 py-2 text-center">Actie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dbSearchResults.map((product) => {
                          const alreadyAdded = ingredients.some(i => 
                            i.notes?.includes(`Art. #${product.article_number}`)
                          )
                          return (
                            <tr key={product.id} className={`border-t hover:bg-gray-50 ${alreadyAdded ? 'bg-green-50' : ''}`}>
                              <td className="px-3 py-2 font-medium">{product.name}</td>
                              <td className="px-3 py-2 text-gray-500">{product.category || '-'}</td>
                              <td className="px-3 py-2 text-right font-mono">€{product.package_price.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center">{product.units_per_package}x</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-green-600">
                                €{product.unit_price.toFixed(4)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {alreadyAdded ? (
                                  <span className="text-green-600">✓ Toegevoegd</span>
                                ) : (
                                  <button
                                    onClick={() => addFromDatabase(product)}
                                    disabled={addingProduct === product.id}
                                    className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-xs"
                                  >
                                    {addingProduct === product.id ? '...' : '+ Toevoegen'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      {dbSearchQuery || dbSelectedCategory ? (
                        <>Geen producten gevonden. Probeer een andere zoekterm.</>
                      ) : (
                        <>
                          <div className="text-4xl mb-2">🔍</div>
                          <p>Typ een zoekterm en klik op zoeken</p>
                          <p className="text-sm mt-2">bijv. "hamburger", "frikandel", "bicky saus"</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {dbSearchResults.length > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    {dbSearchResults.length} producten gevonden
                  </p>
                )}
              </div>
              
              <div className="p-6 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => { setShowDatabaseSearch(false); setDbSearchQuery(''); setDbSearchResults([]) }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Sluiten
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Van Zon Import Modal */}
      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowImport(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b bg-blue-50">
                <h2 className="text-xl font-bold text-gray-900">📥 Van Zon Import</h2>
                <p className="text-gray-600 mt-1">
                  Kopieer je bestelgeschiedenis van shopvanzon.be en plak het hieronder
                </p>
              </div>
              
              <div className="p-6 grid grid-cols-2 gap-6 max-h-[60vh] overflow-auto">
                {/* Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plak hier de gekopieerde tekst:
                  </label>
                  <textarea
                    value={importText}
                    onChange={(e) => handleImportTextChange(e.target.value)}
                    className="w-full h-80 p-3 border rounded-lg text-sm font-mono"
                    placeholder="Kopieer de producten van Van Zon en plak hier..."
                  />
                </div>
                
                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview ({importPreview.length} producten gevonden):
                  </label>
                  <div className="h-80 overflow-auto border rounded-lg bg-gray-50">
                    {importPreview.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-2 py-1 text-left">Art.Nr</th>
                            <th className="px-2 py-1 text-left">Naam</th>
                            <th className="px-2 py-1 text-right">Prijs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((p, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-2 py-1 font-mono text-gray-500">{p.articleNr}</td>
                              <td className="px-2 py-1">{p.name}</td>
                              <td className="px-2 py-1 text-right font-mono">€{p.price.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-4 text-gray-500 text-center">
                        Plak tekst om preview te zien
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t bg-gray-50 flex justify-between">
                <button
                  onClick={() => { setShowImport(false); setImportText(''); setImportPreview([]) }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Annuleren
                </button>
                <button
                  onClick={importProducts}
                  disabled={importing || importPreview.length === 0}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {importing ? 'Importeren...' : `${importPreview.length} producten importeren`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Zoek ingrediënt..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-200"
          >
            <h3 className="font-semibold mb-4">
              {editingId ? 'Ingrediënt bewerken' : 'Nieuw ingrediënt toevoegen'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Naam */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
                <input
                  type="text"
                  placeholder="bijv. Hamburger vlees"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Eenheid */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Eenheid</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  {unitOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Categorie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
                <select
                  value={formData.cost_category_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost_category_id: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Selecteer --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name} (×{cat.multiplier})</option>
                  ))}
                </select>
              </div>

              {/* Prijs per stuk OF doosprijs */}
              <div className="bg-gray-50 p-3 rounded-lg col-span-full">
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Optie 1:</strong> Vul direct de prijs per eenheid in, <strong>OF</strong><br/>
                  <strong>Optie 2:</strong> Vul doosprijs en aantal stuks in (prijs wordt automatisch berekend)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prijs per {formData.unit}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">€</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.purchase_price}
                        onChange={(e) => {
                          const val = e.target.value.replace(',', '.')
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setFormData(prev => ({ ...prev, purchase_price: val }))
                          }
                        }}
                        className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="bijv. 0,50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Doos/verpakkingsprijs</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">€</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.package_price}
                        onChange={(e) => {
                          const val = e.target.value.replace(',', '.')
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setFormData(prev => ({ ...prev, package_price: val }))
                          }
                        }}
                        className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="bijv. 11,49"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aantal in doos</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.units_per_package}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '' || /^\d+$/.test(val)) {
                          setFormData(prev => ({ ...prev, units_per_package: val }))
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="bijv. 30"
                    />
                  </div>
                </div>
                {parseFloat(String(formData.package_price).replace(',', '.')) > 0 && parseInt(String(formData.units_per_package)) > 0 && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ Berekende prijs per {formData.unit}: €{(parseFloat(String(formData.package_price).replace(',', '.')) / parseInt(String(formData.units_per_package))).toFixed(4)}
                  </p>
                )}
              </div>

              {/* Notities */}
              <div className="col-span-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notities (optioneel)</label>
                <input
                  type="text"
                  placeholder="bijv. Leverancier: Sligro"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveIngredient}
                disabled={saving || !formData.name}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {saving ? 'Opslaan...' : (editingId ? 'Bijwerken' : 'Toevoegen')}
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Annuleren
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ingredients Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ingrediënt</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Eenheid</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Categorie</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Prijs/eenheid</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Doosprijs</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredIngredients.map((ing) => (
              <tr key={ing.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{ing.name}</td>
                <td className="px-4 py-3 text-gray-600">{ing.unit}</td>
                <td className="px-4 py-3 text-gray-600">{getCategoryName(ing.cost_category_id)}</td>
                <td className="px-4 py-3 text-right font-mono">€{ing.purchase_price.toFixed(4)}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-500">
                  {ing.package_price > 0 ? `€${ing.package_price.toFixed(2)} (${ing.units_per_package}st)` : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => startEdit(ing)}
                    className="text-blue-500 hover:text-blue-700 mr-3"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteIngredient(ing.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredIngredients.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? 'Geen ingrediënten gevonden' : 'Nog geen ingrediënten toegevoegd'}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-600">
        <strong>{ingredients.length}</strong> ingrediënten in totaal
      </div>
    </div>
  )
}
