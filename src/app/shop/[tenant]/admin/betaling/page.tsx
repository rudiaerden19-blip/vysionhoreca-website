'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/i18n'
import { supabase } from '@/lib/supabase'

export default function BetalingPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [methods, setMethods] = useState<{[key: string]: boolean}>({
    cash: true,
    bancontact: true,
    visa: false,
    mastercard: false,
    paypal: false,
    ideal: false,
  })
  const [vatRate, setVatRate] = useState(6)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant])

  async function loadSettings() {
    const { data } = await supabase
      .from('tenant_settings')
      .select('payment_methods, btw_percentage')
      .eq('tenant_slug', params.tenant)
      .single()

    if (data) {
      // Load BTW percentage
      if (data.btw_percentage) {
        setVatRate(data.btw_percentage)
      }

      // Load payment methods
      if (data.payment_methods && Array.isArray(data.payment_methods)) {
        const loadedMethods: {[key: string]: boolean} = {
          cash: false,
          bancontact: false,
          visa: false,
          mastercard: false,
          paypal: false,
          ideal: false,
        }
        data.payment_methods.forEach((method: string) => {
          if (method in loadedMethods) {
            loadedMethods[method] = true
          }
        })
        setMethods(loadedMethods)
      }
    }

    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    // Convert methods object to array of enabled methods
    const enabledMethods = Object.entries(methods)
      .filter(([_, enabled]) => enabled)
      .map(([method]) => method)

    const { error } = await supabase
      .from('tenant_settings')
      .update({
        payment_methods: enabledMethods,
        btw_percentage: vatRate
      })
      .eq('tenant_slug', params.tenant)

    if (error) {
      console.error('Error saving payment settings:', error)
      alert('Fout bij opslaan. Voer eerst de SQL migratie uit.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }

    setSaving(false)
  }

  const paymentMethods = [
    { id: 'cash', name: t('adminPages.betaling.cash'), icon: '💵', description: t('adminPages.betaling.cashDesc') },
    { id: 'bancontact', name: t('adminPages.betaling.bancontact'), icon: '💳', description: t('adminPages.betaling.bancontactDesc') },
    { id: 'visa', name: t('adminPages.betaling.visa'), icon: '💳', description: t('adminPages.betaling.visaDesc') },
    { id: 'mastercard', name: t('adminPages.betaling.mastercard'), icon: '💳', description: t('adminPages.betaling.mastercardDesc') },
    { id: 'paypal', name: t('adminPages.betaling.paypal'), icon: '🅿️', description: t('adminPages.betaling.paypalDesc') },
    { id: 'ideal', name: t('adminPages.betaling.ideal'), icon: '🏦', description: t('adminPages.betaling.idealDesc') },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adminPages.betaling.title')}</h1>
          <p className="text-gray-500">{t('adminPages.betaling.subtitle')}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
            saved 
              ? 'bg-green-500 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {saving ? '⏳' : saved ? '✓' : '💾'} {saved ? 'Opgeslagen!' : t('adminPages.common.save')}
        </motion.button>
      </div>

      {/* Payment Methods */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-sm mb-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>💳</span> {t('adminPages.betaling.methods')}
        </h2>
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <label 
              key={method.id}
              className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors ${
                methods[method.id] 
                  ? 'bg-blue-50 border-2 border-blue-500' 
                  : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{method.icon}</span>
                <div>
                  <p className="font-medium text-gray-900">{method.name}</p>
                  <p className="text-sm text-gray-500">{method.description}</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={methods[method.id] || false}
                onChange={(e) => setMethods(prev => ({ ...prev, [method.id]: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
      </motion.div>

      {/* VAT Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📊</span> {t('adminPages.betaling.vat')}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[6, 12, 21].map((rate) => (
            <button
              key={rate}
              onClick={() => setVatRate(rate)}
              className={`p-4 rounded-xl font-bold text-xl transition-all ${
                vatRate === rate 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {rate}%
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-4">
          💡 {t('adminPages.betaling.vatRate')}
        </p>
      </motion.div>

      {/* Online Payments Setup */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-6 text-white"
      >
        <h3 className="font-semibold text-lg mb-2">💡 Online Betalingen Activeren?</h3>
        <p className="text-white/80 mb-4">
          Wij kunnen Stripe of Mollie voor je instellen zodat klanten online kunnen betalen.
        </p>
        <a 
          href="mailto:info@vysionhoreca.com?subject=Online%20Betalingen%20Activeren"
          className="inline-block bg-white text-blue-600 font-medium px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors"
        >
          📧 Contact
        </a>
      </motion.div>
    </div>
  )
}
