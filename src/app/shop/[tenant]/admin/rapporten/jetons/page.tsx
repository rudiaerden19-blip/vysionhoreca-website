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
  summarizeJetonOverview,
  type JetonDayRow,
  type JetonOverview,
  type JetonOverviewOrder,
} from '@/lib/kassa-jeton-overview'
import { isTheLagoonTenant } from '@/lib/lagoon-kitchen-screen'
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
  const [preset, setPreset] = useState<Preset>('yesterday')
  const initial = rangeForPreset('yesterday', today)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [loading, setLoading] = useState(allowed)
  const [error, setError] = useState('')
  const [overview, setOverview] = useState<JetonOverview | null>(null)

  const load = useCallback(async () => {
    if (!allowed) return
    const start = from <= to ? from : to
    const end = from <= to ? to : from
    setLoading(true)
    setError('')
    try {
      const startISO = belgiumLocalToUtcIso(addDaysToBelgiumYMD(start, -1), '00:00')
      const endISO = belgiumLocalToUtcIso(addDaysToBelgiumYMD(end, 2), '00:00')
      const [rows, settings, hours, zResult] = await Promise.all([
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
      const denoms = normalizeKassaJetonDenominations(
        settings?.kassa_jeton_black_cents,
        settings?.kassa_jeton_white_cents,
      )
      setOverview(
        summarizeJetonOverview(orders, start, end, denoms, (hours || []) as TenantHourRow[], shifts),
      )
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
            <Stat
              title="Cash"
              value={fmtEuro(totals?.soldCashEuro ?? 0)}
              sub={`${totals?.soldCashPieces ?? 0} stuks`}
            />
            <Stat
              title="Pin"
              value={fmtEuro(totals?.soldPinEuro ?? 0)}
              sub={`${totals?.soldPinPieces ?? 0} stuks`}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Dag</th>
                  <th className="px-4 py-3 font-medium">Jetons</th>
                  <th className="px-4 py-3 font-medium">Cash</th>
                  <th className="px-4 py-3 font-medium">Pin</th>
                </tr>
              </thead>
              <tbody>
                {days.map((row) => (
                  <DayRow key={row.date} row={row} />
                ))}
              </tbody>
            </table>
          </div>
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

function DayRow({ row }: { row: JetonDayRow }) {
  const empty =
    row.soldPieces === 0 && row.receivedReceipts === 0 && row.receivedEuro === 0
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
      <td className="px-4 py-3">
        {fmtEuro(row.soldCashEuro)}
        <span className="text-gray-400"> · {row.soldCashPieces}</span>
      </td>
      <td className="px-4 py-3">
        {fmtEuro(row.soldPinEuro)}
        <span className="text-gray-400"> · {row.soldPinPieces}</span>
      </td>
    </tr>
  )
}
