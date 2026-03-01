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
  tenant_slug: string
  name: string
  color: string
  sort_order: number
}

interface RestaurantTable {
  id: string
  tenant_slug: string
  section_id: string | null
  table_number: string
  seats: number
  shape: 'square' | 'round' | 'rectangle'
  pos_x: number
  pos_y: number
  is_active: boolean
}

const SECTION_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
]

const CANVAS_HEIGHT = 620

// Stoeltjes rondom een tafel tekenen
function TableWithChairs({
  table,
  color,
  isSelected,
}: {
  table: RestaurantTable
  color: string
  isSelected: boolean
}) {
  const seats = table.seats
  const shape = table.shape
  const isRound = shape === 'round'
  const isRect = shape === 'rectangle'

  // Tafel afmetingen
  const tableW = isRect ? 110 : 72
  const tableH = isRect ? 60 : 72

  // Stoeltje afmetingen
  const cW = 16  // breedte horizontale stoel
  const cH = 11  // hoogte horizontale stoel
  const gap = 6  // afstand stoel tot tafel

  // Stoelverdeling per kant
  const topCount = isRect ? Math.ceil(seats * 0.4) : Math.ceil(seats / 4)
  const bottomCount = isRect ? Math.ceil(seats * 0.4) : Math.ceil(seats / 4)
  const sideRem = Math.max(0, seats - topCount - bottomCount)
  const leftCount = Math.floor(sideRem / 2)
  const rightCount = sideRem - leftCount

  // Totale bounding box inclusief stoelen
  const padH = cH + gap  // padding boven/onder
  const padV = cH + gap  // padding links/rechts (stoel staat 90°, dus breedte = cH)
  const totalW = tableW + 2 * padV
  const totalH = tableH + 2 * padH

  const chairStyle = (extraStyle: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    backgroundColor: '#9CA3AF',
    borderRadius: 4,
    ...extraStyle,
  })

  // Posities voor stoelen op een zijde
  const chairsAlong = (count: number, length: number, fixedStart: number, axis: 'x' | 'y', crossPos: number, crossFixed: boolean, w: number, h: number) => {
    if (count === 0) return []
    const spacing = length / count
    return Array.from({ length: count }, (_, i) => {
      const center = spacing * i + spacing / 2
      const mainPos = fixedStart + center - (axis === 'x' ? w : h) / 2
      return axis === 'x'
        ? chairStyle({ left: mainPos, top: crossFixed ? crossPos : undefined, bottom: !crossFixed ? crossPos : undefined, width: w, height: h })
        : chairStyle({ top: mainPos, left: crossFixed ? crossPos : undefined, right: !crossFixed ? crossPos : undefined, width: w, height: h })
    })
  }

  const topChairs = chairsAlong(topCount, tableW, padV, 'x', 0, true, cW, cH)
  const bottomChairs = chairsAlong(bottomCount, tableW, padV, 'x', 0, false, cW, cH)
  const leftChairs = chairsAlong(leftCount, tableH, padH, 'y', 0, true, cH, cW)
  const rightChairs = chairsAlong(rightCount, tableH, padH, 'y', 0, false, cH, cW)
  const allChairs = [...topChairs, ...bottomChairs, ...leftChairs, ...rightChairs]

  return (
    <div style={{ width: totalW, height: totalH, position: 'relative' }}>
      {/* Stoelen */}
      {allChairs.map((style, i) => (
        <div key={i} style={style} />
      ))}

      {/* Tafel */}
      <div
        style={{
          position: 'absolute',
          top: padH,
          left: padV,
          width: tableW,
          height: tableH,
          backgroundColor: color,
          borderRadius: isRound ? '50%' : 10,
          border: isSelected ? '3px solid #1E3A5F' : '2px solid rgba(0,0,0,0.15)',
          boxShadow: isSelected
            ? '0 0 0 3px rgba(30,58,95,0.35), 0 4px 16px rgba(0,0,0,0.25)'
            : '0 2px 8px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1 }}>
          #{table.table_number}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 3 }}>
          {seats} pl.
        </span>
      </div>
    </div>
  )
}

export default function TafelplanPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string

  const [sections, setSections] = useState<Section[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasUnsaved, setHasUnsaved] = useState(false)

  // Modals
  const [showAddSection, setShowAddSection] = useState(false)
  const [showAddTable, setShowAddTable] = useState(false)
  const [showEditTable, setShowEditTable] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Forms
  const [sectionForm, setSectionForm] = useState({ name: '', color: SECTION_COLORS[0] })
  const [tableForm, setTableForm] = useState({ table_number: '', seats: 4, shape: 'square' as 'square' | 'round' | 'rectangle', section_id: '' })

  // Drag state
  const dragging = useRef<{ tableId: string; startMouseX: number; startMouseY: number; origX: number; origY: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug])

  async function loadData() {
    const supabase = getSupabase()
    if (!supabase) return
    const [{ data: sectionData }, { data: tableData }] = await Promise.all([
      supabase.from('restaurant_sections').select('*').eq('tenant_slug', tenantSlug).order('sort_order'),
      supabase.from('restaurant_tables').select('*').eq('tenant_slug', tenantSlug).eq('is_active', true),
    ])
    setSections(sectionData || [])
    setTables(tableData || [])
    setLoading(false)
  }

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, table: RestaurantTable) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedTable(table)
    dragging.current = {
      tableId: table.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      origX: table.pos_x,
      origY: table.pos_y,
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - dragging.current.startMouseX
    const dy = e.clientY - dragging.current.startMouseY
    const newX = Math.max(0, dragging.current.origX + dx)
    const newY = Math.max(0, dragging.current.origY + dy)
    setTables(prev => prev.map(t =>
      t.id === dragging.current!.tableId ? { ...t, pos_x: newX, pos_y: newY } : t
    ))
    setSelectedTable(prev => prev?.id === dragging.current!.tableId ? { ...prev, pos_x: newX, pos_y: newY } : prev)
    setHasUnsaved(true)
  }, [])

  const handleMouseUp = useCallback(() => {
    dragging.current = null
  }, [])

  // Alles in één keer opslaan
  async function saveAll() {
    setSaving(true)
    const supabase = getSupabase()
    if (!supabase) { setSaving(false); return }
    await Promise.all(
      tables.map(t =>
        supabase.from('restaurant_tables').update({ pos_x: t.pos_x, pos_y: t.pos_y }).eq('id', t.id)
      )
    )
    setSaving(false)
    setHasUnsaved(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function addSection() {
    if (!sectionForm.name.trim()) return
    const supabase = getSupabase()
    if (!supabase) return
    const { data } = await supabase.from('restaurant_sections').insert({
      tenant_slug: tenantSlug,
      name: sectionForm.name.trim(),
      color: sectionForm.color,
      sort_order: sections.length,
    }).select().single()
    if (data) setSections(prev => [...prev, data])
    setSectionForm({ name: '', color: SECTION_COLORS[0] })
    setShowAddSection(false)
  }

  async function deleteSection(id: string) {
    const supabase = getSupabase()
    if (!supabase) return
    await supabase.from('restaurant_sections').delete().eq('id', id)
    setSections(prev => prev.filter(s => s.id !== id))
  }

  async function addTable() {
    if (!tableForm.table_number.trim()) return
    const supabase = getSupabase()
    if (!supabase) return
    const usedPositions = tables.map(t => ({ x: t.pos_x, y: t.pos_y }))
    let posX = 30, posY = 30
    outer: for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 8; col++) {
        const x = 30 + col * 130
        const y = 30 + row * 130
        const occupied = usedPositions.some(p => Math.abs(p.x - x) < 110 && Math.abs(p.y - y) < 110)
        if (!occupied) { posX = x; posY = y; break outer }
      }
    }
    const { data } = await supabase.from('restaurant_tables').insert({
      tenant_slug: tenantSlug,
      section_id: tableForm.section_id || null,
      table_number: tableForm.table_number.trim(),
      seats: tableForm.seats,
      shape: tableForm.shape,
      pos_x: posX,
      pos_y: posY,
      is_active: true,
    }).select().single()
    if (data) setTables(prev => [...prev, data])
    setTableForm({ table_number: '', seats: 4, shape: 'square', section_id: '' })
    setShowAddTable(false)
  }

  async function updateTable() {
    if (!selectedTable) return
    const supabase = getSupabase()
    if (!supabase) return
    const updates = {
      table_number: tableForm.table_number,
      seats: tableForm.seats,
      shape: tableForm.shape,
      section_id: tableForm.section_id || null,
    }
    await supabase.from('restaurant_tables').update(updates).eq('id', selectedTable.id)
    setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, ...updates } : t))
    setSelectedTable(prev => prev ? { ...prev, ...updates } : null)
    setShowEditTable(false)
  }

  async function deleteTable() {
    if (!selectedTable) return
    const supabase = getSupabase()
    if (!supabase) return
    await supabase.from('restaurant_tables').update({ is_active: false }).eq('id', selectedTable.id)
    setTables(prev => prev.filter(t => t.id !== selectedTable.id))
    setSelectedTable(null)
    setShowDeleteConfirm(false)
  }

  function getTableColor(table: RestaurantTable) {
    if (!table.section_id) return '#6B7280'
    const section = sections.find(s => s.id === table.section_id)
    return section?.color || '#6B7280'
  }

  const filteredTables = activeSection ? tables.filter(t => t.section_id === activeSection) : tables
  const totalSeats = tables.reduce((sum, t) => sum + t.seats, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tafelplan</h1>
          <p className="text-gray-500 mt-1">{tables.length} tafels · {totalSeats} plaatsen</p>
        </div>
        <div className="flex gap-3 items-center">
          {hasUnsaved && (
            <span className="text-sm text-amber-600 font-medium">● Niet opgeslagen</span>
          )}
          <button
            onClick={() => setShowAddSection(true)}
            className="px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            + Zone
          </button>
          <button
            onClick={() => {
              setTableForm({ table_number: `${tables.length + 1}`, seats: 4, shape: 'square', section_id: activeSection || '' })
              setShowAddTable(true)
            }}
            className="px-4 py-2 border-2 border-blue-200 text-blue-700 rounded-xl font-medium hover:bg-blue-50 transition-colors"
          >
            + Tafel
          </button>
          <button
            onClick={saveAll}
            disabled={saving}
            className={`px-6 py-2 rounded-xl font-bold transition-colors ${
              saved
                ? 'bg-green-600 text-white'
                : hasUnsaved
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-60`}
          >
            {saving ? 'Opslaan...' : saved ? '✓ Opgeslagen' : '💾 Opslaan'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Linker paneel: zones */}
        <div className="w-52 flex-shrink-0 space-y-1">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Zones</p>
          <button
            onClick={() => setActiveSection(null)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeSection === null ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0"></span>
            Alle zones
            <span className="ml-auto text-xs opacity-60">{tables.length}</span>
          </button>

          {sections.map(section => (
            <div key={section.id} className="group flex items-center gap-1">
              <button
                onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeSection === section.id ? 'text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={activeSection === section.id ? { backgroundColor: section.color } : {}}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: section.color }}></span>
                {section.name}
                <span className="ml-auto text-xs opacity-60">
                  {tables.filter(t => t.section_id === section.id).length}
                </span>
              </button>
              <button
                onClick={() => deleteSection(section.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all text-lg"
                title="Zone verwijderen"
              >×</button>
            </div>
          ))}

          {sections.length === 0 && (
            <p className="text-xs text-gray-400 px-3 pt-1">Klik op "+ Zone" voor zones zoals Terras, Binnen...</p>
          )}

          {/* Geselecteerde tafel */}
          {selectedTable && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Geselecteerde tafel</p>
              <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tafel</span>
                  <span className="font-bold">#{selectedTable.table_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Plaatsen</span>
                  <span className="font-bold">{selectedTable.seats}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Vorm</span>
                  <span className="font-bold">{selectedTable.shape === 'round' ? 'Rond' : selectedTable.shape === 'rectangle' ? 'Rechthoek' : 'Vierkant'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Zone</span>
                  <span className="font-bold">{sections.find(s => s.id === selectedTable.section_id)?.name || '—'}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setTableForm({
                      table_number: selectedTable.table_number,
                      seats: selectedTable.seats,
                      shape: selectedTable.shape,
                      section_id: selectedTable.section_id || '',
                    })
                    setShowEditTable(true)
                  }}
                  className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                >
                  Bewerken
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto">
          <div
            ref={canvasRef}
            className="relative bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl overflow-hidden select-none"
            style={{ width: '100%', height: CANVAS_HEIGHT }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setSelectedTable(null)}
          >
            {/* Grid */}
            <svg className="absolute inset-0 w-full h-full opacity-25" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94A3B8" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)"/>
            </svg>

            {filteredTables.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                <span className="text-5xl mb-3">🪑</span>
                <p className="font-medium">Nog geen tafels</p>
                <p className="text-sm mt-1">Klik op "+ Tafel" om te beginnen</p>
              </div>
            )}

            {filteredTables.map(table => (
              <div
                key={table.id}
                onMouseDown={(e) => handleMouseDown(e, table)}
                onClick={(e) => { e.stopPropagation(); setSelectedTable(table) }}
                className="absolute cursor-grab active:cursor-grabbing"
                style={{ left: table.pos_x, top: table.pos_y, zIndex: selectedTable?.id === table.id ? 10 : 1 }}
              >
                <TableWithChairs
                  table={table}
                  color={getTableColor(table)}
                  isSelected={selectedTable?.id === table.id}
                />
              </div>
            ))}

            {/* Legenda */}
            {sections.length > 0 && (
              <div className="absolute bottom-3 right-3 flex flex-wrap gap-2 max-w-xs justify-end">
                {sections.map(s => (
                  <div key={s.id} className="flex items-center gap-1.5 bg-white/85 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-medium text-gray-700 shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }}></span>
                    {s.name}
                  </div>
                ))}
              </div>
            )}

            <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-gray-500">
              Sleep tafels om te verplaatsen · Klik om te selecteren · Sla op met de knop rechtsboven
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Zone toevoegen */}
      {showAddSection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddSection(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Zone toevoegen</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
                <input
                  autoFocus
                  value={sectionForm.name}
                  onChange={e => setSectionForm(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addSection()}
                  placeholder="bv. Terras, Binnen, VIP..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kleur</label>
                <div className="flex gap-2 flex-wrap">
                  {SECTION_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setSectionForm(p => ({ ...p, color }))}
                      className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                      style={{ backgroundColor: color, outline: sectionForm.color === color ? '3px solid #1E3A5F' : 'none', outlineOffset: '2px' }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddSection(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">Annuleren</button>
                <button onClick={addSection} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Toevoegen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tafel toevoegen */}
      {showAddTable && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddTable(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Tafel toevoegen</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tafelnummer</label>
                <input
                  autoFocus
                  value={tableForm.table_number}
                  onChange={e => setTableForm(p => ({ ...p, table_number: e.target.value }))}
                  placeholder="bv. 1, 2, T1..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aantal plaatsen</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setTableForm(p => ({ ...p, seats: Math.max(1, p.seats - 1) }))} className="w-10 h-10 bg-gray-100 rounded-xl font-bold text-xl hover:bg-gray-200">−</button>
                  <span className="text-3xl font-bold text-gray-900 w-10 text-center">{tableForm.seats}</span>
                  <button onClick={() => setTableForm(p => ({ ...p, seats: Math.min(20, p.seats + 1) }))} className="w-10 h-10 bg-gray-100 rounded-xl font-bold text-xl hover:bg-gray-200">+</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vorm</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['square', 'round', 'rectangle'] as const).map(shape => (
                    <button
                      key={shape}
                      onClick={() => setTableForm(p => ({ ...p, shape }))}
                      className={`py-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                        tableForm.shape === shape ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {shape === 'square' ? '⬛ Vierkant' : shape === 'round' ? '⚫ Rond' : '▬ Rechthoek'}
                    </button>
                  ))}
                </div>
              </div>
              {sections.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
                  <select
                    value={tableForm.section_id}
                    onChange={e => setTableForm(p => ({ ...p, section_id: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">— Geen zone —</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddTable(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">Annuleren</button>
                <button onClick={addTable} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Toevoegen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tafel bewerken */}
      {showEditTable && selectedTable && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEditTable(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Tafel bewerken</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tafelnummer</label>
                <input
                  autoFocus
                  value={tableForm.table_number}
                  onChange={e => setTableForm(p => ({ ...p, table_number: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aantal plaatsen</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setTableForm(p => ({ ...p, seats: Math.max(1, p.seats - 1) }))} className="w-10 h-10 bg-gray-100 rounded-xl font-bold text-xl hover:bg-gray-200">−</button>
                  <span className="text-3xl font-bold text-gray-900 w-10 text-center">{tableForm.seats}</span>
                  <button onClick={() => setTableForm(p => ({ ...p, seats: Math.min(20, p.seats + 1) }))} className="w-10 h-10 bg-gray-100 rounded-xl font-bold text-xl hover:bg-gray-200">+</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vorm</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['square', 'round', 'rectangle'] as const).map(shape => (
                    <button
                      key={shape}
                      onClick={() => setTableForm(p => ({ ...p, shape }))}
                      className={`py-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                        tableForm.shape === shape ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {shape === 'square' ? '⬛ Vierkant' : shape === 'round' ? '⚫ Rond' : '▬ Rechthoek'}
                    </button>
                  ))}
                </div>
              </div>
              {sections.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
                  <select
                    value={tableForm.section_id}
                    onChange={e => setTableForm(p => ({ ...p, section_id: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">— Geen zone —</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEditTable(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">Annuleren</button>
                <button onClick={updateTable} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Opslaan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Verwijderen */}
      {showDeleteConfirm && selectedTable && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <span className="text-5xl mb-4 block">🗑️</span>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Tafel verwijderen?</h3>
            <p className="text-gray-600 mb-6">Tafel #{selectedTable.table_number} wordt verwijderd.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">Annuleren</button>
              <button onClick={deleteTable} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Verwijderen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
