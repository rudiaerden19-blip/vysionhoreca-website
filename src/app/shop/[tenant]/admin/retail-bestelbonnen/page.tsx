'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-headers'

type Product = { id: string; name: string; stock_quantity?: number; low_stock_threshold?: number }
type Supplier = { id: string; name: string }
type Order = {
  id: string
  status: string
  created_at: string
  supplier_id: string | null
  lines: { product_id: string; quantity: number; received_quantity: number }[]
}

export default function RetailBestelbonnenPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const [tab, setTab] = useState<'orders' | 'suggest'>('orders')
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('1')

  async function load() {
    const [prodRes, supRes, orderRes, sugRes] = await Promise.all([
      authFetch(`/api/retail/backoffice?tenant=${encodeURIComponent(tenant)}&op=products`),
      authFetch(`/api/retail/backoffice?tenant=${encodeURIComponent(tenant)}&op=suppliers`),
      authFetch(`/api/retail/backoffice?tenant=${encodeURIComponent(tenant)}&op=purchase-orders`),
      authFetch(`/api/retail/backoffice?tenant=${encodeURIComponent(tenant)}&op=reorder`),
    ])
    const prod = (await prodRes.json()) as { products?: Product[] }
    const sup = (await supRes.json()) as { suppliers?: Supplier[] }
    const ord = (await orderRes.json()) as { orders?: Order[] }
    const sug = (await sugRes.json()) as { products?: Product[] }
    setProducts(prod.products || [])
    setSuppliers(sup.suppliers || [])
    setOrders(ord.orders || [])
    setSuggestions(sug.products || [])
    setProductId((prev) => prev || prod.products?.[0]?.id || '')
  }

  useEffect(() => {
    void load()
  }, [tenant])

  const nameOf = (id: string) => products.find((p) => p.id === id)?.name || id

  async function create() {
    await authFetch('/api/retail/backoffice', {
      method: 'POST',
      body: JSON.stringify({
        op: 'po.create',
        tenantSlug: tenant,
        supplierId: supplierId || null,
        lines: [{ productId, quantity: Number(qty) || 1 }],
      }),
    })
    void load()
  }

  async function createFromSuggestions() {
    if (suggestions.length === 0) return
    await authFetch('/api/retail/backoffice', {
      method: 'POST',
      body: JSON.stringify({
        op: 'po.create',
        tenantSlug: tenant,
        supplierId: supplierId || null,
        lines: suggestions.map((p) => ({
          productId: p.id,
          quantity: Math.max(1, (p.low_stock_threshold || 0) - (p.stock_quantity || 0) || 1),
        })),
      }),
    })
    setTab('orders')
    void load()
  }

  async function receive(orderId: string) {
    await authFetch('/api/retail/backoffice', {
      method: 'POST',
      body: JSON.stringify({ op: 'po.receive', tenantSlug: tenant, orderId }),
    })
    void load()
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-3 text-2xl font-bold text-gray-900">Bestelbonnen</h1>
      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setTab('orders')} className={`rounded-lg px-3 py-2 text-sm ${tab === 'orders' ? 'bg-[#3C4D6B] text-white' : 'bg-white border'}`}>Bonnen</button>
        <button type="button" onClick={() => setTab('suggest')} className={`rounded-lg px-3 py-2 text-sm ${tab === 'suggest' ? 'bg-[#3C4D6B] text-white' : 'bg-white border'}`}>Bestelvoorstel</button>
      </div>
      {tab === 'suggest' ? (
        <div className="rounded-2xl border bg-white p-4">
          <p className="mb-3 text-sm text-gray-600">Artikelen op of onder het minimum, zonder open bestelbon.</p>
          <ul className="mb-3 space-y-1 text-sm">
            {suggestions.map((p) => (
              <li key={p.id}>{p.name} · voorraad {p.stock_quantity ?? 0} · minimum {p.low_stock_threshold ?? 0}</li>
            ))}
            {suggestions.length === 0 ? <li className="text-gray-500">Niets te bestellen.</li> : null}
          </ul>
          <button type="button" onClick={() => void createFromSuggestions()} className="rounded-lg bg-[#3C4D6B] px-4 py-2 text-white">Maak bestelbon</button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="rounded-lg border px-3 py-2">
              <option value="">Leverancier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="rounded-lg border px-3 py-2">
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input value={qty} onChange={(e) => setQty(e.target.value)} className="w-20 rounded-lg border px-3 py-2" />
            <button type="button" onClick={() => void create()} className="rounded-lg bg-[#3C4D6B] px-4 py-2 text-white">Nieuwe bon</button>
          </div>
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id} className="rounded-2xl border bg-white p-3 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span>{new Date(order.created_at).toLocaleString('nl-BE')} · {order.status}</span>
                  {order.status === 'open' ? (
                    <button type="button" className="font-semibold text-[#3C4D6B]" onClick={() => void receive(order.id)}>Ontvangen</button>
                  ) : null}
                </div>
                <ul>
                  {order.lines.map((line, i) => (
                    <li key={`${order.id}-${i}`}>{nameOf(line.product_id)} · {line.received_quantity}/{line.quantity}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
