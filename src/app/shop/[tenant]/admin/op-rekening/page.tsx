'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/i18n'
import { adminDb } from '@/lib/admin-db-client'
import { getBelgiumDateString } from '@/lib/belgium-date-bounds'
import {
  groupOnAccountEntriesByDate,
  isOnAccountEntryDate,
  normalizeOnAccountCustomerName,
  onAccountMonthKey,
  parseOnAccountAmount,
  type KassaOnAccountEntry,
} from '@/lib/kassa-on-account'

export default function OpRekeningPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const tenant = params.tenant
  const [rows, setRows] = useState<KassaOnAccountEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => getBelgiumDateString().slice(0, 7))
  const [name, setName] = useState('')
  const [entryDate, setEntryDate] = useState(() => getBelgiumDateString())
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const result = await adminDb.select<KassaOnAccountEntry[]>('kassa_on_account', {
      tenantSlug: tenant,
      order: { column: 'entry_date', ascending: false },
    })
    if (result.ok && Array.isArray(result.data)) {
      setRows(result.data)
      setError('')
    } else {
      setRows([])
      setError(result.error || t('kassaOnAccount.loadFailed'))
    }
    setLoading(false)
  }, [t, tenant])

  useEffect(() => {
    void load()
  }, [load])

  const monthRows = useMemo(
    () => rows.filter((r) => onAccountMonthKey(r.entry_date) === month),
    [month, rows],
  )
  const groups = useMemo(() => groupOnAccountEntriesByDate(monthRows), [monthRows])
  const openTotal = monthRows.filter((r) => !r.is_paid).reduce((s, r) => s + Number(r.amount || 0), 0)

  const addRow = async () => {
    const customer_name = normalizeOnAccountCustomerName(name)
    const parsed = parseOnAccountAmount(amount)
    if (!customer_name || !isOnAccountEntryDate(entryDate) || parsed <= 0) {
      setError(t('kassaOnAccount.invalidForm'))
      return
    }
    setSaving(true)
    const result = await adminDb.insert(
      'kassa_on_account',
      {
        tenant_slug: tenant,
        customer_name,
        entry_date: entryDate,
        amount: parsed,
        is_paid: false,
      },
      { tenantSlug: tenant },
    )
    setSaving(false)
    if (!result.ok) {
      setError(result.error || t('kassaOnAccount.saveFailed'))
      return
    }
    setName('')
    setAmount('')
    setError('')
    await load()
  }

  const setPaid = async (row: KassaOnAccountEntry, is_paid: boolean) => {
    const result = await adminDb.update(
      'kassa_on_account',
      { is_paid, updated_at: new Date().toISOString() },
      { id: row.id, tenant_slug: tenant },
    )
    if (result.ok) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_paid } : r)))
    }
  }

  const removeRow = async (row: KassaOnAccountEntry) => {
    const result = await adminDb.delete('kassa_on_account', { id: row.id, tenant_slug: tenant })
    if (result.ok) setRows((prev) => prev.filter((r) => r.id !== row.id))
  }

  const formatDay = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('nl-BE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('kassaOnAccount.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('kassaOnAccount.subtitle')}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">
            {t('kassaOnAccount.name')}
            <input
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            {t('kassaOnAccount.date')}
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            {t('kassaOnAccount.amount')}
            <input
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => void addRow()}
              className="w-full rounded-xl bg-[#3C4D6B] py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {t('kassaOnAccount.add')}
            </button>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700">
          {t('kassaOnAccount.month')}
          <input
            type="month"
            className="ml-2 rounded-xl border border-gray-300 px-3 py-2"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <p className="text-sm font-semibold text-gray-800">
          {t('kassaOnAccount.openTotal')}: €{openTotal.toFixed(2)}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">{t('kassaOnAccount.loading')}</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-gray-500">{t('kassaOnAccount.empty')}</p>
      ) : (
        groups.map((group) => (
          <section key={group.date} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <h2 className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-sm font-semibold capitalize text-gray-800">
              {formatDay(group.date)}
            </h2>
            <ul>
              {group.entries.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">{row.customer_name}</p>
                    <p className="text-sm text-gray-600">€{Number(row.amount).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void setPaid(row, !row.is_paid)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        row.is_paid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {row.is_paid ? t('kassaOnAccount.paid') : t('kassaOnAccount.unpaid')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeRow(row)}
                      className="text-xs text-gray-500 underline"
                    >
                      {t('kassaOnAccount.remove')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
