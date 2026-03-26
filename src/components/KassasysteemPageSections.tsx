'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Clock,
  MonitorSmartphone,
  ScrollText,
  ShoppingCart,
  UtensilsCrossed,
} from 'lucide-react'
import { useLanguage } from '@/i18n'
import { HORECA_KASSASYSTEEM_POS_IMAGE } from '@/lib/platform-pages'

const FEATURE_KEYS = [
  'inventory',
  'floorPlan',
  'timeClock',
  'customerDisplay',
  'productionTickets',
  'reporting',
] as const

const FEATURE_ICONS: Record<(typeof FEATURE_KEYS)[number], LucideIcon> = {
  inventory: ShoppingCart,
  floorPlan: UtensilsCrossed,
  timeClock: Clock,
  customerDisplay: MonitorSmartphone,
  productionTickets: ScrollText,
  reporting: BarChart3,
}

const cardInteractiveClasses =
  'rounded-2xl border-2 border-accent/35 bg-white p-6 sm:p-7 text-center shadow-sm transition-all duration-300 hover:z-10 hover:-translate-y-0.5 hover:border-accent/55 hover:shadow-[0_12px_40px_-6px_rgba(232,90,60,0.55),0_28px_70px_-12px_rgba(232,90,60,0.42),0_0_0_1px_rgba(232,90,60,0.2),0_0_60px_8px_rgba(232,90,60,0.28)] active:z-10 active:-translate-y-0.5 active:border-accent/60 active:shadow-[0_12px_40px_-6px_rgba(232,90,60,0.6),0_28px_70px_-12px_rgba(232,90,60,0.48),0_0_0_1px_rgba(232,90,60,0.22),0_0_72px_10px_rgba(232,90,60,0.32)]'

export function KassasysteemHorecaSection() {
  const { t } = useLanguage()

  return (
    <section className="border-t border-gray-100 bg-white py-16 sm:py-20 lg:py-24" aria-labelledby="kassa-horeca-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-gray-100 shadow-xl ring-1 ring-black/[0.06] lg:aspect-auto lg:min-h-[320px]">
            <Image
              src={HORECA_KASSASYSTEEM_POS_IMAGE}
              alt={t('platform.kassasysteem.horecaImageAlt')}
              fill
              className="object-cover object-center"
              sizes="(min-width: 1024px) 45vw, 100vw"
            />
          </div>
          <div>
            <h2 id="kassa-horeca-heading" className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t('platform.kassasysteem.horecaSectorTitle')}
            </h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-700 sm:text-lg">
              <p>
                {t('platform.kassasysteem.horecaLeadBefore')}
                <strong className="font-semibold text-gray-900">{t('platform.kassasysteem.horecaLeadBold')}</strong>
                {t('platform.kassasysteem.horecaLeadAfter')}
              </p>
              <p>
                <strong className="font-semibold text-gray-900">{t('platform.kassasysteem.horecaCloudBold')}</strong>
                {t('platform.kassasysteem.horecaCloudAfter')}
              </p>
            </div>
            <Link
              href="/#contact"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-accent to-rose-500 px-8 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-md transition hover:from-accent/95 hover:to-rose-500/95 sm:text-base"
            >
              {t('platform.kassasysteem.horecaDemoCta')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export function KassasysteemFeaturesSection() {
  const { t } = useLanguage()

  return (
    <section className="border-t border-gray-100 bg-white pb-20 sm:pb-24 lg:pb-28" aria-labelledby="kassa-features-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 id="kassa-features-heading" className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {t('platform.kassasysteem.featuresTitle')}
        </h2>
        <div className="mt-12 grid gap-5 sm:gap-6 md:grid-cols-2 md:gap-7 lg:grid-cols-3">
          {FEATURE_KEYS.map((key) => {
            const Icon = FEATURE_ICONS[key]
            return (
              <div key={key} className={cardInteractiveClasses}>
                <div
                  className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-pink-500 to-accent text-white shadow-md"
                  aria-hidden
                >
                  <Icon className="h-8 w-8" strokeWidth={1.65} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{t(`platform.kassasysteem.features.${key}.title`)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
                  {t(`platform.kassasysteem.features.${key}.body`)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
