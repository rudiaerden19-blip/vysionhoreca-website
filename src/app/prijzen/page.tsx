'use client'

import React from 'react'
import { Navigation, Footer, CookieBanner } from '@/components'
import { useLanguage } from '@/i18n'

export default function PrijzenPage() {
  const { t, locale } = useLanguage()

  return (
    <div className="min-h-screen bg-[#fdfdfd]">
      <Navigation />
      
      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-[#fdfdfd] to-[#f5f5f5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            {t('pricing.title')}
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            {t('pricing.subtitle')}
          </p>
          <p className="text-gray-500">
            7 dagen gratis proberen • Geen creditcard nodig • Maandelijks opzegbaar
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 bg-[#E3E3E3]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Light/Starter Plan */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden transform hover:scale-[1.02] transition-transform">
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
                  href={`https://frituurnolim.vercel.app/registreer?lang=${locale}`}
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
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-accent relative transform hover:scale-[1.02] transition-transform">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-accent text-white px-6 py-2 rounded-b-xl font-semibold text-sm">
                {t('pricing.mostChosen')}
              </div>
              <div className="p-8 lg:p-10 pt-14">
                <p className="text-accent font-medium mb-2">{t('pricing.pro.name')}</p>
                <div className="flex items-baseline mb-4">
                  <span className="text-5xl font-bold text-gray-900">€129</span>
                  <span className="text-xl text-gray-500 ml-2">{t('pricing.perMonth')}</span>
                </div>
                <p className="text-gray-500 mb-8">
                  {t('pricing.perLicense')}
                </p>
                <a 
                  href={`https://frituurnolim.vercel.app/registreer?lang=${locale}`}
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

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Veelgestelde vragen
          </h2>
          
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Kan ik eerst gratis proberen?
              </h3>
              <p className="text-gray-600">
                Ja! Je krijgt 7 dagen gratis toegang tot alle functies. Geen creditcard nodig om te starten.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Kan ik upgraden of downgraden?
              </h3>
              <p className="text-gray-600">
                Ja, je kunt op elk moment upgraden naar Pro of downgraden naar Light. De wijziging gaat direct in.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Zijn er langlopende contracten?
              </h3>
              <p className="text-gray-600">
                Nee, je betaalt maandelijks en kunt op elk moment opzeggen. Geen verplichtingen.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Welke betaalmethodes worden geaccepteerd?
              </h3>
              <p className="text-gray-600">
                We accepteren alle gangbare betaalmethodes: Visa, Mastercard, Bancontact, iDEAL, en meer via Stripe.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Is mijn data veilig?
              </h3>
              <p className="text-gray-600">
                Absoluut. We gebruiken enterprise-grade beveiliging, SSL encryptie, en alle data wordt opgeslagen in beveiligde EU datacenters conform GDPR.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Klaar om te starten?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Start vandaag nog met je 7 dagen gratis proefperiode. Geen creditcard nodig.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href={`https://frituurnolim.vercel.app/registreer?lang=${locale}`}
              className="inline-block bg-accent text-white px-8 py-4 rounded-full font-semibold hover:bg-accent/90 transition-colors"
            >
              Start gratis proefperiode →
            </a>
            <a 
              href="mailto:info@vysionhoreca.com"
              className="inline-block bg-white/10 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/20 transition-colors border border-white/20"
            >
              Contact opnemen
            </a>
          </div>
        </div>
      </section>

      <Footer />
      <CookieBanner />
    </div>
  )
}
