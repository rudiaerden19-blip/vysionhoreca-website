'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MenuProduct, MenuCategory, ProductOption, ProductOptionChoice, getMenuCategories, getMenuProducts, getProductsWithOptions, getOptionsForProduct } from '@/lib/admin-api'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'
import { getSoundsEnabled, setSoundsEnabled } from '@/lib/sounds'

interface SelectedChoice {
  optionId: string
  optionName: string
  choiceId: string
  choiceName: string
  price: number
}

interface CartItem {
  product: MenuProduct
  quantity: number
  choices?: SelectedChoice[]
  cartKey: string
}

type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'

export default function KassaAdminPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const router = useRouter()
  const baseUrl = `/shop/${tenant}/admin`
  const { locale, setLocale, locales, localeNames, localeFlags } = useLanguage()

  const [navOpen, setNavOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN')
  const [tableNumber, setTableNumber] = useState('')
  const [numpadValue, setNumpadValue] = useState('')
  const [soundsOn, setSoundsOn] = useState(true)
  const [isOnline, setIsOnline] = useState<boolean | null>(null)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  // Menu
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [products, setProducts] = useState<MenuProduct[]>([])
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null)
  const [menuLoading, setMenuLoading] = useState(true)
  const [productsWithOptions, setProductsWithOptions] = useState<string[]>([])

  // Opties modal
  const [optionsModal, setOptionsModal] = useState<{
    product: MenuProduct
    options: ProductOption[]
    selected: SelectedChoice[]
  } | null>(null)

  // Blokkeer body scroll (iPad Safari fix)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
      document.documentElement.style.overflow = ''
    }
  }, [])

  // Laad categorieën, producten en welke producten opties hebben
  const loadMenu = async () => {
    setMenuLoading(true)
    const [cats, prods, withOpts] = await Promise.all([
      getMenuCategories(tenant),
      getMenuProducts(tenant),
      getProductsWithOptions(tenant),
    ])
    setCategories(cats.filter(c => c.is_active))
    setProducts(prods.filter(p => p.is_active))
    setProductsWithOptions(withOpts)
    setMenuLoading(false)
  }

  useEffect(() => {
    loadMenu()
  }, [tenant])

  // Herlaad menu wanneer pagina weer focus krijgt (na terugkeren van producten/categorieen pagina)
  useEffect(() => {
    const onFocus = () => loadMenu()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [tenant])

  // Sound init
  useEffect(() => {
    setSoundsOn(getSoundsEnabled())
  }, [])

  // Online status check
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`/api/shop/${tenant}/status`, { method: 'HEAD', cache: 'no-store' })
        setIsOnline(res.ok)
      } catch {
        setIsOnline(false)
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [tenant])

  // Close language dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggleSound = () => {
    const next = !soundsOn
    setSoundsOn(next)
    setSoundsEnabled(next)
  }

  // ── Cart ─────────────────────────────────────────────────────────────────
  const addToCart = (product: MenuProduct, choices: SelectedChoice[] = []) => {
    const cartKey = choices.length > 0
      ? `${product.id}-${choices.map(c => c.choiceId).sort().join('-')}`
      : product.id!
    setCart(prev => {
      const existing = prev.find(i => i.cartKey === cartKey)
      if (existing) return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1, choices, cartKey }]
    })
  }

  const handleProductClick = async (product: MenuProduct) => {
    if (productsWithOptions.includes(product.id!)) {
      const opts = await getOptionsForProduct(product.id!)
      setOptionsModal({ product, options: opts, selected: [] })
    } else {
      addToCart(product)
    }
  }

  const toggleChoice = (option: ProductOption, choice: ProductOptionChoice) => {
    setOptionsModal(prev => {
      if (!prev) return prev
      const isSingle = option.type === 'single'
      const alreadySelected = prev.selected.find(s => s.choiceId === choice.id)
      let newSelected: SelectedChoice[]
      if (alreadySelected) {
        newSelected = prev.selected.filter(s => s.choiceId !== choice.id)
      } else if (isSingle) {
        newSelected = [...prev.selected.filter(s => s.optionId !== option.id!), {
          optionId: option.id!, optionName: option.name,
          choiceId: choice.id!, choiceName: choice.name, price: choice.price
        }]
      } else {
        newSelected = [...prev.selected, {
          optionId: option.id!, optionName: option.name,
          choiceId: choice.id!, choiceName: choice.name, price: choice.price
        }]
      }
      return { ...prev, selected: newSelected }
    })
  }

  const confirmOptions = () => {
    if (!optionsModal) return
    const missing = optionsModal.options.filter(o => o.required && !optionsModal.selected.find(s => s.optionId === o.id))
    if (missing.length > 0) { alert(`Kies een ${missing[0].name}`); return }
    addToCart(optionsModal.product, optionsModal.selected)
    setOptionsModal(null)
  }

  const updateQty = (cartKey: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.cartKey !== cartKey))
    else setCart(prev => prev.map(i => i.cartKey === cartKey ? { ...i, quantity: qty } : i))
  }

  const clearCart = () => setCart([])
  const total = cart.reduce((sum, i) => {
    const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
    return sum + (i.product.price + choicesTotal) * i.quantity
  }, 0)

  // ── Numpad ────────────────────────────────────────────────────────────────
  const handleNumpad = (key: string) => {
    if (key === 'C') { setNumpadValue(''); return }
    if (key === '=') {
      try {
        const expr = numpadValue.replace(/×/g, '*')
        // eslint-disable-next-line no-new-func
        const result = Function('"use strict"; return (' + expr + ')')()
        setNumpadValue(String(result))
      } catch { /* ongeldige expressie */ }
      return
    }
    if (['+', '-', '×'].includes(key)) {
      if (numpadValue && !['+', '-', '×'].some(op => numpadValue.endsWith(op)))
        setNumpadValue(numpadValue + key)
      return
    }
    if (key === '.') {
      const parts = numpadValue.split(/[+\-×]/)
      if (!parts[parts.length - 1].includes('.')) setNumpadValue(numpadValue + '.')
      return
    }
    setNumpadValue(numpadValue + key)
  }

  const addCustomAmount = () => {
    const amount = parseFloat(numpadValue)
    if (amount > 0) {
      const custom: MenuProduct = {
        id: `custom-${Date.now()}`,
        tenant_slug: tenant,
        category_id: null,
        name: `Bedrag €${amount.toFixed(2)}`,
        description: '',
        price: amount,
        image_url: '',
        is_active: true,
        is_popular: false,
        sort_order: 0,
        allergens: [],
      }
      setCart(prev => [...prev, { product: custom, quantity: 1, cartKey: custom.id! }])
      setNumpadValue('')
    }
  }

  const cycleOrderType = () => {
    const types: OrderType[] = ['DINE_IN', 'TAKEAWAY', 'DELIVERY']
    setOrderType(types[(types.indexOf(orderType) + 1) % types.length])
  }

  const handleAfrekenen = async () => {
    if (cart.length === 0) return
    await supabase.from('orders').insert({
      tenant_slug: tenant,
      status: 'completed',
      order_type: orderType,
      table_number: tableNumber || null,
      total_amount: total,
      items: cart.map(i => ({ product_id: i.product.id, name: i.product.name, price: i.product.price, quantity: i.quantity })),
      created_at: new Date().toISOString(),
    })
    clearCart()
    setTableNumber('')
    alert(`✅ Bestelling afgerekend! Totaal: €${total.toFixed(2)}`)
  }

  const handleLogout = () => {
    localStorage.removeItem('vysion_tenant')
    window.location.href = '/login'
  }

  return (
    <div className="flex flex-col bg-[#e3e3e3] overflow-hidden" style={{ height: '100dvh' }}>

      {/* ── Volledige breedte header ── */}
      <div className="h-14 flex-shrink-0 bg-white border-b border-gray-200 flex items-center px-3 gap-3 relative z-30">

        {/* Links: hamburger + Kassa */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNavOpen(o => !o)}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="w-8 h-8 bg-[#3C4D6B] rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-bold text-gray-800 text-base">Kassa</span>
        </div>

        {/* Midden: Vysion group */}
        <div className="flex-1 flex justify-center items-end">
          <span className="text-2xl font-black text-red-600 tracking-tight">Vysion</span>
          <span className="text-sm text-gray-400 mb-0.5 ml-1">group</span>
        </div>

        {/* Rechts: online + geluid + taal */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
            <div className={`w-2 h-2 rounded-full ${isOnline === null ? 'bg-gray-400 animate-pulse' : isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{isOnline === null ? '...' : isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <button
            onClick={toggleSound}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-colors ${soundsOn ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}
            title={soundsOn ? 'Geluid aan' : 'Geluid uit'}
          >
            {soundsOn ? '🔔' : '🔕'}
          </button>
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen(o => !o)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <span className="text-base">{localeFlags[locale]}</span>
              <span>{localeNames[locale]}</span>
              <svg className={`w-3 h-3 text-gray-500 transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 min-w-[160px] overflow-hidden">
                {locales.map(lang => (
                  <button
                    key={lang}
                    onClick={() => { setLocale(lang); setLangOpen(false) }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm ${locale === lang ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'}`}
                  >
                    <span>{localeFlags[lang]}</span>
                    <span>{localeNames[lang]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Hamburger dropdown */}
        {navOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setNavOpen(false)} />
            <div className="absolute top-14 left-0 z-20 w-64 bg-white border border-gray-200 rounded-br-2xl shadow-xl overflow-y-auto max-h-[80vh]">
              {/* Kassa */}
              <Link href={`${baseUrl}/kassa`} onClick={() => setNavOpen(false)}
                className="flex items-center gap-3 px-5 py-3.5 bg-blue-50 border-b border-gray-100 font-bold text-[#3C4D6B]">
                <span className="text-xl">🖥️</span> Kassa
              </Link>

              {/* Menu beheer */}
              <div className="px-4 pt-3 pb-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Menu beheer</p>
              </div>
              <Link href={`${baseUrl}/categorieen`} onClick={() => setNavOpen(false)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 transition-colors">
                <span className="text-xl">📁</span> Categorieën
              </Link>
              <Link href={`${baseUrl}/producten`} onClick={() => setNavOpen(false)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 transition-colors">
                <span className="text-xl">🍟</span> Producten
              </Link>
              <Link href={`${baseUrl}/opties`} onClick={() => setNavOpen(false)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 transition-colors">
                <span className="text-xl">➕</span> Opties & Extra's
              </Link>
              <Link href={`${baseUrl}/allergenen`} onClick={() => setNavOpen(false)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 transition-colors">
                <span className="text-xl">⚠️</span> Allergenen
              </Link>

              {/* Overige */}
              <div className="px-4 pt-3 pb-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overige</p>
              </div>
              <Link href={baseUrl} onClick={() => setNavOpen(false)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 transition-colors">
                <span className="text-xl">🛒</span> Online Platform
              </Link>
              <Link href={`${baseUrl}/reserveringen`} onClick={() => setNavOpen(false)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 transition-colors">
                <span className="text-xl">📅</span> Reservaties
              </Link>
              <Link href={`/shop/${tenant}`} target="_blank" onClick={() => setNavOpen(false)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 transition-colors">
                <span className="text-xl">🔗</span> Bekijk je shop
              </Link>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-red-50 font-semibold text-red-600 transition-colors">
                <span className="text-xl">🚪</span> Uitloggen
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Body: midden + rechts ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Midden: categorieën / producten ── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Sub-header: terugknop bij producten */}
          {selectedCategory && (
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-[#e3e3e3] border-b border-gray-300">
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                ← Terug
              </button>
              <span className="text-lg font-bold text-gray-800">
                {selectedCategory.icon && <span className="mr-1">{selectedCategory.icon}</span>}
                {selectedCategory.name}
              </span>
            </div>
          )}

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-2">
            {menuLoading ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-lg">Laden...</div>
            ) : !selectedCategory ? (
              /* Categorieën grid — 4 kolommen */
              categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <span className="text-5xl mb-3">📂</span>
                  <p className="font-semibold">Nog geen categorieën</p>
                  <p className="text-sm mt-1">Voeg categorieën toe via het Online Platform</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {categories.map(cat => {
                    const catImage = products.find(p => p.category_id === cat.id && p.image_url)?.image_url
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat)}
                        className="aspect-square relative rounded-xl overflow-hidden shadow-md active:scale-95 transition-transform"
                        style={{ backgroundColor: '#3C4D6B' }}
                      >
                        {catImage && (
                          <img src={catImage} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute inset-0 flex flex-col items-center justify-end p-2">
                          {cat.icon && <span className="text-2xl mb-0.5">{cat.icon}</span>}
                          <span className="font-bold text-white text-xs text-center leading-tight drop-shadow">{cat.name}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            ) : (
              /* Producten grid — 4 kolommen */
              (() => {
                const filtered = products.filter(p => p.category_id === selectedCategory.id)
                return filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <span className="text-5xl mb-3">🍽️</span>
                    <p className="font-semibold">Geen producten in deze categorie</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {filtered.map(product => {
                      const inCart = cart.filter(i => i.product.id === product.id).reduce((s, i) => s + i.quantity, 0)
                      const hasOpts = productsWithOptions.includes(product.id!)
                      return (
                        <button
                          key={product.id}
                          onClick={() => handleProductClick(product)}
                          className="flex flex-col bg-white rounded-xl shadow overflow-hidden active:scale-95 transition-transform relative"
                        >
                          <div className="aspect-square w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                            {product.image_url
                              ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                              : <span className="text-3xl text-gray-300">🍽️</span>
                            }
                          </div>
                          {inCart > 0 && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#3C4D6B] text-white text-xs font-bold flex items-center justify-center shadow">
                              {inCart}
                            </div>
                          )}
                          {hasOpts && (
                            <div className="absolute bottom-8 right-1 text-xs bg-amber-400 text-white rounded px-1 font-bold">+</div>
                          )}
                          <div className="p-1.5 text-left">
                            <p className="font-semibold text-xs text-gray-800 leading-tight line-clamp-2">{product.name}</p>
                            <p className="text-[#3C4D6B] font-bold text-xs mt-0.5">€{product.price.toFixed(2)}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })()
            )}
          </div>
        </div>

        {/* ── Rechts: numpad / cart ── */}
        <div className="w-80 sm:w-96 lg:w-[380px] bg-white border-l border-gray-200 flex flex-col flex-shrink-0 min-h-0 overflow-hidden">

        {/* Tafel knop */}
        {orderType === 'DINE_IN' && (
          <div className="px-3 pt-3">
            <button
              onClick={() => {
                const nr = prompt('Tafelnummer:', tableNumber)
                if (nr !== null) setTableNumber(nr)
              }}
              className="w-full py-3 rounded-xl bg-[#3C4D6B] hover:bg-[#2D3A52] text-white font-bold text-base transition-colors"
            >
              {tableNumber ? `🪑 Tafel ${tableNumber}` : 'Kies tafel...'}
            </button>
          </div>
        )}

        {/* Besteltype banner */}
        <button
          onClick={cycleOrderType}
          className={`mx-3 mt-2 py-3 rounded-xl font-bold text-lg uppercase tracking-wide transition-colors ${
            orderType === 'DINE_IN' ? 'bg-[#3C4D6B] text-white' :
            orderType === 'TAKEAWAY' ? 'bg-amber-500 text-black' :
            'bg-blue-600 text-white'
          }`}
        >
          {orderType === 'DINE_IN' && `🍽️ HIER OPETEN${tableNumber ? ` • Tafel ${tableNumber}` : ''}`}
          {orderType === 'TAKEAWAY' && '📦 AFHALEN'}
          {orderType === 'DELIVERY' && '🚗 LEVERING'}
        </button>

        {/* Cart of Numpad */}
        <div className="flex-1 overflow-y-auto px-3 pt-2 flex flex-col">
          {cart.length === 0 ? (
            <div className="flex flex-col flex-1">
              <div className="bg-[#e3e3e3] rounded-xl px-4 py-3 mb-3">
                <input
                  type="text"
                  value={numpadValue}
                  readOnly
                  placeholder="0.00"
                  className="w-full text-right text-3xl font-bold bg-transparent border-none outline-none text-black"
                />
              </div>
              <div className="grid grid-cols-4 gap-2 flex-1">
                {['7','8','9','+','4','5','6','-','1','2','3','×','C','0','.','='].map(key => (
                  <button
                    key={key}
                    onClick={() => handleNumpad(key)}
                    className={`rounded-xl font-bold text-2xl transition-colors ${
                      key === 'C' ? 'bg-[#3C4D6B] text-white hover:bg-[#2D3A52]'
                      : key === '=' ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : ['+','-','×'].includes(key) ? 'bg-[#3C4D6B] text-white hover:bg-[#2D3A52]'
                      : 'bg-[#e3e3e3] text-black hover:bg-gray-200'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
              {numpadValue && parseFloat(numpadValue) > 0 && (
                <button
                  onClick={addCustomAmount}
                  className="mt-3 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg transition-colors"
                >
                  + €{parseFloat(numpadValue || '0').toFixed(2)} toevoegen
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => {
                const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
                return (
                  <div key={item.cartKey} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.product.name}</p>
                      {item.choices && item.choices.length > 0 && (
                        <p className="text-xs text-gray-400 truncate">{item.choices.map(c => c.choiceName).join(', ')}</p>
                      )}
                      <p className="text-[#3C4D6B] font-bold">€{((item.product.price + choicesTotal) * item.quantity).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.cartKey, item.quantity - 1)}
                        className="w-9 h-9 rounded-lg bg-[#3C4D6B] text-white font-bold text-lg flex items-center justify-center hover:bg-[#2D3A52] transition-colors"
                      >
                        {item.quantity === 1 ? '🗑' : '−'}
                      </button>
                      <span className="w-6 text-center font-bold text-lg">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.cartKey, item.quantity + 1)}
                        className="w-9 h-9 rounded-lg bg-[#3C4D6B] text-white font-bold text-lg flex items-center justify-center hover:bg-[#2D3A52] transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Totaal + knoppen */}
        <div className="border-t border-gray-200 p-3 space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="font-bold text-gray-700 text-lg">Totaal</span>
            <span className="font-bold text-[#3C4D6B] text-2xl">€{total.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button className="flex flex-col items-center gap-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors">
              <span className="text-xl">💰</span>
              <span className="text-xs font-semibold">Lade open</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-colors">
              <span className="text-xl">🖨️</span>
              <span className="text-xs font-semibold">Print opnieuw</span>
            </button>
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="flex flex-col items-center gap-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors disabled:opacity-40"
            >
              <span className="text-xl">🗑️</span>
              <span className="text-xs font-semibold">Verwijder</span>
            </button>
          </div>
          <button
            onClick={handleAfrekenen}
            disabled={cart.length === 0}
            className="w-full py-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            💳 Afrekenen
          </button>
        </div>
        </div>
      </div>

      {/* ── Opties Modal ── */}
      {optionsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b">
              {optionsModal.product.image_url && (
                <img src={optionsModal.product.image_url} alt={optionsModal.product.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg truncate">{optionsModal.product.name}</p>
                <p className="text-[#3C4D6B] font-bold">
                  €{(optionsModal.product.price + optionsModal.selected.reduce((s, c) => s + c.price, 0)).toFixed(2)}
                </p>
              </div>
              <button onClick={() => setOptionsModal(null)} className="p-2 hover:bg-gray-100 rounded-xl">✕</button>
            </div>

            {/* Opties */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {optionsModal.options.map(option => (
                <div key={option.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-bold text-gray-800">{option.name}</p>
                    {option.required && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Verplicht</span>}
                    {option.type === 'multiple' && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Meerdere</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(option.choices || []).map(choice => {
                      const isSelected = optionsModal.selected.some(s => s.choiceId === choice.id)
                      return (
                        <button
                          key={choice.id}
                          onClick={() => toggleChoice(option, choice)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                            isSelected ? 'border-[#3C4D6B] bg-[#3C4D6B] text-white' : 'border-gray-200 hover:border-[#3C4D6B] text-gray-700'
                          }`}
                        >
                          <span>{choice.name}</span>
                          {choice.price > 0 && <span className={isSelected ? 'text-white/80' : 'text-gray-400'}>+€{choice.price.toFixed(2)}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex gap-3">
              <button onClick={() => setOptionsModal(null)} className="flex-1 py-3 rounded-xl bg-gray-100 font-semibold text-gray-700">Annuleer</button>
              <button onClick={confirmOptions} className="flex-[2] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg">
                + Toevoegen €{(optionsModal.product.price + optionsModal.selected.reduce((s, c) => s + c.price, 0)).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
