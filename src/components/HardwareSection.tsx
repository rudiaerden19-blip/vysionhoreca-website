'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'

/** Zelfde hover/active-oranje glow als platformkaarten (`PlatformGridSection`). */
const HARDWARE_CARD_INTERACTION =
  'shadow-home-card transition-all duration-300 hover:z-10 hover:-translate-y-0.5 hover:border-accent/55 hover:shadow-[0_12px_40px_-6px_rgba(232,90,60,0.55),0_28px_70px_-12px_rgba(232,90,60,0.42),0_0_0_1px_rgba(232,90,60,0.2),0_0_60px_8px_rgba(232,90,60,0.28)] active:z-10 active:-translate-y-0.5 active:border-accent/60 active:shadow-[0_12px_40px_-6px_rgba(232,90,60,0.6),0_28px_70px_-12px_rgba(232,90,60,0.48),0_0_0_1px_rgba(232,90,60,0.22),0_0_72px_10px_rgba(232,90,60,0.32)]'

/** Premium-abonnement: vaste oranje schaduw (altijd zichtbaar), zelfde grid-UX. */
const HARDWARE_PREMIUM_ORANGE_SHADOW =
  'shadow-[0_12px_40px_-6px_rgba(232,90,60,0.48),0_8px_28px_-4px_rgba(232,90,60,0.36),0_0_0_1px_rgba(232,90,60,0.18)] border-accent/35 transition-all duration-300 hover:z-10 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_16px_48px_-6px_rgba(232,90,60,0.55),0_12px_36px_-4px_rgba(232,90,60,0.42),0_0_0_1px_rgba(232,90,60,0.22)] active:z-10 active:-translate-y-0.5'

const HARDWARE_ITEMS = [
  { src: '/images/hardware/hardware-1.png', model: 'rfm789' },
  { src: '/images/hardware/hardware-2.png', model: 'tf9003' },
  { src: '/images/hardware/hardware-3.png', model: 'tf82002' },
  { src: '/images/hardware/hardware-4.png', model: 'rf8900' },
  { src: '/images/hardware/hardware-5.png', model: 'rf8000' },
  { src: '/images/hardware/hardware-6.png', model: 'vm789' },
  { src: '/images/hardware/hardware-7.png', model: 'vm20' },
  { src: '/images/hardware/hardware-8.png', model: 'handpos tf741' },
  { src: '/images/hardware/hardware-9.png', model: 'handpos t41' },
  { src: '/images/hardware/hardware-10-vm10-kiosk.png', model: 'vm 10 kiosk' },
  { src: '/images/hardware/hardware-11-vt11-kiosk.png', model: 'vt 11 kiosk' },
  { src: '/images/hardware/hardware-12-muur-kiosk-tl20.png', model: 'muur kiosk tl20' },
] as const

const HARDWARE_PREMIUM_INCLUDED = [
  { src: '/images/hardware/hardware-premium-tf30.png', labelKey: 'premiumIncludedTf30' as const },
  { src: '/images/hardware/hardware-premium-printer-x40.png', labelKey: 'premiumIncludedPrinterX40' as const },
  { src: '/images/hardware/hardware-premium-lade.png', labelKey: 'premiumIncludedLade' as const },
] as const

function hardwareLabel(item: (typeof HARDWARE_ITEMS)[number] | (typeof HARDWARE_PREMIUM_INCLUDED)[number], t: (key: string) => string): string {
  if ('labelKey' in item) return t(`hardware.${item.labelKey}`)
  return item.model
}

export default function HardwareSection() {
  const { t } = useLanguage()
  const allItems = [...HARDWARE_ITEMS, ...HARDWARE_PREMIUM_INCLUDED] as const
  const [expanded, setExpanded] = useState<number | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => setExpanded(null), [])

  useEffect(() => {
    if (expanded === null) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [expanded, close])

  useEffect(() => {
    if (expanded !== null) {
      closeBtnRef.current?.focus()
    }
  }, [expanded])

  return (
    <section
      id="hardware"
      className="py-16 sm:py-24 lg:py-28 bg-[#f5f5f5] border-t border-gray-200/80"
      aria-labelledby="hardware-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 px-1">
          <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-accent tracking-tight mb-3 sm:mb-4 text-balance break-words">
            {t('hardware.kicker')}
          </p>
          <h2
            id="hardware-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight text-balance break-words"
          >
            {t('hardware.title')}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed">
            {t('hardware.subtitle')}
          </p>
          <a
            href="/"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-accent text-white font-semibold px-8 py-3.5 text-base hover:bg-accent/90 transition-colors shadow-sm"
          >
            {t('hardware.ctaOurRegisters')}
          </a>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {allItems.map((item, i) => {
            const label = hardwareLabel(item, t)
            const orange = 'labelKey' in item
            return (
              <button
                key={item.src}
                type="button"
                onClick={() => setExpanded(i)}
                className={`group relative w-full rounded-2xl overflow-hidden bg-white border text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                  orange ? HARDWARE_PREMIUM_ORANGE_SHADOW : `border-gray-200/60 ${HARDWARE_CARD_INTERACTION}`
                }`}
                aria-label={`${t('hardware.openExpanded')}: ${label}`}
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={item.src}
                    alt={`${t('hardware.imageAlt')} — ${label}`}
                    fill
                    className="object-contain p-3 sm:p-4 group-hover:scale-[1.02] transition-transform duration-200"
                    sizes="(min-width: 1024px) 32vw, (min-width: 640px) 50vw, 100vw"
                    loading="lazy"
                  />
                </div>
                <p className="px-3 pb-3 sm:px-4 sm:pb-4 pt-2 text-center text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 tracking-tight leading-snug">
                  {label}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {expanded !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hardware-lightbox-title"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-8 bg-black/85"
          onClick={close}
        >
          <button
            ref={closeBtnRef}
            type="button"
            onClick={close}
            className="absolute top-3 right-3 sm:top-5 sm:right-5 z-[101] rounded-full bg-white/15 hover:bg-white/25 text-white px-4 py-2.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50"
          >
            {t('hardware.closeExpanded')}
          </button>
          <div
            className="relative w-full max-w-6xl flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-[min(85vh,900px)] max-h-[85vh]">
              <Image
                src={allItems[expanded].src}
                alt={`${t('hardware.imageAlt')} — ${hardwareLabel(allItems[expanded], t)}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
            <p id="hardware-lightbox-title" className="text-white text-center text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              {hardwareLabel(allItems[expanded], t)}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
