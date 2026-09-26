'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-headers'

type Product = { id: string; name: string }
type Barcode = { id: string; product_id: string; barcode: string }

export default function RetailBarcodesPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const [products, setProducts] = useState<Product[]>([])
  const [barcodes, setBarcodes] = useState<Barcode[]>([])
  const [productId, setProductId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const [prodRes, codeRes] = await Promise.all([
      authFetch(`/api/retail/backoffice?tenant=${encodeURIComponent(tenant)}&op=products`),
      authFetch(`/api/retail/backoffice?tenant=${encodeURIComponent(tenant)}&op=barcodes`),
    ])
    const prod = (await prodRes.json()) as { products?: Product[] }
    const codes = (await codeRes.json()) as { barcodes?: Barcode[] }
    setProducts(prod.products || [])
    setBarcodes(codes.barcodes || [])
    setProductId((prev) => prev || prod.products?.[0]?.id || '')
  }

  useEffect(() => {
    void load()
  }, [tenant])

  async function add() {
    const res = await authFetch('/api/retail/backoffice', {
      method: 'POST',
      body: JSON.stringify({ op: 'barcode.add', tenantSlug: tenant, productId, barcode: code }),
    })
    const json = (await res.json()) as { ok?: boolean; error?: string }
    if (!json.ok) setError(json.error || 'Niet opgeslagen')
    else {
      setCode('')
      setError('')
      void load()
    }
  }

  async function remove(id: string) {
    await authFetch('/api/retail/backoffice', {
      method: 'POST',
      body: JSON.stringify({ op: 'barcode.delete', tenantSlug: tenant, id }),
    })
    void load()
  }

  const nameOf = (id: string) => products.find((p) => p.id === id)?.name || id

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Extra barcodes</h1>
      <p className="mb-4 text-sm text-gray-500">Een tweede of derde code op hetzelfde artikel. De barcode van een maat of kleur blijft op die variant.</p>
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="mb-4 flex flex-wrap gap-2">
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="rounded-lg border px-3 py-2">
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Barcode" className="rounded-lg border px-3 py-2" />
        <button type="button" onClick={() => void add()} className="rounded-lg bg-[#3C4D6B] px-4 py-2 text-white">Toevoegen</button>
      </div>
      <ul className="divide-y rounded-2xl border bg-white">
        {barcodes.map((row) => (
          <li key={row.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span>{nameOf(row.product_id)} · <span className="font-mono">{row.barcode}</span></span>
            <button type="button" className="text-red-600" onClick={() => void remove(row.id)}>Weg</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
