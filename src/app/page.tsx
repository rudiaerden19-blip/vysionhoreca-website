'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import {
  Navigation,
  Footer,
  CookieBanner,
  ContactPageSection,
  HomeCornerStamp,
  HomeLandingHero,
  PlatformGridSection,
  HardwareSection,
} from '@/components'
import { useLanguage } from '@/i18n'
import { DEMO_HERO_LIVE_URL, DEMO_ORDER_SITE_URL } from '@/lib/demo-links'

const GRATIS_WEBSITE_EXAMPLE_HREF =
  'https://restaurantdekorf.ordervysion.com/shop/restaurantdekorf'

function GratisWebsiteBannerSection() {
  const { t } = useLanguage()
  return (
    <section
      className="relative py-12 sm:py-14 bg-white border-b border-gray-100"
      aria-labelledby="gratis-website-heading"
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2
          id="gratis-website-heading"
          className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mb-3"
        >
          {t('gratisWebsiteBanner.title')}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-6">
          {t('gratisWebsiteBanner.body')}
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
          <a
            href={GRATIS_WEBSITE_EXAMPLE_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-accent px-6 py-3 text-sm sm:text-base font-semibold text-white shadow-home-btn transition-colors hover:bg-accent/90"
          >
            {t('gratisWebsiteBanner.cta')}
          </a>
          <a
            href={DEMO_ORDER_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border-2 border-accent bg-white px-6 py-3 text-sm sm:text-base font-semibold text-accent transition-colors hover:bg-accent/10"
          >
            {t('gratisWebsiteBanner.ctaFrituur')}
          </a>
        </div>
      </div>
    </section>
  )
}

function WhyVysionSection() {
  const { t } = useLanguage()
  const pointKeys = ['fullPlatform', 'liveSupport', 'rightPrice', 'inHouseSoftware', 'posQuality'] as const

  return (
    <section className="relative pt-8 sm:pt-10 lg:pt-12 pb-24 sm:pb-32 lg:pb-40 overflow-hidden border-b border-gray-100 bg-gradient-to-b from-[#faf8f6] via-white to-white">
      <div
        className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-accent/[0.08] blur-3xl sm:h-96 sm:w-96"
        aria-hidden
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-stretch">
          <div className="flex flex-col min-h-0 order-2 lg:order-1">
            <h2 className="text-[clamp(1.05rem,3.4vw,2.5rem)] sm:text-3xl md:text-4xl lg:text-[2.5rem] font-bold text-gray-900 tracking-tight leading-none mb-10 sm:mb-12 lg:mb-14 text-center lg:text-left max-w-full lg:mx-0 mx-auto whitespace-nowrap">
              {t('whyVysion.title')}
            </h2>
            <ul className="space-y-9 sm:space-y-10 max-w-xl mx-auto lg:mx-0 lg:max-w-none">
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
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      {t(`whyVysion.${key}.body`)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex min-h-[260px] lg:min-h-0 h-full order-1 lg:order-2 lg:mt-[2cm] lg:self-start">
            <div className="relative w-full flex-1 min-h-[280px] lg:min-h-full rounded-3xl overflow-hidden shadow-home-photo ring-1 ring-black/[0.08] bg-[#141414]">
              <Image
                src="/images/why-vysion-kiosk.png"
                alt={t('whyVysion.imageAlt')}
                fill
                loading="lazy"
                className="object-cover object-center"
                sizes="(min-width: 1024px) 45vw, 95vw"
              />
            </div>
          </div>
        </div>
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
    <section className="py-24 sm:py-32 bg-[#e3e3e3]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-5">
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
              className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-home-benefit transition-all duration-300 hover:scale-[1.02] hover:bg-gray-50/80 hover:shadow-home-benefit-hover"
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
            className="inline-block bg-accent hover:bg-accent/90 text-white px-8 py-4 rounded-full font-semibold text-lg transition-colors shadow-home-btn"
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

/** Trust-marquee: witte kaarten met logo + klantcase (i18n liveDemo.successStories.*). */
const SUCCESS_STORY_CARDS = [
  { src: '/images/partner-logos/02.png', key: 'vivaldi' },
  { src: '/images/partner-logos/03.png', key: 'broodZo' },
  { src: '/images/partner-logos/04.png', key: 'broodjesbar' },
  { src: '/images/partner-logos/05.png', key: 'saintGermain' },
  { src: '/images/partner-logos/06.png', key: 'frituurAnn' },
  { src: '/images/partner-logos/07.png', key: 'butcher' },
  { src: '/images/partner-logos/08.png', key: 'seelen' },
] as const

function StatsAndLiveDemoSection() {
  const { t } = useLanguage()

  const stats = [
    { value: 250_000, prefix: '', suffix: '+', labelKey: 'stats.processed' },
    { value: 132, prefix: '', suffix: '', labelKey: 'stats.businesses' },
    { value: 99.9, prefix: '', suffix: '%', labelKey: 'stats.uptime' },
    { value: 24, prefix: '', suffix: '/7', labelKey: 'stats.support' },
  ]

  return (
    <section className="pt-24 sm:pt-32 pb-24 sm:pb-32 bg-[#E3E3E3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative -translate-y-[3cm]">
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

      {/* Succesverhalen-marquee: glijdende kaarten (zelfde animatie als vroeger) */}
      <div className="mt-12 sm:mt-16 md:mt-20">
        <p className="text-center text-3xl sm:text-4xl md:text-5xl lg:text-[2.75rem] xl:text-6xl font-bold text-accent tracking-tight leading-tight mb-5 sm:mb-6 md:mb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {t('liveDemo.clientsLead')}
        </p>
        <div className="relative w-[100vw] max-w-[100vw] left-1/2 -translate-x-1/2 bg-[#E3E3E3] py-8 sm:py-10 md:py-12">
          <div className="partner-marquee-viewport">
            <div className="partner-marquee-track">
              {[0, 1].map((dup) => (
                <div key={dup} className="partner-marquee-segment">
                  {SUCCESS_STORY_CARDS.map((card) => (
                    <div key={`${dup}-${card.key}`} className="partner-marquee-slot">
                      <div className="partner-success-card h-full">
                        <div className="partner-success-logo">
                          <Image
                            src={card.src}
                            alt=""
                            width={280}
                            height={120}
                            sizes="(max-width: 768px) 60vw, 240px"
                            loading="lazy"
                            className="object-contain"
                          />
                        </div>
                        <p className="text-center text-sm sm:text-base font-bold text-gray-900 leading-snug mb-3 min-h-[2.5rem] sm:min-h-[2.75rem] flex items-center justify-center">
                          {t(`liveDemo.successStories.${card.key}.name`)}
                        </p>
                        <div className="mt-auto flex flex-col gap-2 pt-3 border-t border-gray-100">
                          <div className="flex gap-2.5">
                            <span
                              className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
                              aria-hidden
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                            <p className="text-left leading-snug">
                              <span className="block text-lg sm:text-xl font-extrabold text-emerald-600 tabular-nums tracking-tight">
                                {t(`liveDemo.successStories.${card.key}.metricHighlight`)}
                              </span>
                              <span className="mt-0.5 block text-xs sm:text-sm font-semibold text-gray-700">
                                {t(`liveDemo.successStories.${card.key}.metricDetail`)}
                              </span>
                            </p>
                          </div>
                          <p className="border-l-2 border-accent/35 pl-2.5 text-[11px] sm:text-xs font-medium text-gray-500 leading-snug">
                            {t(`liveDemo.successStories.${card.key}.credibility`)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-10 sm:mt-12 md:mt-14 pt-[2cm]">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
          {t('liveDemo.title')}
        </h2>

        <p className="text-lg sm:text-xl text-gray-600 mb-8">
          {t('liveDemo.subtitle')}
        </p>
        <a
          href={DEMO_HERO_LIVE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-gradient-to-r from-accent to-orange-600 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-full font-bold text-lg sm:text-xl hover:from-accent/90 hover:to-orange-600/90 transition-all shadow-home-btn hover:shadow-[0_0_36px_rgba(234,88,12,0.38)] hover:scale-105"
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
    <section ref={sectionRef} className="py-28 sm:py-36 bg-[#e3e3e3] overflow-hidden">
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
              className="transition-all duration-700 ease-out cursor-pointer aspect-[9/16] relative overflow-hidden rounded-2xl bg-gray-300 shadow-home-image"
              style={{
                opacity: visibleImages.includes(index) ? 1 : 0,
                transform: visibleImages.includes(index) ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
              }}
              onClick={() => setLightboxIndex(index)}
            >
              <Image
                src={src}
                alt={`Vysion Platform ${index + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                loading="lazy"
                className="object-cover rounded-2xl hover:scale-105 transition-transform"
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
              aria-label={t('ui.ariaPrevImage')}
            >
              <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div
              className="relative w-full max-w-5xl h-[min(88vh,1280px)] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={images[lightboxIndex]}
                alt={t('ui.lightboxImageAlt')}
                fill
                sizes="100vw"
                priority
                className="object-contain rounded-2xl shadow-home-image"
              />
            </div>

            {/* Right Arrow */}
            <button 
              className="absolute right-4 sm:right-8 text-white text-5xl hover:text-accent transition-colors p-4"
              onClick={goToNext}
              aria-label={t('ui.ariaNextImage')}
            >
              <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Close button */}
            <button 
              className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
              onClick={() => setLightboxIndex(null)}
              aria-label={t('ui.ariaClose')}
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
            href="/#contact"
            className="inline-block bg-accent text-white px-8 py-4 rounded-full font-semibold hover:bg-accent/90 transition-all shadow-home-btn"
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
  const periodLabel = isYearly ? t('pricing.perYear') : t('pricing.perMonth')

  return (
    <section id="prijzen" className="py-28 sm:py-36 lg:py-40 bg-[#e3e3e3] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-14 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5">
            {t('pricing.title')}
          </h2>
          <p className="text-xl text-gray-600">
            {t('pricing.subtitle')}
          </p>
        </div>

        {/* Toggle Maandelijks / Jaarlijks */}
        <div className="flex flex-col items-center mb-14">
          <div className="bg-white border border-gray-200 p-1 rounded-full inline-flex items-center shadow-home-float">
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                !isYearly ? 'bg-gray-900 text-white shadow-home-float' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('pricing.billingMonthly')}
            </button>
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              className={`px-6 py-3 rounded-full font-semibold transition-all relative pr-8 ${
                isYearly ? 'bg-gray-900 text-white shadow-home-float' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('pricing.billingYearly')}
              <span className="absolute -top-1.5 -right-1 bg-gray-700 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
                {t('pricing.badgeYearlyDiscount')}
              </span>
            </button>
          </div>
          {isYearly && (
            <p className="text-gray-600 text-sm mt-3">{t('pricing.yearlySave')}</p>
          )}
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Starter */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-home-card overflow-hidden transition-shadow hover:shadow-home-image">
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
                  €{isYearly ? Math.round(99 * 12 * 0.9) : 99}
                  {t('pricing.perMonth')}
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
                className="block w-full border-2 border-gray-900 text-gray-900 text-center py-3.5 rounded-full font-semibold hover:bg-gray-900 hover:text-white transition-colors shadow-home-float"
              >
                {t('pricing.chooseStarter')}
              </a>
              <p className="text-center text-accent text-sm mt-3 font-medium">{t('pricing.cancelAnytime')}</p>
            </div>
          </div>

          {/* Pro (Premium): outer = observe target + stamp; inner = clip voor afgeronde hoeken */}
          <div id="pricing-premium-card" className="relative">
            <div className="bg-white rounded-2xl border-2 border-gray-900 shadow-home-card overflow-hidden transition-shadow hover:shadow-home-image relative">
              <div className="absolute top-4 right-4 bg-accent text-white text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wide z-20">
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
                    €{isYearly ? Math.round(129 * 12 * 0.9) : 129}
                    {t('pricing.perMonth')}
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
                  className="block w-full bg-accent text-white text-center py-3.5 rounded-full font-semibold hover:bg-accent/90 transition-colors shadow-home-btn"
                >
                  {t('pricing.choosePro')}
                </a>
                <p className="text-center text-accent text-sm mt-3 font-medium">{t('pricing.cancelAnytime')}</p>
              </div>
            </div>
            {/* Onsichtbaar anker bij CTA/stempel — animatie start pas als dit blok echt in beeld is */}
            <div
              id="pricing-premium-stamp-anchor"
              className="pointer-events-none absolute bottom-[6.5rem] left-3 right-3 h-16 opacity-0"
              aria-hidden
            />
            <HomeCornerStamp />
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
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-home-card hover:border-accent/50 transition-all duration-500 hover:scale-105 hover:shadow-home-image"
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
          className="bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20 rounded-3xl p-6 sm:p-10 border-2 border-accent/30 text-center transition-all duration-500 shadow-home-card"
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
              <div key={key} className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full shadow-home-float">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-900 font-medium text-sm sm:text-base">{t(`stop.freeItems.${key}`)}</span>
              </div>
            ))}
          </div>
          <a
            href={`/registreer?lang=${locale}`}
            className="inline-block bg-accent text-white px-8 sm:px-10 py-4 rounded-full font-bold text-lg hover:bg-accent/90 transition-all shadow-home-btn hover:shadow-[0_0_36px_rgba(234,88,12,0.42)] hover:scale-105"
          >
            {t('stop.cta')}
          </a>
        </div>
      </div>
    </section>
  )
}

function TableKioskSection() {
  const { t } = useLanguage()
  const featureKeys = [1, 2, 3, 4, 5] as const

  return (
    <section className="py-24 sm:py-32 bg-[#e3e3e3] overflow-hidden" aria-labelledby="table-kiosk-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="w-full rounded-3xl bg-[#e3e3e3] p-4 sm:p-6 shadow-home-image ring-1 ring-black/[0.06]">
            <Image
              src="/images/table-kiosk-device.png"
              alt={t('tableKiosk.imageAlt')}
              width={613}
              height={804}
              loading="lazy"
              className="w-full h-auto max-h-[min(85vw,480px)] sm:max-h-[440px] lg:max-h-[500px] object-contain mx-auto"
              sizes="(min-width: 1024px) 40vw, 90vw"
            />
          </div>

          <div className="flex flex-col justify-center py-2 lg:py-4">
            <h2 id="table-kiosk-heading" className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              {t('tableKiosk.title')}
            </h2>
            <p className="text-accent text-xl sm:text-2xl font-bold mb-6">{t('tableKiosk.subtitle')}</p>
            <p className="text-gray-700 text-base sm:text-lg leading-relaxed mb-10">{t('tableKiosk.body')}</p>
            <ul className="space-y-4">
              {featureKeys.map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <svg
                    className="w-6 h-6 text-accent flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-800 text-base sm:text-lg leading-snug">{t(`tableKiosk.features.${key}`)}</span>
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
    <section id="sectoren" className="py-28 sm:py-36 bg-[#e3e3e3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-14 sm:mb-16">
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
              className="inline-block bg-accent text-white px-8 py-4 rounded-full font-semibold hover:bg-accent/90 transition-all shadow-home-btn"
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
                    <div
                      key={idx}
                      className="relative w-full h-28 sm:h-36 rounded-xl shadow-home-thumb overflow-hidden cursor-pointer border-2 border-gray-100 hover:scale-[1.02] transition-transform"
                    >
                      <Image
                        src={img}
                        alt={`${t(`industry.${activeTab}.tab`)} ${idx + 1}`}
                        fill
                        sizes="(max-width: 1024px) 33vw, 200px"
                        loading="lazy"
                        className="object-cover object-top"
                        onClick={() => openLightbox(idx)}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <button
                    type="button"
                    onClick={goInlinePrev}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-800 text-sm font-semibold shadow-home-float hover:bg-gray-50 transition-colors"
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
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-800 text-sm font-semibold shadow-home-float hover:bg-gray-50 transition-colors"
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
              <Image
                src={current.images[0]}
                alt={activeTab}
                width={900}
                height={1200}
                sizes="(min-width: 1024px) 660px, 90vw"
                loading="lazy"
                className="w-full max-w-[600px] lg:max-w-none lg:scale-110 h-auto object-contain rounded-2xl shadow-home-image cursor-pointer mx-auto"
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
                aria-label={t('ui.ariaPrev')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-14 sm:w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            <div
              className="relative w-full max-w-6xl h-[min(90vh,1200px)] max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={current.images[lightboxIndex]}
                alt={activeTab}
                fill
                sizes="100vw"
                priority
                className="object-contain shadow-home-image"
              />
            </div>

            {/* Right Arrow */}
            {hasMultipleImages && (
              <button
                onClick={goToNext}
                className="absolute right-4 sm:right-8 text-white hover:text-gray-300 p-2 z-10"
                aria-label={t('ui.ariaNext')}
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
              aria-label={t('ui.ariaClose')}
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
    <section className="py-28 sm:py-36 bg-[#E3E3E3] overflow-hidden">
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
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 rounded-full p-3 shadow-home-float transition-all hover:scale-110"
            aria-label={t('ui.ariaPrevReview')}
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Right Arrow */}
          <button 
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 rounded-full p-3 shadow-home-float transition-all hover:scale-110"
            aria-label={t('ui.ariaNextReview')}
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
                <div className="bg-white rounded-2xl p-8 shadow-home-card max-w-2xl mx-auto">
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

// Main Page Component
export default function HomePage() {
  const [stickyNav, setStickyNav] = useState(false)

  return (
    <main>
      {stickyNav && <Navigation />}
      <HomeLandingHero onStickyNavChange={setStickyNav} />
      <WhyVysionSection />
      <GratisWebsiteBannerSection />
      <PlatformGridSection />
      <HardwareSection />
      <OneDayOnlineSection />
      <StatsAndLiveDemoSection />
      <PricingSection />
      <TableKioskSection />
      <TestimonialSection />
      <ContactPageSection sectionId="contact" />
      <Footer />
      <CookieBanner />
    </main>
  )
}
