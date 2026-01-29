'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Navigation, Footer, CookieBanner } from '@/components'
import { useLanguage } from '@/i18n'

// Hero Section
function HeroSection() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { t, locale } = useLanguage()
  
  const allImages = [
    '/images/screen-1.png',
    '/images/screen-2.png',
    '/images/screen-3.png',
    '/images/screen-4.png',
    '/images/screen-5.png',
    '/images/screen-6.png',
    '/images/screen-7.png',
    '/images/screen-8.png',
    '/images/screen-9.png',
    '/images/screen-10.png',
    '/images/screen-11.png',
    '/images/screen-12.png',
    '/images/screen-13.png',
    '/images/screen-14.png',
    '/images/screen-15.png',
    '/images/screen-16.png',
    '/images/screen-17.png',
    '/images/screen-18.png',
    '/images/screen-19.png',
  ]

  const sliderImages = allImages.slice(1) // All except the first one (iPad screen)

  const goToPrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex === 0 ? allImages.length - 1 : lightboxIndex - 1)
    }
  }

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex === allImages.length - 1 ? 0 : lightboxIndex + 1)
    }
  }
  
  return (
    <section className="bg-[#fdfdfd] min-h-screen flex items-center pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Badges centered under navbar */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8 lg:gap-16 mb-12 -mt-8">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span className="text-accent font-bold text-xs sm:text-sm uppercase">{t('hero.badge1')}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span className="text-accent font-bold text-xs sm:text-sm uppercase">{t('hero.badge2')}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span className="text-accent font-bold text-xs sm:text-sm uppercase">{t('hero.badge3')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-center">
          {/* Left content */}
          <div className="opacity-0 animate-fadeInUp text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-6">
              {t('hero.title')}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0">
              {t('hero.description')}
            </p>
            <div className="bg-gray-50 rounded-2xl p-6 mb-6 max-w-lg mx-auto lg:mx-0 text-left">
              <p className="text-base text-gray-800 font-semibold mb-4">
                {t('hero.extras')}
              </p>
              <ul className="space-y-2 text-gray-600">
                {String(t('hero.extrasList')).split('\n').map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-accent font-bold">✓</span>
                    <span>{item.replace('• ', '')}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-lg font-bold text-accent mb-8 max-w-lg mx-auto lg:mx-0">
              {t('hero.tagline')}
            </p>
            <div className="flex justify-center lg:justify-start">
              <a href={`/registreer?lang=${locale}`} className="btn-primary text-center">
                {t('hero.ctaPrimary')}
              </a>
            </div>
            <p className="text-gray-500 mt-4 text-sm text-center lg:text-left">
              {t('hero.trialInfo')}
            </p>
          </div>

          {/* Right content - POS Monitor with Phone overlay */}
          <div className="opacity-0 animate-fadeInUp delay-200">
            <div className="flex flex-col items-center">
              {/* POS Monitor with Phone */}
              <div className="flex flex-col items-center">
                <div className="relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[380px] lg:max-w-[440px]">
                  {/* POS Monitor */}
                  <img 
                    src="/images/pos-monitor.jpg" 
                    alt="Vysion Horeca POS Systeem" 
                    className="w-full rounded-lg shadow-xl"
                    loading="eager"
                  />
                  {/* Phone mockup overlay - left corner, more to the left */}
                  <img 
                    src="/images/phone-mockup.png" 
                    alt="Vysion Horeca Mobiele App" 
                    className="absolute -left-12 sm:-left-16 md:-left-20 bottom-0 w-[120px] sm:w-[150px] md:w-[180px] drop-shadow-2xl"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lightbox with navigation */}
          {lightboxIndex !== null && (
            <div 
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
              onClick={() => setLightboxIndex(null)}
            >
              {/* Left Arrow */}
              <button 
                className="absolute left-4 sm:left-8 text-white text-5xl hover:text-accent transition-colors p-4"
                onClick={goToPrev}
                aria-label="Vorige afbeelding"
              >
                <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <img 
                src={allImages[lightboxIndex]} 
                alt="Vergrote afbeelding" 
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Right Arrow */}
              <button 
                className="absolute right-4 sm:right-8 text-white text-5xl hover:text-accent transition-colors p-4"
                onClick={goToNext}
                aria-label="Volgende afbeelding"
              >
                <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Close button */}
              <button 
                className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
                onClick={() => setLightboxIndex(null)}
                aria-label="Sluiten"
              >
                ×
              </button>

              {/* Image counter */}
              <div className="absolute bottom-4 text-white text-sm">
                {lightboxIndex + 1} / {allImages.length}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// Features Section
function FeaturesSection() {
  const { t } = useLanguage()
  
  const features = [
    { key: 'online', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /> },
    { key: 'reports', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
    { key: 'analytics', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
    { key: 'payments', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /> },
    { key: 'invoicing', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    { key: 'staff', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
    { key: 'kitchen', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { key: 'loyalty', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /> },
    { key: 'gks', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  ]

  return (
    <section id="functies" className="py-24 bg-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t('features.title')}
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-8 shadow-[0_4px_15px_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.3)] transition-shadow duration-300"
            >
              <div className="w-14 h-14 bg-accent rounded-xl flex items-center justify-center text-white mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {feature.icon}
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t(`features.${feature.key}.title`)}
              </h3>
              <p className="text-gray-600">
                {t(`features.${feature.key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Stats Section
function CountUp({ end, suffix = '', prefix = '' }: { end: number, suffix?: string, prefix?: string }) {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      { threshold: 0.3 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return

    const duration = 2000
    const steps = 60
    const increment = end / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [isVisible, end])

  return <div ref={ref}>{prefix}{count.toLocaleString()}{suffix}</div>
}

function StatsSection() {
  const { t } = useLanguage()
  
  const stats = [
    { value: 2.5, prefix: '€', suffix: 'M+', labelKey: 'stats.processed' },
    { value: 500, prefix: '', suffix: '+', labelKey: 'stats.businesses' },
    { value: 99.9, prefix: '', suffix: '%', labelKey: 'stats.uptime' },
    { value: 24, prefix: '', suffix: '/7', labelKey: 'stats.support' },
  ]

  return (
    <section className="py-20 bg-[#E3E3E3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">
                <CountUp end={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              </div>
              <div className="text-gray-600">
                {t(stat.labelKey)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Order App Section - Product Showcase with fade-in animation
function OrderAppSection() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [visibleImages, setVisibleImages] = useState<number[]>([])
  const sectionRef = useRef<HTMLDivElement>(null)
  const hasTriggeredRef = useRef(false)
  const { t } = useLanguage()

  const images = [
    '/images/app-1.png',
    '/images/app-2.png',
    '/images/app-3.png',
    '/images/app-4.png',
    '/images/app-5.png',
  ]

  const goToPrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex === 0 ? images.length - 1 : lightboxIndex - 1)
    }
  }

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex === images.length - 1 ? 0 : lightboxIndex + 1)
    }
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggeredRef.current) {
          hasTriggeredRef.current = true
          // Fade in images one by one with 200ms delay
          images.forEach((_, index) => {
            setTimeout(() => {
              setVisibleImages(prev => [...prev, index])
            }, index * 200)
          })
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section ref={sectionRef} className="py-24 bg-dark overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t('orderApp.title')}
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {t('orderApp.subtitle')}
          </p>
        </div>

        {/* Product Showcase Grid - 1 row of 5 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6">
          {images.map((src, index) => (
            <div
              key={index}
              className="transition-all duration-700 ease-out cursor-pointer aspect-[9/16] relative overflow-hidden rounded-2xl bg-gray-800"
              style={{
                opacity: visibleImages.includes(index) ? 1 : 0,
                transform: visibleImages.includes(index) ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
              }}
              onClick={() => setLightboxIndex(index)}
            >
              <img
                src={src}
                alt={`Vysion Platform ${index + 1}`}
                className="absolute inset-0 w-full h-full object-cover rounded-2xl hover:scale-105 transition-transform"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        <p className="text-gray-400 text-sm text-center mt-6">{t('hero.clickToOpen')}</p>

        {/* Lightbox with navigation */}
        {lightboxIndex !== null && (
          <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Left Arrow */}
            <button 
              className="absolute left-4 sm:left-8 text-white text-5xl hover:text-accent transition-colors p-4"
              onClick={goToPrev}
              aria-label="Vorige afbeelding"
            >
              <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <img
              src={images[lightboxIndex]}
              alt="Vergroot"
              className="max-w-full max-h-full object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Right Arrow */}
            <button 
              className="absolute right-4 sm:right-8 text-white text-5xl hover:text-accent transition-colors p-4"
              onClick={goToNext}
              aria-label="Volgende afbeelding"
            >
              <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Close button */}
            <button 
              className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
              onClick={() => setLightboxIndex(null)}
              aria-label="Sluiten"
            >
              ×
            </button>

            {/* Image counter */}
            <div className="absolute bottom-4 text-white text-sm">
              {lightboxIndex + 1} / {images.length}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-12">
          <a
            href="#contact"
            className="inline-block bg-accent text-white px-8 py-4 rounded-full font-semibold hover:bg-accent/90 transition-all shadow-lg"
          >
            {t('orderApp.cta')}
          </a>
        </div>
      </div>
    </section>
  )
}

// Pricing Section
function PricingSection() {
  const { t, locale } = useLanguage()
  const [isYearly, setIsYearly] = useState(false)
  
  const starterPrice = isYearly ? 69 * 12 : 69
  const proPrice = isYearly ? 79 * 12 : 79
  const periodLabel = isYearly ? '/jaar' : '/maand'
  
  return (
    <section id="prijzen" className="py-24 bg-[#2a2a3e] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t('pricing.title')}
          </h2>
          <p className="text-xl text-gray-300">
            {t('pricing.subtitle')}
          </p>
        </div>

        {/* Toggle Maandelijks / Jaarlijks */}
        <div className="flex justify-center mb-12">
          <div className="bg-[#1a1a2e] p-1 rounded-full inline-flex items-center">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                !isYearly 
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Maandelijks
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                isYearly 
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Jaarlijks
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          
          {/* Vysion Starter */}
          <div className="bg-gradient-to-b from-[#2d4a3e] to-[#1e3a2f] rounded-3xl overflow-hidden transform hover:scale-[1.02] transition-transform shadow-2xl">
            <div className="p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-400/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">{t('pricing.starter.name')}</h3>
              </div>
              <div className="flex items-baseline mb-6">
                <span className="text-5xl font-bold text-yellow-400">€{starterPrice}</span>
                <span className="text-gray-400 ml-2">{periodLabel}</span>
              </div>
              
              <ul className="space-y-3 mb-8">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((i) => (
                  <li key={i} className="flex items-center">
                    <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-200">{t(`pricing.starter.features.${i}`)}</span>
                  </li>
                ))}
              </ul>
              
              <a 
                href={`/registreer?lang=${locale}&plan=starter&billing=${isYearly ? 'yearly' : 'monthly'}`}
                className="block w-full bg-[#1a1a2e] text-white text-center py-4 rounded-full font-semibold hover:bg-[#0f0f1a] transition-colors"
              >
                {t('pricing.chooseStarter')}
              </a>
              <p className="text-center text-gray-400 text-sm mt-3">{t('pricing.cancelAnytime')}</p>
            </div>
          </div>

          {/* Vysion Pro - POPULAR */}
          <div className="bg-gradient-to-b from-[#4a3f6e] to-[#2d2654] rounded-3xl overflow-hidden transform hover:scale-[1.02] transition-transform shadow-2xl relative">
            {/* Popular badge */}
            <div className="absolute top-4 right-4 bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              {t('pricing.popular')}
            </div>
            <div className="p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-400/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">{t('pricing.pro.name')}</h3>
              </div>
              <div className="flex items-baseline mb-6">
                <span className="text-5xl font-bold text-purple-300">€{proPrice}</span>
                <span className="text-gray-400 ml-2">{periodLabel}</span>
              </div>
              
              <p className="text-purple-200 mb-4 flex items-center">
                <span className="mr-2">✨</span>
                {t('pricing.pro.allOfStarter')}
              </p>
              
              <ul className="space-y-3 mb-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <li key={i} className="flex items-center">
                    <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-200">{t(`pricing.pro.features.${i}`)}</span>
                  </li>
                ))}
              </ul>
              
              <a 
                href={`/registreer?lang=${locale}&plan=pro&billing=${isYearly ? 'yearly' : 'monthly'}`}
                className="block w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-center py-4 rounded-full font-semibold hover:from-pink-600 hover:to-purple-600 transition-colors"
              >
                {t('pricing.choosePro')}
              </a>
              <p className="text-center text-gray-400 text-sm mt-3">{t('pricing.cancelAnytime')}</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// STOP Section - One-time animation
function StopSection() {
  const { t, locale } = useLanguage()
  const sectionRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState(0) // 0: waiting, 1: STOP visible, 2: STOP fading, 3: content visible
  const hasTriggeredRef = useRef(false) // Use ref to prevent re-triggers
  
  const cardKeys = [1, 2, 3, 4]
  const freeKeys = [1, 2, 3, 4, 5]
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only trigger ONCE when section comes into view
        if (entry.isIntersecting && !hasTriggeredRef.current) {
          hasTriggeredRef.current = true
          
          // Phase 1: Show STOP
          setPhase(1)
          
          // Phase 2: Fade STOP after 1.2s
          setTimeout(() => setPhase(2), 1200)
          
          // Phase 3: Show content after 2s
          setTimeout(() => setPhase(3), 2000)
        }
      },
      { threshold: 0.3 }
    )
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }
    
    return () => observer.disconnect()
  }, [])
  
  return (
    <section 
      ref={sectionRef}
      className="relative bg-black min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* STOP Text - Big and centered */}
      <div 
        className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-all duration-700"
        style={{ 
          opacity: phase === 0 ? 0 : phase === 1 ? 1 : 0.05,
          transform: `scale(${phase >= 1 ? 1 : 0.5})`,
        }}
      >
        <span 
          className="text-[30vw] sm:text-[25vw] font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-accent to-red-600 select-none"
          style={{
            textShadow: '0 0 80px rgba(234, 88, 12, 0.6)',
          }}
        >
          {t('stop.title')}
        </span>
      </div>
      
      {/* Main Content */}
      <div 
        className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 transition-all duration-700"
        style={{ 
          opacity: phase >= 3 ? 1 : 0,
          transform: `translateY(${phase >= 3 ? 0 : 30}px)`,
        }}
      >
        {/* Headline */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white mb-4">
            {t('stop.headline')}
          </h2>
          <p className="text-xl sm:text-2xl text-gray-300">
            {t('stop.subheadline')}
          </p>
        </div>
        
        {/* Cards Grid */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {cardKeys.map((key, index) => (
            <div 
              key={key}
              className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-accent/50 transition-all duration-500 hover:scale-105"
              style={{
                opacity: phase >= 3 ? 1 : 0,
                transform: `translateY(${phase >= 3 ? 0 : 20}px)`,
                transitionDelay: `${index * 100}ms`,
              }}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 text-left">
                  <p className="text-gray-400 text-sm mb-1">{t(`stop.cards.${key}.you`)}</p>
                  <p className="text-white font-bold text-lg flex items-center gap-2">
                    <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    {t(`stop.cards.${key}.we`)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Custom Build Note */}
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-gray-400 text-base sm:text-lg">
            {t('stop.customBuildNote')}
          </p>
        </div>
        
        {/* FREE Section */}
        <div 
          className="bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20 rounded-3xl p-6 sm:p-10 border-2 border-accent/30 text-center transition-all duration-500"
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: `translateY(${phase >= 3 ? 0 : 20}px)`,
            transitionDelay: '400ms',
          }}
        >
          <h3 className="text-2xl sm:text-4xl font-black text-accent mb-6">
            {t('stop.freeTitle')}
          </h3>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mb-8">
            {freeKeys.map((key) => (
              <div key={key} className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full">
                <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white font-medium text-sm sm:text-base">{t(`stop.freeItems.${key}`)}</span>
              </div>
            ))}
          </div>
          <a
            href={`/registreer?lang=${locale}`}
            className="inline-block bg-accent text-white px-8 sm:px-10 py-4 rounded-full font-bold text-lg hover:bg-accent/90 transition-all shadow-[0_0_30px_rgba(234,88,12,0.5)] hover:shadow-[0_0_50px_rgba(234,88,12,0.7)] hover:scale-105"
          >
            {t('stop.cta')}
          </a>
        </div>
      </div>
    </section>
  )
}

// But Wait Section
function ButWaitSection() {
  const { t } = useLanguage()
  
  const featureKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  return (
    <section className="py-20 bg-dark overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-accent text-lg font-semibold tracking-wider uppercase mb-4">
            {t('butWait.label')}
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
            {t('butWait.title')}<br />
            <span className="text-accent">{t('butWait.titleAccent')}</span>
          </h2>
          <p className="text-xl sm:text-2xl text-gray-300 mt-6">
            {t('butWait.subtitle')}
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-stretch">
          {/* Left - Image */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl">
            <img
              src="/images/entrepreneur.jpg"
              alt="Ondernemer werkt met Vysion"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Right - Features List */}
          <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-xl flex flex-col justify-center">
            <h3 className="text-accent text-2xl sm:text-3xl font-bold mb-10">{t('butWait.boxTitle')}</h3>
            <ul className="space-y-4">
              {featureKeys.map((key) => (
                <li key={key} className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 text-lg">{t(`butWait.features.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

// Comparison Section
function ComparisonSection() {
  const { t, locale } = useLanguage()
  
  const featureKeys = ['online', 'website', 'terminal', 'kitchen', 'allergies', 'qr', 'promotions', 'reservation', 'inventory', 'seo', 'loyalty', 'staff', 'costCalculator', 'analytics', 'reviews', 'languages', 'training', 'commission']
  
  const features = featureKeys.map(key => ({
    name: t(`comparison.features.${key}`),
    vysion: true,
    lightspeed: ['terminal', 'kitchen', 'loyalty', 'staff', 'reservation', 'inventory'].includes(key) ? true : key === 'analytics' ? t('comparison.limited') : false,
    square: ['terminal', 'kitchen', 'loyalty', 'inventory'].includes(key),
    strobbo: ['online', 'terminal', 'kitchen'].includes(key),
  }))

  const renderCheck = (value: boolean | string) => {
    if (value === true) {
      return <svg className="w-6 h-6 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
    } else if (value === false) {
      return <svg className="w-6 h-6 text-red-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
    } else {
      return <span className="text-yellow-500 text-sm font-medium">{value}</span>
    }
  }

  return (
    <section className="py-24 bg-[#E3E3E3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {t('comparison.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('comparison.subtitle')}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            <thead>
              <tr className="bg-dark text-white">
                <th className="px-6 py-5 text-left font-semibold">{t('comparison.feature')}</th>
                <th className="px-6 py-5 text-center">
                  <div className="text-accent font-bold text-lg">Vysion Horeca</div>
                  <div className="text-sm text-gray-300">€79 - €99/maand</div>
                </th>
                <th className="px-6 py-5 text-center">
                  <div className="font-semibold">Lightspeed</div>
                  <div className="text-sm text-gray-300">€79 - €249/maand</div>
                </th>
                <th className="px-6 py-5 text-center">
                  <div className="font-semibold">Square</div>
                  <div className="text-sm text-gray-300">€60 - €165/maand</div>
                </th>
                <th className="px-6 py-5 text-center">
                  <div className="font-semibold">Strobbo</div>
                  <div className="text-sm text-gray-300">€75 - €150/maand</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-[#E3E3E3]' : 'bg-white'}>
                  <td className="px-6 py-4 font-medium text-gray-900">{feature.name}</td>
                  <td className="px-6 py-4 text-center bg-accent/5">{renderCheck(feature.vysion)}</td>
                  <td className="px-6 py-4 text-center">{renderCheck(feature.lightspeed)}</td>
                  <td className="px-6 py-4 text-center">{renderCheck(feature.square)}</td>
                  <td className="px-6 py-4 text-center">{renderCheck(feature.strobbo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center mt-12">
          <a
            href={`/registreer?lang=${locale}`}
            className="inline-block bg-accent text-white px-8 py-4 rounded-full font-semibold hover:bg-accent/90 transition-all shadow-lg"
          >
            {t('comparison.cta')}
          </a>
        </div>
      </div>
    </section>
  )
}

// Industry Section
function IndustrySection() {
  const [activeTab, setActiveTab] = useState('invoicing')
  const [showLightbox, setShowLightbox] = useState(false)
  const { t, locale } = useLanguage()
  
  const industries = {
    invoicing: { image: '/images/industry-invoicing.png' },
    ordering: { image: '/images/industry-ordering.png' },
    analytics: { image: '/images/industry-analytics.png' },
    accounting: { image: '/images/cost-calculator-1.png' },
    payroll: { image: '/images/industry-payroll.png' },
  }

  const current = industries[activeTab as keyof typeof industries]

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
          {t('industry.sectionTitle')}
        </h2>
        
        {/* Tabs */}
        <div className="flex flex-wrap gap-3 sm:gap-6 lg:gap-8 mb-12 justify-center lg:justify-start">
          {['invoicing', 'ordering', 'analytics', 'accounting', 'payroll'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-sm sm:text-base lg:text-lg font-semibold pb-2 border-b-4 transition-colors ${
                activeTab === tab
                  ? 'text-accent border-accent'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              {t(`industry.${tab}.tab`)}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left content */}
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              {t(`industry.${activeTab}.title`)}
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              {t(`industry.${activeTab}.description`)}
            </p>
            <a
              href={`/registreer?lang=${locale}`}
              className="inline-block bg-accent text-white px-8 py-4 rounded-full font-semibold hover:bg-accent/90 transition-all"
            >
              {t('industry.tryFree')}
            </a>
          </div>

          {/* Right content - Image */}
          <div className="relative text-center flex flex-col items-center justify-center">
            <img
              src={current.image}
              alt={activeTab}
              className="w-full max-w-[600px] lg:max-w-none lg:scale-110 h-auto object-contain rounded-2xl shadow-xl cursor-pointer"
              loading="lazy"
              onClick={() => setShowLightbox(true)}
            />
            <p className="text-gray-500 text-sm mt-6">{t('industry.clickToEnlarge')}</p>
          </div>
        </div>

        {/* Lightbox Modal */}
        {showLightbox && (
          <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setShowLightbox(false)}
          >
            <img
              src={current.image}
              alt={activeTab}
              className="max-w-full max-h-full object-contain"
            />
            <button 
              className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
              onClick={() => setShowLightbox(false)}
              aria-label="Sluiten"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

// Cost Calculator Section
function CostCalculatorSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImage, setLightboxImage] = useState('')
  const { t } = useLanguage()
  
  const images = [
    '/images/cost-calculator-1.png',
    '/images/cost-calculator-2.png',
    '/images/cost-calculator-3.png',
    '/images/cost-calculator-4.png',
  ]
  
  const goToPrev = () => {
    setCurrentSlide((prev) => (prev - 1 + images.length) % images.length)
  }
  
  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % images.length)
  }

  const openLightbox = (image: string) => {
    setLightboxImage(image)
    setLightboxOpen(true)
  }

  return (
    <section className="py-24 bg-gray-900 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-orange-400">
            {t('costCalculator.title')}
          </h2>
          <p className="text-xl sm:text-2xl font-semibold text-white mb-6">
            {t('costCalculator.subtitle')}
          </p>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto">
            {t('costCalculator.description')}
          </p>
        </div>

        {/* Image Carousel */}
        <div className="relative max-w-4xl mx-auto">
          {/* Left Arrow */}
          <button
            onClick={goToPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Right Arrow */}
          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {/* Images */}
          <div className="overflow-hidden rounded-2xl mx-14">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {images.map((image, index) => (
                <div key={index} className="w-full flex-shrink-0">
                  <img
                    src={image}
                    alt={`Cost Calculator Screenshot ${index + 1}`}
                    className="w-full h-auto rounded-2xl shadow-2xl cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => openLightbox(image)}
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Click to enlarge */}
          <p className="text-center text-gray-400 mt-4 text-sm">
            {t('costCalculator.clickToEnlarge')}
          </p>
          
          {/* Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  currentSlide === index ? 'bg-orange-500' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a
            href="/registreer"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            {t('costCalculator.tryFree')}
          </a>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white text-3xl hover:opacity-70"
          >
            ×
          </button>
          <img
            src={lightboxImage}
            alt="Cost Calculator"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </section>
  )
}

// Testimonial Section
function TestimonialSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const { t } = useLanguage()
  
  const testimonialKeys = [1, 2, 3, 4, 5, 6]
  
  const goToPrev = () => {
    setCurrentSlide((prev) => (prev - 1 + testimonialKeys.length) % testimonialKeys.length)
  }
  
  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % testimonialKeys.length)
  }

  return (
    <section className="py-24 bg-[#E3E3E3] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {t('testimonials.title')}
          </h2>
        </div>

        <div className="relative">
          {/* Left Arrow */}
          <button 
            onClick={goToPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 rounded-full p-3 shadow-lg transition-all hover:scale-110"
            aria-label="Vorige review"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Right Arrow */}
          <button 
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 rounded-full p-3 shadow-lg transition-all hover:scale-110"
            aria-label="Volgende review"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          <div 
            className="flex transition-transform duration-500 ease-in-out mx-12"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {testimonialKeys.map((key, index) => (
              <div key={index} className="w-full flex-shrink-0 px-4">
                <div className="bg-white rounded-2xl p-8 shadow-sm max-w-2xl mx-auto">
                  <div className="flex mb-4 justify-center">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 italic text-center text-lg">
                    &ldquo;{t(`testimonials.quotes.${key}.quote`)}&rdquo;
                  </p>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">{t(`testimonials.quotes.${key}.author`)}</p>
                    <p className="text-sm text-gray-500">{t(`testimonials.quotes.${key}.role`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Counter */}
          <div className="text-center mt-6 text-gray-500">
            {currentSlide + 1} / {testimonialKeys.length}
          </div>
        </div>
      </div>
    </section>
  )
}

// CTA Section
function CTASection() {
  const { t, locale } = useLanguage()
  
  return (
    <section id="demo" className="relative overflow-hidden min-h-[500px] sm:min-h-[600px] flex items-center justify-center">
      {/* Video Background */}
      <video 
        autoPlay 
        muted 
        loop 
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: 'center center', transform: 'scale(1.0)' }}
      >
        <source src="/images/cta-video.mp4" type="video/mp4" />
      </video>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70"></div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
          {t('cta.title')}
        </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          {t('cta.subtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href={`/registreer?lang=${locale}`} className="btn-primary">
            {t('cta.primary')}
          </a>
          <a href="#contact" className="btn-outline">
            {t('cta.secondary')}
          </a>
        </div>
      </div>
    </section>
  )
}

// Contact Section
function ContactSection() {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: ''
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Er ging iets mis')
      }

      setStatus('success')
      setFormData({ firstName: '', lastName: '', email: '', message: '' })
      
      // Reset success message after 5 seconds
      setTimeout(() => setStatus('idle'), 5000)
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Er ging iets mis')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }
  
  return (
    <section id="contact" className="py-24 bg-[#E3E3E3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              {t('contact.title')}
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              {t('contact.subtitle')}
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('contact.email')}</p>
                  <a href="mailto:info@vysionhoreca.com" className="text-gray-900 hover:text-accent">
                    info@vysionhoreca.com
                  </a>
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('contact.phone')}</p>
                  <a href="tel:+32492129383" className="text-gray-900 hover:text-accent">
                    +32 492 12 93 83
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#E3E3E3] rounded-2xl p-8">
            {status === 'success' ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('contact.form.successTitle')}</h3>
                <p className="text-gray-600 text-center">{t('contact.form.successMessage')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {status === 'error' && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {errorMessage}
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.form.firstName')} <span className="text-red-500">{t('contact.form.required')}</span></label>
                    <input 
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      disabled={status === 'loading'}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder={t('contact.form.placeholder.firstName')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.form.lastName')} <span className="text-red-500">{t('contact.form.required')}</span></label>
                    <input 
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      disabled={status === 'loading'}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder={t('contact.form.placeholder.lastName')}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.form.email')} <span className="text-red-500">{t('contact.form.required')}</span></label>
                  <input 
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={status === 'loading'}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder={t('contact.form.placeholder.email')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.form.message')} <span className="text-red-500">{t('contact.form.required')}</span></label>
                  <textarea 
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    required
                    disabled={status === 'loading'}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder={t('contact.form.placeholder.message')}
                  />
                </div>
                <button 
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-accent hover:bg-accent/90 text-white py-4 rounded-lg font-semibold transition-colors disabled:bg-accent/50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {status === 'loading' ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('contact.form.sending')}
                    </>
                  ) : (
                    t('contact.form.submit')
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// Main Page Component
export default function HomePage() {
  return (
    <main>
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <OrderAppSection />
      <StopSection />
      <PricingSection />
      <ButWaitSection />
      <ComparisonSection />
      <IndustrySection />
      <CostCalculatorSection />
      <TestimonialSection />
      <CTASection />
      <ContactSection />
      <Footer />
      <CookieBanner />
    </main>
  )
}
