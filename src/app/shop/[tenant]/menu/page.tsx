'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { getMenuCategories, getMenuProducts, getOptionsForProduct, getProductsWithOptions, getTenantSettings, getActivePromotions, MenuCategory, MenuProduct, ProductOption, ProductOptionChoice, Promotion } from '@/lib/admin-api'
import { useLanguage } from '@/i18n'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  category_id: string | null
  category_name: string
  is_available: boolean
  is_popular: boolean
  is_promo: boolean
  promo_price?: number
  allergens: string[]
  image_display_mode?: 'cover' | 'contain' | null
}

interface CartItem {
  item: MenuItem
  quantity: number
  selectedOptions: { option: ProductOption; choice: ProductOptionChoice }[]
  totalPrice: number
}

export default function MenuPage({ params }: { params: { tenant: string } }) {
  const router = useRouter()
  const { t, locale, setLocale, locales, localeNames, localeFlags } = useLanguage()
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [productOptions, setProductOptions] = useState<ProductOption[]>([])
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({})
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#FF6B35')
  const [imageDisplayMode, setImageDisplayMode] = useState<'cover' | 'contain'>('cover')
  const [productsWithOptions, setProductsWithOptions] = useState<string[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [promotionsEnabled, setPromotionsEnabled] = useState(true)
  const menuContentRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const isScrollingToSection = useRef(false)

  // Scroll spy - update active category based on scroll position
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Skip als we handmatig naar een sectie scrollen
        if (isScrollingToSection.current) return
        
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            const categoryId = entry.target.getAttribute('data-category-id')
            if (categoryId) {
              setActiveCategory(categoryId)
            }
          }
        })
      },
      {
        rootMargin: '-120px 0px -50% 0px', // Boven de header
        threshold: [0.3, 0.5, 0.7]
      }
    )

    // Observe all sections
    sectionRefs.current.forEach((el) => {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [categories, promotions])

  // Handler voor categorie klikken - scrollt naar sectie
  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId)
    isScrollingToSection.current = true
    
    const sectionEl = sectionRefs.current.get(categoryId)
    if (sectionEl) {
      const headerHeight = 120 // Sticky header hoogte
      const elementTop = sectionEl.getBoundingClientRect().top + window.scrollY - headerHeight
      window.scrollTo({ top: elementTop, behavior: 'smooth' })
      
      // Reset flag na scroll animatie
      setTimeout(() => {
        isScrollingToSection.current = false
      }, 800)
    }
  }

  // Ref setter voor secties
  const setSectionRef = (categoryId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      sectionRefs.current.set(categoryId, el)
    }
  }

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      const cartForStorage = cart.map(c => ({
        id: c.item.id,
        name: c.item.name,
        price: c.item.price,
        quantity: c.quantity,
        options: c.selectedOptions.map(o => ({ name: o.choice.name, price: o.choice.price })),
        totalPrice: c.totalPrice,
        image_url: c.item.image_url,
      }))
      localStorage.setItem(`cart_${params.tenant}`, JSON.stringify(cartForStorage))
    }
  }, [cart, params.tenant])

  useEffect(() => {
    async function loadData() {
      const [categoriesData, productsData, tenantData, optionProducts, promotionsData] = await Promise.all([
        getMenuCategories(params.tenant),
        getMenuProducts(params.tenant),
        getTenantSettings(params.tenant),
        getProductsWithOptions(params.tenant),
        getActivePromotions(params.tenant),
      ])
      
      setProductsWithOptions(optionProducts)
      setPromotions(promotionsData)
      setPromotionsEnabled(tenantData?.promotions_enabled !== false)
      
      // Check of tenant bestaat - redirect naar niet gevonden als tenantData null is
      if (!tenantData) {
        window.location.href = `/shop/${params.tenant}`
        return
      }
      
      // Set primary color and image display mode from tenant settings
      if (tenantData?.primary_color) {
        setPrimaryColor(tenantData.primary_color)
      }
      if (tenantData?.image_display_mode) {
        setImageDisplayMode(tenantData.image_display_mode)
      }

      setCategories(categoriesData.filter(c => c.is_active))

      // Convert products to menu items
      const items: MenuItem[] = productsData
        .filter(p => p.is_active)
        .map(p => {
          const category = categoriesData.find(c => c.id === p.category_id)
          return {
            id: p.id || '',
            name: p.name,
            description: p.description,
            price: p.price,
            image_url: p.image_url || 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400',
            category_id: p.category_id,
            category_name: category?.name || 'Overig',
            is_available: p.is_active,
            is_popular: p.is_popular,
            is_promo: p.is_promo || false,
            promo_price: p.promo_price,
            allergens: p.allergens || [],
            image_display_mode: p.image_display_mode || null,
          }
        })

      setMenuItems(items)
      
      // Stel de default categorie in
      const promoEnabled = tenantData?.promotions_enabled !== false
      if (promoEnabled && promotionsData.length > 0) {
        setActiveCategory('promo')
      } else if (items.some(i => i.is_popular)) {
        setActiveCategory('popular')
      } else if (categoriesData.length > 0) {
        setActiveCategory(categoriesData[0].id || 'all')
      } else {
        setActiveCategory('all')
      }
      
      setLoading(false)
    }

    loadData()
  }, [params.tenant])

  const selectProduct = async (item: MenuItem) => {
    setSelectedItem(item)
    setSelectedChoices({})
    setLoadingOptions(true)
    
    // Load options for this product
    const options = await getOptionsForProduct(item.id)
    setProductOptions(options)
    
    // Pre-select first choice for required single-choice options
    const initialChoices: Record<string, string> = {}
    options.forEach(opt => {
      if (opt.required && opt.type === 'single' && opt.choices && opt.choices.length > 0) {
        initialChoices[opt.id!] = opt.choices[0].id!
      }
    })
    setSelectedChoices(initialChoices)
    setLoadingOptions(false)
  }

  const handleChoiceSelect = (optionId: string, choiceId: string, optionType: 'single' | 'multiple') => {
    setSelectedChoices(prev => {
      if (optionType === 'single') {
        return { ...prev, [optionId]: choiceId }
      } else {
        // Multiple choice - toggle
        const currentChoices = prev[optionId]?.split(',').filter(Boolean) || []
        const isSelected = currentChoices.includes(choiceId)
        const newChoices = isSelected
          ? currentChoices.filter(id => id !== choiceId)
          : [...currentChoices, choiceId]
        return { ...prev, [optionId]: newChoices.join(',') }
      }
    })
  }

  const calculateTotalPrice = () => {
    if (!selectedItem) return 0
    let total = selectedItem.price
    
    productOptions.forEach(option => {
      const selectedChoiceIds = selectedChoices[option.id!]?.split(',').filter(Boolean) || []
      selectedChoiceIds.forEach(choiceId => {
        const choice = option.choices?.find(c => c.id === choiceId)
        if (choice) {
          total += choice.price
        }
      })
    })
    
    return total
  }

  const canAddToCart = () => {
    // Check if all required options have a selection
    return productOptions
      .filter(opt => opt.required)
      .every(opt => selectedChoices[opt.id!] && selectedChoices[opt.id!].length > 0)
  }

  const addToCart = () => {
    if (!selectedItem) return
    
    // Build selected options array
    const selectedOpts: { option: ProductOption; choice: ProductOptionChoice }[] = []
    productOptions.forEach(option => {
      const selectedChoiceIds = selectedChoices[option.id!]?.split(',').filter(Boolean) || []
      selectedChoiceIds.forEach(choiceId => {
        const choice = option.choices?.find(c => c.id === choiceId)
        if (choice) {
          selectedOpts.push({ option, choice })
        }
      })
    })
    
    const totalPrice = calculateTotalPrice()
    
    // Create unique key for this combination
    const optionsKey = selectedOpts.map(o => o.choice.id).sort().join('-')
    const cartKey = `${selectedItem.id}-${optionsKey}`
    
    setCart(prev => {
      const existing = prev.find(c => 
        c.item.id === selectedItem.id && 
        c.selectedOptions.map(o => o.choice.id).sort().join('-') === optionsKey
      )
      if (existing) {
        return prev.map(c => 
          c === existing
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      }
      return [...prev, { 
        item: selectedItem, 
        quantity: 1, 
        selectedOptions: selectedOpts,
        totalPrice 
      }]
    })
    
    setSelectedItem(null)
    setProductOptions([])
    setSelectedChoices({})
  }

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  const cartTotal = cart.reduce((sum, c) => sum + (c.totalPrice * c.quantity), 0)
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0)

  const allergenIcons: Record<string, { icon: string, color: string, label: string }> = {
    gluten: { icon: '🌾', color: 'bg-amber-100 text-amber-800', label: 'Gluten' },
    ei: { icon: '🥚', color: 'bg-yellow-100 text-yellow-800', label: 'Ei' },
    melk: { icon: '🥛', color: 'bg-blue-100 text-blue-800', label: 'Melk' },
    noten: { icon: '🥜', color: 'bg-orange-100 text-orange-800', label: 'Noten' },
    soja: { icon: '🫘', color: 'bg-green-100 text-green-800', label: 'Soja' },
    vis: { icon: '🐟', color: 'bg-cyan-100 text-cyan-800', label: 'Vis' },
    schaaldieren: { icon: '🦐', color: 'bg-red-100 text-red-800', label: 'Schaaldieren' },
    selderij: { icon: '🥬', color: 'bg-lime-100 text-lime-800', label: 'Selderij' },
    mosterd: { icon: '🟡', color: 'bg-yellow-100 text-yellow-800', label: 'Mosterd' },
    sesam: { icon: '⚪', color: 'bg-stone-100 text-stone-800', label: 'Sesam' },
  }

  // ProductCard component voor herbruikbaarheid
  const ProductCard = ({ item }: { item: MenuItem }) => {
    const itemDisplayMode = item.image_display_mode || imageDisplayMode
    const useContain = itemDisplayMode === 'contain'
    
    return (
      <div
        onClick={() => selectProduct(item)}
        className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer group"
      >
        <div className={`relative h-48 overflow-hidden ${useContain ? 'bg-white' : 'bg-gray-100'}`}>
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              quality={75}
              loading="lazy"
              className={useContain ? 'object-contain p-2' : 'object-cover'}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🍟</div>
          )}
          <div className="absolute top-3 left-3 flex gap-2">
            {item.is_popular && (
              <span style={{ backgroundColor: primaryColor }} className="text-white text-xs font-bold px-2 py-1 rounded-full">
                🔥 POPULAIR
              </span>
            )}
          </div>
          {!item.is_available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-red-500 text-white font-bold px-4 py-2 rounded-full">{t('menuPage.soldOut')}</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
            <span style={{ color: primaryColor }} className="text-xl font-bold">€{item.price.toFixed(2)}</span>
          </div>
          <p className="text-gray-500 text-sm mb-3 line-clamp-2">{item.description}</p>
          {item.allergens.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {item.allergens.map(allergen => (
                <span key={allergen} className={`text-xs px-2 py-1 rounded-full ${allergenIcons[allergen.toLowerCase()]?.color || 'bg-gray-100 text-gray-600'}`}>
                  {allergenIcons[allergen.toLowerCase()]?.icon || '⚠️'} {allergenIcons[allergen.toLowerCase()]?.label || allergen}
                </span>
              ))}
            </div>
          )}
          <div className="mt-2 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: primaryColor }}>
            {productsWithOptions.includes(item.id) ? (
              <><span>⚙️</span><span>{t('menuPage.chooseOptions')}</span><span className="text-lg">→</span></>
            ) : (
              <><span>🛒</span><span>{t('menuPage.clickToOrder')}</span><span className="text-lg">→</span></>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
          className="w-12 h-12 border-4 rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header + Categories - SAMEN in 1 container voor iOS Safari */}
      <header 
        className="sticky top-0 z-50 bg-white shadow-md"
        style={{
          position: '-webkit-sticky',
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
        } as React.CSSProperties}
      >
        {/* Navigation Bar */}
        <div className="border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href={`/shop/${params.tenant}`} className="flex items-center gap-2 text-gray-600 hover:opacity-70 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>{t('menuPage.back')}</span>
            </Link>
            <h1 className="font-bold text-xl text-gray-900">{t('menuPage.menu')}</h1>
            <Link 
              href={`/shop/${params.tenant}/account`}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span>👤</span>
              <span className="text-sm font-medium hidden sm:inline">{t('menuPage.account')}</span>
            </Link>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            {promotionsEnabled && promotions.length > 0 && (
              <button
                onClick={() => handleCategoryChange('promo')}
                className={`px-5 py-2.5 rounded-full font-medium whitespace-nowrap transition-colors active:scale-95 ${
                  activeCategory === 'promo'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-green-100 text-green-700 active:bg-green-200'
                }`}
              >
                🎁 {t('menuPage.promotions')}
              </button>
            )}
            {menuItems.some(i => i.is_popular) && (
              <button
                onClick={() => handleCategoryChange('popular')}
                style={activeCategory === 'popular' ? { backgroundColor: primaryColor } : {}}
                className={`px-5 py-2.5 rounded-full font-medium whitespace-nowrap transition-colors active:scale-95 ${
                  activeCategory === 'popular'
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                }`}
              >
                🔥 {t('menuPage.popular')}
              </button>
            )}
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id!)}
                style={activeCategory === cat.id ? { backgroundColor: primaryColor } : {}}
                className={`px-5 py-2.5 rounded-full font-medium whitespace-nowrap transition-colors active:scale-95 ${
                  activeCategory === cat.id
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Menu Items - Continuous scroll met section headers */}
      <div ref={menuContentRef} className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-28 sm:pb-32 space-y-8">
        
        {/* Promoties sectie */}
        {promotionsEnabled && promotions.length > 0 && (
          <section 
            ref={setSectionRef('promo')} 
            data-category-id="promo"
            className="scroll-mt-32"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🎁</span> {t('menuPage.promotions')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {promotions.map((promo) => {
                const linkedProduct = promo.product_id 
                  ? menuItems.find(item => item.id === promo.product_id)
                  : null
                const promoPrice = promo.type === 'fixedPrice' ? promo.value : 
                                   promo.type === 'percentage' && linkedProduct ? linkedProduct.price * (1 - promo.value / 100) :
                                   promo.type === 'fixed' && linkedProduct ? Math.max(0, linkedProduct.price - promo.value) : 0
                return (
                  <div
                    key={promo.id}
                    onClick={() => {
                      if (linkedProduct && promo.type === 'fixedPrice') {
                        const promoItem: MenuItem = { ...linkedProduct, name: promo.name, price: promoPrice, is_promo: true }
                        setCart(prev => {
                          const existing = prev.find(c => c.item.id === linkedProduct.id && c.item.price === promoPrice)
                          if (existing) return prev.map(c => c.item.id === linkedProduct.id && c.item.price === promoPrice ? { ...c, quantity: c.quantity + 1 } : c)
                          return [...prev, { item: promoItem, quantity: 1, selectedOptions: [], totalPrice: promoPrice }]
                        })
                        setCartOpen(true)
                      }
                    }}
                    className={`bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all ${linkedProduct ? 'cursor-pointer active:scale-[0.98]' : ''}`}
                  >
                    <div className="relative h-40 sm:h-48 overflow-hidden bg-gray-100">
                      {promo.image_url ? (
                        <Image src={promo.image_url} alt={promo.name} fill sizes="(max-width: 640px) 100vw, 33vw" quality={75} loading="lazy" className="object-cover" />
                      ) : linkedProduct?.image_url ? (
                        <Image src={linkedProduct.image_url} alt={promo.name} fill sizes="(max-width: 640px) 100vw, 33vw" quality={75} loading="lazy" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-green-400 to-green-600">🎁</div>
                      )}
                      <div className="absolute top-2 left-2">
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                          {promo.type === 'fixedPrice' ? `€${promo.value.toFixed(2)}` : promo.type === 'percentage' ? `-${promo.value}%` : promo.type === 'fixed' ? `-€${promo.value}` : t('menuPage.free')}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4">
                      <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1">{promo.name}</h3>
                      {promo.description && <p className="text-gray-500 text-xs sm:text-sm line-clamp-2">{promo.description}</p>}
                      {linkedProduct && promo.type === 'fixedPrice' && (
                        <button style={{ backgroundColor: primaryColor }} className="w-full mt-3 py-2 text-white font-medium rounded-lg text-sm">
                          + Toevoegen €{promo.value.toFixed(2)}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Populair sectie */}
        {menuItems.some(i => i.is_popular) && (
          <section 
            ref={setSectionRef('popular')} 
            data-category-id="popular"
            className="scroll-mt-32"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🔥</span> {t('menuPage.popular')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {menuItems.filter(i => i.is_popular).map((item) => (
                <ProductCard key={`popular-${item.id}`} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Categorie secties */}
        {categories.map((category) => {
          const categoryItems = menuItems.filter(i => i.category_id === category.id)
          if (categoryItems.length === 0) return null
          return (
            <section 
              key={category.id}
              ref={setSectionRef(category.id!)} 
              data-category-id={category.id}
              className="scroll-mt-32"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">{category.name}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {categoryItems.map((item) => (
                  <ProductCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )
        })}

        {/* Geen producten message */}
        {menuItems.length === 0 && promotions.length === 0 && (
          <div className="text-center py-20">
            <span className="text-6xl mb-4 block">🍟</span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('menuPage.noProducts')}</h2>
            <p className="text-gray-500">{t('menuPage.noProductsDesc')}</p>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedItem(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {(() => {
                const selectedDisplayMode = selectedItem.image_display_mode || imageDisplayMode
                const useContain = selectedDisplayMode === 'contain'
                return (
              <div className={`relative h-64 overflow-hidden rounded-t-3xl md:rounded-t-3xl ${useContain ? 'bg-white' : 'bg-gray-100'}`}>
                {selectedItem.image_url ? (
                  <Image
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 500px"
                    quality={80}
                    className={useContain ? 'object-contain p-4' : 'object-cover'}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl">
                    🍟
                  </div>
                )}
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg"
                >
                  <span className="text-2xl">×</span>
                </button>
                <div className="absolute bottom-4 left-4 flex gap-2">
                  {selectedItem.is_popular && (
                    <span style={{ backgroundColor: primaryColor }} className="text-white text-sm font-bold px-3 py-1 rounded-full">🔥 POPULAIR</span>
                  )}
                </div>
              </div>
                )
              })()}

              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedItem.name}</h2>
                  <span style={{ color: primaryColor }} className="text-2xl font-bold">€{selectedItem.price.toFixed(2)}</span>
                </div>
                <p className="text-gray-600 mb-6">{selectedItem.description}</p>

                {selectedItem.allergens.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-2">{t('menuPage.allergens')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.allergens.map(allergen => (
                        <span 
                          key={allergen}
                          className={`text-sm px-3 py-1.5 rounded-full ${allergenIcons[allergen.toLowerCase()]?.color || 'bg-gray-100 text-gray-600'}`}
                        >
                          {allergenIcons[allergen.toLowerCase()]?.icon || '⚠️'} {allergenIcons[allergen.toLowerCase()]?.label || allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product Options */}
                {loadingOptions ? (
                  <div className="flex items-center justify-center py-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
                      className="w-6 h-6 border-2 rounded-full"
                    />
                  </div>
                ) : productOptions.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {productOptions.map(option => (
                      <div key={option.id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="font-semibold text-gray-900">{option.name}</h3>
                          {option.required && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{t('menuPage.required')}</span>
                          )}
                          <span className="text-xs text-gray-500">
                            {option.type === 'single' ? `(${t('menuPage.chooseSingle')})` : `(${t('menuPage.chooseMultiple')})`}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {option.choices?.map(choice => {
                            const isSelected = option.type === 'single'
                              ? selectedChoices[option.id!] === choice.id
                              : selectedChoices[option.id!]?.split(',').includes(choice.id!)
                            
                            return (
                              <label
                                key={choice.id}
                                style={isSelected ? { backgroundColor: `${primaryColor}10`, borderColor: primaryColor } : {}}
                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'border-2'
                                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type={option.type === 'single' ? 'radio' : 'checkbox'}
                                    name={option.id}
                                    checked={isSelected}
                                    onChange={() => handleChoiceSelect(option.id!, choice.id!, option.type)}
                                    style={{ accentColor: primaryColor }}
                                    className="w-5 h-5"
                                  />
                                  <span className="font-medium text-gray-900">{choice.name}</span>
                                </div>
                                <span style={choice.price > 0 ? { color: primaryColor } : {}} className={`font-medium ${choice.price <= 0 ? 'text-gray-400' : ''}`}>
                                  {choice.price > 0 ? `+€${choice.price.toFixed(2)}` : t('menuPage.free')}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addToCart}
                  disabled={!selectedItem.is_available || !canAddToCart()}
                  style={{ backgroundColor: selectedItem.is_available && canAddToCart() ? primaryColor : undefined }}
                  className="w-full disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 hover:opacity-90"
                >
                  <span>🛒</span>
                  <span>{t('menuPage.addToOrder')}</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">€{calculateTotalPrice().toFixed(2)}</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Button */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            onClick={() => setCartOpen(true)}
            style={{ backgroundColor: primaryColor, boxShadow: `0 25px 50px -12px ${primaryColor}66` }}
            className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 text-white font-bold py-3 sm:py-4 px-4 sm:px-8 rounded-2xl shadow-2xl flex items-center gap-2 sm:gap-4 z-40 hover:opacity-90 text-sm sm:text-base max-w-[calc(100%-2rem)]"
          >
            <span style={{ color: primaryColor }} className="bg-white w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm sm:text-base shrink-0">{cartCount}</span>
            <span className="hidden sm:inline">{t('menuPage.viewOrder')}</span>
            <span className="sm:hidden">{t('menuPage.order')}</span>
            <span className="border-l border-white/30 pl-2 sm:pl-4 shrink-0">€{cartTotal.toFixed(2)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Cart Slide Panel */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl"
            >
              <div className="p-4 sm:p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('menuPage.yourOrder')}</h2>
                  <button onClick={() => setCartOpen(false)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-2xl">×</span>
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 flex-1 overflow-y-auto max-h-[55vh] sm:max-h-[60vh]">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">🛒</span>
                    <p className="text-gray-500">{t('menuPage.emptyCart')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((cartItem, index) => (
                      <motion.div key={index} layout className="flex gap-4 bg-gray-50 rounded-xl p-4">
                        {cartItem.item.image_url ? (
                          <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-white">
                            <Image 
                              src={cartItem.item.image_url} 
                              alt={cartItem.item.name} 
                              fill
                              sizes="80px"
                              quality={60}
                              className="object-contain p-1" 
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-3xl">🍟</div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{cartItem.item.name}</h3>
                          {cartItem.selectedOptions.length > 0 && (
                            <div className="text-sm text-gray-500 mt-1">
                              {cartItem.selectedOptions.map(opt => opt.choice.name).join(', ')}
                            </div>
                          )}
                          <p style={{ color: primaryColor }} className="font-bold">€{(cartItem.totalPrice * cartItem.quantity).toFixed(2)}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-gray-500">{t('menuPage.quantity')}: {cartItem.quantity}</span>
                            <button onClick={() => removeFromCart(index)} className="text-red-500 text-sm hover:underline">{t('menuPage.remove')}</button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-white border-t pb-safe">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">{t('menuPage.subtotal')}</span>
                    <span className="text-xl font-bold text-gray-900">€{cartTotal.toFixed(2)}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setCartOpen(false)
                      router.push(`/shop/${params.tenant}/checkout`)
                    }}
                    style={{ backgroundColor: primaryColor }}
                    className="w-full text-white font-bold py-4 rounded-2xl transition-colors hover:opacity-90"
                  >
                    {t('menuPage.checkout')} →
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
