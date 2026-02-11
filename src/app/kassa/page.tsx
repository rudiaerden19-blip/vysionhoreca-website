'use client'

import Link from 'next/link'
import { Navigation, Footer } from '@/components'

/**
 * Kassa Landingspagina
 * 
 * Aparte pagina voor het kassasysteem
 */

export default function KassaPage() {
  return (
    <main className="min-h-screen bg-dark">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/images/kassa-hero.jpg)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/80 to-transparent" />
        </div>
        
        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <span className="inline-block bg-accent/20 text-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
              Professioneel kassasysteem
            </span>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Vysion <span className="text-accent">Kassa</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Het complete kassasysteem voor horeca. Snel, betrouwbaar en eenvoudig te gebruiken. 
              Werkt op iPad en iPhone met automatische bonprinter ondersteuning.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/kassa/registreren" 
                className="bg-accent hover:bg-accent/90 text-white px-8 py-4 rounded-xl font-semibold text-center transition"
              >
                14 dagen gratis proberen
              </Link>
              <a 
                href="#features" 
                className="border border-white/30 hover:bg-white/10 text-white px-8 py-4 rounded-xl font-semibold text-center transition"
              >
                Bekijk features
              </a>
            </div>
            
            <p className="text-gray-400 text-sm mt-6">
              Geen creditcard nodig • Direct aan de slag
            </p>
          </div>
        </div>
      </section>

      {/* iPad Preview Section */}
      <section className="py-32 bg-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Speciaal ontworpen voor <span className="text-accent">horeca</span>
              </h2>
              <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                De Vysion Kassa is gebouwd door mensen die de horeca kennen. Met grote knoppen, 
                duidelijke categorieën en een overzichtelijke layout kun je razendsnel bestellingen 
                verwerken, zelfs tijdens de drukste momenten.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">Categorieën met afbeeldingen voor snelle herkenning</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">Numpad voor snelle invoer en handmatige bedragen</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">Tafelkeuze en afhaal in één scherm</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">Direct printen en afrekenen met één druk</span>
                </li>
              </ul>
            </div>
            
            {/* Right: iPad Image */}
            <div className="relative">
              <div className="bg-gradient-to-br from-accent/20 to-transparent rounded-3xl p-4">
                <img 
                  src="/images/kassa-ipad.png" 
                  alt="Vysion Kassa op iPad" 
                  className="rounded-2xl shadow-2xl w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Alles wat je nodig hebt
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Een compleet kassasysteem met alle functies die je verwacht
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-dark rounded-2xl p-8 border border-gray-800">
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Snel & Eenvoudig</h3>
              <p className="text-gray-400">
                Intuïtieve interface waarmee je in seconden bestellingen kunt verwerken.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-dark rounded-2xl p-8 border border-gray-800">
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Bonprinter Support</h3>
              <p className="text-gray-400">
                Automatische herkenning van ESC/POS printers. Print kassabonnen direct.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-dark rounded-2xl p-8 border border-gray-800">
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Rapporten & Analyse</h3>
              <p className="text-gray-400">
                Realtime omzet, dagelijkse rapporten en inzicht in je best verkopende producten.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-dark rounded-2xl p-8 border border-gray-800">
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">iPad & iPhone</h3>
              <p className="text-gray-400">
                Werkt naadloos op alle Apple apparaten. Download de app en je bent klaar.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-dark rounded-2xl p-8 border border-gray-800">
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Offline Werken</h3>
              <p className="text-gray-400">
                Geen internet? Geen probleem. De kassa blijft werken en synchroniseert later.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-dark rounded-2xl p-8 border border-gray-800">
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">GKS-Ready</h3>
              <p className="text-gray-400">
                Voorbereid op Belgische fiscale wetgeving. Alle transacties worden veilig bewaard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section className="py-32 bg-gradient-to-b from-gray-900 to-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Wil je de software in actie zien?
          </h2>
          <p className="text-gray-400 mb-8">
            Bekijk een echte frituur die draait op Vysion Kassa
          </p>
          <a 
            href="https://frituurnolim.vercel.app/kassa"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white px-8 py-4 rounded-full font-semibold transition"
          >
            Bekijk Live Demo
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </section>

      {/* Pricing Section - Placeholder */}
      <section className="py-32 bg-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Eenvoudige prijzen
            </h2>
            <p className="text-gray-400 text-lg">
              Geen verborgen kosten. Geen transactiekosten.
            </p>
          </div>
          
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-br from-accent/20 to-accent/5 rounded-3xl p-8 border border-accent/30">
              <div className="text-center">
                <span className="text-accent font-medium">Kassa Pro</span>
                <div className="mt-4 mb-6">
                  <span className="text-5xl font-bold text-white">€49</span>
                  <span className="text-gray-400">/maand</span>
                </div>
                <ul className="space-y-3 text-left mb-8">
                  <li className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Onbeperkt producten
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Onbeperkt bestellingen
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Bonprinter support
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Keukenscherm (KDS)
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Rapporten & statistieken
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Email support
                  </li>
                </ul>
                <Link 
                  href="/kassa/registreren"
                  className="block w-full bg-accent hover:bg-accent/90 text-white py-4 rounded-xl font-semibold transition"
                >
                  Start gratis proefperiode
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-accent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Klaar om te starten?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Probeer Vysion Kassa 14 dagen gratis. Geen creditcard nodig.
          </p>
          <Link 
            href="/kassa/registreren"
            className="inline-block bg-white text-accent px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition"
          >
            Gratis proberen →
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
