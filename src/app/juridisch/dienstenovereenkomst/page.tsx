'use client'

import { useLanguage } from '@/i18n'

export default function DienstenovereenkomstPage() {
  const { t } = useLanguage()
  const trans = (key: string) => t(`serviceAgreementPage.${key}`)
  
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-dark py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {trans('title')}
          </h1>
          <p className="text-xl text-gray-300">{trans('lastUpdated')}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.general.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.general.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.services.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.services.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.subscription.title')}</h2>
          <p className="text-gray-600 mb-4">
            {trans('sections.subscription.intro')}
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>{trans('sections.subscription.items.1')}</li>
            <li>{trans('sections.subscription.items.2')}</li>
            <li>{trans('sections.subscription.items.3')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.usage.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.usage.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.privacy.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.privacy.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.liability.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.liability.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.termination.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.termination.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.law.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.law.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.contact.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.contact.content')}{' '}
            <a href="mailto:info@vysionhoreca.com" className="text-accent hover:underline">info@vysionhoreca.com</a>
          </p>

          <div className="mt-12 pt-8 border-t border-gray-200 flex gap-4">
            <a href="/juridisch" className="text-accent hover:underline font-semibold">
              {t('common.backToLegal')}
            </a>
            <a href="/" className="text-gray-500 hover:underline">
              {t('common.home')}
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
