'use client'

import Image from 'next/image'
import { useLanguage } from '@/i18n'

const HUB_CENTER_IMAGE = '/images/hardware/connected-hub-sunmi-center.png'

const HUB_MODULE_KEYS = [
  'kassa',
  'onlineBestelsysteem',
  'reservatieSysteem',
  'website',
  'personeel',
  'voorraad',
  'keukenSchermen',
  'rapporten',
  'bedrijfsAnalyse',
] as const

const CX = 500
const CY = 310
const NODE_R = 268
/** Lijnen starten aan de rand van de productfoto (viewBox-eenheden). */
const HUB_INNER_R = 188

function hubNodePosition(index: number, total: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total
  return {
    x: CX + NODE_R * Math.cos(angle),
    y: CY + NODE_R * Math.sin(angle),
  }
}

function lineStart(nx: number, ny: number) {
  const dx = nx - CX
  const dy = ny - CY
  const len = Math.hypot(dx, dy) || 1
  return {
    x: CX + (dx / len) * HUB_INNER_R,
    y: CY + (dy / len) * HUB_INNER_R,
  }
}

function tentaclePath(nx: number, ny: number) {
  const { x: sx, y: sy } = lineStart(nx, ny)
  const dx = nx - sx
  const dy = ny - sy
  const c1x = sx + dx * 0.45 - dy * 0.06
  const c1y = sy + dy * 0.45 + dx * 0.06
  return `M ${sx} ${sy} Q ${c1x} ${c1y}, ${nx} ${ny}`
}

export default function ConnectedSystemHubSection() {
  const { t } = useLanguage()
  const total = HUB_MODULE_KEYS.length
  const centerAlt = `${t('connectedSystemHub.centerLabel')} — ${t('connectedSystemHub.diagramAria')}`

  return (
    <section
      className="relative overflow-hidden border-b border-white/[0.06] bg-[#0c0f14] py-16 sm:py-20 lg:py-24"
      aria-labelledby="connected-system-hub-heading"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_45%,rgba(232,90,60,0.12),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent_55%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2
          id="connected-system-hub-heading"
          className="mx-auto max-w-4xl text-center text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl"
        >
          {t('connectedSystemHub.title')}
        </h2>

        {/* Desktop: foto + SVG-tentakels */}
        <div className="relative mx-auto mt-12 hidden max-w-5xl md:block lg:mt-14">
          <div className="relative aspect-[1000/680] w-full">
            <svg
              viewBox="0 0 1000 680"
              className="absolute inset-0 h-full w-full"
              role="img"
              aria-label={t('connectedSystemHub.diagramAria')}
            >
              <defs>
                <linearGradient id="hub-tentacle" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#E85A3C" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#E85A3C" stopOpacity="0.7" />
                </linearGradient>
              </defs>

              {HUB_MODULE_KEYS.map((key, i) => {
                const { x, y } = hubNodePosition(i, total)
                return (
                  <path
                    key={`line-${key}`}
                    d={tentaclePath(x, y)}
                    fill="none"
                    stroke="url(#hub-tentacle)"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                )
              })}

              {HUB_MODULE_KEYS.map((key, i) => {
                const { x, y } = hubNodePosition(i, total)
                const label = t(`connectedSystemHub.modules.${key}`)
                const lines = label.split('\n')
                const lineHeight = 15
                const boxH = lines.length * lineHeight + 16
                const boxW = 152
                const boxY = y + 8
                const textStartY = boxY + 14 + lineHeight * 0.35
                return (
                  <g key={key}>
                    <circle cx={x} cy={y} r="3.5" fill="#E85A3C" fillOpacity="0.85" />
                    <rect
                      x={x - boxW / 2}
                      y={boxY}
                      width={boxW}
                      height={boxH}
                      rx="10"
                      fill="#161b22"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="1"
                    />
                    {lines.map((line, li) => (
                      <text
                        key={li}
                        x={x}
                        y={textStartY + li * lineHeight}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.92)"
                        style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.03em' }}
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                )
              })}
            </svg>

            <div className="pointer-events-none absolute left-1/2 top-[45.5%] z-10 w-[min(42%,420px)] -translate-x-1/2 -translate-y-1/2">
              <div className="relative aspect-[798/757] w-full drop-shadow-[0_24px_48px_rgba(0,0,0,0.55)]">
                <Image
                  src={HUB_CENTER_IMAGE}
                  alt={centerAlt}
                  fill
                  priority
                  className="object-contain object-center"
                  sizes="(min-width: 768px) 420px, 0px"
                />
              </div>
              <p className="mt-3 text-center text-xs font-semibold tracking-[0.12em] text-white/75">
                {t('connectedSystemHub.centerLabel').toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Mobiel */}
        <div className="mt-12 md:hidden">
          <div className="relative mx-auto max-w-sm">
            <div className="relative aspect-[798/757] w-full max-w-[320px] mx-auto drop-shadow-[0_16px_32px_rgba(0,0,0,0.5)]">
              <Image
                src={HUB_CENTER_IMAGE}
                alt={centerAlt}
                fill
                priority
                className="object-contain"
                sizes="320px"
              />
            </div>
            <p className="mt-3 text-center text-sm font-semibold text-white/80">
              {t('connectedSystemHub.centerLabel')}
            </p>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-3">
            {HUB_MODULE_KEYS.map((key) => (
              <li
                key={key}
                className="rounded-xl border border-white/10 bg-[#161b22] px-2.5 py-3 text-center text-xs font-semibold leading-snug text-white/90 sm:text-sm"
              >
                {t(`connectedSystemHub.modules.${key}`).replace(/\n/g, ' ')}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
