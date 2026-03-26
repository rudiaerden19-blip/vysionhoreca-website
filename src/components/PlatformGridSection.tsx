'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Calculator,
  CalendarDays,
  ChefHat,
  Globe,
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
    <section id="platform" className="py-20 sm:py-28 lg:py-36 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-4xl sm:text-5xl font-bold text-gray-900 mb-12 sm:mb-16 tracking-tight">
          {t('platform.sectionTitle')}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5 sm:gap-6 lg:gap-7">
          {PLATFORM_PAGES.map(({ slug, msgKey, cardHeaderImage }) => {
            const Icon = ICONS[msgKey] ?? Store
            const headerAlt =
              cardHeaderImage && t(`platform.${msgKey}.cardHeaderAlt`) !==
                `platform.${msgKey}.cardHeaderAlt`
                ? t(`platform.${msgKey}.cardHeaderAlt`)
                : ''

            return (
              <Link
                key={slug}
                href={`/platform/${slug}`}
                className="group flex min-h-[260px] sm:min-h-[280px] flex-col overflow-hidden rounded-2xl border border-gray-200/60 bg-[#f4f4f4] text-center shadow-sm transition-all duration-300 hover:z-10 hover:-translate-y-0.5 hover:border-accent/55 hover:shadow-[0_12px_40px_-6px_rgba(232,90,60,0.55),0_28px_70px_-12px_rgba(232,90,60,0.42),0_0_0_1px_rgba(232,90,60,0.2),0_0_60px_8px_rgba(232,90,60,0.28)] active:z-10 active:-translate-y-0.5 active:border-accent/60 active:shadow-[0_12px_40px_-6px_rgba(232,90,60,0.6),0_28px_70px_-12px_rgba(232,90,60,0.48),0_0_0_1px_rgba(232,90,60,0.22),0_0_72px_10px_rgba(232,90,60,0.32)]"
              >
                <div className="relative h-28 sm:h-32 w-full shrink-0 overflow-hidden bg-gradient-to-br from-gray-300 via-gray-200 to-gray-100">
                  {cardHeaderImage ? (
                    <Image
                      src={cardHeaderImage}
                      alt={headerAlt}
                      fill
                      className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 20vw"
                    />
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col items-center px-4 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
                  <div
                    className="mb-4 flex h-[4.75rem] w-[4.75rem] sm:h-[5.25rem] sm:w-[5.25rem] shrink-0 items-center justify-center rounded-full border-2 border-accent bg-white text-accent group-hover:bg-orange-50/80 transition-colors"
                    aria-hidden
                  >
                    <Icon className="h-9 w-9 sm:h-10 sm:w-10" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 underline decoration-gray-900 underline-offset-4 mb-2.5 leading-snug px-1">
                    {t(`platform.${msgKey}.title`)}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed line-clamp-5">
                    {t(`platform.${msgKey}.teaser`)}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
