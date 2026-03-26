'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Calculator,
  CalendarDays,
  ChefHat,
  Globe,
  LayoutTemplate,
  MessageCircle,
  Monitor,
  ShoppingBag,
  Store,
  Wallet,
} from 'lucide-react'
import { useLanguage } from '@/i18n'
import { PLATFORM_PAGES } from '@/lib/platform-pages'

const ICONS: Record<string, LucideIcon> = {
  kassasysteem: Store,
  bestelplatform: ShoppingBag,
  bestelzuilen: LayoutTemplate,
  keukenschermen: ChefHat,
  onlineScherm: Monitor,
  reservaties: CalendarDays,
  eigenWebsite: Globe,
  whatsappBestellingen: MessageCircle,
  loonadministratie: Wallet,
  bedrijfsanalyse: BarChart3,
  kostencalculator: Calculator,
}

export default function PlatformGridSection() {
  const { t } = useLanguage()

  return (
    <section id="platform" className="py-12 sm:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-4xl sm:text-5xl font-bold text-gray-900 mb-10 sm:mb-12 tracking-tight">
          {t('platform.sectionTitle')}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5 lg:gap-6">
          {PLATFORM_PAGES.map(({ slug, msgKey }) => {
            const Icon = ICONS[msgKey] ?? Store
            return (
              <Link
                key={slug}
                href={`/platform/${slug}`}
                className="group flex flex-col items-center text-center rounded-2xl bg-[#f4f4f4] p-5 sm:p-6 border border-gray-200/60 hover:border-accent/40 hover:shadow-md transition-all duration-300"
              >
                <div
                  className="mb-4 flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-full border-2 border-accent bg-white text-accent group-hover:bg-orange-50/80 transition-colors"
                  aria-hidden
                >
                  <Icon className="h-8 w-8" strokeWidth={1.5} />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 underline decoration-gray-900 underline-offset-4 mb-2 leading-snug px-1">
                  {t(`platform.${msgKey}.title`)}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-4">
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
