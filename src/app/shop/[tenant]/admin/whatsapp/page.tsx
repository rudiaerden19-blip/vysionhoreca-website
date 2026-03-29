'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/i18n'
import Link from 'next/link'
import QRCode from '@/components/QRCode'

interface WhatsAppSettings {
  id?: string
  tenant_slug: string
  phone_number_id: string
  access_token: string
  business_account_id: string
  whatsapp_number: string  // The actual phone number for QR code
  is_active: boolean
  welcome_message: string
  order_confirmation_message: string
  ready_message: string
}

export default function WhatsAppSettingsPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showTokens, setShowTokens] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Partial<WhatsAppSettings>>({
    phone_number_id: '',
    access_token: '',
    business_account_id: '',
    whatsapp_number: '',
    is_active: false,
    welcome_message: 'Welkom! Typ "menu" om onze menukaart te bekijken.',
    order_confirmation_message: 'Je bestelling is ontvangen! We laten je weten wanneer het klaar is.',
    ready_message: 'Je bestelling is klaar! Je kunt het nu ophalen.'
  })
  
  // QR Code ref for printing
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSettings()
  }, [params.tenant])

  async function loadSettings() {
    try {
      const response = await fetch(`/api/whatsapp/settings?tenant=${params.tenant}`)
      const result = await response.json()

      if (result.data) {
        setSettings(result.data)
        setFormData(result.data)
      }
    } catch (err) {
      // No settings yet, that's fine
    }

    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)

    try {
      const saveData = {
        ...formData,
        tenant_slug: params.tenant
      }

      const response = await fetch('/api/whatsapp/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || t('whatsappPage.saveFailed'))
      }

      if (result.data) {
        setSettings(result.data)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message || t('whatsappPage.saveError'))
    }

    setSaving(false)
  }

  async function testConnection() {
    if (!formData.phone_number_id || !formData.access_token) {
      setError(t('whatsappPage.fillCredentials'))
      return
    }

    setError('')
    setSaving(true)

    try {
      const response = await fetch(
        `https://graph.facebook.com/v24.0/${formData.phone_number_id}`,
        {
          headers: {
            'Authorization': `Bearer ${formData.access_token}`
          }
        }
      )

      const data = await response.json()

      if (response.ok) {
        alert(`✅ ${t('whatsappPage.connectionSuccess')}\n\nVerified Phone Number: ${data.verified_name || data.display_phone_number || 'OK'}`)
      } else {
        throw new Error(data.error?.message || t('whatsappPage.connectionFailed'))
      }
    } catch (err: any) {
      setError(`${t('whatsappPage.connectionFailed')}: ${err.message}`)
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vysionhoreca.com'}/api/whatsapp/webhook`

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">💬</span>
          <h1 className="text-2xl font-bold text-gray-900">{t('whatsappPage.title')}</h1>
          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full">
            PRO
          </span>
        </div>
        <p className="text-gray-500">
          {t('whatsappPage.subtitle')}
        </p>
      </div>

      {/* Status Card */}
      <div className={`mb-8 p-6 rounded-2xl ${formData.is_active ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50 border-2 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${formData.is_active ? 'bg-green-500' : 'bg-gray-400'}`}>
              {formData.is_active ? '✅' : '⏸️'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {formData.is_active ? t('whatsappPage.statusActive') : t('whatsappPage.statusInactive')}
              </h2>
              <p className="text-gray-600">
                {formData.is_active 
                  ? t('whatsappPage.statusActiveDesc')
                  : t('whatsappPage.statusInactiveDesc')}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-14 h-8 bg-gray-300 peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
          </label>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-3">
          <span className="text-xl">❌</span>
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 flex items-center gap-3">
          <span className="text-xl">✅</span>
          {t('whatsappPage.savedSuccess')}
        </div>
      )}

      {/* Setup Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
        <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
          <span>📋</span> {t('whatsappPage.setupTitle')}
        </h3>
        <ol className="space-y-3 text-blue-800">
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</span>
            <span>{t('whatsappPage.setupStep1')}</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</span>
            <span>{t('whatsappPage.setupStep2')}</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</span>
            <span>{t('whatsappPage.setupStep3')}</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">4</span>
            <span>{t('whatsappPage.setupStep4')}</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">5</span>
            <span>{t('whatsappPage.setupStep5')}</span>
          </li>
        </ol>
      </div>

      {/* Webhook URL */}
      <div className="bg-gray-900 text-white rounded-2xl p-6 mb-8">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <span>🔗</span> {t('whatsappPage.webhookTitle')}
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={webhookUrl}
            readOnly
            className="flex-1 bg-gray-800 px-4 py-3 rounded-xl text-sm font-mono"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(webhookUrl)
              alert(t('whatsappPage.webhookCopied'))
            }}
            className="px-4 py-3 bg-green-500 hover:bg-green-600 rounded-xl font-bold"
          >
            📋 {t('whatsappPage.copyLink')}
          </button>
        </div>
        <p className="text-gray-400 text-sm mt-3">
          Verify Token: <code className="bg-gray-800 px-2 py-1 rounded">{process.env.WHATSAPP_VERIFY_TOKEN || 'vysion_whatsapp_verify_2024'}</code>
        </p>
      </div>

      {/* API Credentials */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>🔑</span> {t('whatsappPage.apiSettings')}
          </h3>
          <button
            onClick={() => setShowTokens(!showTokens)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {showTokens ? `🙈 ${t('whatsappPage.hideTokens')}` : `👁️ ${t('whatsappPage.showTokens')}`}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number ID *
            </label>
            <input
              type={showTokens ? 'text' : 'password'}
              value={formData.phone_number_id}
              onChange={(e) => setFormData(prev => ({ ...prev, phone_number_id: e.target.value }))}
              placeholder="123456789012345"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('whatsappPage.phoneNumberIdHint')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permanent Access Token *
            </label>
            <input
              type={showTokens ? 'text' : 'password'}
              value={formData.access_token}
              onChange={(e) => setFormData(prev => ({ ...prev, access_token: e.target.value }))}
              placeholder="EAAxxxxxxx..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('whatsappPage.accessTokenHint')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('whatsappPage.businessAccountId')}
            </label>
            <input
              type="text"
              value={formData.business_account_id}
              onChange={(e) => setFormData(prev => ({ ...prev, business_account_id: e.target.value }))}
              placeholder="123456789012345"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={testConnection}
            disabled={saving}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2"
          >
            {saving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full"
              />
            ) : (
              <>
                <span>🔌</span> {t('whatsappPage.testConnection')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Custom Messages */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span>💬</span> {t('whatsappPage.autoMessages')}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('whatsappPage.welcomeMsg')}
            </label>
            <textarea
              value={formData.welcome_message}
              onChange={(e) => setFormData(prev => ({ ...prev, welcome_message: e.target.value }))}
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('whatsappPage.confirmMsg')}
            </label>
            <textarea
              value={formData.order_confirmation_message}
              onChange={(e) => setFormData(prev => ({ ...prev, order_confirmation_message: e.target.value }))}
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('whatsappPage.readyMsg')}
            </label>
            <textarea
              value={formData.ready_message}
              onChange={(e) => setFormData(prev => ({ ...prev, ready_message: e.target.value }))}
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>
        </div>
      </div>

      {/* WhatsApp Number for QR */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📞</span> {t('whatsappPage.numberTitle')}
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('whatsappPage.numberLabel')}
          </label>
          <input
            type="tel"
            value={formData.whatsapp_number}
            onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_number: e.target.value.replace(/[^0-9+]/g, '') }))}
            placeholder="+32475123456"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('whatsappPage.numberHint')}
          </p>
        </div>
      </div>

      {/* QR Code Preview */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📱</span> {t('whatsappPage.qrTitle')}
        </h3>
        <p className="text-gray-500 mb-4">
          {t('whatsappPage.qrDesc')}
        </p>
        
        {formData.whatsapp_number && formData.whatsapp_number.length > 8 ? (
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* QR Code */}
            <div ref={qrRef} className="bg-white p-6 rounded-2xl shadow-lg border-2 border-gray-100">
              <div className="text-center mb-4">
                <span className="text-4xl">💬</span>
                <h4 className="font-bold text-gray-900 mt-2">{t('whatsappPage.scanToOrder')}</h4>
              </div>
              <QRCode 
                url={`https://wa.me/${formData.whatsapp_number.replace(/[^0-9]/g, '')}?text=BESTEL`}
                size={200}
                className="mx-auto"
              />
              <p className="text-center text-sm text-gray-500 mt-4">
                {t('whatsappPage.viaWhatsApp')}
              </p>
            </div>

            {/* Actions */}
            <div className="flex-1 space-y-4">
              <div className="bg-green-50 p-4 rounded-xl">
                <h4 className="font-bold text-green-800 mb-2">✅ {t('whatsappPage.qrReady')}</h4>
                <p className="text-sm text-green-700">
                  {t('whatsappPage.qrReadyDesc')}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Link:</strong>
                </p>
                <a 
                  href={`https://wa.me/${formData.whatsapp_number?.replace(/[^0-9]/g, '')}?text=BESTEL`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-white px-3 py-2 rounded-lg block break-all text-blue-600 hover:text-blue-800 hover:underline"
                >
                  https://wa.me/{formData.whatsapp_number?.replace(/[^0-9]/g, '')}?text=BESTEL
                </a>
              </div>

              <div className="flex gap-3">
                <a
                  href={`https://wa.me/${formData.whatsapp_number?.replace(/[^0-9]/g, '')}?text=BESTEL`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-green-100 hover:bg-green-200 text-green-800 rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  🔗 {t('whatsappPage.openLink')}
                </a>
                <button
                  onClick={() => {
                    const link = `https://wa.me/${formData.whatsapp_number?.replace(/[^0-9]/g, '')}?text=BESTEL`
                    navigator.clipboard.writeText(link)
                    alert(t('whatsappPage.linkCopied'))
                  }}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  📋 {t('whatsappPage.copyLink')}
                </button>
                <button
                  onClick={() => {
                    if (qrRef.current) {
                      const printWindow = window.open('', '_blank')
                      if (printWindow) {
                        printWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <title>WhatsApp QR Code</title>
                              <style>
                                body { 
                                  display: flex; 
                                  justify-content: center; 
                                  align-items: center; 
                                  min-height: 100vh; 
                                  margin: 0;
                                  font-family: Arial, sans-serif;
                                }
                                .container {
                                  text-align: center;
                                  padding: 40px;
                                }
                                h1 { font-size: 24px; margin-bottom: 20px; }
                                p { color: #666; margin-top: 20px; }
                              </style>
                            </head>
                            <body>
                              <div class="container">
                                <h1>💬 {t('whatsappPage.scanToOrder')}</h1>
                                ${qrRef.current.innerHTML}
                                <p>Bestel via WhatsApp</p>
                              </div>
                            </body>
                          </html>
                        `)
                        printWindow.document.close()
                        printWindow.focus()
                        setTimeout(() => {
                          printWindow.print()
                          printWindow.close()
                        }, 500)
                      }
                    }
                  }}
                  className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  🖨️ {t('whatsappPage.printQr')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-8 bg-gray-50 rounded-xl">
            <div className="text-center">
              <div className="w-48 h-48 bg-white border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-4xl">📱</span>
              </div>
              <p className="text-sm text-gray-500">
                {t('whatsappPage.fillNumberFirst')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Link
          href={`/shop/${params.tenant}/admin`}
          className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
        >
          {t('common.cancel')}
        </Link>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center gap-2"
        >
          {saving ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
            />
          ) : (
            <>
              <span>💾</span> {t('common.save')}
            </>
          )}
        </motion.button>
      </div>
    </div>
  )
}
