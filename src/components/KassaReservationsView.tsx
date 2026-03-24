'use client'

/**
 * KassaReservationsView - Professioneel Reservatiesysteem
 * Exact gekopieerd van ReservationsView (vysion-horeca) + Supabase + email
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  CalendarDays,
  Users,
  Clock,
  MapPin,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  UserX,
  Phone,
  Mail,
  MessageSquare,
  Settings,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Star,
  Ban,
  X,
  UtensilsCrossed,
  Send,
  Lock,
  LockOpen,
  Eye,
  EyeOff,
  Calendar,
  GripVertical,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getAuthHeaders } from '@/lib/auth-headers'

// ---- Types ----
type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'WAITLIST'
type ViewMode = 'today' | 'calendar' | 'month' | 'list' | 'floorplan' | 'timeline' | 'guests' | 'stats' | 'settings' | 'reservations'

interface Reservation {
  id: string
  tenant_slug: string
  guest_name: string
  guest_phone?: string
  guest_email?: string
  party_size: number
  reservation_date: string
  reservation_time: string
  duration_minutes: number
  table_number?: string
  notes?: string
  special_requests?: string
  occasion?: string
  status: ReservationStatus
  checked_in_at?: string
  completed_at?: string
  total_spent: number
  created_at?: string
  payment_status?: string
  stripe_session_id?: string
  stripe_payment_method_id?: string
  deposit_amount?: number
  waitlist_position?: number
}

interface KassaTable {
  id: string
  number: string
  seats: number
  status: string
}

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  isActive: boolean
}

interface ReservationSettings {
  isEnabled: boolean
  acceptOnline: boolean
  maxPartySize: number
  defaultDurationMinutes: number
  bufferMinutes: number
  slotDurationMinutes: number
  maxReservationsPerSlot: number
  maxCoversPerSlot: number
  minAdvanceHours: number
  maxAdvanceDays: number
  kitchenCapacityEnabled: boolean
  kitchenMaxCoversPer15min: number
  closedDays: number[]
  // z2 - Shifts
  shifts: Shift[]
  // z4 - Annuleringsbeleid
  cancellationDeadlineHours: number
  cancellationMessage: string
  // z5 - Review
  reviewLink: string
  autoSendReview: boolean
  // z8/z9 - Betaling
  depositRequired: boolean
  depositAmount: number
  noShowProtection: boolean
  noShowFee: number
  // Booking widget URL label
  bookingPageEnabled: boolean
  // Bevestigingsmodus: automatisch of handmatig
  autoConfirm: boolean
}

interface GuestProfile {
  id: string
  name: string
  phone?: string
  email?: string
  isVip: boolean
  isBlocked: boolean
  totalVisits: number
  totalNoShows: number
  totalSpent: number
  lastVisit?: string
  notes?: string
}

interface FloorPlanTable {
  id: string
  number: string
  seats: number
  shape: 'ROUND' | 'SQUARE' | 'RECTANGLE'
  x: number
  y: number
  rotation: number
  status: string
}

// ---- Props ----
interface KassaReservationsViewProps {
  tenant: string
  kassaTables: KassaTable[]
  onClose: () => void
  onStartOrder: (tableNr: string) => void
}

// ---- Rapporten View ----
function RapportenView({ reservations, guestProfiles }: { reservations: Reservation[], guestProfiles: GuestProfile[] }) {
  const now = new Date()
  const [rMonth, setRMonth] = useState(now.getMonth())
  const [rYear, setRYear] = useState(now.getFullYear())

  const MONTHS = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']

  // Filter reserveringen op geselecteerde maand
  const from = `${rYear}-${String(rMonth+1).padStart(2,'0')}-01`
  const to = `${rYear}-${String(rMonth+1).padStart(2,'0')}-${String(new Date(rYear, rMonth+1, 0).getDate()).padStart(2,'0')}`
  const filtered = reservations.filter(r => r.reservation_date >= from && r.reservation_date <= to)
  const active = filtered.filter(r => r.status !== 'CANCELLED')
  const total = active.length
  const cancelled = filtered.filter(r => r.status === 'CANCELLED').length
  const noShows = filtered.filter(r => r.status === 'NO_SHOW').length
  const avgGroup = total > 0 ? (active.reduce((s, r) => s + r.party_size, 0) / total) : 0

  // Terugkerende gasten = gasten met >1 reservering ooit
  const returningPct = guestProfiles.length > 0
    ? Math.round((guestProfiles.filter(g => g.totalVisits > 1).length / guestProfiles.length) * 100)
    : 0
  const cancelPct = filtered.length > 0 ? Math.round((cancelled / filtered.length) * 100) : 0
  const noShowPct = total > 0 ? Math.round((noShows / total) * 100) : 0

  // Bouw dagseries op voor grafieken
  const daysInMonth = new Date(rYear, rMonth+1, 0).getDate()
  const dayLabels = Array.from({length: daysInMonth}, (_, i) => {
    const d = new Date(rYear, rMonth, i+1)
    return `${['Zo','Ma','Di','Wo','Do','Vr','Za'][d.getDay()]} ${i+1}`
  })
  const guestsByDay = Array.from({length: daysInMonth}, (_, i) => {
    const d = `${rYear}-${String(rMonth+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`
    return active.filter(r => r.reservation_date === d).reduce((s, r) => s + r.party_size, 0)
  })
  const resByDay = Array.from({length: daysInMonth}, (_, i) => {
    const d = `${rYear}-${String(rMonth+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`
    return active.filter(r => r.reservation_date === d).length
  })

  const maxGuests = Math.max(...guestsByDay, 1)
  const maxRes = Math.max(...resByDay, 1)

  const totalGuests = guestsByDay.reduce((s, v) => s + v, 0)
  const totalRes = resByDay.reduce((s, v) => s + v, 0)

  // SVG area chart
  const AreaChart = ({ data, max, color }: { data: number[], max: number, color: string }) => {
    const W = 1000, H = 140, PAD = 8
    const pts = data.map((v, i) => {
      const x = PAD + (i / (data.length - 1 || 1)) * (W - PAD*2)
      const y = H - PAD - ((v / max) * (H - PAD*2))
      return `${x},${y}`
    })
    const linePath = `M ${pts.join(' L ')}`
    const areaPath = `M ${PAD},${H-PAD} L ${pts.join(' L ')} L ${W-PAD},${H-PAD} Z`
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height: 150}}>
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        {/* Grid lijnen */}
        {[0.25,0.5,0.75,1].map(f => (
          <line key={f} x1={PAD} y1={H-PAD-(f*(H-PAD*2))} x2={W-PAD} y2={H-PAD-(f*(H-PAD*2))}
            stroke="#e5e7eb" strokeWidth="1"/>
        ))}
        {/* Area */}
        <path d={areaPath} fill={`url(#grad-${color})`}/>
        {/* Lijn */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
        {/* Punten */}
        {pts.map((pt, i) => data[i] > 0 && (
          <circle key={i} cx={Number(pt.split(',')[0])} cy={Number(pt.split(',')[1])} r="3.5" fill={color}/>
        ))}
      </svg>
    )
  }

  // X-as labels (elke ~5 dagen)
  const xLabels = dayLabels.filter((_, i) => i % Math.ceil(daysInMonth / 10) === 0 || i === daysInMonth - 1)
  const xIdxs = Array.from({length: daysInMonth}, (_,i) => i).filter((i) => i % Math.ceil(daysInMonth / 10) === 0 || i === daysInMonth - 1)

  // Status verdeling
  const statusData = [
    { label: 'Bevestigd', status: 'CONFIRMED', color: '#3b82f6' },
    { label: 'Ingecheckt', status: 'CHECKED_IN', color: '#22c55e' },
    { label: 'Afgerond', status: 'COMPLETED', color: '#6b7280' },
    { label: 'No-show', status: 'NO_SHOW', color: '#ef4444' },
    { label: 'Geannuleerd', status: 'CANCELLED', color: '#d1d5db' },
  ]

  return (
    <div className="space-y-5 pb-8">
      {/* Filter balk */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Datumbereik</label>
          <div className="flex items-center gap-2">
            <select value={rMonth} onChange={e => setRMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:border-orange-400">
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={rYear} onChange={e => setRYear(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:border-orange-400">
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="h-8 w-px bg-gray-200 hidden sm:block"/>
        <div className="text-sm text-gray-500">
          <span className="font-semibold text-gray-800">{total}</span> reservaties &nbsp;·&nbsp;
          <span className="font-semibold text-gray-800">{totalGuests}</span> gasten in {MONTHS[rMonth]} {rYear}
        </div>
      </div>

      {/* KPI kaarten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Terugkerende gasten', value: `${returningPct}%`, sub: 'van alle gasten', color: 'text-gray-800' },
          { label: 'Annuleringen', value: `${cancelPct}%`, sub: `${cancelled} geannuleerd`, color: cancelPct > 20 ? 'text-red-500' : 'text-gray-800' },
          { label: 'No-shows', value: `${noShowPct}%`, sub: `${noShows} no-show`, color: noShowPct > 10 ? 'text-red-500' : 'text-gray-800' },
          { label: 'Gem. groepsgrootte', value: avgGroup > 0 ? avgGroup.toFixed(1) : '—', sub: 'personen per reservatie', color: 'text-gray-800' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</p>
            <p className={`text-3xl font-bold mb-1 ${color}`}>{value}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Gasten per dag */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-bold text-gray-800">Gasten per dag</h4>
            <p className="text-xs text-gray-400 mt-0.5">{MONTHS[rMonth]} {rYear}</p>
          </div>
          <span className="text-sm font-semibold text-gray-500">Totaal: {totalGuests}</span>
        </div>
        <AreaChart data={guestsByDay} max={maxGuests} color="#f97316"/>
        {/* X-as labels */}
        <div className="flex justify-between mt-1 px-2">
          {xIdxs.map(i => (
            <span key={i} className="text-xs text-gray-400">{dayLabels[i]}</span>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-3 h-3 rounded-full bg-orange-400"/>
          <span className="text-xs text-gray-500">Handmatig / kassa</span>
        </div>
      </div>

      {/* Reserveringen per dag */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-bold text-gray-800">Reserveringen per dag</h4>
            <p className="text-xs text-gray-400 mt-0.5">{MONTHS[rMonth]} {rYear}</p>
          </div>
          <span className="text-sm font-semibold text-gray-500">Totaal: {totalRes}</span>
        </div>
        <AreaChart data={resByDay} max={maxRes} color="#3b82f6"/>
        <div className="flex justify-between mt-1 px-2">
          {xIdxs.map(i => (
            <span key={i} className="text-xs text-gray-400">{dayLabels[i]}</span>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-3 h-3 rounded-full bg-blue-400"/>
          <span className="text-xs text-gray-500">Handmatig / kassa</span>
        </div>
      </div>

      {/* Status verdeling + Top gasten */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="font-bold text-gray-800 mb-4">Status verdeling</h4>
          <div className="space-y-3">
            {statusData.map(({ label, status, color }) => {
              const count = filtered.filter(r => r.status === status).length
              const pct = filtered.length > 0 ? (count / filtered.length) * 100 : 0
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-gray-600 shrink-0">{label}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{width:`${pct}%`, backgroundColor: color}}/>
                  </div>
                  <span className="w-8 text-right text-sm font-semibold text-gray-700">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="font-bold text-gray-800 mb-4">Top 5 meest terugkerende gasten</h4>
          <div className="space-y-3">
            {[...guestProfiles].sort((a,b) => b.totalVisits - a.totalVisits).slice(0,5).map((g, i) => (
              <div key={g.id} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">{g.name}</p>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full" style={{width:`${Math.min(100,(g.totalVisits/([...guestProfiles].sort((a,b)=>b.totalVisits-a.totalVisits)[0]?.totalVisits||1))*100)}%`}}/>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-600 shrink-0">{g.totalVisits}x</span>
              </div>
            ))}
            {guestProfiles.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Nog geen gastdata</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Contacts / Gasten tabel view — exact zoals screenshot 2 ----
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function ContactsView({
  guestProfiles,
  searchQuery,
  setSearchQuery,
}: {
  guestProfiles: GuestProfile[]
  searchQuery: string
  setSearchQuery: (q: string) => void
}) {
  // Standaard: meest recent bovenaan — nieuwe klanten zijn altijd zichtbaar
  const [guestSort, setGuestSort] = useState<'lastVisit' | 'name' | 'visits'>('lastVisit')
  const [guestSortDir, setGuestSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [noShowRed, setNoShowRed] = useState<Set<string>>(new Set())

  const changeSort = (col: typeof guestSort) => {
    if (guestSort === col) setGuestSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setGuestSort(col); setGuestSortDir('desc') }
    setPage(0)
  }

  const filtered = guestProfiles
    .filter(g => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return g.name.toLowerCase().includes(q) || g.phone?.includes(q) || g.email?.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      let cmp = 0
      if (guestSort === 'visits') cmp = a.totalVisits - b.totalVisits
      else if (guestSort === 'name') cmp = a.name.localeCompare(b.name)
      else cmp = (a.lastVisit || '').localeCompare(b.lastVisit || '')
      return guestSortDir === 'desc' ? -cmp : cmp
    })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice(page * pageSize, page * pageSize + pageSize)
  const from = filtered.length === 0 ? 0 : page * pageSize + 1
  const to = Math.min(page * pageSize + pageSize, filtered.length)

  const SortTh = ({ col, label, right }: { col: typeof guestSort; label: string; right?: boolean }) => (
    <div
      onClick={() => changeSort(col)}
      className={`text-xs font-bold uppercase tracking-wider cursor-pointer select-none text-gray-500 hover:text-gray-900 flex items-center gap-1 ${right ? 'justify-end' : ''}`}
    >
      {label}
      {guestSort === col && <span>{guestSortDir === 'desc' ? '↓' : '↑'}</span>}
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Zoekbalk */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setPage(0) }}
          placeholder="Zoek op naam, email of telefoon..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm outline-none focus:border-[#3C4D6B]"
        />
      </div>

      <p className="text-sm text-gray-400">{filtered.length} contacten</p>

      {/* Lege staat */}
      {paginated.length === 0 && (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
          {searchQuery ? 'Geen resultaten voor deze zoekopdracht' : 'Nog geen gasten — ze verschijnen automatisch na de eerste reservatie'}
        </div>
      )}

      {/* Kolommentabel via CSS grid — geen HTML table → geen overflow problemen */}
      {paginated.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

          {/* Header */}
          <div className="grid items-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-white"
            style={{ gridTemplateColumns: 'minmax(120px,2fr) minmax(120px,1.5fr) minmax(100px,1fr) 100px 90px', columnGap: '16px', backgroundColor: '#f97316' }}>
            <div onClick={() => changeSort('name')} className="cursor-pointer select-none hover:opacity-80 flex items-center gap-1">
              Naam {guestSort === 'name' && <span>{guestSortDir === 'desc' ? '↓' : '↑'}</span>}
            </div>
            <div>Telefoon</div>
            <div onClick={() => changeSort('lastVisit')} className="cursor-pointer select-none hover:opacity-80 hidden md:flex items-center gap-1">
              Laatste bezoek {guestSort === 'lastVisit' && <span>{guestSortDir === 'desc' ? '↓' : '↑'}</span>}
            </div>
            <div onClick={() => changeSort('visits')} className="cursor-pointer select-none hover:opacity-80 flex items-center gap-1">
              Aantal bezoeken {guestSort === 'visits' && <span>{guestSortDir === 'desc' ? '↓' : '↑'}</span>}
            </div>
            <div>No-show</div>
          </div>

          {/* Rijen */}
          <div className="divide-y divide-gray-100">
            {paginated.map((guest: GuestProfile) => {
              const isRed = noShowRed.has(guest.id)
              const lastVisitFmt = guest.lastVisit
                ? new Date(guest.lastVisit + 'T12:00').toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'
              return (
                <div key={guest.id}
                  className="grid items-center px-4 py-3 hover:bg-gray-50 transition-colors"
                  style={{ gridTemplateColumns: 'minmax(120px,2fr) minmax(120px,1.5fr) minmax(100px,1fr) 100px 90px', columnGap: '16px' }}
                >
                  {/* Naam */}
                  <div className="font-semibold text-gray-900 flex items-center gap-1.5 min-w-0 pr-2">
                    {guest.isVip && <Star size={12} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                    <span className="truncate">{guest.name}</span>
                  </div>
                  {/* Telefoon */}
                  <div className="text-gray-600 text-sm pr-2">
                    {guest.phone
                      ? <a href={`tel:${guest.phone}`} className="hover:underline hover:text-[#3C4D6B]">{guest.phone}</a>
                      : <span className="text-gray-300">—</span>}
                  </div>
                  {/* Laatste bezoek */}
                  <div className="text-gray-500 text-sm hidden md:block pr-2">{lastVisitFmt}</div>
                  {/* Aantal */}
                  <div className="font-bold text-gray-800 text-right pr-4">{guest.totalVisits}</div>
                  {/* No-show */}
                  <button
                    onClick={() => setNoShowRed(prev => { const s = new Set(prev); s.has(guest.id) ? s.delete(guest.id) : s.add(guest.id); return s })}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors w-fit ${isRed ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                  >
                    No-show
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Paginering */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-500">
        <span>{from}–{to} van {filtered.length}</span>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }}
            className="rounded-lg px-2 py-1 text-sm bg-gray-100 border border-gray-200 outline-none cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s} per pagina</option>)}
          </select>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 hover:bg-gray-100 font-bold">‹</button>
          <span className="font-medium">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 hover:bg-gray-100 font-bold">›</button>
        </div>
      </div>
    </div>
  )
}

// ---- Reservation Table SVG — identiek aan KassaFloorPlan stijl ----
function ReservationTableSVG({ table, statusColor, isSelected, guests }: {
  table: FloorPlanTable
  statusColor: string
  isSelected: boolean
  guests?: { name: string; time: string }[]
}) {
  const seats = table.seats
  const tableSize = 90
  const chairW = 26
  const chairH = 22
  const gap = 14

  type Chair = { x: number; y: number; angle: number }
  const chairs: Chair[] = []

  if (table.shape === 'ROUND') {
    if (seats === 2) {
      const dist = tableSize / 2 + gap + chairH / 2
      chairs.push({ x: 0, y: -dist, angle: -90 })
      chairs.push({ x: 0, y: dist, angle: 90 })
    } else {
      const dist = tableSize / 2 + gap + chairH / 2
      for (let i = 0; i < seats; i++) {
        const angle = (i * 360) / seats - 90
        const rad = (angle * Math.PI) / 180
        chairs.push({ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, angle })
      }
    }
  } else if (table.shape === 'SQUARE') {
    const half = tableSize / 2
    const dist = half + gap + chairH / 2
    if (seats === 2) {
      chairs.push({ x: 0, y: -dist, angle: -90 })
      chairs.push({ x: 0, y: dist, angle: 90 })
    } else {
      const perSide = Math.ceil(seats / 4)
      const sides = [
        { angle: -90, axis: 'x' as const, fixed: -dist },
        { angle: 0,   axis: 'y' as const, fixed: dist },
        { angle: 90,  axis: 'x' as const, fixed: dist },
        { angle: 180, axis: 'y' as const, fixed: -dist },
      ]
      let placed = 0
      for (const side of sides) {
        const count = Math.min(perSide, seats - placed)
        for (let i = 0; i < count; i++) {
          const offset = (i - (count - 1) / 2) * (chairW + 6)
          chairs.push({
            x: side.axis === 'x' ? offset : side.fixed,
            y: side.axis === 'y' ? offset : side.fixed,
            angle: side.angle,
          })
          placed++
        }
        if (placed >= seats) break
      }
    }
  } else {
    // RECTANGLE
    const rectTw = tableSize * 1.7
    const rectTh = tableSize * 0.65
    const perLong = Math.ceil(seats / 2)
    const distTop = rectTh / 2 + gap + chairH / 2
    const distSide = rectTw / 2 + gap + chairH / 2
    let placed = 0
    for (let i = 0; i < perLong && placed < seats; i++) {
      chairs.push({ x: (i - (perLong - 1) / 2) * (chairW + 6), y: -distTop, angle: -90 })
      placed++
    }
    for (let i = 0; i < perLong && placed < seats; i++) {
      chairs.push({ x: (i - (perLong - 1) / 2) * (chairW + 6), y: distTop, angle: 90 })
      placed++
    }
    if (placed < seats) { chairs.push({ x: -distSide, y: 0, angle: 180 }); placed++ }
    if (placed < seats) { chairs.push({ x: distSide, y: 0, angle: 0 }) }
  }

  const pad = 80
  const tw = table.shape === 'RECTANGLE' ? tableSize * 1.7 : tableSize
  const th = table.shape === 'RECTANGLE' ? tableSize * 0.65 : tableSize
  const svgW = tw + pad * 2 + 40
  const svgH = th + pad * 2 + 40
  const cx = svgW / 2
  const cy = svgH / 2

  const uid = table.id.replace(/[^a-z0-9]/gi, '')

  return (
    <svg width={svgW} height={svgH} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={`tg-round-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6b6b6b" />
          <stop offset="40%" stopColor="#4a4a4a" />
          <stop offset="100%" stopColor="#2a2a2a" />
        </linearGradient>
        <linearGradient id={`tg-rect-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6b6b6b" />
          <stop offset="40%" stopColor="#4a4a4a" />
          <stop offset="100%" stopColor="#2a2a2a" />
        </linearGradient>
        <filter id={`rshadow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="7" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Stoelen — zitting gericht naar de tafel */}
      {chairs.map((c, i) => (
        <g key={i} transform={`translate(${cx + c.x}, ${cy + c.y}) rotate(${c.angle + 90})`}>
          <rect x={-chairW / 2 + 1} y={-chairH / 2 + 2} width={chairW} height={chairH + 4} rx={5} fill="rgba(0,0,0,0.35)" />
          <rect x={-chairW / 2} y={-chairH / 2} width={chairW} height={9} rx={4} fill="#888" stroke="#555" strokeWidth={1} />
          <rect x={-chairW / 2 + 3} y={-chairH / 2 + 2} width={chairW - 6} height={3} rx={2} fill="rgba(255,255,255,0.3)" />
          <rect x={-chairW / 2} y={-chairH / 2 + 10} width={chairW} height={chairH - 8} rx={4} fill="#bbb" stroke="#888" strokeWidth={1} />
          <rect x={-chairW / 2 + 4} y={-chairH / 2 + 12} width={chairW - 12} height={4} rx={2} fill="rgba(255,255,255,0.35)" />
          <rect x={-chairW / 2 - 1} y={-chairH / 2 + chairH - 2} width={5} height={4} rx={1} fill="#777" />
          <rect x={chairW / 2 - 4} y={-chairH / 2 + chairH - 2} width={5} height={4} rx={1} fill="#777" />
        </g>
      ))}

      {/* Tafel — donkergrijs gradient, statuskleur als rand */}
      {table.shape === 'ROUND' ? (
        <ellipse cx={cx} cy={cy} rx={tableSize / 2} ry={tableSize / 2}
          fill={`url(#tg-round-${uid})`}
          stroke={statusColor}
          strokeWidth={isSelected ? 5 : 4}
          filter={`url(#rshadow-${uid})`} />
      ) : table.shape === 'RECTANGLE' ? (
        <rect x={cx - tw / 2} y={cy - th / 2} width={tw} height={th} rx={10}
          fill={`url(#tg-rect-${uid})`}
          stroke={statusColor}
          strokeWidth={isSelected ? 5 : 4}
          filter={`url(#rshadow-${uid})`} />
      ) : (
        <rect x={cx - tableSize / 2} y={cy - tableSize / 2} width={tableSize} height={tableSize} rx={10}
          fill={`url(#tg-rect-${uid})`}
          stroke={statusColor}
          strokeWidth={isSelected ? 5 : 4}
          filter={`url(#rshadow-${uid})`} />
      )}

      {/* Glans */}
      {table.shape === 'ROUND'
        ? <ellipse cx={cx - 12} cy={cy - 14} rx={16} ry={10} fill="rgba(255,255,255,0.08)" />
        : <rect x={cx - tw / 2 + 8} y={cy - th / 2 + 6} width={tw * 0.35} height={th * 0.25} rx={4} fill="rgba(255,255,255,0.07)" />
      }

      {/* Selectie ring */}
      {isSelected && (
        <ellipse cx={cx} cy={cy}
          rx={(table.shape === 'ROUND' ? tableSize / 2 : tw / 2) + 8}
          ry={(table.shape === 'RECTANGLE' ? th / 2 : tableSize / 2) + 8}
          fill="none" stroke={statusColor} strokeWidth={2} strokeDasharray="6 3" opacity={0.7} />
      )}

      {/* Tafelnummer */}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize={20} fontWeight="bold"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
        {table.number}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={12}>
        {seats}p
      </text>

      {/* Gast labels — naam + tijd, onder elkaar */}
      {guests && guests.length > 0 && (() => {
        const lineH = 22
        const labelW = Math.max(120, tw * 0.9)
        const timeW = 38  // vaste breedte voor tijdkolom
        const nameW = labelW - timeW - 20  // resterende breedte voor naam
        const totalH = guests.length * lineH + 10
        const startY = cy + (table.shape === 'RECTANGLE' ? th / 2 : tableSize / 2) + gap + chairH + 10
        return (
          <>
            <defs>
              <clipPath id={`nameClip-${table.id}`}>
                <rect x={cx - labelW / 2 + 8} y={startY} width={nameW} height={totalH} />
              </clipPath>
            </defs>
            <rect x={cx - labelW / 2} y={startY} width={labelW} height={totalH} rx={10}
              fill="white" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.22))' }} />
            {guests.map((g, i) => (
              <g key={i}>
                <text
                  x={cx - labelW / 2 + 8} y={startY + 17 + i * lineH}
                  fill="#111827" fontSize={12} fontWeight="700"
                  clipPath={`url(#nameClip-${table.id})`}
                >
                  {g.name}
                </text>
                <text x={cx + labelW / 2 - 6} y={startY + 17 + i * lineH} textAnchor="end" fill="#6b7280" fontSize={11}>
                  {g.time}
                </text>
              </g>
            ))}
          </>
        )
      })()}
    </svg>
  )
}

// ---- Status config (exact kopie) ----
const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  PENDING: { label: 'In afwachting', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)', icon: <Clock size={14} /> },
  CONFIRMED: { label: 'Bevestigd', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)', icon: <CheckCircle2 size={14} /> },
  CHECKED_IN: { label: 'Ingecheckt', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)', icon: <UserCheck size={14} /> },
  COMPLETED: { label: 'Afgerond', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: <CheckCircle2 size={14} /> },
  NO_SHOW: { label: 'No-show', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: <UserX size={14} /> },
  CANCELLED: { label: 'Geannuleerd', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: <XCircle size={14} /> },
  WAITLIST: { label: 'Wachtlijst', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)', icon: <Clock size={14} /> },
}

// ---- Default settings ----
const DEFAULT_SETTINGS: ReservationSettings = {
  isEnabled: true,
  acceptOnline: false,
  maxPartySize: 12,
  defaultDurationMinutes: 90,
  bufferMinutes: 15,
  slotDurationMinutes: 30,
  maxReservationsPerSlot: 0,
  maxCoversPerSlot: 0,
  minAdvanceHours: 2,
  maxAdvanceDays: 60,
  kitchenCapacityEnabled: false,
  kitchenMaxCoversPer15min: 20,
  closedDays: [],
  shifts: [
    { id: '1', name: 'Lunch', startTime: '12:00', endTime: '15:00', isActive: false },
    { id: '2', name: 'Diner', startTime: '18:00', endTime: '23:00', isActive: false },
  ],
  cancellationDeadlineHours: 24,
  cancellationMessage: 'Annulering is niet meer mogelijk, het afgesproken tijdstip is verstreken.',
  reviewLink: '',
  autoSendReview: false,
  depositRequired: false,
  depositAmount: 10,
  noShowProtection: false,
  noShowFee: 25,
  bookingPageEnabled: true,
  autoConfirm: false,
}

// ---- Toast simple ----
function useToast() {
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  useEffect(() => {
    if (msg) {
      const t = setTimeout(() => setMsg(null), 3000)
      return () => clearTimeout(t)
    }
  }, [msg])
  const success = (text: string) => setMsg({ text, type: 'success' })
  const error = (text: string) => setMsg({ text, type: 'error' })
  return { msg, success, error }
}

// ---- Email helper ----
async function sendReservationEmail(data: {
  customerEmail: string
  customerName: string
  customerPhone?: string
  reservationDate: string
  reservationTime: string
  partySize: number
  tableName?: string
  notes?: string
  specialRequests?: string
  occasion?: string
  status: string
  businessName: string
  businessPhone?: string
  businessEmail?: string
  cancellationReason?: string
  reviewLink?: string
}) {
  try {
    await fetch('/api/send-reservation-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch { /* Stille fout */ }
}


// ============================================================
// MAIN COMPONENT
// ============================================================
export default function KassaReservationsView({
  tenant,
  kassaTables,
  onClose,
  onStartOrder,
}: KassaReservationsViewProps) {
  const toast = useToast()

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('reservations')
  // Lokale datum (niet UTC — in België 's avonds anders dan UTC)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewReservationModal, setShowNewReservationModal] = useState(false)
  const [showWalkInModal, setShowWalkInModal] = useState(false)
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [selectedShift, setSelectedShift] = useState<string | null>(null)
  const [guestProfilesDB, setGuestProfilesDB] = useState<GuestProfile[]>([])
  const [cancelConfirm, setCancelConfirm] = useState<Reservation | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [floorPlanTablesDB, setFloorPlanTablesDB] = useState<FloorPlanTable[]>([])
  // Floor plan editor state
  const [selectedFloorTable, setSelectedFloorTable] = useState<FloorPlanTable | null>(null)
  const [showAddFloorTable, setShowAddFloorTable] = useState(false)
  const [addFloorNumber, setAddFloorNumber] = useState('')
  const [addFloorSeats, setAddFloorSeats] = useState(4)
  const [addFloorShape, setAddFloorShape] = useState<'SQUARE' | 'ROUND' | 'RECTANGLE'>('SQUARE')
  const [isDraggingFloor, setIsDraggingFloor] = useState(false)
  const [tablesLocked, setTablesLocked] = useState(() => {
    try { return localStorage.getItem(`floor_tables_locked_${tenant}`) === 'true' } catch { return false }
  })
  const [floorZoom, setFloorZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [resListCollapsed, setResListCollapsed] = useState(false)

  const floorDraggingId = useRef<string | null>(null)
  const floorDragOffset = useRef({ x: 0, y: 0 })
  const floorDragMoved = useRef(false)
  const floorPointerStart = useRef({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const panLockedTableId = useRef<string | null>(null) // tafel-id als panning gestart op tafel in locked mode
  const panMoved = useRef(false) // heeft de pan bewogen (vs. tap)
  const canvasRef = useRef<HTMLDivElement>(null)
  /** Horizontaal scrollende tijdlijn — nodig voor correcte resize (pixels ↔ minuten) */
  const timelineGridScrollRef = useRef<HTMLDivElement>(null)
  /** Zelfde als LABEL_W in de tijdlijn-UI (kolom “Tafel”) */
  const TIMELINE_LABEL_W = 90
  /** X-positie in het raster (0 = START_MIN), rekening houdend met horizontaal scrollen */
  const timelinePointerToGridX = useCallback((clientX: number) => {
    const el = timelineGridScrollRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return clientX - rect.left + el.scrollLeft - TIMELINE_LABEL_W
  }, [])
  const WORLD_W = 2400
  const WORLD_H = 1600
  // Pinch-to-zoom
  const pinchStartDist = useRef<number | null>(null)
  const pinchStartZoom = useRef(1)
  const addReservationInProgress = useRef(false)  // guard tegen dubbele submit
  const [timelineDate, setTimelineDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })
  const [timelineNow, setTimelineNow] = useState(new Date())
  const [calMonth, setCalMonth] = useState(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }))
  const [timeShift, setTimeShift] = useState<'dag'|'avond'>(() => new Date().getHours() >= 17 ? 'avond' : 'dag')
  const [calOpen, setCalOpen] = useState(true)
  const [showSearchPopup, setShowSearchPopup] = useState(false)
  const [searchPopupQuery, setSearchPopupQuery] = useState('')
  const [searchPopupTab, setSearchPopupTab] = useState<'dag'|'alle'>('dag')
  const [editReservation, setEditReservation] = useState<Reservation | null>(null)
  const [resListDate, setResListDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })
  const [showResCalendar, setShowResCalendar] = useState(false)
  const [resCalYear, setResCalYear] = useState(() => new Date().getFullYear())
  const [resCalMonth, setResCalMonth] = useState(() => new Date().getMonth())
  const [resSearch, setResSearch] = useState('')
  const [showResSearch, setShowResSearch] = useState(false)
  const [resViewFilter, setResViewFilter] = useState<'dag' | 'week' | 'maand' | 'jaar'>('dag')
  const [resFilterMonth, setResFilterMonth] = useState(() => new Date().getMonth())
  const [resFilterYear, setResFilterYear] = useState(() => new Date().getFullYear())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [floorPlanTime, setFloorPlanTime] = useState(() => {
    const now = new Date()
    const h = now.getHours().toString().padStart(2, '0')
    const m = now.getMinutes() < 30 ? '00' : '30'
    return `${h}:${m}`
  })
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [reservationSettings, setReservationSettings] = useState<ReservationSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS
    try {
      const saved = localStorage.getItem(`reservationSettings_${tenant}`)
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
    } catch { return DEFAULT_SETTINGS }
  })
  // Tenant info for emails
  const [businessInfo, setBusinessInfo] = useState({ name: '', phone: '', email: '' })
  const [noShowMarked, setNoShowMarked] = useState<Set<string>>(new Set())
  const [pushTarget, setPushTarget] = useState<Reservation | null>(null)
  const [pushSubject, setPushSubject] = useState('')
  const [pushMessage, setPushMessage] = useState('')
  const [pushSending, setPushSending] = useState(false)

  /** Tijdlijn: rechts slepen om duur (duration_minutes) te wijzigen */
  const timelineDurDragRef = useRef<{
    id: string
    startGridX: number
    startDur: number
    maxDur: number
    slotW: number
    totalRange: number
    lastDur: number
  } | null>(null)
  const [timelineDurPreview, setTimelineDurPreview] = useState<{ id: string; dur: number } | null>(null)

  // Load tenant info + reservatie instellingen vanuit Supabase
  useEffect(() => {
    const loadTenantData = async () => {
      try {
        const { data } = await supabase.from('tenants').select('name,phone,email,subscription_status,trial_ends_at,plan').eq('slug', tenant).single()
        if (data) {
          setBusinessInfo({ name: data.name || '', phone: data.phone || '', email: data.email || '' })
          const status = data.subscription_status || 'trial'
          const trialEnd = data.trial_ends_at ? new Date(data.trial_ends_at) : null
          const isTrial = (status === 'trial' || status === 'TRIAL') && trialEnd && trialEnd > new Date()
          setIsPro(data.plan === 'pro' || status === 'active' || !!isTrial)
        }
      } catch (err) { console.error('[tenants] load error:', err) }

      // Laad instellingen: localStorage is primair, Supabase vult aan
      try {
        const { data } = await supabase.from('reservation_settings').select('*').eq('tenant_slug', tenant).single()
        if (data) {
          const safeParseJSON = (val: unknown, fallback: unknown) => {
            if (typeof val !== 'string') return val ?? fallback
            try { return JSON.parse(val) } catch { return fallback }
          }
          const fromDB: Partial<ReservationSettings> = {
            isEnabled: data.is_enabled ?? data.isEnabled,
            acceptOnline: data.accept_online ?? data.acceptOnline,
            maxPartySize: data.max_party_size ?? data.maxPartySize,
            defaultDurationMinutes: data.default_duration_minutes ?? data.defaultDurationMinutes,
            slotDurationMinutes: data.slot_duration_minutes ?? data.slotDurationMinutes,
            minAdvanceHours: data.min_advance_hours ?? data.minAdvanceHours,
            maxAdvanceDays: data.max_advance_days ?? data.maxAdvanceDays,
            shifts: safeParseJSON(data.shifts, undefined),
            closedDays: safeParseJSON(data.closed_days, undefined),
            depositRequired: data.deposit_required ?? data.depositRequired,
            depositAmount: data.deposit_amount ?? data.depositAmount,
            noShowProtection: data.no_show_protection ?? data.noShowProtection,
            autoConfirm: data.auto_confirm ?? data.autoConfirm ?? false,
          }
          let localData: Record<string, unknown> = {}
          try {
            const localRaw = localStorage.getItem(`reservationSettings_${tenant}`)
            localData = localRaw ? JSON.parse(localRaw) : {}
          } catch { localData = {} }
          const merged = { ...DEFAULT_SETTINGS, ...fromDB, ...localData }
          setReservationSettings(merged)
          try { localStorage.setItem(`reservationSettings_${tenant}`, JSON.stringify(merged)) } catch {}
        }
      } catch (err) { console.error('[reservation_settings] load error:', err) }
    }
    loadTenantData()
  }, [tenant])

  // Load reservations — map DB columns (customer_name) naar interface (guest_name)
  // silent=true: geen loading spinner (voor achtergrond auto-refresh)
  const loadReservations = async (silent = false) => {
    if (!silent) setLoading(true)
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('tenant_slug', tenant)
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true })
    if (error) {
      console.error('[loadReservations] Supabase error:', error)
      if (!silent) toast.error('Fout bij laden reservaties: ' + error.message)
    }
    if (data) {
      const mapped = data.map((r: Record<string, unknown>) => {
        const rawDur = r.duration_minutes ?? (r as { durationMinutes?: unknown }).durationMinutes
        let duration_minutes = 90
        if (rawDur != null && rawDur !== '') {
          const n = typeof rawDur === 'number' ? rawDur : parseInt(String(rawDur), 10)
          if (Number.isFinite(n) && n > 0) duration_minutes = n
        }
        return {
          ...r,
          duration_minutes,
          guest_name: (r.guest_name || r.customer_name || '') as string,
          guest_phone: (r.guest_phone || r.customer_phone || '') as string,
          guest_email: (r.guest_email || r.customer_email || '') as string,
          reservation_date: r.reservation_date ? String(r.reservation_date).slice(0, 10) : '',
          reservation_time: ((r.reservation_time as string) || '').substring(0, 5),
          status: ((r.status as string) || '').toUpperCase() as ReservationStatus,
          table_number: r.table_number != null ? String(r.table_number) : undefined,
        }
      }) as Reservation[]
      setReservations(mapped)
    }
    if (!silent) setLoading(false)
  }

  const formatTimelineDurLabel = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m} min`
    if (m === 0) return `${h} u`
    return `${h}u${String(m).padStart(2, '0')}`
  }

  /** Max. duur (min): einde grid óf vóór volgende reservatie opzelfde tafel (met buffer). */
  const computeTimelineMaxDurationMinutes = (
    r: Reservation,
    sameTableSameDay: Reservation[],
    buffer: number,
    EXTRA_MIN: number,
  ): number => {
    const [rh, rm] = r.reservation_time.split(':').map(Number)
    const startMin = rh * 60 + rm
    const gridMax = Math.max(30, EXTRA_MIN - startMin)
    let nextStart: number | null = null
    for (const o of sameTableSameDay) {
      if (o.id === r.id) continue
      if (o.status === 'CANCELLED') continue
      const [h, m] = o.reservation_time.split(':').map(Number)
      const sm = h * 60 + m
      if (sm > startMin && (nextStart === null || sm < nextStart)) nextStart = sm
    }
    if (nextStart === null) return gridMax
    const cap = nextStart - startMin - buffer
    const snapped = Math.floor(Math.max(0, cap) / 15) * 15
    return Math.max(30, Math.min(gridMax, snapped))
  }

  const beginTimelineDurationResize = (
    e: React.PointerEvent,
    r: Reservation,
    slotW: number,
    totalRange: number,
    maxDur: number,
  ) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const startDur = (() => {
      const n = Number(r.duration_minutes)
      return Number.isFinite(n) && n > 0 ? n : 90
    })()
    const minDur = 30
    const cap = Math.max(minDur, maxDur)

    timelineDurDragRef.current = {
      id: r.id,
      startGridX: timelinePointerToGridX(e.clientX),
      startDur,
      maxDur: cap,
      slotW,
      totalRange,
      lastDur: startDur,
    }
    setTimelineDurPreview({ id: r.id, dur: startDur })

    const onMove = (ev: PointerEvent) => {
      const d = timelineDurDragRef.current
      if (!d) return
      const deltaPx = timelinePointerToGridX(ev.clientX) - d.startGridX
      const deltaMin = (deltaPx / d.slotW) * d.totalRange
      let next = Math.round((d.startDur + deltaMin) / 15) * 15
      next = Math.max(minDur, Math.min(d.maxDur, next))
      d.lastDur = next
      setTimelineDurPreview({ id: d.id, dur: next })
    }

    const onUp = async () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      const d = timelineDurDragRef.current
      timelineDurDragRef.current = null
      setTimelineDurPreview(null)
      if (!d) return
      const finalDur = d.lastDur
      if (finalDur === d.startDur) return
      const { error } = await supabase
        .from('reservations')
        .update({ duration_minutes: finalDur })
        .eq('id', d.id)
        .eq('tenant_slug', tenant)
      if (error) {
        toast.error('Duur kon niet worden opgeslagen: ' + error.message)
      } else {
        toast.success(`Duur: ${formatTimelineDurLabel(finalDur)}`)
      }
      await loadReservations(true)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // Load guest profiles from Supabase (z6)
  const loadGuestProfiles = async () => {
    const { data } = await supabase
      .from('guest_profiles')
      .select('*')
      .eq('tenant_slug', tenant)
    if (data) {
      setGuestProfilesDB(data.map(g => ({
        id: g.id,
        name: g.name,
        phone: g.phone,
        email: g.email,
        isVip: g.is_vip,
        isBlocked: g.is_blocked,
        totalVisits: g.total_visits,
        totalNoShows: g.total_no_shows,
        totalSpent: g.total_spent,
        lastVisit: g.last_visit,
        notes: g.notes,
      })))
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadReservations()
    loadGuestProfiles()

    // Real-time: directe update bij elke INSERT of UPDATE op reservations
    const channel = supabase
      .channel(`kassa-reservations-${tenant}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reservations',
      }, () => { loadReservations(true); loadGuestProfiles() })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'reservations',
      }, () => { loadReservations(true); loadGuestProfiles() })
      .subscribe()

    // Fallback polling elke 30 seconden (als real-time tijdelijk wegvalt)
    const interval = setInterval(() => {
      loadReservations(true)
      loadGuestProfiles()
    }, 30_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant])

  // Rode tijdlijn — update elke minuut
  useEffect(() => {
    const tick = setInterval(() => setTimelineNow(new Date()), 60_000)
    return () => clearInterval(tick)
  }, [])

  // Load floor plan tables from Supabase
  useEffect(() => {
    const loadFloorTables = async () => {
      try {
        const { data } = await supabase.from('floor_plan_tables').select('data').eq('tenant_slug', tenant).single()
        if (data?.data) setFloorPlanTablesDB(data.data as FloorPlanTable[])
      } catch (err) { console.error('[floor_plan_tables] load error:', err) }
    }
    loadFloorTables()
  }, [tenant])

  // Centreer tafels zodra de plattegrond-tab actief wordt (canvas is dan zichtbaar)
  useEffect(() => {
    if (viewMode !== 'floorplan') return
    if (floorPlanTablesDB.length === 0) return
    // Geef React één frame om de canvas te renderen
    const timer = setTimeout(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const minX = Math.min(...floorPlanTablesDB.map(t => (t.x / 100) * WORLD_W))
      const minY = Math.min(...floorPlanTablesDB.map(t => (t.y / 100) * WORLD_H))
      // SVG-groep steekt ~145px uit rondom het middelpunt (stoelen + tafel)
      const svgHalfH = 145
      const svgHalfW = 145
      // Zet pan zodat de meest linkse/bovenste tafel 40px van de rand staat
      setPanX(40 + svgHalfW - minX * floorZoom)
      setPanY(40 + svgHalfH - minY * floorZoom)
    }, 50)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, floorPlanTablesDB])

  // Bouw de volledige Supabase payload van huidige instellingen
  const buildSettingsPayload = (s: ReservationSettings) => ({
    tenant_slug: tenant,
    is_enabled: s.isEnabled,
    accept_online: s.acceptOnline,
    max_party_size: s.maxPartySize,
    default_duration_minutes: s.defaultDurationMinutes,
    slot_duration_minutes: s.slotDurationMinutes,
    min_advance_hours: s.minAdvanceHours,
    max_advance_days: s.maxAdvanceDays,
    // Stuur als object/array — Supabase serialiseert zelf naar JSONB of text[]
    shifts: s.shifts || [],
    closed_days: s.closedDays || [],
    deposit_required: s.depositRequired,
    deposit_amount: s.depositAmount,
    no_show_protection: s.noShowProtection,
    cancellation_deadline_hours: s.cancellationDeadlineHours,
    cancellation_message: s.cancellationMessage,
    auto_send_review: s.autoSendReview,
    review_link: s.reviewLink,
    booking_page_enabled: s.bookingPageEnabled,
    auto_confirm: s.autoConfirm,
  })

  // Auto-save bij elke toggle/wijziging (localStorage direct, Supabase async)
  const updateSettings = (updates: Partial<ReservationSettings>) => {
    const newSettings = { ...reservationSettings, ...updates }
    setReservationSettings(newSettings)
    localStorage.setItem(`reservationSettings_${tenant}`, JSON.stringify(newSettings))
    // Stil opslaan naar Supabase (geen toast — dat doet de expliciete Opslaan knop)
    supabase.from('reservation_settings').upsert(buildSettingsPayload(newSettings), { onConflict: 'tenant_slug' })
      .then(({ error }) => { if (error) console.warn('Auto-save fout:', error.message) })
  }

  // Expliciet opslaan met toast feedback
  const saveSettingsToSupabase = async () => {
    localStorage.setItem(`reservationSettings_${tenant}`, JSON.stringify(reservationSettings))
    const { error } = await supabase.from('reservation_settings')
      .upsert(buildSettingsPayload(reservationSettings), { onConflict: 'tenant_slug' })
    if (error) {
      toast.error('Opslaan mislukt: ' + error.message)
    } else {
      toast.success('✅ Instellingen opgeslagen!')
    }
  }

  // ---- Floor plan editor helpers ----
  const saveFloorPlan = async (updated: FloorPlanTable[]) => {
    setFloorPlanTablesDB(updated)
    await supabase.from('floor_plan_tables').upsert({ tenant_slug: tenant, data: updated }, { onConflict: 'tenant_slug' })
  }

  const addFloorTable = async () => {
    if (!addFloorNumber.trim()) return
    const newTable: FloorPlanTable = {
      id: Math.random().toString(36).slice(2, 10),
      number: addFloorNumber.trim(),
      seats: addFloorSeats,
      shape: addFloorShape,
      x: 15 + Math.random() * 60,
      y: 15 + Math.random() * 60,
      rotation: 0,
      status: 'FREE',
    }
    await saveFloorPlan([...floorPlanTablesDB, newTable])
    setAddFloorNumber('')
    setAddFloorSeats(4)
    setShowAddFloorTable(false)
    toast.success(`Tafel ${newTable.number} toegevoegd`)
  }

  const deleteFloorTable = async (id: string) => {
    await saveFloorPlan(floorPlanTablesDB.filter(t => t.id !== id))
    setSelectedFloorTable(null)
    toast.success('Tafel verwijderd')
  }

  // Wheel zoom — zoom rond muispositie
  const handleFloorWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const oldZoom = floorZoom
    const newZoom = Math.min(2, Math.max(0.3, +(oldZoom - e.deltaY * 0.001).toFixed(3)))
    const scale = newZoom / oldZoom
    setPanX(px => mx - scale * (mx - px))
    setPanY(py => my - scale * (my - py))
    setFloorZoom(newZoom)
  }

  // Pinch zoom (iPad)
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const handleCanvasPinchMove = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (activePointers.current.size >= 2 && pinchStartDist.current !== null) {
      const pts = Array.from(activePointers.current.values())
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const ratio = dist / pinchStartDist.current
      setFloorZoom(Math.min(2, Math.max(0.3, +(pinchStartZoom.current * ratio).toFixed(3))))
    }
  }

  // Canvas pointer down — tafel slepen OF achtergrond pannen
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values())
      pinchStartDist.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      pinchStartZoom.current = floorZoom
      return
    }
    e.preventDefault()
    const tableEl = (e.target as HTMLElement).closest('[data-table-id]') as HTMLElement | null
    // Vergrendeld of geen tafel → altijd canvas pannen
    if (!tableEl || tablesLocked) {
      isPanning.current = true
      panMoved.current = false
      panLockedTableId.current = tablesLocked && tableEl ? tableEl.getAttribute('data-table-id') : null
      panStart.current = { x: e.clientX, y: e.clientY, panX, panY }
      canvasRef.current!.setPointerCapture(e.pointerId)
      return
    }
    // Ontgrendeld + op tafel → tafel slepen
    const id = tableEl.getAttribute('data-table-id')!
    const table = floorPlanTablesDB.find(t => t.id === id)
    if (!table) return
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const mouseWorldX = (e.clientX - rect.left - panX) / floorZoom
    const mouseWorldY = (e.clientY - rect.top - panY) / floorZoom
    const tableWorldX = (table.x / 100) * WORLD_W
    const tableWorldY = (table.y / 100) * WORLD_H
    floorDragOffset.current = { x: mouseWorldX - tableWorldX, y: mouseWorldY - tableWorldY }
    floorDraggingId.current = id
    floorDragMoved.current = false
    floorPointerStart.current = { x: e.clientX, y: e.clientY }
    canvas.setPointerCapture(e.pointerId)
    setIsDraggingFloor(true)
  }

  const handleFloorPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Pinch
    if (activePointers.current.size >= 2) { handleCanvasPinchMove(e); return }

    if (isPanning.current) {
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) panMoved.current = true
      setPanX(panStart.current.panX + dx)
      setPanY(panStart.current.panY + dy)
      return
    }
    if (!floorDraggingId.current) return
    if (tablesLocked) return  // vergrendeld — geen verschuiven
    const dx = Math.abs(e.clientX - floorPointerStart.current.x)
    const dy = Math.abs(e.clientY - floorPointerStart.current.y)
    if (dx < 4 && dy < 4) return
    floorDragMoved.current = true
    // Mouse → world → percentage
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const mouseWorldX = (e.clientX - rect.left - panX) / floorZoom
    const mouseWorldY = (e.clientY - rect.top - panY) / floorZoom
    const worldX = mouseWorldX - floorDragOffset.current.x
    const worldY = mouseWorldY - floorDragOffset.current.y
    const x = Math.max(1, Math.min(99, (worldX / WORLD_W) * 100))
    const y = Math.max(1, Math.min(99, (worldY / WORLD_H) * 100))
    setFloorPlanTablesDB(prev => prev.map(t => t.id === floorDraggingId.current ? { ...t, x, y } : t))
  }

  const handleFloorPointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId)
    if (activePointers.current.size < 2) pinchStartDist.current = null
    if (isPanning.current) {
      isPanning.current = false
      // Tap op tafel in vergrendelde modus → open tafelsidebar
      if (!panMoved.current && panLockedTableId.current) {
        const id = panLockedTableId.current
        const table = floorPlanTablesDB.find(t => t.id === id) || null
        setSelectedFloorTable(prev => prev?.id === id ? null : table)
      }
      panMoved.current = false
      panLockedTableId.current = null
      return
    }
    if (!floorDraggingId.current) return
    const id = floorDraggingId.current
    const wasTap = !floorDragMoved.current
    floorDraggingId.current = null
    setIsDraggingFloor(false)
    floorDragMoved.current = false
    if (wasTap) {
      const table = floorPlanTablesDB.find(t => t.id === id) || null
      setSelectedFloorTable(prev => prev?.id === id ? null : table)
    } else {
      await supabase.from('floor_plan_tables').upsert({ tenant_slug: tenant, data: floorPlanTablesDB }, { onConflict: 'tenant_slug' })
    }
  }

  // ---- Derived data ----
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()

  const todayReservations = useMemo(() =>
    reservations.filter(r => r.reservation_date === today && r.status !== 'CANCELLED')
      .sort((a, b) => a.reservation_time.localeCompare(b.reservation_time)),
    [reservations, today])

  const upcomingReservations = useMemo(() =>
    reservations.filter(r => r.reservation_date >= today && r.status !== 'CANCELLED')
      .sort((a, b) => a.reservation_date.localeCompare(b.reservation_date) || a.reservation_time.localeCompare(b.reservation_time)),
    [reservations, today])

  const waitlistReservations = useMemo(() =>
    reservations.filter(r => r.status === 'WAITLIST' && r.reservation_date === today)
      .sort((a, b) => (a.waitlist_position || 0) - (b.waitlist_position || 0)),
    [reservations, today]
  )

  const todayStats = useMemo(() => ({
    total: todayReservations.filter(r => r.status !== 'WAITLIST').length,
    confirmed: todayReservations.filter(r => r.status === 'CONFIRMED').length,
    checkedIn: todayReservations.filter(r => r.status === 'CHECKED_IN').length,
    completed: todayReservations.filter(r => r.status === 'COMPLETED').length,
    noShow: todayReservations.filter(r => r.status === 'NO_SHOW').length,
    covers: todayReservations.filter(r => r.status !== 'WAITLIST').reduce((s, r) => s + r.party_size, 0),
    waitlist: waitlistReservations.length,
  }), [todayReservations, waitlistReservations])

  const filteredReservations = useMemo(() => {
    let base = viewMode === 'today' ? todayReservations : upcomingReservations
    base = base.filter(r => r.status !== 'WAITLIST')
    if (selectedShift) {
      const shift = reservationSettings.shifts?.find(s => s.id === selectedShift)
      if (shift) {
        base = base.filter(r => r.reservation_time >= shift.startTime && r.reservation_time <= shift.endTime)
      }
    }
    if (!searchQuery) return base
    const q = searchQuery.toLowerCase()
    return base.filter(r =>
      r.guest_name.toLowerCase().includes(q) ||
      r.guest_phone?.includes(q) ||
      r.guest_email?.toLowerCase().includes(q)
    )
  }, [searchQuery, viewMode, todayReservations, upcomingReservations, selectedShift, reservationSettings.shifts])

  // Guest profiles (derived)
  // Combineer afgeleide profielen (reservaties) met Supabase VIP/blocked data
  const guestProfiles = useMemo<GuestProfile[]>(() => {
    const map = new Map<string, GuestProfile>()
    reservations.forEach(r => {
      const key = r.guest_phone || r.guest_email || r.guest_name
      if (!key) return
      // Check of er Supabase profiel is voor VIP/blocked
      const dbProfile = guestProfilesDB.find(g => 
        (g.phone && g.phone === r.guest_phone) || 
        (g.email && g.email === r.guest_email) ||
        g.name === r.guest_name
      )
      const existing = map.get(key)
      if (existing) {
        existing.totalVisits++
        if (r.status === 'NO_SHOW') existing.totalNoShows++
        if (r.status === 'COMPLETED') existing.totalSpent += r.total_spent || 0
        if (!existing.lastVisit || r.reservation_date > existing.lastVisit) existing.lastVisit = r.reservation_date
      } else {
        map.set(key, {
          id: dbProfile?.id || key,
          name: r.guest_name,
          phone: r.guest_phone,
          email: r.guest_email,
          isVip: dbProfile?.isVip || false,
          isBlocked: dbProfile?.isBlocked || false,
          totalVisits: 1,
          totalNoShows: r.status === 'NO_SHOW' ? 1 : 0,
          totalSpent: r.status === 'COMPLETED' ? (r.total_spent || 0) : 0,
          lastVisit: r.reservation_date,
          notes: dbProfile?.notes,
        })
      }
    })
    return Array.from(map.values())
  }, [reservations, guestProfilesDB])

  // Stats helpers
  const getNoShowRate = () => {
    const total = reservations.filter(r => r.status !== 'CANCELLED').length
    if (total === 0) return 0
    return Math.round((reservations.filter(r => r.status === 'NO_SHOW').length / total) * 100)
  }
  const getTodayCovers = () => todayReservations.reduce((s, r) => s + r.party_size, 0)

  // ---- Reserveringen-view: geoptimaliseerde berekeningen (useMemo) ----
  const daysWithRes = useMemo(
    () => new Set(reservations.filter(r => r.status !== 'CANCELLED').map(r => r.reservation_date)),
    [reservations]
  )

  const resViewFiltered = useMemo(() => {
    const _tn = new Date()
    const todayStr = `${_tn.getFullYear()}-${String(_tn.getMonth()+1).padStart(2,'0')}-${String(_tn.getDate()).padStart(2,'0')}`

    let from: string, to: string
    if (resViewFilter === 'dag') {
      from = resListDate; to = resListDate
    } else if (resViewFilter === 'week') {
      const d = new Date(resListDate + 'T12:00:00')
      const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
      const mon = new Date(d); mon.setDate(d.getDate() - dow)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
      from = fmt(mon); to = fmt(sun)
    } else if (resViewFilter === 'maand') {
      from = `${resFilterYear}-${String(resFilterMonth+1).padStart(2,'0')}-01`
      to = `${resFilterYear}-${String(resFilterMonth+1).padStart(2,'0')}-${String(new Date(resFilterYear, resFilterMonth+1, 0).getDate()).padStart(2,'0')}`
    } else {
      from = `${resFilterYear}-01-01`; to = `${resFilterYear}-12-31`
    }

    const q = resSearch.trim().toLowerCase()
    const rows = reservations
      .filter(r => r.status !== 'CANCELLED' && r.reservation_date >= from && r.reservation_date <= to)
      .filter(r => !q || r.guest_name?.toLowerCase().includes(q) || r.guest_phone?.includes(q) || r.guest_email?.toLowerCase().includes(q))
      .sort((a, b) => a.reservation_date.localeCompare(b.reservation_date) || a.reservation_time.localeCompare(b.reservation_time))

    // Groepeer per datum
    const grouped: { date: string; rows: typeof rows }[] = []
    if (resViewFilter === 'dag') {
      grouped.push({ date: resListDate, rows })
    } else {
      const map = new Map<string, typeof rows>()
      rows.forEach(r => {
        if (!map.has(r.reservation_date)) map.set(r.reservation_date, [])
        map.get(r.reservation_date)!.push(r)
      })
      map.forEach((r, date) => grouped.push({ date, rows: r }))
    }

    return { rows, grouped, from, to, today: todayStr }
  }, [reservations, resViewFilter, resListDate, resFilterYear, resFilterMonth, resSearch])

  // 12 kalendermaanden voor sidebar (alleen herbouwen als jaar wijzigt)
  const resCalMonths = useMemo(() => {
    const months: { y: number; m: number; cells: (number|null)[] }[] = []
    for (let m = 0; m <= 11; m++) {
      let dow = new Date(resCalYear, m, 1).getDay() - 1
      if (dow < 0) dow = 6
      const dim = new Date(resCalYear, m + 1, 0).getDate()
      const cells: (number|null)[] = Array(dow).fill(null)
      for (let d = 1; d <= dim; d++) cells.push(d)
      while (cells.length % 7 !== 0) cells.push(null)
      months.push({ y: resCalYear, m, cells })
    }
    return months
  }, [resCalYear])

  // ---- CRUD actions ----
  const updateStatus = async (id: string, status: ReservationStatus, extra?: Partial<Reservation>) => {
    const updates: Record<string, unknown> = { status: status.toLowerCase(), ...extra }
    if (status === 'CHECKED_IN') updates.checked_in_at = new Date().toISOString()
    if (status === 'COMPLETED') updates.completed_at = new Date().toISOString()
    const { error } = await supabase.from('reservations').update(updates).eq('id', id).eq('tenant_slug', tenant)
    if (error) { toast.error('Status kon niet worden bijgewerkt: ' + error.message); return }
    await loadReservations()
  }

  const handleCheckIn = async (r: Reservation) => {
    await updateStatus(r.id, 'CHECKED_IN')
    toast.success(`${r.guest_name} aan tafel!`)
    // Geen mail sturen bij aan tafel zetten — enkel interne statuswijziging
  }

  const handleUndoNoShow = async (r: Reservation) => {
    await updateStatus(r.id, 'CONFIRMED')
    toast.success(`${r.guest_name} teruggezet naar Bevestigd`)
  }

  const handleSendPush = async () => {
    if (!pushTarget?.guest_email) { toast.error('Deze klant heeft geen emailadres'); return }
    if (!pushSubject.trim() || !pushMessage.trim()) { toast.error('Vul onderwerp en bericht in'); return }
    setPushSending(true)
    try {
      const res = await fetch('/api/marketing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          tenantSlug: tenant,
          recipients: [{ email: pushTarget.guest_email, name: pushTarget.guest_name }],
          subject: pushSubject,
          message: pushMessage,
          businessName: businessInfo.name,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Email verstuurd naar ${pushTarget.guest_name}`)
        setPushTarget(null); setPushSubject(''); setPushMessage('')
      } else {
        toast.error(data.error || 'Versturen mislukt')
      }
    } catch {
      toast.error('Netwerk fout, probeer opnieuw')
    } finally {
      setPushSending(false)
    }
  }

  const handleNoShow = async (r: Reservation) => {
    await updateStatus(r.id, 'NO_SHOW')
    toast.error(`${r.guest_name} gemarkeerd als no-show`)
    // z9 - No-show fee aanrekenen als bescherming actief
    if (reservationSettings.noShowProtection && r.stripe_payment_method_id && r.guest_name) {
      try {
        await fetch('/api/reservation-card-auth', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethodId: r.stripe_payment_method_id,
            amount: reservationSettings.noShowFee || 25,
            businessName: businessInfo.name,
            guestName: r.guest_name,
          }),
        })
        toast.success(`No-show kost €${reservationSettings.noShowFee} aangerekend`)
      } catch { /* stille fout */ }
    }
  }

  const handleCancel = async (r: Reservation) => {
    // z4 - Check annuleringsbeleid deadline
    if (reservationSettings.cancellationDeadlineHours > 0) {
      const resDateTime = new Date(`${r.reservation_date}T${r.reservation_time}`)
      const deadlineTime = new Date(resDateTime.getTime() - reservationSettings.cancellationDeadlineHours * 60 * 60 * 1000)
      if (new Date() > deadlineTime && r.status !== 'WAITLIST') {
        setCancelConfirm(r)
        return
      }
    }
    await doCancelReservation(r)
  }

  const doCancelReservation = async (r: Reservation) => {
    await updateStatus(r.id, 'CANCELLED')
    setCancelConfirm(null)
    toast.success('Reservatie geannuleerd')
    // Geen mail bij annulatie — enkel interne statuswijziging
  }

  const handleComplete = async (r: Reservation) => {
    await updateStatus(r.id, 'COMPLETED')
    toast.success(`${r.guest_name} vertrokken`)
    // Geen automatische mail bij vertrekken — enkel interne statuswijziging
  }

  // z3 - Wachtlijst bevestigen
  const handleConfirmFromWaitlist = async (r: Reservation) => {
    await updateStatus(r.id, 'CONFIRMED')
    toast.success(`${r.guest_name} bevestigd vanuit wachtlijst`)
    // Geen mail — enkel statuswijziging
  }

  const handleConfirm = async (r: Reservation) => {
    // Auto-wijs een vrije tafel toe als er nog geen tafel is
    let assignedTable = r.table_number
    if (!assignedTable) {
      const allTables = (floorPlanTablesDB.length > 0
        ? [...floorPlanTablesDB].filter(t => t.seats >= r.party_size).sort((a, b) => a.seats - b.seats)
        : [...kassaTables].filter(t => t.seats >= r.party_size).sort((a, b) => a.seats - b.seats)
      ).map(t => String(t.number))

      const buffer = reservationSettings.bufferMinutes || 0
      const rStart = parseInt(r.reservation_time.split(':')[0]) * 60 + parseInt(r.reservation_time.split(':')[1])
      const rEnd = rStart + (r.duration_minutes || 90) + buffer

      const occupied = reservations
        .filter(res =>
          res.id !== r.id &&
          res.status !== 'CANCELLED' &&
          res.status !== 'WAITLIST' &&
          res.reservation_date === r.reservation_date &&
          res.table_number
        )
        .filter(res => {
          const sMin = parseInt(res.reservation_time.split(':')[0]) * 60 + parseInt(res.reservation_time.split(':')[1])
          // Buffer ook op bestaande reserveringen — symmetrische check
          const eMin = sMin + (res.duration_minutes || 90) + buffer
          return rStart < eMin && rEnd > sMin
        })
        .map(res => String(res.table_number))

      assignedTable = allTables.find(t => !occupied.includes(t)) || undefined
    }

    // Sla status + eventueel tafelnummer op
    const updates: Record<string, unknown> = { status: 'confirmed' }
    if (assignedTable && !r.table_number) updates.table_number = assignedTable
    const { error } = await supabase.from('reservations').update(updates).eq('id', r.id).eq('tenant_slug', tenant)
    if (error) { toast.error('Goedkeuren mislukt: ' + error.message); return }
    await loadReservations()
    await loadGuestProfiles()

    toast.success(`${r.guest_name} goedgekeurd${assignedTable && !r.table_number ? ` — Tafel ${assignedTable} toegewezen` : ''}`)

    // Stuur bevestigingsmail — haal businessInfo opnieuw op als leeg
    // guest_email kan '' zijn na mapping — haal ook raw DB waarde op als fallback
    const emailTo = r.guest_email || ''
    if (emailTo) {
      try {
        let bName = businessInfo.name
        let bPhone = businessInfo.phone
        let bEmail = businessInfo.email
        if (!bName) {
          const { data: td } = await supabase.from('tenants').select('name,phone,email').eq('slug', tenant).single()
          if (td) { bName = td.name || ''; bPhone = td.phone || ''; bEmail = td.email || '' }
        }
        const res = await fetch('/api/send-reservation-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail: emailTo,
            customerName: r.guest_name,
            customerPhone: r.guest_phone,
            reservationDate: r.reservation_date,
            reservationTime: r.reservation_time,
            partySize: r.party_size,
            tableName: assignedTable || r.table_number,
            notes: r.notes,
            specialRequests: r.special_requests,
            status: 'confirmed',
            businessName: bName,
            businessPhone: bPhone,
            businessEmail: bEmail,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error('Mail mislukt: ' + (err.error || res.statusText))
        } else {
          toast.success('Bevestigingsmail verstuurd naar ' + emailTo)
        }
      } catch (e) {
        toast.error('Mail kon niet verstuurd worden')
        console.error('Bevestigingsmail error:', e)
      }
    }
  }

  const handleReject = async (r: Reservation) => {
    const { error } = await supabase.from('reservations')
      .update({ status: 'cancelled' }).eq('id', r.id).eq('tenant_slug', tenant)
    if (error) { toast.error('Weigeren mislukt: ' + error.message); return }
    await loadReservations()
    await loadGuestProfiles()
    toast.success(`${r.guest_name} geweigerd`)

    // Stuur weigeringsmail
    if (r.guest_email) {
      try {
        await fetch('/api/send-reservation-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail: r.guest_email,
            customerName: r.guest_name,
            customerPhone: r.guest_phone,
            reservationDate: r.reservation_date,
            reservationTime: r.reservation_time,
            partySize: r.party_size,
            status: 'cancelled',
            cancellationReason: 'Uw reservatieverzoek kon helaas niet worden goedgekeurd. Neem contact op voor meer informatie.',
            businessName: businessInfo.name,
            businessPhone: businessInfo.phone,
            businessEmail: businessInfo.email,
          }),
        })
      } catch (e) { console.warn('Weigeringsmail mislukt:', e) }
    }
  }

  // z6 - VIP/geblokkeerd opslaan in Supabase
  const handleToggleVip = async (guest: GuestProfile) => {
    const newVip = !guest.isVip
    await supabase.from('guest_profiles').upsert({
      tenant_slug: tenant,
      name: guest.name,
      phone: guest.phone || null,
      email: guest.email || null,
      is_vip: newVip,
      is_blocked: guest.isBlocked,
      notes: guest.notes || '',
    }, { onConflict: 'tenant_slug,phone' })
    await loadGuestProfiles()
    toast.success(newVip ? 'VIP status toegevoegd' : 'VIP status verwijderd')
  }

  const handleToggleBlocked = async (guest: GuestProfile) => {
    const newBlocked = !guest.isBlocked
    await supabase.from('guest_profiles').upsert({
      tenant_slug: tenant,
      name: guest.name,
      phone: guest.phone || null,
      email: guest.email || null,
      is_vip: guest.isVip,
      is_blocked: newBlocked,
      notes: guest.notes || '',
    }, { onConflict: 'tenant_slug,phone' })
    await loadGuestProfiles()
    toast.success(newBlocked ? 'Gast geblokkeerd' : 'Gast gedeblokkeerd')
  }

  const handleAssignTable = async (reservationId: string, tableNumber: string) => {
    const { error } = await supabase.from('reservations').update({ table_number: tableNumber })
      .eq('id', reservationId).eq('tenant_slug', tenant)
    if (error) { toast.error('Tafel toewijzen mislukt: ' + error.message); return }
    await loadReservations()
    toast.success('Tafel toegewezen')
  }

  const handleDeleteReservation = async (id: string) => {
    const { error } = await supabase.from('reservations').delete().eq('id', id).eq('tenant_slug', tenant)
    if (error) { toast.error('Verwijderen mislukt: ' + error.message); return }
    await loadReservations()
    toast.success('Reservatie verwijderd')
  }

  const handleStartOrder = async (r: Reservation) => {
    if (r.status === 'CONFIRMED' || r.status === 'PENDING') {
      await updateStatus(r.id, 'CHECKED_IN')
    }
    const tableNr = r.table_number || ''
    if (tableNr) {
      onStartOrder(tableNr)
      toast.success(`Order gestart voor tafel ${tableNr}`)
    } else {
      toast.error('Wijs eerst een tafel toe aan deze reservatie')
    }
  }

  // Walk-in: direct inchecken zonder reservatie
  const handleWalkIn = async (name: string, partySize: number, tableNumber: string) => {
    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    const { error } = await supabase.from('reservations').insert([{
      guest_name: name,
      customer_name: name,
      party_size: partySize,
      reservation_date: dateStr,
      reservation_time: timeStr,
      duration_minutes: 90,
      table_number: tableNumber || null,
      status: 'checked_in',
      tenant_slug: tenant,
      total_spent: 0,
      notes: 'Walk-in',
    }])
    if (error) { toast.error('Walk-in mislukt: ' + error.message); return }
    await loadReservations()
    await loadGuestProfiles()
    setShowWalkInModal(false)
    toast.success(`Walk-in ${name} ingecheckt op tafel ${tableNumber}!`)
  }

  // Wachtlijst: toevoegen met WAITLIST status + automatische positie
  const handleAddToWaitlist = async (name: string, phone: string, partySize: number, date: string, time: string) => {
    const pos = reservations.filter(r => r.status === 'WAITLIST' && r.reservation_date === date).length + 1
    const { error } = await supabase.from('reservations').insert([{
      guest_name: name,
      guest_phone: phone || null,
      customer_name: name,
      customer_phone: phone || null,
      party_size: partySize,
      reservation_date: date,
      reservation_time: time,
      duration_minutes: 90,
      status: 'waitlist',
      waitlist_position: pos,
      tenant_slug: tenant,
      total_spent: 0,
    }])
    if (error) { toast.error('Wachtlijst mislukt: ' + error.message); return }
    await loadReservations()
    await loadGuestProfiles()
    setShowWaitlistModal(false)
    toast.success(`${name} toegevoegd aan wachtlijst (#${pos})`)
  }

  const handleAddReservation = async (data: Omit<Reservation, 'id' | 'tenant_slug' | 'total_spent' | 'created_at'>) => {
    // Voorkom dubbele submit
    if (addReservationInProgress.current) return
    addReservationInProgress.current = true
    try {
    const { data: inserted, error } = await supabase.from('reservations').insert([{
      guest_name: data.guest_name,
      guest_phone: data.guest_phone || null,
      guest_email: data.guest_email || null,
      customer_name: data.guest_name,
      customer_phone: data.guest_phone || null,
      customer_email: data.guest_email || null,
      party_size: data.party_size,
      reservation_date: data.reservation_date,
      reservation_time: data.reservation_time,
      duration_minutes: data.duration_minutes || 90,
      table_number: data.table_number || null,
      notes: data.notes || null,
      special_requests: data.special_requests || '',
      status: 'confirmed',
      tenant_slug: tenant,
      total_spent: 0,
    }]).select().single()
    if (error) { toast.error('Fout bij aanmaken: ' + error.message); return }

    await loadReservations()
    await loadGuestProfiles()
    toast.success(`Reservatie voor ${data.guest_name} aangemaakt!`)
    setShowNewReservationModal(false)

    // Enkel bevestigingsmail voor NIEUWE reservatie
    if (data.guest_email && inserted) {
      await sendReservationEmail({
        customerEmail: data.guest_email,
        customerName: data.guest_name,
        customerPhone: data.guest_phone,
        reservationDate: data.reservation_date,
        reservationTime: data.reservation_time,
        partySize: data.party_size,
        tableName: data.table_number,
        notes: data.notes,
        specialRequests: data.special_requests,
        occasion: data.occasion,
        status: 'confirmed',
        businessName: businessInfo.name,
        businessPhone: businessInfo.phone,
        businessEmail: businessInfo.email,
      })
    }
    } finally {
      addReservationInProgress.current = false
    }
  }

  // ---- Formatting ----
  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  // ---- Render card (exact kopie) ----
  const renderReservationCard = (reservation: Reservation) => {
    const status = STATUS_CONFIG[reservation.status]
    const guest = guestProfiles.find(g => g.id === (reservation.guest_phone || reservation.guest_email || reservation.guest_name))

    return (
      <div
        key={reservation.id}
        className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#3C4D6B] transition-all cursor-pointer shadow-sm"
        onClick={() => setSelectedReservation(reservation)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{reservation.reservation_time}</span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                style={{ backgroundColor: status.bgColor, color: status.color }}
              >
                {status.icon}
                {status.label}
              </span>
            </div>
            <h3 className="font-semibold text-lg mt-1">{reservation.guest_name}</h3>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-lg">
            <Users size={16} className="text-gray-400" />
            <span className="font-bold">{reservation.party_size}</span>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1 text-sm text-gray-500 mb-3">
          {reservation.guest_phone && (
            <div className="flex items-center gap-2">
              <Phone size={14} />
              <span>{reservation.guest_phone}</span>
            </div>
          )}
          {reservation.table_number && (
            <div className="flex items-center gap-2">
              <MapPin size={14} />
              <span>Tafel {reservation.table_number}</span>
            </div>
          )}
          {reservation.notes && (
            <div className="flex items-center gap-2">
              <MessageSquare size={14} />
              <span className="truncate">{reservation.notes}</span>
            </div>
          )}
        </div>

        {/* Guest badges */}
        {guest && (
          <div className="flex items-center gap-2 mb-3">
            {guest.isVip && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-600 flex items-center gap-1">
                <Star size={12} /> VIP
              </span>
            )}
            {guest.totalNoShows > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-500">
                {guest.totalNoShows} no-shows
              </span>
            )}
            {guest.totalVisits > 5 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-600">
                {guest.totalVisits} bezoeken
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {reservation.status === 'CONFIRMED' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleStartOrder(reservation) }}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1"
              >
                <UtensilsCrossed size={16} />
                Start Order
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleNoShow(reservation) }}
                className="py-2 px-3 rounded-lg bg-red-500/20 text-red-500 text-sm font-medium hover:bg-red-500/30 transition-colors"
              >
                <UserX size={16} />
              </button>
            </>
          )}
          {reservation.status === 'CHECKED_IN' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleStartOrder(reservation) }}
                className="flex-1 py-2 px-3 rounded-lg bg-[#3C4D6B] text-white text-sm font-medium hover:bg-[#4A5D7B] transition-colors flex items-center justify-center gap-1"
              >
                <UtensilsCrossed size={16} />
                Naar Kassa
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleComplete(reservation) }}
                className="py-2 px-3 rounded-lg bg-gray-500/20 text-gray-500 text-sm font-medium hover:bg-gray-500/30 transition-colors"
              >
                <CheckCircle2 size={16} />
              </button>
            </>
          )}
          {reservation.status === 'PENDING' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleConfirm(reservation) }}
              className="flex-1 py-2 px-3 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
            >
              <CheckCircle2 size={16} />
              Bevestigen
            </button>
          )}
        </div>
      </div>
    )
  }

  const isEnabled = reservationSettings.isEnabled

  // ---- If not enabled ----
  if (!isEnabled) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CalendarDays size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Reservatiesysteem</h2>
          <p className="text-gray-500 mb-6">
            Beheer tafelreservaties, ontvang online boekingen en houd uw bezetting bij.
            Perfect voor restaurants, brasseries en cafés.
          </p>
          <button
            onClick={() => updateSettings({ isEnabled: true })}
            className="px-6 py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors"
          >
            Reservaties Inschakelen
          </button>
          <button onClick={onClose} className="block mx-auto mt-4 text-gray-400 hover:text-gray-600 text-sm">Sluiten</button>
        </div>
      </div>
    )
  }

  // ---- Main render ----
  return (
    <div className="fixed inset-0 z-50 flex min-h-0 flex-col overflow-hidden bg-white h-[100dvh] max-h-[100dvh]">
      {/* Toast */}
      {toast.msg && (
        <div
          className={`fixed left-3 right-3 top-[max(0.5rem,env(safe-area-inset-top))] z-[60] mx-auto max-w-lg rounded-xl px-4 py-3 text-center text-sm text-white shadow-lg transition-all sm:left-auto sm:right-4 sm:top-4 sm:mx-0 sm:text-left sm:text-base ${toast.msg.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
        >
          {toast.msg.text}
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white p-3 sm:p-4">
        <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex-shrink-0 rounded-xl bg-green-100 p-2">
              <CalendarDays size={22} className="text-green-500 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold sm:text-2xl">Reservaties</h1>
              <p className="text-sm text-gray-400 sm:text-base">
                {formatDate(selectedDate)} • {todayStats.covers} personen verwacht
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <button
              onClick={onClose}
              className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-400 sm:gap-2"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Kassa
            </button>
            {viewMode !== 'guests' && viewMode !== 'settings' && (
              <>
                <button
                  onClick={() => setShowWalkInModal(true)}
                  className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-gray-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 sm:gap-2 sm:px-4"
                >
                  <UserCheck size={18} className="shrink-0" />
                  <span className="hidden sm:inline">Walk-in</span>
                </button>
                <button
                  onClick={() => setShowWaitlistModal(true)}
                  className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-purple-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 sm:gap-2 sm:px-4"
                >
                  <Clock size={18} className="shrink-0" />
                  <span className="hidden sm:inline">Wachtlijst</span>
                </button>
                <button
                  onClick={() => setShowNewReservationModal(true)}
                  className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-green-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 sm:gap-2 sm:px-4"
                >
                  <Plus size={20} className="shrink-0" />
                  <span className="inline md:hidden">Nieuw</span>
                  <span className="hidden md:inline">Nieuwe Reservatie</span>
                </button>
              </>
            )}
          </div>
        </div>


        {/* Shift filter (z2) */}
        {reservationSettings.shifts?.some(s => s.isActive) && viewMode === 'today' && (
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setSelectedShift(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedShift === null ? 'bg-[#3C4D6B] text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
            >
              Alle shifts
            </button>
            {reservationSettings.shifts.filter(s => s.isActive).map(shift => (
              <button
                key={shift.id}
                onClick={() => setSelectedShift(shift.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedShift === shift.id ? 'bg-[#3C4D6B] text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
              >
                {shift.name} {shift.startTime}–{shift.endTime}
              </button>
            ))}
          </div>
        )}

        {/* View Toggle & Search */}
        <div className="flex flex-col gap-2 w-full lg:flex-row lg:items-center lg:gap-3">
          <div className="flex rounded-xl p-1 w-full overflow-x-auto" style={{ backgroundColor: '#fed7aa' }}>
            {(() => {
              const pendingCount = reservations.filter(r => r.status === 'PENDING').length
              return [
                { id: 'reservations', label: 'Reserveringen', icon: <List size={16} />, badge: pendingCount },
                { id: 'floorplan', label: 'Plattegrond', icon: <MapPin size={16} />, badge: 0 },
                { id: 'timeline', label: 'Tafels', icon: <LayoutGrid size={16} />, badge: 0 },
                { id: 'guests', label: 'Contacten', icon: <Users size={16} />, badge: 0 },
                { id: 'stats', label: 'Rapporten', icon: <AlertCircle size={16} />, badge: 0 },
                { id: 'settings', label: 'Instellingen', icon: <Settings size={16} />, badge: 0 },
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => { setViewMode(view.id as ViewMode); setShowResCalendar(false) }}
                  className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap min-w-[44px] relative ${
                    viewMode === view.id
                      ? 'bg-[#3C4D6B] text-white'
                      : 'text-white hover:opacity-80'
                  }`}
                  style={viewMode !== view.id ? { backgroundColor: '#f97316' } : {}}
                >
                  {view.icon}
                  <span className="hidden md:inline">{view.label}</span>
                  {view.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                      {view.badge}
                    </span>
                  )}
                </button>
              ))
            })()}
          </div>

          {viewMode !== 'timeline' && viewMode !== 'reservations' && (
            <div className="flex-shrink-0 lg:w-72 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Zoek op naam, telefoon of email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-100 border border-gray-200 focus:border-[#3C4D6B] outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className={`flex-1 min-h-0 p-2 sm:p-4 ${
          viewMode === 'today' || viewMode === 'timeline' || viewMode === 'reservations' || viewMode === 'floorplan'
            ? 'flex flex-col overflow-hidden'
            : 'overflow-y-auto'
        }`}
        key={viewMode}
      >
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && viewMode === 'today' && (
          <div className="flex -m-4 h-full" style={{ height: 'calc(100vh - 130px)' }}>

            {/* LEFT PANEL — reservatielijst */}
            <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {formatDate(today)} • {todayStats.covers} personen • {todayStats.total} reservaties
                </p>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {todayReservations.filter(r => r.status !== 'WAITLIST').length === 0 && (
                  <div className="p-6 text-center text-gray-400 text-sm">Geen reservaties vandaag</div>
                )}
                {todayReservations.filter(r => r.status !== 'WAITLIST').map(r => {
                  const status = STATUS_CONFIG[r.status]
                  const isSelected = selectedReservation?.id === r.id
                  const guest = guestProfiles.find(g => g.phone === r.guest_phone || g.email === r.guest_email)
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedReservation(r)}
                      className={`px-3 py-2.5 cursor-pointer transition-colors hover:bg-gray-50 ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: status.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-sm font-bold text-gray-900">{r.reservation_time}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                              style={{ backgroundColor: status.bgColor, color: status.color }}>
                              {status.label}
                            </span>
                          </div>
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {r.guest_name}
                            {guest?.isVip && <span className="ml-1 text-amber-400">★</span>}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                            <span className="flex items-center gap-0.5"><Users size={10} /> {r.party_size}p</span>
                            {r.table_number && <span className="flex items-center gap-0.5"><MapPin size={10} /> T{r.table_number}</span>}
                            {r.guest_phone && <span className="flex items-center gap-0.5"><Phone size={10} /></span>}
                            {r.notes && <span className="flex items-center gap-0.5"><MessageSquare size={10} /></span>}
                            {r.occasion && <span className="text-purple-400">🎉</span>}
                          </div>
                          {/* Quick actions */}
                          {(r.status === 'CONFIRMED' || r.status === 'PENDING') && (
                            <div className="flex gap-1 mt-1.5">
                              {r.status === 'PENDING' && (
                                <button onClick={e => { e.stopPropagation(); handleConfirm(r) }}
                                  className="text-[10px] px-2 py-1 rounded-md bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors">
                                  Bevestigen
                                </button>
                              )}
                              {r.status === 'CONFIRMED' && (
                                <button onClick={e => { e.stopPropagation(); handleCheckIn(r) }}
                                  className="text-[10px] px-2 py-1 rounded-md bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors">
                                  Check-in
                                </button>
                              )}
                              <button onClick={e => { e.stopPropagation(); handleNoShow(r) }}
                                className="text-[10px] px-2 py-1 rounded-md bg-red-100 text-red-500 font-medium hover:bg-red-200 transition-colors">
                                No-show
                              </button>
                            </div>
                          )}
                          {r.status === 'CHECKED_IN' && (
                            <div className="flex gap-1 mt-1.5">
                              <button onClick={e => { e.stopPropagation(); handleStartOrder(r) }}
                                className="text-[10px] px-2 py-1 rounded-md bg-[#3C4D6B] text-white font-medium hover:bg-[#4a5d7b] transition-colors">
                                Naar Kassa
                              </button>
                              <button onClick={e => { e.stopPropagation(); handleComplete(r) }}
                                className="text-[10px] px-2 py-1 rounded-md bg-gray-100 text-gray-500 font-medium hover:bg-gray-200 transition-colors">
                                Afronden
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Wachtlijst */}
                {waitlistReservations.length > 0 && (
                  <div>
                    <div className="px-3 py-2 bg-purple-50 border-y border-purple-100">
                      <p className="text-xs font-bold text-purple-600">WACHTLIJST ({waitlistReservations.length})</p>
                    </div>
                    {waitlistReservations.map(r => (
                      <div key={r.id} onClick={() => setSelectedReservation(r)}
                        className="px-3 py-2.5 border-l-4 border-purple-400 cursor-pointer hover:bg-purple-50 transition-colors">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-bold">{r.reservation_time}</span>
                          {r.waitlist_position && <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">#{r.waitlist_position}</span>}
                        </div>
                        <p className="font-semibold text-sm text-gray-900 truncate">{r.guest_name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span>{r.party_size}p</span>
                        </div>
                        <button onClick={e => { e.stopPropagation(); handleConfirmFromWaitlist(r) }}
                          className="mt-1.5 text-[10px] px-2 py-1 rounded-md bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors">
                          Bevestigen
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANEL — tafelplan */}
            <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: '#e3e3e3' }}>
              {/* Grid achtergrond */}
              <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(to right, #999 1px, transparent 1px), linear-gradient(to bottom, #999 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }} />

              {floorPlanTablesDB.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center bg-white/80 rounded-2xl p-8 shadow-sm">
                    <LayoutGrid size={48} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 font-semibold mb-1">Nog geen tafels aangemaakt</p>
                    <p className="text-sm text-gray-400 mb-4">Maak je plattegrond aan om tafels te zien</p>
                    <button
                      onClick={() => setViewMode('floorplan')}
                      className="px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Plus size={16} />
                      Tafels aanmaken
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {floorPlanTablesDB.map(table => {
                    const tableRes = todayReservations.find(r =>
                      String(r.table_number) === String(table.number) && r.status !== 'CANCELLED' && r.status !== 'COMPLETED'
                    )
                    const isSelected = String(selectedReservation?.table_number) === String(table.number)
                    let statusColor = '#22c55e'
                    if (tableRes?.status === 'CHECKED_IN') statusColor = '#3b82f6'
                    else if (tableRes?.status === 'CONFIRMED') statusColor = '#8b5cf6'
                    else if (tableRes?.status === 'PENDING') statusColor = '#f59e0b'

                    return (
                      <div
                        key={table.id}
                        onClick={() => tableRes ? setSelectedReservation(tableRes) : null}
                        className="absolute"
                        style={{
                          left: `${table.x}%`,
                          top: `${table.y}%`,
                          transform: `translate(-50%, -50%) rotate(${table.rotation}deg)`,
                          cursor: tableRes ? 'pointer' : 'default',
                          zIndex: isSelected ? 10 : 1,
                        }}
                      >
                        <ReservationTableSVG
                          table={table}
                          statusColor={statusColor}
                          isSelected={isSelected}
                          guests={todayReservations
                            .filter(r => String(r.table_number) === String(table.number) && r.status !== 'CANCELLED' && r.status !== 'COMPLETED' && r.status !== 'NO_SHOW')
                            .sort((a,b) => a.reservation_time.localeCompare(b.reservation_time))
                            .map(r => ({ name: r.guest_name, time: r.reservation_time }))
                          }
                        />
                      </div>
                    )
                  })}

                  {/* Legenda */}
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-xl px-4 py-2.5 flex items-center gap-4 shadow-md text-xs font-medium">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-400" /><span>Vrij</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-violet-400" /><span>Gereserveerd</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-400" /><span>Bezet</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400" /><span>Afwachting</span></div>
                  </div>

                  {/* Datum badge */}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-xl px-3 py-1.5 shadow text-xs font-bold text-gray-600">
                    {formatDate(today)}
                  </div>
                </>
              )}
            </div>
          </div>
        )}



        {!loading && viewMode === 'calendar' && (
          <CalendarView
            reservations={reservations}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onSelectReservation={setSelectedReservation}
            onNewReservation={() => setShowNewReservationModal(true)}
            renderReservationCard={renderReservationCard}
          />
        )}

        {!loading && viewMode === 'floorplan' && (() => {
          // Reservation status per table for selected date
          const floorRes = reservations.filter(r =>
            r.reservation_date === selectedDate &&
            r.status !== 'CANCELLED'
          )
          const getFloorTableInfo = (tableNum: string) => {
            const all = floorRes.filter(r => String(r.table_number) === String(tableNum))
            // Geen reservaties of enkel afgeronde → vrij (groen)
            const active = all.filter(r => r.status !== 'COMPLETED')
            if (active.length === 0) return { color: '#4ade80', borderColor: '#22c55e', label: 'Vrij', res: null, count: 0, guestLabel: '' }
            // Toon de eerstvolgende actieve reservatie
            const res = active.sort((a, b) => a.reservation_time.localeCompare(b.reservation_time))[0]
            const count = active.length
            const guestLabel = count === 2
              ? `${res.guest_name} · ${active[1].guest_name}`
              : count > 2
                ? `${res.guest_name} +${count - 1}`
                : res.guest_name
            if (res.status === 'CHECKED_IN') return { color: '#60a5fa', borderColor: '#3b82f6', label: 'Bezet', res, count, guestLabel }
            if (res.status === 'CONFIRMED') return { color: '#a78bfa', borderColor: '#8b5cf6', label: 'Gereserveerd', res, count, guestLabel }
            if (res.status === 'PENDING') return { color: '#fbbf24', borderColor: '#f59e0b', label: 'Afwachting', res, count, guestLabel }
            return { color: '#4ade80', borderColor: '#22c55e', label: 'Vrij', res, count, guestLabel }
          }

          return (
            <div className="flex flex-col flex-1 min-h-0 -m-4">
              {/* Toolbar */}
              <div className="flex flex-shrink-0 flex-wrap items-center gap-2 bg-white px-2 py-2 sm:gap-3 sm:px-4 sm:py-3 border-b border-gray-200">

                {/* Datum kiezer — groot en opvallend */}
                <div className="flex items-center gap-2 bg-orange-500 rounded-2xl px-3 py-2 shadow-md">
                  <button
                    onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() - 1); setSelectedDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`) }}
                    className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition-colors">
                    <ChevronLeft size={22} className="text-white" />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-xl text-white min-w-[8rem] text-center leading-tight">
                      {formatDate(selectedDate)}
                    </span>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                      className="mt-0.5 text-xs font-semibold text-white/90 bg-white/20 border border-white/30 rounded-lg px-2 py-0.5 text-center cursor-pointer outline-none" />
                  </div>
                  <button
                    onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + 1); setSelectedDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`) }}
                    className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition-colors">
                    <ChevronRight size={22} className="text-white" />
                  </button>
                </div>

                <div className="flex-1" />

                {/* Legend */}
                <div className="hidden lg:flex items-center gap-4 text-sm font-medium text-gray-600">
                  <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-green-400" /><span>Vrij</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-violet-400" /><span>Gereserveerd</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-blue-400" /><span>Bezet</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-amber-400" /><span>Afwachting</span></div>
                </div>

                <div className="flex-1" />

                {/* Vergrendel-knop */}
                <button
                  onClick={() => {
                    const next = !tablesLocked
                    setTablesLocked(next)
                    try { localStorage.setItem(`floor_tables_locked_${tenant}`, String(next)) } catch {}
                  }}
                  className={`flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-bold transition-colors whitespace-nowrap shadow-sm ${
                    tablesLocked
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                  title={tablesLocked ? 'Tafels vergrendeld — klik om te ontgrendelen' : 'Tafels ontgrendeld — klik om te vergrendelen'}
                >
                  {tablesLocked ? <Lock size={18} /> : <LockOpen size={18} />}
                  <span className="hidden sm:inline">{tablesLocked ? 'Vergrendeld' : 'Vergrendelen'}</span>
                </button>

                <button onClick={() => { setSelectedFloorTable(null); setShowAddFloorTable(true) }}
                  className="flex items-center gap-2 h-11 px-5 rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-bold transition-colors whitespace-nowrap shadow-sm">
                  <Plus size={18} />
                  <span className="hidden sm:inline">Tafel toevoegen</span>
                  <span className="sm:hidden">+ Tafel</span>
                </button>
              </div>

              {/* Canvas + lijst + optional sidebar */}
              <div className="flex flex-1 min-h-0 overflow-hidden relative">

                {/* Lijst links — inklapbaar */}
                <div className={`flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-all duration-300 relative ${resListCollapsed ? 'w-0' : 'w-52 md:w-60 lg:w-72'}`}>
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-bold text-base text-gray-800 whitespace-nowrap">Reservaties</span>
                    <span className="text-sm font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{floorRes.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                    {floorRes.length === 0 ? (() => {
                      const allDates = [...new Set(
                        reservations
                          .filter(r => r.status !== 'CANCELLED')
                          .map(r => r.reservation_date)
                          .filter(Boolean)
                      )].sort()
                      return (
                        <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                          <CalendarDays size={32} className="text-gray-300 mb-3" />
                          <p className="text-base text-gray-400 font-medium">Geen reservaties</p>
                          <p className="text-sm text-gray-300 mt-1">voor {formatDate(selectedDate)}</p>
                          {allDates.length > 0 && (
                            <div className="mt-4 w-full">
                              <p className="text-xs text-gray-400 mb-2">Reservaties gevonden op:</p>
                              <div className="flex flex-col gap-1">
                                {allDates.map(d => (
                                  <button
                                    key={d}
                                    onClick={() => setSelectedDate(d)}
                                    className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg px-3 py-1.5 font-semibold transition-colors"
                                  >
                                    {formatDate(d)} ({reservations.filter(r => r.reservation_date === d && r.status !== 'CANCELLED').length}×)
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {reservations.length === 0 && !loading && (
                            <div className="mt-4">
                              <p className="text-xs text-red-400 font-medium">Geen data geladen</p>
                              <button
                                onClick={() => loadReservations()}
                                className="mt-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg px-3 py-1.5 font-semibold transition-colors"
                              >
                                Opnieuw laden
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })() : (
                      floorRes.map(r => {
                        const statusDot: Record<string, string> = {
                          CONFIRMED: 'bg-violet-400',
                          CHECKED_IN: 'bg-blue-400',
                          PENDING: 'bg-amber-400',
                          CANCELLED: 'bg-gray-300',
                        }
                        const isActive = selectedReservation?.id === r.id
                        return (
                          <div
                            key={r.id}
                            onClick={() => setSelectedReservation(r)}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          >
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${statusDot[r.status] ?? 'bg-gray-300'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base text-gray-900 truncate">{r.guest_name}</p>
                              <p className="text-sm text-gray-400">{r.reservation_time} · {r.party_size}p{r.table_number ? ` · T${r.table_number}` : ''}</p>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <button
                      onClick={() => setShowNewReservationModal(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
                    >
                      <Plus size={15} />
                      Nieuwe reservatie
                    </button>
                  </div>
                </div>

                {/* Oranje toggle knop om lijst in/uit te klappen */}
                <button
                  onClick={() => setResListCollapsed(c => !c)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center rounded-r-2xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-xl transition-all"
                  style={{ width: 44, height: 80, fontSize: 22, left: resListCollapsed ? 0 : undefined }}
                  title={resListCollapsed ? 'Lijst tonen' : 'Lijst verbergen'}
                >
                  {resListCollapsed ? '▶' : '◀'}
                </button>

                {/* Canvas */}
                <div
                  className="res-floor-canvas flex-1 min-h-0 relative overflow-hidden select-none"
                  ref={canvasRef}
                  style={{
                    backgroundColor: '#e3e3e3',
                    backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.07) 1px, transparent 1px)`,
                    backgroundSize: `${40 * floorZoom}px ${40 * floorZoom}px`,
                    backgroundPosition: `${panX}px ${panY}px`,
                    cursor: isDraggingFloor ? 'grabbing' : isPanning.current ? 'grabbing' : 'grab',
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    overflow: 'hidden',
                  }}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleFloorPointerMove}
                  onPointerUp={handleFloorPointerUp}
                  onPointerCancel={handleFloorPointerUp}
                  onWheel={handleFloorWheel}
                >
                  {/* Wereld — beweegt via pan+zoom transform, tafels staan vast */}
                  <div style={{
                    position: 'absolute',
                    width: `${WORLD_W}px`,
                    height: `${WORLD_H}px`,
                    transform: `translate(${panX}px, ${panY}px) scale(${floorZoom})`,
                    transformOrigin: '0 0',
                  }}>
                  {floorPlanTablesDB.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center bg-white/80 rounded-2xl px-10 py-8 shadow-sm">
                        <LayoutGrid size={48} className="mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-600 font-semibold mb-1">Nog geen tafels</p>
                        <p className="text-sm text-gray-400">Klik op &ldquo;Tafel toevoegen&rdquo; om te starten</p>
                      </div>
                    </div>
                  )}

                  {floorPlanTablesDB.map(table => {
                    const { borderColor, res, count, guestLabel } = getFloorTableInfo(table.number)
                    const isSelected = selectedFloorTable?.id === table.id

                    return (
                      <div
                        key={table.id}
                        data-table-id={table.id}
                        className="absolute"
                        style={{
                          left: `${(table.x / 100) * WORLD_W}px`,
                          top: `${(table.y / 100) * WORLD_H}px`,
                          transform: `translate(-50%, -50%) rotate(${table.rotation}deg)`,
                          zIndex: isSelected ? 10 : 1,
                          cursor: isDraggingFloor ? 'grabbing' : 'grab',
                          touchAction: 'none',
                        }}
                      >
                        <div style={{ pointerEvents: 'none' }}>
                          <ReservationTableSVG
                            table={table}
                            statusColor={borderColor}
                            isSelected={isSelected}
                            guests={floorRes
                              .filter(r => String(r.table_number) === String(table.number))
                              .sort((a,b) => a.reservation_time.localeCompare(b.reservation_time))
                              .map(r => ({ name: r.guest_name, time: r.reservation_time }))
                            }
                          />
                        </div>
                      </div>
                    )
                  })}
                  </div>{/* einde geschaalde wrapper */}

                  {/* Kompaspad linksonder — hint + knoppen voor canvas panning */}
                  <div
                    className="absolute bottom-4 left-4 z-20 select-none"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-3 gap-1">
                      <div />
                      <button
                        onPointerDown={e => { e.stopPropagation(); e.preventDefault() }}
                        onClick={e => { e.stopPropagation(); setPanY((p: number) => p + 80) }}
                        className="w-10 h-10 rounded-xl text-white flex items-center justify-center text-lg font-bold border border-white/30 transition-colors"
                        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                      >▲</button>
                      <div />
                      <button
                        onPointerDown={e => { e.stopPropagation(); e.preventDefault() }}
                        onClick={e => { e.stopPropagation(); setPanX((p: number) => p + 80) }}
                        className="w-10 h-10 rounded-xl text-white flex items-center justify-center text-lg font-bold border border-white/30 transition-colors"
                        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                      >◀</button>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>✛</span>
                      </div>
                      <button
                        onPointerDown={e => { e.stopPropagation(); e.preventDefault() }}
                        onClick={e => { e.stopPropagation(); setPanX((p: number) => p - 80) }}
                        className="w-10 h-10 rounded-xl text-white flex items-center justify-center text-lg font-bold border border-white/30 transition-colors"
                        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                      >▶</button>
                      <div />
                      <button
                        onPointerDown={e => { e.stopPropagation(); e.preventDefault() }}
                        onClick={e => { e.stopPropagation(); setPanY((p: number) => p - 80) }}
                        className="w-10 h-10 rounded-xl text-white flex items-center justify-center text-lg font-bold border border-white/30 transition-colors"
                        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                      >▼</button>
                      <div />
                    </div>
                  </div>
                </div>

                {/* Sidebar — fixed: volledige schermhoogte, ook over toolbar (Wachtlijst, Vergrendelen, …) */}
                {selectedFloorTable && (() => {
                  const { label, color } = getFloorTableInfo(selectedFloorTable.number)
                  const allTableRes = floorRes.filter(r => String(r.table_number) === String(selectedFloorTable.number)).sort((a,b) => a.reservation_time.localeCompare(b.reservation_time))
                  return (
                    <div
                      className="fixed right-0 top-0 z-[55] flex min-h-0 w-[min(380px,95vw)] sm:w-[min(320px,85vw)] flex-col overflow-hidden border-l border-white/10 bg-[#16213e] shadow-2xl"
                      style={{
                        height: '100dvh',
                        maxHeight: '100dvh',
                        paddingTop: 'env(safe-area-inset-top, 0px)',
                        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                      }}
                    >

                      {/* Header */}
                      <div
                        className="flex flex-shrink-0 items-start justify-between gap-2 p-3 sm:p-4"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', borderLeft: `4px solid ${color}` }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex flex-wrap items-center gap-2">
                            <h3 className="text-2xl font-bold text-white sm:text-3xl">Tafel {selectedFloorTable.number}</h3>
                            <span className="shrink-0 rounded-full px-2.5 py-1 text-sm font-bold text-white sm:px-3 sm:text-base" style={{ backgroundColor: color }}>{label}</span>
                          </div>
                          <p className="text-sm font-medium text-white/60 sm:text-base">{selectedFloorTable.seats} plaatsen</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedFloorTable(null)}
                          className="min-h-[44px] min-w-[44px] shrink-0 text-2xl text-white/50 hover:text-white"
                          aria-label="Sluiten"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Reservaties */}
                      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <p className="text-white/50 text-sm uppercase tracking-wider mb-3">Reservaties</p>
                        {allTableRes.length > 0 ? (
                          <div className="space-y-3">
                            {allTableRes.map(r => (
                              <div key={r.id} className="rounded-xl p-3 space-y-2" style={{ backgroundColor: '#e3e3e3' }}>
                                {/* Naam + status */}
                                <div className="flex items-center justify-between">
                                  <p className="text-gray-900 font-bold text-lg">{r.guest_name}</p>
                                  <span className="text-sm font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: STATUS_CONFIG[r.status]?.color }}>
                                    {STATUS_CONFIG[r.status]?.label || r.status}
                                  </span>
                                </div>
                                {/* Details */}
                                <div className="flex items-center gap-3 text-base text-gray-600">
                                  <span className="flex items-center gap-1"><Clock size={14} />{r.reservation_time}</span>
                                  <span className="flex items-center gap-1"><Users size={14} />{r.party_size}p</span>
                                  {r.table_number && <span className="flex items-center gap-1"><MapPin size={14} />T{r.table_number}</span>}
                                </div>
                                {r.guest_phone && <a href={`tel:${r.guest_phone}`} className="flex items-center gap-1 text-base text-emerald-600 hover:text-emerald-700"><Phone size={14} />{r.guest_phone}</a>}
                                {r.notes && <p className="text-sm text-gray-500 italic">{r.notes}</p>}
                                {r.special_requests && (
                                  <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>⚠️ {r.special_requests}</p>
                                )}

                                {/* Status knoppen — min 44px hoogte voor touch */}
                                <div className="grid grid-cols-2 gap-1.5 pt-1">
                                  {r.status === 'PENDING' && (
                                    <button onClick={() => handleConfirm(r)} className="col-span-2 min-h-[44px] rounded-xl bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5">
                                      <CheckCircle2 size={14} /> Bevestigen
                                    </button>
                                  )}
                                  {(r.status === 'CONFIRMED' || r.status === 'PENDING') && (
                                    <button onClick={() => handleCheckIn(r)} className="min-h-[44px] rounded-xl bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1">
                                      <UserCheck size={15} /> Bezet
                                    </button>
                                  )}
                                  {r.status === 'CHECKED_IN' && (
                                    <button onClick={() => handleStartOrder(r)} className="min-h-[44px] rounded-xl bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1">
                                      <UtensilsCrossed size={15} /> Kassa
                                    </button>
                                  )}
                                  {r.status === 'CHECKED_IN' && (
                                    <button onClick={() => handleComplete(r)} className="min-h-[44px] rounded-xl text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1" style={{ backgroundColor: 'rgba(99,102,241,0.8)' }}>
                                      <CheckCircle2 size={15} /> Vrij
                                    </button>
                                  )}
                                  {(r.status === 'CONFIRMED' || r.status === 'PENDING' || r.status === 'CHECKED_IN') && (
                                    <button onClick={() => handleNoShow(r)} className="min-h-[44px] rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#dc2626' }}>
                                      <UserX size={15} /> No-show
                                    </button>
                                  )}
                                </div>

                                {/* Aanpassen + Verwijderen */}
                                <div className="grid grid-cols-2 gap-1.5">
                                  <button onClick={() => setSelectedReservation(r)} className="min-h-[44px] rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1" style={{ backgroundColor: 'rgba(0,0,0,0.08)', color: '#374151' }}>
                                    ✏️ Aanpassen
                                  </button>
                                  <button onClick={() => handleDeleteReservation(r.id)} className="min-h-[44px] rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#dc2626' }}>
                                    🗑 Annulatie
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-white/30 text-sm text-center py-6">Geen reservatie voor {formatDate(selectedDate)}</p>
                        )}
                      </div>

                      {/* Draaien */}
                      <div className="flex-shrink-0 p-3 sm:p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Draaien</p>
                        <div className="flex gap-2">
                          <button onClick={async () => { const u = floorPlanTablesDB.map(t => t.id === selectedFloorTable.id ? { ...t, rotation: (t.rotation - 45 + 360) % 360 } : t); await saveFloorPlan(u); setSelectedFloorTable(p => p ? { ...p, rotation: (p.rotation - 45 + 360) % 360 } : null) }}
                            className="flex-1 min-h-[48px] rounded-xl font-bold text-xl text-white transition-colors active:opacity-70" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>↺</button>
                          <button onClick={async () => { const u = floorPlanTablesDB.map(t => t.id === selectedFloorTable.id ? { ...t, rotation: (t.rotation + 45) % 360 } : t); await saveFloorPlan(u); setSelectedFloorTable(p => p ? { ...p, rotation: (p.rotation + 45) % 360 } : null) }}
                            className="flex-1 min-h-[48px] rounded-xl font-bold text-xl text-white transition-colors active:opacity-70" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>↻</button>
                          <button onClick={async () => { const u = floorPlanTablesDB.map(t => t.id === selectedFloorTable.id ? { ...t, rotation: 0 } : t); await saveFloorPlan(u); setSelectedFloorTable(p => p ? { ...p, rotation: 0 } : null) }}
                            className="flex-1 min-h-[48px] rounded-xl text-xs font-semibold text-white transition-colors active:opacity-70" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>Reset</button>
                        </div>
                      </div>

                      {/* Acties */}
                      <div className="mt-auto flex-shrink-0 space-y-2 p-3 sm:p-4">
                        <button onClick={() => { setShowNewReservationModal(true); setSelectedFloorTable(null) }}
                          className="w-full min-h-[52px] rounded-xl bg-emerald-500 active:bg-emerald-700 text-white font-bold transition-colors text-sm">
                          + Reservatie aanmaken
                        </button>
                        <button onClick={() => deleteFloorTable(selectedFloorTable.id)}
                          className="w-full min-h-[44px] rounded-xl text-sm font-semibold transition-colors active:opacity-70" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                          🗑 Tafel verwijderen
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Add table modal */}
              {showAddFloorTable && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
                  <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                    <div className="p-5 border-b flex items-center justify-between">
                      <h3 className="font-bold text-lg">Tafel toevoegen</h3>
                      <button onClick={() => setShowAddFloorTable(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Tafelnummer *</label>
                        <input autoFocus value={addFloorNumber} onChange={e => setAddFloorNumber(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addFloorTable()}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 outline-none text-xl font-bold text-center"
                          placeholder="bv. 1, 2A, Toog" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-2">Aantal plaatsen</label>
                        <div className="grid grid-cols-5 gap-2">
                          {[2, 4, 6, 8, 10].map(n => (
                            <button key={n} onClick={() => setAddFloorSeats(n)}
                              className={`py-2 rounded-xl font-bold transition-colors ${addFloorSeats === n ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-2">Vorm</label>
                        <div className="grid grid-cols-3 gap-2">
                          {([['SQUARE', '⬛ Vierkant'], ['ROUND', '⭕ Rond'], ['RECTANGLE', '▬ Rechthoek']] as const).map(([s, label]) => (
                            <button key={s} onClick={() => setAddFloorShape(s)}
                              className={`py-2 rounded-xl text-xs font-bold transition-colors ${addFloorShape === s ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border-t flex gap-3">
                      <button onClick={() => setShowAddFloorTable(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-semibold">Annuleer</button>
                      <button onClick={addFloorTable} className="flex-[2] py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold transition-colors">Toevoegen</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })()}


        {!loading && viewMode === 'timeline' && (() => {
          // Time slots from 10:00 to 22:00 — geen horizontaal scrollen
          const ROW_H = 60
          const LABEL_W = 90
          const START_MIN  = timeShift === 'dag' ? 10 * 60 : 17 * 60  // dag=10:00, avond=17:00
          const END_MIN    = timeShift === 'dag' ? 16 * 60 : 23 * 60  // dag=16:00, avond=23:00
          const EXTRA_MIN  = END_MIN + 2 * 60  // 2 uur extra grijze vakken na END_MIN
          const totalSlots = (END_MIN - START_MIN) / 30
          const timeSlots: string[] = []
          for (let m = START_MIN; m < END_MIN; m += 30) {
            const h = Math.floor(m / 60).toString().padStart(2, '0')
            const min = (m % 60).toString().padStart(2, '0')
            timeSlots.push(`${h}:${min}`)
          }
          // Extra grijze slots na einde tijdband (zichtbaar via horizontaal scrollen)
          const extraSlots: string[] = []
          for (let m = END_MIN; m < EXTRA_MIN; m += 30) {
            const hh = Math.floor(m / 60) % 24
            const mm = m % 60
            extraSlots.push(`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`)
          }
          const totalRange = EXTRA_MIN - START_MIN  // blokken berekend over totale range incl. extra

          // Tables to show: floor plan tables first, then any table in reservations
          const tableNumbers = floorPlanTablesDB.length > 0
            ? floorPlanTablesDB.map(t => t.number)
            : [...new Set(reservations.filter(r => r.table_number).map(r => r.table_number!))]
          const sortedTables = tableNumbers.length > 0 ? tableNumbers : ['(geen tafel)']

          // Filter reservations for this date
          const dayRes = reservations.filter(r => r.reservation_date === timelineDate && r.status !== 'CANCELLED')

          // Current time marker
          const now = new Date()
          const isToday = timelineDate === `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
          const nowMin = now.getHours() * 60 + now.getMinutes()
          // nowPct = positie van huidige tijd als percentage van de tijdband (excl. label)
          const nowPct = isToday && nowMin >= START_MIN && nowMin <= END_MIN
            ? ((nowMin - START_MIN) / (END_MIN - START_MIN)) * 100
            : null

          const statusColors: Record<string, string> = {
            CONFIRMED: '#3b82f6',
            CHECKED_IN: '#22c55e',
            PENDING: '#f59e0b',
            COMPLETED: '#9ca3af',
            NO_SHOW: '#ef4444',
            WAITLIST: '#8b5cf6',
          }

          // Kleur per status
          const statusBlockColor = (status: string, inExtraZone: boolean) => {
            if (inExtraZone) return '#6B7280'
            switch(status) {
              case 'CHECKED_IN':  return '#16a34a'  // groen — aan tafel
              case 'NO_SHOW':     return '#dc2626'  // rood
              case 'COMPLETED':   return '#6B7280'  // grijs — vertrokken
              case 'CONFIRMED':   return '#3B5BDB'  // blauw
              default:            return '#3B5BDB'  // blauw (PENDING etc.)
            }
          }

          // Rode lijn positie
          const nowMin2 = timelineNow.getHours() * 60 + timelineNow.getMinutes()
          const isToday2 = timelineDate === `${timelineNow.getFullYear()}-${String(timelineNow.getMonth()+1).padStart(2,'0')}-${String(timelineNow.getDate()).padStart(2,'0')}`
          const redLinePct = isToday2 && nowMin2 >= START_MIN && nowMin2 <= EXTRA_MIN
            ? ((nowMin2 - START_MIN) / totalRange * 100)
            : null

          // Mini kalender helpers
          const calFirstDay = new Date(calMonth.year, calMonth.month, 1)
          let calDow = calFirstDay.getDay(); if (calDow === 0) calDow = 7
          const calDaysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate()
          const calPad = calDow - 1
          const todayStr = `${timelineNow.getFullYear()}-${String(timelineNow.getMonth()+1).padStart(2,'0')}-${String(timelineNow.getDate()).padStart(2,'0')}`

          return (
            <div className="flex gap-3 flex-1 overflow-hidden min-w-0">
              {/* === TIJDLIJN LINKS — groeit/krimpt mee met kalender === */}
              <div className="flex flex-col flex-1 overflow-hidden min-w-0">
                {/* Date nav */}
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => { const d = new Date(timelineDate + 'T12:00:00'); d.setDate(d.getDate()-1); setTimelineDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`) }}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronLeft size={16}/></button>
                  <span className="font-bold text-xl">{formatDate(timelineDate)}</span>
                  <button onClick={() => { const d = new Date(timelineDate + 'T12:00:00'); d.setDate(d.getDate()+1); setTimelineDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`) }}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronRight size={16}/></button>
                  {/* Dag / Avond toggle */}
                  <div className="flex rounded-lg overflow-hidden border border-gray-200 ml-2">
                    <button onClick={() => setTimeShift('dag')}
                      className={`px-4 py-1.5 text-sm font-bold transition-colors ${timeShift==='dag'?'bg-orange-500 text-white':'bg-white text-gray-500 hover:bg-gray-50'}`}>
                      Dag
                    </button>
                    <button onClick={() => setTimeShift('avond')}
                      className={`px-4 py-1.5 text-sm font-bold transition-colors border-l border-gray-200 ${timeShift==='avond'?'bg-orange-500 text-white':'bg-white text-gray-500 hover:bg-gray-50'}`}>
                      Avond
                    </button>
                  </div>
                  {/* Kalender toon/verberg knop */}
                  <button
                    onClick={() => setCalOpen(o => !o)}
                    className={`ml-2 flex items-center gap-2 px-5 py-1.5 rounded-lg border-2 font-bold text-sm transition-colors
                      ${calOpen
                        ? 'bg-orange-500 border-orange-500 text-white hover:bg-orange-600'
                        : 'bg-gray-200 border-gray-300 text-gray-500 hover:bg-gray-300'
                      }`}>
                    <Calendar size={20}/>
                    <span>Kalender</span>
                    {calOpen ? <Eye size={22}/> : <EyeOff size={22}/>}
                  </button>
                  {/* Zoek knop */}
                  <button
                    onClick={() => setShowSearchPopup(true)}
                    className="ml-2 flex items-center gap-2 px-5 py-1.5 rounded-lg border-2 font-bold text-sm bg-gray-700 border-gray-700 text-white hover:bg-gray-800 transition-colors">
                    <Search size={20}/>
                    <span>Zoek reserv.</span>
                  </button>
                  <span className="text-sm text-gray-400 ml-auto">{dayRes.length} res. · {dayRes.reduce((s,r)=>s+r.party_size,0)}p</span>
                </div>

                {/* Legenda statuskleuren */}
                <div className="flex items-center gap-4 mb-2 px-1">
                  {[
                    { color:'#3B5BDB', label:'Verwacht/Bevestigd' },
                    { color:'#16a34a', label:'Aan tafel' },
                    { color:'#dc2626', label:'No-show' },
                    { color:'#6B7280', label:'Vertrokken' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }}/>
                      <span className="text-xs text-gray-500">{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* Grid — één scroll container voor beide richtingen */}
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white flex flex-col flex-1">
                  <div className="overflow-auto flex-1" ref={timelineGridScrollRef}>
                    {/* Vaste minimumbreedte — alles binnenin scrollt mee */}
                    <div style={{ minWidth: (timeSlots.length + extraSlots.length) * 80 + LABEL_W }}>

                      {/* Oranje header — sticky bovenaan de scroll container */}
                      <div className="flex sticky top-0 z-10" style={{ height:48, backgroundColor:'#F97316' }}>
                        <div style={{ width:LABEL_W, flexShrink:0 }} className="border-r border-orange-400 flex items-center justify-center sticky left-0 z-20 bg-orange-500">
                          <span className="text-sm font-bold text-white">Tafel</span>
                        </div>
                        <div className="flex relative" style={{ width:(timeSlots.length+extraSlots.length)*80 }}>
                          {timeSlots.map((t,i) => (
                            <div key={t} style={{ width:80, flexShrink:0 }} className="border-r border-orange-400 flex items-center justify-center">
                              {i%2===0 && <span className="text-sm font-bold text-white">{t}</span>}
                            </div>
                          ))}
                          {extraSlots.map((t,i) => (
                            <div key={`ex-${t}`} style={{ width:80, flexShrink:0 }} className="border-r border-orange-300 flex items-center justify-center bg-orange-400/70">
                              {i%2===0 && <span className="text-sm font-bold text-white/80">{t}</span>}
                            </div>
                          ))}
                          {redLinePct !== null && (
                            <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none" style={{ left:`${redLinePct}%` }} />
                          )}
                        </div>
                      </div>

                      {/* Rijen */}
                      {sortedTables.map((tableNum, rowIdx) => {
                        const tableRes = dayRes.filter(r => (r.table_number||'(geen tafel)') === tableNum)
                        const fpTable = floorPlanTablesDB.find(t => t.number === tableNum)
                        const slotW = (timeSlots.length + extraSlots.length) * 80
                        return (
                          <div key={tableNum} className="flex relative"
                            style={{ height:ROW_H, backgroundColor:rowIdx%2===0?'white':'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
                            <div style={{ width:LABEL_W, flexShrink:0 }}
                              className="border-r border-gray-200 flex flex-col items-center justify-center px-2 bg-white sticky left-0 z-10">
                              <span className="text-base font-bold text-gray-800">{tableNum}</span>
                              {fpTable && <span className="text-xs text-gray-400">{fpTable.seats}p</span>}
                            </div>
                            {/* Content area — vaste breedte zodat % positionering klopt */}
                            <div style={{ width:slotW, position:'relative', flexShrink:0 }}>
                              {/* Grid lijnen */}
                              <div className="flex h-full absolute inset-0">
                                {timeSlots.map((t,i) => (
                                  <div key={t} style={{ width:80, flexShrink:0 }} className={`h-full border-r ${i%2===0?'border-gray-300':'border-gray-100'}`} />
                                ))}
                                {extraSlots.map((t) => (
                                  <div key={`ex-${t}`} style={{ width:80, flexShrink:0 }} className="h-full border-r border-gray-200 bg-gray-100/60" />
                                ))}
                              </div>
                              {/* Rode lijn */}
                              {redLinePct !== null && (
                                <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none" style={{ left:`${redLinePct}%` }}>
                                  {rowIdx === 0 && <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-red-500" />}
                                </div>
                              )}
                              {/* Reservatieblokken */}
                              {tableRes.map((r) => {
                                const [rh,rm] = r.reservation_time.split(':').map(Number)
                                const startMin = rh*60+rm
                                const baseDur = (() => {
                                  const n = Number(r.duration_minutes)
                                  return Number.isFinite(n) && n > 0 ? n : 90
                                })()
                                const dur = timelineDurPreview?.id === r.id ? timelineDurPreview.dur : baseDur
                                if (startMin >= EXTRA_MIN || startMin+dur <= START_MIN) return null
                                const leftPx = Math.max(0,(startMin-START_MIN)/totalRange*slotW)
                                const widthPx = Math.min(dur/totalRange*slotW, slotW-leftPx) - 2
                                const bufferMin = reservationSettings.bufferMinutes || 0
                                const maxDurCap = computeTimelineMaxDurationMinutes(r, tableRes, bufferMin, EXTRA_MIN)
                                return (
                                  <div
                                    key={r.id}
                                    className="absolute group"
                                    style={{ left:leftPx, width:Math.max(widthPx, 48), top:6, bottom:6, height:'auto', zIndex:2 }}
                                  >
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => setSelectedReservation(r)}
                                      onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setSelectedReservation(r) } }}
                                      className="absolute inset-0 cursor-pointer flex items-center hover:brightness-110 transition-all pr-7 sm:pr-8"
                                      style={{ backgroundColor: statusBlockColor(r.status, startMin >= END_MIN), clipPath:'polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%)' }}
                                    >
                                      <div className="flex-shrink-0 w-8 h-8 ml-2 rounded-full bg-white/30 flex items-center justify-center">
                                        <span className="text-white text-sm font-black leading-none">{r.table_number||'?'}</span>
                                      </div>
                                      <div className="min-w-0 flex-1 flex flex-col justify-center ml-2 pr-1">
                                        <span className="text-white text-base font-bold truncate leading-tight">{r.guest_name}</span>
                                        <span className="text-white/85 text-[10px] font-semibold leading-tight">{formatTimelineDurLabel(dur)}</span>
                                      </div>
                                    </div>
                                    <div
                                      title="Sleep links/rechts: duur korter of langer (stopt vóór volgende reservatie)"
                                      className="absolute right-0 top-0 bottom-0 w-7 sm:w-8 z-10 cursor-ew-resize flex items-center justify-center hover:bg-black/20 active:bg-black/30 rounded-r-md border-l border-white/40 touch-none select-none"
                                      style={{ touchAction: 'none' }}
                                      onPointerDown={(e) => beginTimelineDurationResize(e, r, slotW, totalRange, maxDurCap)}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <GripVertical className="w-4 h-5 text-white pointer-events-none drop-shadow-sm" aria-hidden />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                      {dayRes.length===0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                          <CalendarDays size={40} className="mb-3"/>
                          <p className="text-base">Geen reservaties op {formatDate(timelineDate)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* === KALENDER RECHTS — inklapbaar, groot === */}
              <div className={`flex-shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col transition-[width] duration-300 ease-in-out ${calOpen ? 'w-72' : 'w-12'}`}>
                {/* Header: inklapknop + jaar + vandaag */}
                <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 flex-shrink-0 bg-orange-500">
                  <button onClick={() => setCalOpen(o=>!o)}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white flex-shrink-0">
                    {calOpen ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
                  </button>
                  {calOpen && (<>
                    <button onClick={() => setCalMonth(m=>({year:m.year-1,month:m.month}))}
                      className="p-1.5 hover:bg-white/20 rounded-lg text-white"><ChevronLeft size={18}/></button>
                    <span className="flex-1 text-center text-lg font-black text-white">{calMonth.year}</span>
                    <button onClick={() => setCalMonth(m=>({year:m.year+1,month:m.month}))}
                      className="p-1.5 hover:bg-white/20 rounded-lg text-white"><ChevronRight size={18}/></button>
                    <button onClick={() => { setTimelineDate(todayStr); setCalMonth({year:timelineNow.getFullYear(),month:timelineNow.getMonth()}) }}
                      className="px-3 py-1 rounded-lg bg-white text-orange-500 text-sm font-black hover:bg-orange-50">
                      Vandaag
                    </button>
                  </>)}
                </div>
                {/* Alle 12 maanden scrollbaar — alleen zichtbaar als open */}
                {calOpen && (
                  <div className="overflow-y-auto flex-1">
                    {Array.from({length:12}).map((_,mi) => {
                      const mYear = calMonth.year
                      const mMonth = mi
                      const mFirst = new Date(mYear, mMonth, 1)
                      let mDow = mFirst.getDay(); if(mDow===0) mDow=7
                      const mDays = new Date(mYear, mMonth+1, 0).getDate()
                      const mPad = mDow - 1
                      const mName = mFirst.toLocaleDateString('nl-BE',{month:'long'})
                      return (
                        <div key={mMonth} className="px-3 pt-4 pb-3 border-b border-gray-50 last:border-0">
                          <p className="text-sm font-black text-gray-600 uppercase tracking-wide mb-2 capitalize">{mName}</p>
                          <div className="grid grid-cols-7 gap-0.5">
                            {['Ma','Di','Wo','Do','Vr','Za','Zo'].map((d,i)=>(
                              <div key={i} className="text-center text-xs text-gray-400 font-bold pb-1">{d}</div>
                            ))}
                            {Array.from({length:mPad}).map((_,i)=><div key={`p${i}`}/>)}
                            {Array.from({length:mDays}).map((_,di)=>{
                              const day = di+1
                              const dStr = `${mYear}-${String(mMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                              const isSel = dStr===timelineDate
                              const isTod = dStr===todayStr
                              const hasRes = reservations.some(r=>r.reservation_date===dStr&&r.status!=='CANCELLED')
                              return (
                                <button key={day} onClick={()=>{ setTimelineDate(dStr); setCalMonth({year:mYear,month:mMonth}) }}
                                  className={`relative aspect-square flex items-center justify-center text-sm font-bold rounded-full transition-colors
                                    ${isSel?'bg-orange-500 text-white':isTod?'bg-orange-100 text-orange-600':'hover:bg-gray-100 text-gray-700'}`}>
                                  {day}
                                  {hasRes&&!isSel&&<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500"/>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {!loading && viewMode === 'reservations' && (() => {
          // Alle zware berekeningen komen uit useMemo — worden enkel herberekend als afhankelijkheden wijzigen
          const { rows: filteredRes, grouped, from, to, today } = resViewFiltered
          const totalPersons = filteredRes.reduce((s, r) => s + r.party_size, 0)

          const MONTHS_NL = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']
          const MONTHS_SHORT = ['Jan','Feb','Mrt','Apr','Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec']
          const DAYS_FULL_NL = ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag']
          const DAYS_NL = ['Ma','Di','Wo','Do','Vr','Za','Zo']

          const dateHeader = (ds: string) => {
            if (resViewFilter === 'dag') return null
            const d = new Date(ds + 'T12:00:00')
            return `${DAYS_FULL_NL[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
          }

          const resDate = resListDate
          const q = resSearch.trim().toLowerCase()
          // Gebruik gecachte kalendermaanden en dagset uit useMemo
          const calMonths = resCalMonths

          const reservationRow = (r: typeof filteredRes[0], idx: number) => (
            <tr key={r.id} style={{ borderBottom: '1px solid #e5e7eb' }}
              onClick={() => setEditReservation(r)}
              className={`cursor-pointer transition-colors hover:bg-orange-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
              <td className="px-5 py-4 font-bold text-gray-800 text-base" style={{ borderRight: '1px solid #e5e7eb' }}>{r.reservation_time}</td>
              <td className="px-5 py-4 text-gray-600" style={{ borderRight: '1px solid #e5e7eb' }}>
                {r.table_number ? <span className="font-semibold">Tafel {r.table_number}</span> : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-5 py-4 text-center font-bold text-gray-800 text-lg" style={{ borderRight: '1px solid #e5e7eb' }}>{r.party_size}</td>
              <td className="px-5 py-4 font-semibold text-gray-800" style={{ borderRight: '1px solid #e5e7eb' }}>{r.guest_name}</td>
              <td className="px-5 py-4 text-gray-600" style={{ borderRight: '1px solid #e5e7eb' }}>
                {r.guest_phone ? <a href={`tel:${r.guest_phone}`} className="hover:underline">{r.guest_phone}</a> : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-5 py-4 text-gray-600" style={{ borderRight: '1px solid #e5e7eb' }}>
                {r.guest_email ? <a href={`mailto:${r.guest_email}`} className="hover:underline">{r.guest_email}</a> : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                <button onClick={() => setEditReservation(r)}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-semibold transition-colors">
                  ✏️ Bewerken
                </button>
              </td>
            </tr>
          )

          return (
            <div className="flex flex-col h-full -m-4 bg-white">
              {/* Toolbar rij 1: datum nav + filter knoppen + acties */}
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-200 flex-shrink-0">

                {/* Dag navigatie — alleen zichtbaar in dag-modus */}
                {resViewFilter === 'dag' && (
                  <>
                    <button onClick={() => { const d = new Date(resDate + 'T12:00:00'); d.setDate(d.getDate()-1); setResListDate(d.toISOString().split('T')[0]) }}
                      className="w-9 h-9 rounded-xl bg-orange-500 hover:bg-orange-600 flex items-center justify-center text-white flex-shrink-0">
                      <ChevronLeft size={18}/>
                    </button>
                    <span className="font-bold text-gray-800 text-sm min-w-[100px] text-center">{formatDate(resDate)}</span>
                    <button onClick={() => { const d = new Date(resDate + 'T12:00:00'); d.setDate(d.getDate()+1); setResListDate(d.toISOString().split('T')[0]) }}
                      className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0">
                      <ChevronRight size={18}/>
                    </button>
                  </>
                )}

                {/* Week navigatie */}
                {resViewFilter === 'week' && (
                  <>
                    <button onClick={() => { const d = new Date(resDate + 'T12:00:00'); d.setDate(d.getDate()-7); setResListDate(d.toISOString().split('T')[0]) }}
                      className="w-9 h-9 rounded-xl bg-orange-500 hover:bg-orange-600 flex items-center justify-center text-white flex-shrink-0">
                      <ChevronLeft size={18}/>
                    </button>
                    <span className="font-bold text-gray-800 text-sm min-w-[140px] text-center">{from} – {to}</span>
                    <button onClick={() => { const d = new Date(resDate + 'T12:00:00'); d.setDate(d.getDate()+7); setResListDate(d.toISOString().split('T')[0]) }}
                      className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0">
                      <ChevronRight size={18}/>
                    </button>
                  </>
                )}

                {/* Maand selector */}
                {resViewFilter === 'maand' && (
                  <div className="relative">
                    <button onClick={() => setShowMonthPicker(v => !v)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm">
                      <Calendar size={15}/>
                      {MONTHS_SHORT[resFilterMonth]} {resFilterYear}
                      <ChevronRight size={13} className={`transition-transform ${showMonthPicker ? 'rotate-90' : ''}`}/>
                    </button>
                    {showMonthPicker && (
                      <div className="absolute top-12 left-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 w-72">
                        {/* Jaar in picker */}
                        <div className="flex items-center justify-between mb-3">
                          <button onClick={() => setResFilterYear(y => y - 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600">
                            <ChevronLeft size={15}/>
                          </button>
                          <span className="font-bold text-gray-800">{resFilterYear}</span>
                          <button onClick={() => setResFilterYear(y => y + 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600">
                            <ChevronRight size={15}/>
                          </button>
                        </div>
                        {/* 12 maanden grid */}
                        <div className="grid grid-cols-3 gap-2">
                          {MONTHS_SHORT.map((mn, mi) => (
                            <button key={mi}
                              onClick={() => { setResFilterMonth(mi); setShowMonthPicker(false) }}
                              className={`py-2 rounded-xl text-sm font-semibold transition-colors
                                ${resFilterMonth === mi ? 'bg-orange-500 text-white' : 'bg-gray-100 hover:bg-orange-100 text-gray-700'}`}>
                              {mn}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Jaar selector */}
                {resViewFilter === 'jaar' && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setResFilterYear(y => y - 1)}
                      className="w-9 h-9 rounded-xl bg-orange-500 hover:bg-orange-600 flex items-center justify-center text-white">
                      <ChevronLeft size={18}/>
                    </button>
                    <span className="font-bold text-gray-800 text-base px-2">{resFilterYear}</span>
                    <button onClick={() => setResFilterYear(y => y + 1)}
                      className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
                      <ChevronRight size={18}/>
                    </button>
                  </div>
                )}

                {/* Filter knoppen: Dag / Week / Maand / Jaar */}
                <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                  {(['dag','week','maand','jaar'] as const).map(f => (
                    <button key={f}
                      onClick={() => { setResViewFilter(f); setShowMonthPicker(false); if (f === 'maand') { setResFilterMonth(new Date().getMonth()); setResFilterYear(new Date().getFullYear()) } if (f === 'jaar') setResFilterYear(new Date().getFullYear()) }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors
                        ${resViewFilter === f ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="ml-auto flex gap-2">
                  <button onClick={() => { setShowResCalendar(v => !v); setShowResSearch(false) }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors
                      ${showResCalendar ? 'bg-orange-600 text-white ring-2 ring-orange-300' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}>
                    <Calendar size={15}/> Kalender {showResCalendar ? <Eye size={13}/> : <EyeOff size={13}/>}
                  </button>
                  <button onClick={() => { setShowResSearch(v => !v); if (showResSearch) setResSearch('') }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors
                      ${showResSearch ? 'bg-gray-700 text-white ring-2 ring-gray-400' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}>
                    <Search size={15}/> Zoek reserv.
                  </button>
                </div>
              </div>

              {/* Zoekbalk */}
              {showResSearch && (
                <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0 bg-gray-50">
                  <input autoFocus type="text" placeholder="Zoek op naam, telefoon of e-mail…"
                    value={resSearch} onChange={e => setResSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"/>
                </div>
              )}

              {/* Samenvatting vak */}
              <div className="flex items-stretch gap-0 border-b border-gray-200 flex-shrink-0 bg-gray-50 divide-x divide-gray-200">
                <div className="flex flex-col items-center justify-center px-8 py-3">
                  <span className="text-2xl font-black text-gray-800">{filteredRes.length}</span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                    Reservering{filteredRes.length !== 1 ? 'en' : ''}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center px-8 py-3">
                  <span className="text-2xl font-black text-orange-500">{totalPersons}</span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Personen</span>
                </div>
                {resViewFilter !== 'dag' && (
                  <div className="flex flex-col items-center justify-center px-8 py-3">
                    <span className="text-2xl font-black text-gray-800">
                      {grouped.length}
                    </span>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                      {resViewFilter === 'week' ? 'Dagen' : resViewFilter === 'maand' ? 'Dagen' : 'Maanden'}
                    </span>
                  </div>
                )}
                {resViewFilter !== 'dag' && filteredRes.length > 0 && (
                  <div className="flex flex-col items-center justify-center px-8 py-3">
                    <span className="text-2xl font-black text-gray-800">
                      {Math.round(totalPersons / filteredRes.length * 10) / 10}
                    </span>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Gem. groep</span>
                  </div>
                )}
                <div className="flex-1"/>
                <div className="flex flex-col items-center justify-center px-6 py-3">
                  <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">
                    {resViewFilter === 'dag' && formatDate(resDate)}
                    {resViewFilter === 'week' && `${from} – ${to}`}
                    {resViewFilter === 'maand' && `${MONTHS_NL[resFilterMonth].charAt(0).toUpperCase() + MONTHS_NL[resFilterMonth].slice(1)} ${resFilterYear}`}
                    {resViewFilter === 'jaar' && `Jaar ${resFilterYear}`}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Periode</span>
                </div>
              </div>

              {/* Goedkeuren banner — PENDING reservaties */}
              {(() => {
                const pending = reservations.filter(r => r.status === 'PENDING')
                if (pending.length === 0) return null
                return (
                  <div className="flex-shrink-0 bg-red-600 border-b-4 border-red-800 px-4 py-3 animate-pulse">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white font-black text-sm tracking-wide">🔴 {pending.length} NIEUWE RESERVATIE{pending.length > 1 ? 'S' : ''} — WACHT OP GOEDKEURING</span>
                    </div>
                    <div className="space-y-2">
                      {pending.slice(0, 3).map(r => (
                        <div key={r.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border-2 border-red-300 shadow-md">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 animate-ping"/>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-gray-800 truncate">{r.guest_name}</p>
                              <p className="text-xs text-gray-500">{r.reservation_date} · {r.reservation_time} · {r.party_size}p</p>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0 ml-3">
                            <button onClick={() => handleReject(r)}
                              className="px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 transition-colors">
                              Weigeren
                            </button>
                            <button onClick={() => handleConfirm(r)}
                              className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-colors">
                              ✓ Goedkeuren
                            </button>
                          </div>
                        </div>
                      ))}
                      {pending.length > 3 && <p className="text-xs text-amber-600 text-center">+{pending.length - 3} meer...</p>}
                    </div>
                  </div>
                )
              })()}

              {/* Body: lijst + kalender sidebar */}
              <div className="relative flex flex-1 overflow-hidden" onClick={() => showMonthPicker && setShowMonthPicker(false)}>
                {/* Lijst */}
                <div className="flex-1 overflow-auto">
                  {filteredRes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 py-16">
                      <List size={40} className="text-gray-300"/>
                      <p className="font-medium">{q ? `Geen resultaten voor "${resSearch}"` : `Geen reserveringen gevonden`}</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                          <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Tijd</th>
                          <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Tafel</th>
                          <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Personen</th>
                          <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Naam</th>
                          <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Telefoon</th>
                          <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">E-mail</th>
                          <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {grouped.map(({ date, rows }) => (
                          <>
                            {dateHeader(date) && (
                              <tr key={`hdr-${date}`}>
                                <td colSpan={7} className="px-5 py-2 bg-orange-50 border-b border-orange-100">
                                  <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">{dateHeader(date)}</span>
                                  <span className="ml-2 text-xs text-orange-400">{rows.length} reserv. · {rows.reduce((s,r) => s+r.party_size,0)} pers.</span>
                                </td>
                              </tr>
                            )}
                            {rows.map((r, idx) => reservationRow(r, idx))}
                          </>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Wachtlijst sectie — alleen bij dag-filter */}
                {(() => {
                  const wl = reservations.filter(r => r.status === 'WAITLIST' && r.reservation_date === resListDate)
                    .sort((a, b) => (a.waitlist_position || 0) - (b.waitlist_position || 0))
                  if (resViewFilter !== 'dag' || wl.length === 0) return null
                  return (
                    <div className="flex-shrink-0 border-t-2 border-purple-200 bg-purple-50">
                      <div className="px-5 py-2 flex items-center gap-2">
                        <Clock size={14} className="text-purple-600"/>
                        <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Wachtlijst</span>
                        <span className="text-xs text-purple-500">{wl.length} wachtend · {wl.reduce((s,r)=>s+r.party_size,0)} pers.</span>
                      </div>
                      <table className="w-full text-sm" style={{borderCollapse:'collapse'}}>
                        <tbody>
                          {wl.map((r, idx) => (
                            <tr key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-purple-50/50'} style={{borderBottom:'1px solid #e9d5ff'}}>
                              <td className="px-5 py-3 font-medium text-purple-700">#{r.waitlist_position || idx+1}</td>
                              <td className="px-5 py-3">{r.reservation_time}</td>
                              <td className="px-5 py-3 text-center font-bold">{r.party_size}</td>
                              <td className="px-5 py-3 font-semibold">{r.guest_name}</td>
                              <td className="px-5 py-3 text-gray-500">{r.guest_phone}</td>
                              <td className="px-5 py-3 text-gray-500">{r.guest_email}</td>
                              <td className="px-5 py-3 text-right">
                                <button onClick={() => updateStatus(r.id, 'CONFIRMED')}
                                  className="px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition-colors">
                                  Bevestigen
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}

                {/* Kalender sidebar */}
                {showResCalendar && (
                  <div className="absolute inset-0 z-20 bg-white overflow-y-auto md:relative md:inset-auto md:z-auto md:w-[270px] md:flex-shrink-0 md:border-l md:border-gray-200">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <button onClick={() => setResCalYear(y => y - 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
                        <ChevronLeft size={14}/>
                      </button>
                      <span className="font-bold text-gray-800 text-sm">{resCalYear}</span>
                      <button onClick={() => setResCalYear(y => y + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
                        <ChevronRight size={14}/>
                      </button>
                      <button onClick={() => { setResListDate(today); setShowResCalendar(false) }}
                        className="ml-2 px-3 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold">
                        Vandaag
                      </button>
                      <button onClick={() => setShowResCalendar(false)}
                        className="ml-1 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 md:hidden">
                        <X size={14}/>
                      </button>
                    </div>
                    <div className="px-3 py-2 space-y-4">
                      {calMonths.map(({ y, m, cells }) => (
                        <div key={`${y}-${m}`}>
                          <div className="text-xs font-bold text-gray-700 mb-1 px-1">{MONTHS_NL[m].charAt(0).toUpperCase() + MONTHS_NL[m].slice(1)}</div>
                          <div className="grid grid-cols-7 text-center mb-1">
                            {DAYS_NL.map(d => <div key={d} className="text-[10px] text-gray-400 font-semibold py-0.5">{d}</div>)}
                          </div>
                          <div className="grid grid-cols-7 text-center gap-y-0.5">
                            {cells.map((day, i) => {
                              if (!day) return <div key={i}/>
                              const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                              const isSel = ds === resDate
                              const isTod = ds === today
                              const hasDot = daysWithRes.has(ds)
                              return (
                                <button key={i}
                                  onClick={() => { setResListDate(ds); setResViewFilter('dag'); setShowResCalendar(false) }}
                                  className={`w-7 h-7 mx-auto rounded-full text-xs font-medium flex items-center justify-center transition-colors relative
                                    ${isSel ? 'bg-orange-500 text-white' : isTod ? 'border border-orange-400 text-orange-600 font-bold' : 'text-gray-700 hover:bg-orange-50'}`}>
                                  {day}
                                  {hasDot && !isSel && (
                                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-400"/>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {!loading && viewMode === 'guests' && (
          <ContactsView
            guestProfiles={guestProfiles}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        {!loading && viewMode === 'stats' && (
          <RapportenView reservations={reservations} guestProfiles={guestProfiles} />
        )}

        {!loading && viewMode === 'settings' && (
          <div className="max-w-2xl overflow-y-auto h-full pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Reservatie Instellingen</h3>
              <button
                onClick={saveSettingsToSupabase}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow transition-colors"
              >
                💾 Opslaan
              </button>
            </div>
            <h3 className="text-lg font-bold mb-4 hidden">Reservatie Instellingen</h3>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Reservaties ingeschakeld</p>
                  <p className="text-sm text-gray-400">Toon reservaties in de kassa</p>
                </div>
                <button
                  onClick={() => updateSettings({ isEnabled: !isEnabled })}
                  className={`w-14 h-7 rounded-full transition-colors ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Online reservations */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Online reservaties</p>
                  <p className="text-sm text-gray-400">Laat klanten online reserveren</p>
                </div>
                <button
                  onClick={() => updateSettings({ acceptOnline: !reservationSettings.acceptOnline })}
                  className={`w-14 h-7 rounded-full transition-colors ${reservationSettings.acceptOnline ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${reservationSettings.acceptOnline ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Bevestigingsmodus */}
              {reservationSettings.acceptOnline && (
                <div>
                  <p className="font-medium mb-1">Bevestigingsmodus online reservaties</p>
                  <p className="text-sm text-gray-400 mb-3">Hoe worden online reservaties verwerkt?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => updateSettings({ autoConfirm: false })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${!reservationSettings.autoConfirm ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="text-2xl mb-2">✋</div>
                      <p className={`font-bold text-sm ${!reservationSettings.autoConfirm ? 'text-orange-700' : 'text-gray-700'}`}>Handmatig</p>
                      <p className="text-xs text-gray-500 mt-1">Klant krijgt mail "in afwachting". Jij keurt goed in de kassa → klant krijgt bevestigingsmail.</p>
                      {!reservationSettings.autoConfirm && <span className="mt-2 inline-block text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Actief</span>}
                    </button>
                    <button
                      onClick={() => updateSettings({ autoConfirm: true })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${reservationSettings.autoConfirm ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="text-2xl mb-2">⚡</div>
                      <p className={`font-bold text-sm ${reservationSettings.autoConfirm ? 'text-green-700' : 'text-gray-700'}`}>Automatisch</p>
                      <p className="text-xs text-gray-500 mt-1">Klant reserveert → direct bevestigd → klant krijgt meteen bevestigingsmail.</p>
                      {reservationSettings.autoConfirm && <span className="mt-2 inline-block text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Actief</span>}
                    </button>
                  </div>
                </div>
              )}

              {/* Max party size */}
              <div>
                <label className="font-medium block mb-2">Max. groepsgrootte</label>
                <input
                  type="number"
                  value={reservationSettings.maxPartySize}
                  onChange={(e) => updateSettings({ maxPartySize: parseInt(e.target.value) || 12 })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                />
              </div>

              {/* Default duration */}
              <div>
                <label className="font-medium block mb-2">Standaard reservatieduur (minuten)</label>
                <input
                  type="number"
                  value={reservationSettings.defaultDurationMinutes}
                  onChange={(e) => updateSettings({ defaultDurationMinutes: parseInt(e.target.value) || 90 })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                />
              </div>

              {/* Slot duration */}
              <div>
                <label className="font-medium block mb-2">Tijdslot interval (minuten)</label>
                <select
                  value={reservationSettings.slotDurationMinutes}
                  onChange={(e) => updateSettings({ slotDurationMinutes: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                >
                  <option value={15}>Elke 15 minuten</option>
                  <option value={30}>Elke 30 minuten</option>
                  <option value={60}>Elk uur</option>
                </select>
              </div>

              {/* Booking window */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium block mb-2">Min. vooraf (uren)</label>
                  <input
                    type="number"
                    min="0"
                    value={reservationSettings.minAdvanceHours}
                    onChange={(e) => updateSettings({ minAdvanceHours: parseInt(e.target.value) || 2 })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-2">Max. vooraf (dagen)</label>
                  <input
                    type="number"
                    min="1"
                    value={reservationSettings.maxAdvanceDays}
                    onChange={(e) => updateSettings({ maxAdvanceDays: parseInt(e.target.value) || 60 })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                  />
                </div>
              </div>

              {/* Closed days */}
              <div className="border-t border-gray-100 pt-6">
                <label className="font-medium block mb-2">Gesloten dagen</label>
                <p className="text-sm text-gray-400 mb-4">Dagen waarop geen reservaties mogelijk zijn</p>
                <div className="flex flex-wrap gap-2">
                  {['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'].map((day, index) => {
                    const isClosed = reservationSettings.closedDays?.includes(index)
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          const currentDays = reservationSettings.closedDays || []
                          const newDays = isClosed
                            ? currentDays.filter(d => d !== index)
                            : [...currentDays, index]
                          updateSettings({ closedDays: newDays })
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          isClosed
                            ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                            : 'bg-gray-100 border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* z2 - Shifts beheer */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-bold mb-4">🍽️ Shifts Beheer</h4>
                <p className="text-sm text-gray-400 mb-4">Definieer lunch en diner shifts om reservaties te filteren.</p>
                <div className="space-y-3">
                  {(reservationSettings.shifts || []).map((shift, idx) => (
                    <div key={shift.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <button
                        onClick={() => {
                          const newShifts = [...(reservationSettings.shifts || [])]
                          newShifts[idx] = { ...shift, isActive: !shift.isActive }
                          updateSettings({ shifts: newShifts })
                        }}
                        className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${shift.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-auto ${shift.isActive ? 'translate-x-2' : '-translate-x-2'}`} />
                      </button>
                      <input
                        type="text"
                        value={shift.name}
                        onChange={(e) => {
                          const newShifts = [...(reservationSettings.shifts || [])]
                          newShifts[idx] = { ...shift, name: e.target.value }
                          updateSettings({ shifts: newShifts })
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
                      />
                      <input type="time" value={shift.startTime}
                        onChange={(e) => {
                          const newShifts = [...(reservationSettings.shifts || [])]
                          newShifts[idx] = { ...shift, startTime: e.target.value }
                          updateSettings({ shifts: newShifts })
                        }}
                        className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                      />
                      <span className="text-gray-400 text-sm">→</span>
                      <input type="time" value={shift.endTime}
                        onChange={(e) => {
                          const newShifts = [...(reservationSettings.shifts || [])]
                          newShifts[idx] = { ...shift, endTime: e.target.value }
                          updateSettings({ shifts: newShifts })
                        }}
                        className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* z4 - Annuleringsbeleid */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-bold mb-4">❌ Annuleringsbeleid</h4>
                <div className="space-y-4">
                  <div>
                    <label className="font-medium block mb-2">Annulering mogelijk tot (uren voor reservatie)</label>
                    <p className="text-sm text-gray-400 mb-2">0 = altijd mogelijk, 24 = tot 24u van tevoren</p>
                    <input type="number" min="0"
                      value={reservationSettings.cancellationDeadlineHours}
                      onChange={(e) => updateSettings({ cancellationDeadlineHours: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="font-medium block mb-2">Boodschap bij te late annulering</label>
                    <textarea
                      value={reservationSettings.cancellationMessage}
                      onChange={(e) => updateSettings({ cancellationMessage: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* z5 - Review uitnodiging */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-bold mb-4">⭐ Review Uitnodiging</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Automatisch review email sturen</p>
                      <p className="text-sm text-gray-400">Bij afronden van reservatie</p>
                    </div>
                    <button
                      onClick={() => updateSettings({ autoSendReview: !reservationSettings.autoSendReview })}
                      className={`w-14 h-7 rounded-full transition-colors ${reservationSettings.autoSendReview ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${reservationSettings.autoSendReview ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div>
                    <label className="font-medium block mb-2">Review link (Google Maps / TripAdvisor)</label>
                    <input type="url"
                      value={reservationSettings.reviewLink}
                      onChange={(e) => updateSettings({ reviewLink: e.target.value })}
                      placeholder="https://g.page/jouwzaak/review"
                      className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                    />
                  </div>
                </div>
              </div>

              {/* z8 - Borg/aanbetaling */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-bold mb-4">💳 Voorschot bij online reservatie</h4>
                <div className="space-y-5">

                  {/* Aan/uit toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <div>
                      <p className="font-semibold text-gray-800">Voorschot verplichten</p>
                      <p className="text-sm text-gray-400">Klant betaalt voorschot via Stripe vóór de reservatie bevestigd wordt</p>
                    </div>
                    <button
                      onClick={() => updateSettings({ depositRequired: !reservationSettings.depositRequired })}
                      className={`relative w-16 h-8 rounded-full transition-colors flex-shrink-0 ml-4 ${reservationSettings.depositRequired ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${reservationSettings.depositRequired ? 'translate-x-9' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Bedrag kiezen — alleen zichtbaar als aan */}
                  {reservationSettings.depositRequired && (
                    <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
                      <p className="font-semibold text-gray-800 mb-3">Kies het voorschotbedrag</p>
                      <div className="grid grid-cols-5 gap-2">
                        {[25, 50, 75, 100, 150].map(amount => (
                          <button
                            key={amount}
                            onClick={() => updateSettings({ depositAmount: amount })}
                            className={`py-3 rounded-xl font-bold text-sm transition-colors ${
                              reservationSettings.depositAmount === amount
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'bg-white text-gray-700 border border-gray-200 hover:border-orange-300 hover:text-orange-600'
                            }`}
                          >
                            €{amount}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-sm text-gray-500">Of vrij bedrag:</span>
                        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                          <span className="text-gray-500 font-medium">€</span>
                          <input type="number" min="1" step="5"
                            value={reservationSettings.depositAmount}
                            onChange={(e) => updateSettings({ depositAmount: parseFloat(e.target.value) || 0 })}
                            className="w-16 outline-none text-sm font-bold text-gray-800"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-orange-700 mt-3 bg-orange-100 rounded-lg px-3 py-2">
                        ✅ Klant wordt na invullen doorgestuurd naar <strong>Stripe betaalpagina</strong> voor €{reservationSettings.depositAmount}. Na betaling wordt de reservatie bevestigd.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* z9 - No-show bescherming */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-bold mb-4">🛡️ No-show Bescherming</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Creditcard registreren bij reservatie</p>
                      <p className="text-sm text-gray-400">Kaart wordt bewaard, pas belast bij no-show</p>
                    </div>
                    <button
                      onClick={() => updateSettings({ noShowProtection: !reservationSettings.noShowProtection })}
                      className={`w-14 h-7 rounded-full transition-colors ${reservationSettings.noShowProtection ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${reservationSettings.noShowProtection ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {reservationSettings.noShowProtection && (
                    <div>
                      <label className="font-medium block mb-2">No-show kost (€)</label>
                      <input type="number" min="0" step="5"
                        value={reservationSettings.noShowFee}
                        onChange={(e) => updateSettings({ noShowFee: parseFloat(e.target.value) || 25 })}
                        className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* z7 - Online booking widget */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-bold mb-4">🌐 Online Booking Widget</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Online reserveren inschakelen</p>
                      <p className="text-sm text-gray-400">Klanten kunnen online reserveren</p>
                    </div>
                    <button
                      onClick={() => updateSettings({ bookingPageEnabled: !reservationSettings.bookingPageEnabled })}
                      className={`w-14 h-7 rounded-full transition-colors ${reservationSettings.bookingPageEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${reservationSettings.bookingPageEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-blue-700 mb-1">📎 Booking link voor klanten:</p>
                    <p className="text-xs text-blue-600 font-mono break-all">
                      {typeof window !== 'undefined' ? `${window.location.origin}/shop/${tenant}/reserveren` : `/shop/${tenant}/reserveren`}
                    </p>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/shop/${tenant}/reserveren`
                        navigator.clipboard?.writeText(url)
                        toast.success('Link gekopieerd!')
                      }}
                      className="mt-2 px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Kopieer link
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Opslaan knop onderaan */}
            <button
              onClick={saveSettingsToSupabase}
              className="w-full mt-4 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-xl shadow-md transition-colors"
            >
              💾 Instellingen Opslaan
            </button>
          </div>
        )}
      </div>

      {/* z4 - Annulering deadline modal */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">⚠️ Annulering na deadline</h3>
            <p className="text-gray-600 text-sm mb-4">{reservationSettings.cancellationMessage}</p>
            <p className="text-gray-500 text-sm mb-6">Wilt u toch annuleren?</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelConfirm(null)} className="flex-1 py-3 rounded-xl bg-gray-100 font-medium">Nee, terug</button>
              <button onClick={() => doCancelReservation(cancelConfirm)} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium">Ja, annuleren</button>
            </div>
          </div>
        </div>
      )}

      {/* New Reservation Modal */}
      {showNewReservationModal && (
        <NewReservationModal
          onClose={() => setShowNewReservationModal(false)}
          onSave={handleAddReservation}
          tables={
            // Gebruik floor plan tafels zodat nummers matchen; fallback op kassaTables
            floorPlanTablesDB.length > 0
              ? floorPlanTablesDB.map(t => ({ id: t.id, number: t.number, seats: t.seats, status: 'available' }))
              : kassaTables
          }
          defaultDurationMinutes={reservationSettings.defaultDurationMinutes}
          maxPartySize={reservationSettings.maxPartySize}
          reservations={reservations}
          shifts={reservationSettings.shifts || []}
          bufferMinutes={reservationSettings.bufferMinutes || 0}
        />
      )}

      {/* Walk-in Modal */}
      {showWalkInModal && (
        <WalkInModal
          onClose={() => setShowWalkInModal(false)}
          onSave={handleWalkIn}
          tables={floorPlanTablesDB.length > 0
            ? floorPlanTablesDB.map(t => ({ id: t.id, number: t.number, seats: t.seats, status: 'available' }))
            : kassaTables}
          reservations={reservations}
        />
      )}

      {/* Wachtlijst Modal */}
      {showWaitlistModal && (
        <WaitlistModal
          onClose={() => setShowWaitlistModal(false)}
          onSave={handleAddToWaitlist}
        />
      )}

      {/* Reservation Detail Modal */}
      {selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onCheckIn={async () => { await handleCheckIn(selectedReservation); setSelectedReservation(null) }}
          onNoShow={async () => { await handleNoShow(selectedReservation); setSelectedReservation(null) }}
          onCancel={async () => { await handleCancel(selectedReservation); setSelectedReservation(null) }}
          onComplete={async () => { await handleComplete(selectedReservation); setSelectedReservation(null) }}
          onConfirm={async () => { await handleConfirm(selectedReservation); setSelectedReservation(null) }}
          onAssignTable={async (tableNumber) => { await handleAssignTable(selectedReservation.id, tableNumber); setSelectedReservation(null) }}
          onDelete={async () => { await handleDeleteReservation(selectedReservation.id); setSelectedReservation(null) }}
          onStartOrder={() => { handleStartOrder(selectedReservation); setSelectedReservation(null) }}
          onEdit={() => { setEditReservation(selectedReservation); setSelectedReservation(null) }}
          tables={
            floorPlanTablesDB.length > 0
              ? floorPlanTablesDB.map(t => ({ id: t.id, number: t.number, seats: t.seats, status: 'available' }))
              : kassaTables
          }
          guestProfile={guestProfiles.find(g => g.id === (selectedReservation.guest_phone || selectedReservation.guest_email || selectedReservation.guest_name))}
        />
      )}

      {/* ======== ZOEK POPUP ======== */}
      {showSearchPopup && (() => {
        const q = searchPopupQuery.toLowerCase().trim()
        const todayISO = new Date().toISOString().split('T')[0]
        const base = searchPopupTab === 'dag'
          ? reservations.filter(r => r.reservation_date === timelineDate && r.status !== 'CANCELLED')
          : reservations.filter(r => r.reservation_date >= todayISO && r.status !== 'CANCELLED')
        const results = q
          ? base.filter(r =>
              r.guest_name?.toLowerCase().includes(q) ||
              r.guest_email?.toLowerCase().includes(q) ||
              r.guest_phone?.toLowerCase().includes(q) ||
              String(r.table_number).includes(q)
            )
          : base.slice(0, 30)

        // Groepeer per datum
        const grouped: Record<string, Reservation[]> = {}
        results.forEach(r => {
          if (!grouped[r.reservation_date]) grouped[r.reservation_date] = []
          grouped[r.reservation_date].push(r)
        })
        const sortedDates = Object.keys(grouped).sort()

        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setShowSearchPopup(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
              style={{ maxHeight: '75vh' }}
              onClick={e => e.stopPropagation()}>
              {/* Zoekbalk */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Zoeken</p>
                <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-4 py-2">
                  <Search size={20} className="text-gray-400 flex-shrink-0"/>
                  <input autoFocus type="text" value={searchPopupQuery}
                    onChange={e => setSearchPopupQuery(e.target.value)}
                    placeholder="Naam, telefoon, email, tafel..."
                    className="flex-1 bg-transparent outline-none text-base text-gray-800 placeholder-gray-400"/>
                  {searchPopupQuery && (
                    <button onClick={() => setSearchPopupQuery('')} className="text-gray-400 hover:text-gray-600">
                      <X size={16}/>
                    </button>
                  )}
                </div>
              </div>
              {/* Tabs */}
              <div className="flex border-b border-gray-100">
                <button onClick={() => setSearchPopupTab('dag')}
                  className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${searchPopupTab==='dag'?'text-blue-600 border-b-2 border-blue-600':'text-gray-400 hover:text-gray-600'}`}>
                  DEZE DAG
                </button>
                <button onClick={() => setSearchPopupTab('alle')}
                  className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${searchPopupTab==='alle'?'text-blue-600 border-b-2 border-blue-600':'text-gray-400 hover:text-gray-600'}`}>
                  ALLE DAGEN
                </button>
              </div>
              {/* Resultaten */}
              <div className="overflow-y-auto flex-1">
                {sortedDates.length === 0 && (
                  <div className="py-12 text-center text-gray-400 text-sm">Geen reservaties gevonden</div>
                )}
                {sortedDates.map(date => (
                  <div key={date}>
                    <p className="px-4 py-2 text-sm font-black text-gray-700 bg-gray-50 border-b border-gray-100">
                      {new Date(date+'T12:00').toLocaleDateString('nl-BE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                    </p>
                    {grouped[date].sort((a,b)=>a.reservation_time.localeCompare(b.reservation_time)).map(r => (
                      <button key={r.id} onClick={() => { setEditReservation(r); setShowSearchPopup(false) }}
                        className="w-full px-4 py-3 border-b border-gray-50 hover:bg-blue-50 transition-colors text-left flex items-center gap-4">
                        <div className="flex-shrink-0 text-center">
                          <p className="text-base font-black text-gray-800">{r.reservation_time}</p>
                          <p className="text-xs text-gray-400">{r.party_size}p.</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 truncate">{r.guest_name}</p>
                          <p className="text-xs text-gray-400">{r.guest_phone || r.guest_email || ''}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-gray-500">Tafel {r.table_number || '?'}</p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            r.status==='CONFIRMED'?'bg-green-100 text-green-700':
                            r.status==='PENDING'?'bg-yellow-100 text-yellow-700':
                            r.status==='CHECKED_IN'?'bg-blue-100 text-blue-700':
                            'bg-gray-100 text-gray-500'}`}>
                            {r.status==='CONFIRMED'?'Bevestigd':r.status==='PENDING'?'Verwacht':r.status==='CHECKED_IN'?'Aanwezig':'Onbekend'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ======== EDIT RESERVATIE MODAL ======== */}
      {editReservation && (
        <EditReservationModal
          reservation={editReservation}
          tables={floorPlanTablesDB.length > 0
            ? floorPlanTablesDB.map(t => ({ id: t.id, number: t.number, seats: t.seats, status: 'available' }))
            : kassaTables}
          reservations={reservations}
          shifts={reservationSettings.shifts || []}
          bufferMinutes={reservationSettings.bufferMinutes || 0}
          onClose={() => setEditReservation(null)}
          onSave={async (updated) => {
            const { error } = await supabase.from('reservations').update({
              customer_name: updated.guest_name,
              customer_phone: updated.guest_phone || null,
              customer_email: updated.guest_email || null,
              reservation_date: updated.reservation_date,
              reservation_time: updated.reservation_time,
              party_size: updated.party_size,
              duration_minutes: updated.duration_minutes,
              table_number: updated.table_number || null,
              status: updated.status?.toLowerCase(),
              special_requests: updated.special_requests || '',
            }).eq('id', updated.id).eq('tenant_slug', tenant)
            if (error) { toast.error('Opslaan mislukt: ' + error.message); return }
            await loadReservations()
            setEditReservation(null)
            toast.success('Reservatie opgeslagen')
          }}
          onCancel={async () => {
            const { error } = await supabase.from('reservations')
              .update({ status: 'cancelled' }).eq('id', editReservation.id).eq('tenant_slug', tenant)
            if (error) { toast.error('Annuleren mislukt: ' + error.message); return }
            await loadReservations()
            setEditReservation(null)
            toast.success('Reservatie geannuleerd')
          }}
        />
      )}
    </div>
  )
}

// ============================================================
// EDIT RESERVATIE MODAL
// ============================================================
interface EditReservationModalProps {
  reservation: Reservation
  tables: KassaTable[]
  reservations: Reservation[]
  shifts: Shift[]
  bufferMinutes: number
  onClose: () => void
  onSave: (updated: Reservation) => Promise<void>
  onCancel: () => Promise<void>
}

function EditReservationModal({ reservation, tables, reservations, shifts, bufferMinutes, onClose, onSave, onCancel }: EditReservationModalProps) {
  const [form, setForm] = useState({
    guest_name: reservation.guest_name || '',
    guest_phone: reservation.guest_phone || '',
    guest_email: reservation.guest_email || '',
    reservation_date: reservation.reservation_date,
    reservation_time: reservation.reservation_time,
    party_size: reservation.party_size,
    duration_minutes: reservation.duration_minutes || 90,
    table_number: String(reservation.table_number || ''),
    special_requests: reservation.special_requests || '',
    status: reservation.status,
  })
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [validationError, setValidationError] = useState('')

  const timeSlots: string[] = []
  for (let h = 10; h <= 23; h++) {
    timeSlots.push(`${String(h).padStart(2,'0')}:00`)
    if (h < 23) timeSlots.push(`${String(h).padStart(2,'0')}:30`)
  }

  // Shift-validatie
  const activeShifts = shifts.filter(s => s.isActive)
  const isOutsideShifts = activeShifts.length > 0
    ? !activeShifts.some(s => form.reservation_time >= s.startTime && form.reservation_time <= s.endTime)
    : false

  // Overlap-check (excl. eigen reservatie, incl. buffer)
  const hasConflict = (() => {
    if (!form.table_number || !form.reservation_date || !form.reservation_time) return false
    const startMin = parseInt(form.reservation_time.split(':')[0]) * 60 + parseInt(form.reservation_time.split(':')[1])
    const endMin = startMin + (form.duration_minutes || 90) + (bufferMinutes || 0)
    return reservations.some(r => {
      if (r.id === reservation.id) return false
      if (r.status === 'CANCELLED') return false
      if (String(r.table_number) !== form.table_number) return false
      if (r.reservation_date !== form.reservation_date) return false
      const rStart = parseInt(r.reservation_time.split(':')[0]) * 60 + parseInt(r.reservation_time.split(':')[1])
      const rEnd = rStart + (r.duration_minutes || 90)
      return startMin < rEnd && endMin > rStart
    })
  })()

  const handleSave = async () => {
    setValidationError('')
    if (!form.guest_name.trim()) { setValidationError('Naam is verplicht'); return }
    if (isOutsideShifts) { setValidationError(`Gekozen tijd valt buiten de openingstijden (${activeShifts.map(s=>`${s.name} ${s.startTime}–${s.endTime}`).join(', ')})`); return }
    if (hasConflict) { setValidationError('Tafel is al bezet op dit tijdstip — kies een andere tafel of tijd'); return }
    setSaving(true)
    await onSave({ ...reservation, ...form, table_number: form.table_number || reservation.table_number })
    setSaving(false)
  }

  const handleCancel = async () => {
    setCancelling(true)
    await onCancel()
    setCancelling(false)
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 focus:border-blue-500 outline-none text-base'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background:'rgba(0,0,0,0.5)' }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight:'92vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-gray-800">Reservatie bewerken</h2>
            <p className="text-sm text-gray-500">{reservation.guest_name} · {reservation.reservation_date} {reservation.reservation_time}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg"><X size={20}/></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">

          {/* Naam */}
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Naam gast <span className="text-red-500">*</span></label>
            <input type="text" value={form.guest_name}
              onChange={e => setForm({...form, guest_name: e.target.value})}
              className={inputCls} placeholder="Voor- en achternaam"/>
          </div>

          {/* Telefoon & Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Telefoon</label>
              <input type="tel" value={form.guest_phone}
                onChange={e => setForm({...form, guest_phone: e.target.value})}
                className={inputCls} placeholder="0472..."/>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Email</label>
              <input type="email" value={form.guest_email}
                onChange={e => setForm({...form, guest_email: e.target.value})}
                className={inputCls} placeholder="naam@mail.com"/>
            </div>
          </div>

          {/* Datum & Tijd */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Datum</label>
              <input type="date" value={form.reservation_date}
                onChange={e => setForm({...form, reservation_date: e.target.value})}
                className={inputCls}/>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Tijd</label>
              <select value={form.reservation_time}
                onChange={e => setForm({...form, reservation_time: e.target.value})}
                className={`${inputCls} ${isOutsideShifts ? 'border-red-400 bg-red-50' : ''}`}>
                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {isOutsideShifts && <p className="text-red-500 text-xs mt-1">⚠️ Buiten openingstijden</p>}
            </div>
          </div>

          {/* Personen & Duur */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Personen</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 border border-gray-200">
                <button type="button" onClick={() => setForm({...form, party_size: Math.max(1, form.party_size-1)})}
                  className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xl font-bold">-</button>
                <span className="flex-1 text-center text-2xl font-bold">{form.party_size}</span>
                <button type="button" onClick={() => setForm({...form, party_size: form.party_size+1})}
                  className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xl font-bold">+</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Duur</label>
              <select value={form.duration_minutes}
                onChange={e => setForm({...form, duration_minutes: parseInt(e.target.value)})}
                className={inputCls}>
                <option value={60}>1 uur</option>
                <option value={90}>1,5 uur</option>
                <option value={120}>2 uur</option>
                <option value={150}>2,5 uur</option>
                <option value={180}>3 uur</option>
                <option value={240}>4 uur</option>
              </select>
            </div>
          </div>

          {/* Tafel */}
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Tafel</label>
            <select value={form.table_number}
              onChange={e => setForm({...form, table_number: e.target.value})}
              className={`${inputCls} ${hasConflict ? 'border-red-400 bg-red-50' : ''}`}>
              <option value="">— Geen voorkeur —</option>
              {tables.map(t => (
                <option key={t.id} value={String(t.number)}>Tafel {t.number} ({t.seats} plaatsen)</option>
              ))}
            </select>
            {hasConflict && <p className="text-red-500 text-xs mt-1">⚠️ Tafel al bezet op dit tijdstip</p>}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Status</label>
            <select value={form.status}
              onChange={e => setForm({...form, status: e.target.value as Reservation['status']})}
              className={inputCls}>
              <option value="PENDING">Verwacht</option>
              <option value="CONFIRMED">Bevestigd</option>
              <option value="CHECKED_IN">Aan tafel</option>
              <option value="COMPLETED">Vertrokken</option>
              <option value="NO_SHOW">No-show</option>
            </select>
          </div>

          {/* Opmerkingen */}
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Opmerkingen / Speciale wensen</label>
            <textarea value={form.special_requests}
              onChange={e => setForm({...form, special_requests: e.target.value})}
              rows={3} placeholder="Bijv. allergieën, verjaardagstaart, rolstoel..."
              className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 focus:border-blue-500 outline-none text-base resize-none"/>
          </div>

          {/* Validatiefout */}
          {validationError && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-semibold">
              ⚠️ {validationError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          {!confirmCancel ? (
            <button onClick={() => setConfirmCancel(true)}
              className="px-4 py-3 rounded-xl border-2 border-red-300 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors">
              Annuleer
            </button>
          ) : (
            <div className="flex gap-2 flex-1">
              <button onClick={handleCancel} disabled={cancelling}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 disabled:opacity-50">
                {cancelling ? 'Bezig...' : '✓ Ja, annuleer'}
              </button>
              <button onClick={() => setConfirmCancel(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm">
                Terug
              </button>
            </div>
          )}
          {!confirmCancel && (
            <button onClick={handleSave} disabled={saving || isOutsideShifts || hasConflict}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-40 transition-colors">
              {saving ? 'Opslaan...' : 'Wijzigingen opslaan'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// CALENDAR VIEW — maand / week / dag (uur-per-uur)
// ============================================================

const NL_DAYS_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const NL_MONTHS_LONG = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 10) // 10:00–22:00
const HOUR_HEIGHT = 64 // px per uur

interface CalendarViewProps {
  reservations: Reservation[]
  selectedDate: string
  onSelectDate: (d: string) => void
  onSelectReservation: (r: Reservation) => void
  onNewReservation: () => void
  renderReservationCard: (r: Reservation) => React.ReactNode
}

function CalendarView({ reservations, selectedDate, onSelectDate, onSelectReservation, onNewReservation }: CalendarViewProps) {
  const [calMode, setCalMode] = useState<'week' | 'day' | 'month'>('week')

  // Huidige referentiedatum (geselecteerde dag)
  const refDate = new Date(selectedDate + 'T12:00:00')
  const refYear = refDate.getFullYear()
  const refMonth = refDate.getMonth()

  // Helpers
  const toISO = (d: Date) => d.toISOString().split('T')[0]
  const todayISO = toISO(new Date())

  const resByDate = (dateISO: string) =>
    reservations.filter(r => r.reservation_date === dateISO && r.status !== 'CANCELLED')

  // ─── WEEK VIEW: heatmap + tellers per uur ─────────────────
  const renderWeek = () => {
    const dow = (refDate.getDay() + 6) % 7
    const monday = new Date(refDate)
    monday.setDate(refDate.getDate() - dow)
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i); return d
    })
    const prevWeek = () => { const d = new Date(monday); d.setDate(monday.getDate() - 7); onSelectDate(toISO(d)) }
    const nextWeek = () => { const d = new Date(monday); d.setDate(monday.getDate() + 7); onSelectDate(toISO(d)) }
    const weekLabel = `${weekDays[0].toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}`

    // Reservaties per (dag, uur) groeperen
    const resByDayHour = (iso: string, hour: number) =>
      reservations.filter(r => {
        if (r.reservation_date !== iso || r.status === 'CANCELLED') return false
        const h = parseInt(r.reservation_time?.split(':')[0] || '0', 10)
        return h === hour
      })

    // Maximale count in de week (voor kleurintensiteit)
    const maxCount = Math.max(1, ...HOURS.flatMap(h =>
      weekDays.map(d => resByDayHour(toISO(d), h).length)
    ))

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevWeek} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronLeft size={18} /></button>
          <span className="font-bold text-gray-800">{weekLabel}</span>
          <button onClick={nextWeek} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronRight size={18} /></button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full border-collapse" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th className="w-14 border-b border-r border-gray-200 bg-gray-50" />
                {weekDays.map((d, i) => {
                  const iso = toISO(d)
                  const isToday = iso === todayISO
                  const isSelected = iso === selectedDate
                  const cnt = resByDate(iso).length
                  const covers = resByDate(iso).reduce((s, r) => s + r.party_size, 0)
                  return (
                    <th key={iso}
                      onClick={() => { onSelectDate(iso); setCalMode('day') }}
                      className={`border-b border-r border-gray-200 last:border-r-0 py-2 px-1 text-center cursor-pointer transition-colors ${isSelected ? 'bg-green-50' : isToday ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className={`text-[11px] font-bold uppercase tracking-wide mb-0.5 ${isToday ? 'text-blue-500' : 'text-gray-400'}`}>{NL_DAYS_SHORT[i]}</div>
                      <div className={`text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto ${isToday ? 'bg-blue-500 text-white' : isSelected ? 'bg-green-500 text-white' : 'text-gray-800'}`}>{d.getDate()}</div>
                      {cnt > 0
                        ? <div className="text-[10px] text-green-700 font-semibold mt-0.5">{cnt}×&nbsp;·&nbsp;{covers}p</div>
                        : <div className="text-[10px] text-gray-300 mt-0.5">–</div>
                      }
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(h => (
                <tr key={h} className="border-t border-gray-100">
                  <td className="text-[11px] text-gray-400 text-right pr-2 w-14 border-r border-gray-200 font-medium select-none py-0"
                    style={{ height: 40 }}>{h}:00</td>
                  {weekDays.map(d => {
                    const iso = toISO(d)
                    const cell = resByDayHour(iso, h)
                    const cnt = cell.length
                    const covers = cell.reduce((s, r) => s + r.party_size, 0)
                    const intensity = cnt === 0 ? 0 : Math.max(0.12, cnt / maxCount)
                    const isToday = iso === todayISO
                    return (
                      <td key={iso}
                        onClick={() => { onSelectDate(iso); setCalMode('day') }}
                        className={`border-r border-gray-100 last:border-r-0 text-center align-middle cursor-pointer transition-colors ${isToday ? 'bg-blue-50/40' : ''}`}
                        style={{ height: 40 }}
                      >
                        {cnt > 0 && (
                          <div
                            className="mx-auto rounded-lg flex flex-col items-center justify-center text-white font-bold cursor-pointer transition-transform hover:scale-105"
                            style={{
                              backgroundColor: `rgba(22, 163, 74, ${intensity})`,
                              border: `1px solid rgba(22,163,74,0.3)`,
                              width: '90%', height: 32,
                              color: intensity > 0.5 ? 'white' : '#166534',
                            }}
                          >
                            <span className="text-[11px] leading-none font-bold">{cnt} res.</span>
                            <span className="text-[9px] leading-none opacity-80">{covers} pers.</span>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">Klik op een dag of cel om alle reservaties te zien</p>
      </div>
    )
  }

  // ─── DAG VIEW: tijdsgegroepeerde lijst (onbeperkt schaalbaar) ────────────
  const renderDay = () => {
    const prevDay = () => { const d = new Date(refDate); d.setDate(refDate.getDate() - 1); onSelectDate(toISO(d)) }
    const nextDay = () => { const d = new Date(refDate); d.setDate(refDate.getDate() + 1); onSelectDate(toISO(d)) }
    const dayRes = resByDate(selectedDate).sort((a, b) => (a.reservation_time || '').localeCompare(b.reservation_time || ''))
    const dayLabel = refDate.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const covers = dayRes.reduce((s, r) => s + r.party_size, 0)

    // Groepeer op tijdstip
    const groups: Record<string, Reservation[]> = {}
    dayRes.forEach(r => {
      const t = r.reservation_time || '00:00'
      if (!groups[t]) groups[t] = []
      groups[t].push(r)
    })
    const sortedTimes = Object.keys(groups).sort()

    return (
      <div>
        {/* Navigatie */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevDay} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronLeft size={18} /></button>
          <div className="text-center">
            <div className="font-bold text-gray-800 capitalize">{dayLabel}</div>
            {dayRes.length > 0
              ? <div className="text-sm text-gray-500">{dayRes.length} reservaties &nbsp;·&nbsp; {covers} personen</div>
              : <div className="text-sm text-gray-400">Geen reservaties</div>
            }
          </div>
          <button onClick={nextDay} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronRight size={18} /></button>
        </div>

        {dayRes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-gray-200 bg-white">
            <CalendarDays size={44} className="text-gray-300 mb-3" />
            <p className="text-gray-400 font-medium">Geen reservaties op deze dag</p>
            <button onClick={onNewReservation} className="mt-4 px-5 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors">
              + Reservatie aanmaken
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTimes.map(time => {
              const group = groups[time]
              const groupCovers = group.reduce((s, r) => s + r.party_size, 0)
              return (
                <div key={time} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  {/* Tijdstip-header */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                    <div className="text-lg font-black text-[#3C4D6B]">{time}</div>
                    <div className="flex items-center gap-2">
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {group.length} {group.length === 1 ? 'reservatie' : 'reservaties'}
                      </span>
                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {groupCovers} personen
                      </span>
                    </div>
                  </div>

                  {/* Reservaties in deze tijdslot */}
                  <div className="divide-y divide-gray-100">
                    {group.map(r => {
                      const sc = STATUS_CONFIG[r.status]
                      return (
                        <div
                          key={r.id}
                          onClick={() => onSelectReservation(r)}
                          className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          {/* Status-streep */}
                          <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: sc.color }} />

                          {/* Hoofdinfo */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 text-sm">{r.guest_name}</span>
                              {r.occasion && <span className="text-sm">🎉</span>}
                              {r.special_requests && <span className="text-amber-500 text-xs font-semibold">⚠️ Opmerking</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {r.guest_phone && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Phone size={10} />{r.guest_phone}
                                </span>
                              )}
                              {r.special_requests && (
                                <span className="text-xs text-amber-600 truncate max-w-[200px]">{r.special_requests}</span>
                              )}
                            </div>
                          </div>

                          {/* Rechts: personen, tafel, status */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-center">
                              <div className="flex items-center gap-1 text-gray-700">
                                <Users size={13} />
                                <span className="font-black text-base leading-none">{r.party_size}</span>
                              </div>
                              <div className="text-[10px] text-gray-400 leading-none">pers.</div>
                            </div>
                            {r.table_number && (
                              <div className="bg-[#3C4D6B] text-white text-xs font-bold px-2 py-1 rounded-lg">
                                T{r.table_number}
                              </div>
                            )}
                            <div className="px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: sc.bgColor, color: sc.color }}>
                              {sc.label}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            <button onClick={onNewReservation} className="w-full py-3 rounded-xl border-2 border-dashed border-green-300 text-green-600 text-sm font-semibold hover:bg-green-50 transition-colors">
              + Nieuwe reservatie aanmaken
            </button>
          </div>
        )}
      </div>
    )
  }

  // ─── MAAND VIEW ────────────────────────────────────────────
  const renderMonth = () => {
    const firstDay = new Date(refYear, refMonth, 1)
    const startDow = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(refYear, refMonth + 1, 0).getDate()
    const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7
    const cells: (number | null)[] = [
      ...Array(startDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
      ...Array(totalCells - startDow - daysInMonth).fill(null),
    ]
    const prevMonth = () => { const d = new Date(refYear, refMonth - 1, 1); onSelectDate(toISO(d)) }
    const nextMonth = () => { const d = new Date(refYear, refMonth + 1, 1); onSelectDate(toISO(d)) }

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronLeft size={18} /></button>
          <span className="font-bold text-gray-800 text-lg">{NL_MONTHS_LONG[refMonth]} {refYear}</span>
          <button onClick={nextMonth} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronRight size={18} /></button>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200">
            {NL_DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-xs font-bold text-gray-400 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`e-${idx}`} className="min-h-[90px] border-r border-b border-gray-100 last:border-r-0 bg-gray-50/50" />
              const dateISO = toISO(new Date(refYear, refMonth, day))
              const dayRes = resByDate(dateISO)
              const isToday = dateISO === todayISO
              const isSelected = dateISO === selectedDate
              return (
                <div
                  key={dateISO}
                  onClick={() => { onSelectDate(dateISO); setCalMode('day') }}
                  className={`min-h-[90px] p-1.5 border-r border-b border-gray-100 last:border-r-0 cursor-pointer transition-colors ${isToday ? 'bg-blue-50' : isSelected ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${isToday ? 'bg-blue-500 text-white' : isSelected ? 'bg-green-500 text-white' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayRes.slice(0, 3).map(r => {
                      const sc = STATUS_CONFIG[r.status]
                      return (
                        <div key={r.id} className="text-[10px] rounded px-1 py-0.5 font-medium truncate leading-tight"
                          style={{ backgroundColor: sc.bgColor, color: sc.color }}>
                          {r.reservation_time} {r.guest_name}
                        </div>
                      )
                    })}
                    {dayRes.length > 3 && (
                      <div className="text-[10px] text-gray-400 font-medium pl-1">+{dayRes.length - 3} meer</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Sub-navigatie */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(['week', 'day', 'month'] as const).map(m => (
            <button key={m} onClick={() => setCalMode(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${calMode === m ? 'bg-[#3C4D6B] text-white' : 'text-gray-500 hover:text-gray-900'}`}>
              {m === 'week' ? 'Week' : m === 'day' ? 'Dag' : 'Maand'}
            </button>
          ))}
        </div>
        <button
          onClick={() => { onSelectDate(new Date().toISOString().split('T')[0]); setCalMode('day') }}
          className="px-3 py-2 rounded-xl bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 transition-colors"
        >
          Vandaag
        </button>
      </div>

      {calMode === 'week' && renderWeek()}
      {calMode === 'day' && renderDay()}
      {calMode === 'month' && renderMonth()}
    </div>
  )
}

// ============================================================
// NEW RESERVATION MODAL (exact kopie)
// ============================================================

// ---- Walk-in Modal ----
function WalkInModal({ onClose, onSave, tables, reservations }: {
  onClose: () => void
  onSave: (name: string, partySize: number, tableNumber: string) => Promise<void>
  tables: KassaTable[]
  reservations: Reservation[]
}) {
  const [name, setName] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [tableNumber, setTableNumber] = useState('')
  const [saving, setSaving] = useState(false)

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const nowMin = now.getHours() * 60 + now.getMinutes()

  // Bepaal welke tafels nu bezet zijn
  const busyNow = new Set(
    reservations.filter(r =>
      r.reservation_date === todayStr &&
      r.status !== 'CANCELLED' && r.status !== 'COMPLETED' &&
      r.table_number
    ).filter(r => {
      const [h, m] = r.reservation_time.split(':').map(Number)
      const start = h * 60 + m
      const end = start + (r.duration_minutes || 90)
      return nowMin >= start && nowMin < end
    }).map(r => String(r.table_number))
  )

  const freeTables = tables.filter(t => !busyNow.has(String(t.number)))

  const handleSubmit = async () => {
    if (!name.trim()) { alert('Vul een naam in'); return }
    if (!tableNumber) { alert('Kies een tafel'); return }
    setSaving(true)
    await onSave(name.trim(), partySize, tableNumber)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center">
              <UserCheck size={18} className="text-white"/>
            </div>
            <div>
              <h2 className="font-bold text-lg">Walk-in</h2>
              <p className="text-xs text-gray-400">Direct inchecken — geen reservatie nodig</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={20}/>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Naam gast <span className="text-red-500">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Voornaam achternaam"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-gray-700 outline-none text-sm"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Aantal personen</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setPartySize(p => Math.max(1, p-1))}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center font-bold text-lg hover:bg-gray-50">−</button>
              <span className="text-xl font-bold w-8 text-center">{partySize}</span>
              <button onClick={() => setPartySize(p => p+1)}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center font-bold text-lg hover:bg-gray-50">+</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tafel <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-5 gap-2">
              {freeTables.length === 0 && <p className="col-span-5 text-sm text-gray-400 py-2">Alle tafels bezet op dit moment</p>}
              {freeTables.map(t => (
                <button key={t.number} onClick={() => setTableNumber(String(t.number))}
                  className={`py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                    tableNumber === String(t.number)
                      ? 'border-gray-800 bg-gray-800 text-white'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}>
                  {t.number}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-colors">
            Annuleren
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-gray-800 text-white font-bold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <span className="animate-spin">⟳</span> : <UserCheck size={18}/>}
            Inchecken
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Wachtlijst Modal ----
function WaitlistModal({ onClose, onSave }: {
  onClose: () => void
  onSave: (name: string, phone: string, partySize: number, date: string, time: string) => Promise<void>
}) {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [date, setDate] = useState(todayStr)
  const [time, setTime] = useState(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) { alert('Vul een naam in'); return }
    setSaving(true)
    await onSave(name.trim(), phone.trim(), partySize, date, time)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500 flex items-center justify-center">
              <Clock size={18} className="text-white"/>
            </div>
            <div>
              <h2 className="font-bold text-lg">Wachtlijst</h2>
              <p className="text-xs text-gray-400">Toevoegen aan de wachtlijst</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={20}/>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Naam <span className="text-red-500">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Naam gast"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-400 outline-none text-sm"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefoon</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0471 234 567"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-400 outline-none text-sm"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Aantal personen</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setPartySize(p => Math.max(1, p-1))}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center font-bold text-lg hover:bg-gray-50">−</button>
              <span className="text-xl font-bold w-8 text-center">{partySize}</span>
              <button onClick={() => setPartySize(p => p+1)}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center font-bold text-lg hover:bg-gray-50">+</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Datum</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-400 outline-none text-sm"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tijdstip</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-400 outline-none text-sm"/>
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-colors">
            Annuleren
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-purple-500 text-white font-bold hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <span className="animate-spin">⟳</span> : <Clock size={18}/>}
            Op wachtlijst
          </button>
        </div>
      </div>
    </div>
  )
}

interface NewReservationModalProps {
  onClose: () => void
  onSave: (data: Omit<Reservation, 'id' | 'tenant_slug' | 'total_spent' | 'created_at'>) => void
  tables: KassaTable[]
  defaultDurationMinutes: number
  maxPartySize: number
  reservations: Reservation[]
  shifts: Shift[]
  bufferMinutes: number
}

function NewReservationModal({ onClose, onSave, tables, defaultDurationMinutes, maxPartySize, reservations, shifts, bufferMinutes }: NewReservationModalProps) {
  const [formData, setFormData] = useState({
    guest_first_name: '',
    guest_last_name: '',
    guest_phone: '',
    guest_email: '',
    party_size: 2,
    reservation_date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })(),
    reservation_time: '19:00',
    duration_minutes: defaultDurationMinutes || 90,
    table_number: '',
    notes: '',
    special_requests: '',
    occasion: 'Geen',
    deposit_paid: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const req = () => (
    <span className="text-red-500 font-bold ml-0.5">*</span>
  )

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.guest_first_name.trim()) newErrors.guest_first_name = 'Voornaam is verplicht'
    if (!formData.guest_last_name.trim()) newErrors.guest_last_name = 'Achternaam is verplicht'
    if (!formData.guest_phone.trim()) newErrors.guest_phone = 'Telefoon is verplicht'
    if (!formData.guest_email.trim()) newErrors.guest_email = 'Email is verplicht'
    if (!formData.reservation_date) newErrors.reservation_date = 'Datum is verplicht'
    if (!formData.reservation_time) newErrors.reservation_time = 'Tijd is verplicht'
    // Blokkeer als buiten openingstijden
    const activeShiftsV = shifts.filter(s => s.isActive)
    if (formData.reservation_time && activeShiftsV.length > 0) {
      const inShift = activeShiftsV.some(s => formData.reservation_time >= s.startTime && formData.reservation_time <= s.endTime)
      if (!inShift) newErrors.reservation_time = 'Buiten openingsuren — kies een andere tijd'
    }
    if (formData.party_size < 1) newErrors.party_size = 'Min. 1 persoon'
    if (!formData.duration_minutes || formData.duration_minutes < 1) newErrors.duration_minutes = 'Duur is verplicht'
    if (!formData.occasion || formData.occasion === '') newErrors.occasion = 'Gelegenheid is verplicht'
    // Tafel: '' = automatisch toewijzen → altijd geldig
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Zoek automatisch een vrije tafel voor de gegeven datum/tijd/groep
  const autoAssignTable = (): string => {
    const startMin = parseInt(formData.reservation_time.split(':')[0]) * 60 + parseInt(formData.reservation_time.split(':')[1])
    const endMin = startMin + (formData.duration_minutes || 90) + (bufferMinutes || 0)
    const busyTables = new Set(
      reservations
        .filter(r =>
          r.reservation_date === formData.reservation_date &&
          r.status !== 'CANCELLED' &&
          r.table_number
        )
        .filter(r => {
          const rStart = parseInt(r.reservation_time.split(':')[0]) * 60 + parseInt(r.reservation_time.split(':')[1])
          // Buffer ook toepassen op bestaande reserveringen voor symmetrische overlap-check
          const rEnd = rStart + (r.duration_minutes || 90) + (bufferMinutes || 0)
          return startMin < rEnd && endMin > rStart
        })
        .map(r => String(r.table_number))
    )
    // Kies kleinste tafel die groot genoeg is (seats >= party_size)
    const candidate = tables
      .filter(t => t.seats >= formData.party_size && !busyTables.has(String(t.number)))
      .sort((a, b) => a.seats - b.seats)[0]
    return candidate ? String(candidate.number) : ''
  }

  const handleSubmit = () => {
    if (!validateForm()) return
    const { guest_first_name, guest_last_name, deposit_paid, ...rest } = formData
    // Automatisch toewijzen: zoek vrije tafel als niets geselecteerd
    const assignedTable = rest.table_number || autoAssignTable()
    if (!assignedTable) {
      alert('Geen vrije tafel beschikbaar voor dit tijdstip en deze groepsgrootte.')
      return
    }
    // Dubbele boeking check — ook bij manuele tafelselectie
    const conflict = getTableStatus(assignedTable)
    if (conflict.bezet) {
      alert(`Tafel ${assignedTable} is al bezet op dit tijdstip (${conflict.door}, t/m ${conflict.tot}). Kies een andere tafel.`)
      return
    }
    onSave({
      ...rest,
      table_number: assignedTable,
      guest_name: `${guest_first_name} ${guest_last_name}`.trim(),
      status: 'CONFIRMED',
      payment_status: deposit_paid ? 'deposit_paid' : 'pending',
    })
  }

  const timeSlots: string[] = []
  for (let h = 10; h <= 23; h++) {
    timeSlots.push(`${h.toString().padStart(2, '0')}:00`)
    if (h < 23) timeSlots.push(`${h.toString().padStart(2, '0')}:30`)
  }

  // Controleer of gekozen tijd binnen openingstijden (actieve shifts) valt
  const activeShifts = shifts.filter(s => s.isActive)
  const isOutsideHours = formData.reservation_time && activeShifts.length > 0
    ? !activeShifts.some(s => formData.reservation_time >= s.startTime && formData.reservation_time <= s.endTime)
    : false

  const availableTables = tables.filter(t => t.seats >= formData.party_size)

  // Bereken welke tafels bezet zijn op het gekozen tijdstip
  const getTableStatus = (tableNum: string | number): { bezet: boolean; door?: string; tot?: string } => {
    const startMin = parseInt(formData.reservation_time.split(':')[0]) * 60 + parseInt(formData.reservation_time.split(':')[1])
    const endMin = startMin + (formData.duration_minutes || 90) + (bufferMinutes || 0)
    const conflict = reservations.find(r =>
      r.reservation_date === formData.reservation_date &&
      r.status !== 'CANCELLED' &&
      String(r.table_number) === String(tableNum) &&
      (() => {
        const rStart = parseInt(r.reservation_time.split(':')[0]) * 60 + parseInt(r.reservation_time.split(':')[1])
        const rEnd = rStart + (r.duration_minutes || 90)
        return startMin < rEnd && endMin > rStart
      })()
    )
    if (!conflict) return { bezet: false }
    const rStart = parseInt(conflict.reservation_time.split(':')[0]) * 60 + parseInt(conflict.reservation_time.split(':')[1])
    const rEnd = rStart + (conflict.duration_minutes || 90)
    const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    return { bezet: true, door: conflict.guest_name, tot: fmt(rEnd) }
  }

  const inputCls = (field: string) =>
    `w-full px-4 py-3 rounded-xl bg-gray-100 border ${errors[field] ? 'border-red-500' : 'border-gray-200'} focus:border-green-500 outline-none`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CalendarDays size={24} className="text-green-500" />
              Nieuwe Reservatie
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">

          {/* Voornaam & Achternaam */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Voornaam {req()}</label>
              <input type="text" value={formData.guest_first_name}
                onChange={(e) => setFormData({ ...formData, guest_first_name: e.target.value })}
                placeholder="Jan" className={inputCls('guest_first_name')} />
              {errors.guest_first_name && <p className="text-red-500 text-xs mt-1">{errors.guest_first_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Achternaam {req()}</label>
              <input type="text" value={formData.guest_last_name}
                onChange={(e) => setFormData({ ...formData, guest_last_name: e.target.value })}
                placeholder="Janssen" className={inputCls('guest_last_name')} />
              {errors.guest_last_name && <p className="text-red-500 text-xs mt-1">{errors.guest_last_name}</p>}
            </div>
          </div>

          {/* Telefoon & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Telefoon {req()}</label>
              <input type="tel" value={formData.guest_phone}
                onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                placeholder="+32 ..." className={inputCls('guest_phone')} />
              {errors.guest_phone && <p className="text-red-500 text-xs mt-1">{errors.guest_phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email {req()}</label>
              <input type="email" value={formData.guest_email}
                onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                placeholder="jan@email.be" className={inputCls('guest_email')} />
              {errors.guest_email && <p className="text-red-500 text-xs mt-1">{errors.guest_email}</p>}
            </div>
          </div>

          {/* Datum & Tijd */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Datum {req()}</label>
              <input type="date" value={formData.reservation_date}
                onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className={inputCls('reservation_date')} />
              {errors.reservation_date && <p className="text-red-500 text-xs mt-1">{errors.reservation_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tijd {req()}</label>
              <select value={formData.reservation_time}
                onChange={(e) => setFormData({ ...formData, reservation_time: e.target.value })}
                className={`${inputCls('reservation_time')} ${isOutsideHours ? 'border-red-500 bg-red-50' : ''}`}>
                {timeSlots.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
              {isOutsideHours && (
                <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-300 rounded-lg">
                  <span className="text-red-500 text-lg leading-none mt-0.5">⚠️</span>
                  <p className="text-red-600 text-sm font-semibold">
                    U boekt buiten de openingsuren. Maak een andere keuze.
                    {activeShifts.length > 0 && (
                      <span className="block text-xs font-normal mt-0.5 text-red-500">
                        Openingsuren: {activeShifts.map(s => `${s.name} ${s.startTime}–${s.endTime}`).join(', ')}
                      </span>
                    )}
                  </p>
                </div>
              )}
              {errors.reservation_time && <p className="text-red-500 text-xs mt-1">{errors.reservation_time}</p>}
            </div>
          </div>

          {/* Personen & Duur */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Aantal personen {req()}</label>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 border ${errors.party_size ? 'border-red-500' : 'border-gray-200'}`}>
                <button type="button"
                  onClick={() => setFormData({ ...formData, party_size: Math.max(1, formData.party_size - 1) })}
                  className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xl font-bold hover:bg-gray-50">-</button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-bold">{formData.party_size}</span>
                  <span className="text-sm text-gray-400 ml-1">pers.</span>
                </div>
                <button type="button"
                  onClick={() => setFormData({ ...formData, party_size: Math.min(maxPartySize || 20, formData.party_size + 1) })}
                  className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xl font-bold hover:bg-gray-50">+</button>
              </div>
              {errors.party_size && <p className="text-red-500 text-xs mt-1">{errors.party_size}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duur {req()}</label>
              <select value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 focus:border-green-500 outline-none">
                <option value={60}>1 uur</option>
                <option value={90}>1,5 uur</option>
                <option value={120}>2 uur</option>
                <option value={150}>2,5 uur</option>
                <option value={180}>3 uur</option>
                <option value={240}>4 uur</option>
              </select>
              {errors.duration_minutes && <p className="text-red-500 text-xs mt-1">{errors.duration_minutes}</p>}
            </div>
          </div>

          {/* Tafel */}
          <div>
            <label className="block text-sm font-medium mb-1">Tafel {req()}</label>
            <div className="grid grid-cols-2 gap-2">
              {/* Automatisch toewijzen knop */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, table_number: '' })}
                className={`col-span-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
                  formData.table_number === ''
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                }`}
              >
                ✨ Automatisch toewijzen (vrije tafel)
              </button>
              {/* Tafels met bezet/vrij status */}
              {tables.filter(t => t.seats >= formData.party_size).map((table) => {
                const status = getTableStatus(table.number)
                const isSelected = String(formData.table_number) === String(table.number)
                return (
                  <button
                    key={table.id}
                    type="button"
                    disabled={status.bezet}
                    onClick={() => !status.bezet && setFormData({ ...formData, table_number: String(table.number) })}
                    className={`px-3 py-2.5 rounded-xl text-sm border-2 transition-colors text-left ${
                      status.bezet
                        ? 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed opacity-75'
                        : isSelected
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-green-300 hover:bg-green-50 cursor-pointer'
                    }`}
                  >
                    <div className="font-bold">Tafel {table.number}</div>
                    <div className="text-xs mt-0.5">
                      {table.seats} pers. &nbsp;·&nbsp;
                      {status.bezet
                        ? <span className="text-red-500 font-semibold">Bezet t/m {status.tot}</span>
                        : <span className="text-green-600 font-semibold">Vrij</span>
                      }
                    </div>
                    {status.bezet && status.door && (
                      <div className="text-xs text-red-400 truncate">{status.door}</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Gelegenheid */}
          <div>
            <label className="block text-sm font-medium mb-1">Gelegenheid {req()}</label>
            <div className="flex flex-wrap gap-2">
              {['Geen', 'Verjaardag', 'Jubileum', 'Zakelijk', 'Romantisch', 'Feest'].map((occ) => (
                <button key={occ} type="button"
                  onClick={() => { setFormData({ ...formData, occasion: occ }); setErrors(e => ({ ...e, occasion: '' })) }}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    formData.occasion === occ ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>{occ}</button>
              ))}
            </div>
            {errors.occasion && <p className="text-red-500 text-xs mt-1">{errors.occasion}</p>}
          </div>

          {/* Voorschot betaald */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div>
              <p className="text-sm font-semibold text-gray-800">Voorschot betaald</p>
              <p className="text-xs text-gray-400 mt-0.5">Heeft de gast een voorschot betaald?</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData(f => ({ ...f, deposit_paid: !f.deposit_paid }))}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                formData.deposit_paid ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                formData.deposit_paid ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
            <span className={`ml-3 text-sm font-bold min-w-[2.5rem] ${formData.deposit_paid ? 'text-green-600' : 'text-gray-400'}`}>
              {formData.deposit_paid ? 'Ja' : 'Nee'}
            </span>
          </div>

          {/* Opmerkingen — niet verplicht */}
          <div>
            <label className="block text-sm font-medium mb-1">Opmerkingen</label>
            <textarea value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Interne opmerkingen..." rows={2}
              className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 focus:border-green-500 outline-none resize-none" />
          </div>

          {/* Speciale wensen — niet verplicht */}
          <div>
            <label className="block text-sm font-medium mb-1">Speciale wensen gast</label>
            <textarea value={formData.special_requests}
              onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              placeholder="Allergieën, kinderstoel, rolstoel..." rows={2}
              className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 focus:border-green-500 outline-none resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white p-6 pt-4 border-t border-gray-200 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 font-medium hover:bg-gray-200 transition-colors">
            Annuleren
          </button>
          <button onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors">
            Reservatie Aanmaken
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// RESERVATION DETAIL MODAL (exact kopie)
// ============================================================

interface ReservationDetailModalProps {
  reservation: Reservation
  onClose: () => void
  onCheckIn: () => void
  onNoShow: () => void
  onCancel: () => void
  onComplete: () => void
  onConfirm: () => void
  onAssignTable: (tableNumber: string) => void
  onDelete: () => void
  onStartOrder: () => void
  onEdit: () => void
  tables: KassaTable[]
  guestProfile?: GuestProfile
}

function ReservationDetailModal({
  reservation,
  onClose,
  onCheckIn,
  onNoShow,
  onCancel,
  onComplete,
  onConfirm,
  onAssignTable,
  onDelete,
  onStartOrder,
  onEdit,
  tables,
  guestProfile,
}: ReservationDetailModalProps) {
  const status = STATUS_CONFIG[reservation.status]
  const [showTableSelect, setShowTableSelect] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md relative">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1"
                style={{ backgroundColor: status.bgColor, color: status.color }}
              >
                {status.icon}
                {status.label}
              </span>
              <h2 className="text-xl font-bold mt-2">{reservation.guest_name}</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          {/* Datum & Tijd */}
          <div className="flex items-center gap-4 p-4 bg-gray-100 rounded-xl">
            <div className="p-3 rounded-xl bg-green-100">
              <CalendarDays size={24} className="text-green-500" />
            </div>
            <div>
              <p className="font-bold text-lg">{reservation.reservation_time}</p>
              <p className="text-sm text-gray-400">
                {new Date(reservation.reservation_date).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          {/* Personen & Tafel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-100 rounded-xl text-center">
              <Users size={24} className="mx-auto text-gray-400 mb-1" />
              <p className="text-2xl font-bold">{reservation.party_size}</p>
              <p className="text-xs text-gray-400">personen</p>
            </div>
            <div
              className="p-4 bg-gray-100 rounded-xl text-center cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={() => setShowTableSelect(true)}
            >
              <MapPin size={24} className="mx-auto text-gray-400 mb-1" />
              <p className="text-2xl font-bold">{reservation.table_number || '-'}</p>
              <p className="text-xs text-gray-400">tafel (klik om te kiezen)</p>
            </div>
          </div>

          {/* Contact */}
          {(reservation.guest_phone || reservation.guest_email) && (
            <div className="space-y-2">
              {reservation.guest_phone && (
                <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-xl">
                  <Phone size={18} className="text-gray-400" />
                  <a href={`tel:${reservation.guest_phone}`} className="hover:underline">{reservation.guest_phone}</a>
                </div>
              )}
              {reservation.guest_email && (
                <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-xl">
                  <Mail size={18} className="text-gray-400" />
                  <a href={`mailto:${reservation.guest_email}`} className="hover:underline">{reservation.guest_email}</a>
                </div>
              )}
            </div>
          )}

          {/* Guest profile badges */}
          {guestProfile && (
            <div className="flex items-center gap-2 flex-wrap">
              {guestProfile.isVip && (
                <span className="px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-500 flex items-center gap-1">
                  <Star size={12} /> VIP
                </span>
              )}
              <span className="px-2 py-1 rounded-full text-xs bg-gray-100">{guestProfile.totalVisits} bezoeken</span>
              {guestProfile.totalNoShows > 0 && (
                <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
                  {guestProfile.totalNoShows} no-shows
                </span>
              )}
            </div>
          )}

          {/* Notes */}
          {reservation.notes && (
            <div className="p-3 bg-gray-100 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">Opmerkingen</p>
              <p className="text-sm">{reservation.notes}</p>
            </div>
          )}

          {/* Special Requests — altijd zichtbaar */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-500 font-semibold mb-1">⚠️ Speciale wensen gast</p>
            <p className="text-sm text-amber-900">{reservation.special_requests || '—'}</p>
          </div>

          {/* Occasion */}
          {reservation.occasion && (
            <div className="text-center">
              <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-600">
                🎉 {reservation.occasion}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 space-y-2">
          {reservation.status === 'PENDING' && (
            <button
              onClick={onConfirm}
              className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              Bevestigen
            </button>
          )}

          {/* === ACTIE KNOPPEN — altijd zichtbaar === */}
          {/* Kassa knop */}
          <button
            onClick={onStartOrder}
            className="w-full py-3 rounded-xl bg-[#3C4D6B] text-white font-bold hover:bg-[#4A5D7B] transition-colors flex items-center justify-center gap-2"
          >
            <UtensilsCrossed size={18} />
            Naar Kassa
          </button>

          {/* Status knoppen — 3 in een rij */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onCheckIn}
              className={`py-3 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-1 transition-colors border-2
                ${reservation.status === 'CHECKED_IN'
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'}`}
            >
              <UserCheck size={20} />
              Aan tafel
            </button>
            <button
              onClick={onNoShow}
              className={`py-3 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-1 transition-colors border-2
                ${reservation.status === 'NO_SHOW'
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}
            >
              <UserX size={20} />
              No-show
            </button>
            <button
              onClick={onComplete}
              className={`py-3 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-1 transition-colors border-2
                ${reservation.status === 'COMPLETED'
                  ? 'bg-gray-500 border-gray-500 text-white'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
            >
              <CheckCircle2 size={20} />
              Vertrokken
            </button>
          </div>

          {/* Bewerken / Verplaatsen */}
          <button
            onClick={onEdit}
            className="w-full py-3 rounded-xl bg-orange-50 border-2 border-orange-200 text-orange-700 font-bold hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
          >
            <Settings size={18} />
            Bewerken / Verplaatsen
          </button>

          <div className="flex gap-2">
            <button
              onClick={onDelete}
              className="flex-1 py-3 rounded-xl bg-red-50 text-red-400 font-medium hover:bg-red-100 transition-colors text-sm"
            >
              Annulatie
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-gray-100 font-medium hover:bg-gray-200 transition-colors"
            >
              Sluiten
            </button>
          </div>
        </div>

        {/* Table Select Popup */}
        {showTableSelect && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 rounded-2xl">
            <div className="bg-white rounded-xl p-4 w-full max-w-sm">
              <h3 className="font-bold mb-3">Kies tafel</h3>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {tables.filter(t => t.seats >= reservation.party_size).map((table) => (
                  <button
                    key={table.id}
                    onClick={() => {
                      onAssignTable(table.number)
                      setShowTableSelect(false)
                    }}
                    className={`p-3 rounded-lg text-center ${
                      table.number === reservation.table_number
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <span className="font-bold">{table.number}</span>
                    <span className="text-xs block">{table.seats}p</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowTableSelect(false)}
                className="w-full mt-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
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
