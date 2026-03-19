'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getDeliverySettings, saveDeliverySettings, DeliverySettings } from '@/lib/admin-api'
import { useLanguage } from '@/i18n'

export default function LeveringPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [settings, setSettings] = useState<DeliverySettings>({
    tenant_slug: params.tenant,
    pickup_enabled: true,
    pickup_time_minutes: 15,
    delivery_enabled: true,
    delivery_fee: 2.50,
    min_order_amount: 15,
    delivery_radius_km: 5,
    delivery_time_minutes: 30,
    payment_cash: true,
    payment_card: true,
    payment_online: false,
  })

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const data = await getDeliverySettings(params.tenant)
      if (data) {
        setSettings(data)
      }
      setLoading(false)
    }
    loadData()
  }, [params.tenant])

  const handleChange = (field: keyof DeliverySettings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    setSaved(false)
    setError('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    
    const success = await saveDeliverySettings(settings)
    
    if (success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError(t('adminPages.common.saveFailed'))
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">{t('adminPages.common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Floating Save Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSave}
        disabled={saving}
        className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl font-medium shadow-2xl flex items-center gap-2 ${
          saved ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {saving ? (
          <>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            <span>{t('adminPages.common.saving')}</span>
          </>
        ) : saved ? (
          <><span>✓</span><span>{t('adminPages.common.saved')}</span></>
        ) : (
          <><span>💾</span><span>{t('adminPages.common.save')}</span></>
        )}
      </motion.button>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adminPages.levering.title')}</h1>
          <p className="text-gray-500">{t('adminPages.levering.subtitle')}</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Pickup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🛍️</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('adminPages.levering.pickup.title')}</h2>
                <p className="text-gray-500 text-sm">{t('adminPages.levering.pickup.enabled')}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.pickup_enabled}
                onChange={(e) => handleChange('pickup_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          {settings.pickup_enabled && (
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('adminPages.levering.pickup.time')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.pickup_time_minutes || ''}
                  onChange={(e) => handleChange('pickup_time_minutes', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Delivery */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🚗</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('adminPages.levering.delivery.title')}</h2>
                <p className="text-gray-500 text-sm">{t('adminPages.levering.delivery.enabled')}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.delivery_enabled}
                onChange={(e) => handleChange('delivery_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          {settings.delivery_enabled && (
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('adminPages.levering.delivery.time')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.delivery_time_minutes || ''}
                  onChange={(e) => handleChange('delivery_time_minutes', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('adminPages.levering.delivery.fee')}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.delivery_fee || ''}
                    onChange={(e) => handleChange('delivery_fee', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('adminPages.levering.delivery.radius')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.delivery_radius_km || ''}
                  onChange={(e) => handleChange('delivery_radius_km', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('adminPages.levering.delivery.minOrder')}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.min_order_amount || ''}
                    onChange={(e) => handleChange('min_order_amount', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span>💳</span> {t('adminPages.betaling.methods')}
          </h2>
          
          <div className="space-y-2">
            {[
              { key: 'payment_cash', icon: '💵', label: t('adminPages.betaling.cash'), desc: t('adminPages.betaling.cashDesc') },
              { key: 'payment_card', icon: '💳', label: t('adminPages.betaling.bancontact'), desc: t('adminPages.betaling.bancontactDesc') },
              { key: 'payment_online', icon: '🌐', label: 'Online betaling', desc: 'Betaling via link of QR-code' },
            ].map(({ key, icon, label, desc }) => {
              const val = !!(settings as any)[key]
              return (
                <div
                  key={key}
                  onClick={() => handleChange(key as any, !val)}
                  className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${val ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{label}</p>
                      <p className="text-sm text-gray-400">{desc}</p>
                    </div>
                  </div>
                  <button type="button" className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${val ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${val ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-50 border border-blue-200 rounded-2xl p-5"
        >
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">📋 Overzicht instellingen</p>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span>🛍️</span>
                <span className="font-medium text-gray-900 text-sm">{t('adminPages.levering.pickup.title')}</span>
              </div>
              <p className="text-gray-500 text-sm">
                {settings.pickup_enabled ? `${settings.pickup_time_minutes} min` : t('adminPages.common.disabled')}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span>🚗</span>
                <span className="font-medium text-gray-900 text-sm">{t('adminPages.levering.delivery.title')}</span>
              </div>
              <p className="text-gray-500 text-sm">
                {settings.delivery_enabled ? `€${settings.delivery_fee} · ${settings.delivery_radius_km}km` : t('adminPages.common.disabled')}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span>💳</span>
                <span className="font-medium text-gray-900 text-sm">{t('adminPages.betaling.methods')}</span>
              </div>
              <p className="text-gray-500 text-sm">
                {[
                  settings.payment_cash && t('adminPages.betaling.cash'),
                  settings.payment_card && t('adminPages.betaling.bancontact'),
                  settings.payment_online && 'Online',
                ].filter(Boolean).join(', ') || '-'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
