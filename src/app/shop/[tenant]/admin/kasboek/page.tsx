'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/i18n'
import { supabase } from '@/lib/supabase'
import {
  isKassaPosOrder,
  orderCountsTowardRevenueAndZReport,
  posOrderCashAmountForKasboek,
  type Order,
} from '@/lib/admin-api'

type OrderRow = Pick<
  Order,
  | 'id'
  | 'created_at'
  | 'order_number'
  | 'customer_name'
  | 'customer_notes'
  | 'total'
  | 'payment_method'
  | 'order_type'
  | 'status'
  | 'payment_status'
>

type LedgerRow = OrderRow & { cashIn: number; runningBalance: number }

export default function KasboekPage({ params }: { params: { tenant: string } }) {
  const { t, locale } = useLanguage()
  const tenantSlug = params.tenant
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<LedgerRow[]>([])
  const [days, setDays] = useState<30 | 60 | 90>(30)

  const load = useCallback(async () => {
    setLoading(true)
    const start = new Date()
    start.setDate(start.getDate() - days)
    start.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, created_at, order_number, customer_name, customer_notes, total, payment_method, order_type, status, payment_status'
      )
      .eq('tenant_slug', tenantSlug)
      .gte('created_at', start.toISOString())
      .order('created_at', { ascending: true })
      .limit(3000)

    if (error) {
      console.error('kasboek load', error)
      setRows([])
      setLoading(false)
      return
    }

    const list = (data || []) as OrderRow[]
    const cashOrders = list.filter(
      (o) =>
        isKassaPosOrder(o) &&
        orderCountsTowardRevenueAndZReport(o) &&
        posOrderCashAmountForKasboek(o) > 0
    )

    let run = 0
    const withBalance: LedgerRow[] = cashOrders.map((o) => {
      const cashIn = posOrderCashAmountForKasboek(o)
      run += cashIn
      return { ...o, cashIn, runningBalance: run }
    })

    setRows(withBalance.reverse())
    setLoading(false)
  }, [tenantSlug, days])

  useEffect(() => {
    void load()
  }, [load])

  const fmtMoney = useMemo(
    () => (n: number) =>
      new Intl.NumberFormat(locale === 'nl' ? 'nl-BE' : locale, {
        style: 'currency',
        currency: 'EUR',
      }).format(n),
    [locale]
  )

  const fmtWhen = useMemo(
    () => (iso: string | undefined) => {
      if (!iso) return '—'
      return new Date(iso).toLocaleString(locale === 'nl' ? 'nl-BE' : locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    },
    [locale]
  )

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-emerald-500 border-t-transparent"
          />
          <p className="text-gray-500">{t('kasboekPage.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('kasboekPage.title')}</h1>
          <p className="text-gray-600">{t('kasboekPage.subtitle')}</p>
        </div>
        <div className="flex rounded-xl bg-gray-100 p-1">
          {(
            [
              [30, 'kasboekPage.period30'],
              [60, 'kasboekPage.period60'],
              [90, 'kasboekPage.period90'],
            ] as const
          ).map(([d, key]) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                days === d ? 'bg-white text-gray-900 shadow' : 'text-gray-500'
              }`}
            >
              {t(key)}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {t('kasboekPage.disclaimer')}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          {t('kasboekPage.empty')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">{t('kasboekPage.colWhen')}</th>
                <th className="px-4 py-3">{t('kasboekPage.colReceipt')}</th>
                <th className="px-4 py-3">{t('kasboekPage.colDescription')}</th>
                <th className="px-4 py-3 text-right">{t('kasboekPage.colCashIn')}</th>
                <th className="px-4 py-3 text-right">{t('kasboekPage.colBalance')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/80">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{fmtWhen(r.created_at)}</td>
                  <td className="px-4 py-3 font-mono text-gray-800">#{r.order_number ?? '—'}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-gray-700" title={r.customer_name || ''}>
                    {r.customer_name || r.customer_notes || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-700">{fmtMoney(r.cashIn)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtMoney(r.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
