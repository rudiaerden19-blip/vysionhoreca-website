'use client'

import { useLanguage } from '@/i18n'

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
const CY = 320
const NODE_R = 248

function hubNodePosition(index: number, total: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total
  return {
    x: CX + NODE_R * Math.cos(angle),
    y: CY + NODE_R * Math.sin(angle),
  }
}

function HubComputerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="20" y="16" width="80" height="54" rx="5" fill="#0a0a0a" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      <rect x="26" y="22" width="68" height="42" rx="2" fill="#111827" />
      <path d="M30 48h52M30 42h36" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="54" y="70" width="12" height="8" fill="#374151" />
      <rect x="40" y="78" width="40" height="5" rx="1" fill="#1f2937" />
    </svg>
  )
}

export default function ConnectedSystemHubSection() {
  const { t } = useLanguage()
  const total = HUB_MODULE_KEYS.length

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

        <div className="relative mx-auto mt-12 hidden max-w-4xl md:block lg:mt-14">
          <svg
            viewBox="0 0 1000 640"
            className="h-auto w-full"
            role="img"
            aria-label={t('connectedSystemHub.diagramAria')}
          >
            <defs>
              <linearGradient id="hub-line" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#E85A3C" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#E85A3C" stopOpacity="0.55" />
              </linearGradient>
            </defs>

            {HUB_MODULE_KEYS.map((key, i) => {
              const { x, y } = hubNodePosition(i, total)
              return (
                <line
                  key={`line-${key}`}
                  x1={CX}
                  y1={CY}
                  x2={x}
                  y2={y}
                  stroke="url(#hub-line)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              )
            })}

            <circle cx={CX} cy={CY} r="76" fill="#0c0f14" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <circle cx={CX} cy={CY} r="64" fill="#141820" stroke="rgba(232,90,60,0.45)" strokeWidth="1.5" />
            <foreignObject x={CX - 40} y={CY - 40} width="80" height="80">
              <div className="flex h-full w-full items-center justify-center">
                <HubComputerIcon className="h-14 w-14 opacity-90" />
              </div>
            </foreignObject>
            <text
              x={CX}
              y={CY + 48}
              textAnchor="middle"
              fill="rgba(255,255,255,0.85)"
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em' }}
            >
              {t('connectedSystemHub.centerLabel').toUpperCase()}
            </text>

            {HUB_MODULE_KEYS.map((key, i) => {
              const { x, y } = hubNodePosition(i, total)
              const label = t(`connectedSystemHub.modules.${key}`)
              const lines = label.split('\n')
              const lineHeight = 15
              const boxH = lines.length * lineHeight + 16
              const boxW = 148
              const boxY = y + 10
              const textStartY = boxY + 14 + lineHeight * 0.35
              return (
                <g key={key}>
                  <circle cx={x} cy={y} r="3" fill="#E85A3C" fillOpacity="0.9" />
                  <rect
                    x={x - boxW / 2}
                    y={boxY}
                    width={boxW}
                    height={boxH}
                    rx="10"
                    fill="#161b22"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="1"
                  />
                  {lines.map((line, li) => (
                    <text
                      key={li}
                      x={x}
                      y={textStartY + li * lineHeight}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.92)"
                      style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              )
            })}
          </svg>
        </div>

        <div className="mt-12 md:hidden">
          <div className="relative mx-auto flex max-w-xs flex-col items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-[#141820] ring-1 ring-accent/30">
              <HubComputerIcon className="h-12 w-12 opacity-90" />
            </div>
            <p className="mt-3 text-xs font-semibold tracking-wide text-white/80">
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
