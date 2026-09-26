'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-headers'

type Row = {
  id: string
  sku_name: string | null
  reason: string
  quantity_delta: number
  quantity_after: number | null
  created_at: string
}

const REASON: Record<string, string> = {
  sale: 'Verkoop',
  goods_receipt: 'Goederenontvangst',
  count: 'Telling',
  correction: 'Correctie',
  purchase: 'Bestelbon ontvangen',
  return: 'Retour',
}

export default function RetailVoorraadlogPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    void authFetch(`/api/retail/backoffice?tenant=${encodeURIComponent(tenant)}&op=stock`)
      .then((r) => r.json())
      .then((j: { rows?: Row[] }) => setRows(j.rows || []))
  }, [tenant])

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Voorraadgeschiedenis</h1>
      <p className="mb-4 text-sm text-gray-500">Elke verkoop, ontvangst, telling, correctie en bestelbon. Onder het minimum gaat er een mail naar de zaak.</p>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-3 py-2">Wanneer</th>
              <th className="px-3 py-2">Artikel</th>
              <th className="px-3 py-2">Wat</th>
              <th className="px-3 py-2">Verschil</th>
              <th className="px-3 py-2">Daarna</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{new Date(row.created_at).toLocaleString('nl-BE')}</td>
                <td className="px-3 py-2">{row.sku_name || '—'}</td>
                <td className="px-3 py-2">{REASON[row.reason] || row.reason}</td>
                <td className="px-3 py-2 tabular-nums">{row.quantity_delta > 0 ? `+${row.quantity_delta}` : row.quantity_delta}</td>
                <td className="px-3 py-2 tabular-nums">{row.quantity_after ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
