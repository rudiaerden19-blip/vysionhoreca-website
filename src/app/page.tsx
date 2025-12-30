'use client'

import { useState } from 'react'
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
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="opacity-0 animate-fadeInUp">
            <p className="text-accent font-semibold tracking-widest uppercase mb-4">
              ALLES-IN-ÉÉN KASSAPLATFORM
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Zet de toon in jouw horecazaak
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-lg">
              Vysion Horeca is het complete kassasysteem voor frituren, restaurants en cafés. 
              Kassa, online bestellingen, facturatie en personeelsbeheer - allemaal in één platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#demo" className="btn-primary text-center">
                Start gratis proefperiode
              </a>
              <a href="#functies" className="btn-outline text-center">
                Bekijk demo
              </a>
            </div>
            <p className="text-gray-500 mt-4 text-sm">
              30 dagen gratis • Geen creditcard nodig • Direct aan de slag
            </p>
          </div>

          {/* Right content - Real app screenshot */}
          <div className="opacity-0 animate-fadeInUp delay-200">
            <div className="relative">
              <img 
                src="https://i.imgur.com/IvW3RiX.png" 
                alt="Vysion Horeca Kassa" 
                className="rounded-2xl shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500 w-full max-w-2xl"
              />
            </div>
          </div>
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
      description: 'Eigen webshop voor afhaal en levering. Klanten bestellen, jij ontvangt direct in de kassa.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Real-time rapporten',
      description: 'Directe inzichten in omzet, populaire producten en drukke uren. Data-gedreven beslissingen.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: 'Betalingen',
      description: 'Geïntegreerde betaalterminal. Bancontact, Visa, Mastercard - alles in één systeem.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: 'Facturatie',
      description: 'Professionele facturen met één klik. Automatisch gekoppeld aan je boekhouding.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: 'Personeelsbeheer',
      description: 'Urenregistratie, rollen en permissies. Weet precies wie wat heeft gedaan.',
    },
  ]

  return (
    <section id="functies" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Alles wat je nodig hebt
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Eén platform voor al je horecabehoeften. Geen losse systemen, geen gedoe.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow duration-300"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
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
function StatsSection() {
  const stats = [
    { value: '€2.5M+', label: 'Verwerkt per maand' },
    { value: '50+', label: 'Actieve horecazaken' },
    { value: '99.9%', label: 'Uptime garantie' },
    { value: '24/7', label: 'Support beschikbaar' },
  ]

  return (
    <section className="bg-dark py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                {stat.value}
              </div>
              <div className="text-gray-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Pricing Section
function PricingSection() {
  return (
    <section id="prijzen" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Simpele, transparante prijzen
          </h2>
          <p className="text-xl text-gray-600">
            Alles inbegrepen. Geen verrassingen.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="grid md:grid-cols-2">
              {/* Left - Price */}
              <div className="p-8 lg:p-12 bg-primary text-white">
                <p className="text-primary-light font-medium mb-2">Alles-in-één</p>
                <div className="flex items-baseline mb-4">
                  <span className="text-5xl font-bold">€89</span>
                  <span className="text-xl ml-2">/maand</span>
                </div>
                <p className="text-gray-300 mb-8">
                  Per locatie, onbeperkt aantal gebruikers
                </p>
                <a 
                  href="#demo" 
                  className="block w-full bg-white text-primary text-center py-4 rounded-full font-semibold hover:bg-gray-100 transition-colors"
                >
                  Start 30 dagen gratis
                </a>
                <p className="text-center text-sm text-gray-300 mt-4">
                  Geen creditcard nodig
                </p>
              </div>

              {/* Right - Features */}
              <div className="p-8 lg:p-12">
                <p className="font-semibold text-gray-900 mb-6">Inbegrepen:</p>
                <ul className="space-y-4">
                  {[
                    'Volledige kassa functionaliteit',
                    'Online bestelwebsite',
                    'Facturatie & boekhouding export',
                    'Personeelsbeheer & urenregistratie',
                    'Real-time rapporten & analytics',
                    'Onbeperkte producten & categorieën',
                    'Betaalterminal integratie',
                    'Klantenkaart & loyaliteit',
                    'Keukenbeeldscherm (KDS)',
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
          </div>
        </div>
      </div>
    </section>
  )
}

// Testimonial Section
function TestimonialSection() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Horecaondernemers vertrouwen op Vysion
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              quote: "Eindelijk een kassasysteem dat doet wat het moet doen. Simpel, snel en betrouwbaar.",
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
          ].map((testimonial, index) => (
            <div key={index} className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div>
                <p className="font-semibold text-gray-900">{testimonial.author}</p>
                <p className="text-sm text-gray-500">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// CTA Section
function CTASection() {
  return (
    <section id="demo" className="bg-dark py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
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
            Vraag een demo aan
          </a>
        </div>
      </div>
    </section>
  )
}

// Contact Section
function ContactSection() {
  return (
    <section id="contact" className="py-24">
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
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telefoon</p>
                  <a href="tel:+32123456789" className="text-gray-900 hover:text-accent">
                    +32 (0) 12 34 56 78
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8">
            <form className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Voornaam</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Jan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Achternaam</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Janssen"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="jan@voorbeeld.be"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bericht</label>
                <textarea 
                  rows={4}
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
              Het complete kassasysteem voor horeca. Kassa, online bestellingen, facturatie en meer - allemaal in één platform.
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
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Vysion Group. Alle rechten voorbehouden.
          </p>
          <p className="text-gray-500 text-sm mt-4 sm:mt-0">
            Made with ❤️ in België
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
      <PricingSection />
      <TestimonialSection />
      <CTASection />
      <ContactSection />
      <Footer />
    </main>
  )
}

