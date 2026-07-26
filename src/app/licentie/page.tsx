'use client'

import { Navigation, Footer, CookieBanner } from '@/components'
import { useLanguage } from '@/i18n'
import { VYSION_INFO_EMAIL } from '@/lib/vysion-contact'

export default function LicentiePage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-[#e3e3e3]">
      <Navigation />

      <section className="pt-28 sm:pt-32 pb-12 bg-[#e3e3e3]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            {t('licensePurchasePage.title')}
          </h1>
          <p className="text-lg sm:text-xl text-gray-600">{t('licensePurchasePage.subtitle')}</p>
        </div>
      </section>

      <section className="pb-20 bg-[#e3e3e3]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border-2 border-gray-900 shadow-lg overflow-hidden">
            <div className="bg-gray-900 text-white px-6 py-8 sm:px-10 text-center">
              <p className="text-sm font-medium uppercase tracking-wide text-white/70 mb-2">
                {t('licensePurchasePage.cardBadge')}
              </p>
              <p className="text-4xl sm:text-5xl font-extrabold text-accent tabular-nums">
                {t('licensePurchasePage.priceAmount')}
              </p>
              <p className="text-white/80 mt-2">{t('licensePurchasePage.priceNote')}</p>
            </div>

            <div className="p-6 sm:p-10 space-y-6">
              <p className="text-gray-700 text-lg leading-relaxed">{t('licensePurchasePage.lead')}</p>

              <ul className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-accent mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">{t(`licensePurchasePage.bullet${i}`)}</span>
                  </li>
                ))}
              </ul>

              <div className="rounded-xl bg-[#f5f5f5] border border-gray-200 p-5 text-sm text-gray-600">
                <p className="font-semibold text-gray-900 mb-1">{t('licensePurchasePage.compareTitle')}</p>
                <p>{t('licensePurchasePage.compareBody')}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href={`mailto:${VYSION_INFO_EMAIL}?subject=${encodeURIComponent(t('licensePurchasePage.emailSubject'))}`}
                  className="flex-1 text-center bg-gray-900 text-white py-3.5 rounded-full font-semibold hover:bg-gray-800 transition-colors"
                >
                  {t('licensePurchasePage.ctaContact')}
                </a>
                <a
                  href="/prijzen"
                  className="flex-1 text-center border-2 border-gray-900 text-gray-900 py-3.5 rounded-full font-semibold hover:bg-gray-900 hover:text-white transition-colors"
                >
                  {t('licensePurchasePage.ctaSubscription')}
                </a>
              </div>

              <p className="text-center text-gray-500 text-sm">{t('licensePurchasePage.footerNote')}</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <CookieBanner />
    </div>
  )
}
