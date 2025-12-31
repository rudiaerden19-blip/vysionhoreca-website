'use client'

import { useLanguage } from '@/i18n'

export default function AanvaardbaarGebruikPage() {
  const { t } = useLanguage()
  const trans = (key: string) => t(`aupPage.${key}`)
  
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
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.intro.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.intro.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.allowed.title')}</h2>
          <p className="text-gray-600 mb-4">{trans('sections.allowed.intro')}</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>{trans('sections.allowed.items.1')}</li>
            <li>{trans('sections.allowed.items.2')}</li>
            <li>{trans('sections.allowed.items.3')}</li>
            <li>{trans('sections.allowed.items.4')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.prohibited.title')}</h2>
          <p className="text-gray-600 mb-4">{trans('sections.prohibited.intro')}</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>{trans('sections.prohibited.items.1')}</li>
            <li>{trans('sections.prohibited.items.2')}</li>
            <li>{trans('sections.prohibited.items.3')}</li>
            <li>{trans('sections.prohibited.items.4')}</li>
            <li>{trans('sections.prohibited.items.5')}</li>
            <li>{trans('sections.prohibited.items.6')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.enforcement.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.enforcement.content')}
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
