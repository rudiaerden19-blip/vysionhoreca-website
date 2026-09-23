'use client'

import { Suspense, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/i18n'
import { supabase } from '@/lib/supabase'
import { adminDb } from '@/lib/admin-db-client'
import PinGate from '@/components/PinGate'
import { KassaPaymentTerminalsAdmin } from '@/components/KassaPaymentTerminalsAdmin'

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
  const [stripeSecretKey, setStripeSecretKey] = useState('')
  const [stripePublicKey, setStripePublicKey] = useState('')
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('')
  const [savingStripe, setSavingStripe] = useState(false)
  const [savedStripe, setSavedStripe] = useState(false)
  const [showStripeKeys, setShowStripeKeys] = useState(false)
  const [stripeSecretsLoaded, setStripeSecretsLoaded] = useState(false)

  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant])

  async function loadSettings() {
    const { data } = await supabase
      .from('tenant_settings')
      .select('payment_methods, btw_percentage, stripe_public_key')
      .eq('tenant_slug', params.tenant)
      .single()

    const secretRes = await adminDb.select<{
      stripe_secret_key?: string | null
      stripe_webhook_secret?: string | null
      stripe_public_key?: string | null
      btw_percentage?: number | null
      payment_methods?: string[] | null
    }>('tenant_settings', {
      tenantSlug: params.tenant,
      select: 'payment_methods, btw_percentage, stripe_public_key, stripe_secret_key, stripe_webhook_secret',
      match: { tenant_slug: params.tenant },
      single: 'maybe',
    })
    const secrets = secretRes.ok ? secretRes.data : null
    if (secretRes.ok) setStripeSecretsLoaded(true)

    if (data || secrets) {
      const btw = secrets?.btw_percentage ?? data?.btw_percentage
      if (btw) setVatRate(btw)

      const publicKey = secrets?.stripe_public_key || data?.stripe_public_key
      if (publicKey) setStripePublicKey(publicKey)
      if (secrets?.stripe_secret_key) setStripeSecretKey(secrets.stripe_secret_key)
      if (secrets?.stripe_webhook_secret) setStripeWebhookSecret(secrets.stripe_webhook_secret)

      // Load payment methods
      const paymentMethods = secrets?.payment_methods ?? data?.payment_methods
      if (paymentMethods && Array.isArray(paymentMethods)) {
        const loadedMethods: {[key: string]: boolean} = {
          cash: false,
          bancontact: false,
          visa: false,
          mastercard: false,
          paypal: false,
          ideal: false,
        }
        paymentMethods.forEach((method: string) => {
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

    const savedRes = await adminDb.update(
      'tenant_settings',
      {
        payment_methods: enabledMethods,
        btw_percentage: vatRate,
      },
      { tenant_slug: params.tenant },
      { tenantSlug: params.tenant },
    )

    if (!savedRes.ok) {
      console.error('Error saving payment settings:', savedRes.error)
      alert(t('adminPages.common.saveFailed'))
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }

    setSaving(false)
  }

  const handleSaveStripe = async () => {
    setSavingStripe(true)
    const patch: Record<string, string | null> = {
      stripe_public_key: stripePublicKey || null,
    }
    if (stripeSecretsLoaded) {
      patch.stripe_secret_key = stripeSecretKey.trim() || null
      patch.stripe_webhook_secret = stripeWebhookSecret.trim() || null
    } else {
      if (stripeSecretKey.trim()) patch.stripe_secret_key = stripeSecretKey.trim()
      if (stripeWebhookSecret.trim()) patch.stripe_webhook_secret = stripeWebhookSecret.trim()
    }
    const savedRes = await adminDb.update(
      'tenant_settings',
      patch,
      { tenant_slug: params.tenant },
      { tenantSlug: params.tenant },
    )
    if (savedRes.ok) {
      setSavedStripe(true)
      setTimeout(() => setSavedStripe(false), 2000)
    }
    setSavingStripe(false)
  }

  const paymentMethods = [
    { id: 'cash', name: t('adminPages.betaling.cash'), icon: '', description: t('adminPages.betaling.cashDesc') },
    { id: 'bancontact', name: t('adminPages.betaling.bancontact'), icon: '', description: t('adminPages.betaling.bancontactDesc') },
    { id: 'visa', name: t('adminPages.betaling.visa'), icon: '', description: t('adminPages.betaling.visaDesc') },
    { id: 'mastercard', name: t('adminPages.betaling.mastercard'), icon: '', description: t('adminPages.betaling.mastercardDesc') },
    { id: 'paypal', name: t('adminPages.betaling.paypal'), icon: '', description: t('adminPages.betaling.paypalDesc') },
    { id: 'ideal', name: t('adminPages.betaling.ideal'), icon: '', description: t('adminPages.betaling.idealDesc') },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
      <PinGate tenant={params.tenant}>
      <div className="max-w-3xl mx-auto pb-24">
      {/* Floating Save Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSave}
        disabled={saving}
        className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl font-medium shadow-2xl flex items-center gap-2 ${
          saved ? 'bg-green-500 text-white': 'bg-black hover:bg-neutral-900 text-white'
        }`}
      >
        {saving ? '' : saved ? '' : ''} {saved ? t('adminPages.common.saved') : t('adminPages.common.save')}
      </motion.button>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adminPages.betaling.title')}</h1>
          <p className="text-gray-500">{t('adminPages.betaling.subtitle')}</p>
        </div>
      </div>

      {/* Payment Methods */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-sm mb-6"
      >
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4"> {t('adminPages.betaling.methods')}</p>
        <div className="space-y-2">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              onClick={() => setMethods(prev => ({ ...prev, [method.id]: !prev[method.id] }))}
              className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${
                methods[method.id]
                  ? 'bg-gray-100 border-2 border-black'
                  : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{method.icon}</span>
                <div>
                  <p className="font-medium text-gray-900">{method.name}</p>
                  <p className="text-sm text-gray-400">{method.description}</p>
                </div>
              </div>
              <button
                type="button"
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${methods[method.id] ? 'bg-black': 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${methods[method.id] ? 'translate-x-6': 'translate-x-0'}`} />
              </button>
            </div>
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
          <span></span> {t('adminPages.betaling.vat')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[6, 9, 12, 21].map((rate) => (
            <button
              key={rate}
              onClick={() => setVatRate(rate)}
              className={`p-4 rounded-xl font-bold text-xl transition-all ${
                vatRate === rate 
                  ? 'bg-black text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {rate}%
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-4">
           {t('adminPages.betaling.vatRate')}
        </p>
      </motion.div>

      {/* Stripe Online Betalingen */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 bg-white rounded-2xl shadow-sm overflow-hidden"
      >
        <button
          onClick={() => setShowStripeKeys(v => !v)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl"></span>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Stripe — Online betalingen</p>
              <p className="text-sm text-gray-500">{stripeSecretKey ? 'Geconfigureerd': 'Voer je Stripe keys in om online betalingen te activeren'}</p>
            </div>
          </div>
          <span className="text-gray-400">{showStripeKeys ? '−' : '+'}</span>
        </button>

        {showStripeKeys && (
          <div className="px-6 pb-6 space-y-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 pt-4">
              Maak een account op <a href="https://stripe.com" target="_blank" className="text-gray-900 underline">stripe.com</a> en kopieer je keys hieronder. Bancontact en kaartebetalingen worden automatisch verwerkt.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Publishable Key <span className="text-gray-400">(pk_live_...)</span></label>
              <input
                type="text"
                value={stripePublicKey}
                onChange={e => setStripePublicKey(e.target.value)}
                placeholder="pk_live_..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key <span className="text-gray-400">(sk_live_...)</span></label>
              <input
                type="password"
                value={stripeSecretKey}
                onChange={e => setStripeSecretKey(e.target.value)}
                placeholder="sk_live_..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret <span className="text-gray-400">(whsec_...)</span></label>
              <input
                type="password"
                value={stripeWebhookSecret}
                onChange={e => setStripeWebhookSecret(e.target.value)}
                placeholder="whsec_..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Webhook URL: <span className="font-mono">https://jouwdomein.com/api/stripe-webhook</span></p>
            </div>

            <button
              onClick={handleSaveStripe}
              disabled={savingStripe}
              className={`w-full py-3 rounded-xl font-semibold transition-colors ${savedStripe ? 'bg-green-500 text-white': 'bg-black hover:bg-neutral-900 text-white'}`}
            >
              {savingStripe ? 'Opslaan...': savedStripe ? 'Opgeslagen': 'Stripe keys opslaan'}
            </button>
          </div>
        )}
      </motion.div>

      <Suspense fallback={null}>
        <KassaPaymentTerminalsAdmin tenantSlug={params.tenant} />
      </Suspense>
    </div>
      </PinGate>
  )
}
