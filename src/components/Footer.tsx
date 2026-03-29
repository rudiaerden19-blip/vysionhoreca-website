'use client'

import { useLanguage } from '@/i18n'
import BackToTopBar from '@/components/BackToTopBar'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <>
      <BackToTopBar />
      <footer className="bg-dark text-white py-16" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="mb-4">
                <span className="text-2xl font-bold">
                  <span className="text-accent">Vysion</span>
                  <span className="text-gray-400 font-normal ml-1">horeca</span>
                </span>
              </div>
              <p className="text-gray-400 max-w-lg leading-relaxed">
                {t('footer.description')}
              </p>
              <address className="not-italic text-gray-400 max-w-md mt-6 text-sm leading-relaxed">
                <strong className="text-gray-300">{t('footer.address')}</strong>
                <br />
                Vysion Group International
                <br />
                Siberiëstraat 24
                <br />
                3900 Pelt, België
                <br />
                BTW BE 1003.226.953
              </address>
              <p className="mt-6 space-y-1">
                <a
                  href="https://www.vysionapps.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline block"
                  aria-label={t('footer.linkAppsAria')}
                >
                  www.vysionapps.io
                </a>
                <a
                  href="https://www.vysionhoreca.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline block"
                  aria-label={t('footer.linkHorecaAria')}
                >
                  www.vysionhoreca.com
                </a>
              </p>
            </div>

            <nav aria-label={t('footer.navProductAria')}>
              <h2 className="text-base font-semibold mb-4 text-white">{t('footer.product')}</h2>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/#platform"
                    title={t('footer.featuresLinkTitle')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {t('footer.features')}
                  </a>
                </li>
                <li>
                  <a
                    href="/#prijzen"
                    title={t('footer.pricingLinkTitle')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {t('footer.pricing')}
                  </a>
                </li>
                <li>
                  <a
                    href="/#updates"
                    title={t('footer.updatesLinkTitle')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {t('footer.updates')}
                  </a>
                </li>
              </ul>
            </nav>

            <nav aria-label={t('footer.navCompanyAria')}>
              <h2 className="text-base font-semibold mb-4 text-white">{t('footer.company')}</h2>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/over-ons"
                    title={t('footer.aboutLinkTitle')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {t('footer.about')}
                  </a>
                </li>
                <li>
                  <a
                    href="/#contact"
                    title={t('footer.contactLinkTitle')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {t('footer.contact')}
                  </a>
                </li>
                <li>
                  <a
                    href="/support"
                    title={t('footer.supportLinkTitle')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {t('footer.support')}
                  </a>
                </li>
                <li>
                  <a
                    href="/privacy"
                    title={t('footer.privacyLinkTitle')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {t('footer.privacy')}
                  </a>
                </li>
                <li>
                  <a
                    href="/juridisch"
                    title={t('footer.legalLinkTitle')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {t('footer.legal')}
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm text-center sm:text-left">
              © {new Date().getFullYear()} Vysion Group. {t('footer.copyright')}
            </p>
            <p className="text-gray-500 text-sm">{t('footer.designBy')}</p>
          </div>
        </div>
      </footer>
    </>
  )
}
