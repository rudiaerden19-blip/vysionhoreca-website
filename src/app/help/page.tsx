'use client'

import { Navigation, Footer } from '@/components'
import { useLanguage } from '@/i18n'

export default function HelpPage() {
  const { t } = useLanguage()

  return (
    <main>
      <Navigation />

      <section className="bg-dark pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t('helpPage.heroTitle')} <span className="text-accent">{t('helpPage.heroTitleAccent')}</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">{t('helpPage.heroSubtitle')}</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-lg text-gray-600">{t('helpPage.body')}</p>
        </div>
      </section>

      <Footer />
    </main>
  )
}
