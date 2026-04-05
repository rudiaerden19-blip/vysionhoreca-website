'use client'

import { Navigation, Footer, CookieBanner } from '@/components'
import { useLanguage } from '@/i18n'

export default function AbonnementenPage() {
  const { t, locale } = useLanguage()

  return (
    <div className="min-h-screen bg-[#e3e3e3]">
      <Navigation />

      <section className="pt-28 sm:pt-32 pb-12 bg-[#e3e3e3]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">{t('subscriptionsPage.title')}</h1>
          <p className="text-xl text-gray-600 mb-4">{t('subscriptionsPage.subtitle')}</p>
          <p className="text-gray-600 leading-relaxed">{t('subscriptionsPage.lead')}</p>
        </div>
      </section>

      <section className="pb-16 bg-[#e3e3e3]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className="flex items-start gap-3 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <svg
                  className="w-6 h-6 text-accent mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-800 leading-snug">{t(`subscriptionsPage.bullet${i}`)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/prijzen"
              className="inline-flex justify-center items-center bg-accent text-white px-8 py-4 rounded-full font-semibold hover:bg-accent/90 transition-colors text-center"
            >
              {t('subscriptionsPage.ctaPricing')}
            </a>
            <a
              href={`/registreer?lang=${locale}`}
              className="inline-flex justify-center items-center border-2 border-gray-900 text-gray-900 px-8 py-4 rounded-full font-semibold hover:bg-gray-900 hover:text-white transition-colors text-center"
            >
              {t('subscriptionsPage.ctaTrial')}
            </a>
          </div>

          <p className="mt-10 text-center text-gray-600">
            <a href="/#contact" className="text-accent font-semibold hover:underline">
              {t('subscriptionsPage.contactLine')}
            </a>
          </p>
        </div>
      </section>

      <Footer />
      <CookieBanner />
    </div>
  )
}
