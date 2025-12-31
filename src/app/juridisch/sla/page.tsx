'use client'

import { useLanguage } from '@/i18n'

export default function SLAPage() {
  const { t } = useLanguage()
  const trans = (key: string) => t(`slaPage.${key}`)
  
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
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.availability.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.availability.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.maintenance.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.maintenance.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.response.title')}</h2>
          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold">{trans('sections.response.headers.priority')}</th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold">{trans('sections.response.headers.description')}</th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold">{trans('sections.response.headers.responseTime')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-semibold text-red-600">{trans('sections.response.critical.name')}</td>
                  <td className="border border-gray-200 px-4 py-3">{trans('sections.response.critical.description')}</td>
                  <td className="border border-gray-200 px-4 py-3">{trans('sections.response.critical.time')}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3 font-semibold text-orange-600">{trans('sections.response.high.name')}</td>
                  <td className="border border-gray-200 px-4 py-3">{trans('sections.response.high.description')}</td>
                  <td className="border border-gray-200 px-4 py-3">{trans('sections.response.high.time')}</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-semibold text-yellow-600">{trans('sections.response.medium.name')}</td>
                  <td className="border border-gray-200 px-4 py-3">{trans('sections.response.medium.description')}</td>
                  <td className="border border-gray-200 px-4 py-3">{trans('sections.response.medium.time')}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3 font-semibold text-green-600">{trans('sections.response.low.name')}</td>
                  <td className="border border-gray-200 px-4 py-3">{trans('sections.response.low.description')}</td>
                  <td className="border border-gray-200 px-4 py-3">{trans('sections.response.low.time')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.channels.title')}</h2>
          <ul className="list-disc pl-6 text-gray-600 mb-8 space-y-2">
            <li><strong>{trans('sections.channels.email')}</strong> info@vysionhoreca.com</li>
            <li><strong>{trans('sections.channels.phone')}</strong> +32 (0) 49 21 29 9383</li>
            <li><strong>{trans('sections.channels.inApp')}</strong> {trans('sections.channels.inAppDesc')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.hours.title')}</h2>
          <p className="text-gray-600 mb-8">
            <strong>{trans('sections.hours.light')}</strong> {trans('sections.hours.lightHours')}<br />
            <strong>{trans('sections.hours.pro')}</strong> {trans('sections.hours.proHours')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.backups.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.backups.content')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{trans('sections.updates.title')}</h2>
          <p className="text-gray-600 mb-8">
            {trans('sections.updates.content')}
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
