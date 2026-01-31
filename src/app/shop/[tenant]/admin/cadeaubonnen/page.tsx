'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getGiftCards, GiftCard, getTenantSettings, saveTenantSettings, TenantSettings } from '@/lib/admin-api'
import { supabase } from '@/lib/supabase'

export default function CadeaubonnenPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [giftCards, setGiftCards] = useState<GiftCard[]>([])
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'instellingen' | 'bonnen'>('instellingen')
  const [showSecretKey, setShowSecretKey] = useState(false)
  
  const [formData, setFormData] = useState({
    gift_cards_enabled: false,
    stripe_public_key: '',
    stripe_secret_key: '',
  })

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant])

  async function loadData() {
    setLoading(true)
    const [settingsData, cardsData] = await Promise.all([
      getTenantSettings(params.tenant),
      getGiftCards(params.tenant),
    ])
    
    if (settingsData) {
      setSettings(settingsData)
      setFormData({
        gift_cards_enabled: settingsData.gift_cards_enabled || false,
        stripe_public_key: settingsData.stripe_public_key || '',
        stripe_secret_key: settingsData.stripe_secret_key || '',
      })
    }
    
    setGiftCards(cardsData)
    setLoading(false)
  }

  const handleSave = async () => {
    if (!settings) return
    
    setSaving(true)
    
    const updatedSettings: TenantSettings = {
      ...settings,
      gift_cards_enabled: formData.gift_cards_enabled,
      stripe_public_key: formData.stripe_public_key,
      stripe_secret_key: formData.stripe_secret_key,
    }
    
    const success = await saveTenantSettings(updatedSettings)
    
    if (success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      alert('Opslaan mislukt')
    }
    
    setSaving(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'used': return 'bg-gray-100 text-gray-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'pending_cash': return 'bg-blue-100 text-blue-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Actief'
      case 'used': return 'Gebruikt'
      case 'expired': return 'Verlopen'
      case 'pending_cash': return 'Wacht op cash'
      default: return 'In afwachting'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm -mx-4 px-4 py-4 mb-4 flex items-center justify-between border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('websiteGiftCards.title')}</h1>
          <p className="text-gray-500">{t('websiteGiftCards.subtitle')}</p>
        </div>
        {activeTab === 'instellingen' && (
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
            {saving ? t('adminPages.common.saving') : saved ? `✓ ${t('adminPages.common.saved')}` : `💾 ${t('adminPages.common.save')}`}
          </motion.button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('instellingen')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'instellingen' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ⚙️ {t('websiteGiftCards.settings')}
        </button>
        <button
          onClick={() => setActiveTab('bonnen')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'bonnen' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🎫 {t('websiteGiftCards.soldCards')} ({giftCards.filter(g => g.status === 'paid').length})
        </button>
      </div>

      {activeTab === 'instellingen' && (
        <div className="space-y-6">
          {/* Enable/Disable */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('websiteGiftCards.enableGiftCards')}</h2>
                <p className="text-gray-500 text-sm">{t('websiteGiftCards.enableGiftCardsDesc')}</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, gift_cards_enabled: !prev.gift_cards_enabled }))}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.gift_cards_enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.gift_cards_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </motion.div>

          {/* Stripe Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-2">💳 {t('websiteGiftCards.stripePayments')}</h2>
            <p className="text-gray-500 text-sm mb-6">
              {t('websiteGiftCards.stripeDesc')} 
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" className="text-blue-600 hover:underline ml-1">
                {t('websiteGiftCards.getApiKeys')} →
              </a>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('websiteGiftCards.publishableKey')} (pk_...)
                </label>
                <input
                  type="text"
                  value={formData.stripe_public_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, stripe_public_key: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="pk_live_..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('websiteGiftCards.secretKey')} (sk_...)
                </label>
                <div className="relative">
                  <input
                    type={showSecretKey ? 'text' : 'password'}
                    value={formData.stripe_secret_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, stripe_secret_key: e.target.value }))}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="sk_live_..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showSecretKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">🔒 {t('websiteGiftCards.keySecurelyStored')}</p>
              </div>
            </div>
          </motion.div>

          {/* Preview */}
          {formData.gift_cards_enabled && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6"
            >
              <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <span>👁️</span> Preview op website
              </h3>
              <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                <p className="text-sm text-blue-600 font-medium uppercase tracking-wider">Het perfecte cadeau</p>
                <h4 className="text-2xl font-bold text-gray-900 mt-1">Geef iemand een verrassing</h4>
                <p className="text-gray-600 mt-2">Bestel een cadeaubon en verras iemand met een heerlijke maaltijd</p>
                <button className="mt-4 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl">
                  🎁 Cadeaubon bestellen
                </button>
              </div>
            </motion.div>
          )}

          {/* How it works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-blue-50 border border-blue-200 rounded-2xl p-6"
          >
            <h3 className="font-semibold text-blue-900 mb-4">📋 {t('websiteGiftCards.howItWorks')}</h3>
            <ol className="text-blue-700 text-sm space-y-2">
              <li>1. {t('websiteGiftCards.step1')}</li>
              <li>2. {t('websiteGiftCards.step2')}</li>
              <li>3. {t('websiteGiftCards.step3')}</li>
              <li>4. {t('websiteGiftCards.step4')}</li>
              <li>5. {t('websiteGiftCards.step5')}</li>
            </ol>
          </motion.div>
        </div>
      )}

      {activeTab === 'bonnen' && (
        <div className="space-y-4">
          {giftCards.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-12 text-center shadow-sm"
            >
              <div className="text-6xl mb-4">🎁</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('websiteGiftCards.noGiftCards')}</h3>
              <p className="text-gray-500">{t('websiteGiftCards.noGiftCardsDesc')}</p>
            </motion.div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    €{giftCards.filter(g => g.status === 'paid').reduce((sum, g) => sum + g.remaining_amount, 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">{t('websiteGiftCards.openBalance')}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {giftCards.filter(g => g.status === 'paid').length}
                  </p>
                  <p className="text-sm text-gray-500">{t('websiteGiftCards.activeCards')}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                  <p className="text-2xl font-bold text-gray-600">
                    {giftCards.filter(g => g.status === 'used').length}
                  </p>
                  <p className="text-sm text-gray-500">{t('websiteGiftCards.redeemed')}</p>
                </div>
              </div>

              {/* List */}
              {giftCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl">
                      🎁
                    </div>
                    <div>
                      <p className="font-mono font-bold text-gray-900">{card.code}</p>
                      <p className="text-sm text-gray-500">
                        {card.recipient_email} • {card.occasion || 'Geen gelegenheid'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {card.status === 'pending_cash' && (
                      <button
                        onClick={async () => {
                          if (!confirm('Cash betaling ontvangen? Dit activeert de cadeaubon.')) return
                          
                          const { error } = await supabase
                            .from('gift_cards')
                            .update({ status: 'paid' })
                            .eq('id', card.id)
                          
                          if (!error) {
                            loadData()
                          } else {
                            alert('Activeren mislukt')
                          }
                        }}
                        className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        ✓ Cash ontvangen
                      </button>
                    )}
                    <div className="text-right">
                      <p className="font-bold text-gray-900">€{card.remaining_amount.toFixed(2)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(card.status)}`}>
                        {getStatusLabel(card.status)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
