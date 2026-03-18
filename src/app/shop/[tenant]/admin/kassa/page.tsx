'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getMenuCategories, getMenuProducts, MenuCategory, MenuProduct } from '@/lib/admin-api'
import { supabase } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────
interface CartItem {
  product: MenuProduct
  quantity: number
}

type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'

// ── Component ──────────────────────────────────────────────────────────────
export default function KassaAdminPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant

  // Data
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [products, setProducts] = useState<MenuProduct[]>([])

  // UI state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN')
  const [tableNumber, setTableNumber] = useState('')
  const [numpadValue, setNumpadValue] = useState('')
  const [leftOpen, setLeftOpen] = useState(true)

  // Load data
  useEffect(() => {
    async function load() {
      const [cats, prods] = await Promise.all([
        getMenuCategories(tenant),
        getMenuProducts(tenant),
      ])
      setCategories(cats.filter(c => c.is_active))
      setProducts(prods.filter(p => p.is_active))
    }
    load()
  }, [tenant])

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = (product: MenuProduct) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.product.id !== productId))
    else setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i))
  }

  const clearCart = () => setCart([])

  // ── Totals ────────────────────────────────────────────────────────────────
  const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0)

  // ── Numpad ────────────────────────────────────────────────────────────────
  const handleNumpad = (key: string) => {
    if (key === 'C') { setNumpadValue(''); return }
    if (key === '=') {
      try {
        const expr = numpadValue.replace(/×/g, '*')
        // eslint-disable-next-line no-new-func
        const result = Function('"use strict"; return (' + expr + ')')()
        setNumpadValue(String(result))
      } catch { /* invalid expression */ }
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
      addToCart(custom)
      setNumpadValue('')
    }
  }

  // ── Order type cycle ──────────────────────────────────────────────────────
  const cycleOrderType = () => {
    const types: OrderType[] = ['DINE_IN', 'TAKEAWAY', 'DELIVERY']
    const next = (types.indexOf(orderType) + 1) % types.length
    setOrderType(types[next])
  }

  // ── Filtered products ─────────────────────────────────────────────────────
  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products

  // ── Checkout (basic save to orders table) ─────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="-m-4 md:-m-6 -mb-96 flex flex-col bg-[#e3e3e3] overflow-hidden"
      style={{ height: 'calc(100vh - 80px)' }}
    >
      {/* ── Kassa header ── */}
      <div className="bg-white border-b border-gray-200 flex items-center px-4 h-14 flex-shrink-0 shadow-sm">
        <button onClick={() => setLeftOpen(o => !o)} className="p-2 hover:bg-gray-100 rounded-lg mr-3">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#3C4D6B] rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-bold text-gray-800 text-lg">Kassa</span>
        </div>
        <div className="flex-1 flex justify-center">
          <span className="text-2xl font-black text-red-600 tracking-tight">Vysion</span>
          <span className="text-sm text-gray-400 self-end mb-0.5 ml-1">group</span>
        </div>
      </div>

      {/* ── Hoofd layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Links: categorieën / producten ── */}
        {leftOpen && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Sub-header */}
            <div className="bg-white border-b border-gray-200 flex items-center gap-2 px-3 py-2 flex-shrink-0">
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  ← Terug
                </button>
              )}
              {selectedCategory && (
                <span className="font-semibold text-gray-700">
                  {categories.find(c => c.id === selectedCategory)?.name}
                </span>
              )}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-3">
              {!selectedCategory ? (
                /* Categorieën */
                categories.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <p className="text-lg">Nog geen categorieën</p>
                    <p className="text-sm mt-1">Voeg categorieën toe via Online Platform</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id!)}
                        className="aspect-square rounded-2xl overflow-hidden relative flex flex-col shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-shadow bg-[#3C4D6B]"
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="relative z-10 flex-1 flex flex-col justify-end items-start w-full p-4">
                          <span className="font-bold text-xl text-white drop-shadow-lg">{cat.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                /* Producten */
                filteredProducts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <p className="text-lg">Geen producten in deze categorie</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {filteredProducts.map(product => {
                      const cartItem = cart.find(i => i.product.id === product.id)
                      return (
                        <button
                          key={product.id}
                          onClick={() => addToCart(product)}
                          className="rounded-2xl overflow-hidden bg-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] transition-shadow flex flex-col relative"
                        >
                          {/* Afbeelding */}
                          <div className="aspect-square w-full bg-gray-100 relative">
                            {product.image_url ? (
                              <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-300 bg-[#3C4D6B]/10">
                                {product.name.charAt(0)}
                              </div>
                            )}
                            {cartItem && (
                              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[#3C4D6B] text-white flex items-center justify-center font-bold text-sm shadow-lg">
                                {cartItem.quantity}
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="p-2 text-left">
                            <p className="font-semibold text-sm truncate">{product.name}</p>
                            <p className="text-[#3C4D6B] font-bold text-lg">€{product.price.toFixed(2)}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ── Rechts: numpad / cart paneel ── */}
        <div className="w-80 sm:w-96 lg:w-[420px] bg-white border-l border-gray-200 flex flex-col flex-shrink-0 h-full">

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
              /* Numpad */
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
              /* Cart items */
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.product.id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 border border-gray-100">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 relative">
                      {item.product.image_url ? (
                        <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-400">
                          {item.product.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.product.name}</p>
                      <p className="text-[#3C4D6B] font-bold">€{(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.product.id!, item.quantity - 1)}
                        className="w-9 h-9 rounded-lg bg-[#3C4D6B] text-white font-bold text-lg flex items-center justify-center hover:bg-[#2D3A52] transition-colors"
                      >
                        {item.quantity === 1 ? '🗑' : '−'}
                      </button>
                      <span className="w-6 text-center font-bold text-lg">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.product.id!, item.quantity + 1)}
                        className="w-9 h-9 rounded-lg bg-[#3C4D6B] text-white font-bold text-lg flex items-center justify-center hover:bg-[#2D3A52] transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totaal + knoppen */}
          <div className="border-t border-gray-200 p-3 space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="font-bold text-gray-700 text-lg">Totaal</span>
              <span className="font-bold text-[#3C4D6B] text-2xl">€{total.toFixed(2)}</span>
            </div>

            {/* Actie knoppen rij */}
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

            {/* Afrekenen */}
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
    </div>
  )
}
