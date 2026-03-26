'use client'

import type { LucideIcon } from 'lucide-react'
import {
  BadgePercent,
  BarChart3,
  ClipboardList,
  Clock,
  Globe,
  Headphones,
  QrCode,
  ShoppingCart,
  Smartphone,
} from 'lucide-react'
import { useLanguage } from '@/i18n'

const FEATURE_KEYS = [
  'ownWebsite',
  'timeSaving',
  'productUpdates',
  'dataAnalytics',
  'payments',
  'stockControl',
  'zeroCommission',
  'support',
  'qrOrdering',
] as const

const FEATURE_ICONS: Record<(typeof FEATURE_KEYS)[number], LucideIcon> = {
  ownWebsite: Globe,
  timeSaving: Clock,
  productUpdates: ClipboardList,
  dataAnalytics: BarChart3,
  payments: Smartphone,
  stockControl: ShoppingCart,
  zeroCommission: BadgePercent,
  support: Headphones,
  qrOrdering: QrCode,
}

const cardInteractiveClasses =
  'rounded-2xl border-2 border-accent/35 bg-white p-6 sm:p-7 text-center shadow-sm transition-all duration-300 hover:z-10 hover:-translate-y-0.5 hover:border-accent/55 hover:shadow-[0_12px_40px_-6px_rgba(232,90,60,0.55),0_28px_70px_-12px_rgba(232,90,60,0.42),0_0_0_1px_rgba(232,90,60,0.2),0_0_60px_8px_rgba(232,90,60,0.28)] active:z-10 active:-translate-y-0.5 active:border-accent/60 active:shadow-[0_12px_40px_-6px_rgba(232,90,60,0.6),0_28px_70px_-12px_rgba(232,90,60,0.48),0_0_0_1px_rgba(232,90,60,0.22),0_0_72px_10px_rgba(232,90,60,0.32)]'

export function BestelplatformFeaturesSection() {
  const { t } = useLanguage()

  return (
    <section
      className="border-t border-gray-100 bg-white pb-20 sm:pb-24 lg:pb-28"
      aria-labelledby="bestelplatform-features-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2
          id="bestelplatform-features-heading"
          className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
        >
          {t('platform.bestelplatform.featuresTitle')}
        </h2>
        <div className="mt-12 grid gap-5 sm:gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-7">
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
                <h3 className="text-lg font-bold text-gray-900">
                  {t(`platform.bestelplatform.features.${key}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
                  {t(`platform.bestelplatform.features.${key}.body`)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
