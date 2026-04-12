'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/i18n'
import { getAuthHeaders } from '@/lib/auth-headers'
import { defaultNextFridayEightDatetimeLocalValue, datetimeLocalToIso } from '@/lib/school-shop-session'

type MenuProductRow = { id: string; name: string; price: number }
type WeekRow = {
  id: string
  title: string
  access_code: string
  order_deadline: string
  status: string
  products: { product_id: string; sort_order: number }[]
}

export default function SchoolShopAdminPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [weeks, setWeeks] = useState<WeekRow[]>([])
  const [products, setProducts] = useState<MenuProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [title, setTitle] = useState('Schoolweek')
  const [accessCode, setAccessCode] = useState('')
  const [deadlineLocal, setDeadlineLocal] = useState(defaultNextFridayEightDatetimeLocalValue)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [labelsWeek, setLabelsWeek] = useState<WeekRow | null>(null)
  const [labelsJson, setLabelsJson] = useState<string>('')

  async function load() {
    setLoading(true)
    setErr('')
    try {
      const [wRes, pRes] = await Promise.all([
        fetch(`/api/school-shop/admin/weeks?tenant_slug=${encodeURIComponent(params.tenant)}`, {
          headers: getAuthHeaders(),
        }),
        fetch(`/api/school-shop/admin/menu-products?tenant_slug=${encodeURIComponent(params.tenant)}`, {
          headers: getAuthHeaders(),
        }),
      ])
      if (!wRes.ok) throw new Error('weeks')
      if (!pRes.ok) throw new Error('products')
      const w = await wRes.json()
      const p = await pRes.json()
      setWeeks(Array.isArray(w) ? w : [])
      setProducts(Array.isArray(p) ? p : [])
    } catch {
      setErr(t('schoolShop.fetchError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [params.tenant])

  function toggleProduct(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 4) return prev
      return [...prev, id]
    })
  }

  async function createWeek(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    const iso = datetimeLocalToIso(deadlineLocal)
    if (!iso) {
      setErr(t('schoolShop.invalidDeadline'))
      return
    }
    if (selectedIds.length < 1 || selectedIds.length > 4) {
      setErr(t('schoolShop.productCountError'))
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/school-shop/admin/weeks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          tenant_slug: params.tenant,
          title: title.trim() || 'Schoolweek',
          access_code: accessCode,
          order_deadline: iso,
          product_ids: selectedIds,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || t('schoolShop.fetchError'))
        return
      }
      setAccessCode('')
      setSelectedIds([])
      setTitle('Schoolweek')
      setDeadlineLocal(defaultNextFridayEightDatetimeLocalValue())
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function deleteWeek(id: string) {
    if (!window.confirm(t('schoolShop.deleteConfirm'))) return
    await fetch(`/api/school-shop/admin/weeks/${id}?tenant_slug=${encodeURIComponent(params.tenant)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    load()
  }

  async function openLabels(week: WeekRow) {
    setLabelsWeek(week)
    const res = await fetch(
      `/api/school-shop/admin/weeks/${week.id}/labels?tenant_slug=${encodeURIComponent(params.tenant)}`,
      { headers: getAuthHeaders() }
    )
    const data = await res.json()
    setLabelsJson(JSON.stringify(data, null, 2))
  }

  function productName(id: string) {
    return products.find((p) => p.id === id)?.name || id
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <Link href={`/shop/${params.tenant}/admin/groepen`} className="text-sm text-blue-600 hover:underline">
          ← {t('schoolShop.backGroups')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{t('schoolShop.adminTitle')}</h1>
        <p className="text-gray-600 text-sm mt-1">{t('schoolShop.adminSubtitle')}</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-500">{t('schoolShop.loading')}</div>
      ) : (
        <>
          <form onSubmit={createWeek} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-8 space-y-4">
            <h2 className="font-semibold text-gray-900">{t('schoolShop.formTitle')}</h2>
            <p className="text-sm text-gray-600">{t('schoolShop.deadlineHint')}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('schoolShop.fieldWeekName')}</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('schoolShop.fieldCode')}</label>
              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                className="w-full border rounded-xl px-3 py-2 font-mono"
                maxLength={16}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('schoolShop.fieldDeadline')}</label>
              <input
                type="datetime-local"
                value={deadlineLocal}
                onChange={(e) => setDeadlineLocal(e.target.value)}
                className="w-full border rounded-xl px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('schoolShop.fieldProducts')} ({selectedIds.length}/4)
              </label>
              <div className="max-h-56 overflow-y-auto border rounded-xl divide-y">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      disabled={!selectedIds.includes(p.id) && selectedIds.length >= 4}
                    />
                    <span className="flex-1">{p.name}</span>
                    <span className="text-gray-500 text-sm">€{Number(p.price).toFixed(2)}</span>
                  </label>
                ))}
              </div>
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? t('schoolShop.creating') : t('schoolShop.createBtn')}
            </button>
          </form>

          <h2 className="font-semibold text-gray-900 mb-3">{t('schoolShop.listTitle')}</h2>
          {weeks.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('schoolShop.noWeeks')}</p>
          ) : (
            <ul className="space-y-3">
              {weeks.map((w) => (
                <li key={w.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900">{w.title}</div>
                    <div className="text-sm text-gray-600">
                      {t('schoolShop.fieldCode')}: <code className="bg-gray-100 px-1 rounded">{w.access_code}</code>
                    </div>
                    <div className="text-sm text-gray-600">
                      {t('schoolShop.fieldDeadline')}: {new Date(w.order_deadline).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {(w.products || []).map((r) => productName(r.product_id)).join(', ')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openLabels(w)}
                      className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                      {t('schoolShop.labelsBtn')}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteWeek(w.id)}
                      className="text-sm px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      {t('schoolShop.deleteWeek')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {labelsWeek && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">{labelsWeek.title} — {t('schoolShop.labelsBtn')}</h3>
              <button type="button" className="text-gray-500 hover:text-gray-800 text-xl px-2" onClick={() => setLabelsWeek(null)}>
                ×
              </button>
            </div>
            <pre className="p-4 text-xs overflow-auto flex-1 bg-gray-50">{labelsJson}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
