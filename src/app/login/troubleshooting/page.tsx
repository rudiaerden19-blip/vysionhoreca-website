'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function TroubleshootingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const faqs = [
    {
      question: 'Mijn kassa start niet op',
      answer: `
        <ol class="list-decimal list-inside space-y-2">
          <li>Controleer of het apparaat is aangesloten op stroom</li>
          <li>Houd de aan/uit-knop 10 seconden ingedrukt om opnieuw op te starten</li>
          <li>Controleer of alle kabels goed zijn aangesloten</li>
          <li>Wacht 2 minuten en probeer opnieuw</li>
          <li>Als het probleem aanhoudt, neem contact op met support</li>
        </ol>
      `
    },
    {
      question: 'Ik kan niet inloggen op mijn kassa',
      answer: `
        <ol class="list-decimal list-inside space-y-2">
          <li>Controleer of je de juiste pincode gebruikt</li>
          <li>Vraag je beheerder om je pincode te resetten</li>
          <li>Controleer of je account niet geblokkeerd is (na 5 foute pogingen)</li>
          <li>Neem contact op met support als je geen toegang hebt tot een beheerdersaccount</li>
        </ol>
      `
    },
    {
      question: 'De betaalterminal werkt niet',
      answer: `
        <ol class="list-decimal list-inside space-y-2">
          <li>Controleer of de terminal is ingeschakeld (groen lampje brandt)</li>
          <li>Controleer de USB of Bluetooth-verbinding</li>
          <li>Start de terminal opnieuw op door hem uit en aan te zetten</li>
          <li>Ga naar Instellingen → Betaalterminal → Opnieuw koppelen</li>
          <li>Controleer of je internetverbinding werkt</li>
        </ol>
      `
    },
    {
      question: 'Bon printer print niet',
      answer: `
        <ol class="list-decimal list-inside space-y-2">
          <li>Controleer of er papier in de printer zit</li>
          <li>Open en sluit het printerdeksel (dit reset de printer)</li>
          <li>Controleer de USB/netwerk-verbinding</li>
          <li>Ga naar Instellingen → Printers → Test afdrukken</li>
          <li>Als de testpagina niet print, herstart de printer</li>
        </ol>
      `
    },
    {
      question: 'Mijn kassa is traag',
      answer: `
        <ol class="list-decimal list-inside space-y-2">
          <li>Sluit apps af die je niet gebruikt</li>
          <li>Controleer je internetverbinding (4G/WiFi)</li>
          <li>Herstart de kassa-applicatie</li>
          <li>Controleer of er updates beschikbaar zijn</li>
          <li>Neem contact op met support als het probleem aanhoudt</li>
        </ol>
      `
    },
    {
      question: 'Online bestellingen komen niet binnen',
      answer: `
        <ol class="list-decimal list-inside space-y-2">
          <li>Controleer of je internetverbinding werkt</li>
          <li>Controleer of de online bestellen module is ingeschakeld</li>
          <li>Ga naar Instellingen → Online bestellen → Synchroniseren</li>
          <li>Controleer of je vestiging "open" staat in het systeem</li>
          <li>Check je openingstijden in de instellingen</li>
        </ol>
      `
    },
    {
      question: 'Ik wil een product toevoegen of wijzigen',
      answer: `
        <ol class="list-decimal list-inside space-y-2">
          <li>Ga naar het menu linksboven → Producten</li>
          <li>Klik op "Nieuw product" of selecteer een bestaand product</li>
          <li>Vul de naam, prijs en categorie in</li>
          <li>Klik op "Opslaan"</li>
          <li>Het product is nu beschikbaar op je kassa</li>
        </ol>
      `
    },
    {
      question: 'Hoe maak ik een Z-rapport / dagafsluiting?',
      answer: `
        <ol class="list-decimal list-inside space-y-2">
          <li>Ga naar het menu linksboven → Rapporten</li>
          <li>Selecteer "Z-Rapport" of "Dagafsluiting"</li>
          <li>Controleer de gegevens</li>
          <li>Klik op "Afsluiten en printen"</li>
          <li>Het rapport wordt afgedrukt en de dag wordt afgesloten</li>
        </ol>
      `
    },
    {
      question: 'Ik ben mijn wachtwoord vergeten',
      answer: `
        <ol class="list-decimal list-inside space-y-2">
          <li>Ga naar de inlogpagina</li>
          <li>Klik op "Wachtwoord vergeten"</li>
          <li>Vul je e-mailadres in</li>
          <li>Je ontvangt een link om je wachtwoord te resetten</li>
          <li>Of neem contact op met support: +32 492 12 93 83</li>
        </ol>
      `
    },
    {
      question: 'De app crasht steeds',
      answer: `
        <ol class="list-decimal list-inside space-y-2">
          <li>Sluit de app volledig af</li>
          <li>Herstart je apparaat</li>
          <li>Controleer of je de laatste versie van de app hebt</li>
          <li>Verwijder de app en installeer opnieuw (je data blijft behouden)</li>
          <li>Neem contact op met support als het probleem aanhoudt</li>
        </ol>
      `
    },
  ]

  return (
    <main className="min-h-screen bg-dark">
      {/* Header */}
      <header className="bg-dark/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/login" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Terug naar login
          </Link>
          <Link href="/">
            <span className="text-xl font-bold">
              <span className="text-accent">Vysion</span>
              <span className="text-gray-400 font-normal ml-1">horeca</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Troubleshooting & Hulp
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Veelvoorkomende problemen en oplossingen voor je Vysion Horeca kassa
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-8 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <a
              href="tel:+32492129383"
              className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-gray-700 transition-colors"
            >
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">Bel support</p>
                <p className="text-sm text-gray-400">+32 492 12 93 83</p>
              </div>
            </a>

            <a
              href="mailto:support@vysionhoreca.com"
              className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-gray-700 transition-colors"
            >
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">E-mail support</p>
                <p className="text-sm text-gray-400">support@vysionhoreca.com</p>
              </div>
            </a>

            <a
              href="https://wa.me/32492129383"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-gray-700 transition-colors"
            >
              <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">WhatsApp</p>
                <p className="text-sm text-gray-400">Direct chatten</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-white mb-8">Veelvoorkomende problemen</h2>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-white/5 border border-gray-700 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-semibold text-white pr-4">{faq.question}</span>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${openFaq === index ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <div 
                      className="text-gray-300 prose prose-invert prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: faq.answer }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still need help */}
      <section className="py-12 border-t border-gray-800">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Probleem niet gevonden?</h2>
          <p className="text-gray-400 mb-8">
            Ons support team staat 24/7 voor je klaar. Neem gerust contact met ons op!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:+32492129383"
              className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white px-8 py-4 rounded-full font-semibold transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Bel nu: +32 492 12 93 83
            </a>
            <a
              href="mailto:support@vysionhoreca.com"
              className="inline-flex items-center justify-center gap-2 border-2 border-gray-600 hover:border-gray-500 text-white px-8 py-4 rounded-full font-semibold transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              E-mail support
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-800">
        <div className="max-w-5xl mx-auto px-4 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} Vysion Group. Alle rechten voorbehouden.
        </div>
      </footer>
    </main>
  )
}
