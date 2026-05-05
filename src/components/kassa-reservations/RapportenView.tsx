'use client'

import { useState } from 'react'
import type { GuestProfile, Reservation } from './kassa-reservations-model'

export function RapportenView({
  reservations,
  guestProfiles,
}: {
  reservations: Reservation[]
  guestProfiles: GuestProfile[]
}) {
  const now = new Date()
  const [rMonth, setRMonth] = useState(now.getMonth())
  const [rYear, setRYear] = useState(now.getFullYear())

  const MONTHS = [
    'Januari',
    'Februari',
    'Maart',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Augustus',
    'September',
    'Oktober',
    'November',
    'December',
  ]

  const from = `${rYear}-${String(rMonth + 1).padStart(2, '0')}-01`
  const to = `${rYear}-${String(rMonth + 1).padStart(2, '0')}-${String(new Date(rYear, rMonth + 1, 0).getDate()).padStart(2, '0')}`
  const filtered = reservations.filter((r) => r.reservation_date >= from && r.reservation_date <= to)
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

  const daysInMonth = new Date(rYear, rMonth + 1, 0).getDate()
  const dayLabels = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(rYear, rMonth, i + 1)
    return `${['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'][d.getDay()]} ${i + 1}`
  })
  const guestsByDay = Array.from({ length: daysInMonth }, (_, i) => {
    const d = `${rYear}-${String(rMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    return active.filter((r) => r.reservation_date === d).reduce((s, r) => s + r.party_size, 0)
  })
  const resByDay = Array.from({ length: daysInMonth }, (_, i) => {
    const d = `${rYear}-${String(rMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    return active.filter((r) => r.reservation_date === d).length
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
    const linePath = `M ${pts.join(' L ')}`
    const areaPath = `M ${PAD},${H - PAD} L ${pts.join(' L ')} L ${W - PAD},${H - PAD} Z`
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

  const statusData = [
    { label: 'Bevestigd', status: 'CONFIRMED' as const, color: '#3b82f6' },
    { label: 'Ingecheckt', status: 'CHECKED_IN' as const, color: '#22c55e' },
    { label: 'Afgerond', status: 'COMPLETED' as const, color: '#6b7280' },
    { label: 'No-show', status: 'NO_SHOW' as const, color: '#ef4444' },
    { label: 'Geannuleerd', status: 'CANCELLED' as const, color: '#d1d5db' },
  ]

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Datumbereik</label>
          <div className="flex items-center gap-2">
            <select
              value={rMonth}
              onChange={(e) => setRMonth(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#3C4D6B]"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={rYear}
              onChange={(e) => setRYear(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#3C4D6B]"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="hidden h-8 w-px bg-gray-200 sm:block" />
        <div className="text-sm text-gray-500">
          <span className="font-semibold text-gray-800">{total}</span> reservaties &nbsp;·&nbsp;
          <span className="font-semibold text-gray-800">{totalGuests}</span> gasten in {MONTHS[rMonth]} {rYear}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Terugkerende gasten', value: `${returningPct}%`, sub: 'van alle gasten', color: 'text-gray-800' },
          {
            label: 'Annuleringen',
            value: `${cancelPct}%`,
            sub: `${cancelled} geannuleerd`,
            color: cancelPct > 20 ? 'text-red-500' : 'text-gray-800',
          },
          {
            label: 'No-shows',
            value: `${noShowPct}%`,
            sub: `${noShows} no-show`,
            color: noShowPct > 10 ? 'text-red-500' : 'text-gray-800',
          },
          {
            label: 'Gem. groepsgrootte',
            value: avgGroup > 0 ? avgGroup.toFixed(1) : '—',
            sub: 'personen per reservatie',
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

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-gray-800">Gasten per dag</h4>
            <p className="mt-0.5 text-xs text-gray-400">
              {MONTHS[rMonth]} {rYear}
            </p>
          </div>
          <span className="text-sm font-semibold text-gray-500">Totaal: {totalGuests}</span>
        </div>
        <AreaChart data={guestsByDay} max={maxGuests} color="#3C4D6B" />
        <div className="mt-1 flex justify-between px-2">
          {xIdxs.map((i) => (
            <span key={i} className="text-xs text-gray-400">
              {dayLabels[i]}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#6b7d9e]" />
          <span className="text-xs text-gray-500">Handmatig / kassa</span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-gray-800">Reserveringen per dag</h4>
            <p className="mt-0.5 text-xs text-gray-400">
              {MONTHS[rMonth]} {rYear}
            </p>
          </div>
          <span className="text-sm font-semibold text-gray-500">Totaal: {totalRes}</span>
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
          <span className="text-xs text-gray-500">Handmatig / kassa</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h4 className="mb-4 font-bold text-gray-800">Status verdeling</h4>
          <div className="space-y-3">
            {statusData.map(({ label, status, color }) => {
              const count = filtered.filter((r) => r.status === status).length
              const pct = filtered.length > 0 ? (count / filtered.length) * 100 : 0
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm text-gray-600">{label}</span>
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
          <h4 className="mb-4 font-bold text-gray-800">Top 5 meest terugkerende gasten</h4>
          <div className="space-y-3">
            {[...guestProfiles]
              .sort((a, b) => b.totalVisits - a.totalVisits)
              .slice(0, 5)
              .map((g, i) => (
                <div key={g.id} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#bcc8dc] bg-[#f2f5fa] text-xs font-bold text-[#3C4D6B]">
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
              <p className="py-4 text-center text-sm text-gray-400">Nog geen gastdata</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
