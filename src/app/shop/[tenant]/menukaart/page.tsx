'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { getTenantSettings, getMenuCategories, getMenuProducts, TenantSettings, MenuCategory, MenuProduct } from '@/lib/admin-api'

export default function MenukaartPage({ params }: { params: { tenant: string } }) {
  const searchParams = useSearchParams()
  const showPromoOnly = searchParams.get('promo') === '1'
  
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [products, setProducts] = useState<MenuProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>(showPromoOnly ? 'promo' : 'all')

  useEffect(() => {
    async function loadData() {
      const [settingsData, categoriesData, productsData] = await Promise.all([
        getTenantSettings(params.tenant),
        getMenuCategories(params.tenant),
        getMenuProducts(params.tenant)
      ])
      
      setSettings(settingsData)
      setCategories(categoriesData.sort((a, b) => a.sort_order - b.sort_order))
      setProducts(productsData.filter(p => p.is_active).sort((a, b) => a.sort_order - b.sort_order))
      setLoading(false)
    }
    loadData()
  }, [params.tenant])

  const primaryColor = settings?.primary_color || '#FF6B35'

  const filteredProducts = activeCategory === 'all' 
    ? products 
    : activeCategory === 'promo'
    ? products.filter(p => p.is_promo)
    : products.filter(p => p.category_id === activeCategory)

  const getProductsByCategory = (categoryId: string) => {
    return products.filter(p => p.category_id === categoryId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/60">Menu laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-white/10">
        <div className="px-4 py-4 text-center">
          {settings?.logo_url ? (
            <img 
              src={settings.logo_url} 
              alt={settings?.business_name || 'Logo'} 
              className="h-12 mx-auto mb-2 object-contain"
            />
          ) : (
            <h1 className="text-2xl font-bold text-white">{settings?.business_name || params.tenant}</h1>
          )}
          <p className="text-white/60 text-sm">{settings?.tagline || 'Ons Menu'}</p>
        </div>
        
        {/* Category Navigation */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => setActiveCategory('all')}
              style={activeCategory === 'all' ? { backgroundColor: primaryColor } : {}}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Alles
            </button>
            {products.some(p => p.is_promo) && (
              <button
                onClick={() => setActiveCategory('promo')}
                style={activeCategory === 'promo' ? { backgroundColor: '#22c55e' } : {}}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === 'promo'
                    ? 'text-white'
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                }`}
              >
                🎁 Promoties
              </button>
            )}
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id!)}
                style={activeCategory === category.id ? { backgroundColor: primaryColor } : {}}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === category.id
                    ? 'text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Menu Content */}
      <main className="px-4 py-6 pb-24">
        {activeCategory === 'all' ? (
          // Toon per categorie
          <div className="space-y-8">
            {categories.map((category) => {
              const categoryProducts = getProductsByCategory(category.id!)
              if (categoryProducts.length === 0) return null
              
              return (
                <motion.section
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2 
                    className="text-xl font-bold text-white mb-4 pb-2 border-b border-white/10 flex items-center gap-2"
                  >
                    <span style={{ color: primaryColor }}>{category.icon || '🍽️'}</span>
                    {category.name}
                  </h2>
                  <div className="space-y-3">
                    {categoryProducts.map((product) => (
                      <MenuItemCard key={product.id} product={product} primaryColor={primaryColor} />
                    ))}
                  </div>
                </motion.section>
              )
            })}
            
            {/* Producten zonder categorie */}
            {products.filter(p => !p.category_id).length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-xl font-bold text-white mb-4 pb-2 border-b border-white/10">
                  🍽️ Overige
                </h2>
                <div className="space-y-3">
                  {products.filter(p => !p.category_id).map((product) => (
                    <MenuItemCard key={product.id} product={product} primaryColor={primaryColor} />
                  ))}
                </div>
              </motion.section>
            )}
          </div>
        ) : (
          // Toon gefilterde producten
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <MenuItemCard key={product.id} product={product} primaryColor={primaryColor} />
            ))}
            {filteredProducts.length === 0 && (
              <p className="text-white/40 text-center py-8">Geen producten in deze categorie</p>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/40 text-xs">Powered by Vysion</p>
          </div>
          <a 
            href={`/shop/${params.tenant}/menu`}
            style={{ backgroundColor: primaryColor }}
            className="px-6 py-2 rounded-full text-white text-sm font-medium flex items-center gap-2"
          >
            <span>🛒</span>
            <span>Online Bestellen</span>
          </a>
        </div>
      </footer>
    </div>
  )
}

// Menu Item Card Component
function MenuItemCard({ product, primaryColor }: { product: MenuProduct; primaryColor: string }) {
  const [expanded, setExpanded] = useState(false)
  
  const hasPromo = product.is_promo && product.promo_price !== undefined && product.promo_price < product.price
  
  return (
    <motion.div
      layout
      onClick={() => setExpanded(!expanded)}
      className="bg-white/5 rounded-xl overflow-hidden cursor-pointer hover:bg-white/10 transition-colors"
    >
      <div className="flex">
        {/* Image */}
        {product.image_url && (
          <div className={`${expanded ? 'w-24 h-24' : 'w-20 h-20'} flex-shrink-0 transition-all`}>
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 p-3 flex flex-col justify-center">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-white text-sm leading-tight">
                {product.name}
                {hasPromo && (
                  <span className="ml-2 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">PROMO</span>
                )}
              </h3>
              {product.description && !expanded && (
                <p className="text-white/50 text-xs mt-0.5 line-clamp-1">{product.description}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              {hasPromo ? (
                <>
                  <p className="text-white/40 text-xs line-through">€{product.price.toFixed(2)}</p>
                  <p style={{ color: primaryColor }} className="font-bold text-sm">€{product.promo_price!.toFixed(2)}</p>
                </>
              ) : (
                <p style={{ color: primaryColor }} className="font-bold text-sm">€{product.price.toFixed(2)}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Expanded Content */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-3 pb-3"
        >
          {product.description && (
            <p className="text-white/60 text-sm mb-2">{product.description}</p>
          )}
          {product.allergens && product.allergens.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.allergens.map((allergen) => (
                <span 
                  key={allergen}
                  className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded"
                >
                  {allergen}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
