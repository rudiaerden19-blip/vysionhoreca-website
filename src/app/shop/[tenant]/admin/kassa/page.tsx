'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MenuProduct } from '@/lib/admin-api'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'
import { getSoundsEnabled, setSoundsEnabled } from '@/lib/sounds'

interface CartItem {
  product: MenuProduct
  quantity: number
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
  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.product.id !== productId))
    else setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i))
  }

  const clearCart = () => setCart([])
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
      setCart(prev => [...prev, { product: custom, quantity: 1 }])
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
    <div className="flex h-screen bg-[#e3e3e3] overflow-hidden">

      {/* ── Links: hamburger kolom ── */}
      <div className="flex flex-col bg-[#e3e3e3] w-16 flex-shrink-0 relative">

        {/* Hamburger knop */}
        <button
          onClick={() => setNavOpen(o => !o)}
          className="w-full h-16 flex items-center justify-center hover:bg-gray-300 transition-colors rounded-xl"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {navOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setNavOpen(false)} />
            <div className="absolute top-16 left-0 z-20 w-64 bg-white border border-gray-200 rounded-br-2xl shadow-xl overflow-hidden">
              <Link
                href={`${baseUrl}/kassa`}
                onClick={() => setNavOpen(false)}
                className="flex items-center gap-3 px-5 py-4 bg-blue-50 border-b border-gray-100 font-bold text-[#3C4D6B]"
              >
                <span className="text-xl">🖥️</span> Kassa
              </Link>
              <Link
                href={baseUrl}
                onClick={() => setNavOpen(false)}
                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 transition-colors"
              >
                <span className="text-xl">🛒</span> Online Platform
              </Link>
              <Link
                href={`${baseUrl}/reservaties`}
                onClick={() => setNavOpen(false)}
                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 transition-colors"
              >
                <span className="text-xl">📅</span> Reservaties
              </Link>
              <Link
                href={`/shop/${tenant}`}
                target="_blank"
                onClick={() => setNavOpen(false)}
                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 transition-colors"
              >
                <span className="text-xl">🔗</span> Bekijk je shop
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-50 font-semibold text-red-600 transition-colors"
              >
                <span className="text-xl">🚪</span> Uitloggen
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Midden: kassa header + lege ruimte ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#e3e3e3] flex items-center px-4 h-16 flex-shrink-0">
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
          {/* Rechts: online status + geluid + taal */}
          <div className="flex items-center gap-2">
            {/* Online status */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-gray-700">
              <div className={`w-2 h-2 rounded-full ${isOnline === null ? 'bg-gray-400 animate-pulse' : isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{isOnline === null ? '...' : isOnline ? 'Online' : 'Offline'}</span>
            </div>
            {/* Geluid toggle */}
            <button
              onClick={toggleSound}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-colors ${soundsOn ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'}`}
              title={soundsOn ? 'Geluid aan' : 'Geluid uit'}
            >
              {soundsOn ? '🔔' : '🔕'}
            </button>
            {/* Taalknop */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
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
        </div>

        {/* Lege ruimte */}
        <div className="flex-1 bg-[#e3e3e3]" />
      </div>

      {/* ── Rechts: numpad / cart ── */}
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
              {cart.map(item => (
                <div key={item.product.id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 border border-gray-100">
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
  )
}
