'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ScradaPage() {
  const { t } = useLanguage()
  const params = useParams()
  const tenant = params.tenant as string
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Check actual subscription status
  useEffect(() => {
    async function checkSubscription() {
      if (!supabase) {
        setIsPremium(true) // Fallback: assume premium if no supabase
        setLoading(false)
        return
      }
      
      const { data } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('tenant_slug', tenant)
        .eq('status', 'active')
        .single()
      
      // Premium plans that include SCRADA
      const premiumPlans = ['premium', 'enterprise', 'pro']
      setIsPremium(data ? premiumPlans.includes(data.plan?.toLowerCase()) : false)
      setLoading(false)
    }
    
    checkSubscription()
  }, [tenant])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isPremium) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-4">📊 {t('scradaPage.title')}</h1>
          <p className="text-lg opacity-90 mb-6">
            {t('scradaPage.subtitle')}
          </p>
          <div className="bg-white/20 backdrop-blur rounded-xl p-6">
            <p className="text-xl font-semibold mb-4">🔒 {t('scradaPage.premiumFeature')}</p>
            <p className="mb-4">
              {t('scradaPage.upgradeText')}
            </p>
            <ul className="space-y-2 mb-6">
              <li>✅ {t('scradaPage.features.dailyReceipts')}</li>
              <li>✅ {t('scradaPage.features.cashBook')}</li>
              <li>✅ {t('scradaPage.features.peppolInbox')}</li>
              <li>✅ {t('scradaPage.features.sendInvoices')}</li>
              <li>✅ {t('scradaPage.features.paymentProviders')}</li>
              <li>✅ {t('scradaPage.features.legalCompliant')}</li>
            </ul>
            <a
              href="https://www.vysionhoreca.com/prijzen"
              className="inline-block px-6 py-3 bg-white text-orange-600 font-bold rounded-lg hover:bg-gray-100 transition"
            >
              {t('scradaPage.upgradeToPremium')} →
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center">
            <span className="text-3xl">📊</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold">SCRADA</h1>
            <p className="opacity-90">{t('scradaPage.headerSubtitle')}</p>
          </div>
        </div>
        <p className="text-lg opacity-90">
          {t('scradaPage.headerDescription')}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a
          href="https://my.scrada.be"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-lg hover:border-red-300 transition group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-200 transition">
              <span className="text-2xl">🚀</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">{t('scradaPage.openDashboard')}</h3>
              <p className="text-gray-600">{t('scradaPage.goToDailyReceipts')}</p>
            </div>
            <div className="ml-auto text-gray-400 group-hover:text-red-500 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </div>
        </a>

        <a
          href="https://my.scrada.be/invoices"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-lg hover:border-blue-300 transition group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition">
              <span className="text-2xl">📄</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">{t('scradaPage.peppolInvoices')}</h3>
              <p className="text-gray-600">{t('scradaPage.sendReceiveInvoices')}</p>
            </div>
            <div className="ml-auto text-gray-400 group-hover:text-blue-500 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </div>
        </a>
      </div>

      {/* Features */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-xl font-bold text-gray-800 mb-4">✅ {t('scradaPage.whatIsIncluded')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span>📒</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">{t('scradaPage.features.dailyReceipts')}</h4>
              <p className="text-sm text-gray-600">{t('scradaPage.dailyReceiptsDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span>💵</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">{t('scradaPage.features.cashBook')}</h4>
              <p className="text-sm text-gray-600">{t('scradaPage.cashBookDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span>📨</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">{t('scradaPage.features.peppolInbox')}</h4>
              <p className="text-sm text-gray-600">{t('scradaPage.peppolInboxDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span>📤</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">{t('scradaPage.sendInvoicesTitle')}</h4>
              <p className="text-sm text-gray-600">{t('scradaPage.sendInvoicesDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span>💳</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">{t('scradaPage.paymentMethods')}</h4>
              <p className="text-sm text-gray-600">{t('scradaPage.paymentMethodsDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span>📊</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">{t('scradaPage.exportAccounting')}</h4>
              <p className="text-sm text-gray-600">{t('scradaPage.exportAccountingDesc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Help */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-bold text-blue-800 mb-2">💡 {t('scradaPage.needHelp')}</h3>
        <p className="text-blue-700 mb-4">
          {t('scradaPage.helpDescription')}
        </p>
        <div className="flex gap-3">
          <a
            href="https://help.scrada.be"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            📚 {t('scradaPage.documentation')}
          </a>
          <a
            href="mailto:support@scrada.be"
            className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition"
          >
            📧 {t('scradaPage.contactSupport')}
          </a>
        </div>
      </div>

      {/* Legal Note */}
      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
        <p>
          <strong>ℹ️ {t('scradaPage.important')}:</strong> {t('scradaPage.legalNote')}
        </p>
      </div>
    </div>
  )
}
