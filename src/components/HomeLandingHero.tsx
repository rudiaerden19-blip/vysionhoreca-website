'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useLanguage } from '@/i18n'
import MarketingStartAndDemoButtons from '@/components/MarketingStartAndDemoButtons'
import SubscriptionsTermsPopup from './SubscriptionsTermsPopup'
import KassaProductNavMenu from './KassaProductNavMenu'
import GoogleReviewsHeroBadge from './GoogleReviewsHeroBadge'
import { monthlyPriceForHardware } from '@/lib/pricing-hardware'

const HERO_BG = '/images/hero-header.png'

/** Marketing kassa-hero: lichtblauw accent op titel/prijs (lichter dan platform `accent` #0E5D82). */
const HERO_KASSA_ACCENT = 'text-[#5EC4E8]'

/** Hoogte vaste marketing-nav (~ `Navigation`h-20); inhoud niet onder de balk laten verdwijnen. */
const NAV_TOP_OFFSET_CLASS = 'pt-20'

const HERO_CTA_CARD_SHELL =
  'rounded-2xl border border-white/25 bg-white/[0.07] backdrop-blur-md px-5 py-6 sm:px-8 sm:py-7 shadow-[0_12px_40px_rgba(0,0,0,0.4)] ring-1 ring-white/10'

const HERO_CTA_FLIP_MS = 8000

function HeroCtaFlipCard() {
  const { t } = useLanguage()
  const [showBack, setShowBack] = useState(false)
  const [withHardware, setWithHardware] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduceMotion(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (reduceMotion) return
    const id = window.setInterval(() => setShowBack(prev => !prev), HERO_CTA_FLIP_MS)
    return () => window.clearInterval(id)
  }, [reduceMotion])

  const flipped = !reduceMotion && showBack
  const monthlyPrice = monthlyPriceForHardware(withHardware)

  const frontSubline = withHardware
    ? t('heroLanding.ctaModulesSublineWithHardware')
    : t('heroLanding.ctaModulesSublineNoHardware')
  const frontPriceNote = withHardware
    ? t('heroLanding.ctaModulesPriceNoteWithHardware')
    : t('heroLanding.ctaModulesPriceNoteNoHardware')
  const frontPriceExtra = withHardware
    ? t('heroLanding.ctaModulesPriceExtraWithHardware')
    : t('heroLanding.ctaModulesPriceExtraNoHardware')

  const frontLabel = `${t('heroLanding.ctaModulesHeadline')} ${frontSubline} ${t('heroLanding.ctaModulesKassaFootnote')} ${t('heroLanding.ctaModulesPricePrefix')} €${monthlyPrice} ${t('heroLanding.ctaModulesPricePeriod')}. ${frontPriceNote} ${frontPriceExtra}. ${t('heroLanding.readTermsLink')}`
  const backLabel = `${t('heroLanding.ctaModulesBackHeadline')} ${t('heroLanding.ctaModulesBackSubline')} ${t('heroLanding.ctaModulesBackFootnote')} €${t('heroLanding.ctaModulesBackPriceAmount')} ${t('heroLanding.ctaModulesBackPricePeriod')}. ${t('heroLanding.ctaModulesBackPriceNote')}`

  const faceBase = `${HERO_CTA_CARD_SHELL} absolute inset-0 flex flex-col justify-center text-center [backface-visibility:hidden]`

  return (
    <div
      className="mt-8 sm:mt-10 md:mt-12 w-full max-w-lg sm:max-w-xl mx-auto [perspective:1200px]"
      role="region"
      aria-label={flipped ? backLabel : frontLabel}
      aria-live={reduceMotion ? undefined : 'polite'}
    >
      <div
        className={`relative min-h-[19rem] sm:min-h-[20rem] w-full transition-transform duration-700 ease-in-out [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <div className={`${faceBase} [transform:rotateY(0deg)]`}>
          <p className="text-xl sm:text-2xl md:text-[1.65rem] font-bold text-white tracking-tight text-balance leading-snug">
            {t('heroLanding.ctaModulesHeadline')}
          </p>
          <p className={`mt-2 text-base sm:text-lg font-semibold text-balance leading-snug ${HERO_KASSA_ACCENT}`}>
            {frontSubline}
          </p>
          <p className="mt-1.5 text-[0.65rem] sm:text-[0.7rem] text-white/65 font-normal leading-snug max-w-md mx-auto">
            {t('heroLanding.ctaModulesKassaFootnote')}
          </p>
          <div
            className="mt-3 flex max-w-md mx-auto rounded-full border border-white/25 bg-black/25 p-0.5"
            role="group"
            aria-label={t('heroLanding.ctaModulesHardwareToggleAria')}
          >
            <button
              type="button"
              onClick={() => setWithHardware(false)}
              className={`flex-1 rounded-full px-2 py-2 text-[0.65rem] sm:text-xs font-semibold transition-colors ${
                !withHardware
                  ? 'bg-white/95 text-gray-900 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              €69 · {t('pricing.hardwareWithout')}
            </button>
            <button
              type="button"
              onClick={() => setWithHardware(true)}
              className={`flex-1 rounded-full px-2 py-2 text-[0.65rem] sm:text-xs font-semibold transition-colors ${
                withHardware
                  ? 'bg-white/95 text-gray-900 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              €99 · {t('pricing.hardwareWith')}
            </button>
          </div>
          <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-white/20 w-full">
            <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-white">
              <span className="text-base sm:text-lg text-white/90 font-medium shrink-0">
                {t('heroLanding.ctaModulesPricePrefix')}
              </span>
              <span className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight tabular-nums shrink-0 ${HERO_KASSA_ACCENT}`}>
                €&nbsp;{monthlyPrice}
              </span>
              {t('heroLanding.ctaModulesPricePeriod') ? (
                <span className="text-base sm:text-lg font-semibold text-white/95 shrink-0">
                  {t('heroLanding.ctaModulesPricePeriod')}
                </span>
              ) : null}
            </div>
            <p className="mt-2.5 sm:mt-3 text-center text-[0.7rem] sm:text-xs text-white/60 font-normal leading-snug max-w-md mx-auto">
              {frontPriceNote}
            </p>
            <p className="mt-1.5 text-center text-[0.7rem] sm:text-xs text-white/60 font-normal leading-snug max-w-md mx-auto">
              {frontPriceExtra}
            </p>
            <SubscriptionsTermsPopup
              className="mt-3 flex justify-center"
              labelKey="heroLanding.readTermsLink"
              buttonClassName="inline-flex items-center justify-center rounded-lg border border-white/25 bg-white/[0.08] backdrop-blur-md px-3 py-1.5 text-[0.65rem] sm:text-[0.7rem] font-medium text-white/72 hover:text-white hover:bg-white/[0.14] hover:border-white/35 ring-1 ring-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            />
          </div>
        </div>

        <div className={`${faceBase} [transform:rotateY(180deg)]`}>
          <p className="text-xl sm:text-2xl md:text-[1.65rem] font-bold text-white tracking-tight text-balance leading-snug">
            {t('heroLanding.ctaModulesBackHeadline')}
          </p>
          <p className={`mt-2 text-base sm:text-lg font-semibold text-balance leading-snug ${HERO_KASSA_ACCENT}`}>
            {t('heroLanding.ctaModulesBackSubline')}
          </p>
          <p className="mt-1.5 text-[0.65rem] sm:text-[0.7rem] text-white/65 font-normal leading-snug max-w-md mx-auto">
            {t('heroLanding.ctaModulesBackFootnote')}
          </p>
          <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-white/20 w-full">
            <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-white">
              {t('heroLanding.ctaModulesBackPricePrefix') ? (
                <span className="text-base sm:text-lg text-white/90 font-medium shrink-0">
                  {t('heroLanding.ctaModulesBackPricePrefix')}
                </span>
              ) : null}
              <span className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight tabular-nums shrink-0 ${HERO_KASSA_ACCENT}`}>
                €&nbsp;{t('heroLanding.ctaModulesBackPriceAmount')}
              </span>
              {t('heroLanding.ctaModulesBackPricePeriod') ? (
                <span className="text-base sm:text-lg font-semibold text-white/95 shrink-0">
                  {t('heroLanding.ctaModulesBackPricePeriod')}
                </span>
              ) : null}
            </div>
            <p className="mt-2.5 sm:mt-3 text-center text-[0.7rem] sm:text-xs text-white/60 font-normal leading-snug max-w-md mx-auto">
              {t('heroLanding.ctaModulesBackPriceNote')}
            </p>
            <a
              href="/licentie"
              className="mt-3 inline-flex items-center justify-center rounded-lg border border-white/25 bg-white/[0.08] backdrop-blur-md px-3 py-1.5 text-[0.65rem] sm:text-[0.7rem] font-medium text-white/72 hover:text-white hover:bg-white/[0.14] hover:border-white/35 ring-1 ring-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
            >
              {t('heroLanding.ctaModulesBackLink')}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomeLandingHero() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { t } = useLanguage()

  const pillLinks: { href: string; label: string }[] = [
    { href: '/#sectoren', label: t('nav.sectors') },
    { href: '/#platform', label: t('nav.services') },
    { href: '/#prijzen', label: t('nav.pricing') },
  ]

  return (
    <section
      className={`relative ${NAV_TOP_OFFSET_CLASS} min-h-[72svh] sm:min-h-[76svh] flex flex-col text-white overflow-x-hidden pb-6 sm:pb-8`}
    >
      <div className="absolute inset-x-0 top-[-5rem] bottom-0">
        <Image
          src={HERO_BG}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/60" aria-hidden />
      </div>

      {/* Top bar */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-1">
        <div className="flex items-start justify-end gap-4">
          <MarketingStartAndDemoButtons compact onDark />
          <button
            type="button"
            className="text-white p-2 rounded-lg hover:bg-white/10 shrink-0"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={t('ui.ariaNavMenu')}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {isMenuOpen && (
          <div className="mt-4 rounded-2xl bg-black/50 backdrop-blur-md border border-white/20 p-4 space-y-1 sm:hidden">
            <KassaProductNavMenu
              linkClass="block py-3 px-3 rounded-lg text-white font-medium hover:bg-white/10 w-full"
              layout="mobile"
              onNavigate={() => setIsMenuOpen(false)}
            />
            {pillLinks.map(({ href, label }) => (
              <a
                key={href + label}
                href={href}
                className="block py-3 px-3 rounded-lg text-white font-medium hover:bg-white/10"
                onClick={() => setIsMenuOpen(false)}
              >
                {label}
              </a>
            ))}
            <MarketingStartAndDemoButtons onDark fullWidth className="mt-2 pt-2 border-t border-white/20" />
          </div>
        )}
      </header>

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center py-6 sm:py-8">
        <GoogleReviewsHeroBadge
          label={t('heroLanding.googleReviewsLabel')}
          ariaLabel={t('heroLanding.googleReviewsAria')}
          className="mb-5 sm:mb-6"
        />
        <h1 className={`mx-auto w-full max-w-4xl text-center text-3xl sm:text-4xl md:text-5xl lg:text-[2.85rem] font-bold leading-tight tracking-tight ${HERO_KASSA_ACCENT}`}>
          {t('heroLanding.title')}
        </h1>
        <p className="mt-4 sm:mt-5 text-lg sm:text-xl md:text-2xl text-white font-semibold max-w-2xl leading-snug">
          {t('heroLanding.subtitleLead')}
        </p>
        <p className="mt-3 sm:mt-4 text-base sm:text-lg text-white/85 max-w-2xl leading-relaxed">
          {t('heroLanding.subtitle')}
        </p>
        <HeroCtaFlipCard />
        <p className="mt-4 sm:mt-5 w-full max-w-lg sm:max-w-xl mx-auto text-center text-xs sm:text-sm font-semibold uppercase tracking-wide text-white/90 leading-snug px-2">
          {t('heroLanding.ctaModulesOneTimeLicense')}
        </p>
      </div>
    </section>
  )
}
