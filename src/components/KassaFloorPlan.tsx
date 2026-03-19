'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export type TableShape = 'ROUND' | 'SQUARE' | 'RECTANGLE'
export type TableStatus = 'FREE' | 'OCCUPIED' | 'UNPAID'

export interface KassaTable {
  id: string
  number: string
  seats: number
  shape: TableShape
  x: number
  y: number
  rotation: number
  status: TableStatus
}

const STATUS_COLORS: Record<TableStatus, string> = {
  FREE: '#22c55e',
  OCCUPIED: '#3b82f6',
  UNPAID: '#f59e0b',
}
const STATUS_LABELS: Record<TableStatus, string> = {
  FREE: 'Vrij',
  OCCUPIED: 'Bezet',
  UNPAID: 'Onbetaald',
}

interface Props {
  tenant: string
  onSelectTable: (tableNumber: string) => void
  onClose: () => void
}

function makeId() { return Math.random().toString(36).slice(2, 10) }

export type DecorType = 'bar_segment' | 'plant'
export interface DecorItem {
  id: string
  type: DecorType
  x: number
  y: number
  rotation: number
}

function DecorSVG({ item, isSelected }: { item: DecorItem; isSelected: boolean }) {
  if (item.type === 'plant') {
    return (
      <svg width={60} height={60} style={{ overflow: 'visible' }}>
        <circle cx={30} cy={30} r={28} fill="#2d6a2d" stroke={isSelected ? '#fff' : '#1a3d1a'} strokeWidth={isSelected ? 3 : 2} filter="url(#pshadow)" />
        <circle cx={22} cy={22} r={12} fill="#3a8a3a" />
        <circle cx={38} cy={20} r={10} fill="#4aaa4a" />
        <circle cx={30} cy={35} r={11} fill="#3a8a3a" />
        <circle cx={18} cy={34} r={9} fill="#2d6a2d" />
        <circle cx={42} cy={32} r={9} fill="#2d6a2d" />
        <rect x={27} y={42} width={6} height={10} rx={2} fill="#8B4513" />
        <defs>
          <filter id="pshadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.4" />
          </filter>
        </defs>
      </svg>
    )
  }
  // bar_segment: balk + 2 krukken aan de voorkant
  const bw = 140; const bh = 44
  const stoolR = 14
  return (
    <svg width={bw} height={bh + stoolR * 2 + 10} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="bar-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6b6b6b" />
          <stop offset="40%" stopColor="#4a4a4a" />
          <stop offset="100%" stopColor="#2a2a2a" />
        </linearGradient>
        <filter id="bshadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodOpacity="0.5" />
        </filter>
      </defs>
      {/* Bar balk */}
      <rect x={0} y={stoolR * 2 + 6} width={bw} height={bh} rx={6}
        fill="url(#bar-grad)" stroke={isSelected ? '#60a5fa' : '#222'} strokeWidth={isSelected ? 3 : 2} filter="url(#bshadow)" />
      {/* Rand bovenop */}
      <rect x={0} y={stoolR * 2 + 6} width={bw} height={8} rx={3} fill="#888" opacity={0.5} />
      {/* Label */}
      <text x={bw / 2} y={stoolR * 2 + 6 + bh / 2 + 5} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={11} fontWeight="bold">TOOG</text>
      {/* Kruk 1 */}
      <circle cx={bw * 0.28} cy={stoolR + 2} r={stoolR} fill="#8B6914" stroke="#5a4010" strokeWidth={2} />
      <circle cx={bw * 0.28} cy={stoolR + 2} r={stoolR - 5} fill="#a07820" opacity={0.6} />
      {/* Kruk 2 */}
      <circle cx={bw * 0.72} cy={stoolR + 2} r={stoolR} fill="#8B6914" stroke="#5a4010" strokeWidth={2} />
      <circle cx={bw * 0.72} cy={stoolR + 2} r={stoolR - 5} fill="#a07820" opacity={0.6} />
    </svg>
  )
}

function TableSVG({ table, isSelected, onClick }: {
  table: KassaTable
  isSelected: boolean
  onClick: (e?: React.MouseEvent) => void
}) {
  const seats = table.seats
  const color = STATUS_COLORS[table.status]

  // Table dimensions
  const tableSize = 90
  const chairW = 26
  const chairH = 22
  const gap = 14 // distance from table edge to chair

  // Generate chair positions
  type Chair = { x: number; y: number; angle: number }
  const chairs: Chair[] = []

  if (table.shape === 'ROUND') {
    const radius = tableSize / 2
    const dist = radius + gap + chairH / 2
    for (let i = 0; i < seats; i++) {
      const angle = (i * 360) / seats - 90
      const rad = (angle * Math.PI) / 180
      chairs.push({ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, angle })
    }
  } else if (table.shape === 'SQUARE') {
    const half = tableSize / 2
    const dist = half + gap + chairH / 2
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
  } else {
    // RECTANGLE
    const tw = tableSize * 1.7
    const th = tableSize * 0.65
    const perLong = Math.ceil(seats / 2)
    const distTop = th / 2 + gap + chairH / 2
    const distSide = tw / 2 + gap + chairH / 2
    let placed = 0
    // top
    for (let i = 0; i < perLong && placed < seats; i++) {
      const offset = (i - (perLong - 1) / 2) * (chairW + 6)
      chairs.push({ x: offset, y: -distTop, angle: -90 })
      placed++
    }
    // bottom
    for (let i = 0; i < perLong && placed < seats; i++) {
      const offset = (i - (perLong - 1) / 2) * (chairW + 6)
      chairs.push({ x: offset, y: distTop, angle: 90 })
      placed++
    }
    // sides if needed
    if (placed < seats) {
      chairs.push({ x: -distSide, y: 0, angle: 180 })
      placed++
    }
    if (placed < seats) {
      chairs.push({ x: distSide, y: 0, angle: 0 })
    }
  }

  // SVG canvas size
  const pad = 80
  const tw = table.shape === 'RECTANGLE' ? tableSize * 1.7 : tableSize
  const th = table.shape === 'RECTANGLE' ? tableSize * 0.65 : tableSize
  const svgW = tw + pad * 2 + 40
  const svgH = th + pad * 2 + 40
  const cx = svgW / 2
  const cy = svgH / 2

  return (
    <svg
      width={svgW}
      height={svgH}
      onClick={onClick}
      style={{ cursor: 'pointer', overflow: 'visible', display: 'block' }}
    >
      {/* Chairs */}
      {chairs.map((c, i) => (
        <g key={i} transform={`translate(${cx + c.x}, ${cy + c.y}) rotate(${c.angle})`}>
          {/* Backrest */}
          <rect
            x={-chairW / 2 + 2}
            y={-chairH / 2}
            width={chairW - 4}
            height={7}
            rx={3}
            fill="#8B4513"
            stroke="#5D3A1A"
            strokeWidth={1}
          />
          {/* Seat */}
          <rect
            x={-chairW / 2}
            y={-chairH / 2 + 7}
            width={chairW}
            height={chairH - 7}
            rx={3}
            fill="#A0522D"
            stroke="#5D3A1A"
            strokeWidth={1}
          />
        </g>
      ))}

      {/* Table */}
      {table.shape === 'ROUND' ? (
        <ellipse
          cx={cx} cy={cy}
          rx={tableSize / 2} ry={tableSize / 2}
          fill="url(#wood-round)"
          stroke={isSelected ? color : '#5D3A1A'}
          strokeWidth={isSelected ? 4 : 3}
          filter="url(#shadow)"
        />
      ) : table.shape === 'RECTANGLE' ? (
        <rect
          x={cx - tw / 2} y={cy - th / 2}
          width={tw} height={th}
          rx={10}
          fill="url(#wood-rect)"
          stroke={isSelected ? color : '#5D3A1A'}
          strokeWidth={isSelected ? 4 : 3}
          filter="url(#shadow)"
        />
      ) : (
        <rect
          x={cx - tableSize / 2} y={cy - tableSize / 2}
          width={tableSize} height={tableSize}
          rx={10}
          fill="url(#wood-rect)"
          stroke={isSelected ? color : '#5D3A1A'}
          strokeWidth={isSelected ? 4 : 3}
          filter="url(#shadow)"
        />
      )}

      {/* Table number */}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize={20} fontWeight="bold" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
        {table.number}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize={12}>
        {seats}p
      </text>

      {/* Status dot */}
      <circle cx={cx + (table.shape === 'RECTANGLE' ? tw / 2 : tableSize / 2) - 4} cy={cy - (table.shape === 'RECTANGLE' ? th / 2 : tableSize / 2) + 4} r={8} fill={color} stroke="white" strokeWidth={2} />

      {/* Defs */}
      <defs>
        <radialGradient id="wood-round" cx="35%" cy="35%">
          <stop offset="0%" stopColor="#D2691E" />
          <stop offset="50%" stopColor="#A0522D" />
          <stop offset="100%" stopColor="#654321" />
        </radialGradient>
        <linearGradient id="wood-rect" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D2691E" />
          <stop offset="40%" stopColor="#A0522D" />
          <stop offset="100%" stopColor="#654321" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.5" />
        </filter>
      </defs>
    </svg>
  )
}

export default function KassaFloorPlan({ tenant, onSelectTable, onClose }: Props) {
  const storageKey = `vysion_tables_${tenant}`
  const [tables, setTables] = useState<KassaTable[]>([])
  const [selected, setSelected] = useState<KassaTable | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addNumber, setAddNumber] = useState('')
  const [addSeats, setAddSeats] = useState(4)
  const [addShape, setAddShape] = useState<TableShape>('SQUARE')
  const decorKey = `vysion_decor_${tenant}`
  const [decors, setDecors] = useState<DecorItem[]>([])
  const [selectedDecor, setSelectedDecor] = useState<DecorItem | null>(null)

  const draggingId = useRef<string | null>(null)
  const draggingType = useRef<'table' | 'decor'>('table')
  const dragOffset = useRef({ x: 0, y: 0 })
  const dragMoved = useRef(false)
  const pointerStart = useRef({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const load = async () => {
      // Tafels laden
      const { data: tData } = await supabase
        .from('floor_plan_tables')
        .select('data')
        .eq('tenant_slug', tenant)
        .single()
      if (tData?.data) setTables(tData.data)
      else {
        try { const raw = localStorage.getItem(storageKey); if (raw) setTables(JSON.parse(raw)) } catch { /* empty */ }
      }
      // Decor laden
      const { data: dData } = await supabase
        .from('floor_plan_decor')
        .select('data')
        .eq('tenant_slug', tenant)
        .single()
      if (dData?.data) setDecors(dData.data)
      else {
        try { const raw = localStorage.getItem(decorKey); if (raw) setDecors(JSON.parse(raw)) } catch { /* empty */ }
      }
    }
    load()
  }, [tenant, storageKey, decorKey])

  const save = (updated: KassaTable[]) => {
    setTables(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
    supabase.from('floor_plan_tables').upsert({ tenant_slug: tenant, data: updated }, { onConflict: 'tenant_slug' })
  }

  const saveDecor = (updated: DecorItem[]) => {
    setDecors(updated)
    localStorage.setItem(decorKey, JSON.stringify(updated))
    supabase.from('floor_plan_decor').upsert({ tenant_slug: tenant, data: updated }, { onConflict: 'tenant_slug' })
  }

  const addDecor = (type: DecorType) => {
    const d: DecorItem = { id: makeId(), type, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, rotation: 0 }
    saveDecor([...decors, d])
  }

  const deleteDecor = (id: string) => {
    saveDecor(decors.filter(d => d.id !== id))
    setSelectedDecor(null)
  }

  const rotateDecor = (id: string, delta: number) => {
    const updated = decors.map(d => d.id === id ? { ...d, rotation: (d.rotation + delta + 360) % 360 } : d)
    saveDecor(updated)
    const sel = updated.find(d => d.id === id)
    if (sel) setSelectedDecor(sel)
  }

  const addTable = () => {
    if (!addNumber.trim()) return
    const t: KassaTable = {
      id: makeId(),
      number: addNumber.trim(),
      seats: addSeats,
      shape: addShape,
      x: 15 + Math.random() * 60,
      y: 15 + Math.random() * 60,
      rotation: 0,
      status: 'FREE',
    }
    save([...tables, t])
    setAddNumber('')
    setAddSeats(4)
    setShowAddModal(false)
  }

  const deleteTable = (id: string) => {
    save(tables.filter(t => t.id !== id))
    setSelected(null)
  }

  const rotate = (id: string, delta: number) => {
    const updated = tables.map(t => t.id === id ? { ...t, rotation: (t.rotation + delta + 360) % 360 } : t)
    save(updated)
    const sel = updated.find(t => t.id === id)
    if (sel) setSelected(sel)
  }

  // Pointer events — werkt op iPad (touch) én desktop (mouse)
  // Refs worden gebruikt om stale closure problemen te vermijden
  const handlePointerDown = (e: React.PointerEvent, id: string, type: 'table' | 'decor') => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const floor = document.querySelector('.floor-plan') as HTMLElement
    if (!floor) return
    const rect = floor.getBoundingClientRect()
    const item = type === 'table' ? tables.find(t => t.id === id)! : decors.find(d => d.id === id)!
    draggingId.current = id
    draggingType.current = type
    dragMoved.current = false
    pointerStart.current = { x: e.clientX, y: e.clientY }
    dragOffset.current = {
      x: e.clientX - rect.left - (item.x / 100) * rect.width,
      y: e.clientY - rect.top - (item.y / 100) * rect.height,
    }
    setIsDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId.current) return
    const dx = Math.abs(e.clientX - pointerStart.current.x)
    const dy = Math.abs(e.clientY - pointerStart.current.y)
    if (dx < 8 && dy < 8) return
    dragMoved.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(5, Math.min(92, ((e.clientX - rect.left - dragOffset.current.x) / rect.width) * 100))
    const y = Math.max(5, Math.min(92, ((e.clientY - rect.top - dragOffset.current.y) / rect.height) * 100))
    if (draggingType.current === 'table') {
      setTables(prev => prev.map(t => t.id === draggingId.current ? { ...t, x, y } : t))
    } else {
      setDecors(prev => prev.map(d => d.id === draggingId.current ? { ...d, x, y } : d))
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingId.current) return
    if (draggingType.current === 'table') {
      localStorage.setItem(storageKey, JSON.stringify(tables))
      supabase.from('floor_plan_tables').upsert({ tenant_slug: tenant, data: tables }, { onConflict: 'tenant_slug' })
    } else {
      localStorage.setItem(decorKey, JSON.stringify(decors))
      supabase.from('floor_plan_decor').upsert({ tenant_slug: tenant, data: decors }, { onConflict: 'tenant_slug' })
    }
    draggingId.current = null
    setIsDragging(false)
    setTimeout(() => { dragMoved.current = false }, 0)
  }

  return (
    <div className="fixed inset-0 bg-[#1a1a2e] z-50 flex flex-col">
      {/* Header */}
      <div className="h-14 flex-shrink-0 bg-[#16213e] border-b border-white/10 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-bold text-lg">Kies Tafel</h2>
          <span className="text-white/50 text-sm">
            {tables.filter(t => t.status === 'FREE').length}/{tables.length} vrij
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors">
            🪑 Tafel
          </button>
          <button onClick={() => addDecor('bar_segment')}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-semibold transition-colors">
            🍺 Toogstuk
          </button>
          <button onClick={() => addDecor('plant')}
            className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-semibold transition-colors">
            🌿 Plant
          </button>
          <button onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors">
            ✕ Sluiten
          </button>
        </div>
      </div>

      {/* Floor + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Floor plan */}
        <div
          className="floor-plan flex-1 relative overflow-hidden select-none"
          style={{
            backgroundColor: '#4a4a4a',
            backgroundImage: `
              linear-gradient(to right, rgba(200,200,200,0.25) 0px, rgba(200,200,200,0.25) 2px, transparent 2px),
              linear-gradient(to bottom, rgba(200,200,200,0.25) 0px, rgba(200,200,200,0.25) 2px, transparent 2px)
            `,
            backgroundSize: '100px 100px',
            cursor: isDragging ? 'grabbing' : 'default',
          touchAction: 'none',
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => { if (!isDragging) { setSelected(null); setSelectedDecor(null) } }}
        >
          {/* Decor items (achtergrond laag) */}
          {decors.map(d => (
            <div key={d.id} className="absolute"
              style={{
                left: `${d.x}%`, top: `${d.y}%`,
                transform: `translate(-50%, -50%) rotate(${d.rotation}deg)`,
                zIndex: selectedDecor?.id === d.id ? 9 : 0,
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none',
              }}
              onPointerDown={(e) => handlePointerDown(e, d.id, 'decor')}
              onPointerUp={(e) => {
                e.stopPropagation()
                handlePointerUp(e)
                if (!dragMoved.current) {
                  setSelectedDecor(prev => prev?.id === d.id ? null : d)
                  setSelected(null)
                }
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <DecorSVG item={d} isSelected={selectedDecor?.id === d.id} />
            </div>
          ))}

          {tables.map(t => (
            <div
              key={t.id}
              className="absolute"
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                transform: `translate(-50%, -50%) rotate(${t.rotation}deg)`,
                zIndex: selected?.id === t.id ? 10 : 1,
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none',
              }}
              onPointerDown={(e) => handlePointerDown(e, t.id, 'table')}
              onPointerUp={(e) => {
                e.stopPropagation()
                handlePointerUp(e)
                if (!dragMoved.current) {
                  setSelected(prev => prev?.id === t.id ? null : t)
                  setSelectedDecor(null)
                }
              }}
              onClick={(e) => { e.stopPropagation() }}
            >
              <TableSVG
                table={t}
                isSelected={selected?.id === t.id}
                onClick={(e) => { e?.stopPropagation() }}
              />
            </div>
          ))}

          {tables.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
              <span className="text-6xl mb-4">🪑</span>
              <p className="text-lg font-semibold">Nog geen tafels</p>
              <button onClick={() => setShowAddModal(true)}
                className="mt-4 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors">
                + Voeg tafel toe
              </button>
            </div>
          )}
        </div>

        {/* Decor Sidebar */}
        {selectedDecor && !selected && (
          <div className="w-64 bg-[#16213e] border-l border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">{selectedDecor.type === 'plant' ? '🌿 Plant' : '🍺 Toogstuk'}</h3>
              <button onClick={() => setSelectedDecor(null)} className="text-white/50 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-4 border-b border-white/10">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Draaien</p>
              <div className="flex gap-2">
                <button onClick={() => rotateDecor(selectedDecor.id, -45)}
                  className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-lg">↺</button>
                <button onClick={() => rotateDecor(selectedDecor.id, 45)}
                  className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-lg">↻</button>
                <button onClick={() => rotateDecor(selectedDecor.id, -selectedDecor.rotation)}
                  className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold">Reset</button>
              </div>
            </div>
            <div className="p-4 mt-auto">
              <button onClick={() => deleteDecor(selectedDecor.id)}
                className="w-full py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-semibold">
                🗑 Verwijder
              </button>
            </div>
          </div>
        )}

        {/* Tafel Sidebar */}
        {selected && (
          <div className="w-72 bg-[#16213e] border-l border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-white font-bold text-xl">Tafel {selected.number}</h3>
              <button onClick={() => setSelected(null)} className="text-white/50 hover:text-white text-xl">✕</button>
            </div>

            <div className="p-4 border-b border-white/10">
              <div className="px-4 py-2 rounded-xl text-center font-bold text-white text-sm"
                style={{ backgroundColor: STATUS_COLORS[selected.status] }}>
                {STATUS_LABELS[selected.status]}
              </div>
              <p className="text-white/50 text-xs text-center mt-2">{selected.seats} plaatsen</p>
            </div>

            {/* Rotatie */}
            <div className="p-4 border-b border-white/10">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Draaien</p>
              <div className="flex gap-2">
                <button onClick={() => rotate(selected.id, -45)}
                  className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-lg transition-colors">↺</button>
                <button onClick={() => rotate(selected.id, 45)}
                  className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-lg transition-colors">↻</button>
                <button onClick={() => rotate(selected.id, -selected.rotation)}
                  className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors">Reset</button>
              </div>
            </div>

            {/* Status toggle */}
            <div className="p-4 border-b border-white/10 space-y-2">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Status</p>
              {(['FREE', 'OCCUPIED', 'UNPAID'] as TableStatus[]).map(s => (
                <button key={s}
                  onClick={() => {
                    const updated = tables.map(t => t.id === selected.id ? { ...t, status: s } : t)
                    save(updated)
                    setSelected({ ...selected, status: s })
                  }}
                  className="w-full py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={selected.status === s
                    ? { backgroundColor: STATUS_COLORS[s], color: 'white' }
                    : { backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-2 mt-auto">
              <button
                onClick={() => { onSelectTable(selected.number); onClose() }}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors">
                🛒 Nieuwe bestelling
              </button>
              <button onClick={() => deleteTable(selected.id)}
                className="w-full py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-semibold transition-colors">
                🗑 Verwijder tafel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="h-10 flex-shrink-0 bg-[#16213e] border-t border-white/10 flex items-center justify-center gap-6 text-sm text-white/60">
        {(Object.entries(STATUS_COLORS) as [TableStatus, string][]).map(([s, c]) => (
          <div key={s} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
            <span>{STATUS_LABELS[s]}</span>
          </div>
        ))}
        <span className="text-white/30 ml-4 text-xs">Sleep om te verplaatsen • ↺↻ om te draaien</span>
      </div>

      {/* Add table modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Tafel toevoegen</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Tafelnummer *</label>
                <input autoFocus value={addNumber} onChange={e => setAddNumber(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTable()}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#3C4D6B] outline-none text-xl font-bold text-center"
                  placeholder="bv. 1, 2A, Toog" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Aantal plaatsen</label>
                <div className="grid grid-cols-5 gap-2">
                  {[2, 4, 6, 8, 10].map(n => (
                    <button key={n} onClick={() => setAddSeats(n)}
                      className={`py-2 rounded-xl font-bold transition-colors ${addSeats === n ? 'bg-[#3C4D6B] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Vorm</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['SQUARE', '⬛ Vierkant'], ['ROUND', '⭕ Rond'], ['RECTANGLE', '▬ Rechthoek']] as const).map(([s, label]) => (
                    <button key={s} onClick={() => setAddShape(s)}
                      className={`py-2 rounded-xl text-xs font-bold transition-colors ${addShape === s ? 'bg-[#3C4D6B] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-semibold text-gray-700">Annuleer</button>
              <button onClick={addTable} className="flex-[2] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors">Toevoegen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
