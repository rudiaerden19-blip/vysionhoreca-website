'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

// Navigation Component
function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <span className="text-2xl font-bold">
              <span className="text-accent">Vysion</span>
              <span className="text-gray-400 font-normal ml-1">horeca</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#functies" className="text-gray-300 hover:text-white transition-colors">Functies</a>
            <a href="#prijzen" className="text-gray-300 hover:text-white transition-colors">Prijzen</a>
            <a href="#over-ons" className="text-gray-300 hover:text-white transition-colors">Over ons</a>
            <a href="#contact" className="text-gray-300 hover:text-white transition-colors">Contact</a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <a href="/login" className="text-white hover:text-accent transition-colors">Inloggen</a>
            <a href="#demo" className="bg-accent hover:bg-accent/90 text-white px-6 py-2.5 rounded-full font-medium transition-all">
              Gratis proberen
            </a>
          </div>

          {/* Mobile menu button */}
          <button 
            className="md:hidden text-white p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
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
              <a href="#functies" className="text-gray-300 hover:text-white transition-colors">Functies</a>
              <a href="#prijzen" className="text-gray-300 hover:text-white transition-colors">Prijzen</a>
              <a href="#over-ons" className="text-gray-300 hover:text-white transition-colors">Over ons</a>
              <a href="#contact" className="text-gray-300 hover:text-white transition-colors">Contact</a>
              <a href="#demo" className="bg-accent text-white px-6 py-3 rounded-full font-medium text-center">
                Gratis proberen
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

// Hero Section
function HeroSection() {
  const [lightboxImage, setLightboxImage] = useState('');
  
  return (
    <section className="bg-[#fdfdfd] min-h-screen flex items-center pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Badges centered under navbar */}
        <div className="flex justify-center gap-8 sm:gap-16 mb-12">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span className="text-accent font-bold text-sm uppercase">1 Platform</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span className="text-accent font-bold text-sm uppercase">Alles geregeld</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span className="text-accent font-bold text-sm uppercase">Voor horecaondernemers</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-center">
          {/* Left content */}
          <div className="opacity-0 animate-fadeInUp text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-6">
              Één scherm. Volledige controle.
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0">
              Ontstaan uit de praktijk, gemaakt door en voor horecaondernemers. Perfect voor frituren, cafés, restaurants, slagers en bakkers. Een alles-in-één platform met een GKS-gecertificeerde kassa, een eigen bestelplatform en professionele SCARDA-boekhoudsoftware met Peppol-facturatie, volledige bedrijfsanalyse en zoveel meer, conform de wetgeving in België én meer dan 20 andere landen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a href="#demo" className="btn-primary text-center">
                Start gratis proefperiode
              </a>
              <a href="#functies" className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all text-center">
                Bekijk demo
              </a>
            </div>
            <p className="text-gray-500 mt-4 text-sm" style={{ paddingLeft: '85px' }}>
              Gratis testen 7 dagen • Direct aan de slag
            </p>
          </div>

          {/* Right content - iPad and vertical image slider */}
          <div className="opacity-0 animate-fadeInUp delay-200">
            <div className="flex items-end gap-4 justify-center lg:justify-start lg:-ml-16">
              {/* iPad Stand with screenshot */}
              <div className="flex flex-col items-center">
                <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
                  <img 
                    src="https://i.imgur.com/mHqvsrr.png" 
                    alt="iPad Kassa Stand" 
                    className="w-full"
                  />
                  {/* App Screenshot on screen */}
                  <img 
                    src="https://i.imgur.com/IvW3RiX.png" 
                    alt="Vysion Horeca Kassa" 
                    className="absolute top-[4%] left-[9%] w-[82%] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ height: '53%', objectFit: 'fill' }}
                    onClick={() => setLightboxImage('https://i.imgur.com/IvW3RiX.png')}
                  />
                </div>
                <p className="text-gray-500 text-sm mt-2">Klik om te openen</p>
              </div>
              {/* Vertical Image Slider */}
              <div className="hidden lg:flex flex-col gap-2 h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                {[
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
                ].map((src, index) => (
                  <img
                    key={index}
                    src={src}
                    alt={`Screenshot ${index + 1}`}
                    className="w-[80px] h-[50px] object-cover rounded cursor-pointer hover:scale-110 transition-transform border border-gray-200 hover:border-accent"
                    onClick={() => setLightboxImage(src)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Lightbox */}
          {lightboxImage && (
            <div 
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
              onClick={() => setLightboxImage('')}
            >
              <img 
                src={lightboxImage} 
                alt="Vergrote afbeelding" 
                className="max-w-full max-h-full object-contain"
              />
              <button 
                className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
                onClick={() => setLightboxImage('')}
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// Features Section
function FeaturesSection() {
  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Krachtige kassa',
      description: 'Intuïtieve POS interface voor snelle bediening. Werkt op tablet, computer of touchscreen.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      title: 'Online bestellen',
      description: 'Online bestelplatform met landing pagina voor afhaal en levering. Klanten bestellen, jij ontvangt direct in de kassa.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Real-time rapporten',
      description: 'Realtime X en Z rapporten. Directe inzichten in omzet, populaire producten en drukke uren. Data-gedreven beslissingen.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: 'Betalingen',
      description: 'Geïntegreerde betaalterminal. Bancontact, Visa, Mastercard, Mollie, Stripe - alles in één systeem.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: 'Facturatie & Peppol',
      description: 'Professionele Peppol facturen met één klik. Automatisch gekoppeld aan je boekhouding. B2B verzending.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: 'Personeelsbeheer',
      description: 'Urenregistratie, rollen en permissies. Je weet precies wie wat heeft gedaan. Klaar voor afgifte loonkantoor.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Keukenbeeldscherm',
      description: 'Real-time bestellingen in de keuken. Efficiënt en overzichtelijk werken.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      title: 'Klantenkaart & Loyaliteit',
      description: 'Bouw klantrelaties op met spaarpunten en persoonlijke aanbiedingen.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'GKS Gecertificeerd',
      description: '100% conform de Belgische fiscale wetgeving. Geen zorgen, altijd in orde.',
    },
  ]

  return (
    <section id="functies" className="py-24 bg-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Alles wat je nodig hebt
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Eén platform voor al je horecabehoeften. Geen losse systemen, geen gedoe.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-8 shadow-[0_4px_15px_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.3)] transition-shadow duration-300"
            >
              <div className="w-14 h-14 bg-accent rounded-xl flex items-center justify-center text-white mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
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
  const stats = [
    { value: 2.5, prefix: '€', suffix: 'M+', label: 'Verwerkt per maand' },
    { value: 500, prefix: '', suffix: '+', label: 'Actieve horecazaken' },
    { value: 99.9, prefix: '', suffix: '%', label: 'Uptime garantie' },
    { value: 24, prefix: '', suffix: '/7', label: 'Support beschikbaar' },
  ]

  return (
    <section className="py-20" style={{ backgroundColor: '#E3E3E3' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">
                <CountUp end={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              </div>
              <div className="text-gray-600">
                {stat.label}
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

  const images = [
    { src: 'https://i.imgur.com/inUZtVe.png', alt: 'Vysion Bestelapp', position: 'left-top' },
    { src: 'https://i.imgur.com/1SlM8G4.png', alt: 'Vysion Bestelapp Menu', position: 'left-bottom' },
    { src: 'https://i.imgur.com/HrgjfGN.png', alt: 'Vysion Horeca Kassa', position: 'center' },
    { src: 'https://i.imgur.com/LVge0n4.png', alt: 'Vysion Betaalterminal', position: 'right-top' },
    { src: 'https://i.imgur.com/b450kVT.png', alt: 'Vysion Keukenbeeldscherm', position: 'right-bottom' },
  ]

  return (
    <section className="py-24 bg-dark overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Alles wat je nodig hebt
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Een compleet ecosysteem voor jouw horecazaak. Kassa, bestelapp, betaalterminal en meer.
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
              onClick={() => setLightboxImage('https://i.imgur.com/inUZtVe.png')}
            />
            <img
              src="https://i.imgur.com/LVge0n4.png"
              alt="Vysion Bestelapp Menu"
              className="w-[100px] sm:w-[140px] md:w-[180px] lg:w-[200px] xl:w-[220px] drop-shadow-xl rounded-2xl sm:rounded-3xl cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setLightboxImage('https://i.imgur.com/LVge0n4.png')}
            />
          </div>

          {/* Center - Main POS */}
          <div className="flex-shrink-0 order-1 lg:order-2">
            <img
              src="https://i.imgur.com/HrgjfGN.png"
              alt="Vysion Horeca Kassa"
              className="w-[260px] sm:w-[320px] md:w-[400px] lg:w-[450px] xl:w-[500px] drop-shadow-2xl rounded-xl sm:rounded-2xl cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setLightboxImage('https://i.imgur.com/HrgjfGN.png')}
            />
          </div>

          {/* Right Column - Devices stacked */}
          <div className="flex flex-row lg:flex-col gap-4 sm:gap-6 order-3">
            <img
              src="https://i.imgur.com/1SlM8G4.png"
              alt="Vysion Betaalterminal"
              className="w-[100px] sm:w-[140px] md:w-[180px] lg:w-[200px] xl:w-[220px] drop-shadow-xl rounded-2xl sm:rounded-3xl cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setLightboxImage('https://i.imgur.com/1SlM8G4.png')}
            />
            <img
              src="https://i.imgur.com/b450kVT.png"
              alt="Vysion Keukenbeeldscherm"
              className="w-[100px] sm:w-[140px] md:w-[180px] lg:w-[200px] xl:w-[220px] drop-shadow-xl rounded-2xl sm:rounded-3xl cursor-pointer hover:scale-105 transition-transform"
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
            Ontdek het volledige platform
          </a>
        </div>
      </div>
    </section>
  )
}

// Comparison Section
function ComparisonSection() {
  const features = [
    { name: 'Kassasoftware', vysion: true, lightspeed: true, square: true, strobbo: true },
    { name: 'Betaalterminal integratie', vysion: true, lightspeed: true, square: true, strobbo: true },
    { name: 'Online bestelplatform', vysion: true, lightspeed: false, square: false, strobbo: false },
    { name: 'GKS Gecertificeerd', vysion: true, lightspeed: true, square: false, strobbo: true },
    { name: 'Boekhoudsoftware (SCARDA)', vysion: true, lightspeed: false, square: false, strobbo: false },
    { name: 'Peppol facturatie', vysion: true, lightspeed: false, square: false, strobbo: false },
    { name: 'Bedrijfsanalyse', vysion: true, lightspeed: 'Beperkt', square: false, strobbo: false },
    { name: 'Keukenbeeldscherm', vysion: true, lightspeed: true, square: true, strobbo: true },
    { name: 'Klantenkaart & loyaliteit', vysion: true, lightspeed: true, square: true, strobbo: false },
    { name: 'Personeelsbeheer', vysion: true, lightspeed: true, square: false, strobbo: false },
    { name: 'Tafelreservatie', vysion: true, lightspeed: true, square: false, strobbo: false },
    { name: 'Beschikbaar in 9+ talen', vysion: true, lightspeed: false, square: false, strobbo: false },
    { name: 'Multi-locatie', vysion: true, lightspeed: true, square: true, strobbo: false },
  ]

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
            Vergelijk met andere platformen
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Meer functies, lagere prijs. Ontdek waarom Vysion Horeca de beste keuze is.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            <thead>
              <tr className="bg-dark text-white">
                <th className="px-6 py-5 text-left font-semibold">Functie</th>
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
            Start vandaag met Vysion Horeca
          </a>
        </div>
      </div>
    </section>
  )
}

// Pricing Section
function PricingSection() {
  return (
    <section id="prijzen" className="py-24" style={{ backgroundColor: '#E3E3E3' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Simpele, transparante prijzen
          </h2>
          <p className="text-xl text-gray-600">
            Alles inbegrepen. Geen verrassingen.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Light Plan */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="p-8 lg:p-10">
              <p className="text-gray-500 font-medium mb-2">Light</p>
              <div className="flex items-baseline mb-4">
                <span className="text-5xl font-bold text-gray-900">€69</span>
                <span className="text-xl text-gray-500 ml-2">/maand</span>
              </div>
              <p className="text-gray-500 mb-8">
                Per licentie
              </p>
              <a 
                href="#demo" 
                className="block w-full bg-gray-900 text-white text-center py-4 rounded-full font-semibold hover:bg-gray-800 transition-colors mb-8"
              >
                Start 7 dagen gratis
              </a>
              <p className="font-semibold text-gray-900 mb-4">Inbegrepen:</p>
              <ul className="space-y-3">
                {[
                  'Volledige kassa functionaliteit',
                  'Real-time rapporten',
                  'Producten & categorieën',
                  'Betaalterminal integratie',
                  'Voorraad',
                  'Email & telefoon support',
                ].map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-accent relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-accent text-white px-6 py-2 rounded-b-xl font-semibold text-sm">
              Meest gekozen
            </div>
            <div className="p-8 lg:p-10 pt-14">
              <p className="text-accent font-medium mb-2">Pro</p>
              <div className="flex items-baseline mb-4">
                <span className="text-5xl font-bold text-gray-900">€99</span>
                <span className="text-xl text-gray-500 ml-2">/maand</span>
              </div>
              <p className="text-gray-500 mb-8">
                Per licentie
              </p>
              <a 
                href="#demo" 
                className="block w-full bg-accent text-white text-center py-4 rounded-full font-semibold hover:bg-accent/90 transition-colors mb-8"
              >
                Start 7 dagen gratis
              </a>
              <p className="font-semibold text-gray-900 mb-4">Alles van Light, plus:</p>
              <ul className="space-y-3">
                {[
                  'Online bestelplatform',
                  'Personeel & urenregistratie',
                  'Onbeperkte producten & categorieën',
                  'Klantenkaart & loyaliteit',
                  'Keukenbeeldscherm software',
                  'Maandelijkse bedrijfsanalyse',
                  'Landingspagina',
                  'Tijdsregistratie personeel',
                  'Peppol facturatieprogramma',
                  'SCARDA boekhoudsoftware',
                  'Tafelreservatie',
                  'Tafel plattegrond',
                  'Beschikbaar in 9 talen',
                ].map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
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

// Industry Section
function IndustrySection() {
  const [activeTab, setActiveTab] = useState('restaurant')
  const [showLightbox, setShowLightbox] = useState(false)
  
  const industries = {
    restaurant: {
      title: 'Snelle en professionele facturatie.',
      description: 'Maak facturen aan voor klanten, creditnota\'s en meer. Koppel direct met Peppol en verstuur naar de boekhouder in een fractie van seconden.',
      image: 'https://i.imgur.com/sFqK85O.png',
    },
    frituur: {
      title: 'Snelle afhandeling, tevreden klanten.',
      description: 'Bestellingen razendsnel verwerken tijdens piekuren. Geen wachtrijen meer. Alles perfect geïntegreerd in de kassa. Alles in realtime naar de keuken.',
      image: 'https://i.imgur.com/ZJUI9VI.png',
    },
    analyse: {
      title: 'Realtime bedrijfsanalyse.',
      description: 'Weet precies hoe gezond jouw zaak is. Vul je vaste kosten in, aankopen van leveranciers, leasingen, huur en meer. Krijg direct een analyse in realtime over je bedrijf.',
      image: 'https://i.imgur.com/xFIDs6L.png',
    },
    boekhouding: {
      title: 'Professionele boekhouding.',
      description: 'SCARDA boekhoudsoftware volledig geïntegreerd. Altijd up-to-date. Bespaar 30% boekhoudkosten.',
      image: 'https://i.imgur.com/A3yjDsL.png',
    },
  }

  const current = industries[activeTab as keyof typeof industries]

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="flex gap-8 mb-12">
          {[
            { id: 'restaurant', label: 'Facturatie' },
            { id: 'frituur', label: 'Online bestelplatform' },
            { id: 'analyse', label: 'Bedrijfsanalyse' },
            { id: 'boekhouding', label: 'Boekhouding' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-lg font-semibold pb-2 border-b-4 transition-colors ${
                activeTab === tab.id
                  ? 'text-accent border-accent'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              {current.title}
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              {current.description}
            </p>
            <a
              href="#demo"
              className="inline-block bg-accent text-white px-8 py-4 rounded-full font-semibold hover:bg-accent/90 transition-all"
            >
              Gratis testen
            </a>
          </div>

          {/* Right content - Image */}
          <div className="relative text-center">
            <img
              src={current.image}
              alt={activeTab}
              className="w-full h-auto max-h-[700px] object-contain rounded-2xl shadow-xl scale-110 cursor-pointer"
              onClick={() => setShowLightbox(true)}
            />
            <p className="text-gray-500 text-sm mt-4">Klik om te vergroten</p>
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
  
  const testimonials = [
    {
      quote: "Eindelijk eens een platform waar alles in elkaar zit. Ik heb mijn andere abonnementen allemaal opgezegd en heb nu alles in één voor een fractie van de prijs.",
      author: "Marc V.",
      role: "Frituur eigenaar",
    },
    {
      quote: "De online bestelmodule heeft onze omzet met 40% verhoogd. Klanten vinden het geweldig.",
      author: "Sarah D.",
      role: "Restaurant manager",
    },
    {
      quote: "Support reageert binnen 5 minuten. Dat heb ik bij geen enkele andere leverancier.",
      author: "Kevin L.",
      role: "Café uitbater",
    },
    {
      quote: "De beste investering die ik ooit heb gedaan voor mijn zaak. Alles werkt perfect samen en de klantenservice is top.",
      author: "Lisa M.",
      role: "Bakkerij eigenaar",
    },
    {
      quote: "终于有一个用我自己语言的收银系统了！我找了好多年，终于找到了！",
      author: "王伟",
      role: "中餐厅老板",
    },
    {
      quote: "I've never had such a fast POS system. They even update overnight - I just press OK in the morning and the features I requested are already there!",
      author: "James T.",
      role: "Fish & Chips Owner",
    },
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [testimonials.length])

  return (
    <section className="py-24 bg-[#E3E3E3] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Horecaondernemers vertrouwen op Vysion
          </h2>
        </div>

        <div className="relative">
          <div 
            className="flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {testimonials.map((testimonial, index) => (
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
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Dots indicator */}
          <div className="flex justify-center mt-8 gap-2">
            {testimonials.map((_, index) => (
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
  return (
    <section id="demo" className="py-24 relative" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 bg-black/70"></div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
          Klaar om te groeien?
        </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Start vandaag nog met Vysion Horeca. 30 dagen gratis, geen verplichtingen.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/registreer" className="btn-primary">
            Start gratis proefperiode
          </a>
          <a href="#contact" className="btn-outline">
            Vraag info aan
          </a>
        </div>
      </div>
    </section>
  )
}

// Contact Section
function ContactSection() {
  return (
    <section id="contact" className="py-24 bg-[#E3E3E3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Neem contact op
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Vragen over Vysion Horeca? Ons team staat voor je klaar.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
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
                  <p className="text-sm text-gray-500">Telefoon</p>
                  <a href="tel:+32123456789" className="text-gray-900 hover:text-accent">
                    +32 (0) 49 21 29 9383
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#E3E3E3] rounded-2xl p-8">
            <form className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Voornaam <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Jan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Achternaam <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Janssen"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="jan@voorbeeld.be"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bericht <span className="text-red-500">*</span></label>
                <textarea 
                  rows={4}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                  placeholder="Vertel ons over je horecazaak..."
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-white py-4 rounded-lg font-semibold transition-colors"
              >
                Verstuur bericht
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

// Cookie Banner
function CookieBanner() {
  const [showBanner, setShowBanner] = useState(true)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    const cookieConsent = localStorage.getItem('cookieConsent')
    if (cookieConsent) {
      setShowBanner(false)
      setAccepted(cookieConsent === 'accepted')
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'accepted')
    setShowBanner(false)
    setAccepted(true)
  }

  const declineCookies = () => {
    localStorage.setItem('cookieConsent', 'declined')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-dark text-white p-4 md:p-6 z-50 shadow-2xl border-t border-gray-700">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm md:text-base">
            🍪 Wij gebruiken cookies om je ervaring te verbeteren. Door verder te gaan ga je akkoord met ons{' '}
            <a href="/juridisch/cookies" className="text-accent hover:underline">cookiebeleid</a>.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={declineCookies}
            className="px-4 py-2 text-sm border border-gray-500 rounded-full hover:bg-gray-700 transition-colors"
          >
            Weigeren
          </button>
          <button
            onClick={acceptCookies}
            className="px-6 py-2 text-sm bg-accent text-white rounded-full hover:bg-accent/90 transition-colors font-semibold"
          >
            Accepteren
          </button>
        </div>
      </div>
    </div>
  )
}

// Footer
function Footer() {
  return (
    <footer className="bg-dark text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <span className="text-2xl font-bold">
                <span className="text-accent">Vysion</span>
                <span className="text-gray-400 font-normal ml-1">horeca</span>
              </span>
            </div>
            <p className="text-gray-400 max-w-md">
              Vysion Horeca is een onderdeel van de Vysion Group International.
              <br /><br />
              <strong className="text-gray-300">Adres:</strong><br />
              Vysion Group International<br />
              Siberiëstraat 24<br />
              3900 Pelt, België
              <br /><br />
              <a href="https://www.vysionapps.io" target="_blank" className="text-accent hover:underline">www.vysionapps.io</a>
              <br />
              <a href="https://www.vysionhoreca.com" target="_blank" className="text-accent hover:underline">www.vysionhoreca.com</a>
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="#functies" className="text-gray-400 hover:text-white transition-colors">Functies</a></li>
              <li><a href="#prijzen" className="text-gray-400 hover:text-white transition-colors">Prijzen</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Updates</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Bedrijf</h4>
            <ul className="space-y-2">
              <li><a href="#over-ons" className="text-gray-400 hover:text-white transition-colors">Over ons</a></li>
              <li><a href="#contact" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              <li><a href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy</a></li>
              <li><a href="/juridisch" className="text-gray-400 hover:text-white transition-colors">Juridisch</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Vysion Group. Alle rechten voorbehouden.
          </p>
          <p className="text-gray-500 text-sm mt-4 sm:mt-0">
            Design by Vysion
          </p>
        </div>
      </div>
    </footer>
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

