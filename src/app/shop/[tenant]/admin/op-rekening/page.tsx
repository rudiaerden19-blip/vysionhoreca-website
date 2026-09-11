'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from 'react'

const ADMIN_SCROLL = '[data-vysion-admin-scroll]'

/** Kassa-toetsenbord ligt vaak over het scherm; schuif het veld daarboven. */
function scrollInputAboveKeyboard(input: HTMLElement) {
  const scroller =
    input.closest(ADMIN_SCROLL) ?? document.querySelector(ADMIN_SCROLL)
  requestAnimationFrame(() => {
    if (!(scroller instanceof HTMLElement)) {
      input.scrollIntoView({ block: 'center', inline: 'nearest' })
      return
    }
    const box = input.getBoundingClientRect()
    const pane = scroller.getBoundingClientRect()
    const vv = window.visualViewport
    const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
    const oskCover = Math.max(0, window.innerHeight - visibleBottom)
    const reserve = Math.max(oskCover, Math.round(window.innerHeight * 0.42), 280)
    const targetTop = pane.top + 72
    const targetBottom = window.innerHeight - reserve - 12
    if (box.top < targetTop || box.bottom > targetBottom) {
      scroller.scrollTop += box.top - targetTop
    }
  })
}

function onAccountFieldFocus(e: FocusEvent<HTMLInputElement>) {
  scrollInputAboveKeyboard(e.currentTarget)
}
import { useLanguage } from '@/i18n'
import { adminDb } from '@/lib/admin-db-client'
import { getBelgiumDateString } from '@/lib/belgium-date-bounds'
import {
  clampOnAccountPaid,
  formatOnAccountDayShort,
  groupOnAccountEntriesByCustomer,
  isOnAccountEntryDate,
  normalizeOnAccountCustomerName,
  onAccountCustomerKey,
  onAccountMonthKey,
  onAccountOpenDaysForCustomer,
  onAccountRemaining,
  parseOnAccountAmount,
  parseOnAccountMoney,
  summarizeOnAccountOpenByName,
  filterOnAccountNamesByQuery,
  uniqueOnAccountNames,
  allocateOnAccountPayment,
  onAccountCustomerTotals,
  rowsForOnAccountCustomer,
  type KassaOnAccountEntry,
} from '@/lib/kassa-on-account'

function OnAccountRowEdit({
  name,
  customerRows,
  onSavePaid,
  onRemove,
}: {
  name: string
  customerRows: KassaOnAccountEntry[]
  onSavePaid: (paid: number) => void
  onRemove: (row: KassaOnAccountEntry) => void
}) {
  const { t } = useLanguage()
  const totals = onAccountCustomerTotals(customerRows)
  const [paidDraft, setPaidDraft] = useState(() => totals.paid.toFixed(2))
  const [remainDraft, setRemainDraft] = useState(() => totals.remaining.toFixed(2))
  useEffect(() => {
    setPaidDraft(totals.paid.toFixed(2))
    setRemainDraft(totals.remaining.toFixed(2))
  }, [totals.paid, totals.remaining])

  const settled = totals.remaining <= 0
  const days = [...customerRows].sort(
    (a, b) => a.entry_date.localeCompare(b.entry_date) || a.id.localeCompare(b.id),
  )

  const commitPaidDraft = () => {
    const parsed = parseOnAccountMoney(paidDraft)
    if (parsed == null) return
    const next = clampOnAccountPaid(totals.total, parsed)
    if (next === totals.paid) return
    onSavePaid(next)
  }

  const money = (n: number) => `€ ${n.toFixed(2).replace('.', ',')}`

  return (
    <article
      id={`on-account-name-${onAccountCustomerKey(name)}`}
      className="scroll-mt-20 rounded-2xl border border-gray-200 bg-white px-4 py-5 shadow-sm sm:px-5"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-lg font-semibold text-gray-900">{name}</p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            settled ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {settled ? t('kassaOnAccount.paid') : t('kassaOnAccount.unpaid')}
        </span>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
        <ul className="space-y-2">
          {days.map((day) => (
            <li key={day.id} className="flex items-center justify-between gap-3">
              <span>
                {formatOnAccountDayShort(day.entry_date)}
                <span className="ml-2 tabular-nums font-medium">{money(onAccountRemaining(day))}</span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(day)}
                className="min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold text-gray-600 underline"
              >
                {t('kassaOnAccount.remove')}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex justify-between gap-4 border-t border-red-200 pt-2 font-bold text-red-700">
          <span>{t('kassaOnAccount.allDaysOpen')}</span>
          <span className="tabular-nums">{money(totals.remaining)}</span>
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <label className="block text-sm font-medium text-gray-700">
          {t('kassaOnAccount.alreadyPaid')}
          <input
            className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 text-base"
            inputMode="decimal"
            value={paidDraft}
            onChange={(e) => {
              const next = e.target.value
              setPaidDraft(next)
              const parsed = parseOnAccountMoney(next)
              if (parsed != null) {
                setRemainDraft(clampOnAccountPaid(totals.total, totals.total - parsed).toFixed(2))
              }
            }}
            onFocus={onAccountFieldFocus}
            onBlur={commitPaidDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitPaidDraft()
            }}
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          {t('kassaOnAccount.remaining')}
          <input
            className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 text-base"
            inputMode="decimal"
            value={remainDraft}
            onChange={(e) => {
              const next = e.target.value
              setRemainDraft(next)
              const parsed = parseOnAccountMoney(next)
              if (parsed != null) {
                setPaidDraft(clampOnAccountPaid(totals.total, totals.total - parsed).toFixed(2))
              }
            }}
            onFocus={onAccountFieldFocus}
            onBlur={commitPaidDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitPaidDraft()
            }}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={commitPaidDraft}
          className="min-h-14 w-full rounded-xl bg-[#3C4D6B] px-8 text-base font-semibold text-white sm:w-auto"
        >
          {t('kassaOnAccount.savePaid')}
        </button>
      </div>
    </article>
  )
}

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
  const lastJumpKey = useRef('')

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

  useEffect(() => {
    const onViewport = () => {
      const el = document.activeElement
      if (el instanceof HTMLInputElement) scrollInputAboveKeyboard(el)
    }
    window.visualViewport?.addEventListener('resize', onViewport)
    window.visualViewport?.addEventListener('scroll', onViewport)
    return () => {
      window.visualViewport?.removeEventListener('resize', onViewport)
      window.visualViewport?.removeEventListener('scroll', onViewport)
    }
  }, [])

  const monthRows = useMemo(
    () => rows.filter((r) => onAccountMonthKey(r.entry_date) === month),
    [month, rows],
  )
  const customers = useMemo(() => groupOnAccountEntriesByCustomer(monthRows), [monthRows])
  const openNames = useMemo(() => summarizeOnAccountOpenByName(monthRows), [monthRows])
  const openTotal = monthRows.reduce((s, r) => s + onAccountRemaining(r), 0)
  const existingOpen = useMemo(
    () => onAccountOpenDaysForCustomer(monthRows, name),
    [monthRows, name],
  )
  const addAmount = parseOnAccountAmount(amount)
  const knownNames = useMemo(() => uniqueOnAccountNames(monthRows), [monthRows])
  const nameMatches = useMemo(
    () => filterOnAccountNamesByQuery(knownNames, name),
    [knownNames, name],
  )
  const visibleOpenNames = useMemo(() => {
    if (!onAccountCustomerKey(name)) return openNames
    const allowed = new Set(nameMatches.map((n) => onAccountCustomerKey(n)))
    return openNames.filter((item) => allowed.has(onAccountCustomerKey(item.name)))
  }, [name, nameMatches, openNames])

  const euro = (n: number) => `€ ${n.toFixed(2).replace('.', ',')}`

  const jumpToName = useCallback((customerName: string) => {
    const key = onAccountCustomerKey(customerName)
    lastJumpKey.current = key
    window.setTimeout(() => {
      document.getElementById(`on-account-name-${key}`)?.scrollIntoView({ block: 'start' })
    }, 50)
  }, [])

  const pickName = (customerName: string) => {
    setName(customerName)
    jumpToName(customerName)
  }

  useEffect(() => {
    const q = onAccountCustomerKey(name)
    if (q.length < 2 || nameMatches.length !== 1) return
    const only = nameMatches[0]
    const key = onAccountCustomerKey(only)
    if (lastJumpKey.current === key) return
    setName(only)
    jumpToName(only)
  }, [jumpToName, name, nameMatches])

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
        amount_paid: 0,
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

  const savePaid = async (customerName: string, paid: number) => {
    const customerRows = rowsForOnAccountCustomer(monthRows, customerName)
    const allocations = allocateOnAccountPayment(customerRows, paid)
    const now = new Date().toISOString()
    const results = await Promise.all(
      allocations.map((a) =>
        adminDb.update(
          'kassa_on_account',
          { amount_paid: a.amount_paid, is_paid: a.is_paid, updated_at: now },
          { id: a.id, tenant_slug: tenant },
        ),
      ),
    )
    if (results.every((r) => r.ok)) {
      const byId = new Map(allocations.map((a) => [a.id, a]))
      setRows((prev) =>
        prev.map((r) => {
          const a = byId.get(r.id)
          return a ? { ...r, amount_paid: a.amount_paid, is_paid: a.is_paid } : r
        }),
      )
    }
  }

  const removeRow = async (row: KassaOnAccountEntry) => {
    const result = await adminDb.delete('kassa_on_account', { id: row.id, tenant_slug: tenant })
    if (result.ok) setRows((prev) => prev.filter((r) => r.id !== row.id))
  }

  const quickList = (
    <aside className="rounded-2xl border-2 border-red-500 bg-red-50 p-4 shadow-sm md:sticky md:top-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold uppercase tracking-wide text-red-700">{t('kassaOnAccount.quickList')}</h2>
        <p className="text-lg font-bold tabular-nums text-red-700">{euro(openTotal)}</p>
      </div>
      {openNames.length === 0 ? (
        <p className="mt-3 text-sm text-red-700/70">{t('kassaOnAccount.quickListEmpty')}</p>
      ) : visibleOpenNames.length === 0 ? (
        <p className="mt-3 text-sm text-red-700/70">{t('kassaOnAccount.quickListEmpty')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-red-200">
          {visibleOpenNames.map((item) => (
            <li key={onAccountCustomerKey(item.name)}>
              <button
                type="button"
                onClick={() => pickName(item.name)}
                className="flex w-full items-center justify-between gap-3 py-2.5 text-left"
              >
                <span className="font-medium text-gray-900">{item.name}</span>
                <span className="shrink-0 text-base font-bold tabular-nums text-red-700">{euro(item.remaining)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 pb-[50vh] sm:p-6 sm:pb-[50vh]">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('kassaOnAccount.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('kassaOnAccount.subtitle')}</p>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="md:col-start-2 md:row-start-1">{quickList}</div>
      <div className="space-y-8 md:col-start-1 md:row-start-1">

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid grid-cols-1 gap-5">
          <label className="block text-sm font-medium text-gray-700">
            {t('kassaOnAccount.name')}
            <input
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 text-base"
              value={name}
              onChange={(e) => {
                lastJumpKey.current = ''
                setName(e.target.value)
              }}
              onFocus={onAccountFieldFocus}
              autoComplete="off"
            />
          </label>
          {onAccountCustomerKey(name) && nameMatches.length > 0 ? (
            <div className="space-y-2">
              {nameMatches.map((match) => (
                <button
                  key={onAccountCustomerKey(match)}
                  type="button"
                  onClick={() => pickName(match)}
                  className="flex min-h-12 w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left"
                >
                  <span className="font-semibold text-gray-900">{match}</span>
                  <span className="text-sm font-medium text-[#3C4D6B]">{t('kassaOnAccount.goToCard')}</span>
                </button>
              ))}
            </div>
          ) : null}
          <label className="block text-sm font-medium text-gray-700">
            {t('kassaOnAccount.date')}
            <input
              type="date"
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 text-base"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              onFocus={onAccountFieldFocus}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            {t('kassaOnAccount.amount')}
            <input
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 text-base"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={onAccountFieldFocus}
            />
          </label>
          {existingOpen.total > 0 && normalizeOnAccountCustomerName(name) ? (
            <p className="rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-950">
              <span className="font-semibold">{normalizeOnAccountCustomerName(name)}</span>
              {' — '}
              {t('kassaOnAccount.alreadyOpen')}
              {': '}
              {euro(existingOpen.total)}
              <br />
              {t('kassaOnAccount.extraDayNote')}
              {addAmount > 0 ? (
                <>
                  {' '}
                  {t('kassaOnAccount.allDaysOpen')}
                  {': '}
                  {euro(Math.round((existingOpen.total + addAmount) * 100) / 100)}
                </>
              ) : null}
            </p>
          ) : null}
          <div className="flex items-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => void addRow()}
              className="w-full rounded-xl bg-[#3C4D6B] py-3 font-semibold text-white disabled:opacity-50"
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
            onFocus={onAccountFieldFocus}
          />
        </label>
        <p className="text-sm font-bold text-red-700">
          {t('kassaOnAccount.openTotal')}
          <span className="ml-2 tabular-nums">{euro(openTotal)}</span>
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">{t('kassaOnAccount.loading')}</p>
      ) : customers.length === 0 ? (
        <p className="text-sm text-gray-500">{t('kassaOnAccount.empty')}</p>
      ) : (
        <div className="space-y-4">
          {customers.map((person) => (
            <OnAccountRowEdit
              key={onAccountCustomerKey(person.name)}
              name={person.name}
              customerRows={person.entries}
              onSavePaid={(paid) => void savePaid(person.name, paid)}
              onRemove={(r) => void removeRow(r)}
            />
          ))}
        </div>
      )}
      </div>
      </div>
    </div>
  )
}
