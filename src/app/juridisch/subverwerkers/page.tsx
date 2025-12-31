'use client'

import { useLanguage } from '@/i18n'

export default function SubverwerkersPage() {
  const { t } = useLanguage()
  
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-dark py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {t('subprocessorsPage.title')}
          </h1>
          <p className="text-xl text-gray-300">{t('subprocessorsPage.lastUpdated')}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          
          <p className="text-gray-600 mb-8">
            {t('subprocessorsPage.intro')}
          </p>

          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold">{t('subprocessorsPage.table.subprocessor')}</th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold">{t('subprocessorsPage.table.purpose')}</th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold">{t('subprocessorsPage.table.location')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-4 py-3">{t('subprocessorsPage.table.aws.name')}</td>
                  <td className="border border-gray-200 px-4 py-3">{t('subprocessorsPage.table.aws.purpose')}</td>
                  <td className="border border-gray-200 px-4 py-3">{t('subprocessorsPage.table.aws.location')}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3">{t('subprocessorsPage.table.mollie.name')}</td>
                  <td className="border border-gray-200 px-4 py-3">{t('subprocessorsPage.table.mollie.purpose')}</td>
                  <td className="border border-gray-200 px-4 py-3">{t('subprocessorsPage.table.mollie.location')}</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3">{t('subprocessorsPage.table.stripe.name')}</td>
                  <td className="border border-gray-200 px-4 py-3">{t('subprocessorsPage.table.stripe.purpose')}</td>
                  <td className="border border-gray-200 px-4 py-3">{t('subprocessorsPage.table.stripe.location')}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3">{t('subprocessorsPage.table.vercel.name')}</td>
                  <td className="border border-gray-200 px-4 py-3">{t('subprocessorsPage.table.vercel.purpose')}</td>
                  <td className="border border-gray-200 px-4 py-3">{t('subprocessorsPage.table.vercel.location')}</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3">{t('subprocessorsPage.table.sendgrid.name')}</td>
                  <td className="border border-gray-200 px-4 py-3">{t('subprocessorsPage.table.sendgrid.purpose')}</td>
                  <td className="border border-gray-200 px-4 py-3">{t('subprocessorsPage.table.sendgrid.location')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('subprocessorsPage.changes.title')}</h2>
          <p className="text-gray-600 mb-8">
            {t('subprocessorsPage.changes.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('subprocessorsPage.contact.title')}</h2>
          <p className="text-gray-600 mb-8">
            {t('subprocessorsPage.contact.content')}{' '}
            <a href="mailto:info@vysionhoreca.com" className="text-accent hover:underline">info@vysionhoreca.com</a>
          </p>

          <div className="mt-12 pt-8 border-t border-gray-200 flex gap-4">
            <a href="/juridisch" className="text-accent hover:underline font-semibold">
              {t('legal.backToLegal')}
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
