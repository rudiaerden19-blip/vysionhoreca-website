'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useLanguage, Locale } from '@/i18n'
import SubscriptionsTermsPopup from './SubscriptionsTermsPopup'

type Props = {
  onStickyNavChange?: (show: boolean) => void
}

const HERO_BG = '/images/hero-header.png'

export default function HomeLandingHero({ onStickyNavChange }: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLangOpen, setIsLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const { locale, setLocale, t, locales, localeNames, localeFlags } = useLanguage()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const hero = sectionRef.current
    if (!hero || !onStickyNavChange) return

    const onScroll = () => {
      const rect = hero.getBoundingClientRect()
      onStickyNavChange(rect.bottom < 72)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onStickyNavChange])

  const handleLanguageSelect = (langCode: Locale) => {
    setLocale(langCode)
    setIsLangOpen(false)
  }

  const pillLinks: { href: string; label: string }[] = [
    { href: '/', label: t('nav.home') },
    { href: '/#sectoren', label: t('nav.sectors') },
    { href: '/#platform', label: t('nav.services') },
    { href: '/videos', label: t('nav.videos') },
    { href: '/abonnementen', label: t('nav.subscriptions') },
  ]

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[72svh] sm:min-h-[76svh] flex flex-col text-white overflow-hidden pb-6 sm:pb-8"
    >
      <div className="absolute inset-0">
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
        <div className="flex items-start justify-between gap-4">
          <a href="/" className="group inline-flex shrink-0 flex-col items-center leading-none">
            <span className="block text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-accent">
              Vysion
            </span>
            <span className="mt-1 block text-center text-base font-medium text-white sm:text-lg md:text-xl">
              {t('heroLanding.logoTagline')}
            </span>
          </a>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
            <a
              href="/#contact"
              className="hidden sm:inline-flex items-center justify-center rounded-md bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-4 py-2.5 shadow-home-btn transition-colors"
            >
              {t('heroLanding.demoRequest')}
            </a>

            <div className="relative hidden md:block" ref={langRef}>
              <button
                type="button"
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1.5 text-white hover:text-white/90 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-expanded={isLangOpen}
              >
                <span className="text-lg">{localeFlags[locale]}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${isLangOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-xl shadow-home-image border border-gray-700 py-2 z-50">
                  {locales.map((langCode) => (
                    <button
                      key={langCode}
                      type="button"
                      onClick={() => handleLanguageSelect(langCode)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors ${
                        locale === langCode ? 'text-accent' : 'text-white'
                      }`}
                    >
                      <span className="text-xl">{localeFlags[langCode]}</span>
                      <span>{localeNames[langCode]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="text-white p-2 rounded-lg hover:bg-white/10"
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
        </div>

        {isMenuOpen && (
          <div className="mt-4 rounded-2xl bg-black/50 backdrop-blur-md border border-white/20 p-4 space-y-1">
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
            <a
              href="/#contact"
              className="block mt-2 text-center rounded-full bg-accent text-white font-semibold py-3 shadow-home-btn"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('heroLanding.demoRequest')}
            </a>
            <div className="border-t border-white/20 pt-3 mt-3">
              <p className="text-white/70 text-xs mb-2">{t('nav.language')}</p>
              <div className="grid grid-cols-3 gap-2">
                {locales.map((langCode) => (
                  <button
                    key={langCode}
                    type="button"
                    onClick={() => {
                      handleLanguageSelect(langCode)
                      setIsMenuOpen(false)
                    }}
        className={`py-2 rounded-lg text-sm ${
          locale === langCode ? 'bg-accent text-white' : 'bg-white/10 text-white'
        }`}
                  >
                    {localeFlags[langCode]} {langCode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center py-6 sm:py-8">
        <h1 className="mx-auto w-full max-w-4xl text-center text-3xl sm:text-4xl md:text-5xl lg:text-[2.85rem] font-bold leading-tight tracking-tight text-accent">
          {t('heroLanding.title')}
        </h1>
        <p className="mt-4 sm:mt-5 text-lg sm:text-xl md:text-2xl text-white font-semibold max-w-2xl leading-snug">
          {t('heroLanding.subtitleLead')}
        </p>
        <p className="mt-3 sm:mt-4 text-base sm:text-lg text-white/85 max-w-2xl leading-relaxed">
          {t('heroLanding.subtitle')}
        </p>
        <div
          className="mt-8 sm:mt-10 md:mt-12 w-full max-w-lg sm:max-w-xl mx-auto rounded-2xl border border-white/25 bg-white/[0.07] backdrop-blur-md px-5 py-6 sm:px-8 sm:py-7 shadow-[0_12px_40px_rgba(0,0,0,0.4)] ring-1 ring-white/10"
          role="region"
          aria-label={`${t('heroLanding.ctaModulesHeadline')} ${t('heroLanding.ctaModulesSubline')} ${t('heroLanding.ctaModulesPricePrefix')} €${t('heroLanding.ctaModulesPriceAmount')} ${t('heroLanding.ctaModulesPricePeriod')}. ${t('heroLanding.ctaModulesPriceNote')} ${t('heroLanding.ctaModulesPriceExtra')}. ${t('heroLanding.readTermsLink')}`}
        >
          <p className="text-xl sm:text-2xl md:text-[1.65rem] font-bold text-white tracking-tight text-balance leading-snug">
            {t('heroLanding.ctaModulesHeadline')}
          </p>
          <p className="mt-2 text-base sm:text-lg font-semibold text-accent text-balance leading-snug">
            {t('heroLanding.ctaModulesSubline')}
          </p>
          <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-white/20">
            <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-white">
              <span className="text-base sm:text-lg text-white/90 font-medium shrink-0">
                {t('heroLanding.ctaModulesPricePrefix')}
              </span>
              <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-accent tracking-tight tabular-nums shrink-0">
                €&nbsp;{t('heroLanding.ctaModulesPriceAmount')}
              </span>
              {t('heroLanding.ctaModulesPricePeriod') ? (
                <span className="text-base sm:text-lg font-semibold text-white/95 shrink-0">
                  {t('heroLanding.ctaModulesPricePeriod')}
                </span>
              ) : null}
            </div>
            <p className="mt-2.5 sm:mt-3 text-center text-[0.7rem] sm:text-xs text-white/60 font-normal leading-snug max-w-md mx-auto">
              {t('heroLanding.ctaModulesPriceNote')}
            </p>
            <p className="mt-1.5 text-center text-[0.7rem] sm:text-xs text-white/60 font-normal leading-snug max-w-md mx-auto">
              {t('heroLanding.ctaModulesPriceExtra')}
            </p>
            <SubscriptionsTermsPopup
              className="mt-3 flex justify-center"
              labelKey="heroLanding.readTermsLink"
              buttonClassName="inline-flex items-center justify-center rounded-lg border border-white/25 bg-white/[0.08] backdrop-blur-md px-3 py-1.5 text-[0.65rem] sm:text-[0.7rem] font-medium text-white/72 hover:text-white hover:bg-white/[0.14] hover:border-white/35 ring-1 ring-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
