'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminDb } from '@/lib/admin-db-client'
import {
  fetchAllTenantOrdersInCreatedAtRange,
  getOpeningHours,
  getTenantSettings,
} from '@/lib/admin-api'
import { addDaysToBelgiumYMD, belgiumLocalToUtcIso, getBelgiumDateString } from '@/lib/belgium-date-bounds'
import { normalizeKassaJetonDenominations } from '@/lib/kassa-jeton-math'
import {
  emptyJetonDaySale,
  parseJetonDayAmount,
  sumJetonDaySales,
  summarizeJetonOverview,
  type JetonDayRow,
  type JetonDaySale,
  type JetonOverview,
  type JetonOverviewOrder,
} from '@/lib/kassa-jeton-overview'
import { isTheLagoonTenant } from '@/lib/lagoon-kitchen-screen'
import {
  kassaSpeelsGrayChromeButtonClass,
  kassaSpeelsGreenGlossButtonClass,
} from '@/lib/kassa-pos-surface'
import type { ShiftReportClose, TenantHourRow } from '@/lib/tenant-business-day'

type Preset = 'yesterday' | 'today' | '7' | '30' | 'custom'

function fmtEuro(n: number): string {
  return `€${n.toFixed(2)}`
}

function fmtDay(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Brussels',
  })
}

function rangeForPreset(preset: Preset, today: string): { from: string; to: string } {
  if (preset === 'today') return { from: today, to: today }
  if (preset === 'yesterday') {
    const y = addDaysToBelgiumYMD(today, -1)
    return { from: y, to: y }
  }
  if (preset === '7') return { from: addDaysToBelgiumYMD(today, -6), to: today }
  return { from: addDaysToBelgiumYMD(today, -29), to: today }
}

function parseItems(raw: unknown): JetonOverviewOrder['items'] {
  if (Array.isArray(raw)) return raw as JetonOverviewOrder['items']
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export default function JetonOverzichtPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const allowed = isTheLagoonTenant(tenant)
  const today = getBelgiumDateString()
  const [preset, setPreset] = useState<Preset>('today')
  const initial = rangeForPreset('today', today)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [loading, setLoading] = useState(allowed)
  const [error, setError] = useState('')
  const [overview, setOverview] = useState<JetonOverview | null>(null)
  const [salesByDate, setSalesByDate] = useState<Record<string, JetonDaySale>>({})
  const [editDate, setEditDate] = useState<string | null>(null)
  const [draftCash, setDraftCash] = useState('')
  const [draftPin, setDraftPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [denoms, setDenoms] = useState(() => normalizeKassaJetonDenominations(300, 50))

  const load = useCallback(async () => {
    if (!allowed) return
    const start = from <= to ? from : to
    const end = from <= to ? to : from
    setLoading(true)
    setError('')
    try {
      const startISO = belgiumLocalToUtcIso(addDaysToBelgiumYMD(start, -1), '00:00')
      const endISO = belgiumLocalToUtcIso(addDaysToBelgiumYMD(end, 2), '00:00')
      const [rows, settings, hours, zResult, saleResult] = await Promise.all([
        fetchAllTenantOrdersInCreatedAtRange(
          tenant,
          startISO,
          endISO,
          'id,status,payment_status,payment_method,order_type,total,payment_split_cash,payment_split_card,created_at,items',
        ),
        getTenantSettings(tenant),
        getOpeningHours(tenant),
        adminDb.select<Array<{ report_date?: string; is_closed?: boolean | null; closed_at?: string | null }>>(
          'z_reports',
          {
            tenantSlug: tenant,
            select: 'report_date,is_closed,closed_at',
            gte: { report_date: addDaysToBelgiumYMD(start, -1) },
            lte: { report_date: addDaysToBelgiumYMD(end, 1) },
          },
        ),
        adminDb.select<
          Array<{ report_date?: string; jetons_sold?: number; cash_euro?: number; pin_euro?: number }>
        >('kassa_jeton_day_sales', {
          tenantSlug: tenant,
          select: 'report_date,jetons_sold,cash_euro,pin_euro',
          gte: { report_date: start },
          lte: { report_date: end },
        }),
      ])
      const shifts: ShiftReportClose[] = (zResult.ok && Array.isArray(zResult.data) ? zResult.data : [])
        .filter((row) => row.report_date)
        .map((row) => ({
          reportDate: String(row.report_date),
          closedAt:
            row.is_closed === false
              ? null
              : row.closed_at
                ? String(row.closed_at)
                : row.is_closed === true
                  ? belgiumLocalToUtcIso(addDaysToBelgiumYMD(String(row.report_date), 1), '00:00')
                  : null,
        }))
      const orders: JetonOverviewOrder[] = rows.map((row) => ({
        status: row.status as string | null,
        payment_status: row.payment_status as string | null,
        payment_method: row.payment_method as string | null,
        order_type: row.order_type as string | null,
        total: Number(row.total) || 0,
        payment_split_cash: row.payment_split_cash as number | null,
        payment_split_card: row.payment_split_card as number | null,
        created_at: String(row.created_at || ''),
        items: parseItems(row.items),
      }))
      const nextDenoms = normalizeKassaJetonDenominations(
        settings?.kassa_jeton_black_cents,
        settings?.kassa_jeton_white_cents,
      )
      setDenoms(nextDenoms)
      setOverview(
        summarizeJetonOverview(orders, start, end, nextDenoms, (hours || []) as TenantHourRow[], shifts),
      )
      const nextSales: Record<string, JetonDaySale> = {}
      if (saleResult.ok && Array.isArray(saleResult.data)) {
        for (const row of saleResult.data) {
          if (!row.report_date) continue
          nextSales[String(row.report_date)] = {
            jetonsSold: Number(row.jetons_sold) || 0,
            cashEuro: Number(row.cash_euro) || 0,
            pinEuro: Number(row.pin_euro) || 0,
          }
        }
      }
      setSalesByDate(nextSales)
    } catch (err) {
      setOverview(null)
      setError(err instanceof Error ? err.message : 'Laden mislukt')
    } finally {
      setLoading(false)
    }
  }, [allowed, tenant, from, to])

  useEffect(() => {
    void load()
  }, [load])

  const openEdit = (date: string) => {
    const sale = salesByDate[date] ?? emptyJetonDaySale()
    setEditDate(date)
    setDraftCash(sale.cashEuro ? String(sale.cashEuro) : '')
    setDraftPin(sale.pinEuro ? String(sale.pinEuro) : '')
    setSaveError('')
  }

  const saveEdit = async () => {
    if (!editDate) return
    const sale: JetonDaySale = {
      jetonsSold: salesByDate[editDate]?.jetonsSold ?? 0,
      cashEuro: parseJetonDayAmount(draftCash),
      pinEuro: parseJetonDayAmount(draftPin),
    }
    setSaving(true)
    setSaveError('')
    const result = await adminDb.upsert(
      'kassa_jeton_day_sales',
      {
        tenant_slug: tenant,
        report_date: editDate,
        cash_euro: sale.cashEuro,
        pin_euro: sale.pinEuro,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_slug,report_date', tenantSlug: tenant },
    )
    setSaving(false)
    if (!result.ok) {
      setSaveError(result.error || 'Opslaan mislukt')
      return
    }
    setSalesByDate((prev) => ({ ...prev, [editDate]: sale }))
    setEditDate(null)
  }

  if (!allowed) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">Overzicht jetons</h1>
        <p className="mt-3 text-gray-500">Dit overzicht is niet beschikbaar.</p>
      </div>
    )
  }

  const applyPreset = (next: Preset) => {
    const range = rangeForPreset(next, getBelgiumDateString())
    setPreset(next)
    setFrom(range.from)
    setTo(range.to)
  }

  const totals = overview?.totals
  const days = [...(overview?.days ?? [])].reverse()
  const manualTotals = sumJetonDaySales(
    days.map((row) => salesByDate[row.date] ?? emptyJetonDaySale()),
  )
  const editRow = days.find((row) => row.date === editDate)
  const whiteJetonEuro = ((editRow?.receivedWhite ?? 0) * denoms.whiteCents) / 100
  const blackJetonEuro = ((editRow?.receivedBlack ?? 0) * denoms.blackCents) / 100
  const jetonEuro = whiteJetonEuro + blackJetonEuro

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overzicht jetons</h1>
          <p className="text-gray-500 text-sm mt-1">Automatisch uit de kassa.</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 flex-wrap">
          {(
            [
              ['yesterday', 'Gisteren'],
              ['today', 'Vandaag'],
              ['7', '7 dagen'],
              ['30', '30 dagen'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => applyPreset(id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                preset === id ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <label className="text-sm text-gray-500">
          Van
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setPreset('custom')
              setFrom(e.target.value)
            }}
            className="ml-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm"
          />
        </label>
        <label className="text-sm text-gray-500">
          Tot
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setPreset('custom')
              setTo(e.target.value)
            }}
            className="ml-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm"
          />
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Laden...</p>
        </div>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Stat
              title="Jetons"
              value={String(totals?.receivedPieces ?? 0)}
              sub={`${fmtEuro(totals?.receivedEuro ?? 0)} · ${totals?.receivedBlack ?? 0} zwart · ${totals?.receivedWhite ?? 0} wit`}
            />
            <Stat title="Cash" value={fmtEuro(manualTotals.cashEuro)} sub="" />
            <Stat title="Pin" value={fmtEuro(manualTotals.pinEuro)} sub="" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Dag</th>
                  <th className="px-4 py-3 font-medium">Jetons</th>
                  <th className="px-4 py-3 font-medium">Cash</th>
                  <th className="px-4 py-3 font-medium">Pin</th>
                  <th className="px-4 py-3 font-medium w-14" />
                </tr>
              </thead>
              <tbody>
                {days.map((row) => (
                  <DayRow
                    key={row.date}
                    row={row}
                    sale={salesByDate[row.date] ?? emptyJetonDaySale()}
                    onEdit={() => openEdit(row.date)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {editDate ? (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
              <div className="w-full max-w-md rounded-2xl bg-[#4a4a4a] p-5 shadow-xl">
                <h2 className="text-lg font-bold text-white">{fmtDay(editDate)}</h2>
                <p className="mt-2 text-base font-semibold text-white">
                  {editRow?.receivedBlack ?? 0} zwarte jetons ontvangen
                </p>
                <p className="text-base font-semibold text-white">
                  {editRow?.receivedWhite ?? 0} witte jetons ontvangen
                </p>
                <p className="mt-3 text-sm text-[#d0d0d0]">
                  Witte jetons {fmtEuro(whiteJetonEuro)}
                </p>
                <p className="text-sm text-[#d0d0d0]">Zwarte jetons {fmtEuro(blackJetonEuro)}</p>
                <p className="mt-1 text-lg font-bold text-white">{fmtEuro(jetonEuro)}</p>
                <label className="mt-4 block text-sm text-[#d0d0d0]">
                  Cash
                  <input
                    inputMode="decimal"
                    value={draftCash}
                    onChange={(e) => setDraftCash(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/40 bg-white px-3 py-3 text-lg text-gray-900"
                  />
                </label>
                <label className="mt-3 block text-sm text-[#d0d0d0]">
                  Pin
                  <input
                    inputMode="decimal"
                    value={draftPin}
                    onChange={(e) => setDraftPin(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/40 bg-white px-3 py-3 text-lg text-gray-900"
                  />
                </label>
                {saveError ? <p className="mt-3 text-sm text-red-600">{saveError}</p> : null}
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveEdit()}
                    className={`flex-1 py-3 text-base disabled:opacity-50 ${kassaSpeelsGreenGlossButtonClass()}`}
                  >
                    {saving ? 'Opslaan...' : 'Opslaan'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setEditDate(null)}
                    className={`px-4 py-3 text-base disabled:opacity-50 ${kassaSpeelsGrayChromeButtonClass()}`}
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function Stat({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-gray-400 text-sm mt-1">{sub}</p>
    </div>
  )
}

function DayRow({
  row,
  sale,
  onEdit,
}: {
  row: JetonDayRow
  sale: JetonDaySale
  onEdit: () => void
}) {
  const filled = sale.cashEuro > 0 || sale.pinEuro > 0
  const empty = row.receivedReceipts === 0 && row.receivedEuro === 0 && !filled
  return (
    <tr className={`border-b border-gray-50 ${empty ? 'text-gray-300' : 'text-gray-900'}`}>
      <td className="px-4 py-3">{fmtDay(row.date)}</td>
      <td className="px-4 py-3">
        {row.receivedPieces} stuks
        <span className="text-gray-400">
          {' '}
          · {fmtEuro(row.receivedEuro)} · {row.receivedBlack} zwart · {row.receivedWhite} wit
        </span>
      </td>
      <td className="px-4 py-3">{fmtEuro(sale.cashEuro)}</td>
      <td className="px-4 py-3">{fmtEuro(sale.pinEuro)}</td>
      <td className="px-2 py-3">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Invullen ${fmtDay(row.date)}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
          </svg>
        </button>
      </td>
    </tr>
  )
}
