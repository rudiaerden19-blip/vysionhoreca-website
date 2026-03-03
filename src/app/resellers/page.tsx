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

  return (
    <div className="min-h-screen bg-dark">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-2 bg-accent/20 text-accent rounded-full text-sm font-medium mb-6">
              🤝 {t('resellersPage.badge')}
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              {t('resellersPage.heroTitle')}
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
              {t('resellersPage.heroDesc')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 bg-dark/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {t('resellersPage.benefitsTitle')}
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 rounded-2xl p-6 border border-white/10"
              >
                <span className="text-4xl mb-4 block">{benefit.icon}</span>
                <h3 className="text-xl font-bold text-white mb-2">{t(`resellersPage.${benefit.titleKey}`)}</h3>
                <p className="text-gray-400">{t(`resellersPage.${benefit.descKey}`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Structure */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {t('resellersPage.commissionTitle')}
          </h2>
          
          <div className="bg-gradient-to-br from-accent/20 to-accent/5 rounded-3xl p-8 border border-accent/30">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="text-center p-6 bg-dark/50 rounded-2xl">
                <p className="text-gray-400 mb-2">{t('resellersPage.monthlyCommission')}</p>
                <p className="text-5xl font-bold text-accent mb-2">30%</p>
                <p className="text-gray-400 text-sm">{t('resellersPage.monthlyCommissionNote')}</p>
              </div>
              <div className="text-center p-6 bg-dark/50 rounded-2xl">
                <p className="text-gray-400 mb-2">{t('resellersPage.setupCommission')}</p>
                <p className="text-5xl font-bold text-accent mb-2">50%</p>
                <p className="text-gray-400 text-sm">{t('resellersPage.setupCommissionNote')}</p>
              </div>
            </div>
            
            <div className="mt-8 p-6 bg-dark/50 rounded-2xl">
              <h4 className="text-white font-bold mb-4">{t('resellersPage.exampleTitle')}</h4>
              <div className="space-y-2 text-gray-300">
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
      <section className="py-20 px-4 bg-dark/50" id="aanmelden">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            {t('resellersPage.formTitle')}
          </h2>
          <p className="text-gray-400 text-center mb-12">
            {t('resellersPage.formDesc')}
          </p>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-500/20 border border-green-500/50 rounded-2xl p-8 text-center"
            >
              <span className="text-5xl mb-4 block">✅</span>
              <h3 className="text-2xl font-bold text-white mb-2">{t('resellersPage.successTitle')}</h3>
              <p className="text-gray-300">
                {t('resellersPage.successDesc')}
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-300">
                  {error}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-medium mb-2">{t('resellersPage.companyName')} *</label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder={t('resellersPage.companyPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">{t('resellersPage.contactName')} *</label>
                  <input
                    type="text"
                    required
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder={t('resellersPage.namePlaceholder')}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-medium mb-2">{t('resellersPage.email')} *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">{t('resellersPage.phone')}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="+32 ..."
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-medium mb-2">{t('resellersPage.country')} *</label>
                  <select
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                  >
                    <option value="" className="bg-dark">{t('resellersPage.selectCountry')}</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code} className="bg-dark">
                        {country.flag} {country.name}
                      </option>
                    ))}
                    <option value="OTHER" className="bg-dark">🌍 {t('resellersPage.otherCountry')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">{t('resellersPage.city')}</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder={t('resellersPage.cityPlaceholder')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">{t('resellersPage.website')}</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">{t('resellersPage.experience')}</label>
                <textarea
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                  placeholder={t('resellersPage.experiencePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">{t('resellersPage.motivation')}</label>
                <textarea
                  value={formData.motivation}
                  onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                  placeholder={t('resellersPage.motivationPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">{t('resellersPage.expectedClients')}</label>
                <select
                  value={formData.expected_clients}
                  onChange={(e) => setFormData({ ...formData, expected_clients: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="" className="bg-dark">{t('resellersPage.select')}</option>
                  <option value="1-10" className="bg-dark">{t('resellersPage.clients1')}</option>
                  <option value="10-25" className="bg-dark">{t('resellersPage.clients2')}</option>
                  <option value="25-50" className="bg-dark">{t('resellersPage.clients3')}</option>
                  <option value="50-100" className="bg-dark">{t('resellersPage.clients4')}</option>
                  <option value="100+" className="bg-dark">{t('resellersPage.clients5')}</option>
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
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {t('resellersPage.faqTitle')}
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="bg-white/5 rounded-xl border border-white/10 overflow-hidden group"
              >
                <summary className="px-6 py-4 cursor-pointer text-white font-medium flex items-center justify-between">
                  {faq.q}
                  <span className="text-accent group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-6 pb-4 text-gray-400">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            {t('resellersPage.ctaTitle')}
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            {t('resellersPage.ctaDesc')}
          </p>
          <a
            href="#aanmelden"
            className="inline-block px-8 py-4 bg-accent hover:bg-accent/90 text-white rounded-full font-bold text-lg transition-all"
          >
            🤝 {t('resellersPage.ctaButton')}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center text-gray-500">
          <p>© {t('resellersPage.footerCopyright')}</p>
        </div>
      </footer>
    </div>
  )
}
