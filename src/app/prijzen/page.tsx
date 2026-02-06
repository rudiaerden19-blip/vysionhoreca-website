'use client'

import React, { useState } from 'react'
import { Navigation, Footer, CookieBanner } from '@/components'
import { useLanguage } from '@/i18n'

export default function PrijzenPage() {
  const { t, locale } = useLanguage()
  const [isYearly, setIsYearly] = useState(false)
  
  const starterMonthly = 59
  const proMonthly = 69
  const starterPrice = isYearly ? Math.round(starterMonthly * 12 * 0.9) : starterMonthly
  const proPrice = isYearly ? Math.round(proMonthly * 12 * 0.9) : proMonthly

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      <Navigation />
      
      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            {t('pricing.title')}
          </h1>
          <p className="text-xl text-gray-300 mb-4">
            {t('pricing.subtitle')}
          </p>
          <p className="text-gray-400">
            {t('pricing.trialInfo')}
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 bg-gradient-to-b from-[#16213e] to-[#1a1a2e]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Toggle Maandelijks / Jaarlijks */}
          <div className="flex flex-col items-center mb-12">
            <div className="bg-[#0f0f1a] p-1 rounded-full inline-flex items-center">
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
                className={`px-6 py-3 rounded-full font-semibold transition-all relative ${
                  isYearly 
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Jaarlijks
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  -10%
                </span>
              </button>
            </div>
            {isYearly && (
              <p className="text-green-400 text-sm mt-3 font-medium">
                ✓ Je bespaart 10% met een jaarabonnement!
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Vysion Starter - €59 */}
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
                  <span className="text-gray-400 ml-2">{isYearly ? '/jaar' : t('pricing.perMonth')}</span>
                </div>
                {isYearly && (
                  <p className="text-green-300 text-sm mb-4">= €{Math.round(starterMonthly * 0.9)}/maand</p>
                )}
                
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
                  href={`/registreer?lang=${locale}&plan=starter`}
                  className="block w-full bg-[#1a1a2e] text-white text-center py-4 rounded-full font-semibold hover:bg-[#0f0f1a] transition-colors"
                >
                  {t('pricing.chooseStarter')}
                </a>
                <p className="text-center text-gray-400 text-sm mt-3">{t('pricing.cancelAnytime')}</p>
              </div>
            </div>

            {/* Vysion Pro - €69 - POPULAR */}
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
                  <span className="text-gray-400 ml-2">{isYearly ? '/jaar' : t('pricing.perMonth')}</span>
                </div>
                {isYearly && (
                  <p className="text-purple-200 text-sm mb-4">= €{Math.round(proMonthly * 0.9)}/maand</p>
                )}
                
                <p className="text-purple-200 mb-4 flex items-center">
                  <span className="mr-2">✨</span>
                  {t('pricing.pro.allOfStarter')}
                </p>
                
                <ul className="space-y-3 mb-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                    <li key={i} className="flex items-center">
                      <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-200">{t(`pricing.pro.features.${i}`)}</span>
                    </li>
                  ))}
                </ul>
                
                <a 
                  href={`/registreer?lang=${locale}&plan=pro`}
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

      {/* FAQ Section */}
      <section className="py-20 bg-[#1a1a2e]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {t('pricing.faq.title')}
          </h2>
          
          <div className="space-y-6">
            <div className="bg-[#16213e] rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-2">
                {t('pricing.faq.q1')}
              </h3>
              <p className="text-gray-300">
                {t('pricing.faq.a1')}
              </p>
            </div>
            
            <div className="bg-[#16213e] rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-2">
                {t('pricing.faq.q2')}
              </h3>
              <p className="text-gray-300">
                {t('pricing.faq.a2')}
              </p>
            </div>
            
            <div className="bg-[#16213e] rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-2">
                {t('pricing.faq.q3')}
              </h3>
              <p className="text-gray-300">
                {t('pricing.faq.a3')}
              </p>
            </div>
            
            <div className="bg-[#16213e] rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-2">
                {t('pricing.faq.q4')}
              </h3>
              <p className="text-gray-300">
                {t('pricing.faq.a4')}
              </p>
            </div>
            
            <div className="bg-[#16213e] rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-2">
                {t('pricing.faq.q5')}
              </h3>
              <p className="text-gray-300">
                {t('pricing.faq.a5')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-900 to-pink-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            {t('pricing.cta.title')}
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            {t('pricing.cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href={`/registreer?lang=${locale}`}
              className="inline-block bg-white text-purple-900 px-8 py-4 rounded-full font-semibold hover:bg-gray-100 transition-colors"
            >
              {t('pricing.cta.primary')}
            </a>
            <a 
              href="mailto:info@vysionhoreca.com"
              className="inline-block bg-white/10 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/20 transition-colors border border-white/20"
            >
              {t('pricing.cta.secondary')}
            </a>
          </div>
        </div>
      </section>

      <Footer />
      <CookieBanner />
    </div>
  )
}
