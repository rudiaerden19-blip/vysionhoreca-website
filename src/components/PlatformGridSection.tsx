'use client'

import Link from 'next/link'
import {
  BarChart3,
  BadgePercent,
  Clock,
  Globe,
  Headphones,
  QrCode,
  ShoppingCart,
  Smartphone,
  ClipboardList,
} from 'lucide-react'
import { useLanguage } from '@/i18n'
import { PLATFORM_PAGES } from '@/lib/platform-pages'

const ICONS = {
  eigenWebsite: Globe,
  tijdsbesparing: Clock,
  productupdates: ClipboardList,
  dataEnAnalyse: BarChart3,
  betalingsmogelijkheid: Smartphone,
  voorraadbeheer: ShoppingCart,
  nulCommissie: BadgePercent,
  ondersteuning: Headphones,
  qrBestellen: QrCode,
} as const

export default function PlatformGridSection() {
  const { t } = useLanguage()

  return (
    <section id="platform" className="py-20 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-5 tracking-tight">
            {t('platform.sectionTitle')}
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-2">
            {t('platform.sectionSubtitle')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {PLATFORM_PAGES.map(({ slug, msgKey }) => {
            const Icon = ICONS[msgKey as keyof typeof ICONS]
            return (
              <Link
                key={slug}
                href={`/platform/${slug}`}
                className="group block bg-[#ececec] rounded-2xl p-6 sm:p-8 border border-gray-200/80 hover:border-accent/50 hover:shadow-lg transition-all duration-300 text-left"
              >
                <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-white mb-5 group-hover:scale-105 transition-transform">
                  <Icon className="w-7 h-7" strokeWidth={1.75} aria-hidden />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 underline decoration-accent/40 decoration-2 underline-offset-4 group-hover:decoration-accent">
                  {t(`platform.${msgKey}.title`)}
                </h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  {t(`platform.${msgKey}.teaser`)}
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
