'use client'

import { useLanguage } from '@/i18n'

export default function JuridischPage() {
  const { t } = useLanguage()
  const trans = (key: string) => t(`legalMain.${key}`)
  
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-dark py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {trans('title')}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          
          {/* Beleiden */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">{trans('policies')}</h2>
            <ul className="space-y-4">
              <li>
                <a href="/juridisch/betalingsplatform" className="text-accent hover:underline">
                  {trans('links.paymentPlatform')}
                </a>
              </li>
              <li>
                <a href="/juridisch/aanvaardbaar-gebruik" className="text-accent hover:underline">
                  {trans('links.aup')}
                </a>
              </li>
              <li>
                <a href="/juridisch/intellectueel-eigendom" className="text-accent hover:underline">
                  {trans('links.ip')}
                </a>
              </li>
              <li>
                <a href="/juridisch/handelsmerk" className="text-accent hover:underline">
                  {trans('links.trademark')}
                </a>
              </li>
            </ul>
          </div>

          {/* Contracten */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">{trans('contracts')}</h2>
            <ul className="space-y-4">
              <li>
                <a href="/juridisch/dienstenovereenkomst" className="text-accent hover:underline">
                  {trans('links.serviceAgreement')}
                </a>
              </li>
              <li>
                <a href="/juridisch/sla" className="text-accent hover:underline">
                  {trans('links.sla')}
                </a>
              </li>
              <li>
                <a href="/juridisch/verwerkersovereenkomst" className="text-accent hover:underline">
                  {trans('links.dpa')}
                </a>
              </li>
            </ul>
          </div>

          {/* Privacy */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">{trans('privacy')}</h2>
            <ul className="space-y-4">
              <li>
                <a href="/privacy" className="text-accent hover:underline">
                  {trans('links.privacyPolicy')}
                </a>
              </li>
              <li>
                <a href="/juridisch/cookies" className="text-accent hover:underline">
                  {trans('links.cookies')}
                </a>
              </li>
              <li>
                <a href="/juridisch/subverwerkers" className="text-accent hover:underline">
                  {trans('links.subprocessors')}
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-16 pt-8 border-t border-gray-200">
          <a href="/" className="text-accent hover:underline font-semibold">
            {trans('backToHome')}
          </a>
        </div>
      </div>
    </main>
  )
}
