'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/i18n'

/** Vaste SEO-/alt-tekst zoals afgesproken voor beide productfoto's. */
export const VYSION_I5_DUAL_SCREEN_IMAGE_ALT =
  'Vysion i5 Dual-Screen Kassa - Eigendom na 24 maanden - 9 talen ondersteuning'

const SPEC_KEYS = [
  'specProcessor',
  'specMemory',
  'specScreens',
  'specLanguages',
  'specIncluded',
] as const

/**
 * Marketingblok: witte i5-kassa + specs, daarna zwarte variant; onder elke foto een demo-CTA.
 * Mobiel: beeld boven tekst (specificaties onder de eerste CTA).
 */
export default function HardwareBeestSection() {
  const { t, locale } = useLanguage()
  const base = 'sectorPages.hardwareBeest'

  return (
    <section
      className="border-y border-gray-200/80 bg-white py-12 sm:py-16"
      aria-labelledby="hardware-beest-sector-heading"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2
          id="hardware-beest-sector-heading"
          className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl text-balance"
        >
          {t(`${base}.title`)}
        </h2>

        <div className="mt-10 flex flex-col gap-10 lg:mt-12 lg:flex-row lg:items-start lg:gap-12">
          <div className="flex w-full flex-col gap-4 lg:max-w-[min(100%,28rem)] lg:flex-shrink-0">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-home-image">
              <Image
                src="/images/vysion-wit.webp"
                alt={VYSION_I5_DUAL_SCREEN_IMAGE_ALT}
                fill
                className="object-contain object-center p-3 sm:p-5"
                sizes="(min-width: 1024px) 28rem, 100vw"
              />
            </div>
            <Link
              href={`/registreer?lang=${locale}`}
              className="inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-3.5 text-center text-sm font-semibold text-white shadow-home-btn transition-colors hover:bg-accent/90 sm:text-base"
            >
              {t(`${base}.demoCta`)}
            </Link>
          </div>

          <ul className="flex flex-1 flex-col justify-center gap-4 text-base text-gray-800 sm:text-lg">
            {SPEC_KEYS.map((key) => (
              <li
                key={key}
                className="rounded-xl border border-gray-100 bg-[#f8f8f8] px-4 py-3.5 leading-snug shadow-sm"
              >
                {t(`${base}.${key}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-14 max-w-xl space-y-4 sm:mt-16">
          <p className="text-center text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t(`${base}.blackVariantTitle`)}
          </p>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-home-image">
            <Image
              src="/images/vysion-zwart.webp"
              alt={VYSION_I5_DUAL_SCREEN_IMAGE_ALT}
              fill
              className="object-contain object-center p-3 sm:p-5"
              sizes="(min-width: 640px) 36rem, 100vw"
            />
          </div>
          <Link
            href={`/registreer?lang=${locale}`}
            className="inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-3.5 text-center text-sm font-semibold text-white shadow-home-btn transition-colors hover:bg-accent/90 sm:text-base"
          >
            {t(`${base}.demoCta`)}
          </Link>
        </div>
      </div>
    </section>
  )
}
