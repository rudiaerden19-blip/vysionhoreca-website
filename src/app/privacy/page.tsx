'use client'

import { useLanguage } from '@/i18n'

export default function PrivacyPage() {
  const { t } = useLanguage()
  const trans = (key: string) => t(`privacyPage.${key}`)
  
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-dark py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {trans('title')}
          </h1>
          <p className="text-xl text-gray-300">
            {trans('subtitle')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.intro.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.intro.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.whatData.title')}</h2>
          <p className="text-gray-600 mb-4">{trans('sections.whatData.intro')}</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>{trans('sections.whatData.items.1')}</li>
            <li>{trans('sections.whatData.items.2')}</li>
            <li>{trans('sections.whatData.items.3')}</li>
            <li>{trans('sections.whatData.items.4')}</li>
            <li>{trans('sections.whatData.items.5')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.whyData.title')}</h2>
          <p className="text-gray-600 mb-4">{trans('sections.whyData.intro')}</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>{trans('sections.whyData.items.1')}</li>
            <li>{trans('sections.whyData.items.2')}</li>
            <li>{trans('sections.whyData.items.3')}</li>
            <li>{trans('sections.whyData.items.4')}</li>
            <li>{trans('sections.whyData.items.5')}</li>
            <li>{trans('sections.whyData.items.6')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.security.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.security.intro')}
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>{trans('sections.security.items.1')}</li>
            <li>{trans('sections.security.items.2')}</li>
            <li>{trans('sections.security.items.3')}</li>
            <li>{trans('sections.security.items.4')}</li>
            <li>{trans('sections.security.items.5')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.gks.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.gks.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.sharing.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.sharing.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.rights.title')}</h2>
          <p className="text-gray-600 mb-4">{trans('sections.rights.intro')}</p>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li>{trans('sections.rights.items.1')}</li>
            <li>{trans('sections.rights.items.2')}</li>
            <li>{trans('sections.rights.items.3')}</li>
            <li>{trans('sections.rights.items.4')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.cookies.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.cookies.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.contact.title')}</h2>
          <p className="text-gray-600 mb-4">
            {trans('sections.contact.intro')}
          </p>
          <p className="text-gray-600 mb-8">
            <strong>Email:</strong> <a href="mailto:info@vysionhoreca.com" className="text-accent hover:underline">info@vysionhoreca.com</a><br />
            <strong>Telefoon:</strong> +32 (0) 49 21 29 9383
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.changes.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.changes.content')}
          </p>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <a href="/" className="text-accent hover:underline font-semibold">
              {trans('backToHome')}
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
