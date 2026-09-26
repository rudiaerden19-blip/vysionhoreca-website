'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-headers'

type Product = {
  id: string
  name: string
  cost_price: number | null
  brand: string | null
  supplier_id: string | null
}
type Supplier = { id: string; name: string }

export default function RetailAankoopPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [error, setError] = useState('')

  async function load() {
    const [prodRes, supRes] = await Promise.all([
      authFetch(`/api/retail/backoffice?tenant=${encodeURIComponent(tenant)}&op=products`),
      authFetch(`/api/retail/backoffice?tenant=${encodeURIComponent(tenant)}&op=suppliers`),
    ])
    const prod = (await prodRes.json()) as { ok?: boolean; products?: Product[]; error?: string }
    const sup = (await supRes.json()) as { suppliers?: Supplier[] }
    if (!prod.ok) setError(prod.error || 'Kolommen ontbreken. Plak de SQL in Supabase.')
    setProducts(prod.products || [])
    setSuppliers(sup.suppliers || [])
  }

  useEffect(() => {
    void load()
  }, [tenant])

  async function save(product: Product, patch: { costPrice?: string; brand?: string; supplierId?: string }) {
    const res = await authFetch('/api/retail/backoffice', {
      method: 'POST',
      body: JSON.stringify({
        op: 'purchase.save',
        tenantSlug: tenant,
        productId: product.id,
        costPrice: patch.costPrice ?? product.cost_price,
        brand: patch.brand ?? product.brand,
        supplierId: patch.supplierId ?? product.supplier_id,
      }),
    })
    const json = (await res.json()) as { ok?: boolean; error?: string }
    if (!json.ok) setError(json.error || 'Opslaan mislukt')
    else void load()
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Aankoopprijs en merk</h1>
      <p className="mb-4 text-sm text-gray-500">Los van de verkoopprijs. De leverancier kies je uit het leveranciersbestand.</p>
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-3 py-2">Artikel</th>
              <th className="px-3 py-2">Aankoopprijs</th>
              <th className="px-3 py-2">Merk</th>
              <th className="px-3 py-2">Leverancier</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t">
                <td className="px-3 py-2 font-medium">{product.name}</td>
                <td className="px-3 py-2">
                  <input
                    defaultValue={product.cost_price ?? ''}
                    className="w-28 rounded-lg border px-2 py-1"
                    onBlur={(e) => void save(product, { costPrice: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    defaultValue={product.brand ?? ''}
                    className="w-40 rounded-lg border px-2 py-1"
                    onBlur={(e) => void save(product, { brand: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    defaultValue={product.supplier_id ?? ''}
                    className="rounded-lg border px-2 py-1"
                    onChange={(e) => void save(product, { supplierId: e.target.value })}
                  >
                    <option value="">Geen</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
