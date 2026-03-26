'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Navigation, Footer, CookieBanner, HomeLandingHero, PlatformGridSection } from '@/components'
import { useLanguage } from '@/i18n'

function WhyVysionSection() {
  const { t } = useLanguage()
  const pointKeys = ['fullPlatform', 'liveSupport', 'rightPrice'] as const

  return (
    <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden border-b border-gray-100 bg-gradient-to-b from-[#faf8f6] via-white to-white">
      <div
        className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-accent/[0.08] blur-3xl sm:h-96 sm:w-96"
        aria-hidden
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-5 order-2 lg:order-1">
            <h2 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-bold text-gray-900 tracking-tight leading-[1.15] mb-10 sm:mb-12 text-center lg:text-left max-w-xl lg:mx-0 mx-auto">
              {t('whyVysion.title')}
            </h2>
            <ul className="space-y-9 sm:space-y-10 max-w-xl mx-auto lg:mx-0">
              {pointKeys.map((key, i) => (
                <li key={key} className="flex gap-4 sm:gap-5">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-sm font-bold tabular-nums text-accent ring-1 ring-accent/20"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 leading-snug">
                      {t(`whyVysion.${key}.title`)}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed border-l-2 border-accent/25 pl-4">
                      {t(`whyVysion.${key}.body`)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7 order-1 lg:order-2">
            <div className="relative mx-auto max-w-2xl lg:max-w-none">
              <div
                className="absolute -inset-3 rounded-[1.75rem] bg-gradient-to-br from-accent/20 via-accent/5 to-transparent opacity-80 blur-sm sm:-inset-4"
                aria-hidden
              />
              <figure className="relative rounded-2xl sm:rounded-3xl bg-gray-900/5 p-2 sm:p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06]">
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-[#f5f0e8]">
                  <Image
                    src="/images/why-vysion-pos-mockup.png"
                    alt=""
                    width={819}
                    height={1024}
                    className="w-full h-auto object-contain"
                    sizes="(min-width: 1024px) 42vw, 92vw"
                    priority={false}
                  />
                </div>
              </figure>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function NewAtVysionSection() {
  const { t } = useLanguage()

  return (
    <section className="py-14 sm:py-16 bg-white border-t border-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 tracking-tight">
          {t('newAtVysion.title')}
        </h2>
        <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-8">{t('newAtVysion.body')}</p>
        <a
          href="#contact"
          className="inline-block bg-accent text-white px-8 py-4 rounded-full font-semibold hover:bg-accent/90 transition-colors"
        >
          {t('newAtVysion.cta')}
        </a>
      </div>
    </section>
  )
}

// One Day Online Section
function OneDayOnlineSection() {
  const { t, locale } = useLanguage()
  
  const benefits = [
    { icon: "🚀", key: "oneDay" },
    { icon: "💰", key: "noDeposit" },
    { icon: "👨‍💻", key: "liveSupport" },
    { icon: "✓", key: "cancelAnytime" },
    { icon: "📈", key: "growth" },
    { icon: "🎤", key: "voiceOrder" }
  ]

  return (
    <section className="py-20 bg-[#e3e3e3]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            {t('oneDayOnline.title')} <span className="text-accent">{t('oneDayOnline.titleAccent')}</span> {t('oneDayOnline.titleEnd')}
          </h2>
          <p className="text-xl text-gray-600">
            {t('oneDayOnline.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:bg-gray-50 transition-all hover:scale-[1.02]"
            >
              <div className="text-4xl mb-4">{benefit.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t(`oneDayOnline.benefits.${benefit.key}.title`)}</h3>
              <p className="text-gray-600">{t(`oneDayOnline.benefits.${benefit.key}.description`)}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <a 
            href={`/registreer?lang=${locale}`}
            className="inline-block bg-accent hover:bg-accent/90 text-white px-8 py-4 rounded-full font-semibold text-lg transition-colors"
          >
            {t('oneDayOnline.cta')}
          </a>
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
    <section ref={sectionRef} className="py-24 bg-[#e3e3e3] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {t('orderApp.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('orderApp.subtitle')}
          </p>
        </div>

        {/* Product Showcase Grid - 1 row of 5 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6">
          {images.map((src, index) => (
            <div
              key={index}
              className="transition-all duration-700 ease-out cursor-pointer aspect-[9/16] relative overflow-hidden rounded-2xl bg-gray-300"
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

        <p className="text-gray-500 text-sm text-center mt-6">{t('hero.clickToOpen')}</p>

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
  
  // Jaarlijks = 10% korting
  const starterMonthly = 59
  const proMonthly = 99
  const starterPrice = isYearly ? Math.round(starterMonthly * 12 * 0.9) : starterMonthly
  const proPrice = isYearly ? Math.round(proMonthly * 12 * 0.9) : proMonthly
  const periodLabel = isYearly ? '/jaar' : '/maand'
  
  return (
    <section id="prijzen" className="py-24 bg-[#e3e3e3] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {t('pricing.title')}
          </h2>
          <p className="text-xl text-gray-600">
            {t('pricing.subtitle')}
          </p>
        </div>

        {/* Toggle Maandelijks / Jaarlijks */}
        <div className="flex flex-col items-center mb-12">
          <div className="bg-white border border-gray-200 p-1 rounded-full inline-flex items-center shadow-sm">
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                !isYearly ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Maandelijks
            </button>
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              className={`px-6 py-3 rounded-full font-semibold transition-all relative pr-8 ${
                isYearly ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Jaarlijks
              <span className="absolute -top-1.5 -right-1 bg-gray-700 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
                -10%
              </span>
            </button>
          </div>
          {isYearly && (
            <p className="text-gray-600 text-sm mt-3">{t('pricing.yearlySave')}</p>
          )}
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Starter */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-accent">{t('pricing.starter.name')}</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-lg text-gray-400 line-through">
                  €{isYearly ? Math.round(99 * 12 * 0.9) : 99}/maand
                </span>
                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">-40%</span>
              </div>
              <div className="flex items-baseline mb-6">
                <span className="text-4xl sm:text-5xl font-bold text-gray-900 tabular-nums">€{starterPrice}</span>
                <span className="text-accent font-medium ml-2">{periodLabel}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-accent mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600 text-sm sm:text-base leading-snug">{t(`pricing.starter.features.${i}`)}</span>
                  </li>
                ))}
              </ul>

              <a
                href={`/registreer?lang=${locale}&plan=starter&billing=${isYearly ? 'yearly' : 'monthly'}`}
                className="block w-full border-2 border-gray-900 text-gray-900 text-center py-3.5 rounded-full font-semibold hover:bg-gray-900 hover:text-white transition-colors"
              >
                {t('pricing.chooseStarter')}
              </a>
              <p className="text-center text-accent text-sm mt-3 font-medium">{t('pricing.cancelAnytime')}</p>
            </div>
          </div>

          {/* Pro */}
          <div className="bg-white rounded-2xl border-2 border-gray-900 shadow-md overflow-hidden relative hover:shadow-lg transition-shadow">
            <div className="absolute top-4 right-4 bg-accent text-white text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
              {t('pricing.popular')}
            </div>
            <div className="p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-5 pr-16">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-accent">{t('pricing.pro.name')}</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-lg text-gray-400 line-through">
                  €{isYearly ? Math.round(129 * 12 * 0.9) : 129}/maand
                </span>
                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">-23%</span>
              </div>
              <div className="flex items-baseline mb-6">
                <span className="text-4xl sm:text-5xl font-bold text-gray-900 tabular-nums">€{proPrice}</span>
                <span className="text-accent font-medium ml-2">{periodLabel}</span>
              </div>

              <p className="text-gray-700 mb-4 text-sm sm:text-base font-medium">{t('pricing.pro.allOfStarter')}</p>

              <ul className="space-y-3 mb-8">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-accent mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600 text-sm sm:text-base leading-snug">{t(`pricing.pro.features.${i}`)}</span>
                  </li>
                ))}
              </ul>

              <a
                href={`/registreer?lang=${locale}&plan=pro&billing=${isYearly ? 'yearly' : 'monthly'}`}
                className="block w-full bg-accent text-white text-center py-3.5 rounded-full font-semibold hover:bg-accent/90 transition-colors"
              >
                {t('pricing.choosePro')}
              </a>
              <p className="text-center text-accent text-sm mt-3 font-medium">{t('pricing.cancelAnytime')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Live Demo Section
function LiveDemoSection() {
  const { t } = useLanguage()
  
  return (
    <section className="py-16 sm:py-20 bg-[#e3e3e3]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
          {t('liveDemo.title')}
        </h2>
        <p className="text-lg sm:text-xl text-gray-600 mb-8">
          {t('liveDemo.subtitle')}
        </p>
        <a
          href="https://frituurnolim.ordervysion.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-gradient-to-r from-accent to-orange-600 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-full font-bold text-lg sm:text-xl hover:from-accent/90 hover:to-orange-600/90 transition-all shadow-[0_0_30px_rgba(234,88,12,0.4)] hover:shadow-[0_0_50px_rgba(234,88,12,0.6)] hover:scale-105"
        >
          <span>{t('liveDemo.cta')}</span>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
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
      className="relative bg-[#e3e3e3] min-h-screen flex items-center justify-center overflow-hidden"
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
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-4">
            {t('stop.headline')}
          </h2>
          <p className="text-xl sm:text-2xl text-gray-600">
            {t('stop.subheadline')}
          </p>
        </div>
        
        {/* Cards Grid */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {cardKeys.map((key, index) => (
            <div 
              key={key}
              className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-accent/50 transition-all duration-500 hover:scale-105"
              style={{
                opacity: phase >= 3 ? 1 : 0,
                transform: `translateY(${phase >= 3 ? 0 : 20}px)`,
                transitionDelay: `${index * 100}ms`,
              }}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 text-left">
                  <p className="text-gray-500 text-sm mb-1">{t(`stop.cards.${key}.you`)}</p>
                  <p className="text-gray-900 font-bold text-lg flex items-center gap-2">
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
          <p className="text-gray-500 text-base sm:text-lg">
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
              <div key={key} className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-900 font-medium text-sm sm:text-base">{t(`stop.freeItems.${key}`)}</span>
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
  
  const featureKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

  return (
    <section className="py-20 bg-[#e3e3e3] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-accent text-lg font-semibold tracking-wider uppercase mb-4">
            {t('butWait.label')}
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            {t('butWait.title')}<br />
            <span className="text-accent">{t('butWait.titleAccent')}</span>
          </h2>
          <p className="text-xl sm:text-2xl text-gray-600 mt-6">
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

// Industry Section
function IndustrySection() {
  const [activeTab, setActiveTab] = useState('ordering')
  const [showLightbox, setShowLightbox] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const { t, locale } = useLanguage()
  
  const industries: Record<string, { images: string[] }> = {
    ordering: {
      images: [
        '/images/online-order-platform-1.png',
        '/images/online-order-platform-2.png',
        '/images/online-order-platform-3.png',
        '/images/online-order-platform-4.png',
        '/images/online-order-platform-5.png',
      ],
    },
    reservations: {
      images: [
        '/images/reservation-platform-1.png',
        '/images/reservation-platform-2.png',
        '/images/reservation-platform-3.png',
        '/images/reservation-platform-4.png',
        '/images/reservation-platform-5.png',
        '/images/reservation-platform-6.png',
      ],
    },
    kassa: {
      images: [
        '/images/kassa-platform-1.png',
        '/images/kassa-platform-2.png',
        '/images/kassa-platform-3.png',
        '/images/kassa-platform-4.png',
        '/images/kassa-platform-5.png',
        '/images/kassa-platform-6.png',
      ],
    },
    analytics: {
      images: [
        '/images/business-analytics-1.png',
        '/images/business-analytics-2.png',
        '/images/business-analytics-3.png',
        '/images/business-analytics-4.png',
        '/images/business-analytics-5.png',
      ],
    },
    accounting: { images: ['/images/cost-calculator-1.png'] },
    payroll: {
      images: [
        '/images/loonadministratie-1.png',
        '/images/loonadministratie-2.png',
        '/images/loonadministratie-3.png',
      ],
    },
    whatsapp: { images: [
      '/images/whatsapp-1.png',
      '/images/whatsapp-2.png',
      '/images/whatsapp-3.png',
      '/images/whatsapp-4.png',
      '/images/whatsapp-5.png',
      '/images/whatsapp-6.png',
    ] },
  }

  const current = industries[activeTab]
  const hasMultipleImages = current.images.length > 1

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setShowLightbox(true)
  }

  const goToPrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLightboxIndex(lightboxIndex === 0 ? current.images.length - 1 : lightboxIndex - 1)
  }

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLightboxIndex(lightboxIndex === current.images.length - 1 ? 0 : lightboxIndex + 1)
  }

  const goInlinePrev = () => {
    const idx = lightboxIndex === 0 ? current.images.length - 1 : lightboxIndex - 1
    setLightboxIndex(idx)
    setShowLightbox(true)
  }

  const goInlineNext = () => {
    const idx = lightboxIndex === current.images.length - 1 ? 0 : lightboxIndex + 1
    setLightboxIndex(idx)
    setShowLightbox(true)
  }

  useEffect(() => {
    setShowLightbox(false)
    setLightboxIndex(0)
  }, [activeTab])

  return (
    <section id="sectoren" className="py-24 bg-[#e3e3e3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
          {t('industry.sectionTitle')}
        </h2>
        
        {/* Tabs */}
        <div className="flex flex-wrap gap-3 sm:gap-6 lg:gap-8 mb-12 justify-center lg:justify-start">
          {['ordering', 'reservations', 'kassa', 'analytics', 'accounting', 'payroll', 'whatsapp'].map((tab) => (
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

          {/* Right content - Images */}
          <div className="relative text-center flex flex-col items-center justify-center w-full">
            {hasMultipleImages ? (
              <div className="relative w-full max-w-[520px]">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
                  {current.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`${t(`industry.${activeTab}.tab`)} ${idx + 1}`}
                      className="w-full h-28 sm:h-36 object-cover object-top rounded-xl shadow-lg cursor-pointer hover:scale-[1.02] transition-transform border-2 border-gray-100"
                      loading="lazy"
                      onClick={() => openLightbox(idx)}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <button
                    type="button"
                    onClick={goInlinePrev}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-800 text-sm font-semibold shadow hover:bg-gray-50 transition-colors"
                    aria-label={t('industry.prevImage')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('industry.prevImage')}
                  </button>
                  <button
                    type="button"
                    onClick={goInlineNext}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-800 text-sm font-semibold shadow hover:bg-gray-50 transition-colors"
                    aria-label={t('industry.nextImage')}
                  >
                    {t('industry.nextImage')}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              /* Single image for other tabs */
              <img
                src={current.images[0]}
                alt={activeTab}
                className="w-full max-w-[600px] lg:max-w-none lg:scale-110 h-auto object-contain rounded-2xl shadow-xl cursor-pointer"
                loading="lazy"
                onClick={() => openLightbox(0)}
              />
            )}
            <p className="text-gray-500 text-sm mt-6">{t('industry.clickToEnlarge')}</p>
          </div>
        </div>

        {/* Lightbox Modal with Navigation */}
        {showLightbox && (
          <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setShowLightbox(false)}
          >
            {/* Left Arrow */}
            {hasMultipleImages && (
              <button
                onClick={goToPrev}
                className="absolute left-4 sm:left-8 text-white hover:text-gray-300 p-2 z-10"
                aria-label="Vorige"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-14 sm:w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            <img
              src={current.images[lightboxIndex]}
              alt={activeTab}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Right Arrow */}
            {hasMultipleImages && (
              <button
                onClick={goToNext}
                className="absolute right-4 sm:right-8 text-white hover:text-gray-300 p-2 z-10"
                aria-label="Volgende"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-14 sm:w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Close button */}
            <button 
              className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
              onClick={() => setShowLightbox(false)}
              aria-label="Sluiten"
            >
              ×
            </button>

            {/* Image counter */}
            {hasMultipleImages && (
              <div className="absolute bottom-4 text-white text-sm">
                {lightboxIndex + 1} / {current.images.length}
              </div>
            )}
          </div>
        )}
      </div>
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
  const [stickyNav, setStickyNav] = useState(false)

  return (
    <main>
      {stickyNav && <Navigation />}
      <HomeLandingHero onStickyNavChange={setStickyNav} />
      <WhyVysionSection />
      <PlatformGridSection />
      <NewAtVysionSection />
      <OneDayOnlineSection />
      <StatsSection />
      <LiveDemoSection />
      <PricingSection />
      <ButWaitSection />
      <TestimonialSection />
      <CTASection />
      <ContactSection />
      <Footer />
      <CookieBanner />
    </main>
  )
}
