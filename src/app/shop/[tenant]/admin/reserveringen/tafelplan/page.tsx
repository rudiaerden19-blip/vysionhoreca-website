'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { activateAudioForIOS, prewarmAudio, playOrderNotification, isAudioActivatedThisSession, markAudioActivated } from '@/lib/sounds'

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

interface Section { id: string; name: string; color: string; sort_order: number }

interface RestaurantTable {
  id: string; section_id: string | null; table_number: string
  seats: number; shape: 'square' | 'round' | 'rectangle'
  pos_x: number; pos_y: number; is_active: boolean
}

interface TableReservation {
  id: string; table_id: string | null; customer_name: string; customer_phone: string; customer_email: string
  party_size: number; reservation_date: string; reservation_time: string
  time_from: string | null; time_to: string | null; status: string
  notes: string | null; deposit_amount: number; deposit_paid: boolean; is_occupied: boolean
  confirmed_by_customer: boolean; confirmation_token: string | null; whatsapp_sent: boolean
}

const SECTION_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16']
const CANVAS_HEIGHT = 580

function TableWithChairs({ table, color, isSelected, reservationCount, isOccupied }: {
  table: RestaurantTable; color: string; isSelected: boolean; reservationCount: number; isOccupied: boolean
}) {
  const { seats, shape } = table
  const isRound = shape === 'round'; const isRect = shape === 'rectangle'
  const tableW = isRect ? 110 : 72; const tableH = isRect ? 60 : 72
  const cW = 16; const cH = 11; const gap = 6
  const topCount = isRect ? Math.ceil(seats * 0.4) : Math.ceil(seats / 4)
  const bottomCount = isRect ? Math.ceil(seats * 0.4) : Math.ceil(seats / 4)
  const sideRem = Math.max(0, seats - topCount - bottomCount)
  const leftCount = Math.floor(sideRem / 2); const rightCount = sideRem - leftCount
  const padH = cH + gap; const padV = cH + gap
  const totalW = tableW + 2 * padV; const totalH = tableH + 2 * padH

  const cs = (s: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', backgroundColor: '#9CA3AF', borderRadius: 4, ...s })
  const along = (count: number, len: number, start: number, axis: 'x'|'y', cross: number, fixed: boolean, w: number, h: number) => {
    if (!count) return []
    const sp = len / count
    return Array.from({ length: count }, (_, i) => {
      const m = start + sp * i + sp / 2 - (axis === 'x' ? w : h) / 2
      return axis === 'x'
        ? cs({ left: m, top: fixed ? cross : undefined, bottom: !fixed ? cross : undefined, width: w, height: h })
        : cs({ top: m, left: fixed ? cross : undefined, right: !fixed ? cross : undefined, width: w, height: h })
    })
  }

  const chairs = [
    ...along(topCount, tableW, padV, 'x', 0, true, cW, cH),
    ...along(bottomCount, tableW, padV, 'x', 0, false, cW, cH),
    ...along(leftCount, tableH, padH, 'y', 0, true, cH, cW),
    ...along(rightCount, tableH, padH, 'y', 0, false, cH, cW),
  ]

  const tableColor = isOccupied ? '#DC2626' : reservationCount > 0 ? '#D97706' : color

  return (
    <div style={{ width: totalW, height: totalH, position: 'relative' }}>
      {chairs.map((s, i) => <div key={i} style={s} />)}
      <div style={{
        position: 'absolute', top: padH, left: padV, width: tableW, height: tableH,
        backgroundColor: tableColor, borderRadius: isRound ? '50%' : 10,
        border: isSelected ? '3px solid #1E3A5F' : '2px solid rgba(0,0,0,0.15)',
        boxShadow: isSelected ? '0 0 0 3px rgba(30,58,95,0.35),0 4px 16px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1 }}>#{table.table_number}</span>
        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, marginTop: 2 }}>{seats} pl.</span>
      </div>
      {/* Badge: aantal reservaties vandaag */}
      {reservationCount > 0 && (
        <div style={{
          position: 'absolute', top: padH - 10, right: padV - 10,
          width: 22, height: 22, borderRadius: '50%',
          backgroundColor: isOccupied ? '#DC2626' : '#1D4ED8',
          color: '#fff', fontSize: 11, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #fff', zIndex: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          cursor: 'pointer',
        }}>
          {reservationCount}
        </div>
      )}
    </div>
  )
}

export default function TafelplanPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string

  const [sections, setSections] = useState<Section[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null)
  const [agendaDate, setAgendaDate] = useState(new Date().toISOString().split('T')[0])
  const [agendaReservations, setAgendaReservations] = useState<TableReservation[]>([])
  const [badgeMap, setBadgeMap] = useState<Record<string, TableReservation[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  // Archief
  const [archiveFilter, setArchiveFilter] = useState<'none'|'dag'|'week'|'maand'|'jaar'>('none')
  const [archiveData, setArchiveData] = useState<(TableReservation & { table_number?: string })[]>([])
  // Online reservaties zonder tafel
  const [unassigned, setUnassigned] = useState<TableReservation[]>([])
  const [assigningRes, setAssigningRes] = useState<TableReservation | null>(null)
  const [showOnlinePanel, setShowOnlinePanel] = useState(false)
  // Notificaties nieuwe online reservaties — EXACT zelfde als bestellingen
  const [showNewResAlert, setShowNewResAlert] = useState(false)
  const [alertDismissed, setAlertDismissed] = useState(false)
  const [audioActivated, setAudioActivated] = useState(() => isAudioActivatedThisSession())
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const knownResIdsRef = useRef<Set<string>>(new Set())
  const [hasNewReservations, setHasNewReservations] = useState(false)

  // Modals
  const [showAddSection, setShowAddSection] = useState(false)
  const [showAddTable, setShowAddTable] = useState(false)
  const [showResForm, setShowResForm] = useState(false)
  const [editingRes, setEditingRes] = useState<TableReservation | null>(null)
  const [showDeleteTable, setShowDeleteTable] = useState(false)

  const [sectionForm, setSectionForm] = useState({ name: '', color: SECTION_COLORS[0] })
  const [tableForm, setTableForm] = useState({ table_number: '', seats: 4, shape: 'square' as 'square'|'round'|'rectangle', section_id: '' })
  const emptyResForm = () => ({ customer_first_name: '', customer_last_name: '', customer_phone: '', customer_email: '', party_size: 2, date: agendaDate, time_from: '12:00', time_to: '14:00', notes: '', deposit_amount: 0, deposit_paid: false })
  const [resForm, setResForm] = useState(emptyResForm())
  const [resErrors, setResErrors] = useState<Record<string, boolean>>({})

  const dragging = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  useEffect(() => { loadData() }, [tenantSlug])

  useEffect(() => {
    loadBadges(agendaDate)
    loadUnassigned(agendaDate)
  }, [tenantSlug, agendaDate, tables.length, refreshToken])

  useEffect(() => {
    if (selectedTable) loadAgenda(selectedTable.id, agendaDate)
  }, [selectedTable?.id, agendaDate, refreshToken])

  // Polling elke 30s als backup (voor als real-time de verbinding verliest)
  useEffect(() => {
    const interval = setInterval(() => {
      loadBadges(agendaDate)
      if (selectedTable) loadAgenda(selectedTable.id, agendaDate)
    }, 30000)
    return () => clearInterval(interval)
  }, [tenantSlug, agendaDate, selectedTable?.id])

  // --- EXACT ZELFDE ALS BESTELLINGEN ---

  // Prewarm audio als al geactiveerd
  useEffect(() => {
    if (audioActivated) prewarmAudio()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Effect 1: toon/verberg oranje scherm op basis van hasNewReservations
  useEffect(() => {
    if (hasNewReservations && !alertDismissed) {
      setShowNewResAlert(true)
    }
    if (!hasNewReservations) {
      setShowNewResAlert(false)
      setAlertDismissed(false)
    }
  }, [hasNewReservations, alertDismissed])

  // Effect 2: speel geluid zolang er nieuwe reservaties zijn
  useEffect(() => {
    if (hasNewReservations) {
      playOrderNotification()
      audioIntervalRef.current = setInterval(playOrderNotification, 3000)
    } else {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current)
      audioIntervalRef.current = null
    }
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current)
    }
  }, [hasNewReservations])

  // Effect 3: polling elke 3 seconden — MEEST BETROUWBAAR
  useEffect(() => {
    const pollForNewReservations = async () => {
      try {
        const sb = getSupabase(); if (!sb) return
        const today = new Date().toISOString().split('T')[0]
        const { data } = await sb.from('reservations').select('*')
          .eq('tenant_slug', tenantSlug)
          .eq('status', 'confirmed')
          .is('table_id', null)
          .gte('reservation_date', today)
          .order('reservation_date', { ascending: true })
          .order('time_from', { ascending: true })

        const results = data || []
        const newFound = results.filter(r => !knownResIdsRef.current.has(r.id))
        results.forEach(r => knownResIdsRef.current.add(r.id))

        if (newFound.length > 0) {
          setAlertDismissed(false)
          setHasNewReservations(true)
        }

        setUnassigned(results)
      } catch (e) {
        console.error('Reservatie polling error:', e)
      }
    }

    // Initialiseer bekende IDs van huidige staat (geen alert voor bestaande)
    unassigned.forEach(r => knownResIdsRef.current.add(r.id))

    pollingIntervalRef.current = setInterval(pollForNewReservations, 3000)
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug])

  // Reset hasNewReservations als alle onassigned afgehandeld zijn
  useEffect(() => {
    if (unassigned.length === 0 && hasNewReservations) {
      setHasNewReservations(false)
    }
  }, [unassigned.length, hasNewReservations])

  // --- EINDE EXACTE KOPIE ---

  // Real-time: luister naar reservatiewijzigingen (bevestiging door klant, etc.)
  useEffect(() => {
    const sb = getSupabase()
    if (!sb || !tenantSlug) return

    const channel = sb
      .channel(`reservations-${tenantSlug}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'reservations',
        filter: `tenant_slug=eq.${tenantSlug}`,
      }, () => {
        // Herlaad badges en agenda bij elke wijziging
        loadBadges(agendaDate)
        if (selectedTable) loadAgenda(selectedTable.id, agendaDate)
      })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [tenantSlug, agendaDate, selectedTable?.id])

  async function loadData() {
    const sb = getSupabase(); if (!sb) return
    const [{ data: sec }, { data: tbl }] = await Promise.all([
      sb.from('restaurant_sections').select('*').eq('tenant_slug', tenantSlug).order('sort_order'),
      sb.from('restaurant_tables').select('*').eq('tenant_slug', tenantSlug).eq('is_active', true),
    ])
    setSections(sec || [])
    setTables(tbl || [])
    setLoading(false)
  }

  async function loadBadges(date: string) {
    const sb = getSupabase(); if (!sb) return
    const { data } = await sb.from('reservations').select('*')
      .eq('tenant_slug', tenantSlug).eq('reservation_date', date)
      .eq('status', 'confirmed')
    const map: Record<string, TableReservation[]> = {}
    for (const r of data || []) {
      if (r.table_id) {
        if (!map[r.table_id]) map[r.table_id] = []
        map[r.table_id].push(r)
      }
    }
    setBadgeMap(map)
  }

  async function loadAgenda(tableId: string, date: string) {
    const sb = getSupabase(); if (!sb) return
    const { data } = await sb.from('reservations').select('*')
      .eq('table_id', tableId).eq('reservation_date', date)
      .in('status', ['confirmed', 'completed'])
      .order('time_from', { ascending: true })
    setAgendaReservations(data || [])
  }

  async function refreshAll() {
    if (selectedTable) await loadAgenda(selectedTable.id, agendaDate)
    await loadBadges(agendaDate)
    setRefreshToken(t => t + 1)
  }

  // Drag — Mouse
  const onMouseDown = useCallback((e: React.MouseEvent, table: RestaurantTable) => {
    e.preventDefault(); e.stopPropagation()
    isDragging.current = false
    dragging.current = { id: table.id, sx: e.clientX, sy: e.clientY, ox: table.pos_x, oy: table.pos_y }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - dragging.current.sx; const dy = e.clientY - dragging.current.sy
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true
    const newX = Math.max(0, dragging.current.ox + dx)
    const newY = Math.max(0, dragging.current.oy + dy)
    setTables(prev => prev.map(t => t.id === dragging.current!.id ? { ...t, pos_x: newX, pos_y: newY } : t))
  }, [])

  const onMouseUp = useCallback(() => { dragging.current = null }, [])

  // Drag — Touch (iPad/iPhone)
  const onTouchStart = useCallback((e: React.TouchEvent, table: RestaurantTable) => {
    e.stopPropagation()
    const touch = e.touches[0]
    isDragging.current = false
    dragging.current = { id: table.id, sx: touch.clientX, sy: touch.clientY, ox: table.pos_x, oy: table.pos_y }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return
    e.preventDefault()
    const touch = e.touches[0]
    const dx = touch.clientX - dragging.current.sx; const dy = touch.clientY - dragging.current.sy
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging.current = true
    const newX = Math.max(0, dragging.current.ox + dx)
    const newY = Math.max(0, dragging.current.oy + dy)
    setTables(prev => prev.map(t => t.id === dragging.current!.id ? { ...t, pos_x: newX, pos_y: newY } : t))
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent, table: RestaurantTable) => {
    if (!isDragging.current) {
      // Geen drag → tap op tafel = agenda openen
      setSelectedTable(table)
    }
    isDragging.current = false
    dragging.current = null
  }, [])

  const onTableClick = useCallback((e: React.MouseEvent, table: RestaurantTable) => {
    e.stopPropagation()
    if (isDragging.current) { isDragging.current = false; return }
    setSelectedTable(table)
  }, [])

  async function savePositions() {
    setSaving(true)
    const sb = getSupabase()
    if (sb) {
      await Promise.all(tables.map(t => sb.from('restaurant_tables').update({ pos_x: t.pos_x, pos_y: t.pos_y }).eq('id', t.id)))
    }
    setSaving(false); setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2500)
  }

  async function addSection() {
    if (!sectionForm.name.trim()) return
    const sb = getSupabase(); if (!sb) return
    const { data } = await sb.from('restaurant_sections').insert({ tenant_slug: tenantSlug, name: sectionForm.name.trim(), color: sectionForm.color, sort_order: sections.length }).select().single()
    if (data) setSections(p => [...p, data])
    setSectionForm({ name: '', color: SECTION_COLORS[0] }); setShowAddSection(false)
  }

  async function addTable() {
    if (!tableForm.table_number.trim()) return
    const sb = getSupabase(); if (!sb) return
    let px = 30, py = 30
    outer: for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) {
      const x = 30 + c * 130, y = 30 + r * 130
      if (!tables.some(t => Math.abs(t.pos_x - x) < 110 && Math.abs(t.pos_y - y) < 110)) { px = x; py = y; break outer }
    }
    const { data } = await sb.from('restaurant_tables').insert({ tenant_slug: tenantSlug, section_id: tableForm.section_id || null, table_number: tableForm.table_number.trim(), seats: tableForm.seats, shape: tableForm.shape, pos_x: px, pos_y: py, is_active: true }).select().single()
    if (data) setTables(p => [...p, data])
    setTableForm({ table_number: '', seats: 4, shape: 'square', section_id: '' }); setShowAddTable(false)
  }

  async function deleteTable() {
    if (!selectedTable) return
    const sb = getSupabase(); if (!sb) return
    await sb.from('restaurant_tables').update({ is_active: false }).eq('id', selectedTable.id)
    setTables(p => p.filter(t => t.id !== selectedTable.id))
    setSelectedTable(null); setShowDeleteTable(false)
  }

  async function saveReservation() {
    const errors: Record<string, boolean> = {}
    if (!resForm.customer_first_name.trim()) errors.first_name = true
    if (!resForm.customer_last_name.trim()) errors.last_name = true
    if (!resForm.customer_phone.trim()) errors.phone = true
    if (Object.keys(errors).length > 0) { setResErrors(errors); return }
    setResErrors({})
    if (!selectedTable) return
    const sb = getSupabase(); if (!sb) return
    const fullName = `${resForm.customer_first_name.trim()} ${resForm.customer_last_name.trim()}`
    const payload = {
      tenant_slug: tenantSlug, table_id: selectedTable.id,
      customer_name: fullName,
      customer_phone: resForm.customer_phone.trim(),
      customer_email: resForm.customer_email.trim(),
      party_size: resForm.party_size,
      reservation_date: resForm.date,
      reservation_time: resForm.time_from,
      time_from: resForm.time_from,
      time_to: resForm.time_to,
      notes: resForm.notes.trim() || null,
      deposit_amount: resForm.deposit_amount,
      deposit_paid: resForm.deposit_paid,
      status: 'confirmed',
      is_occupied: false,
    }
    console.log('Saving reservation:', payload)
    if (editingRes) {
      await sb.from('reservations').update(payload).eq('id', editingRes.id)
    } else {
      await sb.from('reservations').insert(payload)
    }
    setShowResForm(false); setEditingRes(null); setResForm(emptyResForm()); setResErrors({})
    await refreshAll()

    // Stuur WhatsApp bevestiging bij nieuwe reservatie (niet bij bewerken)
    if (!editingRes && resForm.customer_phone.trim()) {
      const { data: newest } = await sb.from('reservations')
        .select('id').eq('tenant_slug', tenantSlug).eq('table_id', selectedTable.id)
        .eq('reservation_date', resForm.date).order('created_at', { ascending: false }).limit(1).single()
      if (newest) {
        fetch('/api/whatsapp/send-reservation-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId: newest.id, tenantSlug })
        }).catch(() => {}) // Stille fout — WhatsApp is optioneel
      }
    }
  }

  // Stap 1: Groen → Rood (gasten aangekomen)
  async function markOccupied(res: TableReservation) {
    const sb = getSupabase(); if (!sb) return
    await sb.from('reservations').update({ is_occupied: true }).eq('id', res.id)
    await refreshAll()
  }

  // Stap 2: Rood → Tafel vrij (naar archief)
  async function releaseTable(res: TableReservation) {
    const sb = getSupabase(); if (!sb) return
    await sb.from('reservations').update({ is_occupied: false, status: 'completed', released_at: new Date().toISOString() }).eq('id', res.id)
    await refreshAll()
  }

  async function cancelReservation(res: TableReservation) {
    const sb = getSupabase(); if (!sb) return
    await sb.from('reservations').update({ status: 'cancelled' }).eq('id', res.id)
    await refreshAll()
  }

  async function loadArchive(filter: 'dag'|'week'|'maand'|'jaar') {
    const sb = getSupabase(); if (!sb) return
    const now = new Date()
    let from = new Date()
    if (filter === 'dag') { from = new Date(now); from.setHours(0,0,0,0) }
    else if (filter === 'week') { from = new Date(now); from.setDate(now.getDate() - 7) }
    else if (filter === 'maand') { from = new Date(now); from.setMonth(now.getMonth() - 1) }
    else if (filter === 'jaar') { from = new Date(now); from.setFullYear(now.getFullYear() - 1) }
    const fromStr = from.toISOString().split('T')[0]
    const toStr = now.toISOString().split('T')[0]
    const { data } = await sb.from('reservations').select('*')
      .eq('tenant_slug', tenantSlug)
      .in('status', ['completed', 'cancelled'])
      .gte('reservation_date', fromStr)
      .lte('reservation_date', toStr)
      .order('reservation_date', { ascending: false })
    // Koppel tafelnummer
    const enriched = (data || []).map((r: TableReservation) => {
      const tbl = tables.find(t => t.id === r.table_id)
      return { ...r, table_number: tbl?.table_number || '?' }
    })
    setArchiveData(enriched)
  }

  async function loadUnassigned(_date?: string) {
    const sb = getSupabase(); if (!sb) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await sb.from('reservations').select('*')
      .eq('tenant_slug', tenantSlug)
      .eq('status', 'confirmed')
      .is('table_id', null)
      .gte('reservation_date', today)
      .order('reservation_date', { ascending: true })
      .order('time_from', { ascending: true })
    setUnassigned(data || [])
  }

  function dismissAlert() {
    setShowNewResAlert(false)
    setAlertDismissed(true)
    setShowOnlinePanel(true)
  }

  function activateAudio() {
    activateAudioForIOS()
    markAudioActivated()
    setAudioActivated(true)
    playOrderNotification()
  }

  async function assignTable(res: TableReservation, tableId: string) {
    const sb = getSupabase(); if (!sb) return
    // Reset whatsapp_sent zodat bevestigingsmail opnieuw verstuurd wordt met tafelnummer
    await sb.from('reservations').update({ table_id: tableId, whatsapp_sent: false }).eq('id', res.id)
    setAssigningRes(null)
    // Stuur bevestigingsmail naar klant
    if (res.customer_email || res.customer_phone) {
      fetch('/api/whatsapp/send-reservation-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: res.id, tenantSlug }),
      }).catch(() => {})
    }
    setAgendaDate(res.reservation_date)
    await refreshAll()
    await loadUnassigned()
  }

  function getTableColor(t: RestaurantTable) {
    if (!t.section_id) return '#6B7280'
    return sections.find(s => s.id === t.section_id)?.color || '#6B7280'
  }

  const activeReservations = agendaReservations.filter(r => r.status === 'confirmed')
  const archivedReservations = agendaReservations.filter(r => r.status === 'completed')

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tafelplan</h1>
          <p className="text-gray-500 mt-1">{tables.length} tafels</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap justify-end">
          <input type="date" value={agendaDate} onChange={e => { setAgendaDate(e.target.value); setArchiveFilter('none') }} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          <button onClick={() => setShowAddSection(true)} className="px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50">+ Zone</button>
          <button onClick={() => { setTableForm({ table_number: `${tables.length + 1}`, seats: 4, shape: 'square', section_id: '' }); setShowAddTable(true) }} className="px-4 py-2 border-2 border-blue-200 text-blue-700 rounded-xl font-medium hover:bg-blue-50">+ Tafel</button>
          <button
            onClick={() => {
              const url = `${window.location.origin}/shop/${tenantSlug}/reserveren`
              navigator.clipboard.writeText(url)
              alert(`✅ Link gekopieerd!\n\n${url}\n\nDeel deze link met uw klanten.`)
            }}
            className="px-4 py-2 border-2 border-green-200 text-green-700 rounded-xl font-medium hover:bg-green-50"
            title="Kopieer online boekingslink voor klanten"
          >🔗 Boekingslink</button>

          {/* Online reservaties knop met rode badge */}
          <button
            onClick={() => setShowOnlinePanel(true)}
            className="relative px-4 py-2 border-2 border-orange-200 text-orange-700 rounded-xl font-medium hover:bg-orange-50"
          >
            📬 Online reservaties
            {unassigned.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white text-xs font-black rounded-full flex items-center justify-center">
                {unassigned.length}
              </span>
            )}
          </button>
          <button onClick={savePositions} disabled={saving} className={`px-6 py-2 rounded-xl font-bold transition-colors ${savedMsg ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} disabled:opacity-60`}>
            {saving ? 'Opslaan...' : savedMsg ? '✓ Opgeslagen' : '💾 Opslaan'}
          </button>
        </div>
      </div>

      {/* Archief knoppen + Legenda rij */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Legenda */}
        <div className="flex gap-5 text-xs font-medium text-gray-600">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-500 inline-block" />Vrij</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />Gereserveerd</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-600 inline-block" />Bezet</span>
        </div>
        {/* Archief knoppen */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <span className="text-xs font-bold text-gray-500 px-2">📦 Archief:</span>
          {(['dag','week','maand','jaar'] as const).map(f => (
            <button
              key={f}
              onClick={() => {
                setArchiveFilter(f)
                setSelectedTable(null)
                loadArchive(f)
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${archiveFilter === f ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          {archiveFilter !== 'none' && (
            <button onClick={() => setArchiveFilter('none')} className="px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
      </div>

      {/* Archief weergave */}
      {archiveFilter !== 'none' && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">Archief — {archiveFilter.charAt(0).toUpperCase() + archiveFilter.slice(1)}</h2>
              <p className="text-sm text-gray-500">{archiveData.length} reservaties</p>
            </div>
            <button onClick={() => setArchiveFilter('none')} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
          </div>
          {archiveData.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <span className="text-4xl block mb-2">📭</span>
              <p>Geen reservaties gevonden voor deze periode</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Datum</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Uur</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Tafel</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Naam</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Tel</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Pers.</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {archiveData.map((r, i) => (
                    <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-gray-700">{new Date(r.reservation_date + 'T12:00').toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="px-4 py-3 text-gray-600">{r.time_from || r.reservation_time} {r.time_to ? `→ ${r.time_to}` : ''}</td>
                      <td className="px-4 py-3 font-bold text-gray-800">#{(r as TableReservation & { table_number?: string }).table_number}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.customer_name}</td>
                      <td className="px-4 py-3 text-gray-600">{r.customer_phone || '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{r.party_size}</td>
                      <td className="px-4 py-3 text-center">
                        {r.status === 'completed'
                          ? <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">VOLTOOID</span>
                          : <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">GEANNULEERD</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      <div className="flex gap-4">
        {/* Canvas */}
        <div className="flex-1 min-w-0">
          <div
            ref={canvasRef}
            className="relative rounded-2xl overflow-hidden select-none"
            style={{ width: '100%', height: CANVAS_HEIGHT, border: '2px solid #A07840', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchMove={onTouchMove}
            onTouchEnd={() => { dragging.current = null }}
            onClick={() => setSelectedTable(null)}
          >
            <div className="absolute inset-0" style={{ backgroundColor: '#C8A97A', backgroundImage: 'repeating-linear-gradient(180deg,transparent 0px,transparent 39px,rgba(0,0,0,0.08) 39px,rgba(0,0,0,0.08) 40px)' }} />

            {tables.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-8 py-6 text-center text-white">
                  <span className="text-5xl block mb-2">🪑</span>
                  <p className="font-medium">Nog geen tafels — klik op &quot;+ Tafel&quot;</p>
                </div>
              </div>
            )}

            {tables.map(table => {
              const tableResv = badgeMap[table.id] || []
              const count = tableResv.length
              const occupied = tableResv.some(r => r.is_occupied)
              return (
                <div
                  key={table.id}
                  onMouseDown={e => onMouseDown(e, table)}
                  onClick={e => onTableClick(e, table)}
                  onTouchStart={e => onTouchStart(e, table)}
                  onTouchEnd={e => onTouchEnd(e, table)}
                  className="absolute cursor-pointer touch-none"
                  style={{ left: table.pos_x, top: table.pos_y, zIndex: selectedTable?.id === table.id ? 10 : 1 }}
                >
                  <TableWithChairs
                    table={table}
                    color={getTableColor(table)}
                    isSelected={selectedTable?.id === table.id}
                    reservationCount={count}
                    isOccupied={occupied}
                  />
                </div>
              )
            })}

            <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-white/90">
              Klik op tafel voor agenda · Sleep om te verplaatsen
            </div>
          </div>
        </div>

        {/* Agenda paneel */}
        {selectedTable && (
          <div className="w-96 flex-shrink-0 bg-white rounded-2xl border-2 border-gray-200 flex flex-col" style={{ height: CANVAS_HEIGHT }}>
            <div className="p-4 border-b bg-gray-50 flex-shrink-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Tafel #{selectedTable.table_number}</h3>
                  <p className="text-sm text-gray-500">{selectedTable.seats} pl. · {sections.find(s => s.id === selectedTable.section_id)?.name || 'Geen zone'}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={() => { setResForm({ ...emptyResForm(), party_size: Math.min(selectedTable.seats, 2) }); setEditingRes(null); setShowResForm(true) }} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">+ Reservatie</button>
                  <button onClick={() => setSelectedTable(null)} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 text-xl leading-none">×</button>
                </div>
              </div>
              <input type="date" value={agendaDate} onChange={e => setAgendaDate(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Actieve reservaties */}
              {activeReservations.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <span className="text-4xl block mb-2">📅</span>
                  <p className="text-sm mb-1">{new Date(agendaDate + 'T12:00').toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  <p className="text-sm">Geen actieve reservaties</p>
                  <button onClick={() => { setResForm({ ...emptyResForm(), date: agendaDate }); setEditingRes(null); setShowResForm(true) }} className="mt-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100">+ Toevoegen</button>
                </div>
              ) : activeReservations.map(res => {
                const occupied = res.is_occupied
                return (
                  <div key={res.id} className={`rounded-2xl border-2 p-4 ${occupied ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-base font-black ${occupied ? 'text-red-700' : 'text-green-700'}`}>
                        {res.time_from || res.reservation_time} → {res.time_to || '?'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {res.confirmed_by_customer
                          ? <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">✅ Bevestigd</span>
                          : res.whatsapp_sent
                            ? <span className="bg-blue-50 text-blue-500 text-xs font-medium px-2 py-0.5 rounded-full">💬 WA verzonden</span>
                            : <span className="text-xs text-gray-400">{res.party_size} pers.</span>
                        }
                      </div>
                    </div>
                    <p className="font-bold text-gray-900">{res.customer_name}</p>
                    <div className="text-sm text-gray-600 space-y-0.5 mt-1">
                      {res.customer_phone && <p>📱 {res.customer_phone}</p>}
                      {res.deposit_amount > 0 && <p className={res.deposit_paid ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>💳 €{res.deposit_amount} {res.deposit_paid ? '✓ betaald' : '— openstaand'}</p>}
                      {res.notes && <p className="text-xs italic text-gray-400 mt-1">&quot;{res.notes}&quot;</p>}
                    </div>
                    <div className="flex gap-2 mt-3">
                      {!occupied ? (
                        // Groen: nog niet aanwezig → klik = gasten zijn er
                        <button onClick={() => markOccupied(res)} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors">
                          ✅ Gereserveerd
                        </button>
                      ) : (
                        // Rood: gasten aanwezig → klik = tafel vrij (archief)
                        <button onClick={() => releaseTable(res)} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">
                          🔴 Gasten aanwezig — Tafel vrijgeven
                        </button>
                      )}
                      {!res.confirmed_by_customer && res.customer_phone && (
                        <button
                          title="WhatsApp bevestiging sturen"
                          onClick={() => fetch('/api/whatsapp/send-reservation-confirmation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reservationId: res.id, tenantSlug }) }).then(() => refreshAll())}
                          className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-600 rounded-lg text-xs hover:bg-green-100"
                        >💬</button>
                      )}
                      <button onClick={() => {
                        const parts = (res.customer_name || '').split(' ')
                        const firstName = parts[0] || ''
                        const lastName = parts.slice(1).join(' ') || ''
                        setResForm({ customer_first_name: firstName, customer_last_name: lastName, customer_phone: res.customer_phone, customer_email: res.customer_email, party_size: res.party_size, date: res.reservation_date, time_from: res.time_from || res.reservation_time, time_to: res.time_to || '', notes: res.notes || '', deposit_amount: res.deposit_amount, deposit_paid: res.deposit_paid })
                        setEditingRes(res); setShowResForm(true)
                      }} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50">✏️</button>
                      <button onClick={() => cancelReservation(res)} className="px-3 py-1.5 bg-white border border-red-200 text-red-400 rounded-lg text-xs hover:bg-red-50">✕</button>
                    </div>
                  </div>
                )
              })}

              {/* Archief - voltooide reservaties */}
              {archivedReservations.length > 0 && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Archief vandaag ({archivedReservations.length})</p>
                  {archivedReservations.map(res => (
                    <div key={res.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 mb-2 opacity-60">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-500">{res.time_from} → {res.time_to}</span>
                        <span className="bg-gray-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">VRIJ</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{res.customer_name} · {res.party_size} pers.</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t flex-shrink-0">
              <button onClick={() => setShowDeleteTable(true)} className="w-full py-2 text-red-400 text-xs font-medium hover:bg-red-50 rounded-lg">🗑️ Tafel verwijderen</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Zone */}
      {showAddSection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddSection(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Zone toevoegen</h3>
            <div className="space-y-4">
              <input autoFocus value={sectionForm.name} onChange={e => setSectionForm(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addSection()} placeholder="bv. Terras, Binnen, VIP..." className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" />
              <div className="flex gap-2 flex-wrap">{SECTION_COLORS.map(c => <button key={c} onClick={() => setSectionForm(p => ({ ...p, color: c }))} className="w-8 h-8 rounded-full hover:scale-110 transition-transform" style={{ backgroundColor: c, outline: sectionForm.color === c ? '3px solid #1E3A5F' : 'none', outlineOffset: 2 }} />)}</div>
              <div className="flex gap-3"><button onClick={() => setShowAddSection(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700">Annuleren</button><button onClick={addSection} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Toevoegen</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tafel toevoegen */}
      {showAddTable && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddTable(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Tafel toevoegen</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tafelnummer</label><input autoFocus value={tableForm.table_number} onChange={e => setTableForm(p => ({ ...p, table_number: e.target.value }))} placeholder="1, 2, T1..." className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Plaatsen</label>
                <div className="flex items-center gap-4"><button onClick={() => setTableForm(p => ({ ...p, seats: Math.max(1, p.seats - 1) }))} className="w-10 h-10 bg-gray-100 rounded-xl font-bold text-xl">−</button><span className="text-3xl font-bold w-10 text-center">{tableForm.seats}</span><button onClick={() => setTableForm(p => ({ ...p, seats: Math.min(20, p.seats + 1) }))} className="w-10 h-10 bg-gray-100 rounded-xl font-bold text-xl">+</button></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Vorm</label>
                <div className="grid grid-cols-3 gap-2">{(['square','round','rectangle'] as const).map(s => <button key={s} onClick={() => setTableForm(p => ({ ...p, shape: s }))} className={`py-3 rounded-xl text-sm font-medium border-2 ${tableForm.shape === s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>{s === 'square' ? '⬛ Vierkant' : s === 'round' ? '⚫ Rond' : '▬ Rechthoek'}</button>)}</div>
              </div>
              {sections.length > 0 && <div><label className="block text-sm font-medium text-gray-700 mb-1">Zone</label><select value={tableForm.section_id} onChange={e => setTableForm(p => ({ ...p, section_id: e.target.value }))} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"><option value="">— Geen zone —</option>{sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
              <div className="flex gap-3"><button onClick={() => setShowAddTable(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700">Annuleren</button><button onClick={addTable} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Toevoegen</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reservatie */}
      {showResForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowResForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">{editingRes ? 'Reservatie bewerken' : `Nieuwe reservatie — Tafel #${selectedTable?.table_number}`}</h3>
            <div className="space-y-4">
              {/* Voornaam + Achternaam */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Voornaam <span className="text-red-500">*</span>
                  </label>
                  <input
                    autoFocus
                    value={resForm.customer_first_name}
                    onChange={e => { setResForm(p => ({ ...p, customer_first_name: e.target.value })); setResErrors(p => ({ ...p, first_name: false })) }}
                    placeholder="Voornaam"
                    className={`w-full border-2 rounded-xl px-3 py-2.5 focus:outline-none transition-colors ${resErrors.first_name ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                  />
                  {resErrors.first_name && <p className="text-red-500 text-xs mt-1">Verplicht veld</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Achternaam <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={resForm.customer_last_name}
                    onChange={e => { setResForm(p => ({ ...p, customer_last_name: e.target.value })); setResErrors(p => ({ ...p, last_name: false })) }}
                    placeholder="Achternaam"
                    className={`w-full border-2 rounded-xl px-3 py-2.5 focus:outline-none transition-colors ${resErrors.last_name ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                  />
                  {resErrors.last_name && <p className="text-red-500 text-xs mt-1">Verplicht veld</p>}
                </div>
              </div>
              {/* Telefoon + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefoon <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={resForm.customer_phone}
                    onChange={e => { setResForm(p => ({ ...p, customer_phone: e.target.value })); setResErrors(p => ({ ...p, phone: false })) }}
                    placeholder="+32 4xx..."
                    className={`w-full border-2 rounded-xl px-3 py-2.5 focus:outline-none transition-colors ${resErrors.phone ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                  />
                  {resErrors.phone && <p className="text-red-500 text-xs mt-1">Verplicht veld</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={resForm.customer_email} onChange={e => setResForm(p => ({ ...p, customer_email: e.target.value }))} placeholder="naam@email.com" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Personen</label>
                <div className="flex items-center gap-4"><button onClick={() => setResForm(p => ({ ...p, party_size: Math.max(1, p.party_size - 1) }))} className="w-10 h-10 bg-gray-100 rounded-xl font-bold text-xl">−</button><span className="text-2xl font-bold w-8 text-center">{resForm.party_size}</span><button onClick={() => setResForm(p => ({ ...p, party_size: Math.min(selectedTable?.seats || 20, p.party_size + 1) }))} className="w-10 h-10 bg-gray-100 rounded-xl font-bold text-xl">+</button><span className="text-sm text-gray-400">max {selectedTable?.seats}</span></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Datum</label><input type="date" value={resForm.date} onChange={e => setResForm(p => ({ ...p, date: e.target.value }))} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Van</label><input type="time" value={resForm.time_from} onChange={e => setResForm(p => ({ ...p, time_from: e.target.value }))} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tot</label><input type="time" value={resForm.time_to} onChange={e => setResForm(p => ({ ...p, time_to: e.target.value }))} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Notities</label><textarea value={resForm.notes} onChange={e => setResForm(p => ({ ...p, notes: e.target.value }))} placeholder="Allergieën, speciale wensen..." rows={2} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 resize-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Voorschot (€)</label><input type="number" min="0" step="5" value={resForm.deposit_amount || ''} onChange={e => setResForm(p => ({ ...p, deposit_amount: Number(e.target.value) }))} placeholder="0" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500" /></div>
                <div className="flex items-end pb-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={resForm.deposit_paid} onChange={e => setResForm(p => ({ ...p, deposit_paid: e.target.checked }))} className="w-5 h-5 rounded" /><span className="text-sm font-medium text-gray-700">Betaald</span></label></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowResForm(false); setEditingRes(null); setResErrors({}) }} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700">Annuleren</button>
                <button onClick={saveReservation} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Opslaan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel: Online reservaties zonder tafel */}
      {showOnlinePanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowOnlinePanel(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-xl font-bold text-gray-900">📬 Online reservaties</h3>
                <p className="text-sm text-gray-500">{unassigned.length === 0 ? 'Alle reservaties zijn toegewezen' : `${unassigned.length} wacht op tafeltoewijzing`}</p>
              </div>
              <button onClick={() => setShowOnlinePanel(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {unassigned.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <span className="text-5xl block mb-3">✅</span>
                  <p>Alle online reservaties zijn toegewezen aan een tafel</p>
                </div>
              ) : unassigned.map(res => (
                <div key={res.id} className="border-2 border-orange-100 bg-orange-50 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{res.customer_name}</p>
                      <p className="text-sm font-semibold text-orange-600 mt-0.5">
                        📅 {new Date(res.reservation_date + 'T12:00').toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {' · '}{res.time_from}{res.time_to ? ` → ${res.time_to}` : ''}
                      </p>
                      <div className="flex gap-4 mt-1 text-sm text-gray-600">
                        <span>👥 {res.party_size} pers.</span>
                        {res.customer_phone && <span>📱 {res.customer_phone}</span>}
                        {res.customer_email && <span>📧 {res.customer_email}</span>}
                      </div>
                      {res.notes && <p className="text-xs text-gray-400 italic mt-1">&quot;{res.notes}&quot;</p>}
                    </div>
                    <button
                      onClick={() => { setAssigningRes(res); setShowOnlinePanel(false) }}
                      className="flex-shrink-0 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      🪑 Tafel toewijzen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tafel toewijzen aan online reservatie */}
      {assigningRes && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAssigningRes(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-1">Tafel toewijzen</h3>
            <p className="text-gray-500 text-sm mb-4">{assigningRes.customer_name} · {assigningRes.time_from} · {assigningRes.party_size} pers.</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tables.map(t => (
                <button
                  key={t.id}
                  onClick={() => assignTable(assigningRes, t.id)}
                  className="w-full flex items-center justify-between px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                >
                  <span className="font-bold text-gray-900">Tafel #{t.table_number}</span>
                  <span className="text-sm text-gray-500">{t.seats} pl. · {sections.find(s => s.id === t.section_id)?.name || 'Geen zone'}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setAssigningRes(null)} className="w-full mt-4 py-2 border-2 border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">Annuleren</button>
          </div>
        </div>
      )}

      {/* Modal: Tafel verwijderen */}
      {showDeleteTable && selectedTable && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteTable(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <span className="text-5xl block mb-4">🗑️</span>
            <h3 className="text-xl font-bold mb-2">Tafel #{selectedTable.table_number} verwijderen?</h3>
            <p className="text-gray-600 mb-6">Dit kan niet ongedaan worden gemaakt.</p>
            <div className="flex gap-3"><button onClick={() => setShowDeleteTable(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium">Annuleren</button><button onClick={deleteTable} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Verwijderen</button></div>
          </div>
        </div>
      )}

      {/* Geluid activeren knop (eerste keer) — zelfde als bestellingen */}
      {!audioActivated && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={activateAudio}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full shadow-2xl text-sm flex items-center gap-2 animate-bounce"
          >
            🔔 Activeer geluidsmeldingen
          </button>
        </div>
      )}

      {/* Volledig scherm oranje alert — EXACT zelfde als bestellingen */}
      {showNewResAlert && hasNewReservations && (
        <div
          onClick={dismissAlert}
          className="fixed inset-0 z-[200] flex items-center justify-center cursor-pointer"
          style={{ backgroundColor: 'rgba(249, 115, 22, 0.95)' }}
        >
          <div
            className="text-center text-white p-8"
            style={{ animation: 'pulse 0.8s ease-in-out infinite' }}
          >
            <div className="text-9xl mb-8" style={{ display: 'inline-block', animation: 'bounce 0.5s infinite' }}>
              🔔
            </div>
            <h1 className="text-6xl md:text-8xl font-black mb-4">
              Nieuwe reservatie!
            </h1>
            <p className="text-2xl md:text-3xl opacity-90 mb-8">
              {unassigned.length} online {unassigned.length === 1 ? 'reservatie' : 'reservaties'} wacht op een tafel
            </p>
            <div className="bg-white/20 rounded-2xl px-8 py-4 inline-block">
              <p className="text-xl font-medium">Tik om te sluiten</p>
              <p className="text-lg opacity-75 mt-1">Geluid stopt als alle reservaties toegewezen zijn</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
