'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'

const HARDWARE_ITEMS = [
  { src: '/images/hardware/hardware-1.png', model: '1' },
  { src: '/images/hardware/hardware-2.png', model: 'tf9003' },
  { src: '/images/hardware/hardware-3.png', model: 'tf82002' },
  { src: '/images/hardware/hardware-4.png', model: 'rf8900' },
  { src: '/images/hardware/hardware-5.png', model: 'rf8000' },
  { src: '/images/hardware/hardware-6.png', model: 'vm789' },
  { src: '/images/hardware/hardware-7.png', model: 'vm20' },
  { src: '/images/hardware/hardware-8.png', model: 'vsr 789' },
  { src: '/images/hardware/hardware-9.png', model: 'handpos t41' },
] as const

export default function HardwareSection() {
  const { t } = useLanguage()
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
        <header className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <h2
            id="hardware-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight"
          >
            {t('hardware.title')}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed">
            {t('hardware.subtitle')}
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {HARDWARE_ITEMS.map((item, i) => (
            <button
              key={item.src}
              type="button"
              onClick={() => setExpanded(i)}
              className="group rounded-2xl overflow-hidden bg-white border border-gray-200/90 shadow-sm text-left transition hover:shadow-md hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EF5C3C] focus-visible:ring-offset-2"
              aria-label={`${t('hardware.openExpanded')}: ${item.model}`}
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={item.src}
                  alt={`${t('hardware.imageAlt')} — ${item.model}`}
                  fill
                  className="object-contain p-3 sm:p-4 group-hover:scale-[1.02] transition-transform duration-200"
                  sizes="(min-width: 1024px) 32vw, (min-width: 640px) 50vw, 100vw"
                  loading="lazy"
                />
              </div>
              <p className="px-3 pb-3 sm:px-4 sm:pb-4 pt-2 text-center text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 tracking-tight leading-snug">
                {item.model}
              </p>
            </button>
          ))}
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
                src={HARDWARE_ITEMS[expanded].src}
                alt={`${t('hardware.imageAlt')} — ${HARDWARE_ITEMS[expanded].model}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
            <p id="hardware-lightbox-title" className="text-white text-center text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              {HARDWARE_ITEMS[expanded].model}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
