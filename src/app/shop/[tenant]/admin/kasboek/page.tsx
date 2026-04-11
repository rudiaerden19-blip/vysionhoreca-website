'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/i18n'
import { supabase } from '@/lib/supabase'
import { cache, cacheKey } from '@/lib/cache'
import {
  isKassaPosOrder,
  orderCountsTowardRevenueAndZReport,
  orderPaymentMethodBucket,
  type Order,
} from '@/lib/admin-api'

type KasboekManualLine = {
  id: string
  tenant_slug: string
  line_date: string
  description: string
  inkomsten: number
  uitgaven: number
  created_at: string
  updated_at: string
}

type DisplayLine = KasboekManualLine & { saldo: number }

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

type VariableCostRow = {
  id: string
  date: string
  amount: number
  description: string
  supplier: string | null
  category: string | null
  invoice_number: string | null
  created_at?: string | null
}

export type KasboekLedgerRow = {
  id: string
  occurredAt: string
  source: 'order' | 'purchase'
  receiptRef: string
  description: string
  channelKey: 'kasboekPage.channelPos' | 'kasboekPage.channelOnline' | 'kasboekPage.channelPurchase'
  paymentKey: 'kasboekPage.payCash' | 'kasboekPage.payCard' | 'kasboekPage.payOnline' | null
  amountSigned: number
  runningBalance: number
}

function monthPartIndex(d: Date): number {
  const fd = new Date(d.getFullYear(), d.getMonth(), 1).getDay()
  const mondayBased = (d.getDate() + ((fd + 6) % 7) - 1) / 7
  return Math.floor(mondayBased) + 1
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function KasboekPage({ params }: { params: { tenant: string } }) {
  const { t, locale } = useLanguage()
  const tenantSlug = params.tenant
  const [tab, setTab] = useState<'manual' | 'reference'>('manual')

  const [loading, setLoading] = useState(true)
  const [yearLines, setYearLines] = useState<KasboekManualLine[]>([])
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())

  const [openingBalance, setOpeningBalance] = useState(0)
  const [openingDraft, setOpeningDraft] = useState('0')
  const [openingDateDraft, setOpeningDateDraft] = useState('')
  const [savingOpening, setSavingOpening] = useState(false)

  const [formDate, setFormDate] = useState(() => ymd(new Date()))
  const [formDesc, setFormDesc] = useState('')
  const [formIn, setFormIn] = useState('')
  const [formOut, setFormOut] = useState('')
  const [savingLine, setSavingLine] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const yStart = `${viewYear}-01-01`
    const yEnd = `${viewYear}-12-31`

    const [linesRes, settingsRes] = await Promise.all([
      supabase
        .from('tenant_kasboek_manual_lines')
        .select('*')
        .eq('tenant_slug', tenantSlug)
        .gte('line_date', yStart)
        .lte('line_date', yEnd)
        .order('line_date', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(8000),
      supabase
        .from('tenant_settings')
        .select('kasboek_opening_balance, kasboek_opening_balance_date')
        .eq('tenant_slug', tenantSlug)
        .maybeSingle(),
    ])

    if (linesRes.error && linesRes.error.code !== 'PGRST116' && !linesRes.error.message?.includes('does not exist')) {
      console.error('kasboek lines', linesRes.error)
    }

    const lines = (linesRes.data || []) as KasboekManualLine[]
    setYearLines(lines)

    const ob = Number((settingsRes.data as { kasboek_opening_balance?: number } | null)?.kasboek_opening_balance) || 0
    const od = (settingsRes.data as { kasboek_opening_balance_date?: string | null } | null)?.kasboek_opening_balance_date
    setOpeningBalance(ob)
    setOpeningDraft(String(ob))
    setOpeningDateDraft(od || '')

    setLoading(false)
  }, [tenantSlug, viewYear])

  useEffect(() => {
    void load()
  }, [load])

  const monthStart = useMemo(() => new Date(viewYear, viewMonth, 1), [viewYear, viewMonth])
  const monthEnd = useMemo(() => new Date(viewYear, viewMonth + 1, 0), [viewYear, viewMonth])
  const monthStartStr = useMemo(() => ymd(monthStart), [monthStart])
  const monthEndStr = useMemo(() => ymd(monthEnd), [monthEnd])

  const { displayLines, weekBuckets, monthIncome, monthExpense } = useMemo(() => {
    let bal = openingBalance
    for (const l of yearLines) {
      if (l.line_date < monthStartStr) {
        bal += Number(l.inkomsten) - Number(l.uitgaven)
      }
    }

    const inMonth = yearLines.filter((l) => l.line_date >= monthStartStr && l.line_date <= monthEndStr)
    const display: DisplayLine[] = []
    for (const l of inMonth) {
      bal += Number(l.inkomsten) - Number(l.uitgaven)
      display.push({ ...l, saldo: bal })
    }

    const weeks: Record<number, { ink: number; uit: number }> = {}
    for (const l of inMonth) {
      const d = new Date(l.line_date + 'T12:00:00')
      const part = monthPartIndex(d)
      if (!weeks[part]) weeks[part] = { ink: 0, uit: 0 }
      weeks[part].ink += Number(l.inkomsten)
      weeks[part].uit += Number(l.uitgaven)
    }

    const mi = inMonth.reduce((s, l) => s + Number(l.inkomsten), 0)
    const me = inMonth.reduce((s, l) => s + Number(l.uitgaven), 0)

    return { displayLines: display, weekBuckets: weeks, monthIncome: mi, monthExpense: me }
  }, [yearLines, monthStartStr, monthEndStr, openingBalance])

  const fmtMoney = useMemo(
    () => (n: number) =>
      new Intl.NumberFormat(locale === 'nl' ? 'nl-BE' : locale, {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n),
    [locale]
  )

  const fmtDate = useMemo(
    () => (iso: string) =>
      new Date(iso + 'T12:00:00').toLocaleDateString(locale === 'nl' ? 'nl-BE' : locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    [locale]
  )

  const monthTitle = useMemo(
    () =>
      new Date(viewYear, viewMonth, 1).toLocaleDateString(locale === 'nl' ? 'nl-BE' : locale, {
        month: 'long',
        year: 'numeric',
      }),
    [locale, viewYear, viewMonth]
  )

  const saveOpening = async () => {
    setSavingOpening(true)
    const v = parseFloat(openingDraft.replace(',', '.')) || 0
    const { error } = await supabase
      .from('tenant_settings')
      .update({
        kasboek_opening_balance: v,
        kasboek_opening_balance_date: openingDateDraft || null,
      })
      .eq('tenant_slug', tenantSlug)
    if (!error) {
      setOpeningBalance(v)
      cache.invalidate(cacheKey('tenant_settings', tenantSlug))
    }
    setSavingOpening(false)
  }

  const resetForm = () => {
    setFormDate(ymd(new Date()))
    setFormDesc('')
    setFormIn('')
    setFormOut('')
    setEditingId(null)
  }

  const saveLine = async () => {
    const ink = parseFloat(formIn.replace(',', '.')) || 0
    const uit = parseFloat(formOut.replace(',', '.')) || 0
    if (ink <= 0 && uit <= 0) {
      alert(t('kasboekPage.errorNeedAmount'))
      return
    }
    if (!formDesc.trim()) {
      alert(t('kasboekPage.errorNeedDescription'))
      return
    }

    setSavingLine(true)
    const row = {
      tenant_slug: tenantSlug,
      line_date: formDate,
      description: formDesc.trim(),
      inkomsten: ink,
      uitgaven: uit,
    }

    const q = editingId
      ? supabase.from('tenant_kasboek_manual_lines').update(row).eq('id', editingId).eq('tenant_slug', tenantSlug)
      : supabase.from('tenant_kasboek_manual_lines').insert(row)

    const { error } = await q
    if (error) {
      console.error(error)
      alert(error.message || t('kasboekPage.saveFailed'))
    } else {
      resetForm()
      await load()
    }
    setSavingLine(false)
  }

  const startEdit = (l: KasboekManualLine) => {
    setEditingId(l.id)
    setFormDate(l.line_date)
    setFormDesc(l.description)
    setFormIn(Number(l.inkomsten) > 0 ? String(l.inkomsten) : '')
    setFormOut(Number(l.uitgaven) > 0 ? String(l.uitgaven) : '')
  }

  const deleteLine = async (id: string) => {
    if (!confirm(t('kasboekPage.confirmDelete'))) return
    const { error } = await supabase.from('tenant_kasboek_manual_lines').delete().eq('id', id).eq('tenant_slug', tenantSlug)
    if (!error) await load()
  }

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  const shiftYear = (delta: number) => {
    setViewYear((y) => y + delta)
  }

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('kasboekPage.title')}</h1>
        <p className="text-gray-600">{t('kasboekPage.subtitleManual')}</p>
        <p className="mt-2 text-sm text-gray-500">{t('kasboekPage.retentionNote')}</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab('manual')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === 'manual' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
          }`}
        >
          {t('kasboekPage.tabManual')}
        </button>
        <button
          type="button"
          onClick={() => setTab('reference')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === 'reference' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
          }`}
        >
          {t('kasboekPage.tabReference')}
        </button>
      </div>

      {tab === 'manual' ? (
        <>
          <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">{t('kasboekPage.openingSection')}</h2>
            <p className="mb-4 text-sm text-gray-600">{t('kasboekPage.openingHint')}</p>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500">{t('kasboekPage.openingBalanceLabel')}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={openingDraft}
                  onChange={(e) => setOpeningDraft(e.target.value)}
                  className="mt-1 w-40 rounded-lg border border-gray-300 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">{t('kasboekPage.openingDateLabel')}</label>
                <input
                  type="date"
                  value={openingDateDraft}
                  onChange={(e) => setOpeningDateDraft(e.target.value)}
                  className="mt-1 rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <button
                type="button"
                disabled={savingOpening}
                onClick={() => void saveOpening()}
                className="rounded-xl bg-[#3C4D6B] px-5 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
              >
                {savingOpening ? t('kasboekPage.saving') : t('kasboekPage.saveOpening')}
              </button>
            </div>
          </section>

          <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="rounded-lg border px-3 py-1 text-sm" onClick={() => shiftYear(-1)}>
                −
              </button>
              <span className="min-w-[3rem] text-center font-semibold">{viewYear}</span>
              <button type="button" className="rounded-lg border px-3 py-1 text-sm" onClick={() => shiftYear(1)}>
                +
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-lg border px-3 py-1 text-sm" onClick={() => shiftMonth(-1)}>
                ←
              </button>
              <span className="min-w-[10rem] text-center font-semibold capitalize">{monthTitle}</span>
              <button type="button" className="rounded-lg border px-3 py-1 text-sm" onClick={() => shiftMonth(1)}>
                →
              </button>
            </div>
          </section>

          <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
            <h3 className="mb-3 font-semibold text-gray-900">{editingId ? t('kasboekPage.editLine') : t('kasboekPage.addLine')}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="text-xs text-gray-600">{t('kasboekPage.formDate')}</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-600">{t('kasboekPage.formDescription')}</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder={t('kasboekPage.formDescriptionPh')}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">{t('kasboekPage.formIncome')}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formIn}
                  onChange={(e) => setFormIn(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">{t('kasboekPage.formExpense')}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formOut}
                  onChange={(e) => setFormOut(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={savingLine}
                onClick={() => void saveLine()}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingLine ? t('kasboekPage.saving') : editingId ? t('kasboekPage.updateLine') : t('kasboekPage.saveLine')}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="rounded-xl border border-gray-300 px-5 py-2 text-sm">
                  {t('kasboekPage.cancelLine')}
                </button>
              )}
            </div>
          </section>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-600">
                <tr>
                  <th className="px-4 py-3">{t('kasboekPage.colDate')}</th>
                  <th className="px-4 py-3">{t('kasboekPage.colDescription')}</th>
                  <th className="px-4 py-3 text-right">{t('kasboekPage.colIncome')}</th>
                  <th className="px-4 py-3 text-right">{t('kasboekPage.colExpense')}</th>
                  <th className="px-4 py-3 text-right">{t('kasboekPage.colBalance')}</th>
                  <th className="px-4 py-3 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayLines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                      {t('kasboekPage.emptyMonth')}
                    </td>
                  </tr>
                ) : (
                  displayLines.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/80">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-800">{fmtDate(r.line_date)}</td>
                      <td className="max-w-[280px] px-4 py-3 text-gray-800">{r.description}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">
                        {Number(r.inkomsten) > 0 ? fmtMoney(Number(r.inkomsten)) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-rose-700">
                        {Number(r.uitgaven) > 0 ? fmtMoney(Number(r.uitgaven)) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">{fmtMoney(r.saldo)}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" className="text-blue-600 hover:underline text-xs mr-2" onClick={() => startEdit(r)}>
                          {t('kasboekPage.edit')}
                        </button>
                        <button type="button" className="text-red-600 hover:underline text-xs" onClick={() => void deleteLine(r.id)}>
                          {t('kasboekPage.delete')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 font-semibold text-gray-900">{t('kasboekPage.weekSummary')}</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="pb-2">{t('kasboekPage.weekCol')}</th>
                    <th className="pb-2 text-right">{t('kasboekPage.colIncome')}</th>
                    <th className="pb-2 text-right">{t('kasboekPage.colExpense')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(weekBuckets)
                    .map(Number)
                    .sort((a, b) => a - b)
                    .map((wk) => (
                      <tr key={wk} className="border-t border-gray-100">
                        <td className="py-2">{t('kasboekPage.weekPart').replace('{n}', String(wk))}</td>
                        <td className="py-2 text-right font-mono text-emerald-700">{fmtMoney(weekBuckets[wk].ink)}</td>
                        <td className="py-2 text-right font-mono text-rose-700">{fmtMoney(weekBuckets[wk].uit)}</td>
                      </tr>
                    ))}
                  {Object.keys(weekBuckets).length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-gray-500">
                        —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 font-semibold text-gray-900">{t('kasboekPage.monthTotals')}</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt>{t('kasboekPage.totalIncome')}</dt>
                  <dd className="font-mono font-semibold text-emerald-700">{fmtMoney(monthIncome)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t('kasboekPage.totalExpense')}</dt>
                  <dd className="font-mono font-semibold text-rose-700">{fmtMoney(monthExpense)}</dd>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <dt>{t('kasboekPage.net')}</dt>
                  <dd className="font-mono">{fmtMoney(monthIncome - monthExpense)}</dd>
                </div>
              </dl>
            </div>
          </section>
        </>
      ) : (
        <KasboekReferenceTab tenantSlug={tenantSlug} t={t} locale={locale} />
      )}
    </div>
  )
}

function KasboekReferenceTab({
  tenantSlug,
  t,
  locale,
}: {
  tenantSlug: string
  t: (k: string) => string
  locale: string
}) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<KasboekLedgerRow[]>([])
  const [days, setDays] = useState<30 | 60 | 90>(30)

  const load = useCallback(async () => {
    setLoading(true)
    const start = new Date()
    start.setDate(start.getDate() - days)
    start.setHours(0, 0, 0, 0)
    const startIso = start.toISOString()
    const endIso = new Date().toISOString()
    const startYmd = startIso.slice(0, 10)
    const endYmd = endIso.slice(0, 10)

    const [ordersRes, costsRes] = await Promise.all([
      supabase
        .from('orders')
        .select(
          'id, created_at, order_number, customer_name, customer_notes, total, payment_method, order_type, status, payment_status'
        )
        .eq('tenant_slug', tenantSlug)
        .gte('created_at', startIso)
        .order('created_at', { ascending: true })
        .limit(4000),
      supabase
        .from('variable_costs')
        .select('id, date, amount, description, supplier, category, invoice_number, created_at')
        .eq('tenant_slug', tenantSlug)
        .gte('date', startYmd)
        .lte('date', endYmd)
        .order('date', { ascending: true })
        .limit(2000),
    ])

    const orderList = (ordersRes.data || []) as OrderRow[]
    const costList = (costsRes.data || []) as VariableCostRow[]

    const orderRows: KasboekLedgerRow[] = orderList
      .filter((o) => orderCountsTowardRevenueAndZReport(o))
      .map((o) => {
        const total = Number(o.total) || 0
        const bucket = orderPaymentMethodBucket(o)
        const paymentKey =
          bucket === 'cash'
            ? ('kasboekPage.payCash' as const)
            : bucket === 'card'
              ? ('kasboekPage.payCard' as const)
              : ('kasboekPage.payOnline' as const)
        return {
          id: `o-${o.id}`,
          occurredAt: o.created_at || new Date().toISOString(),
          source: 'order',
          receiptRef: `#${o.order_number ?? '—'}`,
          description: (o.customer_name || o.customer_notes || '—').toString(),
          channelKey: isKassaPosOrder(o) ? 'kasboekPage.channelPos' : 'kasboekPage.channelOnline',
          paymentKey,
          amountSigned: total,
          runningBalance: 0,
        }
      })

    const purchaseRows: KasboekLedgerRow[] = costList.map((c) => {
      const amt = Number(c.amount) || 0
      const when = c.date ? `${c.date}T12:00:00.000Z` : c.created_at || new Date().toISOString()
      const desc = [c.description, c.supplier].filter(Boolean).join(' · ') || '—'
      const inv = (c.invoice_number || '').trim()
      const ref = inv || `VC-${String(c.id).replace(/-/g, '').slice(0, 10)}`
      return {
        id: `v-${c.id}`,
        occurredAt: when,
        source: 'purchase',
        receiptRef: ref,
        description: desc,
        channelKey: 'kasboekPage.channelPurchase',
        paymentKey: null,
        amountSigned: -Math.abs(amt),
        runningBalance: 0,
      }
    })

    const merged = [...orderRows, ...purchaseRows].sort((a, b) => {
      const ta = new Date(a.occurredAt).getTime()
      const tb = new Date(b.occurredAt).getTime()
      if (ta !== tb) return ta - tb
      return a.id.localeCompare(b.id)
    })

    let run = 0
    const withBalance = merged.map((r) => {
      run += r.amountSigned
      return { ...r, runningBalance: run }
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
        signDisplay: 'exceptZero',
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
    return <p className="text-gray-500">{t('kasboekPage.loading')}</p>
  }

  return (
    <div>
      <p className="mb-4 text-sm text-gray-600">{t('kasboekPage.referenceIntro')}</p>
      <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
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
            className={`rounded-lg px-4 py-2 text-sm font-medium ${days === d ? 'bg-white shadow' : 'text-gray-500'}`}
          >
            {t(key)}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-gray-500">{t('kasboekPage.emptyReference')}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs font-semibold uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2">{t('kasboekPage.colWhen')}</th>
                <th className="px-3 py-2">{t('kasboekPage.colReceipt')}</th>
                <th className="px-3 py-2">{t('kasboekPage.colChannel')}</th>
                <th className="px-3 py-2">{t('kasboekPage.colPayment')}</th>
                <th className="px-3 py-2">{t('kasboekPage.colDescription')}</th>
                <th className="px-3 py-2 text-right">{t('kasboekPage.colAmount')}</th>
                <th className="px-3 py-2 text-right">{t('kasboekPage.colBalance')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-3 py-2">{fmtWhen(r.occurredAt)}</td>
                  <td className="px-3 py-2 font-mono">{r.receiptRef}</td>
                  <td className="px-3 py-2">{t(r.channelKey)}</td>
                  <td className="px-3 py-2">{r.paymentKey ? t(r.paymentKey) : '—'}</td>
                  <td className="max-w-[180px] truncate px-3 py-2">{r.description}</td>
                  <td className={`px-3 py-2 text-right font-mono ${r.amountSigned >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {fmtMoney(r.amountSigned)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold">{fmtMoney(r.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
