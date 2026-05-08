'use client'

import { Navigation, Footer } from '@/components'
import { useLanguage } from '@/i18n'

const INSTALLER_HREF =
  'https://github.com/rudiaerden19-blip/vysionhoreca-website/releases/download/vysion-print-agent-windows/Vysion-Print-Agent-Setup.exe'
const GITHUB_RELEASE_HREF =
  'https://github.com/rudiaerden19-blip/vysionhoreca-website/releases/tag/vysion-print-agent-windows'

export default function PrintAgentDownloadPage() {
  const { t } = useLanguage()

  return (
    <main>
      <Navigation />

      <section className="bg-dark pt-32 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t('printAgentDownloadPage.heroTitle')}
          </h1>
          <p className="text-lg text-gray-300">{t('printAgentDownloadPage.heroSubtitle')}</p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <p className="text-gray-700 leading-relaxed">{t('printAgentDownloadPage.intro')}</p>
          <p className="text-gray-600 text-sm">{t('printAgentDownloadPage.windowsNote')}</p>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <a
              href={INSTALLER_HREF}
              className="inline-flex justify-center rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:opacity-95 text-center"
              rel="noopener noreferrer"
            >
              {t('printAgentDownloadPage.downloadCta')}
            </a>
            <a
              href={GITHUB_RELEASE_HREF}
              className="inline-flex justify-center text-accent hover:underline text-sm font-medium sm:items-center"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('printAgentDownloadPage.releaseNote')}
            </a>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
            <h2 className="font-semibold text-gray-900 mb-2">{t('printAgentDownloadPage.safetyTitle')}</h2>
            <p className="text-gray-700 text-sm leading-relaxed">{t('printAgentDownloadPage.safetyBody')}</p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
