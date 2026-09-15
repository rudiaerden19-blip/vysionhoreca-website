'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/i18n'
import { adminDb } from '@/lib/admin-db-client'
import {
  summarizeOpenNameTabs,
  tabOpenTotalIncl,
  type KassaNameTabLine,
  type KassaNameTabRow,
} from '@/lib/kassa-name-account'
import { registerKassaNameTabPayment } from '@/lib/kassa-name-account-payment'
import { getTenantSettings } from '@/lib/admin-api'
import type { KassaPaymentMethod } from '@/lib/kassa-cart-types'

export default function OpRekeningV2Client({ tenant }: { tenant: string }) {
  const { t } = useLanguage()
  const [tabs, setTabs] = useState<KassaNameTabRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<KassaPaymentMethod>('CASH')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setLoading(true)
    const tabRes = await adminDb.select<KassaNameTabRow[]>('kassa_name_tabs', {
      tenantSlug: tenant,
      match: { tenant_slug: tenant },
      limit: 200,
    })
    await getTenantSettings(tenant)
    if (tabRes.ok && Array.isArray(tabRes.data)) {
      setTabs(tabRes.data)
      setError(null)
    } else {
      setTabs([])
      setError(tabRes.error || t('kassaNameAccount.loadFailed'))
    }
    setLoading(false)
  }, [tenant, t])

  useEffect(() => {
    void load()
  }, [load])

  const openSummary = useMemo(() => summarizeOpenNameTabs(tabs), [tabs])
  const openTotal = useMemo(
    () => openSummary.reduce((s, x) => s + x.remaining, 0),
    [openSummary],
  )

  const selected = tabs.find((r) => r.id === selectedId) ?? null
  const selectedLines = (selected?.items ?? []) as KassaNameTabLine[]
  const selectedOpen = tabOpenTotalIncl(selectedLines)

  useEffect(() => {
    if (selected) setPayAmount(selectedOpen.toFixed(2))
  }, [selected, selectedOpen])

  const registerPayment = async () => {
    if (!selected) return
    const amount = parseFloat(payAmount.replace(',', '.'))
    setSaving(true)
    setError(null)
    const res = await registerKassaNameTabPayment({
      tenantSlug: tenant,
      tab: selected,
      amountEur: amount,
      paymentMethod: payMethod,
    })
    setSaving(false)
    if (!res.ok) {
      if (res.error === 'amount_too_high') setError(t('kassaNameAccount.amountTooHigh'))
      else if (res.error === 'invalid_amount') setError(t('kassaNameAccount.invalidAmount'))
      else setError(res.error || t('kassaNameAccount.payFailed'))
      return
    }
    setSelectedId(null)
    void load()
  }

  const money = (n: number) => `€ ${n.toFixed(2).replace('.', ',')}`

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('kassaOnAccount.title')}</h1>
          <p className="mt-1 text-sm text-gray-600">{t('kassaNameAccount.subtitleV2')}</p>
        </div>
        <Link
          href={`/shop/${tenant}/admin/kassa`}
          className="rounded-xl bg-[#3C4D6B] px-4 py-2.5 text-sm font-semibold text-white"
        >
          {t('kassaNameAccount.backToKassa')}
        </Link>
      </div>

      <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
        <span className="font-bold text-red-800">{t('kassaOnAccount.openTotal')}</span>
        <span className="ml-2 tabular-nums font-bold text-red-800">{money(openTotal)}</span>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-gray-500">{t('kassaOnAccount.loading')}</p>
      ) : openSummary.length === 0 ? (
        <p className="text-sm text-gray-500">{t('kassaOnAccount.quickListEmpty')}</p>
      ) : (
        <ul className="space-y-3">
          {openSummary.map((person) => {
            const row = tabs.find((r) => r.id === person.id)!
            const lines = row.items as KassaNameTabLine[]
            const isSel = selectedId === person.id
            return (
              <li key={person.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-4 text-left"
                  onClick={() => setSelectedId(isSel ? null : person.id)}
                >
                  <span className="text-lg font-semibold">{person.name}</span>
                  <span className="tabular-nums font-bold text-red-700">{money(person.remaining)}</span>
                </button>
                {isSel ? (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-2">
                    <ul className="mb-4 space-y-1 text-sm text-gray-700">
                      {lines.map((line) => (
                        <li key={line.cartKey}>
                          {line.quantity}× {line.product.name}
                          {' — '}
                          {money(line.unpaidIncl)}
                        </li>
                      ))}
                    </ul>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('kassaNameAccount.payAmount')}
                      <input
                        type="text"
                        inputMode="decimal"
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                      />
                    </label>
                    <div className="mt-3 flex gap-2">
                      {(['CASH', 'CARD'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPayMethod(m)}
                          className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                            payMethod === m ? 'bg-[#3C4D6B] text-white' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {m === 'CASH' ? t('kassaApp.payCash') : t('kassaApp.payCard')}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void registerPayment()}
                      className="mt-4 w-full rounded-xl bg-green-600 py-3 font-semibold text-white disabled:opacity-50"
                    >
                      {t('kassaNameAccount.registerPayment')}
                    </button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
