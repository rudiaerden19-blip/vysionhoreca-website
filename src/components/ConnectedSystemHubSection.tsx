'use client'

import Image from 'next/image'
import { Fragment } from 'react'
import { useLanguage } from '@/i18n'

/** Bar Lies kassa-screenshot — past in rechthoekig hub-kader (1024×391). */
const HUB_CENTER_IMAGE = '/images/hardware/connected-hub-kassa-screenshot.png'
const HUB_CENTER_ASPECT = 1024 / 391

/** Merk-blauw (`tailwind accent`) — hub-lijnen en gloed. */
const HUB_ACCENT = '#0E5D82'

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

/** Polaire layout in % van het vierkante diagram (midden = 50,50). */
const HUB_CENTER_R = 17.5
const HUB_NODE_R = 39.5
/** Labels verder naar buiten zodat ze niet over het bolletje liggen. */
const HUB_LABEL_R = 49.5

function hubAngle(index: number, total: number) {
  return -Math.PI / 2 + (index * 2 * Math.PI) / total
}

function polarPx(radius: number, angle: number) {
  return {
    left: `${50 + radius * Math.cos(angle)}%`,
    top: `${50 + radius * Math.sin(angle)}%`,
  }
}

function tentaclePathD(angle: number) {
  const sx = 50 + HUB_CENTER_R * Math.cos(angle)
  const sy = 50 + HUB_CENTER_R * Math.sin(angle)
  const ex = 50 + HUB_NODE_R * Math.cos(angle)
  const ey = 50 + HUB_NODE_R * Math.sin(angle)
  const mx = 50 + (HUB_CENTER_R + (HUB_NODE_R - HUB_CENTER_R) * 0.55) * Math.cos(angle)
  const my = 50 + (HUB_CENTER_R + (HUB_NODE_R - HUB_CENTER_R) * 0.55) * Math.sin(angle)
  const px = mx - Math.sin(angle) * 1.2
  const py = my + Math.cos(angle) * 1.2
  return `M ${sx} ${sy} Q ${px} ${py}, ${ex} ${ey}`
}

function HubCenterPhoto({ alt, sizes }: { alt: string; sizes: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-[#0f1419] sm:rounded-xl">
      <Image
        src={HUB_CENTER_IMAGE}
        alt={alt}
        fill
        priority
        className="object-contain object-center"
        sizes={sizes}
      />
      <div className="hub-center-shimmer pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl" aria-hidden />
    </div>
  )
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_45%,rgba(14,93,130,0.18),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent_55%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          id="connected-system-hub-heading"
          className="mx-auto max-w-4xl text-center text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl lg:text-[2.75rem]"
        >
          {t('connectedSystemHub.title')}
        </h2>

        <div className="mx-auto mt-6 max-w-3xl text-center sm:mt-8">
          <p className="text-base font-medium leading-relaxed text-white/90 sm:text-lg">
            {t('connectedSystemHub.subtitleQuestion')}
          </p>
          <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
            {t('connectedSystemHub.subtitleVysionLine')}
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-white/75 sm:text-base">
            <li>{t('connectedSystemHub.subtitlePoint1')}</li>
            <li>{t('connectedSystemHub.subtitlePoint2')}</li>
            <li>{t('connectedSystemHub.subtitlePoint3')}</li>
          </ul>
          <p className="mt-5 text-base font-medium leading-relaxed text-white/90 sm:text-lg">
            {t('connectedSystemHub.subtitleClosing')}
          </p>
          <p className="mt-4 text-base font-semibold leading-relaxed text-white sm:text-lg">
            {t('connectedSystemHub.subtitleModulesToggle')}
          </p>
        </div>

        <div
          className="relative mx-auto mt-10 hidden w-full max-w-[min(100%,760px)] md:block lg:mt-12"
          role="img"
          aria-label={t('connectedSystemHub.diagramAria')}
        >
          <div className="relative aspect-square w-full pb-12">
            <div
              className="hub-orbit-ring pointer-events-none absolute inset-0 motion-reduce:animate-none"
              aria-hidden
            >
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                <defs>
                  <linearGradient id="hub-tentacle" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={HUB_ACCENT} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={HUB_ACCENT} stopOpacity="0.85" />
                  </linearGradient>
                </defs>
                {HUB_MODULE_KEYS.map((key, i) => (
                  <path
                    key={`line-${key}`}
                    d={tentaclePathD(hubAngle(i, total))}
                    fill="none"
                    stroke="url(#hub-tentacle)"
                    strokeWidth="0.45"
                    strokeLinecap="round"
                  />
                ))}
              </svg>

              {HUB_MODULE_KEYS.map((key, i) => {
                const angle = hubAngle(i, total)
                const dot = polarPx(HUB_NODE_R, angle)
                const labelPos = polarPx(HUB_LABEL_R, angle)
                const label = t(`connectedSystemHub.modules.${key}`).replace(/\n/g, ' ')
                return (
                  <Fragment key={key}>
                    <span
                      className="absolute z-40 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_12px_rgba(14,93,130,0.85)]"
                      style={dot}
                    />
                    <div
                      className="hub-orbit-label-counter pointer-events-auto absolute z-30 max-w-[9.5rem] motion-reduce:animate-none sm:max-w-[11rem] lg:max-w-[12rem]"
                      style={labelPos}
                    >
                      <p className="rounded-xl border border-white/12 bg-[#161b22]/95 px-3 py-2 text-center text-[0.6875rem] font-semibold leading-snug text-white shadow-lg backdrop-blur-sm sm:px-3.5 sm:py-2.5 sm:text-xs">
                        {label}
                      </p>
                    </div>
                  </Fragment>
                )
              })}
            </div>

            {/* Hub midden — vast, draait niet mee */}
            <div className="absolute left-1/2 top-[48%] z-30 w-[48%] -translate-x-1/2 -translate-y-1/2">
              <div
                className="relative w-full rounded-2xl border border-white/[0.14] bg-[#0c0f14] p-1.5 shadow-[0_0_0_1px_rgba(14,93,130,0.35),0_20px_48px_rgba(0,0,0,0.5)] ring-1 ring-accent/35"
                style={{ aspectRatio: String(HUB_CENTER_ASPECT) }}
              >
                <HubCenterPhoto alt={centerAlt} sizes="(min-width: 768px) 480px, 0px" />
              </div>
              <p className="pointer-events-none absolute -bottom-8 left-1/2 w-max -translate-x-1/2 text-sm font-semibold tracking-[0.14em] text-white/80 sm:text-base">
                {t('connectedSystemHub.centerLabel').toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 md:hidden">
          <div className="relative mx-auto max-w-sm">
            <div
              className="relative mx-auto w-full max-w-[min(100%,360px)] rounded-2xl border border-white/10 bg-[#0c0f14] p-2 shadow-lg ring-1 ring-accent/35"
              style={{ aspectRatio: String(HUB_CENTER_ASPECT) }}
            >
              <HubCenterPhoto alt={centerAlt} sizes="360px" />
            </div>
            <p className="mt-4 text-center text-sm font-semibold tracking-wide text-white/80">
              {t('connectedSystemHub.centerLabel')}
            </p>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-3">
            {HUB_MODULE_KEYS.map((key) => (
              <li
                key={key}
                className="rounded-xl border border-white/10 bg-[#161b22] px-3 py-3.5 text-center text-sm font-semibold leading-snug text-white/90"
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
