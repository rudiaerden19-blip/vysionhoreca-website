'use client'

import Image from 'next/image'
import { useLanguage } from '@/i18n'

const HARDWARE_IMAGES = [
  '/images/hardware/hardware-1.png',
  '/images/hardware/hardware-2.png',
  '/images/hardware/hardware-3.png',
  '/images/hardware/hardware-4.png',
  '/images/hardware/hardware-5.png',
  '/images/hardware/hardware-6.png',
  '/images/hardware/hardware-7.png',
  '/images/hardware/hardware-8.png',
  '/images/hardware/hardware-9.png',
] as const

export default function HardwareSection() {
  const { t } = useLanguage()

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
          {HARDWARE_IMAGES.map((src, i) => (
            <div
              key={src}
              className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white border border-gray-200/90 shadow-sm"
            >
              <Image
                src={src}
                alt={`${t('hardware.imageAlt')} ${i + 1}`}
                fill
                className="object-contain p-3 sm:p-4"
                sizes="(min-width: 1024px) 32vw, (min-width: 640px) 50vw, 100vw"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
