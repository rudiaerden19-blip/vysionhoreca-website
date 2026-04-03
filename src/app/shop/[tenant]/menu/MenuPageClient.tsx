'use client'

import { useState, useEffect, useRef, memo, useMemo, useCallback, startTransition } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { isKioskSearchParams, kioskShopHref } from '@/lib/kiosk-mode'
import { getMenuCategories, getMenuProducts, getAllMenuProductOptionsForTenant, getTenantSettings, getActivePromotions, getExceptionalClosings, ExceptionalClosing, MenuCategory, MenuProduct, ProductOption, ProductOptionChoice, Promotion } from '@/lib/admin-api'
import { useLanguage } from '@/i18n'

const VoiceOrderButton = dynamic(() => import('@/components/VoiceOrderButton'), { ssr: false })

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
  notes?: string  // For voice order modifications like "zonder tomaat"
}

/** Vandaag YYYY-MM-DD in Europe/Brussels (zelfde kalenderdag als zaak) */
function todayYMDBrussels(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' })
}

function closingPeriodEnd(c: ExceptionalClosing): string {
  if (c.date_end && c.date_end >= c.date) return c.date_end
  return c.date
}

/** Toon in banner: vanaf nu instelbaar tot de laatste sluitingsdag voorbij is */
function filterActiveClosingAnnouncements(closings: ExceptionalClosing[], todayStr: string): ExceptionalClosing[] {
  return (closings || [])
    .filter(c => closingPeriodEnd(c) >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
}

function formatClosingDateNL(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  return new Date(y, m - 1, d).toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const ALLERGEN_ICONS: Record<string, { icon: string; color: string; label: string }> = {
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

type MenuProductCardTheme = {
  card: string
  imageBg: string
  text: string
  textLight: string
}

/** Buiten de pagina-component zodat scroll/activeCategory geen remount van alle kaarten veroorzaakt. */
const MenuProductCard = memo(function MenuProductCard({
  item,
  imageDisplayModeDefault,
  primaryColor,
  theme,
  hasLinkedOptions,
  onSelect,
  t,
  lite,
}: {
  item: MenuItem
  imageDisplayModeDefault: 'cover' | 'contain'
  primaryColor: string
  theme: MenuProductCardTheme
  hasLinkedOptions: boolean
  onSelect: (item: MenuItem) => void
  t: (key: string) => string
  /** Kiosk: minder schaduw/compositing en lagere image-kwaliteit voor zwakke tablets */
  lite?: boolean
}) {
  const itemDisplayMode = item.image_display_mode || imageDisplayModeDefault
  const useContain = itemDisplayMode === 'contain'

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(item)
        }
      }}
      onClick={() => onSelect(item)}
      className={`${theme.card} rounded-2xl overflow-hidden cursor-pointer touch-manipulation group ${
        lite
          ? 'shadow-sm active:opacity-95'
          : 'shadow-[0_4px_20px_rgba(0,0,0,0.18)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.22)] active:scale-[0.98] transition-all'
      }`}
    >
      <div
        className={`relative overflow-hidden ${useContain ? theme.card : theme.imageBg} ${
          lite ? 'h-52 sm:h-60 lg:h-52' : 'h-48 sm:h-56 lg:h-48'
        }`}
      >
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            sizes={lite ? '(max-width: 640px) 80vw, 360px' : '(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 420px'}
            quality={lite ? 38 : 50}
            loading="lazy"
            className={useContain ? 'object-contain p-2' : 'object-cover'}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🍟</div>
        )}

        {!useContain && !lite && (
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
        )}

        <div className="absolute top-3 left-3 flex gap-2">
          {item.is_popular && (
            <span style={{ backgroundColor: primaryColor }} className="text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
              🔥 POPULAIR
            </span>
          )}
          {item.is_promo && item.promo_price != null && (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">PROMO</span>
          )}
        </div>

        <div className="absolute top-3 right-3">
          {item.is_promo && item.promo_price != null ? (
            <div className="flex flex-col items-end gap-1">
              <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
                €{item.promo_price.toFixed(2)}
              </span>
              <span className="bg-black/50 text-white/70 text-xs font-medium px-2 py-0.5 rounded-full line-through">
                €{item.price.toFixed(2)}
              </span>
            </div>
          ) : (
            <span
              className="text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              €{item.price.toFixed(2)}
            </span>
          )}
        </div>

        {!item.is_available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-500 text-white font-bold px-4 py-2 rounded-full">{t('menuPage.soldOut')}</span>
          </div>
        )}
      </div>

      <div className={lite ? 'p-4 pb-3' : 'p-3 sm:p-4'}>
        <h3 className={`font-bold ${lite ? 'text-lg' : 'text-base sm:text-lg'} ${theme.text} mb-1 leading-snug`}>{item.name}</h3>
        {item.description && (
          <p className={`${theme.textLight} text-xs sm:text-sm mb-3 line-clamp-2 leading-relaxed`}>{item.description}</p>
        )}
        {item.allergens.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {item.allergens.map(allergen => (
              <span
                key={allergen}
                className={`text-xs px-2 py-0.5 rounded-full ${ALLERGEN_ICONS[allergen.toLowerCase()]?.color || 'bg-gray-100 text-gray-600'}`}
              >
                {ALLERGEN_ICONS[allergen.toLowerCase()]?.icon || '⚠️'}
              </span>
            ))}
          </div>
        )}
        <div
          className={`mt-2 w-full rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-opacity group-hover:opacity-90 ${
            lite ? 'min-h-[52px] py-3.5 text-base' : 'py-2 text-sm'
          }`}
          style={{ backgroundColor: item.is_available ? primaryColor : '#9ca3af' }}
        >
          {!item.is_available ? (
            <span>{t('menuPage.soldOut')}</span>
          ) : hasLinkedOptions ? (
            <>
              <span>⚙️</span>
              <span>{t('menuPage.chooseOptions')}</span>
            </>
          ) : (
            <>
              <span>🛒</span>
              <span>{t('menuPage.clickToOrder')}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
})

export default function MenuPageClient({
  params,
  initialKiosk,
  shortKioskUrls,
}: {
  params: { tenant: string }
  initialKiosk: boolean
  shortKioskUrls: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isKiosk = initialKiosk || isKioskSearchParams(searchParams)
  /** Tafelkiosk: minder netwerk, DOM en GPU-belasting */
  const lite = isKiosk
  const shop = (key: Parameters<typeof kioskShopHref>[1]) =>
    kioskShopHref(params.tenant, key, { kiosk: isKiosk, shortUrls: shortKioskUrls })
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
  const [modalQuantity, setModalQuantity] = useState(1)
  const [optionsByProductId, setOptionsByProductId] = useState<Record<string, ProductOption[]>>({})
  const [primaryColor, setPrimaryColor] = useState('#FF6B35')
  const [businessName, setBusinessName] = useState('')
  const [imageDisplayMode, setImageDisplayMode] = useState<'cover' | 'contain'>('cover') // altijd cover als standaard
  const [upcomingClosings, setUpcomingClosings] = useState<ExceptionalClosing[]>([])
  const [darkMode, setDarkMode] = useState(false)
  const [productsWithOptions, setProductsWithOptions] = useState<string[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [promotionsEnabled, setPromotionsEnabled] = useState(true)
  const [manualOffline, setManualOffline] = useState<{ is_offline: boolean; offline_reason: string | null; offline_message?: string | null } | null>(null)
  const menuContentRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const isScrollingToSection = useRef(false)
  const activeCategoryRef = useRef(activeCategory)
  activeCategoryRef.current = activeCategory

  // Fetch manual offline status (kiosk: iets uitstellen zodat menu-data eerst de main thread krijgt)
  useEffect(() => {
    let cancelled = false
    const tenant = params.tenant
    const load = () => {
      fetch(`/api/shop-offline?tenant=${tenant}`)
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setManualOffline(d)
        })
        .catch(() => {})
    }
    if (lite) {
      if (typeof requestIdleCallback !== 'undefined') {
        const id = requestIdleCallback(() => {
          if (!cancelled) load()
        }, { timeout: 3500 })
        return () => {
          cancelled = true
          cancelIdleCallback(id)
        }
      }
      const t = window.setTimeout(() => {
        if (!cancelled) load()
      }, 400)
      return () => {
        cancelled = true
        window.clearTimeout(t)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [params.tenant, lite])

  // Save WhatsApp phone and set language if user came from WhatsApp link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const waPhone = urlParams.get('wa')
      const lang = urlParams.get('lang')
      
      if (waPhone) {
        localStorage.setItem(`whatsapp_phone_${params.tenant}`, waPhone)
        
        // ALWAYS start fresh at top when coming from WhatsApp
        window.scrollTo(0, 0)
        
        // Close cart if open
        setCartOpen(false)
        
        // Clear URL params to prevent issues on refresh (keep clean URL)
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, '', cleanUrl)
      }
      
      // Set language from URL parameter (from WhatsApp)
      const validLocales = ['nl', 'en', 'fr', 'de', 'es', 'it', 'ja', 'zh', 'ar']
      if (lang && validLocales.includes(lang)) {
        setLocale(lang as 'nl' | 'en' | 'fr' | 'de' | 'es' | 'it' | 'ja' | 'zh' | 'ar')
      }
    }
  }, [params.tenant, setLocale])

  // Scroll spy - update active category (lage prioriteit zodat tikken voorrang hebben)
  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingToSection.current) return

      const headerHeight = 130
      let currentSection = ''

      sectionRefs.current.forEach((el, categoryId) => {
        const rect = el.getBoundingClientRect()
        if (rect.top <= headerHeight + 50 && rect.bottom > headerHeight) {
          currentSection = categoryId
        }
      })

      if (currentSection && currentSection !== activeCategoryRef.current) {
        startTransition(() => setActiveCategory(currentSection))
      }
    }

    let ticking = false
    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', scrollListener, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', scrollListener)
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
        notes: c.notes,  // Include voice order modifications
      }))
      localStorage.setItem(`cart_${params.tenant}`, JSON.stringify(cartForStorage))
    }
  }, [cart, params.tenant])

  useEffect(() => {
    async function loadData() {
      const [categoriesData, productsData, tenantData, optionsMap, promotionsData, closingsData] = await Promise.all([
        getMenuCategories(params.tenant),
        getMenuProducts(params.tenant),
        getTenantSettings(params.tenant),
        getAllMenuProductOptionsForTenant(params.tenant),
        lite ? Promise.resolve([] as Promotion[]) : getActivePromotions(params.tenant),
        getExceptionalClosings(params.tenant),
      ])

      const todayStr = todayYMDBrussels()
      setUpcomingClosings(filterActiveClosingAnnouncements(closingsData || [], todayStr))
      
      setOptionsByProductId(optionsMap)
      setProductsWithOptions(Object.keys(optionsMap).filter(id => (optionsMap[id]?.length ?? 0) > 0))
      setPromotions(promotionsData)
      setPromotionsEnabled(tenantData?.promotions_enabled !== false)
      
      // Check of tenant bestaat - redirect naar niet gevonden als tenantData null is
      if (!tenantData) {
        window.location.href = shop('home')
        return
      }
      
      // Set primary color, image display mode and dark mode from tenant settings
      if (tenantData?.primary_color) {
        setPrimaryColor(tenantData.primary_color)
      }
      if (tenantData?.business_name) {
        setBusinessName(tenantData.business_name)
      }
      if (tenantData?.image_display_mode) {
        setImageDisplayMode(tenantData.image_display_mode)
      }
      if (tenantData?.dark_mode) {
        setDarkMode(tenantData.dark_mode)
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
            image_url:
              p.image_url ||
              (lite
                ? 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=280&q=70'
                : 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400'),
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
      
      // Stel de default categorie in (kiosk slaat promoties-fetch over → altijd snel naar eerste sectie)
      const promoEnabled = !lite && tenantData?.promotions_enabled !== false
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
  }, [params.tenant, isKiosk, shortKioskUrls])

  const selectProduct = useCallback((item: MenuItem) => {
    setSelectedItem(item)
    setModalQuantity(1)
    const options = optionsByProductId[item.id] ?? []
    setProductOptions(options)
    const initialChoices: Record<string, string> = {}
    options.forEach(opt => {
      if (opt.required && opt.type === 'single' && opt.choices && opt.choices.length > 0) {
        initialChoices[opt.id!] = opt.choices[0].id!
      }
    })
    setSelectedChoices(initialChoices)
  }, [optionsByProductId])

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
            ? { ...c, quantity: c.quantity + modalQuantity }
            : c
        )
      }
      return [...prev, { 
        item: selectedItem, 
        quantity: modalQuantity, 
        selectedOptions: selectedOpts,
        totalPrice 
      }]
    })
    
    setSelectedItem(null)
    setProductOptions([])
    setSelectedChoices({})
    setModalQuantity(1)
  }

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  const cartTotal = cart.reduce((sum, c) => sum + (c.totalPrice * c.quantity), 0)
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0)

  const productsWithOptionsSet = useMemo(() => new Set(productsWithOptions), [productsWithOptions])

  // Theme classes voor dark mode
  const theme = useMemo(() => ({
    bg: darkMode ? 'bg-[#0d0d0d]' : 'bg-[#e3e3e3]',
    header: darkMode ? 'bg-[#1a1a1a]' : 'bg-white',
    card: darkMode ? 'bg-[#2a2a2a]' : 'bg-white',
    cardHover: darkMode ? 'hover:bg-[#333]' : 'hover:shadow-lg',
    border: darkMode ? 'border-[#444]' : 'border-gray-100',
    text: darkMode ? 'text-white' : 'text-gray-900',
    textMuted: darkMode ? 'text-gray-300' : 'text-gray-600',
    textLight: darkMode ? 'text-gray-400' : 'text-gray-500',
    pill: darkMode ? 'bg-[#3a3a3a] text-gray-200' : 'bg-gray-100 text-gray-700',
    pillHover: darkMode ? 'active:bg-[#444]' : 'active:bg-gray-200',
    imageBg: darkMode ? 'bg-[#222]' : 'bg-gray-100',
  }), [darkMode])

  const cardTheme = useMemo((): MenuProductCardTheme => ({
    card: theme.card,
    imageBg: theme.imageBg,
    text: theme.text,
    textLight: theme.textLight,
  }), [theme.card, theme.imageBg, theme.text, theme.textLight])

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center`}>
        <div
          className="w-12 h-12 border-4 rounded-full animate-spin"
          style={{ borderColor: `${primaryColor}40`, borderTopColor: primaryColor }}
          aria-hidden
        />
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${theme.bg}${lite ? ' kiosk-touch-ui' : ''}`}>
      {/* Manual Offline Overlay */}
      {manualOffline?.is_offline && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
            <div className="text-7xl mb-6">
              {manualOffline.offline_reason === 'volzet' ? '🔴' :
               manualOffline.offline_reason === 'panne' ? '🔧' :
               manualOffline.offline_reason === 'vakantie' ? '🌴' : '⚠️'}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {manualOffline.offline_reason === 'volzet' ? t('shopOffline.bannerVolzet') :
               manualOffline.offline_reason === 'panne' ? t('shopOffline.bannerPanne') :
               manualOffline.offline_reason === 'vakantie' ? t('shopOffline.bannerVakantie') :
               manualOffline.offline_reason === 'eigen' ? (manualOffline.offline_message || t('shopOffline.bannerEigen')) :
               t('shopOffline.bannerSluiting')}
            </h2>
            <p className="text-gray-500 mb-8">{t('shopOffline.bannerSubtitle')}</p>
            <a
              href={isKiosk ? shop('menu') : shop('home')}
              className="inline-block px-8 py-3 bg-gray-900 text-white rounded-full font-semibold hover:bg-gray-700 transition-all"
            >
              ← Terug
            </a>
          </div>
        </div>
      )}

      {/* Sticky Header + Categories - SAMEN in 1 container voor iOS Safari */}
      <header 
        className={`sticky top-0 z-50 ${theme.header} ${lite ? 'shadow-sm' : 'shadow-[0_4px_20px_rgba(0,0,0,0.18)]'}`}
        style={{
          position: '-webkit-sticky',
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
        } as React.CSSProperties}
      >
        {/* Navigation Bar */}
        <div className={`border-b ${theme.border}`}>
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            {isKiosk ? (
              <div className="w-10 sm:min-w-[5.5rem] shrink-0" aria-hidden />
            ) : (
              <Link href={shop('home')} className={`flex items-center gap-1.5 ${theme.textMuted} hover:opacity-70 transition-colors shrink-0`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium hidden sm:inline">{t('menuPage.back')}</span>
              </Link>
            )}
            <div className="flex flex-col items-center">
              <h1 className={`font-bold text-lg leading-tight ${theme.text}`}>
                {businessName || t('menuPage.menu')}
              </h1>
              <span className={`text-xs ${theme.textLight}`}>{t('menuPage.menu')}</span>
            </div>
            {lite ? (
              <div className="w-10 sm:min-w-[5.5rem] shrink-0" aria-hidden />
            ) : (
              <Link
                href={shop('account')}
                className={`flex items-center gap-1.5 ${theme.textMuted} hover:opacity-70 transition-colors shrink-0`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                </svg>
                <span className="text-sm font-medium hidden sm:inline">{t('menuPage.account')}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Sluitings- / vakantieaankondiging — direct zichtbaar in header tot de periode voorbij is */}
        {upcomingClosings.length > 0 && (
          <div className={`border-b ${theme.border}`}>
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 space-y-1.5">
              {upcomingClosings.map((closing) => {
                const isPeriod = !!(closing.date_end && closing.date_end !== closing.date)
                const fromLabel = formatClosingDateNL(closing.date)
                const toLabel = closing.date_end ? formatClosingDateNL(closing.date_end) : fromLabel
                const line = isPeriod
                  ? `Gesloten van ${fromLabel} tot en met ${toLabel}`
                  : `Gesloten op ${fromLabel}`
                return (
                  <div
                    key={`${closing.date}-${closing.date_end || 'single'}`}
                    className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium"
                    style={{ backgroundColor: primaryColor + '28', borderLeft: `4px solid ${primaryColor}` }}
                  >
                    <span className="text-base shrink-0 leading-none">📢</span>
                    <span className={`${theme.text} leading-snug`}>
                      <strong>{line}</strong>
                      {closing.reason ? ` — ${closing.reason}` : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Categories Bar */}
        <div className="max-w-4xl mx-auto px-4">
          <div className={`flex ${lite ? 'gap-3' : 'gap-2'} py-3 overflow-x-auto scrollbar-hide`} style={{ WebkitOverflowScrolling: 'touch' }}>
            {promotionsEnabled && promotions.length > 0 && (
              <button
                onClick={() => handleCategoryChange('promo')}
                className={`rounded-full font-medium whitespace-nowrap touch-manipulation ${lite ? 'min-h-[52px] px-6 py-3 text-base active:opacity-90' : 'px-5 py-2.5 transition-colors active:scale-95 shadow-[0_4px_14px_rgba(0,0,0,0.35)]'} ${
                  activeCategory === 'promo'
                    ? 'bg-green-500 text-white'
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
                className={`rounded-full font-medium whitespace-nowrap touch-manipulation ${lite ? 'min-h-[52px] px-6 py-3 text-base active:opacity-90' : 'px-5 py-2.5 transition-colors active:scale-95 shadow-[0_4px_14px_rgba(0,0,0,0.35)]'} ${
                  activeCategory === 'popular'
                    ? 'text-white'
                    : `${theme.pill} ${theme.pillHover}`
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
                className={`rounded-full font-medium whitespace-nowrap touch-manipulation ${lite ? 'min-h-[52px] px-6 py-3 text-base active:opacity-90' : 'px-5 py-2.5 transition-colors active:scale-95 shadow-[0_4px_14px_rgba(0,0,0,0.35)]'} ${
                  activeCategory === cat.id
                    ? 'text-white'
                    : `${theme.pill} ${theme.pillHover}`
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
            <div className="flex items-center gap-0 mb-5 rounded-xl overflow-hidden shadow-sm">
              <span className="w-3 self-stretch flex-shrink-0" style={{ backgroundColor: primaryColor }}></span>
              <div className="relative flex-1 px-4 py-3 flex items-center gap-2 overflow-hidden" style={{ backgroundColor: primaryColor + '35' }}>
                <h2 className={`text-xl font-bold ${theme.text} flex items-center gap-2`}>
                  <span className="text-2xl">🎁</span> {t('menuPage.promotions')}
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
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
                    className={`${theme.card} rounded-xl sm:rounded-2xl overflow-hidden shadow-sm ${lite ? '' : `${theme.cardHover} transition-all`} ${linkedProduct ? 'cursor-pointer touch-manipulation' : ''} ${!lite && linkedProduct ? 'active:scale-[0.98]' : ''}`}
                  >
                    <div className={`relative h-48 sm:h-52 lg:h-44 xl:h-40 overflow-hidden ${theme.imageBg}`}>
                      {promo.image_url ? (
                        <Image src={promo.image_url} alt={promo.name} fill sizes="(max-width: 640px) 100vw, 480px" quality={lite ? 40 : 60} loading="lazy" className="object-cover" />
                      ) : linkedProduct?.image_url ? (
                        <Image src={linkedProduct.image_url} alt={promo.name} fill sizes="(max-width: 640px) 100vw, 480px" quality={lite ? 40 : 60} loading="lazy" className="object-cover" />
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
                      <h3 className={`font-bold text-base sm:text-lg ${theme.text} mb-1`}>{promo.name}</h3>
                      {promo.description && <p className={`${theme.textLight} text-xs sm:text-sm line-clamp-2`}>{promo.description}</p>}
                      {linkedProduct && promo.type === 'fixedPrice' && (
                        <button
                          type="button"
                          style={{ backgroundColor: primaryColor }}
                          className={`w-full mt-3 text-white font-medium rounded-lg touch-manipulation ${lite ? 'min-h-[52px] py-3.5 text-base' : 'py-2 text-sm'}`}
                        >
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
            <div className="flex items-center gap-0 mb-5 rounded-xl overflow-hidden shadow-sm">
              <span className="w-3 self-stretch flex-shrink-0" style={{ backgroundColor: primaryColor }}></span>
              <div className="relative flex-1 px-4 py-3 flex items-center gap-2 overflow-hidden" style={{ backgroundColor: primaryColor + '35' }}>
                <h2 className={`text-xl font-bold ${theme.text} flex items-center gap-2`}>
                  <span className="text-2xl">🔥</span> {t('menuPage.popular')}
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {menuItems.filter(i => i.is_popular).map((item) => (
                <MenuProductCard
                  key={`popular-${item.id}`}
                  item={item}
                  imageDisplayModeDefault={imageDisplayMode}
                  primaryColor={primaryColor}
                  theme={cardTheme}
                  hasLinkedOptions={productsWithOptionsSet.has(item.id)}
                  onSelect={selectProduct}
                  t={t}
                  lite={lite}
                />
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
              <div className="flex items-center gap-0 mb-5 rounded-xl overflow-hidden shadow-sm">
                <span className="w-3 self-stretch flex-shrink-0" style={{ backgroundColor: primaryColor }}></span>
                <div className="relative flex-1 px-4 py-3 overflow-hidden" style={{ backgroundColor: primaryColor + '35' }}>
                  <h2 className={`text-xl font-bold ${theme.text}`}>{category.name}</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {categoryItems.map((item) => (
                  <MenuProductCard
                    key={item.id}
                    item={item}
                    imageDisplayModeDefault={imageDisplayMode}
                    primaryColor={primaryColor}
                    theme={cardTheme}
                    hasLinkedOptions={productsWithOptionsSet.has(item.id)}
                    onSelect={selectProduct}
                    t={t}
                    lite={lite}
                  />
                ))}
              </div>
            </section>
          )
        })}

        {/* Geen producten message */}
        {menuItems.length === 0 && promotions.length === 0 && (
          <div className="text-center py-20">
            <span className="text-6xl mb-4 block">🍟</span>
            <h2 className={`text-2xl font-bold ${theme.text} mb-2`}>{t('menuPage.noProducts')}</h2>
            <p className={theme.textLight}>{t('menuPage.noProductsDesc')}</p>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedItem && (
          <div
            role="presentation"
            onClick={() => { setSelectedItem(null); setModalQuantity(1) }}
            className={`fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4 ${lite ? '' : 'backdrop-blur-sm'}`}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className={`${theme.card} rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto`}
            >
              {(() => {
                const selectedDisplayMode = selectedItem.image_display_mode || imageDisplayMode
                const useContain = selectedDisplayMode === 'contain'
                return (
              <div className={`relative h-64 overflow-hidden rounded-t-3xl md:rounded-t-3xl ${useContain ? theme.card : theme.imageBg}`}>
                {selectedItem.image_url ? (
                  <Image
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    fill
                    sizes={lite ? '(max-width: 768px) 100vw, 400px' : '(max-width: 768px) 100vw, min(90vw, 480px)'}
                    quality={lite ? 38 : 55}
                    className={useContain ? 'object-contain p-4' : 'object-cover'}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl">
                    🍟
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setSelectedItem(null); setModalQuantity(1) }}
                  className={`absolute top-4 right-4 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg touch-manipulation ${lite ? 'w-14 h-14 min-w-[56px] min-h-[56px]' : 'w-10 h-10'}`}
                  aria-label={t('menuPage.close')}
                >
                  <span className={lite ? 'text-3xl' : 'text-2xl'}>×</span>
                </button>
                <div className="absolute bottom-4 left-4 flex gap-2">
                  {selectedItem.is_popular && (
                    <span style={{ backgroundColor: primaryColor }} className="text-white text-sm font-bold px-3 py-1 rounded-full">🔥 POPULAIR</span>
                  )}
                </div>
              </div>
                )
              })()}

              <div className={lite ? 'p-6 pt-5' : 'p-6'}>
                <div className="flex justify-between items-start mb-4">
                  <h2 className={`${lite ? 'text-xl sm:text-2xl' : 'text-2xl'} font-bold ${theme.text}`}>{selectedItem.name}</h2>
                  <span style={darkMode ? {} : { color: primaryColor }} className={`text-2xl font-bold ${darkMode ? 'text-white' : ''}`}>€{selectedItem.price.toFixed(2)}</span>
                </div>
                <p className={`${theme.textMuted} mb-6`}>{selectedItem.description}</p>

                {selectedItem.allergens.length > 0 && (
                  <div className="mb-6">
                    <h3 className={`font-semibold ${theme.text} mb-2`}>{t('menuPage.allergens')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.allergens.map(allergen => (
                        <span 
                          key={allergen}
                          className={`text-sm px-3 py-1.5 rounded-full ${ALLERGEN_ICONS[allergen.toLowerCase()]?.color || 'bg-gray-100 text-gray-600'}`}
                        >
                          {ALLERGEN_ICONS[allergen.toLowerCase()]?.icon || '⚠️'} {ALLERGEN_ICONS[allergen.toLowerCase()]?.label || allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product Options */}
                {productOptions.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {productOptions.map(option => (
                      <div key={option.id} className={`border ${theme.border} rounded-xl p-4`}>
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className={`font-semibold ${theme.text}`}>{option.name}</h3>
                          {option.required && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{t('menuPage.required')}</span>
                          )}
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
                                className={`flex items-center justify-between rounded-lg cursor-pointer touch-manipulation transition-colors ${
                                  lite ? 'min-h-[52px] px-3 py-3.5' : 'p-3'
                                } ${
                                  isSelected
                                    ? 'border-2'
                                    : `${darkMode ? 'bg-[#3a3a3a] hover:bg-[#444]' : 'bg-gray-50 hover:bg-gray-100'} border-2 border-transparent`
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type={option.type === 'single' ? 'radio' : 'checkbox'}
                                    name={option.id}
                                    checked={isSelected}
                                    onChange={() => handleChoiceSelect(option.id!, choice.id!, option.type)}
                                    style={{ accentColor: primaryColor }}
                                    className={lite ? 'w-6 h-6 shrink-0' : 'w-5 h-5'}
                                  />
                                  <span className={`font-medium ${theme.text}`}>{choice.name}</span>
                                </div>
                                <span style={choice.price > 0 && !darkMode ? { color: primaryColor } : {}} className={`font-medium ${choice.price <= 0 ? 'text-gray-400' : darkMode ? 'text-white' : ''}`}>
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

                {/* Hoeveelheid kiezer */}
                <div className={`flex items-center justify-between mb-4 rounded-2xl ${darkMode ? 'bg-[#2a2a2a]' : 'bg-gray-50'} ${lite ? 'p-5 min-h-[60px]' : 'p-4'}`}>
                  <span className={`font-semibold ${theme.text}`}>Aantal</span>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                      className={`rounded-full border-2 flex items-center justify-center font-bold transition-colors touch-manipulation ${lite ? 'w-14 h-14 min-w-[56px] min-h-[56px] text-2xl' : 'w-10 h-10 text-xl'}`}
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >−</button>
                    <span className={`font-bold text-center ${theme.text} ${lite ? 'text-3xl w-12' : 'text-2xl w-8'}`}>{modalQuantity}</span>
                    <button
                      type="button"
                      onClick={() => setModalQuantity(q => q + 1)}
                      className={`rounded-full flex items-center justify-center font-bold text-white transition-colors touch-manipulation ${lite ? 'w-14 h-14 min-w-[56px] min-h-[56px] text-2xl' : 'w-10 h-10 text-xl'}`}
                      style={{ backgroundColor: primaryColor }}
                    >+</button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addToCart}
                  disabled={!selectedItem.is_available || !canAddToCart()}
                  style={{ backgroundColor: selectedItem.is_available && canAddToCart() ? primaryColor : undefined }}
                  className={`w-full disabled:bg-gray-300 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 hover:opacity-90 touch-manipulation ${lite ? 'py-5 text-lg min-h-[58px]' : 'py-4'}`}
                >
                  <span>🛒</span>
                  <span>{modalQuantity > 1 ? `${modalQuantity}x ` : ''}{t('menuPage.addToOrder')}</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">€{(calculateTotalPrice() * modalQuantity).toFixed(2)}</span>
                </button>
              </div>
            </div>
          </div>
      )}

      {/* Voice Order — zwaar op zwakke tablets; uit op kiosk */}
      {!lite && (
      <VoiceOrderButton
        products={menuItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category_name: item.category_name,
        }))}
        language={locale}
        primaryColor={primaryColor}
        darkMode={darkMode}
        onOrderConfirmed={(items) => {
          // Add matched products to cart
          items.forEach(matchedItem => {
            const menuItem = menuItems.find(m => m.id === matchedItem.product_id)
            if (menuItem) {
              // Combine modifications and extras into notes
              const noteParts: string[] = []
              if (matchedItem.modifications && matchedItem.modifications.length > 0) {
                noteParts.push(...matchedItem.modifications)
              }
              if (matchedItem.extras && matchedItem.extras.length > 0) {
                noteParts.push(`+ ${matchedItem.extras.join(', ')}`)
              }
              
              const cartItem: CartItem = {
                item: menuItem,
                quantity: matchedItem.quantity,
                selectedOptions: [],
                totalPrice: matchedItem.price * matchedItem.quantity,
                notes: noteParts.length > 0 ? noteParts.join(', ') : undefined,
              }
              setCart(prev => [...prev, cartItem])
            }
          })
        }}
        onGoToCheckout={() => {
          router.push(shop('checkout'))
        }}
        translations={{
          listening: 'Luisteren...',
          processing: 'Verwerken...',
          speakNow: 'Spreek je bestelling in',
          confirm: 'Bevestigen',
          cancel: 'Annuleren',
          retry: 'Opnieuw',
          total: 'Totaal',
          noProductsFound: 'Geen producten gevonden. Probeer opnieuw.',
          orderSummary: 'Je bestelling:',
          pressToSpeak: 'Druk op de knop om te spreken',
          releaseToStop: 'Druk nogmaals om te stoppen',
        }}
      />
      )}

      {/* Cart Button */}
      {cartCount > 0 && (
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            style={
              lite
                ? { backgroundColor: primaryColor }
                : { backgroundColor: primaryColor, boxShadow: `0 25px 50px -12px ${primaryColor}66` }
            }
            className={`fixed left-1/2 -translate-x-1/2 text-white font-bold rounded-2xl flex items-center z-40 hover:opacity-90 max-w-[calc(100%-2rem)] touch-manipulation ${lite ? 'bottom-5 py-5 px-8 gap-4 text-base min-h-[60px] w-[calc(100%-1.5rem)] max-w-lg justify-center shadow-md' : 'bottom-4 sm:bottom-6 py-3 sm:py-4 px-4 sm:px-8 gap-2 sm:gap-4 text-sm sm:text-base shadow-2xl'}`}
          >
            <span
              style={{ color: primaryColor }}
              className={`bg-white rounded-full flex items-center justify-center font-bold shrink-0 ${lite ? 'w-10 h-10 text-lg' : 'w-7 h-7 sm:w-8 sm:h-8 text-sm sm:text-base'}`}
            >
              {cartCount}
            </span>
            <span className={lite ? 'inline' : 'hidden sm:inline'}>{t('menuPage.viewOrder')}</span>
            <span className={lite ? 'hidden' : 'sm:hidden'}>{t('menuPage.order')}</span>
            <span className="border-l border-white/30 pl-2 sm:pl-4 shrink-0">€{cartTotal.toFixed(2)}</span>
          </button>
      )}

      {/* Cart Slide Panel */}
      {cartOpen && (
          <div
            role="presentation"
            onClick={() => setCartOpen(false)}
            className={`fixed inset-0 bg-black/60 z-50 ${lite ? '' : 'backdrop-blur-sm'}`}
          >
            <aside
              onClick={(e) => e.stopPropagation()}
              className={`absolute right-0 top-0 h-full w-full max-w-md ${theme.card} ${lite ? 'shadow-lg' : 'shadow-2xl'} translate-x-0 transition-transform duration-200 ease-out motion-reduce:transition-none`}
            >
              <div className={`p-4 sm:p-6 border-b ${theme.border}`}>
                <div className="flex items-center justify-between">
                  <h2 className={`text-xl sm:text-2xl font-bold ${theme.text}`}>{t('menuPage.yourOrder')}</h2>
                  <button
                    type="button"
                    onClick={() => setCartOpen(false)}
                    aria-label={t('menuPage.close')}
                    className={`${darkMode ? 'bg-[#3a3a3a] hover:bg-[#444]' : 'bg-gray-100 hover:bg-gray-200'} rounded-full flex items-center justify-center touch-manipulation ${theme.text} ${lite ? 'w-14 h-14 min-w-[56px] min-h-[56px]' : 'w-10 h-10'}`}
                  >
                    <span className={lite ? 'text-3xl' : 'text-2xl'}>×</span>
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 flex-1 overflow-y-auto max-h-[55vh] sm:max-h-[60vh]">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">🛒</span>
                    <p className={theme.textLight}>{t('menuPage.emptyCart')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((cartItem, index) => (
                      <div key={index} className={`flex gap-4 ${darkMode ? 'bg-[#3a3a3a]' : 'bg-gray-50'} rounded-xl p-4`}>
                        {cartItem.item.image_url ? (
                          <div className={`relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg ${theme.card}`}>
                            <Image 
                              src={cartItem.item.image_url} 
                              alt={cartItem.item.name} 
                              fill
                              sizes="80px"
                              quality={50}
                              className="object-contain p-1" 
                            />
                          </div>
                        ) : (
                          <div className={`w-20 h-20 ${darkMode ? 'bg-[#444]' : 'bg-gray-200'} rounded-lg flex items-center justify-center text-3xl`}>🍟</div>
                        )}
                        <div className="flex-1">
                          <h3 className={`font-semibold ${theme.text}`}>{cartItem.item.name}</h3>
                          {cartItem.selectedOptions.length > 0 && (
                            <div className={`text-sm ${theme.textLight} mt-1`}>
                              {cartItem.selectedOptions.map(opt => opt.choice.name).join(', ')}
                            </div>
                          )}
                          {cartItem.notes && (
                            <div className="text-sm text-orange-500 font-medium mt-1">
                              ⚠️ {cartItem.notes}
                            </div>
                          )}
                          <p style={darkMode ? {} : { color: primaryColor }} className={`font-bold ${darkMode ? 'text-white' : ''}`}>€{(cartItem.totalPrice * cartItem.quantity).toFixed(2)}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={theme.textLight}>{t('menuPage.quantity')}: {cartItem.quantity}</span>
                            <button
                              type="button"
                              onClick={() => removeFromCart(index)}
                              className={`text-red-500 hover:underline touch-manipulation ${lite ? 'text-base min-h-[48px] px-2 py-2 -ml-2' : 'text-sm'}`}
                            >
                              {t('menuPage.remove')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 ${theme.card} border-t ${theme.border} pb-safe`}>
                  <div className="flex justify-between items-center mb-4">
                    <span className={theme.textMuted}>{t('menuPage.subtotal')}</span>
                    <span className={`text-xl font-bold ${theme.text}`}>€{cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCartOpen(false)
                      router.push(shop('checkout'))
                    }}
                    style={{ backgroundColor: primaryColor }}
                    className={`w-full text-white font-bold rounded-2xl transition-colors hover:opacity-90 touch-manipulation ${lite ? 'py-5 text-lg min-h-[58px]' : 'py-4'}`}
                  >
                    {t('menuPage.checkout')} →
                  </button>
                </div>
              )}
            </aside>
          </div>
      )}
    </div>
  )
}
