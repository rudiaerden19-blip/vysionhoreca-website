'use client'

import { useCallback, useEffect, useState } from 'react'
import PinGate from '@/components/PinGate'
import { authFetch } from '@/lib/auth-headers'
import type { CashbookMovementType } from '@/lib/cashbook-calc'

type Movement = {
  id: string
  movement_type: CashbookMovementType
  amount_cents: number
  description: string
  reason: string | null
  staff_name: string | null
  reference: string | null
  created_by: string
  created_at: string
}

type DayView = {
  storageReady: boolean
  date: string
  status: 'none' | 'open' | 'closed'
  openingCents: number
  payments: {
    cashCents: number
    cardCents: number
    onlineCents: number
    grossCents: number
    count: number
    discountCents: number
    refundCents: number
  }
  cancelledCount: number
  cancelledCents: number
  vat: Array<{ rate: number; baseCents: number; taxCents: number; inclCents: number }>
  taxCents: number
  exclCents: number
  movements: Movement[]
  adjustments: Array<{
    id: string
    field_name: string
    original_cents: number
    corrected_cents: number
    difference_cents: number
    reason: string
    created_by: string
    created_at: string
  }>
  expectedCents: number
  countedCents: number | null
  differenceCents: number | null
  closeNote: string | null
  closedAt: string | null
  closedBy: string | null
  businessName: string
  btwNumber: string
  address: string
}

type HistoryRow = {
  date: string
  status: string
  grossCents: number
  cashCents: number
  cardCents: number
  onlineCents: number
  outCents: number
  expectedCents: number | null
  countedCents: number | null
  differenceCents: number | null
}

const MOVEMENTS: Array<{ id: CashbookMovementType; label: string }> = [
  { id: 'cash_in', label: 'Cash in' },
  { id: 'cash_out', label: 'Cash uit' },
  { id: 'float_in', label: 'Wisselgeld toevoegen' },
  { id: 'take_out', label: 'Geld uit kas' },
  { id: 'bank_deposit', label: 'Bankstorting' },
  { id: 'petty_expense', label: 'Kleine uitgave' },
  { id: 'correction_in', label: 'Correctie (in)' },
  { id: 'correction_out', label: 'Correctie (uit)' },
  { id: 'other_in', label: 'Andere (in)' },
  { id: 'other_out', label: 'Andere (uit)' },
]

function euro(cents: number | null | undefined) {
  const n = Number(cents) || 0
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  return `${sign}€${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`
}

function labelOf(type: string) {
  return MOVEMENTS.find((m) => m.id === type)?.label || type
}

function shiftDate(ymd: string, days: number) {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

function showDate(ymd: string) {
  const [y, m, d] = ymd.split('-')
  return `${d}/${m}/${y}`
}

function belgiumToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date())
}

function historyRange(kind: 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth', anchor: string) {
  const base = anchor || belgiumToday()
  if (kind === 'today') return { from: base, to: base }
  if (kind === 'yesterday') {
    const prev = shiftDate(base, -1)
    return { from: prev, to: prev }
  }
  if (kind === 'week') {
    const [y, m, d] = base.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    const mondayOffset = (dt.getUTCDay() + 6) % 7
    return { from: shiftDate(base, -mondayOffset), to: base }
  }
  if (kind === 'month') return { from: `${base.slice(0, 7)}-01`, to: base }
  const [y, m] = base.split('-').map(Number)
  const firstPrev = new Date(Date.UTC(y, m - 2, 1))
  const lastPrev = new Date(Date.UTC(y, m - 1, 0))
  return { from: firstPrev.toISOString().slice(0, 10), to: lastPrev.toISOString().slice(0, 10) }
}

export default function KasboekPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const [tab, setTab] = useState<'day' | 'history'>('day')
  const [date, setDate] = useState('')
  const [day, setDay] = useState<DayView | null>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [historyStatus, setHistoryStatus] = useState<'all' | 'open' | 'closed'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [opening, setOpening] = useState('')
  const [showMove, setShowMove] = useState(false)
  const [moveType, setMoveType] = useState<CashbookMovementType>('cash_in')
  const [moveAmount, setMoveAmount] = useState('')
  const [moveText, setMoveText] = useState('')
  const [moveReason, setMoveReason] = useState('')
  const [moveStaff, setMoveStaff] = useState('')
  const [moveRef, setMoveRef] = useState('')
  const [counted, setCounted] = useState('')
  const [closeNote, setCloseNote] = useState('')
  const [fixAmount, setFixAmount] = useState('')
  const [fixReason, setFixReason] = useState('')
  const [busy, setBusy] = useState(false)

  const loadDay = useCallback(async (bookDate?: string) => {
    setLoading(true)
    setError('')
    const query = bookDate ? `?tenantSlug=${encodeURIComponent(tenant)}&date=${bookDate}` : `?tenantSlug=${encodeURIComponent(tenant)}`
    const res = await authFetch(`/api/kasboek${query}`)
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(json.error || 'Kasboek laden mislukt.')
      setLoading(false)
      return
    }
    setDay(json as DayView)
    setDate((json as DayView).date)
    setOpening(((json as DayView).openingCents / 100).toFixed(2))
    setLoading(false)
  }, [tenant])

  useEffect(() => {
    void loadDay()
  }, [loadDay])

  async function post(body: Record<string, unknown>) {
    setBusy(true)
    setError('')
    const res = await authFetch('/api/kasboek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantSlug: tenant, date, ...body }),
    })
    const json = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError(json.error || 'Opslaan mislukt.')
      return false
    }
    await loadDay(date)
    return true
  }

  async function loadHistory(from: string, to: string) {
    setTab('history')
    setLoading(true)
    const res = await authFetch(`/api/kasboek?tenantSlug=${encodeURIComponent(tenant)}&from=${from}&to=${to}`)
    const json = await res.json().catch(() => ({}))
    setHistory((json.rows || []) as HistoryRow[])
    setLoading(false)
  }

  function printDay() {
    if (!day) return
    const rows = day.movements
      .map((m) => `<tr><td>${new Date(m.created_at).toLocaleString('nl-BE')}</td><td>${labelOf(m.movement_type)}</td><td>${m.description}</td><td>${m.staff_name || ''}</td><td style="text-align:right">${euro(m.amount_cents)}</td></tr>`)
      .join('')
    const html = `<!DOCTYPE html><html><head><title>Kasboek ${showDate(day.date)}</title>
      <style>body{font-family:sans-serif;max-width:720px;margin:24px auto;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left;font-size:13px}</style>
      </head><body>
      <h1>Digitale kasboek ${showDate(day.date)}</h1>
      <p>${day.businessName}<br>${day.btwNumber ? `BTW ${day.btwNumber}<br>` : ''}${day.address}</p>
      <p>Status: ${day.status === 'closed' ? 'AFGESLOTEN' : 'OPEN'}</p>
      <p>Omzet ${euro(day.payments.grossCents)} · excl. btw ${euro(day.exclCents)} · btw ${euro(day.taxCents)}</p>
      <p>Cash ${euro(day.payments.cashCents)} · Kaart ${euro(day.payments.cardCents)} · Online ${euro(day.payments.onlineCents)}</p>
      <p>Beginkas ${euro(day.openingCents)} · Verwacht ${euro(day.expectedCents)} · Geteld ${day.countedCents == null ? '—' : euro(day.countedCents)} · Verschil ${day.differenceCents == null ? '—' : euro(day.differenceCents)}</p>
      ${day.closeNote ? `<p>Opmerking: ${day.closeNote}</p>` : ''}
      ${day.closedBy ? `<p>Afgesloten door ${day.closedBy} op ${day.closedAt ? new Date(day.closedAt).toLocaleString('nl-BE') : ''}</p>` : ''}
      <table><thead><tr><th>Tijdstip</th><th>Type</th><th>Omschrijving</th><th>Persoon</th><th>Bedrag</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`
    const w = window.open('', '_blank', 'width=800,height=900')
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }

  function exportCsv() {
    if (!day) return
    const lines = [
      ['Datum', day.date],
      ['Zaak', day.businessName],
      ['BTW', day.btwNumber],
      ['Omzet', euro(day.payments.grossCents)],
      ['Cash', euro(day.payments.cashCents)],
      ['Kaart', euro(day.payments.cardCents)],
      ['Online', euro(day.payments.onlineCents)],
      ['Beginkas', euro(day.openingCents)],
      ['Verwacht', euro(day.expectedCents)],
      ['Geteld', day.countedCents == null ? '' : euro(day.countedCents)],
      ['Verschil', day.differenceCents == null ? '' : euro(day.differenceCents)],
      [],
      ['Tijdstip', 'Type', 'Omschrijving', 'Reden', 'Persoon', 'Referentie', 'Bedrag'],
      ...day.movements.map((m) => [m.created_at, labelOf(m.movement_type), m.description, m.reason || '', m.staff_name || '', m.reference || '', euro(m.amount_cents)]),
    ]
    const csv = lines.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kasboek-${day.date}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const closed = day?.status === 'closed'
  const cashIn = (day?.movements || []).filter((m) => m.movement_type === 'cash_in' || m.movement_type === 'other_in' || m.movement_type === 'correction_in').reduce((s, m) => s + m.amount_cents, 0)
  const floatIn = (day?.movements || []).filter((m) => m.movement_type === 'float_in').reduce((s, m) => s + m.amount_cents, 0)
  const cashOut = (day?.movements || []).filter((m) => m.movement_type === 'cash_out' || m.movement_type === 'petty_expense' || m.movement_type === 'other_out' || m.movement_type === 'correction_out').reduce((s, m) => s + m.amount_cents, 0)
  const taken = (day?.movements || []).filter((m) => m.movement_type === 'take_out' || m.movement_type === 'bank_deposit').reduce((s, m) => s + m.amount_cents, 0)

  return (
    <PinGate tenant={tenant}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Digitale kasboek</h1>
            <p className="text-sm text-gray-500">{date ? showDate(date) : ''}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className={`px-3 py-2 rounded-xl text-sm ${tab === 'day' ? 'bg-gray-900 text-white' : 'bg-white border'}`} onClick={() => { setTab('day'); void loadDay() }}>Vandaag</button>
            <button type="button" className={`px-3 py-2 rounded-xl text-sm ${tab === 'history' ? 'bg-gray-900 text-white' : 'bg-white border'}`} onClick={() => { const range = historyRange('month', date || belgiumToday()); void loadHistory(range.from, range.to) }}>Historiek</button>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {day && !day.storageReady && (
          <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            De omzet van deze dag komt uit de kassa. Beginsaldo, kasbewegingen en afsluiten kunnen pas worden opgeslagen nadat de kasboek-tabellen één keer in de database zijn gezet.
          </p>
        )}

        {tab === 'history' ? (
          <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {([
              ['today', 'Vandaag'],
              ['yesterday', 'Gisteren'],
              ['week', 'Deze week'],
              ['month', 'Deze maand'],
              ['lastMonth', 'Vorige maand'],
            ] as const).map(([kind, label]) => (
              <button key={kind} type="button" className="px-3 py-2 rounded-xl bg-white border text-sm" onClick={() => { const range = historyRange(kind, date || belgiumToday()); void loadHistory(range.from, range.to) }}>{label}</button>
            ))}
            <select value={historyStatus} onChange={(e) => setHistoryStatus(e.target.value as 'all' | 'open' | 'closed')} className="px-3 py-2 rounded-xl border text-sm bg-white">
              <option value="all">Alle statussen</option>
              <option value="open">Open</option>
              <option value="closed">Afgesloten</option>
            </select>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase">
                  {['Datum', 'Omzet', 'Cash', 'Kaart', 'Online', 'Cash uit', 'Verwacht', 'Geteld', 'Verschil', 'Status'].map((h) => (
                    <th key={h} className="px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.filter((row) => (row.grossCents !== 0 || row.status !== 'none') && (historyStatus === 'all' || row.status === historyStatus)).map((row) => (
                  <tr key={row.date} className="border-t cursor-pointer hover:bg-gray-50" onClick={() => { setTab('day'); void loadDay(row.date) }}>
                    <td className="px-3 py-2">{showDate(row.date)}</td>
                    <td className="px-3 py-2">{euro(row.grossCents)}</td>
                    <td className="px-3 py-2">{euro(row.cashCents)}</td>
                    <td className="px-3 py-2">{euro(row.cardCents)}</td>
                    <td className="px-3 py-2">{euro(row.onlineCents)}</td>
                    <td className="px-3 py-2">{euro(row.outCents)}</td>
                    <td className="px-3 py-2">{row.expectedCents == null ? '—' : euro(row.expectedCents)}</td>
                    <td className="px-3 py-2">{row.countedCents == null ? '—' : euro(row.countedCents)}</td>
                    <td className="px-3 py-2">{row.differenceCents == null ? '—' : euro(row.differenceCents)}</td>
                    <td className="px-3 py-2">{row.status === 'closed' ? 'Afgesloten' : row.status === 'open' ? 'Open' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        ) : loading || !day ? (
          <p className="text-gray-500">Laden…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button type="button" className="px-3 py-2 bg-gray-100 rounded-lg" onClick={() => void loadDay(shiftDate(day.date, -1))}>‹</button>
              <p className="font-semibold">{day.status === 'closed' ? 'AFGESLOTEN' : day.status === 'open' ? 'OPEN' : 'NOG GEEN BEGINSALDO'}</p>
              <button type="button" className="px-3 py-2 bg-gray-100 rounded-lg" onClick={() => void loadDay(shiftDate(day.date, 1))}>›</button>
            </div>

            <section className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-semibold mb-3">Dagontvangsten</h2>
              <p className="text-3xl font-bold">{euro(day.payments.grossCents)}</p>
              <p className="text-sm text-gray-500 mt-1">{day.payments.count} transacties · excl. btw {euro(day.exclCents)} · btw {euro(day.taxCents)}</p>
              <p className="text-sm text-gray-500">Kortingen {euro(day.payments.discountCents)} · Retouren {euro(day.payments.refundCents)} · Geannuleerd {day.cancelledCount} ({euro(day.cancelledCents)})</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                {day.vat.map((line) => (
                  <div key={line.rate} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400">{line.rate}%</p>
                    <p className="font-semibold">{euro(line.inclCents)}</p>
                    <p className="text-xs text-gray-500">excl. {euro(line.baseCents)} · btw {euro(line.taxCents)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-semibold mb-3">Betaalmethodes</h2>
              <div className="grid grid-cols-3 gap-3">
                <div><p className="text-sm text-gray-400">Cash</p><p className="text-xl font-bold">{euro(day.payments.cashCents)}</p></div>
                <div><p className="text-sm text-gray-400">Kaart</p><p className="text-xl font-bold">{euro(day.payments.cardCents)}</p></div>
                <div><p className="text-sm text-gray-400">Online</p><p className="text-xl font-bold">{euro(day.payments.onlineCents)}</p></div>
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-semibold mb-3">Kas</h2>
              <div className="flex items-end gap-3 mb-4">
                <label className="text-sm text-gray-500">
                  Beginkas
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={opening}
                    disabled={closed}
                    onChange={(e) => setOpening(e.target.value)}
                    className="mt-1 block w-36 px-3 py-2 border rounded-xl"
                  />
                </label>
                {!closed && (
                  <button
                    type="button"
                    disabled={busy}
                    className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm"
                    onClick={() => void post({ action: 'opening', openingEuros: Number(opening) || 0 })}
                  >
                    Beginsaldo bevestigen
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span>Cash verkopen</span><span className="text-right font-medium">{euro(day.payments.cashCents)}</span>
                <span>Cash in</span><span className="text-right font-medium">{euro(cashIn + floatIn)}</span>
                <span>Cash uit</span><span className="text-right font-medium">{euro(cashOut)}</span>
                <span>Opname / bank</span><span className="text-right font-medium">{euro(taken)}</span>
                <span className="font-semibold">Verwacht</span><span className="text-right font-bold">{euro(day.expectedCents)}</span>
                <span className="font-semibold">Geteld</span><span className="text-right font-bold">{day.countedCents == null ? '—' : euro(day.countedCents)}</span>
                <span className="font-semibold">Verschil</span><span className="text-right font-bold">{day.differenceCents == null ? '—' : euro(day.differenceCents)}</span>
              </div>
              {day.status === 'open' && (
                <div className="mt-4 flex flex-wrap gap-2 items-end">
                  <input type="number" min={0} step="0.01" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="Geteld bedrag" className="px-3 py-2 border rounded-xl w-40" />
                  <input value={closeNote} onChange={(e) => setCloseNote(e.target.value)} placeholder="Reden bij verschil" className="px-3 py-2 border rounded-xl flex-1 min-w-[180px]" />
                  <button type="button" disabled={busy} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm" onClick={() => void post({ action: 'close', countedEuros: Number(counted) || 0, note: closeNote })}>Dag afsluiten</button>
                </div>
              )}
              {closed && <p className="text-sm text-gray-500 mt-3">{day.closeNote ? `Opmerking: ${day.closeNote}. ` : ''}{day.closedBy ? `Afgesloten door ${day.closedBy}.` : ''}</p>}
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Kasbewegingen</h2>
                {day.status === 'open' && <button type="button" className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm" onClick={() => setShowMove(true)}>+ Kasbeweging</button>}
              </div>
              {day.movements.length === 0 ? <p className="text-sm text-gray-400">Geen bewegingen.</p> : (
                <ul className="divide-y text-sm">
                  {day.movements.map((m) => (
                    <li key={m.id} className="py-2 flex justify-between gap-3">
                      <span>{new Date(m.created_at).toLocaleString('nl-BE')} · {labelOf(m.movement_type)} · {m.description}{m.staff_name ? ` · ${m.staff_name}` : ''}</span>
                      <span className="font-medium">{euro(m.amount_cents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-semibold mb-3">Correcties</h2>
              {day.adjustments.length === 0 ? <p className="text-sm text-gray-400">Geen correcties.</p> : (
                <ul className="text-sm space-y-2">
                  {day.adjustments.map((a) => (
                    <li key={a.id}>{new Date(a.created_at).toLocaleString('nl-BE')} · {euro(a.original_cents)} → {euro(a.corrected_cents)} ({euro(a.difference_cents)}) · {a.reason}</li>
                  ))}
                </ul>
              )}
              {closed && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <input type="number" min={0} step="0.01" value={fixAmount} onChange={(e) => setFixAmount(e.target.value)} placeholder="Nieuw geteld bedrag" className="px-3 py-2 border rounded-xl" />
                  <input value={fixReason} onChange={(e) => setFixReason(e.target.value)} placeholder="Reden" className="px-3 py-2 border rounded-xl flex-1" />
                  <button type="button" disabled={busy} className="px-4 py-2 rounded-xl border text-sm" onClick={() => void post({ action: 'adjustment', fieldName: 'counted', correctedEuros: Number(fixAmount) || 0, reason: fixReason })}>Correctie toevoegen</button>
                </div>
              )}
            </section>

            <div className="flex gap-2">
              <button type="button" className="px-4 py-2 rounded-xl border" onClick={printDay}>Afdrukken</button>
              <button type="button" className="px-4 py-2 rounded-xl border" onClick={exportCsv}>Exporteren</button>
            </div>
          </div>
        )}

        {showMove && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowMove(false)}>
            <form
              className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault()
                void post({
                  action: 'movement',
                  type: moveType,
                  amountEuros: Number(moveAmount),
                  description: moveText,
                  reason: moveReason,
                  staffName: moveStaff,
                  reference: moveRef,
                }).then((ok) => { if (ok) setShowMove(false) })
              }}
            >
              <h3 className="font-semibold">Kasbeweging</h3>
              <select value={moveType} onChange={(e) => setMoveType(e.target.value as CashbookMovementType)} className="w-full border rounded-xl px-3 py-2">
                {MOVEMENTS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <input required type="number" min="0.01" step="0.01" value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} placeholder="Bedrag" className="w-full border rounded-xl px-3 py-2" />
              <input required value={moveText} onChange={(e) => setMoveText(e.target.value)} placeholder="Omschrijving" className="w-full border rounded-xl px-3 py-2" />
              <input value={moveReason} onChange={(e) => setMoveReason(e.target.value)} placeholder="Reden" className="w-full border rounded-xl px-3 py-2" />
              <input value={moveStaff} onChange={(e) => setMoveStaff(e.target.value)} placeholder="Personeelslid" className="w-full border rounded-xl px-3 py-2" />
              <input value={moveRef} onChange={(e) => setMoveRef(e.target.value)} placeholder="Referentie" className="w-full border rounded-xl px-3 py-2" />
              <div className="flex justify-end gap-2">
                <button type="button" className="px-3 py-2" onClick={() => setShowMove(false)}>Annuleren</button>
                <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-gray-900 text-white">Opslaan</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </PinGate>
  )
}
