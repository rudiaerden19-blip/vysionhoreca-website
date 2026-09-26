'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-headers'

type Supplier = { id: string; name: string; email: string | null; phone: string | null }

export default function RetailLeveranciersPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const [rows, setRows] = useState<Supplier[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  async function load() {
    const res = await authFetch(`/api/retail/backoffice?tenant=${encodeURIComponent(tenant)}&op=suppliers`)
    const json = (await res.json()) as { suppliers?: Supplier[] }
    setRows(json.suppliers || [])
  }

  useEffect(() => {
    void load()
  }, [tenant])

  async function add() {
    await authFetch('/api/retail/backoffice', {
      method: 'POST',
      body: JSON.stringify({ op: 'supplier.save', tenantSlug: tenant, name, email, phone }),
    })
    setName('')
    setEmail('')
    setPhone('')
    void load()
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Leveranciers</h1>
      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam" className="rounded-lg border px-3 py-2" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="rounded-lg border px-3 py-2" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefoon" className="rounded-lg border px-3 py-2" />
        <button type="button" onClick={() => void add()} className="rounded-lg bg-[#3C4D6B] px-4 py-2 text-white">Bewaren</button>
      </div>
      <ul className="divide-y rounded-2xl border bg-white">
        {rows.map((row) => (
          <li key={row.id} className="px-3 py-2 text-sm">
            <span className="font-medium">{row.name}</span>
            <span className="ml-2 text-gray-500">{[row.email, row.phone].filter(Boolean).join(' · ')}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
