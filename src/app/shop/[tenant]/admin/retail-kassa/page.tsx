'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/i18n'
import {
  completeRetailCashSale,
  fetchRetailPosProducts,
  findRetailProductByBarcode,
  retailLineInStock,
  type RetailCartLine,
  type RetailPosProduct,
} from '@/lib/retail-kassa-pos'

export default function RetailKassaPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const { t } = useLanguage()
  const baseUrl = `/shop/${tenant}/admin`
  const scanRef = useRef<HTMLInputElement>(null)

  const [products, setProducts] = useState<RetailPosProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [scanValue, setScanValue] = useState('')
  const [cart, setCart] = useState<RetailCartLine[]>([])
  const [paying, setPaying] = useState(false)
  const [lastOrder, setLastOrder] = useState<number | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const list = await fetchRetailPosProducts(tenant)
    setProducts(list)
    setLoading(false)
  }, [tenant])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    scanRef.current?.focus()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.article_number && p.article_number.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.size_label && p.size_label.toLowerCase().includes(q)) ||
        (p.color_label && p.color_label.toLowerCase().includes(q)),
    )
  }, [products, search])

  const total = useMemo(
    () => cart.reduce((s, l) => s + l.product.price * l.quantity, 0),
    [cart],
  )

  function addToCart(p: RetailPosProduct, qty = 1) {
    if (!retailLineInStock(p, qty)) {
      alert(t('retailKassaPage.outOfStock'))
      return
    }
    setCart((prev) => {
      const i = prev.findIndex((l) => l.product.id === p.id)
      if (i < 0) return [...prev, { product: p, quantity: qty }]
      const next = [...prev]
      const merged = next[i].quantity + qty
      if (!retailLineInStock(p, merged)) {
        alert(t('retailKassaPage.outOfStock'))
        return prev
      }
      next[i] = { ...next[i], quantity: merged }
      return next
    })
    setScanValue('')
    scanRef.current?.focus()
  }

  function onScanSubmit(e: React.FormEvent) {
    e.preventDefault()
    const hit = findRetailProductByBarcode(products, scanValue)
    if (hit) addToCart(hit, 1)
    else alert(t('retailKassaPage.barcodeNotFound'))
  }

  async function payCash() {
    if (cart.length === 0 || paying) return
    setPaying(true)
    const res = await completeRetailCashSale(tenant, cart)
    setPaying(false)
    if (!res.ok) {
      alert(t('retailKassaPage.payError'))
      return
    }
    setLastOrder(res.orderNumber ?? null)
    setCart([])
    await reload()
    scanRef.current?.focus()
  }

  return (
    <div className="min-h-[100dvh] bg-[#0f172a] text-white flex flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link
          href={baseUrl}
          className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
        >
          ← {t('retailKassaPage.back')}
        </Link>
        <h1 className="text-lg font-bold flex-1">{t('retailKassaPage.title')}</h1>
      </header>

      <form onSubmit={onScanSubmit} className="px-4 py-3 border-b border-white/10 flex gap-2">
        <input
          ref={scanRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={t('retailKassaPage.scanPlaceholder')}
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/50 focus:border-[#58CCFF] focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-xl bg-[#58CCFF] px-5 py-3 font-bold text-[#063042]"
        >
          {t('retailKassaPage.add')}
        </button>
      </form>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <div className="flex-1 min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-white/10">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('retailKassaPage.search')}
            className="m-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm focus:outline-none focus:border-[#58CCFF]"
          />
          <div className="flex-1 overflow-y-auto px-3 pb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3 content-start">
            {loading ? (
              <p className="text-white/60 col-span-full p-4">{t('retailKassaPage.loading')}</p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p, 1)}
                  className="text-left rounded-xl border border-white/15 bg-white/5 p-3 hover:bg-white/10 transition-colors"
                >
                  <p className="font-semibold text-sm leading-snug line-clamp-2">{p.name}</p>
                  <p className="text-xs text-white/60 mt-1 line-clamp-2">
                    {p.description || '—'}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-white/80">
                    <span>
                      {t('retailKassaPage.price')}: €{p.price.toFixed(2)}
                    </span>
                    <span>
                      {t('retailKassaPage.article')}: {p.article_number || '—'}
                    </span>
                    <span>
                      {t('retailKassaPage.size')}: {p.size_label || '—'}
                    </span>
                    <span>
                      {t('retailKassaPage.color')}: {p.color_label || '—'}
                    </span>
                    <span>
                      {t('retailKassaPage.stock')}:{' '}
                      {p.track_stock ? p.stock_quantity : t('retailKassaPage.stockNotTracked')}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <aside className="w-full lg:w-80 flex flex-col bg-black/30">
          <div className="p-4 border-b border-white/10 font-bold">{t('retailKassaPage.cart')}</div>
          <ul className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <li className="text-sm text-white/50">{t('retailKassaPage.cartEmpty')}</li>
            ) : (
              cart.map((l) => (
                <li
                  key={l.product.id}
                  className="flex justify-between gap-2 text-sm rounded-lg bg-white/5 px-3 py-2"
                >
                  <span className="min-w-0 truncate">
                    {l.product.name} × {l.quantity}
                  </span>
                  <span className="shrink-0 font-semibold">
                    €{(l.product.price * l.quantity).toFixed(2)}
                  </span>
                </li>
              ))
            )}
          </ul>
          <div className="p-4 border-t border-white/10 space-y-3">
            <div className="flex justify-between text-lg font-bold">
              <span>{t('retailKassaPage.total')}</span>
              <span>€{total.toFixed(2)}</span>
            </div>
            <button
              type="button"
              disabled={cart.length === 0 || paying}
              onClick={() => void payCash()}
              className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-white disabled:opacity-40"
            >
              {paying ? t('retailKassaPage.paying') : t('retailKassaPage.payCash')}
            </button>
            {lastOrder != null && (
              <p className="text-center text-sm text-emerald-300">
                {t('retailKassaPage.lastOrder').replace('{n}', String(lastOrder))}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
