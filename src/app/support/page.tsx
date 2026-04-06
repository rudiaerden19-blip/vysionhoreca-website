'use client'

import { Navigation, Footer } from '@/components'
import { useState } from 'react'
import { useLanguage } from '@/i18n/LanguageContext'

export default function SupportPage() {
  const { t } = useLanguage()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const faqs = [
    { question: t('supportPage.faq1Q'), answer: t('supportPage.faq1A') },
    { question: t('supportPage.faq2Q'), answer: t('supportPage.faq2A') },
    { question: t('supportPage.faq3Q'), answer: t('supportPage.faq3A') },
    { question: t('supportPage.faq4Q'), answer: t('supportPage.faq4A') },
    { question: t('supportPage.faq5Q'), answer: t('supportPage.faq5A') },
    { question: t('supportPage.faq6Q'), answer: t('supportPage.faq6A') },
    { question: t('supportPage.faq7Q'), answer: t('supportPage.faq7A') },
    { question: t('supportPage.faq8Q'), answer: t('supportPage.faq8A') },
    { question: t('supportPage.faq9Q'), answer: t('supportPage.faq9A') },
  ]

  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-dark pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t('supportPage.heroTitle')}
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              {t('supportPage.heroSubtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Phone */}
            <div className="bg-[#E3E3E3] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('supportPage.phoneTitle')}</h3>
              <p className="text-gray-600 mb-4">{t('supportPage.phoneDesc')}</p>
              <a href="tel:+32492129383" className="text-2xl font-bold text-accent hover:underline">
                +32 492 12 93 83
              </a>
              <p className="text-sm text-gray-500 mt-2">{t('supportPage.phoneHours')}</p>
            </div>

            {/* Email */}
            <div className="bg-[#E3E3E3] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('supportPage.emailTitle')}</h3>
              <p className="text-gray-600 mb-4">{t('supportPage.emailDesc')}</p>
              <a href="mailto:info@vysionhoreca.com" className="text-2xl font-bold text-accent hover:underline break-all">
                info@vysionhoreca.com
              </a>
              <p className="text-sm text-gray-500 mt-2">{t('supportPage.emailNote')}</p>
            </div>

            {/* WhatsApp */}
            <div className="bg-[#E3E3E3] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('supportPage.whatsappTitle')}</h3>
              <p className="text-gray-600 mb-4">{t('supportPage.whatsappDesc')}</p>
              <a href="https://wa.me/32492129383" target="_blank" rel="noopener noreferrer" className="text-2xl font-bold text-green-500 hover:underline">
                {t('supportPage.whatsappStart')}
              </a>
              <p className="text-sm text-gray-500 mt-2">{t('supportPage.whatsappNote')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-[#E3E3E3]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('supportPage.faqTitle')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('supportPage.faqSubtitle')}
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                  <svg 
                    className={`w-5 h-5 text-accent flex-shrink-0 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5">
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Support Hours */}
      <section className="py-20 bg-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                {t('supportPage.hoursTitle')}
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                {t('supportPage.hoursDesc')}
              </p>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-white/20">
                  <span className="text-white font-medium">{t('supportPage.mondayFriday')}</span>
                  <span className="text-accent font-bold">09:00 - 22:00</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/20">
                  <span className="text-white font-medium">{t('supportPage.saturday')}</span>
                  <span className="text-accent font-bold">10:00 - 20:00</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/20">
                  <span className="text-white font-medium">{t('supportPage.sunday')}</span>
                  <span className="text-accent font-bold">10:00 - 18:00</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-white font-medium">{t('supportPage.holidays')}</span>
                  <span className="text-accent font-bold">10:00 - 16:00</span>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-3xl p-8 lg:p-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="text-5xl font-bold text-white mb-2">&lt; 5 min</div>
                <p className="text-xl text-gray-300 mb-6">{t('supportPage.avgResponseTime')}</p>
                <div className="text-5xl font-bold text-accent mb-2">98%</div>
                <p className="text-xl text-gray-300">{t('supportPage.satisfaction')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-accent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            {t('supportPage.ctaTitle')}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {t('supportPage.ctaDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/registreer" className="bg-white text-accent px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all">
              {t('supportPage.ctaStart')}
            </a>
            <a href="/" className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white hover:text-accent transition-all">
              {t('supportPage.ctaBack')}
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
