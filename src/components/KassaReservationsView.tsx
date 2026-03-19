'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

type ReservationStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'no_show' | 'cancelled'

interface Reservation {
  id: string
  tenant_slug: string
  customer_name: string
  customer_phone: string
  customer_email: string
  reservation_date: string
  reservation_time: string
  party_size: number
  notes: string
  status: ReservationStatus
  table_number: string
  occasion?: string
  special_requests?: string
  checked_in_at?: string
  completed_at?: string
  total_spent?: number
  created_at: string
}

type ViewMode = 'today' | 'calendar' | 'list'

const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; bg: string; emoji: string }> = {
  pending:    { label: 'In afwachting', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  emoji: '⏳' },
  confirmed:  { label: 'Bevestigd',     color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  emoji: '✅' },
  checked_in: { label: 'Ingecheckt',    color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   emoji: '🟢' },
  completed:  { label: 'Afgerond',      color: '#6b7280', bg: 'rgba(107,114,128,0.15)', emoji: '☑️' },
  no_show:    { label: 'No-show',       color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   emoji: '❌' },
  cancelled:  { label: 'Geannuleerd',   color: '#9ca3af', bg: 'rgba(156,163,175,0.15)', emoji: '🚫' },
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  tenant: string
  onClose: () => void
  onStartOrder: (tableNumber: string) => void
  kassaTables: { id: string; number: string; seats?: number }[]
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KassaReservationsView({ tenant, onClose, onStartOrder, kassaTables }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('today')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('tenant_slug', tenant)
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true })
    setReservations((data as Reservation[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [tenant])

  const updateStatus = async (id: string, status: ReservationStatus, extra: Partial<Reservation> = {}) => {
    await supabase.from('reservations').update({ status, ...extra }).eq('id', id)
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status, ...extra } : r))
    setSelectedReservation(prev => prev?.id === id ? { ...prev, status, ...extra } : prev)
  }

  const deleteReservation = async (id: string) => {
    await supabase.from('reservations').delete().eq('id', id)
    setReservations(prev => prev.filter(r => r.id !== id))
    setSelectedReservation(null)
  }

  const todayReservations = useMemo(() =>
    reservations.filter(r => r.reservation_date === today && r.status !== 'cancelled'),
    [reservations, today]
  )

  const filteredByDate = useMemo(() =>
    reservations.filter(r => r.reservation_date === selectedDate && r.status !== 'cancelled'),
    [reservations, selectedDate]
  )

  const allActive = useMemo(() =>
    reservations.filter(r => r.status !== 'cancelled' && r.status !== 'completed'),
    [reservations]
  )

  const applySearch = (list: Reservation[]) => {
    if (!searchQuery) return list
    const q = searchQuery.toLowerCase()
    return list.filter(r =>
      r.customer_name.toLowerCase().includes(q) ||
      r.customer_phone?.includes(q) ||
      r.customer_email?.toLowerCase().includes(q)
    )
  }

  const todayStats = {
    total: todayReservations.length,
    confirmed: todayReservations.filter(r => r.status === 'confirmed').length,
    checkedIn: todayReservations.filter(r => r.status === 'checked_in').length,
    completed: todayReservations.filter(r => r.status === 'completed').length,
    noShow: todayReservations.filter(r => r.status === 'no_show').length,
    covers: todayReservations.reduce((s, r) => s + r.party_size, 0),
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })

  const displayList =
    viewMode === 'today' ? applySearch(todayReservations) :
    viewMode === 'calendar' ? applySearch(filteredByDate) :
    applySearch(allActive)

  // ─── Reservation Card ─────────────────────────────────────────────────────

  const ReservationCard = ({ r }: { r: Reservation }) => {
    const cfg = STATUS_CONFIG[r.status]
    return (
      <div
        className="bg-white rounded-2xl border border-gray-200 p-4 cursor-pointer hover:border-[#3C4D6B] hover:shadow-md transition-all"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        onClick={() => setSelectedReservation(r)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-gray-800">{r.reservation_time}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                {cfg.emoji} {cfg.label}
              </span>
              {viewMode !== 'today' && (
                <span className="text-xs text-gray-400">{formatDate(r.reservation_date)}</span>
              )}
            </div>
            <h3 className="font-bold text-lg mt-1 text-gray-900">{r.customer_name}</h3>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-xl">
            <span className="text-lg">👥</span>
            <span className="font-bold text-gray-700">{r.party_size}</span>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1 text-sm text-gray-500 mb-3">
          {r.customer_phone && (
            <div className="flex items-center gap-2">
              <span>📞</span><span>{r.customer_phone}</span>
            </div>
          )}
          {r.table_number && (
            <div className="flex items-center gap-2">
              <span>🪑</span><span>Tafel {r.table_number}</span>
            </div>
          )}
          {r.notes && (
            <div className="flex items-center gap-2">
              <span>📝</span><span className="truncate">{r.notes}</span>
            </div>
          )}
          {r.occasion && (
            <div className="flex items-center gap-2">
              <span>🎉</span><span>{r.occasion}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {r.status === 'pending' && (
            <button
              onClick={(e) => { e.stopPropagation(); updateStatus(r.id, 'confirmed') }}
              className="flex-1 py-2 px-3 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
            >
              ✅ Bevestigen
            </button>
          )}
          {r.status === 'confirmed' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); updateStatus(r.id, 'checked_in', { checked_in_at: new Date().toISOString() }) }}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
              >
                🟢 Check-in
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); updateStatus(r.id, 'no_show') }}
                className="py-2 px-3 rounded-xl bg-red-100 text-red-500 text-sm font-semibold hover:bg-red-200 transition-colors"
              >
                ❌
              </button>
            </>
          )}
          {r.status === 'checked_in' && (
            <button
              onClick={(e) => { e.stopPropagation(); if (r.table_number) { onStartOrder(r.table_number); onClose() } else setSelectedReservation(r) }}
              className="flex-1 py-2 px-3 rounded-xl bg-[#3C4D6B] text-white text-sm font-semibold hover:bg-[#2D3A52] transition-colors"
            >
              🍽️ Naar Kassa
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">📅</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Reservaties</h1>
              <p className="text-sm text-gray-500">{formatDate(today)} · {todayStats.covers} personen verwacht</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors flex items-center gap-2"
            >
              <span className="text-lg">+</span> Nieuwe Reservatie
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-6 gap-2 mb-4">
          {[
            { label: 'Totaal', val: todayStats.total, color: 'bg-gray-50 text-gray-700' },
            { label: 'Bevestigd', val: todayStats.confirmed, color: 'bg-blue-50 text-blue-600' },
            { label: 'Ingecheckt', val: todayStats.checkedIn, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Afgerond', val: todayStats.completed, color: 'bg-gray-50 text-gray-500' },
            { label: 'No-show', val: todayStats.noShow, color: 'bg-red-50 text-red-500' },
            { label: 'Personen', val: todayStats.covers, color: 'bg-[#3C4D6B]/10 text-[#3C4D6B]' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
              <p className="text-2xl font-bold">{s.val}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {([
              { id: 'today', label: 'Vandaag' },
              { id: 'calendar', label: 'Kalender' },
              { id: 'list', label: 'Alle' },
            ] as { id: ViewMode; label: string }[]).map(v => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  viewMode === v.id ? 'bg-[#3C4D6B] text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Zoek naam, telefoon of email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 border border-transparent focus:border-[#3C4D6B] outline-none text-sm"
            />
          </div>
        </div>

        {/* Kalender datum picker */}
        {viewMode === 'calendar' && (
          <div className="flex items-center justify-center gap-4 mt-3">
            <button
              onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split('T')[0]) }}
              className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            >◀</button>
            <div className="text-center">
              <p className="font-bold">{formatDate(selectedDate)}</p>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="mt-1 px-3 py-1 rounded-lg bg-gray-100 border border-gray-200 text-sm outline-none"
              />
            </div>
            <button
              onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split('T')[0]) }}
              className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            >▶</button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-lg">Laden...</div>
        ) : displayList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="text-6xl mb-4">📅</span>
            <p className="text-lg font-semibold">Geen reservaties</p>
            <button
              onClick={() => setShowNewModal(true)}
              className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors"
            >
              Eerste reservatie aanmaken
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayList.map(r => <ReservationCard key={r.id} r={r} />)}
          </div>
        )}
      </div>

      {/* Nieuwe Reservatie Modal */}
      {showNewModal && (
        <NewReservationModal
          tenant={tenant}
          kassaTables={kassaTables}
          onClose={() => setShowNewModal(false)}
          onSaved={() => { setShowNewModal(false); load() }}
        />
      )}

      {/* Detail Modal */}
      {selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          kassaTables={kassaTables}
          onClose={() => setSelectedReservation(null)}
          onUpdate={async (id, status, extra) => { await updateStatus(id, status, extra); load() }}
          onDelete={deleteReservation}
          onStartOrder={(tableNr) => { onStartOrder(tableNr); onClose() }}
          onAssignTable={async (tableNr) => {
            await supabase.from('reservations').update({ table_number: tableNr }).eq('id', selectedReservation.id)
            setReservations(prev => prev.map(r => r.id === selectedReservation.id ? { ...r, table_number: tableNr } : r))
            setSelectedReservation(prev => prev ? { ...prev, table_number: tableNr } : prev)
          }}
        />
      )}
    </div>
  )
}

// ─── Nieuwe Reservatie Modal ─────────────────────────────────────────────────

function NewReservationModal({ tenant, kassaTables, onClose, onSaved }: {
  tenant: string
  kassaTables: { id: string; number: string; seats?: number }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    reservation_date: new Date().toISOString().split('T')[0],
    reservation_time: '19:00',
    party_size: 2,
    table_number: '',
    notes: '',
    special_requests: '',
    occasion: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const timeSlots: string[] = []
  for (let h = 11; h <= 22; h++) {
    timeSlots.push(`${String(h).padStart(2,'0')}:00`)
    timeSlots.push(`${String(h).padStart(2,'0')}:30`)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.customer_name.trim()) e.customer_name = 'Naam is verplicht'
    if (!form.reservation_date) e.reservation_date = 'Datum is verplicht'
    if (!form.reservation_time) e.reservation_time = 'Tijd is verplicht'
    if (form.party_size < 1) e.party_size = 'Min. 1 persoon'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    await supabase.from('reservations').insert({
      tenant_slug: tenant,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      customer_email: form.customer_email,
      reservation_date: form.reservation_date,
      reservation_time: form.reservation_time,
      party_size: form.party_size,
      table_number: form.table_number,
      notes: form.notes,
      special_requests: form.special_requests,
      occasion: form.occasion,
      status: 'confirmed',
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">📅</span> Nieuwe Reservatie
          </h2>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl">✕</button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Naam */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Naam gast *</label>
            <input
              type="text"
              value={form.customer_name}
              onChange={e => setForm({ ...form, customer_name: e.target.value })}
              placeholder="Jan Janssen"
              className={`w-full px-4 py-3 rounded-xl bg-gray-50 border ${errors.customer_name ? 'border-red-500' : 'border-gray-200'} focus:border-[#3C4D6B] outline-none`}
            />
            {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name}</p>}
          </div>

          {/* Telefoon & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">Telefoon</label>
              <input
                type="tel"
                value={form.customer_phone}
                onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                placeholder="+32 ..."
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#3C4D6B] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">Email</label>
              <input
                type="email"
                value={form.customer_email}
                onChange={e => setForm({ ...form, customer_email: e.target.value })}
                placeholder="jan@email.be"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#3C4D6B] outline-none"
              />
            </div>
          </div>

          {/* Datum & Tijd */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">Datum *</label>
              <input
                type="date"
                value={form.reservation_date}
                onChange={e => setForm({ ...form, reservation_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-3 rounded-xl bg-gray-50 border ${errors.reservation_date ? 'border-red-500' : 'border-gray-200'} focus:border-[#3C4D6B] outline-none`}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">Tijd *</label>
              <select
                value={form.reservation_time}
                onChange={e => setForm({ ...form, reservation_time: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#3C4D6B] outline-none"
              >
                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Personen & Tafel */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">Aantal personen *</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, party_size: Math.max(1, form.party_size - 1) })}
                  className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-xl font-bold hover:bg-gray-200"
                >−</button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-bold">{form.party_size}</span>
                  <span className="text-sm text-gray-400 ml-1">pers.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, party_size: Math.min(50, form.party_size + 1) })}
                  className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-xl font-bold hover:bg-gray-200"
                >+</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">Tafel (optioneel)</label>
              <select
                value={form.table_number}
                onChange={e => setForm({ ...form, table_number: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#3C4D6B] outline-none"
              >
                <option value="">Automatisch</option>
                {kassaTables.map(t => (
                  <option key={t.id} value={t.number}>
                    Tafel {t.number}{t.seats ? ` (${t.seats} pers.)` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Gelegenheid */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">Gelegenheid</label>
            <div className="flex flex-wrap gap-2">
              {['', 'Verjaardag', 'Jubileum', 'Zakelijk', 'Romantisch', 'Feest'].map(occ => (
                <button
                  key={occ}
                  type="button"
                  onClick={() => setForm({ ...form, occasion: occ })}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    form.occasion === occ ? 'bg-[#3C4D6B] text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {occ || 'Geen'}
                </button>
              ))}
            </div>
          </div>

          {/* Opmerkingen */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Opmerkingen</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Interne opmerkingen..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#3C4D6B] outline-none resize-none"
            />
          </div>

          {/* Speciale wensen */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Speciale wensen gast</label>
            <textarea
              value={form.special_requests}
              onChange={e => setForm({ ...form, special_requests: e.target.value })}
              placeholder="Allergieën, kinderstoel, rolstoel..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#3C4D6B] outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-4 border-t border-gray-200">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 font-semibold text-gray-700 hover:bg-gray-200 transition-colors">
            Annuleren
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-60"
          >
            {saving ? 'Opslaan...' : 'Reservatie Aanmaken'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function ReservationDetailModal({ reservation, kassaTables, onClose, onUpdate, onDelete, onStartOrder, onAssignTable }: {
  reservation: Reservation
  kassaTables: { id: string; number: string; seats?: number }[]
  onClose: () => void
  onUpdate: (id: string, status: ReservationStatus, extra?: Partial<Reservation>) => void
  onDelete: (id: string) => void
  onStartOrder: (tableNr: string) => void
  onAssignTable: (tableNr: string) => void
}) {
  const cfg = STATUS_CONFIG[reservation.status]
  const [showTableSelect, setShowTableSelect] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                {cfg.emoji} {cfg.label}
              </span>
              <h2 className="text-xl font-bold mt-2 text-gray-900">{reservation.customer_name}</h2>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl">✕</button>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Datum & Tijd */}
          <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl">
            <span className="text-3xl">📅</span>
            <div>
              <p className="font-bold text-lg text-gray-900">{reservation.reservation_time}</p>
              <p className="text-sm text-gray-500">
                {new Date(reservation.reservation_date).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          {/* Personen & Tafel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <p className="text-3xl mb-1">👥</p>
              <p className="text-2xl font-bold text-gray-900">{reservation.party_size}</p>
              <p className="text-xs text-gray-500">personen</p>
            </div>
            <div
              className="p-4 bg-gray-50 rounded-xl text-center cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setShowTableSelect(true)}
            >
              <p className="text-3xl mb-1">🪑</p>
              <p className="text-2xl font-bold text-gray-900">{reservation.table_number || '-'}</p>
              <p className="text-xs text-gray-500">tafel (wijzig)</p>
            </div>
          </div>

          {/* Contact */}
          {reservation.customer_phone && (
            <a href={`tel:${reservation.customer_phone}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <span className="text-xl">📞</span>
              <span className="text-gray-700">{reservation.customer_phone}</span>
            </a>
          )}
          {reservation.customer_email && (
            <a href={`mailto:${reservation.customer_email}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <span className="text-xl">✉️</span>
              <span className="text-gray-700">{reservation.customer_email}</span>
            </a>
          )}

          {/* Opmerkingen */}
          {reservation.notes && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">Opmerkingen</p>
              <p className="text-sm text-gray-700">{reservation.notes}</p>
            </div>
          )}

          {/* Speciale wensen */}
          {reservation.special_requests && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-500 mb-1">⚠️ Speciale wensen</p>
              <p className="text-sm text-gray-700">{reservation.special_requests}</p>
            </div>
          )}

          {/* Gelegenheid */}
          {reservation.occasion && (
            <div className="text-center">
              <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-600">🎉 {reservation.occasion}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 space-y-2">
          {reservation.status === 'pending' && (
            <button
              onClick={() => onUpdate(reservation.id, 'confirmed')}
              className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              ✅ Bevestigen
            </button>
          )}

          {reservation.status === 'confirmed' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdate(reservation.id, 'checked_in', { checked_in_at: new Date().toISOString() })}
                className="py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                🟢 Check-in
              </button>
              <button
                onClick={() => onUpdate(reservation.id, 'no_show')}
                className="py-3 rounded-xl bg-red-100 text-red-500 font-semibold hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
              >
                ❌ No-show
              </button>
            </div>
          )}

          {reservation.status === 'checked_in' && (
            <>
              {reservation.table_number ? (
                <button
                  onClick={() => onStartOrder(reservation.table_number)}
                  className="w-full py-3 rounded-xl bg-[#3C4D6B] text-white font-semibold hover:bg-[#2D3A52] transition-colors flex items-center justify-center gap-2"
                >
                  🍽️ Naar Kassa (Tafel {reservation.table_number})
                </button>
              ) : (
                <button
                  onClick={() => setShowTableSelect(true)}
                  className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
                >
                  🪑 Wijs eerst een tafel toe
                </button>
              )}
              <button
                onClick={() => onUpdate(reservation.id, 'completed', { completed_at: new Date().toISOString() })}
                className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
              >
                ☑️ Afronden
              </button>
            </>
          )}

          {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
            <button
              onClick={() => onUpdate(reservation.id, 'cancelled')}
              className="w-full py-3 rounded-xl bg-gray-100 text-gray-500 font-semibold hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              🚫 Annuleren
            </button>
          )}

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-2 rounded-xl text-red-400 text-sm hover:bg-red-50 transition-colors"
            >
              🗑️ Verwijderen
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">Annuleer</button>
              <button onClick={() => onDelete(reservation.id)} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Definitief verwijderen</button>
            </div>
          )}

          <button onClick={onClose} className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors">
            Sluiten
          </button>
        </div>

        {/* Tafel selectie popup */}
        {showTableSelect && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 rounded-2xl">
            <div className="bg-white rounded-xl p-4 w-full max-w-sm shadow-xl">
              <h3 className="font-bold mb-3 text-gray-900">Kies tafel</h3>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {kassaTables.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { onAssignTable(t.number); setShowTableSelect(false) }}
                    className={`p-3 rounded-xl text-center font-bold transition-colors ${
                      reservation.table_number === t.number
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <span className="block text-lg">{t.number}</span>
                    {t.seats && <span className="text-xs">{t.seats}p</span>}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowTableSelect(false)}
                className="w-full mt-3 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
