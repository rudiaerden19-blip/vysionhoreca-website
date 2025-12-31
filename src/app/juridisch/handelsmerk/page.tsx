'use client'

import { useLanguage } from '@/i18n'

export default function HandelsmerkPage() {
  const { t } = useLanguage()
  const trans = (key: string) => t(`trademarkPage.${key}`)
  
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
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.brands.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.brands.intro')}
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>{trans('sections.brands.items.1')}</li>
            <li>{trans('sections.brands.items.2')}</li>
            <li>{trans('sections.brands.items.3')}</li>
            <li>{trans('sections.brands.items.4')}</li>
            <li>{trans('sections.brands.items.5')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.allowed.title')}</h2>
          <p className="text-gray-600 mb-4">{trans('sections.allowed.intro')}</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>{trans('sections.allowed.items.1')}</li>
            <li>{trans('sections.allowed.items.2')}</li>
            <li>{trans('sections.allowed.items.3')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.notAllowed.title')}</h2>
          <p className="text-gray-600 mb-4">{trans('sections.notAllowed.intro')}</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>{trans('sections.notAllowed.items.1')}</li>
            <li>{trans('sections.notAllowed.items.2')}</li>
            <li>{trans('sections.notAllowed.items.3')}</li>
            <li>{trans('sections.notAllowed.items.4')}</li>
            <li>{trans('sections.notAllowed.items.5')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.logoGuidelines.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.logoGuidelines.intro')}
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>{trans('sections.logoGuidelines.items.1')}</li>
            <li>{trans('sections.logoGuidelines.items.2')}</li>
            <li>{trans('sections.logoGuidelines.items.3')}</li>
            <li>{trans('sections.logoGuidelines.items.4')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.permission.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.permission.content')}{' '}
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
