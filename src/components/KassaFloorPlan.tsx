'use client'

import { useState, useEffect, useRef, useMemo, useCallback, type PointerEvent as ReactPointerEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { adminDb } from '@/lib/admin-db-client'
import {
  clampFloorPlanPct,
  parseFloorPlanTablesJson,
  sanitizeFloorPlanTables,
  type FloorPlanTable,
} from '@/lib/kassa-floor-plan-tables'
import {
  displayNumbersWithOpenOrdersInZone,
  FLOOR_PLAN_ZONE_INSIDE,
  FLOOR_PLAN_ZONE_TERRACE,
  floorPlanZoneFromRealtimePayload,
  tableOrderMapKey,
  type FloorPlanZone,
} from '@/lib/kassa-floor-plan-zone'
import { useLanguage } from '@/i18n'
import {
  KASSA_POS_MENU_PLATE_SHELL_BG_CLASS,
  kassaPosButtonClass,
} from '@/lib/kassa-pos-surface'

export type TableShape = FloorPlanTable['shape']
export type TableStatus = FloorPlanTable['status']

export type KassaTable = FloorPlanTable

const FLOOR_MODAL_TOUCH =
  'min-h-[44px] touch-manipulation [-webkit-tap-highlight-color:transparent]'

const FLOOR_TOOLBAR_BTN = `px-3 py-2 text-sm font-semibold whitespace-nowrap ${kassaPosButtonClass(false)}`

/** Witte invoer op plattegrond-modals — voorkomt kassa-dark input-styling op het hele veld. */
const FLOOR_MODAL_INPUT_LIGHT =
  'bg-white text-black placeholder:text-neutral-500 caret-gray-900 [color-scheme:light]'

function focusFloorModalInput(e: ReactPointerEvent<HTMLInputElement>) {
  if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return
  e.currentTarget.focus({ preventScroll: true })
}

const STATUS_COLORS: Record<TableStatus, string> = {
  FREE: '#22c55e',
  OCCUPIED: '#3b82f6',
  UNPAID: '#f59e0b',
}
interface SimpleCartItem {
  product: { name: string; price: number }
  quantity: number
  choices?: { choiceName: string; price: number }[]
}

interface Props {
  tenant: string
  /** Binnen of terras: aparte plattegrond + decor per tenant. */
  planZone: FloorPlanZone
  onSelectTable: (tableNumber: string) => void
  /** Open kassa op deze tafel/kruk en ga naar afrekenen (alleen tonen bij open mand). */
  onCheckoutTable?: (tableNumber: string) => void
  onClose: () => void
  tableOrders?: Record<string, SimpleCartItem[]>
  /** Zelfde lijst als kassa-tafelkiezer — direct tonen tot DB-fetch klaar is (voorkomt lege plattegrond). */
  seedTables?: KassaTable[]
  /** Na geslaagde upsert: parent-state (`pickerTables`) gelijk trekken — anders overschrijft seed een net toegevoegde terrastafel tot refresh. */
  onFloorPlanTablesPersisted?: (planZone: FloorPlanZone, tables: KassaTable[]) => void
  /** Start/einde van plattegrond-upsert: parent blokkeert poll/realtime die kortere snapshots pusht. */
  onFloorPlanTablesPersistLifecycle?: (planZone: FloorPlanZone, phase: 'start' | 'end') => void
}

function makeId() { return Math.random().toString(36).slice(2, 10) }

/** Zelfde als lib — korte naam in dit bestand */
const clampPct = clampFloorPlanPct

function sanitizeTables(list: KassaTable[]): KassaTable[] {
  return sanitizeFloorPlanTables(list)
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

function DecorSVG({
  item,
  isSelected,
  orderedStools = new Set(),
  stoolStatuses = {},
  getStoolStatus,
  barLabel = 'BAR',
}: {
  item: DecorItem
  isSelected: boolean
  orderedStools?: Set<string>
  stoolStatuses?: Record<string, TableStatus>
  getStoolStatus?: (id: string) => TableStatus
  barLabel?: string
}) {
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
      <text x={bw / 2} y={stoolR * 2 + 6 + bh / 2 + 5} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={11} fontWeight="bold">{barLabel}</text>
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

type TableVisualZone = 'indoor' | 'terrace'

function TerraceChairTop({ chairW, chairH }: { chairW: number; chairH: number }) {
  const hw = chairW / 2
  const hh = chairH / 2
  return (
    <>
      <ellipse cx={1} cy={3} rx={hw} ry={hh} fill="rgba(0,0,0,0.32)" />
      <ellipse cx={0} cy={0} rx={hw} ry={hh} fill="none" stroke="#2a3340" strokeWidth={3.5} />
      <ellipse cx={0} cy={0} rx={hw - 3} ry={hh - 2.5} fill="#4a5568" stroke="#353f4d" strokeWidth={1} />
      <ellipse cx={-4} cy={-3} rx={hw * 0.35} ry={hh * 0.28} fill="rgba(255,255,255,0.14)" />
      <path
        d={`M ${-hw * 0.55} ${-hh - 1} Q 0 ${-hh - 11} ${hw * 0.55} ${-hh - 1}`}
        fill="none"
        stroke="#2a3340"
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <line x1={-hw + 2} y1={hh - 1} x2={-hw - 5} y2={hh + 5} stroke="#1f2630" strokeWidth={3} strokeLinecap="round" />
      <line x1={hw - 2} y1={hh - 1} x2={hw + 5} y2={hh + 5} stroke="#1f2630" strokeWidth={3} strokeLinecap="round" />
    </>
  )
}

function IndoorChairTop({ chairW, chairH }: { chairW: number; chairH: number }) {
  return (
    <>
      <rect x={-chairW / 2 + 1} y={-chairH / 2 + 2} width={chairW} height={chairH + 4} rx={5} fill="rgba(0,0,0,0.35)" />
      <rect x={-chairW / 2} y={-chairH / 2} width={chairW} height={9} rx={4} fill="#888" stroke="#555" strokeWidth={1} />
      <rect x={-chairW / 2 + 3} y={-chairH / 2 + 2} width={chairW - 6} height={3} rx={2} fill="rgba(255,255,255,0.3)" />
      <rect x={-chairW / 2} y={-chairH / 2 + 10} width={chairW} height={chairH - 8} rx={4} fill="#bbb" stroke="#888" strokeWidth={1} />
      <rect x={-chairW / 2 + 4} y={-chairH / 2 + 12} width={chairW - 6} height={4} rx={2} fill="rgba(255,255,255,0.35)" />
      <rect x={-chairW / 2 - 1} y={-chairH / 2 + chairH - 2} width={5} height={4} rx={1} fill="#777" />
      <rect x={chairW / 2 - 4} y={-chairH / 2 + chairH - 2} width={5} height={4} rx={1} fill="#777" />
    </>
  )
}

function TableSVG({
  table,
  isSelected,
  onClick,
  effectiveStatus,
  visualZone = 'indoor',
}: {
  table: KassaTable
  isSelected: boolean
  /** Weglaten → click bubbelt naar de wrapper (nodig voor touch-selectie bij vergrendelde plattegrond). */
  onClick?: (e?: React.MouseEvent) => void
  effectiveStatus?: TableStatus
  visualZone?: TableVisualZone
}) {
  const seats = table.seats
  const color = STATUS_COLORS[effectiveStatus ?? table.status]
  const isTerrace = visualZone === 'terrace'
  const gradKey = table.id.replace(/[^a-zA-Z0-9_-]/g, '')

  // Table dimensions
  const tableSize = 90
  const chairW = 26
  const chairH = 22
  const gap = 14 // distance from table edge to chair

  // Generate chair positions
  type Chair = { x: number; y: number; angle: number }
  const chairs: Chair[] = []

  if (table.shape === 'ROUND') {
    // 2 stoelen: exact tegenover (top + bottom) — hoeken 0°/180° zodat zitvlak naar tafel wijst (icoon: rug boven)
    if (seats === 2) {
      const dist = tableSize / 2 + gap + chairH / 2
      chairs.push({ x: 0, y: -dist, angle: 0 })
      chairs.push({ x: 0, y:  dist, angle: 180 })
    } else {
      const radius = tableSize / 2
      const dist = radius + gap + chairH / 2
      for (let i = 0; i < seats; i++) {
        const posDeg = (i * 360) / seats - 90
        const rad = (posDeg * Math.PI) / 180
        chairs.push({
          x: Math.cos(rad) * dist,
          y: Math.sin(rad) * dist,
          angle: posDeg + 90,
        })
      }
    }
  } else if (table.shape === 'SQUARE') {
    const half = tableSize / 2
    const dist = half + gap + chairH / 2
    // 2 stoelen: altijd tegenover mekaar (top + bottom)
    if (seats === 2) {
      chairs.push({ x: 0, y: -dist, angle: 0 })
      chairs.push({ x: 0, y:  dist, angle: 180 })
    } else {
      const perSide = Math.ceil(seats / 4)
      const sides = [
        { angle: 0, axis: 'x' as const, fixed: -dist },
        { angle: -90, axis: 'y' as const, fixed: dist },
        { angle: 180, axis: 'x' as const, fixed: dist },
        { angle: 90, axis: 'y' as const, fixed: -dist },
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
      chairs.push({ x: offset, y: -distTop, angle: 0 })
      placed++
    }
    // bottom
    for (let i = 0; i < perLong && placed < seats; i++) {
      const offset = (i - (perLong - 1) / 2) * (chairW + 6)
      chairs.push({ x: offset, y: distTop, angle: 180 })
      placed++
    }
    // sides if needed
    if (placed < seats) {
      chairs.push({ x: -distSide, y: 0, angle: 90 })
      placed++
    }
    if (placed < seats) {
      chairs.push({ x: distSide, y: 0, angle: -90 })
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
      {...(onClick ? { onClick } : {})}
      style={{ cursor: 'pointer', overflow: 'visible', display: 'block' }}
    >
      {/* Stoelen — binnen: gestoffeerd; terras: metalen bistro */}
      {chairs.map((c, i) => (
        <g key={i} transform={`translate(${cx + c.x}, ${cy + c.y}) rotate(${c.angle})`}>
          {isTerrace ? <TerraceChairTop chairW={chairW} chairH={chairH} /> : <IndoorChairTop chairW={chairW} chairH={chairH} />}
        </g>
      ))}

      {/* Tafelblad */}
      {isTerrace ? (
        <>
          {table.shape === 'ROUND' ? (
            <>
              <ellipse
                cx={cx}
                cy={cy}
                rx={tableSize / 2 + 3}
                ry={tableSize / 2 + 3}
                fill="none"
                stroke="#2f3640"
                strokeWidth={5}
                filter={`url(#shadow-${gradKey})`}
              />
              <ellipse
                cx={cx}
                cy={cy}
                rx={tableSize / 2}
                ry={tableSize / 2}
                fill={`url(#terrace-round-${gradKey})`}
                stroke={isSelected ? color : '#5c4a32'}
                strokeWidth={isSelected ? 4 : 2.5}
              />
              {[-24, -12, 0, 12, 24].map((off) => (
                <line
                  key={off}
                  x1={cx + off}
                  y1={cy - tableSize / 2 + 6}
                  x2={cx + off}
                  y2={cy + tableSize / 2 - 6}
                  stroke="rgba(30,22,14,0.22)"
                  strokeWidth={2}
                />
              ))}
              <circle cx={cx} cy={cy} r={5} fill="#1e242c" stroke="#3d4654" strokeWidth={1.5} />
            </>
          ) : (
            <rect
              x={cx - (table.shape === 'RECTANGLE' ? tw : tableSize) / 2}
              y={cy - (table.shape === 'RECTANGLE' ? th : tableSize) / 2}
              width={table.shape === 'RECTANGLE' ? tw : tableSize}
              height={table.shape === 'RECTANGLE' ? th : tableSize}
              rx={table.shape === 'RECTANGLE' ? 8 : 10}
              fill={`url(#terrace-rect-${gradKey})`}
              stroke={isSelected ? color : '#5c4a32'}
              strokeWidth={isSelected ? 4 : 2.5}
              filter={`url(#shadow-${gradKey})`}
            />
          )}
          {table.shape !== 'ROUND' && (
            <>
              {Array.from({ length: 6 }).map((_, i) => {
                const top = cy - (table.shape === 'RECTANGLE' ? th : tableSize) / 2 + 8
                const w = table.shape === 'RECTANGLE' ? tw : tableSize
                const step = w / 7
                return (
                  <line
                    key={i}
                    x1={cx - w / 2 + step * (i + 0.5)}
                    y1={top}
                    x2={cx - w / 2 + step * (i + 0.5)}
                    y2={top + (table.shape === 'RECTANGLE' ? th : tableSize) - 16}
                    stroke="rgba(30,22,14,0.2)"
                    strokeWidth={2}
                  />
                )
              })}
            </>
          )}
          {table.shape !== 'ROUND' &&
            [
              [-1, -1],
              [1, -1],
              [-1, 1],
              [1, 1],
            ].map(([sx, sy], i) => {
              const hw = (table.shape === 'RECTANGLE' ? tw : tableSize) / 2 - 10
              const hh = (table.shape === 'RECTANGLE' ? th : tableSize) / 2 - 10
              return (
                <circle
                  key={i}
                  cx={cx + sx * hw}
                  cy={cy + sy * hh}
                  r={5}
                  fill="#2f3640"
                  stroke="#1a1f27"
                  strokeWidth={1}
                />
              )
            })}
        </>
      ) : (
        <>
          {table.shape === 'ROUND' ? (
            <ellipse
              cx={cx}
              cy={cy}
              rx={tableSize / 2}
              ry={tableSize / 2}
              fill={`url(#table-grad-round-${gradKey})`}
              stroke={isSelected ? color : '#4a3220'}
              strokeWidth={isSelected ? 4 : 2}
              filter={`url(#shadow-${gradKey})`}
            />
          ) : table.shape === 'RECTANGLE' ? (
            <rect
              x={cx - tw / 2}
              y={cy - th / 2}
              width={tw}
              height={th}
              rx={10}
              fill={`url(#table-grad-rect-${gradKey})`}
              stroke={isSelected ? color : '#4a3220'}
              strokeWidth={isSelected ? 4 : 2}
              filter={`url(#shadow-${gradKey})`}
            />
          ) : (
            <rect
              x={cx - tableSize / 2}
              y={cy - tableSize / 2}
              width={tableSize}
              height={tableSize}
              rx={10}
              fill={`url(#table-grad-rect-${gradKey})`}
              stroke={isSelected ? color : '#4a3220'}
              strokeWidth={isSelected ? 4 : 2}
              filter={`url(#shadow-${gradKey})`}
            />
          )}
          {table.shape === 'ROUND' ? (
            <ellipse cx={cx - 12} cy={cy - 14} rx={16} ry={10} fill="rgba(255,255,255,0.08)" />
          ) : (
            <rect
              x={cx - tw / 2 + 8}
              y={cy - th / 2 + 6}
              width={tw * 0.35}
              height={th * 0.25}
              rx={4}
              fill="rgba(255,255,255,0.07)"
            />
          )}
        </>
      )}

      {/* Tafelnummer */}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize={20} fontWeight="bold" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
        {table.number}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="white" fontSize={12} fontWeight="600">
        {seats}p
      </text>

      {/* Status dot */}
      <circle cx={cx + (table.shape === 'RECTANGLE' ? tw / 2 : tableSize / 2) - 4} cy={cy - (table.shape === 'RECTANGLE' ? th / 2 : tableSize / 2) + 4} r={8} fill={color} stroke="white" strokeWidth={2} />

      <defs>
        <linearGradient id={`table-grad-round-${gradKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a67c52" />
          <stop offset="42%" stopColor="#7a5230" />
          <stop offset="100%" stopColor="#4a3220" />
        </linearGradient>
        <linearGradient id={`table-grad-rect-${gradKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a67c52" />
          <stop offset="42%" stopColor="#7a5230" />
          <stop offset="100%" stopColor="#4a3220" />
        </linearGradient>
        <linearGradient id={`terrace-round-${gradKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c9a66b" />
          <stop offset="45%" stopColor="#9a7a4e" />
          <stop offset="100%" stopColor="#6b5435" />
        </linearGradient>
        <linearGradient id={`terrace-rect-${gradKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c4a064" />
          <stop offset="50%" stopColor="#957648" />
          <stop offset="100%" stopColor="#6a5234" />
        </linearGradient>
        <filter id={`shadow-${gradKey}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy={isTerrace ? 5 : 4} stdDeviation={isTerrace ? 7 : 6} floodOpacity="0.5" />
        </filter>
      </defs>
    </svg>
  )
}

export default function KassaFloorPlan({
  tenant,
  planZone,
  onSelectTable,
  onCheckoutTable,
  onClose,
  tableOrders = {},
  seedTables,
  onFloorPlanTablesPersisted,
  onFloorPlanTablesPersistLifecycle,
}: Props) {
  const { t } = useLanguage()
  const statusLabels = useMemo(
    () => ({
      FREE: t('kassaApp.tableStatusFree'),
      OCCUPIED: t('kassaApp.tableStatusOccupied'),
      UNPAID: t('kassaApp.tableStatusUnpaid'),
    }),
    [t],
  )
  const storageKey =
    planZone === FLOOR_PLAN_ZONE_INSIDE
      ? `vysion_tables_${tenant}`
      : `vysion_tables_terrace_${tenant}`
  const decorKey =
    planZone === FLOOR_PLAN_ZONE_INSIDE ? `vysion_decor_${tenant}` : `vysion_decor_terrace_${tenant}`
  const stoolStatusKey =
    planZone === FLOOR_PLAN_ZONE_INSIDE
      ? `vysion_stool_status_${tenant}`
      : `vysion_stool_status_terrace_${tenant}`

  const [tables, setTables] = useState<KassaTable[]>([])
  const [selected, setSelected] = useState<KassaTable | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addNumber, setAddNumber] = useState('')
  const [addSeats, setAddSeats] = useState(4)
  const [addShape, setAddShape] = useState<TableShape>('SQUARE')
  /** iPad/Safari + extern toetsenbord: autoFocus faalt vaak → geen focus → cijfers komen nergens terecht. */
  const addTableNumberInputRef = useRef<HTMLInputElement>(null)
  const addStool1InputRef = useRef<HTMLInputElement>(null)
  const addTableRef = useRef<() => void>(() => {})
  const [decors, setDecors] = useState<DecorItem[]>([])
  const [selectedDecor, setSelectedDecor] = useState<DecorItem | null>(null)
  const [showAddBarModal, setShowAddBarModal] = useState(false)
  const [addStool1, setAddStool1] = useState('K1')
  const [addStool2, setAddStool2] = useState('K2')
  const [editStoolVals, setEditStoolVals] = useState({ s1: '', s2: '' })
  // Kruk statussen: { "K1": "FREE"|"OCCUPIED"|"UNPAID", ... }
  const [stoolStatuses, setStoolStatuses] = useState<Record<string, TableStatus>>({})

  const [isLocked, setIsLocked] = useState(true)
  /** iPad/Safari: altijd releasePointerCapture na drag, anders blijven tikken “vast”. */
  const pointerCaptureRef = useRef<{ pointerId: number; element: HTMLElement } | null>(null)

  const draggingId = useRef<string | null>(null)
  const draggingType = useRef<'table' | 'decor'>('table')
  const dragOffset = useRef({ x: 0, y: 0 })
  const dragMoved = useRef(false)
  const pointerStart = useRef({ x: 0, y: 0 })
  /** Tijdens tafel/decor-sleep: geen realtime setTables/setDecors (echo van eigen save = race / hapering). */
  const ignoreFloorRealtimeRef = useRef(false)
  /** Tijdens floor_plan_tables-upsert: geen kortere parent-seed die net toegevoegde tafels weggooit (poll/realtime-race). */
  const persistFloorTablesInflightRef = useRef(0)
  const floorRectCachedRef = useRef<DOMRect | null>(null)
  const dragPaintRafRef = useRef<number | null>(null)
  /** Live % tijdens slepen: max 1 React-update per frame. */
  const [dragPaint, setDragPaint] = useState<{ id: string; x: number; y: number } | null>(null)
  const pendingDragPctRef = useRef<{ x: number; y: number } | null>(null)
  const innerCanvasRef = useRef<HTMLDivElement | null>(null)
  /** Één gesture-laag: capture op canvas + hit-test (touch/desktop, alle tenants). */
  const floorGestureRef = useRef<{ pointerId: number; kind: 'table' | 'decor'; id: string } | null>(null)
  const tapStartedEmptyRef = useRef(false)
  /** Pauzeer localStorage-sync van tables tijdens eender welke vloer-interactie (zoals voorheen isDragging). */
  const floorPersistPausedRef = useRef(false)

  const setBodyGrabbing = (on: boolean) => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle('vysion-floor-plan-grabbing', on)
  }

  const scheduleDragPaintFromPending = () => {
    if (dragPaintRafRef.current != null) return
    dragPaintRafRef.current = requestAnimationFrame(() => {
      dragPaintRafRef.current = null
      const p = pendingDragPctRef.current
      const id = draggingId.current
      const dt = draggingType.current
      if (p && id && (dt === 'table' || dt === 'decor')) {
        setDragPaint({ id, x: p.x, y: p.y })
      }
    })
  }

  const cancelDragPaintRaf = () => {
    if (dragPaintRafRef.current != null) {
      cancelAnimationFrame(dragPaintRafRef.current)
      dragPaintRafRef.current = null
    }
  }

  const persistFloorPlanTablesToBackend = useCallback(
    (data: KassaTable[]) => {
      persistFloorTablesInflightRef.current += 1
      onFloorPlanTablesPersistLifecycle?.(planZone, 'start')
      void adminDb
        .upsert(
          'floor_plan_tables',
          { tenant_slug: tenant, plan_zone: planZone, data } as Record<string, unknown>,
          { tenantSlug: tenant, onConflict: 'tenant_slug,plan_zone' },
        )
        .then((r) => {
          if (!r.ok) console.error('[KassaFloorPlan] floor_plan_tables:', r.error)
          else onFloorPlanTablesPersisted?.(planZone, data)
        })
        .finally(() => {
          persistFloorTablesInflightRef.current -= 1
          onFloorPlanTablesPersistLifecycle?.(planZone, 'end')
        })
    },
    [tenant, planZone, onFloorPlanTablesPersisted, onFloorPlanTablesPersistLifecycle],
  )

  const persistFloorPlanDecorToBackend = (data: {
    items: DecorItem[]
    stool_statuses: Record<string, TableStatus>
  }) => {
    void adminDb
      .upsert(
        'floor_plan_decor',
        { tenant_slug: tenant, plan_zone: planZone, data } as Record<string, unknown>,
        { tenantSlug: tenant, onConflict: 'tenant_slug,plan_zone' },
      )
      .then((r) => {
        if (!r.ok) console.error('[KassaFloorPlan] floor_plan_decor:', r.error)
      })
  }

  useEffect(() => () => {
    setBodyGrabbing(false)
  }, [])

  const releaseCapturedPointer = (e: React.PointerEvent) => {
    const cap = pointerCaptureRef.current
    if (!cap || cap.pointerId !== e.pointerId) return
    try {
      cap.element.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    pointerCaptureRef.current = null
  }

  const takePointerCapture = (el: HTMLElement, pointerId: number) => {
    try {
      el.setPointerCapture(pointerId)
      pointerCaptureRef.current = { pointerId, element: el }
    } catch {
      /* ignore */
    }
  }

  // ── Helpers: parse floor_plan_decor (oud: array, nieuw: {items, stool_statuses}) ──
  const parseDecorData = (raw: unknown) => {
    if (!raw) return { items: [] as DecorItem[], statuses: {} as Record<string, TableStatus> }
    if (Array.isArray(raw)) return { items: raw as DecorItem[], statuses: {} }
    const obj = raw as { items?: DecorItem[]; stool_statuses?: Record<string, TableStatus> }
    return { items: obj.items || [], statuses: obj.stool_statuses || {} }
  }

  const seedSignature = useMemo(() => JSON.stringify(seedTables ?? []), [seedTables])

  // Zelfde bron als kassa-tafelkiezer — voorkomt lege plattegrond terwijl de lijst wel knoppen heeft
  useEffect(() => {
    if (!seedTables?.length) return
    setTables((prev) => {
      const incoming = sanitizeTables(seedTables)
      if (prev.length === 0) return incoming
      const prevIds = new Set(prev.map((t) => t.id))

      if (incoming.some((t) => !prevIds.has(t.id))) {
        const byId = new Map<string, KassaTable>()
        for (const t of prev) byId.set(t.id, t)
        for (const t of incoming) byId.set(t.id, t)
        return sanitizeTables([...byId.values()])
      }

      if (
        persistFloorTablesInflightRef.current > 0 &&
        incoming.length < prev.length &&
        incoming.every((t) => prevIds.has(t.id))
      ) {
        return prev
      }

      return incoming
    })
  }, [seedSignature, seedTables])

  // ── Laden: cache paint → admin DB-read (betrouwbaar) → fallback anon Supabase ──
  useEffect(() => {
    const mergeRemoteTables = (raw: unknown) => {
      const parsed = parseFloorPlanTablesJson(raw)
      if (parsed === null) return false
      const fixed = sanitizeTables(parsed)
      setTables(fixed)
      localStorage.setItem(storageKey, JSON.stringify(fixed))
      if (JSON.stringify(fixed) !== JSON.stringify(parsed)) {
        persistFloorPlanTablesToBackend(fixed)
      }
      return true
    }

    const load = async () => {
      const localTables = (() => {
        try {
          const r = localStorage.getItem(storageKey)
          return r ? JSON.parse(r) : null
        } catch {
          return null
        }
      })()
      if (Array.isArray(localTables)) {
        setTables(sanitizeTables(localTables as KassaTable[]))
      }

      const adminRes = await adminDb.select<{ data?: unknown } | null>('floor_plan_tables', {
        tenantSlug: tenant,
        select: 'data',
        match: { plan_zone: planZone },
        single: 'maybe',
      })

      let merged = false
      if (adminRes.ok) {
        const row = adminRes.data as { data?: unknown } | null | undefined
        if (row == null) merged = mergeRemoteTables([])
        else merged = mergeRemoteTables(row.data)
      }

      if (!merged) {
        const { data: tData, error: tErr } = await supabase
          .from('floor_plan_tables')
          .select('data')
          .eq('tenant_slug', tenant)
          .eq('plan_zone', planZone)
          .maybeSingle()
        if (!tErr) {
          if (tData == null) mergeRemoteTables([])
          else mergeRemoteTables(tData.data)
        }
      }

      const localDecor = (() => {
        try {
          const r = localStorage.getItem(decorKey)
          return r ? JSON.parse(r) : null
        } catch {
          return null
        }
      })()
      const localStoolStatus = (() => {
        try {
          const r = localStorage.getItem(stoolStatusKey)
          return r ? JSON.parse(r) : null
        } catch {
          return null
        }
      })()
      if (localDecor) {
        const fixedD = sanitizeDecors(localDecor as DecorItem[])
        setDecors(fixedD)
        if (JSON.stringify(fixedD) !== JSON.stringify(localDecor)) {
          localStorage.setItem(decorKey, JSON.stringify(fixedD))
        }
        if (localStoolStatus && typeof localStoolStatus === 'object') setStoolStatuses(localStoolStatus)
      }

      const { data: dData, error: dErr } = await supabase
        .from('floor_plan_decor')
        .select('data')
        .eq('tenant_slug', tenant)
        .eq('plan_zone', planZone)
        .maybeSingle()

      if (!dErr && dData?.data != null) {
        const { items, statuses } = parseDecorData(dData.data)
        const fixedItems = sanitizeDecors(items)
        setDecors(fixedItems)
        setStoolStatuses(statuses)
        localStorage.setItem(decorKey, JSON.stringify(fixedItems))
        localStorage.setItem(stoolStatusKey, JSON.stringify(statuses))
      }
    }
    void load()
  }, [tenant, planZone, storageKey, decorKey, stoolStatusKey, persistFloorPlanTablesToBackend])

  // ── Realtime subscriptions: sync tussen apparaten ────────────────────────
  useEffect(() => {
    const tableChannel = supabase
      .channel(`fpt_${tenant}_${planZone}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'floor_plan_tables', filter: `tenant_slug=eq.${tenant}` },
        (payload: {
          eventType?: string
          new?: { data?: unknown; plan_zone?: string }
          old?: { plan_zone?: string }
        }) => {
          if (ignoreFloorRealtimeRef.current) return
          const z = floorPlanZoneFromRealtimePayload(payload)
          if (!z || z !== planZone) return
          if (payload.eventType === 'DELETE') {
            setTables([])
            localStorage.setItem(storageKey, JSON.stringify([]))
            return
          }
          const newRow = payload.new
          if (!newRow) return
          const parsed = parseFloorPlanTablesJson(newRow.data)
          if (parsed === null) return
          const fixed = sanitizeTables(parsed)
          setTables(fixed)
          localStorage.setItem(storageKey, JSON.stringify(fixed))
        }
      )
      .subscribe()

    const decorChannel = supabase
      .channel(`fpd_${tenant}_${planZone}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'floor_plan_decor', filter: `tenant_slug=eq.${tenant}` },
        (payload: {
          eventType?: string
          new?: { data?: unknown; plan_zone?: string }
          old?: { plan_zone?: string }
        }) => {
          if (ignoreFloorRealtimeRef.current) return
          const z = floorPlanZoneFromRealtimePayload(payload)
          if (!z || z !== planZone) return
          if (payload.eventType === 'DELETE') {
            setDecors([])
            setStoolStatuses({})
            localStorage.setItem(decorKey, JSON.stringify([]))
            localStorage.setItem(stoolStatusKey, JSON.stringify({}))
            return
          }
          const ins = payload.new
          if (ins?.data) {
            const { items, statuses } = parseDecorData(ins.data)
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
      void supabase.removeChannel(tableChannel).catch(() => {})
      void supabase.removeChannel(decorChannel).catch(() => {})
    }
  }, [tenant, planZone, storageKey, decorKey, stoolStatusKey])

  useEffect(() => {
    if (selectedDecor?.type === 'bar_segment') {
      setEditStoolVals({ s1: selectedDecor.stool1 || '', s2: selectedDecor.stool2 || '' })
    }
  }, [selectedDecor])

  // Veiligheidsnet voor iPad: sla posities altijd op na elke drag
  useEffect(() => {
    if (tables.length > 0 && !floorPersistPausedRef.current) {
      localStorage.setItem(storageKey, JSON.stringify(tables))
    }
  }, [tables, storageKey])

  const save = (updated: KassaTable[]) => {
    setTables(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
    persistFloorPlanTablesToBackend(updated)
  }

  // Sla decor + huidige krukstatussen samen op (één Supabase-rij, backward-compatible)
  const saveDecor = (updated: DecorItem[], currentStoolStatuses?: Record<string, TableStatus>) => {
    setDecors(updated)
    localStorage.setItem(decorKey, JSON.stringify(updated))
    const payload = { items: updated, stool_statuses: currentStoolStatuses ?? stoolStatuses }
    persistFloorPlanDecorToBackend(payload)
  }

  // Sla krukstatus op + sync naar Supabase zodat andere apparaten het zien
  const saveStoolStatus = (updated: Record<string, TableStatus>) => {
    setStoolStatuses(updated)
    localStorage.setItem(stoolStatusKey, JSON.stringify(updated))
    const payload = { items: decors, stool_statuses: updated }
    persistFloorPlanDecorToBackend(payload)
  }

  // Effectieve stoel/tafel status:
  // - Geen items → altijd VRIJ (betaald = automatisch vrij)
  // - Items aanwezig + manueel ONBETAALD → ONBETAALD
  // - Items aanwezig, geen override → BEZET
  const orderedInZone = useMemo(
    () => displayNumbersWithOpenOrdersInZone(tableOrders, planZone),
    [tableOrders, planZone],
  )

  const getStoolStatus = (stoolId: string): TableStatus => {
    const hasItems = (tableOrders[tableOrderMapKey(planZone, stoolId)] || []).length > 0
    if (!hasItems) return 'FREE'
    if (stoolStatuses[stoolId] === 'UNPAID') return 'UNPAID'
    return 'OCCUPIED'
  }

  const getTableEffectiveStatus = (tableNumber: string, storedStatus: TableStatus): TableStatus => {
    const hasItems = (tableOrders[tableOrderMapKey(planZone, tableNumber)] || []).length > 0
    if (!hasItems) return 'FREE'
    if (storedStatus === 'UNPAID') return 'UNPAID'
    return 'OCCUPIED'
  }

  const floorSurfaceStyle = useMemo(
    () => ({
      cursor: 'default',
      touchAction: 'none' as const,
    }),
    [],
  )

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
    const x = clampPct(50)
    const y = clampPct(50)
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
    setShowAddModal(false)
    setAddNumber('')
    setAddSeats(4)
    save([...tables, t])
    setSelected(t)
  }

  addTableRef.current = addTable

  useEffect(() => {
    if (!showAddModal) return
    const input = addTableNumberInputRef.current
    const raf = requestAnimationFrame(() => input?.focus({ preventScroll: true }))
    const to = window.setTimeout(() => input?.focus({ preventScroll: true }), 80)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const ae = document.activeElement
      if (ae === input) return
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowAddModal(false)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        addTableRef.current()
        return
      }
      if (e.key === 'Backspace') {
        e.preventDefault()
        setAddNumber((prev) => prev.slice(0, -1))
        input?.focus({ preventScroll: true })
        return
      }
      if (e.key.length === 1) {
        e.preventDefault()
        setAddNumber((prev) => prev + e.key)
        input?.focus({ preventScroll: true })
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(to)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [showAddModal])

  useEffect(() => {
    if (!showAddBarModal) return
    const input = addStool1InputRef.current
    const raf = requestAnimationFrame(() => input?.focus({ preventScroll: true }))
    const to = window.setTimeout(() => input?.focus({ preventScroll: true }), 80)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(to)
    }
  }, [showAddBarModal])

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

  /** Welke tafel/decor ligt visueel bovenaan op dit punt — DOM-stack i.p.v. per-element listeners (touch + muis, alle tenants). */
  const resolveFloorHit = useCallback((clientX: number, clientY: number): { kind: 'table' | 'decor'; id: string } | null => {
    const root = innerCanvasRef.current
    if (!root || typeof document === 'undefined') return null
    let stack: Element[]
    try {
      stack = document.elementsFromPoint(clientX, clientY)
    } catch {
      return null
    }
    for (const el of stack) {
      if (!(el instanceof HTMLElement)) continue
      if (!root.contains(el)) continue
      const tw = el.closest('[data-vysion-floor-table]')
      const tid = tw?.getAttribute('data-vysion-floor-table')
      if (tid) return { kind: 'table', id: tid }
      const dw = el.closest('[data-vysion-floor-decor]')
      const did = dw?.getAttribute('data-vysion-floor-decor')
      if (did) return { kind: 'decor', id: did }
    }
    return null
  }, [])

  const canvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (showAddModal || showAddBarModal) return
    const canvas = innerCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      return
    }

    dragMoved.current = false
    pointerStart.current = { x: e.clientX, y: e.clientY }
    floorGestureRef.current = null
    tapStartedEmptyRef.current = false
    draggingId.current = null

    const hit = resolveFloorHit(e.clientX, e.clientY)

    if (!hit) {
      tapStartedEmptyRef.current = true
      takePointerCapture(canvas, e.pointerId)
      return
    }

    floorGestureRef.current = { pointerId: e.pointerId, kind: hit.kind, id: hit.id }
    takePointerCapture(canvas, e.pointerId)

    if (isLocked) return

    const item =
      hit.kind === 'table' ? tables.find((t) => t.id === hit.id) : decors.find((d) => d.id === hit.id)
    if (!item) return

    draggingId.current = hit.id
    draggingType.current = hit.kind === 'table' ? 'table' : 'decor'
    pendingDragPctRef.current = null
    cancelDragPaintRaf()
    floorRectCachedRef.current = rect
    setDragPaint({ id: hit.id, x: item.x, y: item.y })
    ignoreFloorRealtimeRef.current = true
    floorPersistPausedRef.current = true
    setBodyGrabbing(true)
    dragOffset.current = {
      x: e.clientX - rect.left - (item.x / 100) * rect.width,
      y: e.clientY - rect.top - (item.y / 100) * rect.height,
    }
  }

  const canvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (showAddModal || showAddBarModal) return
    if (isLocked) return
    const g = floorGestureRef.current
    if (!g || g.pointerId !== e.pointerId) return
    if (!draggingId.current) return

    const dx = Math.abs(e.clientX - pointerStart.current.x)
    const dy = Math.abs(e.clientY - pointerStart.current.y)
    if (dx < 8 && dy < 8) return
    dragMoved.current = true

    const c = innerCanvasRef.current
    if (!c) return
    const r = floorRectCachedRef.current ?? c.getBoundingClientRect()
    const x = Math.max(1, Math.min(99, ((e.clientX - r.left - dragOffset.current.x) / r.width) * 100))
    const y = Math.max(1, Math.min(99, ((e.clientY - r.top - dragOffset.current.y) / r.height) * 100))
    pendingDragPctRef.current = { x, y }
    scheduleDragPaintFromPending()
  }

  const canvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const wasEmptyTap = tapStartedEmptyRef.current
    releaseCapturedPointer(e)

    if (wasEmptyTap) {
      tapStartedEmptyRef.current = false
      const dx = Math.abs(e.clientX - pointerStart.current.x)
      const dy = Math.abs(e.clientY - pointerStart.current.y)
      if (dx < 8 && dy < 8) {
        setSelected(null)
        setSelectedDecor(null)
      }
      draggingId.current = null
      floorGestureRef.current = null
      setTimeout(() => {
        dragMoved.current = false
      }, 0)
      return
    }

    const g = floorGestureRef.current
    if (!g || g.pointerId !== e.pointerId) {
      tapStartedEmptyRef.current = false
      floorGestureRef.current = null
      cancelDragPaintRaf()
      ignoreFloorRealtimeRef.current = false
      floorRectCachedRef.current = null
      floorPersistPausedRef.current = false
      setBodyGrabbing(false)
      setDragPaint(null)
      pendingDragPctRef.current = null
      draggingId.current = null
      setTimeout(() => {
        dragMoved.current = false
      }, 0)
      return
    }
    floorGestureRef.current = null

    if (isLocked) {
      cancelDragPaintRaf()
      ignoreFloorRealtimeRef.current = false
      floorRectCachedRef.current = null
      floorPersistPausedRef.current = false
      setBodyGrabbing(false)
      setDragPaint(null)
      pendingDragPctRef.current = null
      draggingId.current = null
      if (!dragMoved.current) {
        if (g.kind === 'table') {
          const tbl = tables.find((t) => t.id === g.id)
          if (tbl) {
            setSelected((prev) => (prev?.id === tbl.id ? null : tbl))
            setSelectedDecor(null)
          }
        } else {
          const dec = decors.find((d) => d.id === g.id)
          if (dec) {
            setSelectedDecor((prev) => (prev?.id === dec.id ? null : dec))
            setSelected(null)
          }
        }
      }
      setTimeout(() => {
        dragMoved.current = false
      }, 0)
      return
    }

    const id = draggingId.current
    const pct = pendingDragPctRef.current
    cancelDragPaintRaf()
    ignoreFloorRealtimeRef.current = false
    floorRectCachedRef.current = null
    floorPersistPausedRef.current = false
    setBodyGrabbing(false)

    if (dragMoved.current && pct) {
      if (draggingType.current === 'table' && id) {
        setTables((latest) => {
          const next = latest.map((t) => (t.id === id ? { ...t, x: pct.x, y: pct.y } : t))
          localStorage.setItem(storageKey, JSON.stringify(next))
          persistFloorPlanTablesToBackend(next)
          return next
        })
        setSelected((sel) => (sel?.id === id ? { ...sel, x: pct.x, y: pct.y } : sel))
      } else if (draggingType.current === 'decor' && id) {
        setDecors((latestDecors) => {
          const next = latestDecors.map((d) => (d.id === id ? { ...d, x: pct.x, y: pct.y } : d))
          const payload = { items: next, stool_statuses: stoolStatuses }
          localStorage.setItem(decorKey, JSON.stringify(next))
          persistFloorPlanDecorToBackend(payload)
          return next
        })
        setSelectedDecor((sel) => (sel?.id === id ? { ...sel, x: pct.x, y: pct.y } : sel))
      }
    } else if (!dragMoved.current && id) {
      if (draggingType.current === 'table') {
        const tbl = tables.find((t) => t.id === id)
        if (tbl) {
          setSelected((prev) => (prev?.id === tbl.id ? null : tbl))
          setSelectedDecor(null)
        }
      } else {
        const dec = decors.find((d) => d.id === id)
        if (dec) {
          setSelectedDecor((prev) => (prev?.id === dec.id ? null : dec))
          setSelected(null)
        }
      }
    }

    setDragPaint(null)
    pendingDragPctRef.current = null
    draggingId.current = null
    setTimeout(() => {
      dragMoved.current = false
    }, 0)
  }

  const canvasPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    releaseCapturedPointer(e)
    tapStartedEmptyRef.current = false
    floorGestureRef.current = null
    cancelDragPaintRaf()
    ignoreFloorRealtimeRef.current = false
    floorRectCachedRef.current = null
    floorPersistPausedRef.current = false
    setBodyGrabbing(false)
    setDragPaint(null)
    pendingDragPctRef.current = null
    draggingId.current = null
    setTimeout(() => {
      dragMoved.current = false
    }, 0)
  }

  const modalOpen = showAddModal || showAddBarModal

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`}>
      {/* Bij open modal: geen pointer-events naar vloer/header (iPad raakte vast na capture) */}
      <div className={`flex min-h-0 flex-1 flex-col ${modalOpen ? 'pointer-events-none' : ''}`}>
      {/* Header */}
      <div
        className={`flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#1a1a1a] px-4 py-3 ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`}
      >
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {planZone === FLOOR_PLAN_ZONE_TERRACE
              ? t('kassaApp.floorPlanTerraceTitle')
              : t('kassaApp.floorPlanSameFloorTitle')}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/75">
            <span className="font-semibold text-white/90">
              {planZone === FLOOR_PLAN_ZONE_TERRACE ? t('kassaApp.floorZoneTerrace') : t('kassaApp.floorZoneInside')}
            </span>
            <span aria-hidden>·</span>
            <span>
              {t('kassaApp.floorPlanFreeCount')
                .replace('{free}', String(tables.filter((tbl) => tbl.status === 'FREE').length))
                .replace('{total}', String(tables.length))}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!isLocked && (
            <>
              <button type="button" onClick={() => setShowAddModal(true)} className={FLOOR_TOOLBAR_BTN}>
                {t('kassaApp.floorPlanAddTable')}
              </button>
              <button type="button" onClick={openAddBarModal} className={FLOOR_TOOLBAR_BTN}>
                {t('kassaApp.floorPlanAddBar')}
              </button>
              <button type="button" onClick={() => addDecor('plant')} className={FLOOR_TOOLBAR_BTN}>
                {t('kassaApp.floorPlanAddPlant')}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setIsLocked(prev => !prev)}
            title={isLocked ? t('kassaApp.floorPlanLockTitleLocked') : t('kassaApp.floorPlanLockTitleUnlocked')}
            className={FLOOR_TOOLBAR_BTN}
          >
            {isLocked ? t('kassaApp.floorPlanLocked') : t('kassaApp.floorPlanEditing')}
          </button>
          <button type="button" onClick={onClose} className={FLOOR_TOOLBAR_BTN}>
            {t('kassaApp.closeAria')}
          </button>
        </div>
      </div>

      {/* Floor + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Floor plan — tegelpatroon vast; alleen tafels/decor verschuiven */}
        <div
          className={`floor-plan relative flex-1 select-none overflow-hidden ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`}
          style={floorSurfaceStyle}
        >
          <div
            ref={innerCanvasRef}
            style={{ position: 'absolute', inset: 0, touchAction: 'manipulation' }}
            onPointerDown={canvasPointerDown}
            onPointerMove={canvasPointerMove}
            onPointerUp={canvasPointerUp}
            onPointerCancel={canvasPointerCancel}
          >

          {/* Decor items (achtergrond laag) */}
          {decors.map(d => {
            const px = dragPaint?.id === d.id ? dragPaint.x : d.x
            const py = dragPaint?.id === d.id ? dragPaint.y : d.y
            return (
            <div key={d.id}
              data-vysion-floor-decor={d.id}
              className="absolute"
              style={{
                left: `${px}%`,
                top: `${py}%`,
                transform: `translate(-50%, -50%) rotate(${d.rotation}deg)`,
                zIndex: dragPaint?.id === d.id ? 40 : selectedDecor?.id === d.id ? 9 : 0,
                cursor: 'grab',
                touchAction: 'none',
              }}
            >
              <DecorSVG item={d} isSelected={selectedDecor?.id === d.id} orderedStools={orderedInZone} stoolStatuses={stoolStatuses} getStoolStatus={getStoolStatus} barLabel={t('kassaApp.floorPlanBarLabel')} />
            </div>
            )
          })}

          {tables.map(t => {
            const px = dragPaint?.id === t.id ? dragPaint.x : t.x
            const py = dragPaint?.id === t.id ? dragPaint.y : t.y
            return (
            <div
              key={t.id}
              data-vysion-floor-table={t.id}
              className="absolute"
              style={{
                left: `${px}%`,
                top: `${py}%`,
                transform: `translate(-50%, -50%) rotate(${t.rotation}deg)`,
                zIndex: dragPaint?.id === t.id ? 40 : selected?.id === t.id ? 10 : 1,
                cursor: 'grab',
                touchAction: 'none',
              }}
            >
              <TableSVG
                table={t}
                isSelected={selected?.id === t.id}
                effectiveStatus={getTableEffectiveStatus(t.number, t.status)}
                visualZone={planZone === FLOOR_PLAN_ZONE_TERRACE ? 'terrace' : 'indoor'}
              />
            </div>
            )
          })}

          {tables.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
              <span className="text-6xl mb-4">🪑</span>
              <p className="text-lg font-semibold">{t('kassaApp.floorPlanNoTablesYet')}</p>
              <button onClick={() => setShowAddModal(true)}
                className="mt-4 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors">
                {t('kassaApp.floorPlanAddTableButton')}
              </button>
            </div>
          )}
          </div>{/* einde inner canvas */}

        </div>

        {/* Decor Sidebar */}
        {selectedDecor && !selected && (
          <div className="w-80 bg-[#e3e3e3] border-l border-gray-300 flex flex-col overflow-y-auto">
            <div className="p-4 border-b border-gray-300 flex justify-between items-center">
              <h3 className="text-gray-900 font-bold text-lg">
                {selectedDecor.type === 'plant'
                  ? t('kassaApp.floorPlanSidebarTitlePlant')
                  : t('kassaApp.floorPlanSidebarTitleBar')}
              </h3>
              <button onClick={() => setSelectedDecor(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>

            {/* Bar segment: kruk nummers + bestellingen + bestelling starten */}
            {selectedDecor.type === 'bar_segment' && (() => {
              const s1 = selectedDecor.stool1 || 'K?'
              const s2 = selectedDecor.stool2 || 'K?'
              const items1 = tableOrders[tableOrderMapKey(planZone, s1)] || []
              const items2 = tableOrders[tableOrderMapKey(planZone, s2)] || []
              const total1 = items1.reduce((sum, item) => sum + (item.product.price + (item.choices||[]).reduce((s,c)=>s+c.price,0)) * item.quantity, 0)
              const total2 = items2.reduce((sum, item) => sum + (item.product.price + (item.choices||[]).reduce((s,c)=>s+c.price,0)) * item.quantity, 0)

              const StoolPanel = ({ stoolId, items, total }: { stoolId: string; items: SimpleCartItem[]; total: number }) => {
                const status = getStoolStatus(stoolId)
                return (
                  <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                    {/* Kruk header met status kleur */}
                    <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: STATUS_COLORS[status] + '33', borderLeft: `4px solid ${STATUS_COLORS[status]}` }}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: STATUS_COLORS[status] }}>{stoolId}</div>
                        <span className="text-gray-900 font-bold text-sm">
                          {t('kassaApp.floorPlanStoolHeading').replace(/\{id\}/g, stoolId)}
                        </span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: STATUS_COLORS[status] }}>{statusLabels[status]}</span>
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
                                  <span className="text-gray-900 text-xs font-semibold">{item.quantity}× {item.product.name}</span>
                                  {(item.choices||[]).map((c,ci) => (
                                    <p key={ci} className="text-gray-500 text-xs ml-2">+ {c.choiceName}</p>
                                  ))}
                                </div>
                                <span className="text-amber-400 text-xs font-bold ml-2 shrink-0">€{((item.product.price+choiceTotal)*item.quantity).toFixed(2)}</span>
                              </div>
                            )
                          })}
                          <div className="flex justify-between pt-1 border-t border-gray-200 mt-1">
                            <span className="text-gray-500 text-xs">{t('kassaApp.cartTotal')}</span>
                            <span className="text-gray-900 text-xs font-bold">€{total.toFixed(2)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-400 text-xs">{t('kassaApp.floorPlanNoOpenOrder')}</p>
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
                              : { backgroundColor: '#d1d5db', color: '#374151' }
                            }>
                            {statusLabels[s as TableStatus]}{warnUnpaid ? ' ⚠️' : ''}
                          </button>
                        )
                      })}
                    </div>
                    {/* Afrekenen + bestelling */}
                    <div className="px-3 pb-3 space-y-2">
                      {onCheckoutTable && items.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onCheckoutTable(stoolId)}
                          className="w-full py-3 rounded-xl bg-[#3C4D6B] hover:bg-[#2D3A52] text-white font-bold text-base transition-colors"
                        >
                          💳 {t('kassaApp.floorPlanCheckoutStool').replace(/\{id\}/g, stoolId)}
                        </button>
                      )}
                      <button
                        onClick={() => { onSelectTable(stoolId); onClose() }}
                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base transition-colors">
                        🛒{' '}
                        {items.length > 0
                          ? t('kassaApp.floorPlanAddToStool').replace(/\{id\}/g, stoolId)
                          : t('kassaApp.floorPlanNewOrderStool').replace(/\{id\}/g, stoolId)}
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <>
                  <div className="p-4 border-b border-gray-300 flex-1 overflow-y-auto">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">{t('kassaApp.stoolsSection')}</p>
                    <StoolPanel stoolId={s1} items={items1} total={total1} />
                    <StoolPanel stoolId={s2} items={items2} total={total2} />
                  </div>
                  <div className="p-4 border-b border-gray-300 space-y-2">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                      {t('kassaApp.floorPlanEditStoolNumbersTitle')}
                    </p>
                    <div className="flex gap-2 items-center">
                      <span className="text-gray-600 text-xs w-14">{t('kassaApp.floorPlanStool1Label')}</span>
                      <input
                        value={editStoolVals.s1}
                        onChange={e => setEditStoolVals(prev => ({ ...prev, s1: e.target.value }))}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-white text-gray-900 text-sm font-bold text-center outline-none border border-gray-300 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-gray-600 text-xs w-14">{t('kassaApp.floorPlanStool2Label')}</span>
                      <input
                        value={editStoolVals.s2}
                        onChange={e => setEditStoolVals(prev => ({ ...prev, s2: e.target.value }))}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-white text-gray-900 text-sm font-bold text-center outline-none border border-gray-300 focus:border-blue-500"
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
                      className="w-full py-1.5 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 text-sm font-semibold transition-colors">
                      {t('kassaApp.floorPlanSaveBarStools')}
                    </button>
                  </div>
                </>
              )
            })()}

            {!isLocked && (
              <>
                <div className="p-4 border-b border-gray-300">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{t('kassaApp.floorPlanRotateTitle')}</p>
                  <div className="flex gap-2">
                    <button onClick={() => rotateDecor(selectedDecor.id, -45)}
                      className="flex-1 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-lg">↺</button>
                    <button onClick={() => rotateDecor(selectedDecor.id, 45)}
                      className="flex-1 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-lg">↻</button>
                    <button onClick={() => rotateDecor(selectedDecor.id, -selectedDecor.rotation)}
                      className="flex-1 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold">{t('kassaApp.floorPlanResetBtn')}</button>
                  </div>
                </div>
                <div className="p-4 mt-auto">
                  <button onClick={() => deleteDecor(selectedDecor.id)}
                    className="w-full py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-semibold">
                    {t('kassaApp.floorPlanDeleteDecor')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tafel Sidebar */}
        {selected && (() => {
          const items = tableOrders[tableOrderMapKey(planZone, selected.number)] || []
          const hasItems = items.length > 0
          const effectiveStatus = getTableEffectiveStatus(selected.number, selected.status)
          const totalPrice = items.reduce((sum, item) => {
            const choiceTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
            return sum + (item.product.price + choiceTotal) * item.quantity
          }, 0)

          return (
            <div className="w-80 bg-[#e3e3e3] border-l border-gray-300 flex flex-col">
              {/* Header met status kleur */}
              <div className="p-4 border-b border-gray-300 flex justify-between items-center" style={{ borderLeft: `4px solid ${STATUS_COLORS[effectiveStatus]}` }}>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-gray-900 font-bold text-xl">
                      {t('kassaApp.floorPlanTableHeader').replace(/\{number\}/g, selected.number)}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: STATUS_COLORS[effectiveStatus] }}>{statusLabels[effectiveStatus]}</span>
                  </div>
                  <p className="text-gray-500 text-xs">
                    {t('kassaApp.floorPlanSeatsLine').replace(/\{count\}/g, String(selected.seats))}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
              </div>

              {/* Bestellingen */}
              <div className="flex-1 overflow-y-auto p-4 border-b border-gray-300">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">{t('kassaApp.floorPlanOrderHeading')}</p>
                {hasItems ? (
                  <div className="space-y-2">
                    {items.map((item, i) => {
                      const choiceTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
                      const lineTotal = (item.product.price + choiceTotal) * item.quantity
                      return (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <span className="text-gray-900 font-semibold text-sm">
                                {item.quantity}× {item.product.name}
                              </span>
                              {(item.choices || []).length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {item.choices!.map((c, ci) => (
                                    <p key={ci} className="text-gray-500 text-xs">
                                      + {c.choiceName}{c.price > 0 ? ` (€${c.price.toFixed(2)})` : ''}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="text-amber-600 font-bold text-sm ml-2 shrink-0">
                              €{lineTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    {/* Totaal */}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                      <span className="text-gray-600 text-sm font-semibold">{t('kassaApp.cartTotal')}</span>
                      <span className="text-gray-900 font-bold text-lg">€{totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-6">{t('kassaApp.floorPlanNoOpenOrder')}</p>
                )}
              </div>

              {/* Rotatie — alleen in bewerkmodus */}
              {!isLocked && (
                <div className="p-4 border-b border-gray-300">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{t('kassaApp.floorPlanRotateTitle')}</p>
                  <div className="flex gap-2">
                    <button onClick={() => rotate(selected.id, -45)}
                      className="flex-1 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-lg transition-colors">↺</button>
                    <button onClick={() => rotate(selected.id, 45)}
                      className="flex-1 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-lg transition-colors">↻</button>
                    <button onClick={() => rotate(selected.id, -selected.rotation)}
                      className="flex-1 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold transition-colors">{t('kassaApp.floorPlanResetBtn')}</button>
                  </div>
                </div>
              )}

              {/* Status toggle */}
              <div className="p-4 border-b border-gray-300 space-y-2">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{t('kassaApp.floorPlanStatusHeading')}</p>
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
                          : { backgroundColor: '#d1d5db', color: '#374151' }
                      }>
                      {statusLabels[s as TableStatus]}{warnUnpaid ? ' ⚠️' : ''}
                    </button>
                  )
                })}
              </div>

              <div className="p-4 space-y-2">
                {onCheckoutTable && hasItems && (
                  <button
                    type="button"
                    onClick={() => onCheckoutTable(selected.number)}
                    className={`w-full py-3 font-bold ${kassaPosButtonClass(false)}`}
                  >
                    💳 {t('kassaApp.floorPlanCheckoutTable')}
                  </button>
                )}
                <button
                  onClick={() => { onSelectTable(selected.number); onClose() }}
                  className={`w-full py-3 font-bold ${kassaPosButtonClass(false)}`}
                >
                  {hasItems ? t('kassaApp.floorPlanAddToOrderTable') : t('kassaApp.floorPlanNewOrderTable')}
                </button>
                {!isLocked && (
                  <button onClick={() => deleteTable(selected.id)}
                    className="w-full py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-semibold transition-colors">
                    {t('kassaApp.floorPlanDeleteTableBtn')}
                  </button>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Legend */}
      <div
        className={`flex h-10 shrink-0 items-center justify-center gap-6 border-t border-[#1a1a1a] text-sm text-white/80 ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`}
      >
        {(Object.entries(STATUS_COLORS) as [TableStatus, string][]).map(([s, c]) => (
          <div key={s} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
            <span>{statusLabels[s as TableStatus]}</span>
          </div>
        ))}
        {isLocked ? (
          <span className="ml-4 text-xs text-white/90">{t('kassaApp.floorPlanLegendLocked')}</span>
        ) : (
          <span className="ml-4 text-xs text-white/90">{t('kassaApp.floorPlanLegendEditMode')}</span>
        )}
      </div>
      </div>

      {/* Add bar segment modal */}
      {showAddBarModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 touch-manipulation">
          <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">{t('kassaApp.floorPlanModalAddBarTitle')}</h3>
              <button type="button" onClick={() => setShowAddBarModal(false)} className="min-h-[44px] min-w-[44px] touch-manipulation text-2xl text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500">{t('kassaApp.floorPlanModalAddBarIntro')}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{t('kassaApp.floorPlanModalStool1Label')}</label>
                  <input
                    ref={addStool1InputRef}
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    enterKeyHint="done"
                    autoFocus
                    value={addStool1}
                    onChange={e => setAddStool1(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && confirmAddBar()}
                    onPointerDown={focusFloorModalInput}
                    className={`w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 outline-none text-xl font-bold text-center ${FLOOR_MODAL_INPUT_LIGHT} ${FLOOR_MODAL_TOUCH}`}
                    placeholder={t('kassaApp.floorPlanPlaceholderStoolExample')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{t('kassaApp.floorPlanModalStool2Label')}</label>
                  <input
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    enterKeyHint="done"
                    value={addStool2}
                    onChange={e => setAddStool2(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && confirmAddBar()}
                    onPointerDown={focusFloorModalInput}
                    className={`w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 outline-none text-xl font-bold text-center ${FLOOR_MODAL_INPUT_LIGHT} ${FLOOR_MODAL_TOUCH}`}
                    placeholder={t('kassaApp.floorPlanPlaceholderStoolExample')}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 border-t p-4">
              <button type="button" onClick={() => setShowAddBarModal(false)} className="min-h-[44px] flex-1 touch-manipulation rounded-xl bg-gray-100 py-3 font-semibold text-gray-700">{t('kassaApp.cancel')}</button>
              <button type="button" onClick={confirmAddBar} className="min-h-[44px] flex-[2] touch-manipulation rounded-xl bg-amber-600 py-3 font-bold text-white transition-colors hover:bg-amber-700">{t('kassaApp.optionsAdd')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add table modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 touch-manipulation">
          <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">{t('kassaApp.floorPlanModalAddTableTitle')}</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="min-h-[44px] min-w-[44px] touch-manipulation text-2xl text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">{t('kassaApp.floorPlanModalTableNumberLabel')}</label>
                <input
                  ref={addTableNumberInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  autoFocus
                  value={addNumber}
                  onChange={e => setAddNumber(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTable()}
                  onPointerDown={focusFloorModalInput}
                  className={`w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#075985] outline-none text-xl font-bold text-center ${FLOOR_MODAL_INPUT_LIGHT} ${FLOOR_MODAL_TOUCH}`}
                  placeholder={t('kassaApp.floorPlanModalTableNumberPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">{t('kassaApp.floorPlanModalSeatLabel')}</label>
                <div className="grid grid-cols-5 gap-2">
                  {[2, 4, 6, 8, 10].map(n => (
                    <button key={n} type="button" onClick={() => setAddSeats(n)}
                      className={`min-h-[44px] touch-manipulation rounded-xl py-2 font-bold transition-colors ${addSeats === n ? 'bg-[#58CCFF] text-[#063042]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">{t('kassaApp.floorPlanShapeLabel')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['SQUARE', t('kassaApp.floorPlanShapeSquare')] as const,
                      ['ROUND', t('kassaApp.floorPlanShapeRound')] as const,
                      ['RECTANGLE', t('kassaApp.floorPlanShapeRectangle')] as const,
                    ] as const
                  ).map(([s, label]) => (
                    <button key={s} type="button" onClick={() => setAddShape(s)}
                      className={`min-h-[44px] touch-manipulation rounded-xl py-2 text-xs font-bold transition-colors ${addShape === s ? 'bg-[#58CCFF] text-[#063042]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 border-t p-4">
              <button type="button" onClick={() => setShowAddModal(false)} className="min-h-[44px] flex-1 touch-manipulation rounded-xl bg-gray-100 py-3 font-semibold text-gray-700">{t('kassaApp.cancel')}</button>
              <button type="button" onClick={addTable} className="min-h-[44px] flex-[2] touch-manipulation rounded-xl bg-emerald-500 py-3 font-bold text-white transition-colors hover:bg-emerald-600">{t('kassaApp.optionsAdd')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
