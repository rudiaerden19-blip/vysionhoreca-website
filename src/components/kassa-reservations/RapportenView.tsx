'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, List, Mail } from 'lucide-react'
import type { GuestProfile, Reservation, ReservationStatus } from './kassa-reservations-model'
import type { ReservationKassaRk } from '@/hooks/useReservationKassa'
import {
  filterReservationsByDateRange,
  reservationReportRange,
  type ReservationReportPeriod,
} from '@/lib/reservation-report-range'
import {
  buildReservationReportPlainText,
  buildReservationReportPrintHtml,
  type ReservationReportRowLabels,
} from '@/lib/reservation-report-export'
import { getAuthHeaders } from '@/lib/auth-headers'

export function RapportenView({
  reservations,
  guestProfiles,
  tenantSlug,
  businessName,
  businessEmail,
  rk,
  monthName,
  weekdayShort,
  formatDate,
  formatDateLong,
  statusLabel,
  notifySuccess,
  notifyError,
}: {
  reservations: Reservation[]
  guestProfiles: GuestProfile[]
  tenantSlug: string
  businessName: string
  businessEmail: string
  rk: ReservationKassaRk
  monthName: (i: number) => string
  weekdayShort: (i: number) => string
  formatDate: (date: string) => string
  formatDateLong: (date: string) => string
  statusLabel: (s: ReservationStatus) => string
  notifySuccess?: (message: string) => void
  notifyError?: (message: string) => void
}) {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const [reportPeriod, setReportPeriod] = useState<ReservationReportPeriod>('maand')
  const [anchorDate, setAnchorDate] = useState(todayStr)
  const [rMonth, setRMonth] = useState(now.getMonth())
  const [rYear, setRYear] = useState(now.getFullYear())

  const [emailOpen, setEmailOpen] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSending, setEmailSending] = useState(false)

  const range = useMemo(
    () => reservationReportRange(reportPeriod, anchorDate, rMonth, rYear),
    [reportPeriod, anchorDate, rMonth, rYear],
  )

  const filtered = useMemo(
    () => filterReservationsByDateRange(reservations, range.from, range.to),
    [reservations, range.from, range.to],
  )

  const reportRows = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          a.reservation_date.localeCompare(b.reservation_date) || a.reservation_time.localeCompare(b.reservation_time),
      ),
    [filtered],
  )

  const active = filtered.filter((r) => r.status !== 'CANCELLED')
  const total = active.length
  const cancelled = filtered.filter((r) => r.status === 'CANCELLED').length
  const noShows = filtered.filter((r) => r.status === 'NO_SHOW').length
  const avgGroup = total > 0 ? active.reduce((s, r) => s + r.party_size, 0) / total : 0

  const returningPct =
    guestProfiles.length > 0
      ? Math.round((guestProfiles.filter((g) => g.totalVisits > 1).length / guestProfiles.length) * 100)
      : 0
  const cancelPct = filtered.length > 0 ? Math.round((cancelled / filtered.length) * 100) : 0
  const noShowPct = total > 0 ? Math.round((noShows / total) * 100) : 0

  const periodLabel = useMemo(() => {
    if (reportPeriod === 'dag') return formatDateLong(anchorDate)
    if (reportPeriod === 'week') return rk('reportRangeLabel', { from: formatDate(range.from), to: formatDate(range.to) })
    if (reportPeriod === 'maand') {
      const m = monthName(rMonth)
      return `${m.charAt(0).toUpperCase() + m.slice(1)} ${rYear}`
    }
    return rk('periodYear', { year: String(rYear) })
  }, [reportPeriod, anchorDate, range.from, range.to, rMonth, rYear, formatDate, formatDateLong, monthName, rk])

  const colLabels: ReservationReportRowLabels = useMemo(
    () => ({
      date: rk('colDate'),
      time: rk('colTime'),
      name: rk('colName'),
      phone: rk('colPhone'),
      email: rk('colEmail'),
      guests: rk('colGuests'),
      table: rk('tableLabel'),
      status: rk('labelStatus'),
      notes: rk('colNotes'),
    }),
    [rk],
  )

  const chartMonth = reportPeriod === 'maand' ? rMonth : now.getMonth()
  const chartYear = reportPeriod === 'maand' ? rYear : now.getFullYear()
  const daysInMonth = new Date(chartYear, chartMonth + 1, 0).getDate()
  const dayLabels = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(chartYear, chartMonth, i + 1)
    return `${weekdayShort(d.getDay())} ${i + 1}`
  })
  const monthActive = useMemo(() => {
    if (reportPeriod !== 'maand') return []
    const from = range.from
    const to = range.to
    return reservations.filter(
      (r) => r.status !== 'CANCELLED' && r.reservation_date >= from && r.reservation_date <= to,
    )
  }, [reportPeriod, range.from, range.to, reservations])

  const guestsByDay = Array.from({ length: daysInMonth }, (_, i) => {
    const d = `${chartYear}-${String(chartMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    return monthActive.filter((r) => r.reservation_date === d).reduce((s, r) => s + r.party_size, 0)
  })
  const resByDay = Array.from({ length: daysInMonth }, (_, i) => {
    const d = `${chartYear}-${String(chartMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    return monthActive.filter((r) => r.reservation_date === d).length
  })

  const maxGuests = Math.max(...guestsByDay, 1)
  const maxRes = Math.max(...resByDay, 1)
  const totalGuests = guestsByDay.reduce((s, v) => s + v, 0)
  const totalRes = resByDay.reduce((s, v) => s + v, 0)

  const AreaChart = ({ data, max, color }: { data: number[]; max: number; color: string }) => {
    const W = 1000,
      H = 140,
      PAD = 8
    const pts = data.map((v, i) => {
      const x = PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2)
      const y = H - PAD - (v / max) * (H - PAD * 2)
      return `${x},${y}`
    })
    const linePath = `M ${pts.join('L ')}`
    const areaPath = `M ${PAD},${H - PAD} L ${pts.join('L ')} L ${W - PAD},${H - PAD} Z`
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 150 }}>
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PAD}
            y1={H - PAD - f * (H - PAD * 2)}
            x2={W - PAD}
            y2={H - PAD - f * (H - PAD * 2)}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}
        <path d={areaPath} fill={`url(#grad-${color})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((pt, i) =>
          data[i] > 0 ? (
            <circle key={i} cx={Number(pt.split(',')[0])} cy={Number(pt.split(',')[1])} r="3.5" fill={color} />
          ) : null,
        )}
      </svg>
    )
  }

  const xIdxs = Array.from({ length: daysInMonth }, (_, i) => i).filter(
    (i) => i % Math.ceil(daysInMonth / 10) === 0 || i === daysInMonth - 1,
  )

  const statusKeys: { status: ReservationStatus; color: string }[] = [
    { status: 'CONFIRMED', color: '#3b82f6' },
    { status: 'CHECKED_IN', color: '#22c55e' },
    { status: 'COMPLETED', color: '#6b7280' },
    { status: 'NO_SHOW', color: '#ef4444' },
    { status: 'CANCELLED', color: '#d1d5db' },
  ]

  const monthLabel = monthName(chartMonth)
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear()
    return [y - 2, y - 1, y, y + 1, y + 2]
  }, [])

  const shiftAnchor = (days: number) => {
    const d = new Date(`${anchorDate}T12:00:00`)
    d.setDate(d.getDate() + days)
    setAnchorDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    )
  }

  const handlePrint = () => {
    const html = buildReservationReportPrintHtml(
      businessName,
      rk('reportGuestListTitle'),
      periodLabel,
      reportRows,
      colLabels,
      statusLabel,
      formatDate,
    )
    const w = window.open('', '_blank', 'noopener,noreferrer')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    w.onload = () => {
      w.print()
    }
  }

  const openEmail = () => {
    setEmailTo(businessEmail || '')
    setEmailOpen(true)
  }

  const handleSendEmail = async () => {
    const to = emailTo.trim()
    if (!to) return
    setEmailSending(true)
    try {
      const body = buildReservationReportPlainText(
        businessName ? `${businessName} — ${rk('reportGuestListTitle')}` : rk('reportGuestListTitle'),
        periodLabel,
        reportRows,
        colLabels,
        statusLabel,
      )
      const subject = rk('reportEmailSubject', {
        period: periodLabel,
        from: range.from,
        to: range.to,
      })
      const res = await fetch('/api/marketing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          tenantSlug,
          recipients: [{ email: to, name: businessName || to }],
          subject,
          message: body,
          businessName: businessName || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || rk('reportEmailFailed'))
      setEmailOpen(false)
      ;(notifySuccess ?? ((m: string) => alert(m)))(rk('reportEmailSent'))
    } catch (e) {
      ;(notifyError ?? ((m: string) => alert(m)))(e instanceof Error ? e.message : rk('reportEmailFailed'))
    } finally {
      setEmailSending(false)
    }
  }

  const periodBtn = (p: ReservationReportPeriod, label: string) => (
    <button
      type="button"
      key={p}
      onClick={() => setReportPeriod(p)}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
        reportPeriod === p ? 'bg-[#075985] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {periodBtn('dag', rk('filterDay'))}
          {periodBtn('week', rk('filterWeek'))}
          {periodBtn('maand', rk('filterMonth'))}
          {periodBtn('jaar', rk('filterYear'))}
        </div>
        <div className="hidden h-8 w-px bg-gray-200 sm:block" />
        {(reportPeriod === 'dag' || reportPeriod === 'week') && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftAnchor(-1)}
              className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
              aria-label={rk('prevDay')}
            >
              <ChevronLeft size={18} />
            </button>
            <input
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-[#075985]"
            />
            <button
              type="button"
              onClick={() => setAnchorDate(todayStr)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              {rk('today')}
            </button>
            <button
              type="button"
              onClick={() => shiftAnchor(1)}
              className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
              aria-label={rk('nextDay')}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
        {reportPeriod === 'maand' && (
          <div className="flex items-center gap-2">
            <select
              value={rMonth}
              onChange={(e) => setRMonth(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#075985]"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {monthName(i)}
                </option>
              ))}
            </select>
            <select
              value={rYear}
              onChange={(e) => setRYear(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#075985]"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}
        {reportPeriod === 'jaar' && (
          <select
            value={rYear}
            onChange={(e) => setRYear(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#075985]"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}
        <div className="text-sm text-gray-500">
          {rk('reportPeriodSummary', {
            total: String(total),
            totalGuests: String(active.reduce((s, r) => s + r.party_size, 0)),
            from: range.from,
            to: range.to,
          })}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-gray-800">{rk('reportGuestListTitle')}</h4>
            <p className="mt-0.5 text-xs text-gray-400">{periodLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <List size={16} />
              {rk('reportPrint')}
            </button>
            <button
              type="button"
              onClick={openEmail}
              className="inline-flex items-center gap-2 rounded-xl bg-[#075985] px-4 py-2 text-sm font-semibold text-white hover:bg-[#06496e]"
            >
              <Mail size={16} />
              {rk('reportEmail')}
            </button>
          </div>
        </div>
        {reportRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">{rk('reportNoReservationsInPeriod')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-2 py-2 font-semibold">{colLabels.date}</th>
                  <th className="px-2 py-2 font-semibold">{colLabels.time}</th>
                  <th className="px-2 py-2 font-semibold">{colLabels.name}</th>
                  <th className="px-2 py-2 font-semibold">{colLabels.phone}</th>
                  <th className="px-2 py-2 font-semibold">{colLabels.email}</th>
                  <th className="px-2 py-2 font-semibold">{colLabels.guests}</th>
                  <th className="px-2 py-2 font-semibold">{colLabels.table}</th>
                  <th className="px-2 py-2 font-semibold">{colLabels.status}</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                    <td className="whitespace-nowrap px-2 py-2.5 text-gray-700">{formatDate(r.reservation_date)}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-gray-700">{(r.reservation_time || '').slice(0, 5)}</td>
                    <td className="px-2 py-2.5 font-medium text-gray-900">{r.guest_name}</td>
                    <td className="px-2 py-2.5 text-gray-600">{r.guest_phone || '—'}</td>
                    <td className="max-w-[180px] truncate px-2 py-2.5 text-gray-600" title={r.guest_email || ''}>
                      {r.guest_email || '—'}
                    </td>
                    <td className="px-2 py-2.5 text-gray-700">{r.party_size}</td>
                    <td className="px-2 py-2.5 text-gray-700">{r.table_number || '—'}</td>
                    <td className="px-2 py-2.5 text-gray-700">{statusLabel(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {emailOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">{rk('reportEmailModalTitle')}</h3>
            <label className="mb-1 block text-xs font-medium text-gray-500">{rk('reportEmailRecipient')}</label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#075985]"
            />
            <p className="mb-4 text-xs text-gray-400">{periodLabel}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEmailOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                {rk('cancel')}
              </button>
              <button
                type="button"
                disabled={emailSending || !emailTo.trim()}
                onClick={() => void handleSendEmail()}
                className="rounded-xl bg-[#075985] px-4 py-2 text-sm font-semibold text-white hover:bg-[#06496e] disabled:opacity-50"
              >
                {emailSending ? '…' : rk('reportEmailSend')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: rk('reportReturningGuests'),
            value: `${returningPct}%`,
            sub: rk('reportOfAllGuests'),
            color: 'text-gray-800',
          },
          {
            label: rk('reportCancellations'),
            value: `${cancelPct}%`,
            sub: rk('reportCancelledCount', { count: String(cancelled) }),
            color: cancelPct > 20 ? 'text-red-500' : 'text-gray-800',
          },
          {
            label: rk('reportNoShows'),
            value: `${noShowPct}%`,
            sub: rk('reportNoShowCount', { count: String(noShows) }),
            color: noShowPct > 10 ? 'text-red-500' : 'text-gray-800',
          },
          {
            label: rk('reportAvgGroupSize'),
            value: avgGroup > 0 ? avgGroup.toFixed(1) : '—',
            sub: rk('reportPersonsPerReservation'),
            color: 'text-gray-800',
          },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">{label}</p>
            <p className={`mb-1 text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {reportPeriod === 'maand' && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-800">{rk('reportGuestsPerDay')}</h4>
                <p className="mt-0.5 text-xs text-gray-400">
                  {monthLabel} {chartYear}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-500">
                {rk('reportTotal')} {totalGuests}
              </span>
            </div>
            <AreaChart data={guestsByDay} max={maxGuests} color="#58CCFF" />
            <div className="mt-1 flex justify-between px-2">
              {xIdxs.map((i) => (
                <span key={i} className="text-xs text-gray-400">
                  {dayLabels[i]}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#6b7d9e]" />
              <span className="text-xs text-gray-500">{rk('reportSourceManualKassa')}</span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-800">{rk('reportReservationsPerDay')}</h4>
                <p className="mt-0.5 text-xs text-gray-400">
                  {monthLabel} {chartYear}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-500">
                {rk('reportTotal')} {totalRes}
              </span>
            </div>
            <AreaChart data={resByDay} max={maxRes} color="#3b82f6" />
            <div className="mt-1 flex justify-between px-2">
              {xIdxs.map((i) => (
                <span key={i} className="text-xs text-gray-400">
                  {dayLabels[i]}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-400" />
              <span className="text-xs text-gray-500">{rk('reportSourceManualKassa')}</span>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h4 className="mb-4 font-bold text-gray-800">{rk('reportStatusDistribution')}</h4>
          <div className="space-y-3">
            {statusKeys.map(({ status, color }) => {
              const count = filtered.filter((r) => r.status === status).length
              const pct = filtered.length > 0 ? (count / filtered.length) * 100 : 0
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm text-gray-600">{rk(`status_${status}`)}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold text-gray-700">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h4 className="mb-4 font-bold text-gray-800">{rk('reportTopReturningGuests')}</h4>
          <div className="space-y-3">
            {[...guestProfiles]
              .sort((a, b) => b.totalVisits - a.totalVisits)
              .slice(0, 5)
              .map((g, i) => (
                <div key={g.id} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#bcc8dc] bg-[#f2f5fa] text-xs font-bold text-[#075985]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{g.name}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[#6b7d9e]"
                        style={{
                          width: `${Math.min(
                            100,
                            (g.totalVisits /
                              ([...guestProfiles].sort((a, b) => b.totalVisits - a.totalVisits)[0]?.totalVisits ||
                                1)) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-gray-600">{g.totalVisits}x</span>
                </div>
              ))}
            {guestProfiles.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">{rk('reportNoGuestData')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
