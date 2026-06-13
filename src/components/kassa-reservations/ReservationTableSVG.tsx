'use client'

import type { FloorPlanTable } from './kassa-reservations-model'

/** Plattegrond-tafel SVG — identiek aan KassaFloorPlan-stijl (los getrokken voor kleinere hoofdmodule). */
export function ReservationTableSVG({
  table,
  statusColor,
  isSelected,
  guests,
  statusRingOpacity = 1,
}: {
  table: FloorPlanTable
  statusColor: string
  isSelected: boolean
  guests?: { name: string; time: string }[]
  /** 0–1: paarse reserveringsrand verdwijnt richting eind van het slot (alleen CONFIRMED callers). */
  statusRingOpacity?: number
}) {
  const ringOp = Math.min(1, Math.max(0, statusRingOpacity))
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
      chairs.push({ x: 0, y: -dist, angle: 0 })
      chairs.push({ x: 0, y: dist, angle: 180 })
    } else {
      const dist = tableSize / 2 + gap + chairH / 2
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
    if (seats === 2) {
      chairs.push({ x: 0, y: -dist, angle: 0 })
      chairs.push({ x: 0, y: dist, angle: 180 })
    } else {
      const perSide = Math.ceil(seats / 4)
      const sides = [
        { angle: 0, axis: 'x'as const, fixed: -dist },
        { angle: -90, axis: 'y'as const, fixed: dist },
        { angle: 180, axis: 'x'as const, fixed: dist },
        { angle: 90, axis: 'y'as const, fixed: -dist },
      ]
      let placed = 0
      for (const side of sides) {
        const count = Math.min(perSide, seats - placed)
        for (let i = 0; i < count; i++) {
          const offset = (i - (count - 1) / 2) * (chairW + 6)
          chairs.push({
            x: side.axis === 'x'? offset : side.fixed,
            y: side.axis === 'y'? offset : side.fixed,
            angle: side.angle,
          })
          placed++
        }
        if (placed >= seats) break
      }
    }
  } else {
    const rectTw = tableSize * 1.7
    const rectTh = tableSize * 0.65
    const perLong = Math.ceil(seats / 2)
    const distTop = rectTh / 2 + gap + chairH / 2
    const distSide = rectTw / 2 + gap + chairH / 2
    let placed = 0
    for (let i = 0; i < perLong && placed < seats; i++) {
      chairs.push({ x: (i - (perLong - 1) / 2) * (chairW + 6), y: -distTop, angle: 0 })
      placed++
    }
    for (let i = 0; i < perLong && placed < seats; i++) {
      chairs.push({ x: (i - (perLong - 1) / 2) * (chairW + 6), y: distTop, angle: 180 })
      placed++
    }
    if (placed < seats) {
      chairs.push({ x: -distSide, y: 0, angle: 90 })
      placed++
    }
    if (placed < seats) {
      chairs.push({ x: distSide, y: 0, angle: -90 })
    }
  }

  const pad = 80
  const tw = table.shape === 'RECTANGLE'? tableSize * 1.7 : tableSize
  const th = table.shape === 'RECTANGLE'? tableSize * 0.65 : tableSize
  const svgW = tw + pad * 2 + 40
  const svgH = th + pad * 2 + 40
  const cx = svgW / 2
  const cy = svgH / 2

  const uid = table.id.replace(/[^a-z0-9]/gi, '')

  return (
    <svg width={svgW} height={svgH} style={{ overflow: 'visible', display: 'block'}}>
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

      {chairs.map((c, i) => (
        <g key={i} transform={`translate(${cx + c.x}, ${cy + c.y}) rotate(${c.angle})`}>
          <rect x={-chairW / 2 + 1} y={-chairH / 2 + 2} width={chairW} height={chairH + 4} rx={5} fill="rgba(0,0,0,0.35)" />
          <rect x={-chairW / 2} y={-chairH / 2} width={chairW} height={9} rx={4} fill="#888" stroke="#555" strokeWidth={1} />
          <rect x={-chairW / 2 + 3} y={-chairH / 2 + 2} width={chairW - 6} height={3} rx={2} fill="rgba(255,255,255,0.3)" />
          <rect x={-chairW / 2} y={-chairH / 2 + 10} width={chairW} height={chairH - 8} rx={4} fill="#bbb" stroke="#888" strokeWidth={1} />
          <rect x={-chairW / 2 + 4} y={-chairH / 2 + 12} width={chairW - 12} height={4} rx={2} fill="rgba(255,255,255,0.35)" />
          <rect x={-chairW / 2 - 1} y={-chairH / 2 + chairH - 2} width={5} height={4} rx={1} fill="#777" />
          <rect x={chairW / 2 - 4} y={-chairH / 2 + chairH - 2} width={5} height={4} rx={1} fill="#777" />
        </g>
      ))}

      {(() => {
        const haloBlur = 8
        const haloStroke = 11
        const haloOpacity = 0.42 * ringOp
        const expand = 5
        const haloStyle = { filter: `blur(${haloBlur}px)`as const }
        if (table.shape === 'ROUND') {
          return (
            <ellipse
              cx={cx}
              cy={cy}
              rx={tableSize / 2 + expand}
              ry={tableSize / 2 + expand}
              fill="none"
              stroke={statusColor}
              strokeWidth={haloStroke}
              opacity={haloOpacity}
              style={haloStyle}
            />
          )
        }
        if (table.shape === 'RECTANGLE') {
          return (
            <rect
              x={cx - tw / 2 - expand}
              y={cy - th / 2 - expand}
              width={tw + expand * 2}
              height={th + expand * 2}
              rx={12}
              fill="none"
              stroke={statusColor}
              strokeWidth={haloStroke}
              opacity={haloOpacity}
              style={haloStyle}
            />
          )
        }
        return (
          <rect
            x={cx - tableSize / 2 - expand}
            y={cy - tableSize / 2 - expand}
            width={tableSize + expand * 2}
            height={tableSize + expand * 2}
            rx={12}
            fill="none"
            stroke={statusColor}
            strokeWidth={haloStroke}
            opacity={haloOpacity}
            style={haloStyle}
          />
        )
      })()}

      {table.shape === 'ROUND'? (
        <ellipse
          cx={cx}
          cy={cy}
          rx={tableSize / 2}
          ry={tableSize / 2}
          fill={`url(#tg-round-${uid})`}
          stroke={statusColor}
          strokeOpacity={ringOp}
          strokeWidth={isSelected ? 5 : 4}
          filter={`url(#rshadow-${uid})`}
        />
      ) : table.shape === 'RECTANGLE'? (
        <rect
          x={cx - tw / 2}
          y={cy - th / 2}
          width={tw}
          height={th}
          rx={10}
          fill={`url(#tg-rect-${uid})`}
          stroke={statusColor}
          strokeOpacity={ringOp}
          strokeWidth={isSelected ? 5 : 4}
          filter={`url(#rshadow-${uid})`}
        />
      ) : (
        <rect
          x={cx - tableSize / 2}
          y={cy - tableSize / 2}
          width={tableSize}
          height={tableSize}
          rx={10}
          fill={`url(#tg-rect-${uid})`}
          stroke={statusColor}
          strokeOpacity={ringOp}
          strokeWidth={isSelected ? 5 : 4}
          filter={`url(#rshadow-${uid})`}
        />
      )}

      {table.shape === 'ROUND'? (
        <ellipse cx={cx - 12} cy={cy - 14} rx={16} ry={10} fill="rgba(255,255,255,0.08)" />
      ) : (
        <rect x={cx - tw / 2 + 8} y={cy - th / 2 + 6} width={tw * 0.35} height={th * 0.25} rx={4} fill="rgba(255,255,255,0.07)" />
      )}

      {isSelected && (
        <ellipse
          cx={cx}
          cy={cy}
          rx={(table.shape === 'ROUND'? tableSize / 2 : tw / 2) + 8}
          ry={(table.shape === 'RECTANGLE'? th / 2 : tableSize / 2) + 8}
          fill="none"
          stroke={statusColor}
          strokeWidth={2}
          strokeDasharray="6 3"
          opacity={0.7 * ringOp}
        />
      )}

      <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize={20} fontWeight="bold" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))'}}>
        {table.number}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={12}>
        {seats}p
      </text>

      {guests && guests.length > 0 && (() => {
        const nameFont = 17
        const timeFont = 13
        const lineH = 34
        const padTop = 11
        const padBottom = 11
        const padL = 12
        const padR = 10
        const gapNameTime = 8
        const timeW = 104
        const labelW = Math.min(286, Math.max(Math.round(tw * 1.32) + 64, 244))
        const nameW = Math.max(96, labelW - padL - padR - gapNameTime - timeW)
        const totalH = guests.length * lineH + padTop + padBottom
        const startY = cy + (table.shape === 'RECTANGLE'? th / 2 : tableSize / 2) + gap + chairH + 10
        const baselineY = (i: number) => startY + padTop + i * lineH + 24
        const oneLineName = (n: string) => n.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim()
        return (
          <>
            <defs>
              <clipPath id={`nameClip-${table.id}`}>
                <rect x={cx - labelW / 2 + padL} y={startY} width={nameW} height={totalH} />
              </clipPath>
            </defs>
            <rect x={cx - labelW / 2} y={startY} width={labelW} height={totalH} rx={14} fill="white" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.22))'}} />
            {guests.map((g, i) => (
              <g key={i}>
                <text x={cx - labelW / 2 + padL} y={baselineY(i)} fill="#111827" fontSize={nameFont} fontWeight="700" clipPath={`url(#nameClip-${table.id})`}>
                  {oneLineName(g.name)}
                </text>
                <text x={cx + labelW / 2 - padR} y={baselineY(i)} textAnchor="end" fill="#6b7280" fontSize={timeFont} fontWeight="500">
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
