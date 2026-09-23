'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import PinGate from '@/components/PinGate'
import { authFetch } from '@/lib/auth-headers'
import {
  cashbookBadge,
  cashbookDayNeedsClose,
  eurosToCents,
  paymentReconciliation,
  vatReconciliation,
  type CashbookMovementType,
} from '@/lib/cashbook-calc'

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
  openedAt: string | null
  openedBy: string | null
  businessName: string
  btwNumber: string
  address: string
  audits: Array<{ id: string; actor: string; action: string; reason: string | null; created_at: string }>
}

type HistoryRow = {
  date: string
  status: string
  grossCents: number
  cashCents: number
  cardCents: number
  onlineCents: number
  outCents: number
  openingCents: number
  expectedCents: number | null
  countedCents: number | null
  differenceCents: number | null
  adjustmentCount: number
  staffNames: string[]
  closureDay?: boolean
  closureChoice?: '' | 'gesloten' | 'vakantie'
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
  return `${sign}€ ${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`
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

function visibleActor(value: string | null | undefined) {
  const name = (value || '').trim()
  if (!name) return ''
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name)) return ''
  return name
}

function actorMoment(prefix: string, who: string | null | undefined, at: string | null | undefined) {
  const name = visibleActor(who)
  if (!name && !at) return ''
  const moment = at ? ` op ${new Date(at).toLocaleString('nl-BE')}` : ''
  return `${prefix}${name ? ` door ${name}` : ''}${moment}`
}

const MONTHS_NL = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']

function belgiumToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date())
}

function monthChoices(today: string, count = 120) {
  const [y, m] = today.split('-').map(Number)
  return Array.from({ length: count }, (_, index) => {
    const dt = new Date(Date.UTC(y, m - 1 - index, 1))
    const value = dt.toISOString().slice(0, 7)
    return { value, label: `${MONTHS_NL[dt.getUTCMonth()]} ${dt.getUTCFullYear()}` }
  })
}

function monthBounds(ym: string, today: string) {
  const [y, m] = ym.split('-').map(Number)
  const from = `${ym}-01`
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  return { from, to: last > today ? today : last }
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
  const [historyLoading, setHistoryLoading] = useState(false)
  const [periodKind, setPeriodKind] = useState<'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'custom'>('month')
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState('')
  const historySpans = useRef<Array<{ from: string; to: string }>>([])
  const historyInflight = useRef(new Set<string>())
  const periodChosen = useRef(false)
  const loadedDate = useRef('')
  const [historyStatus, setHistoryStatus] = useState<'all' | 'open' | 'closed' | 'attention' | 'difference' | 'correction'>('all')
  const [payFilter, setPayFilter] = useState<'all' | 'cash' | 'card' | 'online'>('all')
  const [staffFilter, setStaffFilter] = useState('')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const [showClose, setShowClose] = useState(false)
  const [fixField, setFixField] = useState<'counted' | 'opening' | 'movement'>('counted')
  const [fixMovement, setFixMovement] = useState('')
  const [mailTo, setMailTo] = useState('')
  const [mailOpen, setMailOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [opening, setOpening] = useState('')
  const [openingConfirmed, setOpeningConfirmed] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const [editingMove, setEditingMove] = useState('')
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
    const view = json as DayView
    setDay(view)
    setDate(view.date)
    if (loadedDate.current !== view.date) {
      setCounted('')
      setCloseNote('')
      setOpening('')
      setOpeningConfirmed(false)
    }
    loadedDate.current = view.date
    setLoading(false)
  }, [tenant])

  useEffect(() => {
    let stop = false
    void (async () => {
      await loadDay()
      if (stop || periodChosen.current) return
      const today = belgiumToday()
      const from = `${today.slice(0, 7)}-01`
      setPeriodKind('month')
      setPeriodFrom(from)
      setPeriodTo(today)
      void ensureHistoryRange(from, today)
    })()
    return () => { stop = true }
  }, [loadDay, tenant])

  useEffect(() => {
    if (history.length === 0 || !periodFrom || !periodTo) return
    const today = belgiumToday()
    const count = history.filter((row) => {
      if (row.date < periodFrom || row.date > periodTo || row.date >= today) return false
      return cashbookDayNeedsClose({
        status: row.status,
        differenceCents: row.differenceCents,
        adjustmentCount: row.adjustmentCount || 0,
        grossCents: row.grossCents,
        isPast: true,
        closureDay: row.closureDay,
      })
    }).length
    setPendingCount(count)
  }, [history, periodFrom, periodTo])

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
    historySpans.current = []
    if (body.action === 'opening') {
      setOpeningConfirmed(true)
      setOpening(Number(body.openingEuros).toFixed(2))
    }
    if (body.action === 'close') {
      setOpening('')
      setOpeningConfirmed(false)
      setHistory((rows) => rows.map((row) => row.date === date ? { ...row, status: 'closed' } : row))
    }
    return true
  }

  async function saveClosureChoice(date: string, choice: '' | 'gesloten' | 'vakantie') {
    setError('')
    const res = await authFetch('/api/kasboek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantSlug: tenant, date, action: 'closure', choice }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(json.error || 'Sluitingsdag opslaan mislukt.')
      return
    }
    setHistory((rows) => rows.map((row) => row.date === date ? {
      ...row,
      closureChoice: json.closureChoice || '',
      closureDay: !!json.closureDay,
    } : row))
  }

  async function ensureHistoryRange(from: string, to: string) {
    if (historySpans.current.some((span) => from >= span.from && to <= span.to)) return
    const key = `${from}:${to}`
    if (historyInflight.current.has(key)) return
    historyInflight.current.add(key)
    setHistoryLoading(true)
    try {
      const res = await authFetch(`/api/kasboek?tenantSlug=${encodeURIComponent(tenant)}&from=${from}&to=${to}`)
      const json = await res.json().catch(() => ({}))
      const rows = (json.rows || []) as HistoryRow[]
      setHistory((prev) => {
        const byDate = new Map(prev.map((row) => [row.date, row]))
        for (const row of rows) byDate.set(row.date, row)
        return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1))
      })
      if (res.ok) historySpans.current.push({ from, to })
    } finally {
      historyInflight.current.delete(key)
      setHistoryLoading(false)
    }
  }

  function showPeriod(kind: 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth') {
    periodChosen.current = true
    const range = historyRange(kind, belgiumToday())
    setPeriodKind(kind)
    setPeriodFrom(range.from)
    setPeriodTo(range.to)
    setTab('history')
    void ensureHistoryRange(range.from, range.to)
  }

  function showMonth(ym: string) {
    periodChosen.current = true
    const today = belgiumToday()
    const range = monthBounds(ym, today)
    const thisMonth = today.slice(0, 7)
    const previousMonth = historyRange('lastMonth', today).from.slice(0, 7)
    setPeriodKind(ym === thisMonth ? 'month' : ym === previousMonth ? 'lastMonth' : 'custom')
    setPeriodFrom(range.from)
    setPeriodTo(range.to)
    setTab('history')
    void ensureHistoryRange(range.from, range.to)
  }

  function selectedPeriod() {
    if (periodFrom && periodTo && periodFrom <= periodTo) return { from: periodFrom, to: periodTo }
    return historyRange('month', belgiumToday())
  }

  function monthEnd(ymd: string): string {
    const [year, month] = ymd.slice(0, 7).split('-').map(Number)
    return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
  }

  function periodFor(scope: 'period' | 'month' | 'year') {
    const today = belgiumToday()
    const selected = selectedPeriod()
    if (scope === 'year') return { from: `${today.slice(0, 4)}-01-01`, to: today }
    if (scope === 'month') {
      const start = `${selected.to.slice(0, 7)}-01`
      return { from: start, to: monthEnd(start) }
    }
    return selected
  }

  function downloadPeriod(scope: 'period' | 'month' | 'year') {
    const today = belgiumToday()
    const period = periodFor(scope)
    const to = period.to > today ? today : period.to
    return { from: period.from, to: to < period.from ? period.from : to }
  }

  function historyRowVisible(row: HistoryRow) {
    if (periodFrom && row.date < periodFrom) return false
    if (periodTo && row.date > periodTo) return false
    if (row.grossCents === 0 && row.status === 'none' && !row.closureDay) return false
    const badge = cashbookBadge({ status: row.status, differenceCents: row.differenceCents, adjustmentCount: row.adjustmentCount || 0, grossCents: row.grossCents, isPast: row.date < belgiumToday() })
    if (historyStatus === 'attention' && badge !== 'attention') return false
    if (historyStatus === 'difference' && badge !== 'difference') return false
    if (historyStatus === 'correction' && badge !== 'correction') return false
    if (historyStatus === 'open' && row.status !== 'open') return false
    if (historyStatus === 'closed' && row.status !== 'closed') return false
    if (payFilter === 'cash' && row.cashCents === 0) return false
    if (payFilter === 'card' && row.cardCents === 0) return false
    if (payFilter === 'online' && row.onlineCents === 0) return false
    if (staffFilter.trim() && !(row.staffNames || []).some((name) => name.toLowerCase().includes(staffFilter.trim().toLowerCase()))) return false
    return true
  }

  function statusPresentation(row: HistoryRow) {
    if (row.closureDay && row.grossCents === 0 && row.status !== 'open' && row.status !== 'closed') {
      return { text: 'Sluitingsdag', className: 'text-gray-500', color: '#6b7280' }
    }
    const badge = cashbookBadge({ status: row.status, differenceCents: row.differenceCents, adjustmentCount: row.adjustmentCount || 0, grossCents: row.grossCents, isPast: row.date < belgiumToday() })
    if (badge === 'attention') return { text: 'Nog niet afgesloten', className: 'text-red-600 font-medium', color: '#dc2626' }
    if (badge === 'closed') return { text: 'Afgesloten', className: 'text-green-600 font-medium', color: '#16a34a' }
    if (badge === 'difference') return { text: 'Verschil', className: 'text-red-600 font-medium', color: '#dc2626' }
    if (badge === 'correction') return { text: 'Correctie', className: '', color: '' }
    if (badge === 'open') return { text: 'Nog niet afgesloten', className: 'text-red-600 font-medium', color: '#dc2626' }
    return { text: '—', className: 'text-gray-400', color: '' }
  }

  function closureLabel(row: HistoryRow): string {
    return row.closureChoice === 'vakantie' ? 'Vakantie' : ''
  }

  function printPeriod() {
    const period = periodFor('period')
    const rows = history.filter(historyRowVisible)
    const sum = (pick: (row: HistoryRow) => number) => rows.reduce((total, row) => total + pick(row), 0)
    const differences = rows.map((row) => row.differenceCents).filter((value): value is number => value != null)
    const differenceTotal = differences.length === 0 ? null : differences.reduce((total, value) => total + value, 0)
    const body = rows.map((row) => `<tr><td>${showDate(row.date)}</td><td style="text-align:right">${euro(row.grossCents)}</td><td style="text-align:right">${euro(row.cashCents)}</td><td style="text-align:right">${euro(row.cardCents)}</td><td style="text-align:right">${euro(row.onlineCents)}</td><td style="text-align:right">${row.openingCents > 0 ? euro(row.openingCents) : '—'}</td><td style="text-align:right">${euro(row.outCents)}</td><td style="text-align:right">${row.expectedCents == null ? '—' : euro(row.expectedCents)}</td><td style="text-align:right">${row.countedCents == null ? '—' : euro(row.countedCents)}</td><td style="text-align:right">${row.differenceCents == null ? '—' : euro(row.differenceCents)}</td><td style="color:${statusPresentation(row).color}">${statusPresentation(row).text}</td><td>${closureLabel(row)}</td></tr>`).join('')
    const totalRow = `<tr><td><strong>Totaal</strong></td><td style="text-align:right"><strong>${euro(sum((row) => row.grossCents))}</strong></td><td style="text-align:right"><strong>${euro(sum((row) => row.cashCents))}</strong></td><td style="text-align:right"><strong>${euro(sum((row) => row.cardCents))}</strong></td><td style="text-align:right"><strong>${euro(sum((row) => row.onlineCents))}</strong></td><td></td><td style="text-align:right"><strong>${euro(sum((row) => row.outCents))}</strong></td><td></td><td></td><td style="text-align:right"><strong>${differenceTotal == null ? '—' : euro(differenceTotal)}</strong></td><td></td><td></td></tr>`
    const html = `<!DOCTYPE html><html><head><title>Kasboek ${showDate(period.from)} – ${showDate(period.to)}</title>
      <style>@page{size:A4 landscape;margin:12mm}body{font-family:sans-serif;color:#111}h1{font-size:16px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:4px;text-align:left;font-size:11px}tfoot td{border-top:2px solid #111;font-weight:700;font-size:12px}</style>
      </head><body>
      <h1>VYSION – KASBOEK</h1>
      <p>Periode ${showDate(period.from)} – ${showDate(period.to)}</p>
      <table><thead><tr><th>Datum</th><th>Omzet</th><th>Cash</th><th>Terminal</th><th>Online</th><th>Beginkas</th><th>Cash uit</th><th>Verwacht</th><th>Geteld</th><th>Verschil</th><th>Status</th><th>Sluiting</th></tr></thead><tbody>${body}</tbody><tfoot>${totalRow}</tfoot></table>
      </body></html>`
    const w = window.open('', '_blank', 'width=1100,height=800')
    if (w) {
      w.document.write(html)
      w.document.close()
      w.focus()
      w.print()
    }
    void authFetch('/api/kasboek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantSlug: tenant, date: period.from, action: 'audit', event: 'report_printed', detail: period }),
    })
  }

  async function downloadExport(format: 'csv' | 'pdf' | 'xlsx' | 'boekhouding', from: string, to: string) {
    setError('')
    const res = await authFetch(`/api/kasboek/export?tenantSlug=${encodeURIComponent(tenant)}&from=${from}&to=${to}&format=${format}`)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error || 'Exporteren mislukt.')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vysion-kasboek-${from}-${to}.${format === 'boekhouding' ? 'csv' : format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const closed = day?.status === 'closed'
  const cashIn = (day?.movements || []).filter((m) => m.movement_type === 'cash_in' || m.movement_type === 'other_in' || m.movement_type === 'correction_in').reduce((s, m) => s + m.amount_cents, 0)
  const floatIn = (day?.movements || []).filter((m) => m.movement_type === 'float_in').reduce((s, m) => s + m.amount_cents, 0)
  const cashOut = (day?.movements || []).filter((m) => m.movement_type === 'cash_out' || m.movement_type === 'petty_expense' || m.movement_type === 'other_out' || m.movement_type === 'correction_out').reduce((s, m) => s + m.amount_cents, 0)
  const taken = (day?.movements || []).filter((m) => m.movement_type === 'take_out' || m.movement_type === 'bank_deposit').reduce((s, m) => s + m.amount_cents, 0)
  const payCheck = day ? paymentReconciliation(day.payments) : null
  const vatCheck = day ? vatReconciliation(day.vat, day.payments.grossCents, day.exclCents, day.taxCents) : null

  return (
    <PinGate tenant={tenant}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Digitale kasboek</h1>
            <p className="text-sm text-gray-500">{date ? showDate(date) : ''}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className={`px-3 py-2 rounded-xl text-sm ${tab === 'day' ? 'bg-accent text-white' : 'bg-white border border-accent text-accent'}`} onClick={() => { setTab('day'); void loadDay() }}>Vandaag</button>
            <button type="button" className={`px-3 py-2 rounded-xl text-sm ${tab === 'history' ? 'bg-accent text-white' : 'bg-white border border-accent text-accent'}`} onClick={() => showPeriod('month')}>Historiek</button>
          </div>
        </div>

        {pendingCount > 0 && (
          <button type="button" className="mb-4 w-full text-left text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3" onClick={() => { setHistoryStatus('attention'); showPeriod('month') }}>
            {pendingCount} {pendingCount === 1 ? 'dag moet' : 'dagen moeten'} nog worden afgesloten
          </button>
        )}
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
              <button key={kind} type="button" className={`px-3 py-2 rounded-xl text-sm ${periodKind === kind ? 'bg-accent text-white' : 'bg-white border border-accent text-accent'}`} onClick={() => showPeriod(kind)}>{label}</button>
            ))}
            <select
              value={periodKind === 'month' || periodKind === 'lastMonth' || periodKind === 'custom' ? periodFrom.slice(0, 7) : ''}
              onChange={(e) => { if (e.target.value) showMonth(e.target.value) }}
              className="px-3 py-2 rounded-xl border border-accent text-accent text-sm bg-white"
            >
              <option value="">Kies maand</option>
              {monthChoices(belgiumToday(), 120).map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
            <select value={historyStatus} onChange={(e) => setHistoryStatus(e.target.value as typeof historyStatus)} className="px-3 py-2 rounded-xl border border-accent text-accent text-sm bg-white">
              <option value="all">Alle statussen</option>
              <option value="open">Open</option>
              <option value="closed">Afgesloten</option>
              <option value="attention">Nog niet afgesloten</option>
              <option value="difference">Met kasverschil</option>
              <option value="correction">Met correcties</option>
            </select>
            <select value={payFilter} onChange={(e) => setPayFilter(e.target.value as typeof payFilter)} className="px-3 py-2 rounded-xl border border-accent text-accent text-sm bg-white">
              <option value="all">Alle betaalmethodes</option>
              <option value="cash">Cash</option>
              <option value="card">Terminal</option>
              <option value="online">Online</option>
            </select>
            <input value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} placeholder="Medewerker" className="px-3 py-2 rounded-xl border text-sm" />
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="px-3 py-2 rounded-xl border text-sm" />
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="px-3 py-2 rounded-xl border text-sm" />
            <button type="button" className="px-3 py-2 rounded-xl bg-white border border-accent text-accent text-sm" onClick={() => {
              if (!customFrom || !customTo) return
              setPeriodKind('custom')
              setPeriodFrom(customFrom)
              setPeriodTo(customTo)
              setTab('history')
              void ensureHistoryRange(customFrom, customTo)
            }}>Eigen periode</button>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase">
                  {['Datum', 'Omzet', 'Cash', 'Terminal', 'Online', 'Beginkas', 'Cash uit', 'Verwacht', 'Geteld', 'Verschil', 'Status', 'Sluiting'].map((h) => (
                    <th key={h} className="px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyLoading && !history.some((row) => (!periodFrom || row.date >= periodFrom) && (!periodTo || row.date <= periodTo)) ? (
                  <tr><td className="px-3 py-4 text-gray-500" colSpan={12}>Laden…</td></tr>
                ) : history.filter(historyRowVisible).map((row) => (
                  <tr key={row.date} className="border-t cursor-pointer hover:bg-gray-50" onClick={() => { setTab('day'); void loadDay(row.date) }}>
                    <td className="px-3 py-2">{showDate(row.date)}</td>
                    <td className="px-3 py-2">{euro(row.grossCents)}</td>
                    <td className="px-3 py-2">{euro(row.cashCents)}</td>
                    <td className="px-3 py-2">{euro(row.cardCents)}</td>
                    <td className="px-3 py-2">{euro(row.onlineCents)}</td>
                    <td className="px-3 py-2">{euro(row.openingCents || 0)}</td>
                    <td className="px-3 py-2">{euro(row.outCents)}</td>
                    <td className="px-3 py-2">{row.expectedCents == null ? '—' : euro(row.expectedCents)}</td>
                    <td className="px-3 py-2">{row.countedCents == null ? '—' : euro(row.countedCents)}</td>
                    <td className="px-3 py-2">{row.differenceCents == null ? '—' : euro(row.differenceCents)}</td>
                    <td className={`px-3 py-2 ${statusPresentation(row).className}`}>{statusPresentation(row).text}</td>
                    <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                      {row.status === 'closed' || (row.closureDay && row.grossCents === 0 && row.status !== 'open') ? (
                        <span className="text-gray-500">{closureLabel(row)}</span>
                      ) : (
                        <select
                          value={row.closureChoice || ''}
                          onChange={(event) => void saveClosureChoice(row.date, event.target.value as '' | 'gesloten' | 'vakantie')}
                          className="px-2 py-1 rounded-lg border border-accent text-accent text-xs bg-white"
                          aria-label={`Sluiting ${showDate(row.date)}`}
                        >
                          <option value="">Kies</option>
                          <option value="gesloten">Gesloten</option>
                          <option value="vakantie">Vakantie</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90" onClick={printPeriod}>Afdrukken</button>
            <button type="button" className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90" onClick={() => { const period = downloadPeriod('period'); void downloadExport('csv', period.from, period.to) }}>CSV</button>
            <button type="button" className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90" onClick={() => { const period = downloadPeriod('period'); void downloadExport('pdf', period.from, period.to) }}>PDF</button>
            <button type="button" className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90" onClick={() => { const period = downloadPeriod('period'); void downloadExport('pdf', period.from, period.to) }}>Excel</button>
            <button type="button" className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90" onClick={() => { const period = downloadPeriod('period'); void downloadExport('pdf', period.from, period.to) }}>Export voor boekhouding</button>
            <button type="button" className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90" onClick={() => { const period = downloadPeriod('month'); void downloadExport('pdf', period.from, period.to) }}>Download maand</button>
            <button type="button" className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90" onClick={() => { const period = periodFor('year'); void downloadExport('pdf', period.from, period.to) }}>Download jaar</button>
            <button type="button" className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90" onClick={() => setMailOpen(true)}>Verstuur naar boekhouder</button>
          </div>
          </div>
        ) : loading || !day ? (
          <p className="text-gray-500">Laden…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <button type="button" className="px-3 py-2 bg-gray-100 rounded-lg" onClick={() => void loadDay(shiftDate(day.date, -1))}>‹</button>
              <div className="text-center">
                <input type="date" value={day.date} onChange={(event) => { if (event.target.value) void loadDay(event.target.value) }} className="px-3 py-2 rounded-xl border text-sm" />
                <p className="font-semibold mt-1">{day.status === 'closed' ? 'AFGESLOTEN' : day.status === 'open' ? 'OPEN' : 'NOG GEEN BEGINSALDO'}</p>
              </div>
              <button type="button" className="px-3 py-2 bg-gray-100 rounded-lg" onClick={() => void loadDay(shiftDate(day.date, 1))}>›</button>
            </div>

            <p className="text-sm text-gray-500">{day.businessName}{day.btwNumber ? ` · BTW ${day.btwNumber}` : ''}{day.address ? ` · ${day.address}` : ''}</p>
            {actorMoment('Geopend', day.openedBy, day.openedAt) || actorMoment('Afgesloten', day.closedBy, day.closedAt) ? (
              <p className="text-sm text-gray-500">{[actorMoment('Geopend', day.openedBy, day.openedAt), actorMoment('Afgesloten', day.closedBy, day.closedAt)].filter(Boolean).join(' · ')}</p>
            ) : null}
            <section className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wide text-gray-400">Dagontvangstenboek</p>
              <h2 className="font-semibold mb-3">Dagontvangsten</h2>
              <p className="text-3xl font-bold">{euro(day.payments.grossCents)}</p>
              <p className="text-sm text-gray-500 mt-1">{day.payments.count} transacties · excl. btw {euro(day.exclCents)} · btw {euro(day.taxCents)}</p>
              <p className="text-sm text-gray-500">Kortingen {euro(day.payments.discountCents)} · Retouren {euro(day.payments.refundCents)} · Geannuleerd {day.cancelledCount} ({euro(day.cancelledCents)})</p>
              {vatCheck && !vatCheck.ok && (
                <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  BTW-totalen sluiten niet aan op de dagontvangsten. Dagontvangsten: {euro(vatCheck.parts.leftCents)} · BTW-som: {euro(vatCheck.parts.rightCents)} · Verschil: {euro(vatCheck.parts.differenceCents)}
                </p>
              )}
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
              <p className="text-sm text-gray-500 mb-3">Terminal is een betaling aan de betaalterminal in de zaak. Online is een bestelling uit de webshop. Geen van beide zit in de lade.</p>
              <div className="grid grid-cols-3 gap-3">
                <div><p className="text-sm text-gray-400">Cash</p><p className="text-xl font-bold">{euro(day.payments.cashCents)}</p></div>
                <div><p className="text-sm text-gray-400">Terminal</p><p className="text-xl font-bold">{euro(day.payments.cardCents)}</p></div>
                <div><p className="text-sm text-gray-400">Online</p><p className="text-xl font-bold">{euro(day.payments.onlineCents)}</p></div>
              </div>
              {payCheck && !payCheck.ok && (
                <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  Betaalmethodes sluiten niet aan op de dagontvangsten. Dagontvangsten: {euro(payCheck.leftCents)} · Betaalmethodes: {euro(payCheck.rightCents)} · Verschil: {euro(payCheck.differenceCents)}
                </p>
              )}
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wide text-gray-400">Cashkas</p>
              <h2 className="font-semibold mb-1">Fysiek geld in de lade</h2>
              <p className="text-sm text-gray-500 mb-3">Alleen cash telt mee. Een terminal- of online betaling verandert dit saldo niet.</p>
              <div className="flex items-end gap-3 mb-4">
                <label className="text-sm text-gray-500">
                  Beginkas
                  <input
                    key={day.date}
                    type="number"
                    min={0}
                    step="0.01"
                    autoComplete="off"
                    value={opening}
                    onChange={(e) => setOpening(e.target.value)}
                    className="mt-1 block w-36 px-3 py-2 border rounded-xl"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || (!openingConfirmed && opening.trim() === '')}
                  className={`px-4 py-2 rounded-xl text-white text-sm disabled:opacity-100 ${openingConfirmed ? 'bg-green-600' : 'bg-accent hover:bg-accent/90'}`}
                  onClick={() => {
                    if (closed) {
                      setError('Deze dag is afgesloten. Kies een andere dag.')
                      return
                    }
                    if (opening.trim() === '' || Number.isNaN(Number(opening))) return
                    void post({ action: 'opening', openingEuros: Number(opening) })
                  }}
                >
                  {openingConfirmed ? 'Bedrag in kas' : 'Beginsaldo bevestigen'}
                </button>
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
                  <input key={day.date} type="number" min={0} step="0.01" autoComplete="off" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="Geteld bedrag" className="px-3 py-2 border rounded-xl w-40" />
                  <input value={closeNote} onChange={(e) => setCloseNote(e.target.value)} placeholder="Reden bij verschil" className="px-3 py-2 border rounded-xl flex-1 min-w-[180px]" />
                  <button type="button" disabled={busy} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm" onClick={() => setShowClose(true)}>Dag afsluiten</button>
                </div>
              )}
              {closed && <p className="text-sm text-gray-500 mt-3">{day.closeNote ? `Opmerking: ${day.closeNote}. ` : ''}{visibleActor(day.closedBy) ? `Afgesloten door ${visibleActor(day.closedBy)}.` : ''}</p>}
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3 gap-3">
                <h2 className="font-semibold">Kasbewegingen</h2>
                {!closed && (
                  <button type="button" className="px-3 py-2 rounded-xl bg-accent text-white hover:bg-accent/90 text-sm" onClick={() => {
                    if (day.status !== 'open') {
                      setError('Bevestig eerst het beginsaldo hierboven. Daarna kun je een kasbeweging opslaan.')
                      return
                    }
                    setEditingMove('')
                    setMoveType('cash_in')
                    setMoveAmount('')
                    setMoveText('')
                    setMoveReason('')
                    setMoveStaff('')
                    setMoveRef('')
                    setShowMove(true)
                  }}>+ Kasbeweging</button>
                )}
              </div>
              {day.status !== 'open' && !closed && <p className="text-sm text-gray-500 mb-3">Bevestig eerst het beginsaldo. Daarna voeg je hier een kasbeweging toe en bewaar je die met Opslaan.</p>}
              {day.movements.length === 0 ? <p className="text-sm text-gray-400">Geen bewegingen.</p> : (
                <ul className="divide-y text-sm">
                  {day.movements.map((m) => (
                    <li key={m.id} className="py-2 flex justify-between gap-3 items-center">
                      <span>{new Date(m.created_at).toLocaleString('nl-BE')} · {labelOf(m.movement_type)} · {m.description}{m.staff_name ? ` · ${m.staff_name}` : ''}</span>
                      <span className="flex items-center gap-3">
                        <span className="font-medium">{euro(m.amount_cents)}</span>
                        {day.status === 'open' && (
                          <>
                            <button type="button" className="text-accent" onClick={() => {
                              setEditingMove(m.id)
                              setMoveType(m.movement_type)
                              setMoveAmount((m.amount_cents / 100).toFixed(2))
                              setMoveText(m.description)
                              setMoveReason(m.reason || '')
                              setMoveStaff(m.staff_name || '')
                              setMoveRef(m.reference || '')
                              setShowMove(true)
                            }}>Bewerken</button>
                            <button type="button" className="text-red-600" disabled={busy} onClick={() => {
                              if (!window.confirm('Deze kasbeweging verwijderen?')) return
                              void post({ action: 'movement-delete', movementId: m.id })
                            }}>Verwijderen</button>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-semibold mb-3">Correcties</h2>
              {!closed && <p className="text-sm text-gray-500 mb-3">Een correctie bewaar je nadat de dag is afgesloten. Zolang vandaag open is, wijzig je het bedrag via Bewerken bij de kasbeweging en dan Opslaan.</p>}
              {day.adjustments.length === 0 ? <p className="text-sm text-gray-400">Geen correcties.</p> : (
                <ul className="text-sm space-y-3">
                  {day.adjustments.map((a) => (
                    <li key={String(a.id)}>
                      <p>{new Date(String(a.created_at)).toLocaleString('nl-BE')} · {String(a.field_name || '').startsWith('movement:') ? 'Kasbeweging gecorrigeerd' : 'Bedrag gecorrigeerd'}</p>
                      <p>Oorspronkelijk: {euro(Number(a.original_cents) || 0)}</p>
                      <p>Correctie: {euro(Number(a.difference_cents) || 0)}</p>
                      <p>Nieuwe effectieve waarde: {euro(Number(a.corrected_cents) || 0)}</p>
                      <p>Reden: {String(a.reason || '')}</p>
                      <p>Door: {String(a.created_by || '')}</p>
                    </li>
                  ))}
                </ul>
              )}
              {closed && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <select value={fixField} onChange={(e) => setFixField(e.target.value as typeof fixField)} className="px-3 py-2 border rounded-xl text-sm">
                    <option value="counted">Geteld bedrag</option>
                    <option value="opening">Beginsaldo</option>
                    <option value="movement">Kasbeweging</option>
                  </select>
                  {fixField === 'movement' && (
                    <select value={fixMovement} onChange={(e) => setFixMovement(e.target.value)} className="px-3 py-2 border rounded-xl text-sm">
                      <option value="">Kies beweging</option>
                      {day.movements.map((m) => <option key={m.id} value={m.id}>{labelOf(m.movement_type)} {euro(m.amount_cents)}</option>)}
                    </select>
                  )}
                  <input type="number" min={0} step="0.01" value={fixAmount} onChange={(e) => setFixAmount(e.target.value)} placeholder="Nieuwe waarde" className="px-3 py-2 border rounded-xl" />
                  <input value={fixReason} onChange={(e) => setFixReason(e.target.value)} placeholder="Reden" className="px-3 py-2 border rounded-xl flex-1" />
                  <button type="button" disabled={busy || !fixReason.trim()} className="px-4 py-2 rounded-xl bg-accent text-white text-sm hover:bg-accent/90" onClick={() => void post({ action: 'adjustment', fieldName: fixField, movementId: fixMovement, correctedEuros: Number(fixAmount) || 0, reason: fixReason })}>Correctie opslaan</button>
                </div>
              )}
            </section>

            {(day.audits || []).length > 0 && (
              <section className="bg-white border border-gray-200 rounded-2xl p-5">
                <h2 className="font-semibold mb-3">Audit</h2>
                <ul className="text-sm text-gray-600 space-y-1">
                  {day.audits.map((entry) => (
                    <li key={entry.id}>{new Date(entry.created_at).toLocaleString('nl-BE')} · {entry.action}{visibleActor(entry.actor) ? ` · ${visibleActor(entry.actor)}` : ''}{entry.reason ? ` · ${entry.reason}` : ''}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {showClose && day && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowClose(false)}>
            <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-2" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold">Dag definitief afsluiten</h3>
              <p className="text-sm">Dagontvangsten {euro(day.payments.grossCents)} · excl. {euro(day.exclCents)} · btw {euro(day.taxCents)}</p>
              <p className="text-sm">Cash {euro(day.payments.cashCents)} · Terminal {euro(day.payments.cardCents)} · Online {euro(day.payments.onlineCents)}</p>
              <p className="text-sm">Verwacht in de lade {euro(day.expectedCents)}</p>
              <p className="text-sm">Geteld {euro(eurosToCents(Number(counted) || 0))} · Verschil {euro(eurosToCents(Number(counted) || 0) - day.expectedCents)}</p>
              {eurosToCents(Number(counted) || 0) - day.expectedCents !== 0 && !closeNote.trim() && (
                <p className="text-sm text-amber-800">Bij een kasverschil is een reden verplicht. Vul die in op het kasblok.</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="px-3 py-2" onClick={() => setShowClose(false)}>Annuleren</button>
                <button
                  type="button"
                  disabled={busy}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white"
                  onClick={() => {
                    const difference = eurosToCents(Number(counted) || 0) - day.expectedCents
                    if (difference !== 0 && !closeNote.trim()) {
                      setError('Bij een kasverschil is een reden verplicht.')
                      return
                    }
                    void post({ action: 'close', countedEuros: Number(counted) || 0, note: closeNote }).then((ok) => {
                      if (!ok) return
                      setShowClose(false)
                      setCounted('')
                      setCloseNote('')
                    })
                  }}
                >
                  Definitief afsluiten
                </button>
              </div>
            </div>
          </div>
        )}
        {mailOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setMailOpen(false)}>
            <form
              className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault()
                const period = periodFor('period')
                setBusy(true)
                void authFetch('/api/kasboek/email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tenantSlug: tenant, from: period.from, to: period.to, toEmail: mailTo || undefined }),
                }).then(async (res) => {
                  const json = await res.json().catch(() => ({}))
                  setBusy(false)
                  if (!res.ok) {
                    setError(json.error || 'Versturen mislukt.')
                    return
                  }
                  setMailOpen(false)
                })
              }}
            >
              <h3 className="font-semibold">Verstuur naar boekhouder</h3>
              <p className="text-sm text-gray-500">Periode {showDate(periodFor('period').from)} – {showDate(periodFor('period').to)}. Bijlage: PDF en boekhoud-CSV van die hele periode. Er wordt niets automatisch verstuurd.</p>
              <input value={mailTo} onChange={(e) => setMailTo(e.target.value)} placeholder="boekhouder@email.be" className="w-full border rounded-xl px-3 py-2" />
              <p className="text-xs text-gray-400">Laat leeg om het adres uit Instellingen → Boekhouding te gebruiken.</p>
              <div className="flex justify-end gap-2">
                <button type="button" className="px-3 py-2" onClick={() => setMailOpen(false)}>Annuleren</button>
                <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90">Versturen</button>
              </div>
            </form>
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
                  action: editingMove ? 'movement-update' : 'movement',
                  movementId: editingMove || undefined,
                  type: moveType,
                  amountEuros: Number(moveAmount),
                  description: moveText,
                  reason: moveReason,
                  staffName: moveStaff,
                  reference: moveRef,
                }).then((ok) => { if (ok) { setShowMove(false); setEditingMove('') } })
              }}
            >
              <h3 className="font-semibold">{editingMove ? 'Kasbeweging bewerken' : 'Kasbeweging'}</h3>
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
                <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90">Opslaan</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </PinGate>
  )
}
