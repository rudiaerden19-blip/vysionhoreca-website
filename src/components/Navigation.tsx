'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage, Locale } from '@/i18n'
export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLangOpen, setIsLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const { locale, setLocale, t, locales, localeNames, localeFlags } = useLanguage()

  // Sluit taalmenu bij klik/tik buiten (pointerdown: betrouwbaarder op iPad dan mousedown)
  useEffect(() => {
    function handlePointerOutside(event: PointerEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerOutside, true)
    return () => document.removeEventListener('pointerdown', handlePointerOutside, true)
  }, [])

  const handleLanguageSelect = (langCode: Locale) => {
    setLocale(langCode)
    setIsLangOpen(false)
  }

  /** iPad/iOS: geen statische :hover — eerste tik moet direct navigeren. Hover alleen bij echte muis. */
  const navLinkClass =
    'inline-flex items-center min-h-11 rounded-lg px-3 py-2 -mx-1 text-gray-300 transition-colors cursor-pointer touch-manipulation [-webkit-tap-highlight-color:transparent] active:text-white [@media(hover:hover)]:hover:text-white'

  const navLinkClassMobile =
    'inline-flex items-center min-h-12 w-full rounded-lg px-3 py-3 text-gray-300 transition-colors cursor-pointer touch-manipulation [-webkit-tap-highlight-color:transparent] active:text-white [@media(hover:hover)]:hover:text-white'

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <a
              href="/"
              className="inline-flex min-h-11 items-center rounded-lg px-2 text-2xl font-bold touch-manipulation [-webkit-tap-highlight-color:transparent]"
            >
              <span className="text-accent">Vysion</span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 ml-12">
            <a href="/" className={navLinkClass}>{t('nav.home')}</a>
            <a href="/videos" className={navLinkClass}>{t('nav.videos')}</a>
            <a href="/#prijzen" className={navLinkClass}>{t('nav.pricing')}</a>
            <a href="/over-ons" className={navLinkClass}>{t('nav.about')}</a>
            <a href="/abonnementen" className={navLinkClass}>{t('nav.subscriptions')}</a>
            <a href="/support" className={navLinkClass}>{t('nav.support')}</a>
            <a href="/resellers" className={navLinkClass}>{t('nav.resellers')}</a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Selector */}
            <div className="relative" ref={langRef}>
              <button
                type="button"
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-white transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent] active:bg-white/15 active:text-accent [@media(hover:hover)]:hover:bg-white/10 [@media(hover:hover)]:hover:text-accent"
              >
                <span className="text-xl">{localeFlags[locale]}</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-dark rounded-xl shadow-home-image border border-gray-700 py-2 z-50">
                  {locales.map((langCode) => (
                    <button
                      type="button"
                      key={langCode}
                      onClick={() => handleLanguageSelect(langCode)}
                      className={`w-full flex items-center gap-3 px-4 py-3 touch-manipulation transition-colors active:bg-white/10 [@media(hover:hover)]:hover:bg-white/10 ${
                        locale === langCode ? 'text-accent' : 'text-white'
                      }`}
                    >
                      <span className="text-xl">{localeFlags[langCode]}</span>
                      <span>{localeNames[langCode]}</span>
                      {locale === langCode && (
                        <svg className="w-5 h-5 ml-auto text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <a
              href="/login"
              className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-white transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent] active:text-accent [@media(hover:hover)]:hover:text-accent"
            >
              {t('nav.login')}
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden flex h-11 w-11 shrink-0 items-center justify-center text-white touch-manipulation [-webkit-tap-highlight-color:transparent]"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={t('ui.ariaToggleMenu')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-700">
            <div className="flex flex-col gap-1">
              <a href="/" className={navLinkClassMobile}>{t('nav.home')}</a>
              <a href="/videos" className={navLinkClassMobile}>{t('nav.videos')}</a>
              <a href="/#prijzen" className={navLinkClassMobile}>{t('nav.pricing')}</a>
              <a href="/over-ons" className={navLinkClassMobile}>{t('nav.about')}</a>
              <a href="/abonnementen" className={navLinkClassMobile}>{t('nav.subscriptions')}</a>
              <a href="/support" className={navLinkClassMobile}>{t('nav.support')}</a>
              <a href="/resellers" className={navLinkClassMobile}>{t('nav.resellers')}</a>

              {/* Mobile Language Selector */}
              <div className="border-t border-gray-700 pt-4">
                <p className="text-gray-500 text-sm mb-2">{t('nav.language')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {locales.map((langCode) => (
                    <button
                      type="button"
                      key={langCode}
                      onClick={() => handleLanguageSelect(langCode)}
                      className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 touch-manipulation transition-colors active:opacity-90 ${ 
                        locale === langCode 
                          ? 'bg-accent text-white shadow-home-btn' 
                          : 'bg-white/10 text-gray-300 shadow-home-float [@media(hover:hover)]:hover:bg-white/20'
                      }`}
                    >
                      <span>{localeFlags[langCode]}</span>
                      <span className="text-sm">{langCode.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              <a href="/login" className={navLinkClassMobile}>{t('nav.login')}</a>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
