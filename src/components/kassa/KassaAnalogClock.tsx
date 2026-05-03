'use client'

import { useLayoutEffect, useState } from 'react'

const KASSA_DISPLAY_TIMEZONE = 'Europe/Brussels'

/** Wall clock in an IANA zone (kassa = Belgium regardless of wrong device TZ). */
function getWallClockHms(date: Date, timeZone: string): { h: number; m: number; s: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const n = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0)
  return { h: n('hour'), m: n('minute'), s: n('second') }
}

/** Analog clock with live hands — tap opens staff clock elsewhere on parent UI. */
export function KassaAnalogClock({ size = 80 }: { size?: number }) {
  const [now, setNow] = useState(() => new Date())
  useLayoutEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])
  const { h, m, s } = getWallClockHms(now, KASSA_DISPLAY_TIMEZONE)
  const hDeg = ((h % 12) + m / 60 + s / 3600) * 30
  const mDeg = (m + s / 60) * 6
  const sDeg = s * 6
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="select-none"
      aria-hidden
    >
      <circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <line
          key={i}
          x1="50"
          y1="6"
          x2="50"
          y2="14"
          stroke="#475569"
          strokeWidth={i % 3 === 0 ? 2.2 : 1.2}
          strokeLinecap="round"
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}
      <g transform={`rotate(${hDeg} 50 50)`}>
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="32"
          stroke="#0f172a"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      <g transform={`rotate(${mDeg} 50 50)`}>
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="22"
          stroke="#334155"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </g>
      <g transform={`rotate(${sDeg} 50 50)`}>
        <line
          x1="50"
          y1="52"
          x2="50"
          y2="20"
          stroke="#dc2626"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </g>
      <circle cx="50" cy="50" r="4" fill="#0f172a" />
    </svg>
  )
}
