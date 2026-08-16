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

function tentaclePath(nx: number, ny: number) {
  const dx = nx - CX
  const dy = ny - CY
  const c1x = CX + dx * 0.35 - dy * 0.12
  const c1y = CY + dy * 0.35 + dx * 0.12
  const c2x = CX + dx * 0.72 + dy * 0.08
  const c2y = CY + dy * 0.72 - dx * 0.08
  return `M ${CX} ${CY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${nx} ${ny}`
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
      <rect x="18" y="14" width="84" height="58" rx="6" fill="#1a1a1a" stroke="#E85A3C" strokeWidth="2.5" />
      <rect x="24" y="20" width="72" height="46" rx="3" fill="#0d3d4a" />
      <rect x="28" y="24" width="64" height="38" rx="2" fill="#145a6b" opacity="0.85" />
      <path d="M32 52h56M32 46h40" stroke="#7dd3e8" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <rect x="52" y="72" width="16" height="10" fill="#333" />
      <rect x="38" y="82" width="44" height="6" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <circle cx="60" cy="85" r="2" fill="#E85A3C" />
    </svg>
  )
}

export default function ConnectedSystemHubSection() {
  const { t } = useLanguage()
  const total = HUB_MODULE_KEYS.length

  return (
    <section
      className="relative border-b border-gray-100 bg-gradient-to-b from-white via-[#faf8f6] to-white py-14 sm:py-16 lg:py-20"
      aria-labelledby="connected-system-hub-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-40"
        aria-hidden
      >
        <div className="absolute left-1/2 top-1/2 h-[min(90vw,520px)] w-[min(90vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.06] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2
          id="connected-system-hub-heading"
          className="mx-auto max-w-4xl text-center text-xl font-bold uppercase tracking-[0.12em] text-gray-900 sm:text-2xl md:text-3xl lg:tracking-[0.14em]"
        >
          {t('connectedSystemHub.title')}
        </h2>

        {/* Desktop / tablet: tentakel-diagram */}
        <div className="relative mx-auto mt-10 hidden max-w-4xl md:block lg:mt-12">
          <svg
            viewBox="0 0 1000 640"
            className="h-auto w-full"
            role="img"
            aria-label={t('connectedSystemHub.diagramAria')}
          >
            <defs>
              <linearGradient id="hub-tentacle" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#E85A3C" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#E85A3C" stopOpacity="0.95" />
              </linearGradient>
              <filter id="hub-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {HUB_MODULE_KEYS.map((key, i) => {
              const { x, y } = hubNodePosition(i, total)
              return (
                <path
                  key={`line-${key}`}
                  d={tentaclePath(x, y)}
                  fill="none"
                  stroke="url(#hub-tentacle)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="opacity-90"
                />
              )
            })}

            <circle cx={CX} cy={CY} r="72" fill="#fff" stroke="#E85A3C" strokeWidth="3" filter="url(#hub-glow)" />
            <circle cx={CX} cy={CY} r="58" fill="#141414" />
            <foreignObject x={CX - 44} y={CY - 44} width="88" height="88">
              <div className="flex h-full w-full items-center justify-center">
                <HubComputerIcon className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" />
              </div>
            </foreignObject>
            <text
              x={CX}
              y={CY + 52}
              textAnchor="middle"
              className="fill-accent text-[11px] font-bold uppercase tracking-wider"
              style={{ fontSize: 11 }}
            >
              {t('connectedSystemHub.centerLabel')}
            </text>

            {HUB_MODULE_KEYS.map((key, i) => {
              const { x, y } = hubNodePosition(i, total)
              const label = t(`connectedSystemHub.modules.${key}`)
              const lines = label.split('\n')
              const lineHeight = 14
              const startY = y - ((lines.length - 1) * lineHeight) / 2
              return (
                <g key={key}>
                  <circle cx={x} cy={y} r="6" fill="#E85A3C" />
                  <circle cx={x} cy={y} r="10" fill="#E85A3C" fillOpacity="0.2" />
                  <rect
                    x={x - 72}
                    y={y + 14}
                    width="144"
                    height={lines.length * lineHeight + 12}
                    rx="8"
                    fill="white"
                    stroke="#E85A3C"
                    strokeOpacity="0.35"
                    strokeWidth="1"
                  />
                  {lines.map((line, li) => (
                    <text
                      key={li}
                      x={x}
                      y={startY + 26 + li * lineHeight}
                      textAnchor="middle"
                      className="fill-gray-900 font-semibold uppercase"
                      style={{ fontSize: 10, letterSpacing: '0.06em' }}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Mobiel: hub + grid */}
        <div className="mt-10 md:hidden">
          <div className="relative mx-auto flex max-w-xs flex-col items-center">
            <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full border-[3px] border-accent bg-[#141414] shadow-[0_0_40px_-8px_rgba(232,90,60,0.55)]">
              <HubComputerIcon className="h-14 w-14" />
            </div>
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-accent">
              {t('connectedSystemHub.centerLabel')}
            </p>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-3">
            {HUB_MODULE_KEYS.map((key) => (
              <li
                key={key}
                className="rounded-xl border border-accent/25 bg-white px-2.5 py-2.5 text-center text-[0.65rem] font-bold uppercase leading-snug tracking-wide text-gray-900 shadow-sm sm:text-xs"
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
