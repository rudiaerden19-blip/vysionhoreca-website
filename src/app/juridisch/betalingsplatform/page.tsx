'use client'

import { useLanguage } from '@/i18n'

export default function BetalingsplatformPage() {
  const { t } = useLanguage()
  const trans = (key: string) => t(`paymentPage.${key}`)
  
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

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.processing.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.processing.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.methods.title')}</h2>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>{trans('sections.methods.items.1')}</li>
            <li>{trans('sections.methods.items.2')}</li>
            <li>{trans('sections.methods.items.3')}</li>
            <li>{trans('sections.methods.items.4')}</li>
            <li>{trans('sections.methods.items.5')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.fees.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.fees.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.payouts.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.payouts.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.chargebacks.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.chargebacks.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.security.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.security.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.contact.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.contact.content')}{' '}
            <a href="mailto:info@vysionhoreca.com" className="text-accent hover:underline">info@vysionhoreca.com</a>
          </p>

          <div className="mt-12 pt-8 border-t border-gray-200 flex gap-4">
            <a href="/juridisch" className="text-accent hover:underline font-semibold">
              ← Terug naar Juridisch
            </a>
            <a href="/" className="text-gray-500 hover:underline">
              Home
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
