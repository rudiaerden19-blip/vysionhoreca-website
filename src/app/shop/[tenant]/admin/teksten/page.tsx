'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface TenantTexts {
  hero_title?: string
  hero_subtitle?: string
  about_title?: string
  about_text?: string
  order_button_text?: string
  pickup_label?: string
  delivery_label?: string
  closed_message?: string
  min_order_message?: string
  cart_empty_message?: string
  checkout_button_text?: string
}

export default function TekstenPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [texts, setTexts] = useState<TenantTexts>({
    hero_title: '',
    hero_subtitle: '',
    about_title: 'Ons verhaal',
    about_text: '',
    order_button_text: 'Bestel Nu',
    pickup_label: 'Afhalen',
    delivery_label: 'Levering',
    closed_message: 'Momenteel gesloten',
    min_order_message: 'Minimum bestelbedrag: €{amount}',
    cart_empty_message: 'Je winkelwagen is leeg',
    checkout_button_text: 'Afrekenen',
  })

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const { data, error } = await supabase
        .from('tenant_texts')
        .select('*')
        .eq('tenant_slug', params.tenant)
        .single()
      
      if (data && !error) {
        setTexts({
          hero_title: data.hero_title || '',
          hero_subtitle: data.hero_subtitle || '',
          about_title: data.about_title || 'Ons verhaal',
          about_text: data.about_text || '',
          order_button_text: data.order_button_text || 'Bestel Nu',
          pickup_label: data.pickup_label || 'Afhalen',
          delivery_label: data.delivery_label || 'Levering',
          closed_message: data.closed_message || 'Momenteel gesloten',
          min_order_message: data.min_order_message || 'Minimum bestelbedrag: €{amount}',
          cart_empty_message: data.cart_empty_message || 'Je winkelwagen is leeg',
          checkout_button_text: data.checkout_button_text || 'Afrekenen',
        })
      }
      setLoading(false)
    }
    loadData()
  }, [params.tenant])

  const handleChange = (key: string, value: string) => {
    setTexts(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    
    const { error } = await supabase
      .from('tenant_texts')
      .upsert({
        tenant_slug: params.tenant,
        ...texts,
      }, { onConflict: 'tenant_slug' })
    
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      alert('Opslaan mislukt: ' + error.message)
    }
    
    setSaving(false)
  }

  const textFields: { section: string; icon: string; fields: { key: string; label: string; placeholder: string; multiline?: boolean }[] }[] = [
    { section: t('websiteTexts.buttons'), icon: '🔘', fields: [
      { key: 'order_button_text', label: t('websiteTexts.orderButton'), placeholder: t('websiteTexts.orderButtonPlaceholder') },
      { key: 'pickup_label', label: t('websiteTexts.pickupLabel'), placeholder: t('websiteTexts.pickupPlaceholder') },
      { key: 'delivery_label', label: t('websiteTexts.deliveryLabel'), placeholder: t('websiteTexts.deliveryPlaceholder') },
      { key: 'checkout_button_text', label: t('websiteTexts.checkoutButton'), placeholder: t('websiteTexts.checkoutPlaceholder') },
    ]},
    { section: t('websiteTexts.messages'), icon: '💬', fields: [
      { key: 'closed_message', label: t('websiteTexts.closedMessage'), placeholder: t('websiteTexts.closedPlaceholder') },
      { key: 'min_order_message', label: t('websiteTexts.minOrderMessage'), placeholder: t('websiteTexts.minOrderPlaceholder') },
      { key: 'cart_empty_message', label: t('websiteTexts.cartEmptyMessage'), placeholder: t('websiteTexts.cartEmptyPlaceholder') },
    ]},
  ]

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
    <div className="max-w-3xl mx-auto pb-24">
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
        {saving ? `⏳ ${t('adminPages.common.saving')}` : saved ? `✓ ${t('adminPages.common.saved')}` : `💾 ${t('adminPages.common.save')}`}
      </motion.button>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('websiteTexts.title')}</h1>
          <p className="text-gray-500">{t('websiteTexts.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-6">
        {textFields.map((section, sectionIndex) => (
          <motion.div
            key={section.section}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>{section.icon}</span> {section.section}
            </h2>
            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                  </label>
                  {field.multiline ? (
                    <textarea
                      value={texts[field.key as keyof TenantTexts] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={texts[field.key as keyof TenantTexts] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6"
      >
        <h3 className="font-semibold text-blue-900 mb-2">💡 {t('websiteTexts.tip')}</h3>
        <p className="text-blue-700 text-sm">
          {t('websiteTexts.tipText')}
        </p>
      </motion.div>
    </div>
  )
}
