'use client'

import React from 'react'
import { Navigation, Footer, CookieBanner } from '@/components'
import { useLanguage } from '@/i18n'

export default function PrijzenPage() {
  const { t, locale } = useLanguage()

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            
            {/* Vysion Starter - €69 */}
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
                  <span className="text-5xl font-bold text-yellow-400">€69</span>
                  <span className="text-gray-400 ml-2">{t('pricing.perMonth')}</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <li key={i} className="flex items-center">
                      <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-200">{t(`pricing.starter.features.${i}`)}</span>
                    </li>
                  ))}
                  {/* Not included features - grayed out */}
                  {[1, 2, 3, 4].map((i) => (
                    <li key={`not-${i}`} className="flex items-center opacity-50">
                      <svg className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-gray-400 line-through">{t(`pricing.starter.notIncluded.${i}`)}</span>
                    </li>
                  ))}
                </ul>
                
                <a 
                  href={`https://frituurnolim.vercel.app/registreer?lang=${locale}&plan=starter`}
                  className="block w-full bg-[#1a1a2e] text-white text-center py-4 rounded-full font-semibold hover:bg-[#0f0f1a] transition-colors"
                >
                  {t('pricing.chooseStarter')}
                </a>
              </div>
            </div>

            {/* Vysion Horeca Standaard - €99 */}
            <div className="bg-gradient-to-b from-[#1e3a5f] to-[#0f2744] rounded-3xl overflow-hidden transform hover:scale-[1.02] transition-transform shadow-2xl">
              <div className="p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{t('pricing.standard.name')}</h3>
                    <p className="text-sm text-gray-400">{t('pricing.standard.subtitle')}</p>
                  </div>
                </div>
                <div className="flex items-baseline mb-6">
                  <span className="text-5xl font-bold text-green-400">€99</span>
                  <span className="text-gray-400 ml-2">{t('pricing.perMonth')}</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                    <li key={i} className="flex items-center">
                      <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-200">{t(`pricing.standard.features.${i}`)}</span>
                    </li>
                  ))}
                </ul>
                
                <a 
                  href={`https://frituurnolim.vercel.app/registreer?lang=${locale}&plan=standard`}
                  className="block w-full bg-[#1a1a2e] text-white text-center py-4 rounded-full font-semibold hover:bg-[#0f0f1a] transition-colors"
                >
                  {t('pricing.chooseStandard')}
                </a>
              </div>
            </div>

            {/* Vysion Pro - €129 - POPULAR */}
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
                  <span className="text-5xl font-bold text-purple-300">€129</span>
                  <span className="text-gray-400 ml-2">{t('pricing.perMonth')}</span>
                </div>
                
                <p className="text-purple-200 mb-4 flex items-center">
                  <span className="mr-2">✨</span>
                  {t('pricing.pro.allOfStarter')}
                </p>
                
                <ul className="space-y-3 mb-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((i) => (
                    <li key={i} className="flex items-center">
                      <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-200">{t(`pricing.pro.features.${i}`)}</span>
                    </li>
                  ))}
                </ul>
                
                <a 
                  href={`https://frituurnolim.vercel.app/registreer?lang=${locale}&plan=pro`}
                  className="block w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-center py-4 rounded-full font-semibold hover:from-pink-600 hover:to-purple-600 transition-colors"
                >
                  {t('pricing.choosePro')}
                </a>
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
              href={`https://frituurnolim.vercel.app/registreer?lang=${locale}`}
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
