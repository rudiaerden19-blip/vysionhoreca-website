'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Navigation from '@/components/Navigation'
import { useLanguage } from '@/i18n/LanguageContext'

const countries = [
  { code: 'BE', name: 'België', flag: '🇧🇪' },
  { code: 'NL', name: 'Nederland', flag: '🇳🇱' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹' },
  { code: 'AT', name: 'Österreich', flag: '🇦🇹' },
  { code: 'CH', name: 'Schweiz', flag: '🇨🇭' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
]

const sectionLight = 'bg-white text-gray-900'
const sectionMuted = 'bg-[#e3e3e3] text-gray-900'

export default function ResellersPage() {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    website: '',
    experience: '',
    motivation: '',
    expected_clients: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/partner-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error(t('resellersPage.errorMsg'))
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    }

    setSubmitting(false)
  }

  const benefits = [
    { icon: '💰', titleKey: 'benefit1Title', descKey: 'benefit1Desc' },
    { icon: '🌍', titleKey: 'benefit2Title', descKey: 'benefit2Desc' },
    { icon: '📱', titleKey: 'benefit3Title', descKey: 'benefit3Desc' },
    { icon: '🎯', titleKey: 'benefit4Title', descKey: 'benefit4Desc' },
    { icon: '🛠️', titleKey: 'benefit5Title', descKey: 'benefit5Desc' },
    { icon: '📈', titleKey: 'benefit6Title', descKey: 'benefit6Desc' },
  ]

  const faqs = [
    { q: t('resellersPage.faq1Q'), a: t('resellersPage.faq1A') },
    { q: t('resellersPage.faq2Q'), a: t('resellersPage.faq2A') },
    { q: t('resellersPage.faq3Q'), a: t('resellersPage.faq3A') },
    { q: t('resellersPage.faq4Q'), a: t('resellersPage.faq4A') },
    { q: t('resellersPage.faq5Q'), a: t('resellersPage.faq5A') },
  ]

  const inputClass =
    'w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent'

  return (
    <div className={`min-h-screen ${sectionLight}`}>
      <Navigation />

      {/* Hero */}
      <section className={`pt-32 pb-20 px-4 ${sectionLight}`}>
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-2 bg-accent/15 text-accent rounded-full text-sm font-medium mb-6">
              🤝 {t('resellersPage.badge')}
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              {t('resellersPage.heroTitle')}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              {t('resellersPage.heroDesc')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className={`py-20 px-4 ${sectionMuted}`}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            {t('resellersPage.benefitsTitle')}
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm"
              >
                <span className="text-4xl mb-4 block">{benefit.icon}</span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t(`resellersPage.${benefit.titleKey}`)}</h3>
                <p className="text-gray-600">{t(`resellersPage.${benefit.descKey}`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission */}
      <section className={`py-20 px-4 ${sectionLight}`}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            {t('resellersPage.commissionTitle')}
          </h2>

          <div className="bg-gradient-to-br from-accent/10 to-orange-50/80 rounded-3xl p-8 border border-gray-200">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="text-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <p className="text-gray-600 mb-2">{t('resellersPage.monthlyCommission')}</p>
                <p className="text-5xl font-bold text-accent mb-2">30%</p>
                <p className="text-gray-500 text-sm">{t('resellersPage.monthlyCommissionNote')}</p>
              </div>
              <div className="text-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <p className="text-gray-600 mb-2">{t('resellersPage.setupCommission')}</p>
                <p className="text-5xl font-bold text-accent mb-2">50%</p>
                <p className="text-gray-500 text-sm">{t('resellersPage.setupCommissionNote')}</p>
              </div>
            </div>

            <div className="mt-8 p-6 bg-white/90 rounded-2xl border border-gray-200">
              <h4 className="text-gray-900 font-bold mb-4">{t('resellersPage.exampleTitle')}</h4>
              <div className="space-y-2 text-gray-700">
                <p>• {t('resellersPage.exampleLine1')}</p>
                <p>• {t('resellersPage.exampleLine2')}</p>
                <p>• {t('resellersPage.exampleLine3')}</p>
                <p>• {t('resellersPage.exampleLine4')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className={`py-20 px-4 ${sectionMuted}`} id="aanmelden">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            {t('resellersPage.formTitle')}
          </h2>
          <p className="text-gray-600 text-center mb-12">{t('resellersPage.formDesc')}</p>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center"
            >
              <span className="text-5xl mb-4 block">✅</span>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('resellersPage.successTitle')}</h3>
              <p className="text-gray-700">{t('resellersPage.successDesc')}</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">{error}</div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-900 font-medium mb-2">{t('resellersPage.companyName')} *</label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className={inputClass}
                    placeholder={t('resellersPage.companyPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-gray-900 font-medium mb-2">{t('resellersPage.contactName')} *</label>
                  <input
                    type="text"
                    required
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className={inputClass}
                    placeholder={t('resellersPage.namePlaceholder')}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-900 font-medium mb-2">{t('resellersPage.email')} *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-gray-900 font-medium mb-2">{t('resellersPage.phone')}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={inputClass}
                    placeholder="+32 ..."
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-900 font-medium mb-2">{t('resellersPage.country')} *</label>
                  <select
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">{t('resellersPage.selectCountry')}</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                    <option value="OTHER">🌍 {t('resellersPage.otherCountry')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-900 font-medium mb-2">{t('resellersPage.city')}</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={inputClass}
                    placeholder={t('resellersPage.cityPlaceholder')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-900 font-medium mb-2">{t('resellersPage.website')}</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className={inputClass}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-gray-900 font-medium mb-2">{t('resellersPage.experience')}</label>
                <textarea
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder={t('resellersPage.experiencePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-gray-900 font-medium mb-2">{t('resellersPage.motivation')}</label>
                <textarea
                  value={formData.motivation}
                  onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder={t('resellersPage.motivationPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-gray-900 font-medium mb-2">{t('resellersPage.expectedClients')}</label>
                <select
                  value={formData.expected_clients}
                  onChange={(e) => setFormData({ ...formData, expected_clients: e.target.value })}
                  className={inputClass}
                >
                  <option value="">{t('resellersPage.select')}</option>
                  <option value="1-10">{t('resellersPage.clients1')}</option>
                  <option value="10-25">{t('resellersPage.clients2')}</option>
                  <option value="25-50">{t('resellersPage.clients3')}</option>
                  <option value="50-100">{t('resellersPage.clients4')}</option>
                  <option value="100+">{t('resellersPage.clients5')}</option>
                </select>
              </div>

              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block"
                    />
                    {t('resellersPage.submitting')}
                  </span>
                ) : (
                  `🚀 ${t('resellersPage.submit')}`
                )}
              </motion.button>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className={`py-20 px-4 ${sectionLight}`}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">{t('resellersPage.faqTitle')}</h2>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden group shadow-sm"
              >
                <summary className="px-6 py-4 cursor-pointer text-gray-900 font-medium flex items-center justify-between">
                  {faq.q}
                  <span className="text-accent group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-6 pb-4 text-gray-600">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — horeca-foto */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/resellers-cta-bg.png)' }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-black/50" aria-hidden />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6 drop-shadow-md">{t('resellersPage.ctaTitle')}</h2>
          <p className="text-xl text-white/95 mb-8 drop-shadow-sm">{t('resellersPage.ctaDesc')}</p>
          <a
            href="#aanmelden"
            className="inline-block px-8 py-4 bg-accent hover:bg-accent/90 text-white rounded-full font-bold text-lg transition-all shadow-lg"
          >
            🤝 {t('resellersPage.ctaButton')}
          </a>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto text-center text-gray-600">
          <p>© {t('resellersPage.footerCopyright')}</p>
        </div>
      </footer>
    </div>
  )
}
