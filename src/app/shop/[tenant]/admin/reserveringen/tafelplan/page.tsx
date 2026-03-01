'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

interface Section {
  id: string
  name: string
  color: string
  sort_order: number
}

interface RestaurantTable {
  id: string
  section_id: string | null
  table_number: string
  seats: number
  shape: 'square' | 'round' | 'rectangle'
  pos_x: number
  pos_y: number
  is_active: boolean
}

interface TableReservation {
  id: string
  table_id: string | null
  name: string
  phone: string
  email: string
  guests: number
  reservation_date: string
  reservation_time: string
  time_from: string | null
  time_to: string | null
  status: string
  notes: string | null
  deposit_amount: number
  deposit_paid: boolean
  is_occupied: boolean
  released_at: string | null
}

const SECTION_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16']
const CANVAS_HEIGHT = 580
const HOURS = Array.from({ length: 14 }, (_, i) => i + 9) // 09:00 – 22:00

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

function minutesToTime(m: number) {
  const h = Math.floor(m / 60).toString().padStart(2, '0')
  const min = (m % 60).toString().padStart(2, '0')
  return `${h}:${min}`
}

// Stoeltjes component
function TableWithChairs({ table, color, isSelected, isOccupied, hasReservation }: {
  table: RestaurantTable; color: string; isSelected: boolean; isOccupied: boolean; hasReservation: boolean
}) {
  const seats = table.seats
  const shape = table.shape
  const isRound = shape === 'round'
  const isRect = shape === 'rectangle'
  const tableW = isRect ? 110 : 72
  const tableH = isRect ? 60 : 72
  const cW = 16; const cH = 11; const gap = 6
  const topCount = isRect ? Math.ceil(seats * 0.4) : Math.ceil(seats / 4)
  const bottomCount = isRect ? Math.ceil(seats * 0.4) : Math.ceil(seats / 4)
  const sideRem = Math.max(0, seats - topCount - bottomCount)
  const leftCount = Math.floor(sideRem / 2)
  const rightCount = sideRem - leftCount
  const padH = cH + gap; const padV = cH + gap
  const totalW = tableW + 2 * padV; const totalH = tableH + 2 * padH

  const chairStyle = (s: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', backgroundColor: '#9CA3AF', borderRadius: 4, ...s,
  })
  const chairsAlong = (count: number, length: number, start: number, axis: 'x' | 'y', crossPos: number, crossFixed: boolean, w: number, h: number) => {
    if (count === 0) return []
    const spacing = length / count
    return Array.from({ length: count }, (_, i) => {
      const center = spacing * i + spacing / 2
      const main = start + center - (axis === 'x' ? w : h) / 2
      return axis === 'x'
        ? chairStyle({ left: main, top: crossFixed ? crossPos : undefined, bottom: !crossFixed ? crossPos : undefined, width: w, height: h })
        : chairStyle({ top: main, left: crossFixed ? crossPos : undefined, right: !crossFixed ? crossPos : undefined, width: w, height: h })
    })
  }
  const allChairs = [
    ...chairsAlong(topCount, tableW, padV, 'x', 0, true, cW, cH),
    ...chairsAlong(bottomCount, tableW, padV, 'x', 0, false, cW, cH),
    ...chairsAlong(leftCount, tableH, padH, 'y', 0, true, cH, cW),
    ...chairsAlong(rightCount, tableH, padH, 'y', 0, false, cH, cW),
  ]

  const tableColor = isOccupied ? '#DC2626' : hasReservation ? '#D97706' : color

  return (
    <div style={{ width: totalW, height: totalH, position: 'relative' }}>
      {allChairs.map((s, i) => <div key={i} style={s} />)}
      <div style={{
        position: 'absolute', top: padH, left: padV, width: tableW, height: tableH,
        backgroundColor: tableColor,
        borderRadius: isRound ? '50%' : 10,
        border: isSelected ? '3px solid #1E3A5F' : '2px solid rgba(0,0,0,0.15)',
        boxShadow: isSelected ? '0 0 0 3px rgba(30,58,95,0.35), 0 4px 16px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1 }}>#{table.table_number}</span>
        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 3 }}>{seats} pl.</span>
        {isOccupied && <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 9, marginTop: 2 }}>BEZET</span>}
        {!isOccupied && hasReservation && <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 9, marginTop: 2 }}>GERESERVEERD</span>}
      </div>
    </div>
  )
}

export default function TafelplanPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string

  const [sections, setSections] = useState<Section[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [reservations, setReservations] = useState<TableReservation[]>([])
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null)
  const [agendaDate, setAgendaDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [saved, setSaved] = useState(false)

  // Modals
  const [showAddSection, setShowAddSection] = useState(false)
  const [showAddTable, setShowAddTable] = useState(false)
  const [showReservationForm, setShowReservationForm] = useState(false)
  const [editingReservation, setEditingReservation] = useState<TableReservation | null>(null)
  const [showDeleteTable, setShowDeleteTable] = useState(false)

  // Forms
  const [sectionForm, setSectionForm] = useState({ name: '', color: SECTION_COLORS[0] })
  const [tableForm, setTableForm] = useState({ table_number: '', seats: 4, shape: 'square' as 'square'|'round'|'rectangle', section_id: '' })
  const [resForm, setResForm] = useState({ name: '', phone: '', email: '', guests: 2, date: agendaDate, time_from: '12:00', time_to: '14:00', notes: '', deposit_amount: 0, deposit_paid: false })

  const dragging = useRef<{ tableId: string; startMouseX: number; startMouseY: number; origX: number; origY: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadData() }, [tenantSlug])
  useEffect(() => { if (selectedTable) loadReservations(selectedTable.id, agendaDate) }, [selectedTable, agendaDate])

  async function loadData() {
    const supabase = getSupabase(); if (!supabase) return
    const [{ data: sec }, { data: tbl }] = await Promise.all([
      supabase.from('restaurant_sections').select('*').eq('tenant_slug', tenantSlug).order('sort_order'),
      supabase.from('restaurant_tables').select('*').eq('tenant_slug', tenantSlug).eq('is_active', true),
    ])
    setSections(sec || []); setTables(tbl || [])
    setLoading(false)
  }

  async function loadReservations(tableId: string, date: string) {
    const supabase = getSupabase(); if (!supabase) return
    const { data } = await supabase.from('reservations').select('*')
      .eq('table_id', tableId).eq('reservation_date', date)
      .order('time_from', { ascending: true })
    setReservations(data || [])
  }

  const handleMouseDown = useCallback((e: React.MouseEvent, table: RestaurantTable) => {
    e.preventDefault(); e.stopPropagation()
    dragging.current = { tableId: table.id, startMouseX: e.clientX, startMouseY: e.clientY, origX: table.pos_x, origY: table.pos_y }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - dragging.current.startMouseX
    const dy = e.clientY - dragging.current.startMouseY
    const newX = Math.max(0, dragging.current.origX + dx)
    const newY = Math.max(0, dragging.current.origY + dy)
    setTables(prev => prev.map(t => t.id === dragging.current!.tableId ? { ...t, pos_x: newX, pos_y: newY } : t))
    setHasUnsaved(true)
  }, [])

  const handleMouseUp = useCallback(() => { dragging.current = null }, [])

  async function saveAll() {
    setSaving(true)
    const supabase = getSupabase(); if (!supabase) { setSaving(false); return }
    await Promise.all(tables.map(t => supabase.from('restaurant_tables').update({ pos_x: t.pos_x, pos_y: t.pos_y }).eq('id', t.id)))
    setSaving(false); setHasUnsaved(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function addSection() {
    if (!sectionForm.name.trim()) return
    const supabase = getSupabase(); if (!supabase) return
    const { data } = await supabase.from('restaurant_sections').insert({ tenant_slug: tenantSlug, name: sectionForm.name.trim(), color: sectionForm.color, sort_order: sections.length }).select().single()
    if (data) setSections(prev => [...prev, data])
    setSectionForm({ name: '', color: SECTION_COLORS[0] }); setShowAddSection(false)
  }

  async function addTable() {
    if (!tableForm.table_number.trim()) return
    const supabase = getSupabase(); if (!supabase) return
    let posX = 30, posY = 30
    outer: for (let row = 0; row < 5; row++) for (let col = 0; col < 8; col++) {
      const x = 30 + col * 130, y = 30 + row * 130
      if (!tables.some(t => Math.abs(t.pos_x - x) < 110 && Math.abs(t.pos_y - y) < 110)) { posX = x; posY = y; break outer }
    }
    const { data } = await supabase.from('restaurant_tables').insert({ tenant_slug: tenantSlug, section_id: tableForm.section_id || null, table_number: tableForm.table_number.trim(), seats: tableForm.seats, shape: tableForm.shape, pos_x: posX, pos_y: posY, is_active: true }).select().single()
    if (data) setTables(prev => [...prev, data])
    setTableForm({ table_number: '', seats: 4, shape: 'square', section_id: '' }); setShowAddTable(false)
  }

  async function deleteTable() {
    if (!selectedTable) return
    const supabase = getSupabase(); if (!supabase) return
    await supabase.from('restaurant_tables').update({ is_active: false }).eq('id', selectedTable.id)
    setTables(prev => prev.filter(t => t.id !== selectedTable.id))
    setSelectedTable(null); setShowDeleteTable(false)
  }

  async function saveReservation() {
    if (!selectedTable || !resForm.name.trim()) return
    const supabase = getSupabase(); if (!supabase) return
    const payload = {
      tenant_slug: tenantSlug,
      table_id: selectedTable.id,
      name: resForm.name.trim(),
      phone: resForm.phone.trim(),
      email: resForm.email.trim(),
      guests: resForm.guests,
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
    if (editingReservation) {
      await supabase.from('reservations').update(payload).eq('id', editingReservation.id)
    } else {
      await supabase.from('reservations').insert(payload)
    }
    await loadReservations(selectedTable.id, agendaDate)
    setShowReservationForm(false); setEditingReservation(null)
    setResForm({ name: '', phone: '', email: '', guests: 2, date: agendaDate, time_from: '12:00', time_to: '14:00', notes: '', deposit_amount: 0, deposit_paid: false })
  }

  async function markOccupied(res: TableReservation) {
    const supabase = getSupabase(); if (!supabase || !selectedTable) return
    await supabase.from('reservations').update({ is_occupied: true, status: 'confirmed' }).eq('id', res.id)
    await loadReservations(selectedTable.id, agendaDate)
  }

  async function releaseTable(res: TableReservation) {
    const supabase = getSupabase(); if (!supabase || !selectedTable) return
    await supabase.from('reservations').update({ is_occupied: false, status: 'completed', released_at: new Date().toISOString() }).eq('id', res.id)
    await loadReservations(selectedTable.id, agendaDate)
  }

  async function cancelReservation(res: TableReservation) {
    const supabase = getSupabase(); if (!supabase || !selectedTable) return
    await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', res.id)
    await loadReservations(selectedTable.id, agendaDate)
  }

  function getTableColor(table: RestaurantTable) {
    if (!table.section_id) return '#6B7280'
    return sections.find(s => s.id === table.section_id)?.color || '#6B7280'
  }

  // Controleer of tafel bezet/gereserveerd is op vandaag
  const todayStr = new Date().toISOString().split('T')[0]
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()

  function getTableStatus(tableId: string): 'occupied' | 'reserved' | 'free' {
    // We don't load all reservations here for perf — color based on selectedTable only
    return 'free'
  }

  const agendaReservations = reservations.filter(r => r.status !== 'cancelled')

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
        <div className="flex gap-3 items-center">
          {hasUnsaved && <span className="text-sm text-amber-600 font-medium">● Niet opgeslagen</span>}
          <button onClick={() => setShowAddSection(true)} className="px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">+ Zone</button>
          <button onClick={() => { setTableForm({ table_number: `${tables.length + 1}`, seats: 4, shape: 'square', section_id: '' }); setShowAddTable(true) }} className="px-4 py-2 border-2 border-blue-200 text-blue-700 rounded-xl font-medium hover:bg-blue-50 transition-colors">+ Tafel</button>
          <button onClick={saveAll} disabled={saving} className={`px-6 py-2 rounded-xl font-bold transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} disabled:opacity-60`}>
            {saving ? 'Opslaan...' : saved ? '✓ Opgeslagen' : '💾 Opslaan'}
          </button>
        </div>
      </div>

      {/* Status legenda */}
      <div className="flex gap-4 text-xs font-medium">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-500"></span>Vrij</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span>Gereserveerd</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-600"></span>Bezet</div>
      </div>

      <div className="flex gap-4">
        {/* Tafelplan canvas */}
        <div className={`${selectedTable ? 'flex-1' : 'w-full'} transition-all duration-300`}>
          <div
            ref={canvasRef}
            className="relative rounded-2xl overflow-hidden select-none"
            style={{ width: '100%', height: CANVAS_HEIGHT, border: '2px solid #A07840', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setSelectedTable(null)}
          >
            {/* Laminaatvloer */}
            <div className="absolute inset-0" style={{
              backgroundColor: '#C8A97A',
              backgroundImage: `repeating-linear-gradient(180deg, transparent 0px, transparent 39px, rgba(0,0,0,0.08) 39px, rgba(0,0,0,0.08) 40px)`,
            }} />

            {tables.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-8 py-6 text-center text-white">
                  <span className="text-5xl mb-3 block">🪑</span>
                  <p className="font-medium">Nog geen tafels — klik op "+ Tafel"</p>
                </div>
              </div>
            )}

            {tables.map(table => (
              <div
                key={table.id}
                onMouseDown={(e) => handleMouseDown(e, table)}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedTable(table)
                  setAgendaDate(new Date().toISOString().split('T')[0])
                }}
                className="absolute cursor-pointer"
                style={{ left: table.pos_x, top: table.pos_y, zIndex: selectedTable?.id === table.id ? 10 : 1 }}
              >
                <TableWithChairs
                  table={table}
                  color={getTableColor(table)}
                  isSelected={selectedTable?.id === table.id}
                  isOccupied={false}
                  hasReservation={false}
                />
              </div>
            ))}

            <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-white/90">
              Klik op een tafel om de agenda te openen
            </div>
          </div>
        </div>

        {/* Agenda paneel */}
        {selectedTable && (
          <div className="w-96 flex-shrink-0 bg-white rounded-2xl border-2 border-gray-200 flex flex-col overflow-hidden" style={{ height: CANVAS_HEIGHT }}>
            {/* Agenda header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Tafel #{selectedTable.table_number}</h3>
                  <p className="text-sm text-gray-500">{selectedTable.seats} plaatsen · {sections.find(s => s.id === selectedTable.section_id)?.name || 'Geen zone'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setResForm({ name: '', phone: '', email: '', guests: Math.min(selectedTable.seats, 2), date: agendaDate, time_from: '12:00', time_to: '14:00', notes: '', deposit_amount: 0, deposit_paid: false })
                      setEditingReservation(null)
                      setShowReservationForm(true)
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
                  >
                    + Reservatie
                  </button>
                  <button onClick={() => setSelectedTable(null)} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 text-lg leading-none">×</button>
                </div>
              </div>
              {/* Datum selector */}
              <input
                type="date"
                value={agendaDate}
                onChange={e => setAgendaDate(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Reservaties lijst */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {agendaReservations.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <span className="text-4xl block mb-2">📅</span>
                  <p className="text-sm">Geen reservaties op {new Date(agendaDate + 'T12:00:00').toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  <button
                    onClick={() => {
                      setResForm({ name: '', phone: '', email: '', guests: Math.min(selectedTable.seats, 2), date: agendaDate, time_from: '12:00', time_to: '14:00', notes: '', deposit_amount: 0, deposit_paid: false })
                      setEditingReservation(null)
                      setShowReservationForm(true)
                    }}
                    className="mt-4 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100"
                  >
                    + Reservatie toevoegen
                  </button>
                </div>
              )}

              {agendaReservations.map(res => {
                const isOccupied = res.is_occupied
                const isCompleted = res.status === 'completed'
                return (
                  <div key={res.id} className={`rounded-2xl border-2 p-4 ${isOccupied ? 'border-red-200 bg-red-50' : isCompleted ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-blue-200 bg-blue-50'}`}>
                    {/* Tijdslot */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-lg font-black ${isOccupied ? 'text-red-700' : isCompleted ? 'text-gray-500' : 'text-blue-700'}`}>
                        {res.time_from || res.reservation_time} → {res.time_to || '?'}
                      </span>
                      {isOccupied && <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">BEZET</span>}
                      {isCompleted && <span className="bg-gray-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">VRIJGEGEVEN</span>}
                      {!isOccupied && !isCompleted && <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">BEVESTIGD</span>}
                    </div>

                    {/* Klant info */}
                    <div className="space-y-1 mb-3">
                      <p className="font-bold text-gray-900">{res.name}</p>
                      <p className="text-sm text-gray-600">📱 {res.phone || '—'}</p>
                      <p className="text-sm text-gray-600">👥 {res.guests} personen</p>
                      {res.deposit_amount > 0 && (
                        <p className={`text-sm font-medium ${res.deposit_paid ? 'text-green-700' : 'text-amber-700'}`}>
                          💳 Voorschot €{res.deposit_amount} {res.deposit_paid ? '✓ betaald' : '— openstaand'}
                        </p>
                      )}
                      {res.notes && <p className="text-xs text-gray-500 italic mt-1">"{res.notes}"</p>}
                    </div>

                    {/* Actieknoppen */}
                    {!isCompleted && (
                      <div className="flex gap-2">
                        {!isOccupied && (
                          <button onClick={() => markOccupied(res)} className="flex-1 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">
                            🔴 Gasten aanwezig
                          </button>
                        )}
                        {isOccupied && (
                          <button onClick={() => releaseTable(res)} className="flex-1 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors">
                            ✓ Tafel vrijgeven
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setResForm({ name: res.name, phone: res.phone, email: res.email, guests: res.guests, date: res.reservation_date, time_from: res.time_from || res.reservation_time, time_to: res.time_to || '', notes: res.notes || '', deposit_amount: res.deposit_amount, deposit_paid: res.deposit_paid })
                            setEditingReservation(res)
                            setShowReservationForm(true)
                          }}
                          className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50"
                        >✏️</button>
                        <button onClick={() => cancelReservation(res)} className="px-3 py-1.5 bg-white border border-red-200 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50">✕</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer: tafel verwijderen */}
            <div className="p-3 border-t border-gray-100">
              <button onClick={() => setShowDeleteTable(true)} className="w-full py-2 text-red-500 text-xs font-medium hover:bg-red-50 rounded-lg transition-colors">
                🗑️ Tafel verwijderen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Zone toevoegen */}
      {showAddSection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddSection(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Zone toevoegen</h3>
            <div className="space-y-4">
              <input autoFocus value={sectionForm.name} onChange={e => setSectionForm(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addSection()} placeholder="bv. Terras, Binnen, VIP..." className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" />
              <div className="flex gap-2 flex-wrap">
                {SECTION_COLORS.map(c => <button key={c} onClick={() => setSectionForm(p => ({ ...p, color: c }))} className="w-8 h-8 rounded-full transition-transform hover:scale-110" style={{ backgroundColor: c, outline: sectionForm.color === c ? '3px solid #1E3A5F' : 'none', outlineOffset: '2px' }} />)}
              </div>
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
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tafelnummer</label><input autoFocus value={tableForm.table_number} onChange={e => setTableForm(p => ({ ...p, table_number: e.target.value }))} placeholder="bv. 1, 2, T1..." className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Plaatsen</label>
                <div className="flex items-center gap-4"><button onClick={() => setTableForm(p => ({ ...p, seats: Math.max(1, p.seats - 1) }))} className="w-10 h-10 bg-gray-100 rounded-xl font-bold text-xl hover:bg-gray-200">−</button><span className="text-3xl font-bold w-10 text-center">{tableForm.seats}</span><button onClick={() => setTableForm(p => ({ ...p, seats: Math.min(20, p.seats + 1) }))} className="w-10 h-10 bg-gray-100 rounded-xl font-bold text-xl hover:bg-gray-200">+</button></div>
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

      {/* Modal: Reservatie toevoegen/bewerken */}
      {showReservationForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReservationForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">{editingReservation ? 'Reservatie bewerken' : `Nieuwe reservatie — Tafel #${selectedTable?.table_number}`}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label><input autoFocus value={resForm.name} onChange={e => setResForm(p => ({ ...p, name: e.target.value }))} placeholder="Voornaam Naam" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Telefoon</label><input value={resForm.phone} onChange={e => setResForm(p => ({ ...p, phone: e.target.value }))} placeholder="+32 4xx xx xx xx" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={resForm.email} onChange={e => setResForm(p => ({ ...p, email: e.target.value }))} placeholder="naam@email.com" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Aantal personen</label>
                <div className="flex items-center gap-4"><button onClick={() => setResForm(p => ({ ...p, guests: Math.max(1, p.guests - 1) }))} className="w-10 h-10 bg-gray-100 rounded-xl font-bold text-xl hover:bg-gray-200">−</button><span className="text-2xl font-bold w-8 text-center">{resForm.guests}</span><button onClick={() => setResForm(p => ({ ...p, guests: Math.min(selectedTable?.seats || 20, p.guests + 1) }))} className="w-10 h-10 bg-gray-100 rounded-xl font-bold text-xl hover:bg-gray-200">+</button><span className="text-sm text-gray-500">max {selectedTable?.seats} plaatsen</span></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Datum</label><input type="date" value={resForm.date} onChange={e => setResForm(p => ({ ...p, date: e.target.value }))} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Van</label><input type="time" value={resForm.time_from} onChange={e => setResForm(p => ({ ...p, time_from: e.target.value }))} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tot</label><input type="time" value={resForm.time_to} onChange={e => setResForm(p => ({ ...p, time_to: e.target.value }))} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Notities</label><textarea value={resForm.notes} onChange={e => setResForm(p => ({ ...p, notes: e.target.value }))} placeholder="Allergieën, speciale wensen..." rows={2} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 resize-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Voorschot (€)</label><input type="number" min="0" step="5" value={resForm.deposit_amount || ''} onChange={e => setResForm(p => ({ ...p, deposit_amount: Number(e.target.value) }))} placeholder="0" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500" /></div>
                <div className="flex items-end pb-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={resForm.deposit_paid} onChange={e => setResForm(p => ({ ...p, deposit_paid: e.target.checked }))} className="w-5 h-5 rounded" /><span className="text-sm font-medium text-gray-700">Voorschot betaald</span></label></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowReservationForm(false); setEditingReservation(null) }} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700">Annuleren</button>
                <button onClick={saveReservation} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Opslaan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tafel verwijderen */}
      {showDeleteTable && selectedTable && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteTable(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <span className="text-5xl mb-4 block">🗑️</span>
            <h3 className="text-xl font-bold mb-2">Tafel #{selectedTable.table_number} verwijderen?</h3>
            <p className="text-gray-600 mb-6">Dit kan niet ongedaan gemaakt worden.</p>
            <div className="flex gap-3"><button onClick={() => setShowDeleteTable(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700">Annuleren</button><button onClick={deleteTable} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Verwijderen</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
