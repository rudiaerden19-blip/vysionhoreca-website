'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage, Locale } from '@/i18n'

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLangOpen, setIsLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const { locale, setLocale, t, locales, localeNames, localeFlags } = useLanguage()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLanguageSelect = (langCode: Locale) => {
    setLocale(langCode)
    setIsLangOpen(false)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="text-2xl font-bold">
              <span className="text-accent">Vysion</span>
              <span className="text-gray-400 font-normal ml-1">horeca</span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="/" className="text-gray-300 hover:text-white transition-colors">{t('nav.home')}</a>
            <a href="/#functies" className="text-gray-300 hover:text-white transition-colors">{t('nav.features')}</a>
            <a href="/#prijzen" className="text-gray-300 hover:text-white transition-colors">{t('nav.pricing')}</a>
            <a href="/over-ons" className="text-gray-300 hover:text-white transition-colors">{t('nav.about')}</a>
            <a href="/#contact" className="text-gray-300 hover:text-white transition-colors">{t('nav.contact')}</a>
            <a href="/support" className="text-gray-300 hover:text-white transition-colors">{t('nav.support')}</a>
            <a href="/resellers" className="text-gray-300 hover:text-white transition-colors">{t('nav.resellers')}</a>
            <a href="/kassa" className="text-accent hover:text-accent/80 transition-colors font-medium">Kassa</a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Selector */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 text-white hover:text-accent transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
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
                <div className="absolute right-0 mt-2 w-48 bg-dark rounded-xl shadow-2xl border border-gray-700 py-2 z-50">
                  {locales.map((langCode) => (
                    <button
                      key={langCode}
                      onClick={() => handleLanguageSelect(langCode)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors ${
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

            <a href="/login" className="text-white hover:text-accent transition-colors">{t('nav.login')}</a>
            <a href={`/registreer?lang=${locale}`} className="bg-accent hover:bg-accent/90 text-white px-6 py-2.5 rounded-full font-medium transition-all">
              {t('nav.tryFree')}
            </a>
          </div>

          {/* Mobile menu button */}
          <button 
            className="md:hidden text-white p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
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
            <div className="flex flex-col space-y-4">
              <a href="/" className="text-gray-300 hover:text-white transition-colors">{t('nav.home')}</a>
              <a href="/#functies" className="text-gray-300 hover:text-white transition-colors">{t('nav.features')}</a>
              <a href="/#prijzen" className="text-gray-300 hover:text-white transition-colors">{t('nav.pricing')}</a>
              <a href="/over-ons" className="text-gray-300 hover:text-white transition-colors">{t('nav.about')}</a>
              <a href="/#contact" className="text-gray-300 hover:text-white transition-colors">{t('nav.contact')}</a>
              <a href="/support" className="text-gray-300 hover:text-white transition-colors">{t('nav.support')}</a>
              <a href="/resellers" className="text-accent font-medium">{t('nav.resellers')}</a>
              
              {/* Mobile Language Selector */}
              <div className="border-t border-gray-700 pt-4">
                <p className="text-gray-500 text-sm mb-2">{t('nav.language')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {locales.map((langCode) => (
                    <button
                      key={langCode}
                      onClick={() => handleLanguageSelect(langCode)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        locale === langCode 
                          ? 'bg-accent text-white' 
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      <span>{localeFlags[langCode]}</span>
                      <span className="text-sm">{langCode.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              <a href="/login" className="text-gray-300 hover:text-white transition-colors">{t('nav.login')}</a>
              <a href={`/registreer?lang=${locale}`} className="bg-accent text-white px-6 py-3 rounded-full font-medium text-center">
                {t('nav.tryFree')}
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
