'use client'

import { useLanguage } from '@/i18n'

export default function CookiesPage() {
  const { t } = useLanguage()
  const trans = (key: string) => t(`cookiesPage.${key}`)
  
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
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('whatAreCookies.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('whatAreCookies.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('whichCookies.title')}</h2>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-3">{trans('whichCookies.necessary.title')}</h3>
          <p className="text-gray-600 mb-6">
            {trans('whichCookies.necessary.content')}
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3">{trans('whichCookies.functional.title')}</h3>
          <p className="text-gray-600 mb-6">
            {trans('whichCookies.functional.content')}
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3">{trans('whichCookies.analytical.title')}</h3>
          <p className="text-gray-600 mb-8">
            {trans('whichCookies.analytical.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('manageCookies.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('manageCookies.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('contact.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('contact.content')}{' '}
            <a href="mailto:info@vysionhoreca.com" className="text-accent hover:underline">info@vysionhoreca.com</a>
          </p>

          <div className="mt-12 pt-8 border-t border-gray-200 flex gap-4">
            <a href="/juridisch" className="text-accent hover:underline font-semibold">
              {trans('backToLegal')}
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
