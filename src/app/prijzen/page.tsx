'use client'

import React, { useState } from 'react'
import { Navigation, Footer, CookieBanner } from '@/components'
import { useLanguage } from '@/i18n'

export default function PrijzenPage() {
  const { t, locale } = useLanguage()
  const [isYearly, setIsYearly] = useState(false)

  const starterMonthly = 59
  const proMonthly = 99
  const starterPrice = isYearly ? Math.round(starterMonthly * 12 * 0.9) : starterMonthly
  const proPrice = isYearly ? Math.round(proMonthly * 12 * 0.9) : proMonthly
  const periodLabel = isYearly ? '/jaar' : t('pricing.perMonth')

  return (
    <div className="min-h-screen bg-[#e3e3e3]">
      <Navigation />

      <section className="pt-28 sm:pt-32 pb-12 bg-[#e3e3e3]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">{t('pricing.title')}</h1>
          <p className="text-xl text-gray-600 mb-4">{t('pricing.subtitle')}</p>
          <p className="text-gray-500 text-sm sm:text-base">{t('pricing.trialInfo')}</p>
        </div>
      </section>

      <section className="py-10 pb-20 bg-[#e3e3e3]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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
            {isYearly && <p className="text-gray-600 text-sm mt-3">{t('pricing.yearlySave')}</p>}
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
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
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl sm:text-5xl font-bold text-gray-900 tabular-nums">€{starterPrice}</span>
                  <span className="text-accent font-medium ml-2">{periodLabel}</span>
                </div>
                {isYearly && (
                  <p className="text-accent text-sm font-medium mb-4">= €{Math.round(starterMonthly * 0.9)}{t('pricing.perMonth')}</p>
                )}

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
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl sm:text-5xl font-bold text-gray-900 tabular-nums">€{proPrice}</span>
                  <span className="text-accent font-medium ml-2">{periodLabel}</span>
                </div>
                {isYearly && (
                  <p className="text-accent text-sm font-medium mb-4">= €{Math.round(proMonthly * 0.9)}{t('pricing.perMonth')}</p>
                )}

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

      <section className="py-20 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">{t('pricing.faq.title')}</h2>

          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="bg-[#f9fafb] border border-gray-200 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-2">{t(`pricing.faq.q${n}`)}</h3>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">{t(`pricing.faq.a${n}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#e3e3e3] border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t('pricing.cta.title')}</h2>
          <p className="text-lg text-gray-600 mb-8">{t('pricing.cta.subtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`/registreer?lang=${locale}`}
              className="inline-block bg-accent text-white px-8 py-4 rounded-full font-semibold hover:bg-accent/90 transition-colors"
            >
              {t('pricing.cta.primary')}
            </a>
            <a
              href="mailto:info@vysionhoreca.com"
              className="inline-block border-2 border-gray-900 text-gray-900 px-8 py-4 rounded-full font-semibold hover:bg-gray-900 hover:text-white transition-colors"
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
