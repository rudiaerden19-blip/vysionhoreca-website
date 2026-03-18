'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getMenuCategories, getMenuProducts, MenuCategory, MenuProduct } from '@/lib/admin-api'

export default function KassaAdminPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant

  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [products, setProducts] = useState<MenuProduct[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [display, setDisplay] = useState('0.00')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [cats, prods] = await Promise.all([
        getMenuCategories(tenant),
        getMenuProducts(tenant),
      ])
      setCategories(cats.filter(c => c.is_active))
      setProducts(prods.filter(p => p.is_active))
      setLoading(false)
    }
    load()
  }, [tenant])

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : []

  const handleNumpad = (key: string) => {
    if (key === 'C') { setDisplay('0.00'); return }
    setDisplay(prev => {
      const digits = prev.replace('.', '')
      const newDigits = digits + key
      return (parseInt(newDigits) / 100).toFixed(2)
    })
  }

  if (loading) {
    return (
      <div className="-m-4 md:-m-6 h-[calc(100vh-80px)] bg-[#e3e3e3] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#3C4D6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="-m-4 md:-m-6 flex flex-row bg-[#e3e3e3] overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>

      {/* ── Links: Categorieën / Producten ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Status balk */}
        <div className="px-3 py-2 border-b border-gray-300 flex items-center gap-2 bg-[#e3e3e3] flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/60 text-xs">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Online</span>
          </div>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/60 text-sm font-medium hover:bg-white transition-colors"
            >
              ← Terug
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {!selectedCategory ? (
            categories.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <p className="text-5xl mb-3">🍽️</p>
                <p className="text-lg font-medium">Geen categorieën</p>
                <p className="text-sm mt-1">Voeg categorieën toe via Menu</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id || null)}
                    className="h-auto aspect-square p-0 border-2 border-transparent relative overflow-hidden rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.45)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.55)] transition-shadow active:scale-95 bg-gray-500"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-500 to-gray-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute inset-0 flex flex-col justify-end items-start p-4">
                      <p className="font-bold text-xl md:text-2xl lg:text-3xl text-white drop-shadow-lg">
                        {cat.icon && <span className="mr-1">{cat.icon}</span>}
                        {cat.name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <p className="text-5xl mb-3">🛒</p>
                <p className="text-lg font-medium">Geen producten</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    className="h-auto p-0 border-2 border-gray-200 hover:border-[#3C4D6B] relative overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.25)] active:scale-95 transition-all text-left"
                  >
                    <div className="aspect-square w-full bg-gray-100 relative">
                      {product.image_url ? (
                        <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-300">
                          {product.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="font-semibold text-sm md:text-base truncate">{product.name}</p>
                      <p className="text-[#3C4D6B] font-bold text-base md:text-lg">€{product.price.toFixed(2)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Rechts: Numpad paneel ── */}
      <div className="w-72 sm:w-80 lg:w-96 bg-white border-l border-gray-200 flex flex-col flex-shrink-0 h-full">

        <button className="mx-3 mt-3 py-3 bg-[#2AAB8C] hover:bg-[#229A7E] text-white font-bold rounded-xl text-base transition-colors">
          Kies tafel...
        </button>

        <button className="mx-3 mt-2 py-3 bg-[#2AAB8C] hover:bg-[#229A7E] text-white font-bold rounded-xl text-base transition-colors flex items-center justify-center gap-2">
          🌍 HIER OPETEN
        </button>

        <div className="mx-3 mt-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-right">
          <span className="text-2xl font-bold text-gray-800">{display}</span>
        </div>

        <div className="mx-3 mt-2 grid grid-cols-4 gap-1.5 flex-shrink-0">
          <button onClick={() => handleNumpad('7')} className="py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xl hover:bg-gray-100 transition-colors">7</button>
          <button onClick={() => handleNumpad('8')} className="py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xl hover:bg-gray-100 transition-colors">8</button>
          <button onClick={() => handleNumpad('9')} className="py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xl hover:bg-gray-100 transition-colors">9</button>
          <button className="py-4 bg-[#3C4D6B] hover:bg-[#2D3A52] rounded-xl font-bold text-white text-xl transition-colors">+</button>

          <button onClick={() => handleNumpad('4')} className="py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xl hover:bg-gray-100 transition-colors">4</button>
          <button onClick={() => handleNumpad('5')} className="py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xl hover:bg-gray-100 transition-colors">5</button>
          <button onClick={() => handleNumpad('6')} className="py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xl hover:bg-gray-100 transition-colors">6</button>
          <button className="py-4 bg-[#3C4D6B] hover:bg-[#2D3A52] rounded-xl font-bold text-white text-xl transition-colors">-</button>

          <button onClick={() => handleNumpad('1')} className="py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xl hover:bg-gray-100 transition-colors">1</button>
          <button onClick={() => handleNumpad('2')} className="py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xl hover:bg-gray-100 transition-colors">2</button>
          <button onClick={() => handleNumpad('3')} className="py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xl hover:bg-gray-100 transition-colors">3</button>
          <button className="py-4 bg-[#3C4D6B] hover:bg-[#2D3A52] rounded-xl font-bold text-white text-xl transition-colors">×</button>

          <button onClick={() => handleNumpad('C')} className="py-4 bg-[#3C4D6B] hover:bg-[#2D3A52] rounded-xl font-bold text-white text-xl transition-colors">C</button>
          <button onClick={() => handleNumpad('0')} className="py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xl hover:bg-gray-100 transition-colors">0</button>
          <button className="py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xl hover:bg-gray-100 transition-colors">.</button>
          <button className="py-4 bg-[#22c55e] hover:bg-[#16a34a] rounded-xl font-bold text-white text-xl transition-colors">=</button>
        </div>

        <div className="mx-3 mt-3 flex items-center justify-between px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
          <span className="font-bold text-gray-700">Totaal</span>
          <span className="font-bold text-gray-800 text-xl">€0.00</span>
        </div>

        <div className="mx-3 mt-2 grid grid-cols-3 gap-1.5">
          <button className="flex flex-col items-center gap-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            <span className="text-xs font-semibold">Lade open</span>
          </button>
          <button className="flex flex-col items-center gap-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            <span className="text-xs font-semibold">Print opnieuw</span>
          </button>
          <button className="flex flex-col items-center gap-1 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            <span className="text-xs font-semibold">Verwijder</span>
          </button>
        </div>

        <button className="mx-3 mt-2 mb-3 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 border border-gray-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          Afrekenen
        </button>
      </div>
    </div>
  )
}
