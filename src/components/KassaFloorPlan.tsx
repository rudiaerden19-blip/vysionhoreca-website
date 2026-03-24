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

interface SimpleCartItem {
  product: { name: string; price: number }
  quantity: number
  choices?: { choiceName: string; price: number }[]
}

interface Props {
  tenant: string
  onSelectTable: (tableNumber: string) => void
  onClose: () => void
  tableOrders?: Record<string, SimpleCartItem[]>
}

function makeId() { return Math.random().toString(36).slice(2, 10) }

/** Posities zijn % van het canvas (ongeveer 1–99). Corrupte waarden buiten 0–100 worden geneutraliseerd. */
function clampPct(v: unknown, fallback = 50): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  if (!Number.isFinite(n)) return fallback
  if (n >= 0 && n <= 100) return Math.max(1, Math.min(99, n))
  return fallback
}

function sanitizeTables(list: KassaTable[]): KassaTable[] {
  return list.map(t => ({ ...t, x: clampPct(t.x), y: clampPct(t.y) }))
}

function sanitizeDecors(list: DecorItem[]): DecorItem[] {
  return list.map(d => ({ ...d, x: clampPct(d.x), y: clampPct(d.y) }))
}

export type DecorType = 'bar_segment' | 'plant'
export interface DecorItem {
  id: string
  type: DecorType
  x: number
  y: number
  rotation: number
  stool1?: string
  stool2?: string
}

function DecorSVG({ item, isSelected, orderedStools = new Set(), stoolStatuses = {}, getStoolStatus }: { item: DecorItem; isSelected: boolean; orderedStools?: Set<string>; stoolStatuses?: Record<string, TableStatus>; getStoolStatus?: (id: string) => TableStatus }) {
  if (item.type === 'plant') {
    return (
      <svg width={80} height={100} style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="pot-grad" cx="40%" cy="30%">
            <stop offset="0%" stopColor="#c1440e" />
            <stop offset="100%" stopColor="#7a2a08" />
          </radialGradient>
          <radialGradient id="leaf1" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#5dbf3f" />
            <stop offset="100%" stopColor="#2d7a1a" />
          </radialGradient>
          <filter id="ps" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodOpacity="0.45" />
          </filter>
        </defs>
        {/* Pot */}
        <rect x={22} y={68} width={36} height={6} rx={3} fill="#8B3A0A" />
        <path d="M18 74 L24 96 L56 96 L62 74 Z" fill="url(#pot-grad)" rx={4} />
        <ellipse cx={40} cy={74} rx={22} ry={5} fill="#c1440e" opacity={0.8} />
        <ellipse cx={40} cy={74} rx={18} ry={3.5} fill="#a03808" opacity={0.5} />
        {/* Aarde */}
        <ellipse cx={40} cy={68} rx={16} ry={4} fill="#3d1f00" />
        {/* Bladeren groot */}
        <ellipse cx={40} cy={38} rx={22} ry={24} fill="url(#leaf1)" filter="url(#ps)" />
        <ellipse cx={24} cy={44} rx={14} ry={18} fill="#3a9a20" transform="rotate(-20,24,44)" />
        <ellipse cx={56} cy={44} rx={14} ry={18} fill="#3a9a20" transform="rotate(20,56,44)" />
        <ellipse cx={40} cy={22} rx={12} ry={16} fill="#5dbf3f" />
        {/* Highlights */}
        <ellipse cx={34} cy={30} rx={5} ry={8} fill="#80e050" opacity={0.4} transform="rotate(-15,34,30)" />
        <ellipse cx={46} cy={28} rx={4} ry={7} fill="#80e050" opacity={0.3} transform="rotate(10,46,28)" />
        {/* Geselecteerd kader */}
        {isSelected && <ellipse cx={40} cy={38} rx={25} ry={27} fill="none" stroke="#60a5fa" strokeWidth={3} strokeDasharray="6 3" />}
      </svg>
    )
  }
  // bar_segment: balk + 2 krukken aan de voorkant
  const bw = 140; const bh = 44
  const stoolR = 16
  const s1 = item.stool1 || '?'
  const s2 = item.stool2 || '?'
  const getColor = (stoolId: string) => {
    const status = getStoolStatus ? getStoolStatus(stoolId) : (orderedStools.has(stoolId) ? 'OCCUPIED' : 'FREE')
    return STATUS_COLORS[status]
  }
  const stool1Color = getColor(s1)
  const stool2Color = getColor(s2)
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
      <circle cx={bw * 0.28} cy={stoolR + 2} r={stoolR} fill={stool1Color} stroke="rgba(0,0,0,0.4)" strokeWidth={2} />
      <circle cx={bw * 0.28} cy={stoolR + 2} r={stoolR - 5} fill="rgba(255,255,255,0.25)" />
      <text x={bw * 0.28} y={stoolR + 2 + 5} textAnchor="middle" fill="white" fontSize={11} fontWeight="bold">{s1}</text>
      {/* Kruk 2 */}
      <circle cx={bw * 0.72} cy={stoolR + 2} r={stoolR} fill={stool2Color} stroke="rgba(0,0,0,0.4)" strokeWidth={2} />
      <circle cx={bw * 0.72} cy={stoolR + 2} r={stoolR - 5} fill="rgba(255,255,255,0.25)" />
      <text x={bw * 0.72} y={stoolR + 2 + 5} textAnchor="middle" fill="white" fontSize={11} fontWeight="bold">{s2}</text>
    </svg>
  )
}

function TableSVG({ table, isSelected, onClick, effectiveStatus }: {
  table: KassaTable
  isSelected: boolean
  onClick: (e?: React.MouseEvent) => void
  effectiveStatus?: TableStatus
}) {
  const seats = table.seats
  const color = STATUS_COLORS[effectiveStatus ?? table.status]

  // Table dimensions
  const tableSize = 90
  const chairW = 26
  const chairH = 22
  const gap = 14 // distance from table edge to chair

  // Generate chair positions
  type Chair = { x: number; y: number; angle: number }
  const chairs: Chair[] = []

  if (table.shape === 'ROUND') {
    // 2 stoelen: exact tegenover (top + bottom)
    if (seats === 2) {
      const dist = tableSize / 2 + gap + chairH / 2
      chairs.push({ x: 0, y: -dist, angle: -90 })
      chairs.push({ x: 0, y:  dist, angle:  90 })
    } else {
      const radius = tableSize / 2
      const dist = radius + gap + chairH / 2
      for (let i = 0; i < seats; i++) {
        const angle = (i * 360) / seats - 90
        const rad = (angle * Math.PI) / 180
        chairs.push({ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, angle })
      }
    }
  } else if (table.shape === 'SQUARE') {
    const half = tableSize / 2
    const dist = half + gap + chairH / 2
    // 2 stoelen: altijd tegenover mekaar (top + bottom)
    if (seats === 2) {
      chairs.push({ x: 0, y: -dist, angle: -90 })
      chairs.push({ x: 0, y:  dist, angle:  90 })
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
      {/* Chairs — bovenaanzicht echte stoelen */}
      {chairs.map((c, i) => (
        <g key={i} transform={`translate(${cx + c.x}, ${cy + c.y}) rotate(${c.angle})`}>
          {/* Schaduw */}
          <rect x={-chairW / 2 + 1} y={-chairH / 2 + 2} width={chairW} height={chairH + 4} rx={5} fill="rgba(0,0,0,0.35)" />
          {/* Rugsteun — dik en donker bovenaan */}
          <rect x={-chairW / 2} y={-chairH / 2} width={chairW} height={9} rx={4} fill="#888" stroke="#555" strokeWidth={1} />
          {/* Rugleuning highlight */}
          <rect x={-chairW / 2 + 3} y={-chairH / 2 + 2} width={chairW - 6} height={3} rx={2} fill="rgba(255,255,255,0.3)" />
          {/* Zitting — lichter, iets breder */}
          <rect x={-chairW / 2} y={-chairH / 2 + 10} width={chairW} height={chairH - 8} rx={4} fill="#bbb" stroke="#888" strokeWidth={1} />
          {/* Zitting glans */}
          <rect x={-chairW / 2 + 4} y={-chairH / 2 + 12} width={chairW - 12} height={4} rx={2} fill="rgba(255,255,255,0.35)" />
          {/* Pootjes (kleine hoekjes) */}
          <rect x={-chairW / 2 - 1} y={-chairH / 2 + chairH - 2} width={5} height={4} rx={1} fill="#777" />
          <rect x={chairW / 2 - 4} y={-chairH / 2 + chairH - 2} width={5} height={4} rx={1} fill="#777" />
        </g>
      ))}

      {/* Tafel — zelfde grijze stijl als toog */}
      {table.shape === 'ROUND' ? (
        <ellipse cx={cx} cy={cy} rx={tableSize / 2} ry={tableSize / 2}
          fill="url(#table-grad-round)"
          stroke={isSelected ? color : '#333'}
          strokeWidth={isSelected ? 4 : 2}
          filter="url(#shadow)"
        />
      ) : table.shape === 'RECTANGLE' ? (
        <rect x={cx - tw / 2} y={cy - th / 2} width={tw} height={th} rx={10}
          fill="url(#table-grad-rect)"
          stroke={isSelected ? color : '#333'}
          strokeWidth={isSelected ? 4 : 2}
          filter="url(#shadow)"
        />
      ) : (
        <rect x={cx - tableSize / 2} y={cy - tableSize / 2} width={tableSize} height={tableSize} rx={10}
          fill="url(#table-grad-rect)"
          stroke={isSelected ? color : '#333'}
          strokeWidth={isSelected ? 4 : 2}
          filter="url(#shadow)"
        />
      )}

      {/* Glans op tafel */}
      {table.shape === 'ROUND'
        ? <ellipse cx={cx - 12} cy={cy - 14} rx={16} ry={10} fill="rgba(255,255,255,0.08)" />
        : <rect x={cx - (tw / 2) + 8} y={cy - (th / 2) + 6} width={tw * 0.35} height={th * 0.25} rx={4} fill="rgba(255,255,255,0.07)" />
      }

      {/* Tafelnummer */}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize={20} fontWeight="bold" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
        {table.number}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={12}>
        {seats}p
      </text>

      {/* Status dot */}
      <circle cx={cx + (table.shape === 'RECTANGLE' ? tw / 2 : tableSize / 2) - 4} cy={cy - (table.shape === 'RECTANGLE' ? th / 2 : tableSize / 2) + 4} r={8} fill={color} stroke="white" strokeWidth={2} />

      {/* Defs */}
      <defs>
        <linearGradient id="table-grad-round" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6b6b6b" />
          <stop offset="40%" stopColor="#4a4a4a" />
          <stop offset="100%" stopColor="#2a2a2a" />
        </linearGradient>
        <linearGradient id="table-grad-rect" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6b6b6b" />
          <stop offset="40%" stopColor="#4a4a4a" />
          <stop offset="100%" stopColor="#2a2a2a" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.5" />
        </filter>
      </defs>
    </svg>
  )
}

export default function KassaFloorPlan({ tenant, onSelectTable, onClose, tableOrders = {} }: Props) {
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
  const [showAddBarModal, setShowAddBarModal] = useState(false)
  const [addStool1, setAddStool1] = useState('K1')
  const [addStool2, setAddStool2] = useState('K2')
  const [editStoolVals, setEditStoolVals] = useState({ s1: '', s2: '' })
  // Kruk statussen: { "K1": "FREE"|"OCCUPIED"|"UNPAID", ... }
  const stoolStatusKey = `vysion_stool_status_${tenant}`
  const [stoolStatuses, setStoolStatuses] = useState<Record<string, TableStatus>>({})

  const [isLocked, setIsLocked] = useState(true)
  // Pan offset: verschuift het hele canvas — opgeslagen per tenant in localStorage
  const panKey = `vysion_floor_pan_${tenant}`
  const [panX, setPanX] = useState(() => {
    try { const s = localStorage.getItem(`vysion_floor_pan_${tenant}`); return s ? JSON.parse(s).x : 0 } catch { return 0 }
  })
  const [panY, setPanY] = useState(() => {
    try { const s = localStorage.getItem(`vysion_floor_pan_${tenant}`); return s ? JSON.parse(s).y : 0 } catch { return 0 }
  })
  const autoCenteredRef = useRef(false) // Alleen eerste keer auto-centeren
  const floorRef = useRef<HTMLDivElement>(null)

  const draggingId = useRef<string | null>(null)
  const draggingType = useRef<'table' | 'decor' | 'canvas'>('table')
  const dragOffset = useRef({ x: 0, y: 0 })
  const dragMoved = useRef(false)
  const pointerStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  // ── Helpers: parse floor_plan_decor (oud: array, nieuw: {items, stool_statuses}) ──
  const parseDecorData = (raw: unknown) => {
    if (!raw) return { items: [] as DecorItem[], statuses: {} as Record<string, TableStatus> }
    if (Array.isArray(raw)) return { items: raw as DecorItem[], statuses: {} }
    const obj = raw as { items?: DecorItem[]; stool_statuses?: Record<string, TableStatus> }
    return { items: obj.items || [], statuses: obj.stool_statuses || {} }
  }

  // ── Initieel laden vanuit Supabase ────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      // Tafels: localStorage eerst (instant), Supabase alleen als localStorage leeg is
      const localTables = (() => { try { const r = localStorage.getItem(storageKey); return r ? JSON.parse(r) : null } catch { return null } })()
      if (localTables) {
        const fixed = sanitizeTables(localTables as KassaTable[])
        setTables(fixed)
        if (JSON.stringify(fixed) !== JSON.stringify(localTables)) {
          localStorage.setItem(storageKey, JSON.stringify(fixed))
          void supabase.from('floor_plan_tables').upsert({ tenant_slug: tenant, data: fixed }, { onConflict: 'tenant_slug' })
        }
      } else {
        const { data: tData } = await supabase
          .from('floor_plan_tables')
          .select('data')
          .eq('tenant_slug', tenant)
          .single()
        if (tData?.data) {
          const raw = tData.data as KassaTable[]
          const fixed = sanitizeTables(raw)
          setTables(fixed)
          localStorage.setItem(storageKey, JSON.stringify(fixed))
          if (JSON.stringify(fixed) !== JSON.stringify(raw)) {
            void supabase.from('floor_plan_tables').upsert({ tenant_slug: tenant, data: fixed }, { onConflict: 'tenant_slug' })
          }
        }
      }
      // Decor: zelfde logica
      const localDecor = (() => { try { const r = localStorage.getItem(decorKey); return r ? JSON.parse(r) : null } catch { return null } })()
      const localStoolStatus = (() => { try { const r = localStorage.getItem(stoolStatusKey); return r ? JSON.parse(r) : null } catch { return null } })()
      if (localDecor) {
        const fixedD = sanitizeDecors(localDecor as DecorItem[])
        setDecors(fixedD)
        if (JSON.stringify(fixedD) !== JSON.stringify(localDecor)) {
          localStorage.setItem(decorKey, JSON.stringify(fixedD))
        }
        if (localStoolStatus) setStoolStatuses(localStoolStatus)
      } else {
        const { data: dData } = await supabase
          .from('floor_plan_decor')
          .select('data')
          .eq('tenant_slug', tenant)
          .single()
        if (dData?.data) {
          const { items, statuses } = parseDecorData(dData.data)
          const fixedItems = sanitizeDecors(items)
          setDecors(fixedItems)
          setStoolStatuses(statuses)
          localStorage.setItem(decorKey, JSON.stringify(fixedItems))
          localStorage.setItem(stoolStatusKey, JSON.stringify(statuses))
        }
      }
    }
    load()
  }, [tenant, storageKey, decorKey, stoolStatusKey])

  // ── Realtime subscriptions: sync tussen apparaten ────────────────────────
  useEffect(() => {
    // Tafels: andere tablet verplaatst/voegt tafel toe → update hier
    const tableChannel = supabase
      .channel(`fpt_${tenant}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'floor_plan_tables', filter: `tenant_slug=eq.${tenant}` },
        ({ new: row }: any) => {
          if (row?.data) {
            const fixed = sanitizeTables(row.data as KassaTable[])
            setTables(fixed)
            localStorage.setItem(storageKey, JSON.stringify(fixed))
          }
        }
      )
      .subscribe()

    // Decor + krukstatussen: andere tablet wijzigt barkruk/status → update hier
    const decorChannel = supabase
      .channel(`fpd_${tenant}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'floor_plan_decor', filter: `tenant_slug=eq.${tenant}` },
        ({ new: row }: any) => {
          if (row?.data) {
            const { items, statuses } = parseDecorData(row.data)
            const fixedItems = sanitizeDecors(items)
            setDecors(fixedItems)
            setStoolStatuses(statuses)
            localStorage.setItem(decorKey, JSON.stringify(fixedItems))
            localStorage.setItem(stoolStatusKey, JSON.stringify(statuses))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tableChannel)
      supabase.removeChannel(decorChannel)
    }
  }, [tenant, storageKey, decorKey, stoolStatusKey])

  useEffect(() => {
    if (selectedDecor?.type === 'bar_segment') {
      setEditStoolVals({ s1: selectedDecor.stool1 || '', s2: selectedDecor.stool2 || '' })
    }
  }, [selectedDecor])

  // Veiligheidsnet voor iPad: sla posities altijd op na elke drag
  useEffect(() => {
    if (tables.length > 0 && !isDragging) {
      localStorage.setItem(storageKey, JSON.stringify(tables))
    }
  }, [tables, isDragging, storageKey])

  // Auto-pan: alleen bij allereerste load als er geen opgeslagen pan is
  useEffect(() => {
    if (tables.length === 0 || !floorRef.current || autoCenteredRef.current) return
    // Als er al een opgeslagen pan is, niet auto-centeren
    try {
      const saved = localStorage.getItem(panKey)
      if (saved) { autoCenteredRef.current = true; return }
    } catch { /* ignore */ }
    autoCenteredRef.current = true
    const all = [...tables, ...decors]
    const xs = all.map(i => clampPct(i.x))
    const ys = all.map(i => clampPct(i.y))
    const centerXpct = (Math.min(...xs) + Math.max(...xs)) / 2
    const centerYpct = (Math.min(...ys) + Math.max(...ys)) / 2
    const vw = floorRef.current.clientWidth
    const vh = floorRef.current.clientHeight
    const newPanX = vw / 2 - (centerXpct / 100) * vw
    const newPanY = vh / 2 - (centerYpct / 100) * vh
    setPanX(newPanX)
    setPanY(newPanY)
    try { localStorage.setItem(panKey, JSON.stringify({ x: newPanX, y: newPanY })) } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.length])

  const save = (updated: KassaTable[]) => {
    setTables(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
    supabase.from('floor_plan_tables').upsert({ tenant_slug: tenant, data: updated }, { onConflict: 'tenant_slug' })
  }

  // Sla decor + huidige krukstatussen samen op (één Supabase-rij, backward-compatible)
  const saveDecor = (updated: DecorItem[], currentStoolStatuses?: Record<string, TableStatus>) => {
    setDecors(updated)
    localStorage.setItem(decorKey, JSON.stringify(updated))
    const payload = { items: updated, stool_statuses: currentStoolStatuses ?? stoolStatuses }
    supabase.from('floor_plan_decor').upsert({ tenant_slug: tenant, data: payload }, { onConflict: 'tenant_slug' })
  }

  // Sla krukstatus op + sync naar Supabase zodat andere apparaten het zien
  const saveStoolStatus = (updated: Record<string, TableStatus>) => {
    setStoolStatuses(updated)
    localStorage.setItem(stoolStatusKey, JSON.stringify(updated))
    const payload = { items: decors, stool_statuses: updated }
    supabase.from('floor_plan_decor').upsert({ tenant_slug: tenant, data: payload }, { onConflict: 'tenant_slug' })
  }

  // Effectieve stoel/tafel status:
  // - Geen items → altijd VRIJ (betaald = automatisch vrij)
  // - Items aanwezig + manueel ONBETAALD → ONBETAALD
  // - Items aanwezig, geen override → BEZET
  const getStoolStatus = (stoolId: string): TableStatus => {
    const hasItems = (tableOrders[stoolId] || []).length > 0
    if (!hasItems) return 'FREE'
    if (stoolStatuses[stoolId] === 'UNPAID') return 'UNPAID'
    return 'OCCUPIED'
  }

  const getTableEffectiveStatus = (tableNumber: string, storedStatus: TableStatus): TableStatus => {
    const hasItems = (tableOrders[tableNumber] || []).length > 0
    if (!hasItems) return 'FREE'
    if (storedStatus === 'UNPAID') return 'UNPAID'
    return 'OCCUPIED'
  }

  const addDecor = (type: DecorType) => {
    const d: DecorItem = { id: makeId(), type, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, rotation: 0 }
    saveDecor([...decors, d])
  }

  const openAddBarModal = () => {
    const used = decors
      .filter(d => d.type === 'bar_segment')
      .flatMap(d => [d.stool1, d.stool2])
      .filter(Boolean) as string[]
    const kNums = used
      .filter(s => /^K\d+$/.test(s))
      .map(s => parseInt(s.slice(1)))
      .sort((a, b) => a - b)
    const next = kNums.length > 0 ? kNums[kNums.length - 1] + 1 : 1
    setAddStool1(`K${next}`)
    setAddStool2(`K${next + 1}`)
    setShowAddBarModal(true)
  }

  const confirmAddBar = () => {
    const d: DecorItem = {
      id: makeId(),
      type: 'bar_segment',
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      rotation: 0,
      stool1: addStool1.trim() || 'K?',
      stool2: addStool2.trim() || 'K?',
    }
    saveDecor([...decors, d])
    setShowAddBarModal(false)
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
    // Plaats in het midden van het huidige zicht (pan), niet ergens op vaste random % — anders staat de tafel “ver weg”
    let x = 25 + Math.random() * 50
    let y = 25 + Math.random() * 50
    const el = floorRef.current
    if (el && el.clientWidth > 0 && el.clientHeight > 0) {
      const vw = el.clientWidth
      const vh = el.clientHeight
      const cx = ((vw / 2 - panX) / vw) * 100
      const cy = ((vh / 2 - panY) / vh) * 100
      x = clampPct(cx + (Math.random() - 0.5) * 10)
      y = clampPct(cy + (Math.random() - 0.5) * 10)
    }
    const t: KassaTable = {
      id: makeId(),
      number: addNumber.trim(),
      seats: addSeats,
      shape: addShape,
      x,
      y,
      rotation: 0,
      status: 'FREE',
    }
    save([...tables, t])
    setSelected(t)
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
  // Posities zijn % (0-100) van de container. Pan verschuift het canvas visueel.
  const handlePointerDown = (e: React.PointerEvent, id: string, type: 'table' | 'decor') => {
    e.stopPropagation()
    if (isLocked) {
      // Vergrendeld: sleep overal (ook op tafels) om canvas te pannen
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      draggingId.current = '__canvas__'
      draggingType.current = 'canvas'
      dragMoved.current = false
      pointerStart.current = { x: e.clientX, y: e.clientY }
      panStart.current = { x: panX, y: panY }
      setIsDragging(true)
      return
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const floor = floorRef.current
    if (!floor) return
    const rect = floor.getBoundingClientRect()
    const item = type === 'table' ? tables.find(t => t.id === id)! : decors.find(d => d.id === id)!
    draggingId.current = id
    draggingType.current = type
    dragMoved.current = false
    pointerStart.current = { x: e.clientX, y: e.clientY }
    // Drag offset: pointer positie minus de schermpositie van de tafel (rekening houdend met pan)
    dragOffset.current = {
      x: e.clientX - rect.left - panX - (item.x / 100) * rect.width,
      y: e.clientY - rect.top - panY - (item.y / 100) * rect.height,
    }
    setIsDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId.current) return
    const dx = Math.abs(e.clientX - pointerStart.current.x)
    const dy = Math.abs(e.clientY - pointerStart.current.y)
    if (dx < 8 && dy < 8) return
    dragMoved.current = true

    // Canvas panning: slepen op lege achtergrond
    if (draggingType.current === 'canvas') {
      const newX = panStart.current.x + (e.clientX - pointerStart.current.x)
      const newY = panStart.current.y + (e.clientY - pointerStart.current.y)
      setPanX(newX)
      setPanY(newY)
      try { localStorage.setItem(panKey, JSON.stringify({ x: newX, y: newY })) } catch { /* ignore */ }
      return
    }

    const floor = floorRef.current
    if (!floor) return
    const rect = floor.getBoundingClientRect()
    // Nieuwe % positie = (pointer - offset - pan) / containergrootte
    const x = Math.max(1, Math.min(99, ((e.clientX - rect.left - panX - dragOffset.current.x) / rect.width) * 100))
    const y = Math.max(1, Math.min(99, ((e.clientY - rect.top - panY - dragOffset.current.y) / rect.height) * 100))
    if (draggingType.current === 'table') {
      setTables(prev => prev.map(t => t.id === draggingId.current ? { ...t, x, y } : t))
    } else {
      setDecors(prev => prev.map(d => d.id === draggingId.current ? { ...d, x, y } : d))
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingId.current) return
    if (draggingType.current === 'canvas') {
      draggingId.current = null
      setIsDragging(false)
      setTimeout(() => { dragMoved.current = false }, 0)
      return
    }
    // Gebruik functionele update zodat we altijd de NIEUWSTE posities opslaan,
    // niet de stale closure-waarde van vóór het slepen.
    if (draggingType.current === 'table') {
      setTables(latest => {
        localStorage.setItem(storageKey, JSON.stringify(latest))
        supabase.from('floor_plan_tables').upsert({ tenant_slug: tenant, data: latest }, { onConflict: 'tenant_slug' })
        return latest
      })
    } else {
      setDecors(latestDecors => {
        const payload = { items: latestDecors, stool_statuses: stoolStatuses }
        localStorage.setItem(decorKey, JSON.stringify(latestDecors))
        supabase.from('floor_plan_decor').upsert({ tenant_slug: tenant, data: payload }, { onConflict: 'tenant_slug' })
        return latestDecors
      })
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
        <div className="flex gap-2 items-center">
          {!isLocked && (
            <>
              <button onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors">
                🪑 Tafel
              </button>
              <button onClick={openAddBarModal}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-semibold transition-colors">
                🍺 Toogstuk
              </button>
              <button onClick={() => addDecor('plant')}
                className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-semibold transition-colors">
                🌿 Plant
              </button>
            </>
          )}
          <button
            onClick={() => setIsLocked(prev => !prev)}
            title={isLocked ? 'Ontgrendelen om tafels te verplaatsen' : 'Vergrendelen'}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              isLocked
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-yellow-400 hover:bg-yellow-500 text-gray-900'
            }`}
          >
            {isLocked ? '🔒 Vergrendeld' : '🔓 Bewerken'}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors">
            ✕ Sluiten
          </button>
        </div>
      </div>

      {/* Floor + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Floor plan — overflow-hidden, inner canvas verschuift via pan-transform */}
        <div
          ref={floorRef}
          className="floor-plan flex-1 relative overflow-hidden select-none"
          style={{
            backgroundColor: '#4a4a4a',
            backgroundImage: `
              linear-gradient(to right, rgba(200,200,200,0.25) 0px, rgba(200,200,200,0.25) 2px, transparent 2px),
              linear-gradient(to bottom, rgba(200,200,200,0.25) 0px, rgba(200,200,200,0.25) 2px, transparent 2px)
            `,
            backgroundSize: '100px 100px',
            backgroundPosition: `${panX}px ${panY}px`,
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
          onPointerDown={(e) => {
            // Tafels/decor gebruiken stopPropagation, dus hier komen alleen events van lege vloer
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
            draggingId.current = '__canvas__'
            draggingType.current = 'canvas'
            dragMoved.current = false
            pointerStart.current = { x: e.clientX, y: e.clientY }
            panStart.current = { x: panX, y: panY }
            setIsDragging(true)
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => { if (!dragMoved.current) { setSelected(null); setSelectedDecor(null) } }}
        >
          {/* Inner canvas: posities zijn % van de container, pan verschuift het geheel */}
          <div style={{ position: 'absolute', inset: 0, transform: `translate(${panX}px, ${panY}px)` }}>

          {/* Decor items (achtergrond laag) */}
          {decors.map(d => (
            <div key={d.id} className="absolute"
              style={{
                left: `${d.x}%`,
                top: `${d.y}%`,
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
              <DecorSVG item={d} isSelected={selectedDecor?.id === d.id} orderedStools={new Set(Object.keys(tableOrders).filter(k => (tableOrders[k] || []).length > 0))} stoolStatuses={stoolStatuses} getStoolStatus={getStoolStatus} />
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
                effectiveStatus={getTableEffectiveStatus(t.number, t.status)}
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
          </div>{/* einde inner canvas */}

          {/* Pan hint: pijltjes linksonder */}
          <div
            className="absolute bottom-4 left-4 z-20 select-none"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-1" style={{ gridTemplateRows: 'repeat(3, 1fr)' }}>
              {/* Rij 1: lege cel, omhoog, lege cel */}
              <div />
              <button
                onPointerDown={e => { e.stopPropagation(); e.preventDefault() }}
                onClick={e => { e.stopPropagation(); const s = 80; setPanY((p: number) => { const n = p + s; try { localStorage.setItem(panKey, JSON.stringify({ x: panX, y: n })) } catch { /* ignore */ } return n }) }}
                className="w-10 h-10 rounded-xl bg-black/50 hover:bg-black/70 active:bg-black/90 text-white flex items-center justify-center text-lg font-bold transition-colors border border-white/20"
              >▲</button>
              <div />
              {/* Rij 2: links, midden (kompas), rechts */}
              <button
                onPointerDown={e => { e.stopPropagation(); e.preventDefault() }}
                onClick={e => { e.stopPropagation(); const s = 80; setPanX((p: number) => { const n = p + s; try { localStorage.setItem(panKey, JSON.stringify({ x: n, y: panY })) } catch { /* ignore */ } return n }) }}
                className="w-10 h-10 rounded-xl bg-black/50 hover:bg-black/70 active:bg-black/90 text-white flex items-center justify-center text-lg font-bold transition-colors border border-white/20"
              >◀</button>
              <div className="w-10 h-10 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center">
                <span className="text-white/40 text-xs">✛</span>
              </div>
              <button
                onPointerDown={e => { e.stopPropagation(); e.preventDefault() }}
                onClick={e => { e.stopPropagation(); const s = 80; setPanX((p: number) => { const n = p - s; try { localStorage.setItem(panKey, JSON.stringify({ x: n, y: panY })) } catch { /* ignore */ } return n }) }}
                className="w-10 h-10 rounded-xl bg-black/50 hover:bg-black/70 active:bg-black/90 text-white flex items-center justify-center text-lg font-bold transition-colors border border-white/20"
              >▶</button>
              {/* Rij 3: lege cel, omlaag, lege cel */}
              <div />
              <button
                onPointerDown={e => { e.stopPropagation(); e.preventDefault() }}
                onClick={e => { e.stopPropagation(); const s = 80; setPanY((p: number) => { const n = p - s; try { localStorage.setItem(panKey, JSON.stringify({ x: panX, y: n })) } catch { /* ignore */ } return n }) }}
                className="w-10 h-10 rounded-xl bg-black/50 hover:bg-black/70 active:bg-black/90 text-white flex items-center justify-center text-lg font-bold transition-colors border border-white/20"
              >▼</button>
              <div />
            </div>
          </div>
        </div>

        {/* Decor Sidebar */}
        {selectedDecor && !selected && (
          <div className="w-80 bg-[#16213e] border-l border-white/10 flex flex-col overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">{selectedDecor.type === 'plant' ? '🌿 Plant' : '🍺 Toogstuk'}</h3>
              <button onClick={() => setSelectedDecor(null)} className="text-white/50 hover:text-white text-xl">✕</button>
            </div>

            {/* Bar segment: kruk nummers + bestellingen + bestelling starten */}
            {selectedDecor.type === 'bar_segment' && (() => {
              const s1 = selectedDecor.stool1 || 'K?'
              const s2 = selectedDecor.stool2 || 'K?'
              const items1 = tableOrders[s1] || []
              const items2 = tableOrders[s2] || []
              const total1 = items1.reduce((sum, item) => sum + (item.product.price + (item.choices||[]).reduce((s,c)=>s+c.price,0)) * item.quantity, 0)
              const total2 = items2.reduce((sum, item) => sum + (item.product.price + (item.choices||[]).reduce((s,c)=>s+c.price,0)) * item.quantity, 0)

              const StoolPanel = ({ stoolId, items, total }: { stoolId: string; items: SimpleCartItem[]; total: number }) => {
                const status = getStoolStatus(stoolId)
                return (
                  <div className="mb-4 bg-white/5 rounded-xl overflow-hidden">
                    {/* Kruk header met status kleur */}
                    <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: STATUS_COLORS[status] + '33', borderLeft: `4px solid ${STATUS_COLORS[status]}` }}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: STATUS_COLORS[status] }}>{stoolId}</div>
                        <span className="text-white font-bold text-sm">Kruk {stoolId}</span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: STATUS_COLORS[status] }}>{STATUS_LABELS[status]}</span>
                    </div>
                    {/* Bestellingen */}
                    <div className="p-3">
                      {items.length > 0 ? (
                        <div className="space-y-1.5">
                          {items.map((item, i) => {
                            const choiceTotal = (item.choices||[]).reduce((s,c)=>s+c.price,0)
                            return (
                              <div key={i} className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <span className="text-white text-xs font-semibold">{item.quantity}× {item.product.name}</span>
                                  {(item.choices||[]).map((c,ci) => (
                                    <p key={ci} className="text-white/40 text-xs ml-2">+ {c.choiceName}</p>
                                  ))}
                                </div>
                                <span className="text-amber-400 text-xs font-bold ml-2 shrink-0">€{((item.product.price+choiceTotal)*item.quantity).toFixed(2)}</span>
                              </div>
                            )
                          })}
                          <div className="flex justify-between pt-1 border-t border-white/10 mt-1">
                            <span className="text-white/50 text-xs">Totaal</span>
                            <span className="text-white text-xs font-bold">€{total.toFixed(2)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-white/30 text-xs">Geen openstaande bestelling</p>
                      )}
                    </div>
                    {/* Status knoppen */}
                    <div className="px-3 pb-3 grid grid-cols-3 gap-2">
                      {(['FREE', 'OCCUPIED', 'UNPAID'] as TableStatus[]).map(s => {
                        const isActive = status === s
                        const warnUnpaid = s === 'UNPAID' && status === 'OCCUPIED' && items.length > 0
                        return (
                          <button key={s}
                            onClick={() => saveStoolStatus({ ...stoolStatuses, [stoolId]: s })}
                            className="py-2.5 rounded-xl text-sm font-bold transition-all"
                            style={isActive
                              ? { backgroundColor: STATUS_COLORS[s], color: 'white' }
                              : warnUnpaid
                              ? { backgroundColor: STATUS_COLORS['UNPAID'] + '33', color: STATUS_COLORS['UNPAID'], border: `2px solid ${STATUS_COLORS['UNPAID']}` }
                              : { backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }
                            }>
                            {STATUS_LABELS[s]}{warnUnpaid ? ' ⚠️' : ''}
                          </button>
                        )
                      })}
                    </div>
                    {/* Bestelling knop */}
                    <div className="px-3 pb-3">
                      <button
                        onClick={() => { onSelectTable(stoolId); onClose() }}
                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base transition-colors">
                        🛒 {items.length > 0 ? `Toevoegen aan ${stoolId}` : `Nieuwe bestelling ${stoolId}`}
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <>
                  <div className="p-4 border-b border-white/10 flex-1 overflow-y-auto">
                    <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Barkrukken</p>
                    <StoolPanel stoolId={s1} items={items1} total={total1} />
                    <StoolPanel stoolId={s2} items={items2} total={total2} />
                  </div>
                  <div className="p-4 border-b border-white/10 space-y-2">
                    <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Kruk nummers bewerken</p>
                    <div className="flex gap-2 items-center">
                      <span className="text-white/60 text-xs w-14">Kruk 1:</span>
                      <input
                        value={editStoolVals.s1}
                        onChange={e => setEditStoolVals(prev => ({ ...prev, s1: e.target.value }))}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-white/10 text-white text-sm font-bold text-center outline-none border border-white/10 focus:border-blue-400"
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-white/60 text-xs w-14">Kruk 2:</span>
                      <input
                        value={editStoolVals.s2}
                        onChange={e => setEditStoolVals(prev => ({ ...prev, s2: e.target.value }))}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-white/10 text-white text-sm font-bold text-center outline-none border border-white/10 focus:border-blue-400"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const updated = decors.map(d => d.id === selectedDecor.id
                          ? { ...d, stool1: editStoolVals.s1 || 'K?', stool2: editStoolVals.s2 || 'K?' }
                          : d)
                        saveDecor(updated)
                        setSelectedDecor({ ...selectedDecor, stool1: editStoolVals.s1 || 'K?', stool2: editStoolVals.s2 || 'K?' })
                      }}
                      className="w-full py-1.5 rounded-lg bg-blue-500/30 text-blue-300 hover:bg-blue-500/50 text-sm font-semibold transition-colors">
                      💾 Opslaan
                    </button>
                  </div>
                </>
              )
            })()}

            {!isLocked && (
              <>
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
              </>
            )}
          </div>
        )}

        {/* Tafel Sidebar */}
        {selected && (() => {
          const items = tableOrders[selected.number] || []
          const hasItems = items.length > 0
          const effectiveStatus = getTableEffectiveStatus(selected.number, selected.status)
          const totalPrice = items.reduce((sum, item) => {
            const choiceTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
            return sum + (item.product.price + choiceTotal) * item.quantity
          }, 0)

          return (
            <div className="w-80 bg-[#16213e] border-l border-white/10 flex flex-col">
              {/* Header met status kleur */}
              <div className="p-4 border-b border-white/10 flex justify-between items-center" style={{ borderLeft: `4px solid ${STATUS_COLORS[effectiveStatus]}` }}>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-white font-bold text-xl">Tafel {selected.number}</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: STATUS_COLORS[effectiveStatus] }}>{STATUS_LABELS[effectiveStatus]}</span>
                  </div>
                  <p className="text-white/40 text-xs">{selected.seats} plaatsen</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/50 hover:text-white text-xl">✕</button>
              </div>

              {/* Bestellingen */}
              <div className="flex-1 overflow-y-auto p-4 border-b border-white/10">
                <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Bestelling</p>
                {hasItems ? (
                  <div className="space-y-2">
                    {items.map((item, i) => {
                      const choiceTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
                      const lineTotal = (item.product.price + choiceTotal) * item.quantity
                      return (
                        <div key={i} className="bg-white/5 rounded-xl p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <span className="text-white font-semibold text-sm">
                                {item.quantity}× {item.product.name}
                              </span>
                              {(item.choices || []).length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {item.choices!.map((c, ci) => (
                                    <p key={ci} className="text-white/40 text-xs">
                                      + {c.choiceName}{c.price > 0 ? ` (€${c.price.toFixed(2)})` : ''}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="text-amber-400 font-bold text-sm ml-2 shrink-0">
                              €{lineTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    {/* Totaal */}
                    <div className="flex justify-between items-center pt-2 border-t border-white/10 mt-2">
                      <span className="text-white/60 text-sm font-semibold">Totaal</span>
                      <span className="text-white font-bold text-lg">€{totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/30 text-sm text-center py-6">Geen openstaande bestelling</p>
                )}
              </div>

              {/* Rotatie — alleen in bewerkmodus */}
              {!isLocked && (
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
              )}

              {/* Status toggle */}
              <div className="p-4 border-b border-white/10 space-y-2">
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Status</p>
                {(['FREE', 'OCCUPIED', 'UNPAID'] as TableStatus[]).map(s => {
                  const isActive = effectiveStatus === s
                  // ONBETAALD warning als BEZET met items
                  const warnUnpaid = s === 'UNPAID' && effectiveStatus === 'OCCUPIED' && hasItems
                  return (
                    <button key={s}
                      onClick={() => {
                        const updated = tables.map(t => t.id === selected.id ? { ...t, status: s } : t)
                        save(updated)
                        setSelected({ ...selected, status: s })
                      }}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
                      style={
                        isActive
                          ? { backgroundColor: STATUS_COLORS[s], color: 'white' }
                          : warnUnpaid
                          ? { backgroundColor: STATUS_COLORS['UNPAID'] + '33', color: STATUS_COLORS['UNPAID'], border: `2px solid ${STATUS_COLORS['UNPAID']}` }
                          : { backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }
                      }>
                      {STATUS_LABELS[s]}{warnUnpaid ? ' ⚠️' : ''}
                    </button>
                  )
                })}
              </div>

              <div className="p-4 space-y-2">
                <button
                  onClick={() => { onSelectTable(selected.number); onClose() }}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors">
                  🛒 {hasItems ? 'Toevoegen aan bestelling' : 'Nieuwe bestelling'}
                </button>
                {!isLocked && (
                  <button onClick={() => deleteTable(selected.id)}
                    className="w-full py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-semibold transition-colors">
                    🗑 Verwijder tafel
                  </button>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Legend */}
      <div className="h-10 flex-shrink-0 bg-[#16213e] border-t border-white/10 flex items-center justify-center gap-6 text-sm text-white/60">
        {(Object.entries(STATUS_COLORS) as [TableStatus, string][]).map(([s, c]) => (
          <div key={s} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
            <span>{STATUS_LABELS[s]}</span>
          </div>
        ))}
        {isLocked
          ? <span className="text-orange-400/70 ml-4 text-xs">🔒 Vergrendeld — klik op &quot;Bewerken&quot; om tafels te verplaatsen</span>
          : <span className="text-yellow-400/70 ml-4 text-xs">🔓 Bewerkmodus — sleep om te verplaatsen • ↺↻ om te draaien</span>
        }
      </div>

      {/* Add bar segment modal */}
      {showAddBarModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">🍺 Toogstuk toevoegen</h3>
              <button onClick={() => setShowAddBarModal(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500">Geef een nummer aan elke barkruk van dit toogstuk.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Kruk 1 nummer *</label>
                  <input
                    autoFocus
                    value={addStool1}
                    onChange={e => setAddStool1(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && confirmAddBar()}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 outline-none text-xl font-bold text-center"
                    placeholder="bv. K1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Kruk 2 nummer *</label>
                  <input
                    value={addStool2}
                    onChange={e => setAddStool2(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && confirmAddBar()}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 outline-none text-xl font-bold text-center"
                    placeholder="bv. K2"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button onClick={() => setShowAddBarModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-semibold text-gray-700">Annuleer</button>
              <button onClick={confirmAddBar} className="flex-[2] py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors">Toevoegen</button>
            </div>
          </div>
        </div>
      )}

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
