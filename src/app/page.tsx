'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Navigation, Footer, CookieBanner } from '@/components'
import { useLanguage } from '@/i18n'

// Hero Section
function HeroSection() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { t } = useLanguage()
  
  const allImages = [
    'https://i.imgur.com/IvW3RiX.png',
    'https://i.imgur.com/6X8DuuU.png',
    'https://i.imgur.com/lhfJfog.png',
    'https://i.imgur.com/2yDjxdG.png',
    'https://i.imgur.com/JzNBNID.png',
    'https://i.imgur.com/LY3pado.png',
    'https://i.imgur.com/WICLOFZ.png',
    'https://i.imgur.com/OAV1L3S.png',
    'https://i.imgur.com/vA8geT0.png',
    'https://i.imgur.com/O9GBS6s.png',
    'https://i.imgur.com/DOtQn1g.png',
    'https://i.imgur.com/jnrBtec.png',
    'https://i.imgur.com/IJ2vDaw.png',
    'https://i.imgur.com/2IzZkB3.png',
    'https://i.imgur.com/Pm7YSKt.png',
    'https://i.imgur.com/9CAo3Yr.png',
    'https://i.imgur.com/cIfiPmB.png',
    'https://i.imgur.com/HtApXus.png',
    'https://i.imgur.com/meXaat6.png',
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
            <div className="flex justify-center lg:justify-start">
              <a href="#demo" className="btn-primary text-center">
                {t('hero.ctaPrimary')}
              </a>
            </div>
            <p className="text-gray-500 mt-4 text-sm text-center lg:text-left">
              {t('hero.trialInfo')}
            </p>
          </div>

          {/* Right content - iPad and vertical image slider */}
          <div className="opacity-0 animate-fadeInUp delay-200 lg:translate-x-6">
            <div className="flex items-end gap-4 justify-center lg:justify-start lg:-ml-16">
              {/* iPad Stand with screenshot */}
              <div className="flex flex-col items-center">
                <div className="relative w-full max-w-[260px] sm:max-w-xs md:max-w-sm lg:max-w-md">
                  <img 
                    src="https://i.imgur.com/mHqvsrr.png" 
                    alt="iPad Kassa Stand" 
                    className="w-full"
                    loading="eager"
                  />
                  {/* App Screenshot on screen */}
                  <img 
                    src="https://i.imgur.com/IvW3RiX.png" 
                    alt="Vysion Horeca Kassa" 
                    className="absolute top-[4%] left-[9%] w-[82%] h-[53%] object-fill rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    loading="eager"
                    onClick={() => setLightboxIndex(0)}
                  />
                </div>
                <p className="text-gray-500 text-sm mt-2">{t('hero.clickToOpen')}</p>
              </div>
              {/* Vertical Image Slider with arrows */}
              <div className="hidden lg:flex flex-col items-center">
                {/* Arrow Up */}
                <button 
                  className="text-accent hover:text-accent/70 transition-colors mb-2"
                  onClick={() => {
                    const slider = document.getElementById('image-slider');
                    if (slider) slider.scrollBy({ top: -100, behavior: 'smooth' });
                  }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                
                {/* Slider */}
                <div id="image-slider" className="flex flex-col gap-2 h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                  {sliderImages.map((src, index) => (
                    <img
                      key={index}
                      src={src}
                      alt={`Screenshot ${index + 1}`}
                      className="w-[80px] h-[50px] object-cover rounded cursor-pointer hover:scale-110 transition-transform border border-gray-200 hover:border-accent"
                      loading="lazy"
                      onClick={() => setLightboxIndex(index + 1)}
                    />
                  ))}
                </div>
                
                {/* Arrow Down */}
                <button 
                  className="text-accent hover:text-accent/70 transition-colors mt-2"
                  onClick={() => {
                    const slider = document.getElementById('image-slider');
                    if (slider) slider.scrollBy({ top: 100, behavior: 'smooth' });
                  }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <p className="text-gray-500 text-sm mt-2">{t('hero.clickToOpen')}</p>
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
              >
                <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Close button */}
              <button 
                className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
                onClick={() => setLightboxIndex(null)}
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
    { key: 'pos', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /> },
    { key: 'online', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /> },
    { key: 'reports', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
    { key: 'payments', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /> },
    { key: 'invoicing', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    { key: 'staff', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
    { key: 'kitchen', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { key: 'loyalty', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /> },
    { key: 'gks', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /> },
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

// Order App Section - Product Showcase
function OrderAppSection() {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const { t } = useLanguage()

  return (
    <section className="py-24 bg-dark overflow-hidden">
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

        {/* Product Showcase Grid */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-12 xl:gap-16">
          {/* Left Column - Phones stacked */}
          <div className="flex flex-row lg:flex-col gap-4 sm:gap-6 order-2 lg:order-1">
            <img
              src="https://i.imgur.com/inUZtVe.png"
              alt="Vysion Bestelapp"
              className="w-[100px] sm:w-[140px] md:w-[180px] lg:w-[200px] xl:w-[220px] drop-shadow-xl rounded-2xl sm:rounded-3xl cursor-pointer hover:scale-105 transition-transform"
              loading="lazy"
              onClick={() => setLightboxImage('https://i.imgur.com/inUZtVe.png')}
            />
            <img
              src="https://i.imgur.com/LVge0n4.png"
              alt="Vysion Bestelapp Menu"
              className="w-[100px] sm:w-[140px] md:w-[180px] lg:w-[200px] xl:w-[220px] drop-shadow-xl rounded-2xl sm:rounded-3xl cursor-pointer hover:scale-105 transition-transform"
              loading="lazy"
              onClick={() => setLightboxImage('https://i.imgur.com/LVge0n4.png')}
            />
          </div>

          {/* Center - Main POS */}
          <div className="flex-shrink-0 order-1 lg:order-2 text-center">
            <img
              src="https://i.imgur.com/HrgjfGN.png"
              alt="Vysion Horeca Kassa"
              className="w-[260px] sm:w-[320px] md:w-[400px] lg:w-[450px] xl:w-[500px] drop-shadow-2xl rounded-xl sm:rounded-2xl cursor-pointer hover:scale-105 transition-transform"
              loading="lazy"
              onClick={() => setLightboxImage('https://i.imgur.com/HrgjfGN.png')}
            />
            <p className="text-gray-400 text-sm mt-4">{t('hero.clickToOpen')}</p>
          </div>

          {/* Right Column - Devices stacked */}
          <div className="flex flex-row lg:flex-col gap-4 sm:gap-6 order-3">
            <img
              src="https://i.imgur.com/1SlM8G4.png"
              alt="Vysion Betaalterminal"
              className="w-[100px] sm:w-[140px] md:w-[180px] lg:w-[200px] xl:w-[220px] drop-shadow-xl rounded-2xl sm:rounded-3xl cursor-pointer hover:scale-105 transition-transform"
              loading="lazy"
              onClick={() => setLightboxImage('https://i.imgur.com/1SlM8G4.png')}
            />
            <img
              src="https://i.imgur.com/b450kVT.png"
              alt="Vysion Keukenbeeldscherm"
              className="w-[100px] sm:w-[140px] md:w-[180px] lg:w-[200px] xl:w-[220px] drop-shadow-xl rounded-2xl sm:rounded-3xl cursor-pointer hover:scale-105 transition-transform"
              loading="lazy"
              onClick={() => setLightboxImage('https://i.imgur.com/b450kVT.png')}
            />
          </div>
        </div>

        {/* Lightbox */}
        {lightboxImage && (
          <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            <img
              src={lightboxImage}
              alt="Vergroot"
              className="max-w-full max-h-full object-contain rounded-2xl"
            />
            <button 
              className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
              onClick={() => setLightboxImage(null)}
            >
              ×
            </button>
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
  const { t } = useLanguage()
  
  return (
    <section id="prijzen" className="py-24 bg-[#E3E3E3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {t('pricing.title')}
          </h2>
          <p className="text-xl text-gray-600">
            {t('pricing.subtitle')}
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Light Plan */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="p-8 lg:p-10">
              <p className="text-gray-500 font-medium mb-2">{t('pricing.light.name')}</p>
              <div className="flex items-baseline mb-4">
                <span className="text-5xl font-bold text-gray-900">€69</span>
                <span className="text-xl text-gray-500 ml-2">{t('pricing.perMonth')}</span>
              </div>
              <p className="text-gray-500 mb-8">
                {t('pricing.perLicense')}
              </p>
              <a 
                href="#demo" 
                className="block w-full bg-gray-900 text-white text-center py-4 rounded-full font-semibold hover:bg-gray-800 transition-colors mb-8"
              >
                {t('pricing.startTrial')}
              </a>
              <p className="font-semibold text-gray-900 mb-4">{t('pricing.included')}</p>
              <ul className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <li key={i} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{t(`pricing.light.features.${i}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-accent relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-accent text-white px-6 py-2 rounded-b-xl font-semibold text-sm">
              {t('pricing.mostChosen')}
            </div>
            <div className="p-8 lg:p-10 pt-14">
              <p className="text-accent font-medium mb-2">{t('pricing.pro.name')}</p>
              <div className="flex items-baseline mb-4">
                <span className="text-5xl font-bold text-gray-900">€99</span>
                <span className="text-xl text-gray-500 ml-2">{t('pricing.perMonth')}</span>
              </div>
              <p className="text-gray-500 mb-8">
                {t('pricing.perLicense')}
              </p>
              <a 
                href="#demo" 
                className="block w-full bg-accent text-white text-center py-4 rounded-full font-semibold hover:bg-accent/90 transition-colors mb-8"
              >
                {t('pricing.startTrial')}
              </a>
              <p className="font-semibold text-gray-900 mb-4">{t('pricing.allOfLight')}</p>
              <ul className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((i) => (
                  <li key={i} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{t(`pricing.pro.features.${i}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
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
              src="https://i.imgur.com/RTl6VfK.jpeg"
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
  const { t } = useLanguage()
  
  const featureKeys = ['pos', 'terminal', 'online', 'gks', 'accounting', 'peppol', 'analytics', 'kitchen', 'loyalty', 'staff', 'reservation', 'languages', 'multiLocation']
  
  const features = featureKeys.map(key => ({
    name: t(`comparison.features.${key}`),
    vysion: true,
    lightspeed: ['pos', 'terminal', 'gks', 'kitchen', 'loyalty', 'staff', 'reservation', 'multiLocation'].includes(key) ? true : key === 'analytics' ? t('comparison.limited') : false,
    square: ['pos', 'terminal', 'kitchen', 'loyalty', 'multiLocation'].includes(key),
    strobbo: ['pos', 'terminal', 'gks', 'kitchen'].includes(key),
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
                  <div className="text-sm text-gray-300">€69 - €99/maand</div>
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
            href="#contact"
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
  const { t } = useLanguage()
  
  const industries = {
    invoicing: { image: 'https://i.imgur.com/sFqK85O.png' },
    ordering: { image: 'https://i.imgur.com/ZJUI9VI.png' },
    analytics: { image: 'https://i.imgur.com/xFIDs6L.png' },
    accounting: { image: 'https://i.imgur.com/A3yjDsL.png' },
  }

  const current = industries[activeTab as keyof typeof industries]

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-3 sm:gap-6 lg:gap-8 mb-12 justify-center lg:justify-start">
          {['invoicing', 'ordering', 'analytics', 'accounting'].map((tab) => (
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

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              {t(`industry.${activeTab}.title`)}
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              {t(`industry.${activeTab}.description`)}
            </p>
            <a
              href="#demo"
              className="inline-block bg-accent text-white px-8 py-4 rounded-full font-semibold hover:bg-accent/90 transition-all"
            >
              {t('industry.tryFree')}
            </a>
          </div>

          {/* Right content - Image */}
          <div className="relative text-center flex flex-col items-center">
            <img
              src={current.image}
              alt={activeTab}
              className="w-auto h-auto max-w-[400px] lg:max-w-[450px] object-contain rounded-2xl shadow-xl cursor-pointer"
              loading="lazy"
              onClick={() => setShowLightbox(true)}
            />
            <p className="text-gray-500 text-sm mt-4">{t('industry.clickToEnlarge')}</p>
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
            >
              ×
            </button>
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % testimonialKeys.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="py-24 bg-[#E3E3E3] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {t('testimonials.title')}
          </h2>
        </div>

        <div className="relative">
          <div 
            className="flex transition-transform duration-700 ease-in-out"
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
          
          {/* Dots indicator */}
          <div className="flex justify-center mt-8 gap-2">
            {testimonialKeys.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  currentSlide === index ? 'bg-accent' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// CTA Section
function CTASection() {
  const { t } = useLanguage()
  
  return (
    <section id="demo" className="py-24 relative" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 bg-black/70"></div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
          {t('cta.title')}
        </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          {t('cta.subtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/registreer" className="btn-primary">
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
            <form className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.form.firstName')} <span className="text-red-500">{t('contact.form.required')}</span></label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder={t('contact.form.placeholder.firstName')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.form.lastName')} <span className="text-red-500">{t('contact.form.required')}</span></label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder={t('contact.form.placeholder.lastName')}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.form.email')} <span className="text-red-500">{t('contact.form.required')}</span></label>
                <input 
                  type="email" 
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder={t('contact.form.placeholder.email')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.form.message')} <span className="text-red-500">{t('contact.form.required')}</span></label>
                <textarea 
                  rows={4}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                  placeholder={t('contact.form.placeholder.message')}
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-white py-4 rounded-lg font-semibold transition-colors"
              >
                {t('contact.form.submit')}
              </button>
            </form>
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
      <PricingSection />
      <ButWaitSection />
      <ComparisonSection />
      <IndustrySection />
      <TestimonialSection />
      <CTASection />
      <ContactSection />
      <Footer />
      <CookieBanner />
    </main>
  )
}
