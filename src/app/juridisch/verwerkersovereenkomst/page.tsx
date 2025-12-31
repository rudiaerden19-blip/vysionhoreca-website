'use client'

import { useLanguage } from '@/i18n'

export default function VerwerkersovereenkomstPage() {
  const { t } = useLanguage()
  const trans = (key: string) => t(`dpaPage.${key}`)
  
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
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.definitions.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.definitions.content')}<br />
            <strong>{trans('sections.definitions.controller')}</strong> {trans('sections.definitions.controllerDef')}<br />
            <strong>{trans('sections.definitions.processor')}</strong> {trans('sections.definitions.processorDef')}<br />
            <strong>{trans('sections.definitions.personalData')}</strong> {trans('sections.definitions.personalDataDef')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.subject.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.subject.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.purpose.title')}</h2>
          <p className="text-gray-600 mb-4">{trans('sections.purpose.intro')}</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>{trans('sections.purpose.items.1')}</li>
            <li>{trans('sections.purpose.items.2')}</li>
            <li>{trans('sections.purpose.items.3')}</li>
            <li>{trans('sections.purpose.items.4')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.categories.title')}</h2>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>{trans('sections.categories.items.1')}</li>
            <li>{trans('sections.categories.items.2')}</li>
            <li>{trans('sections.categories.items.3')}</li>
            <li>{trans('sections.categories.items.4')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.obligations.title')}</h2>
          <p className="text-gray-600 mb-4">{trans('sections.obligations.intro')}</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>{trans('sections.obligations.items.1')}</li>
            <li>{trans('sections.obligations.items.2')}</li>
            <li>{trans('sections.obligations.items.3')}</li>
            <li>{trans('sections.obligations.items.4')}</li>
            <li>{trans('sections.obligations.items.5')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.subprocessors.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.subprocessors.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.security.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.security.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.breach.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.breach.content')}
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
