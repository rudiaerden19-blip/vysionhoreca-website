'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'
import Link from 'next/link'

interface WhatsAppSettings {
  id?: string
  tenant_slug: string
  phone_number_id: string
  access_token: string
  business_account_id: string
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
    is_active: false,
    welcome_message: 'Welkom! Typ "menu" om onze menukaart te bekijken.',
    order_confirmation_message: 'Je bestelling is ontvangen! We laten je weten wanneer het klaar is.',
    ready_message: 'Je bestelling is klaar! Je kunt het nu ophalen.'
  })

  useEffect(() => {
    loadSettings()
  }, [params.tenant])

  async function loadSettings() {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('tenant_slug', params.tenant)
        .single()

      if (data) {
        setSettings(data)
        setFormData(data)
      }
    } catch (err) {
      // No settings yet, that's fine
    }

    setLoading(false)
  }

  async function handleSave() {
    if (!supabase) return

    setSaving(true)
    setError('')
    setSaved(false)

    try {
      const saveData = {
        ...formData,
        tenant_slug: params.tenant
      }

      if (settings?.id) {
        // Update existing
        const { error } = await supabase
          .from('whatsapp_settings')
          .update(saveData)
          .eq('id', settings.id)

        if (error) throw error
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('whatsapp_settings')
          .insert(saveData)
          .select()
          .single()

        if (error) throw error
        setSettings(data)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Er ging iets mis bij het opslaan')
    }

    setSaving(false)
  }

  async function testConnection() {
    if (!formData.phone_number_id || !formData.access_token) {
      setError('Vul eerst je Phone Number ID en Access Token in')
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
        alert(`✅ Verbinding succesvol!\n\nVerified Phone Number: ${data.verified_name || data.display_phone_number || 'OK'}`)
      } else {
        throw new Error(data.error?.message || 'Verbinding mislukt')
      }
    } catch (err: any) {
      setError(`Verbinding mislukt: ${err.message}`)
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

  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://vysionhoreca.com'}/api/whatsapp/webhook`

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">💬</span>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Bestellen</h1>
          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full">
            PRO
          </span>
        </div>
        <p className="text-gray-500">
          Laat klanten bestellen via WhatsApp. Orders komen automatisch in je keuken scherm.
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
                {formData.is_active ? 'WhatsApp Actief' : 'WhatsApp Uitgeschakeld'}
              </h2>
              <p className="text-gray-600">
                {formData.is_active 
                  ? 'Klanten kunnen nu bestellen via WhatsApp' 
                  : 'Schakel in om WhatsApp bestellingen te ontvangen'}
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
          Instellingen opgeslagen!
        </div>
      )}

      {/* Setup Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
        <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
          <span>📋</span> Setup Instructies
        </h3>
        <ol className="space-y-3 text-blue-800">
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</span>
            <span>Maak een <a href="https://business.facebook.com" target="_blank" rel="noopener" className="underline font-bold">Meta Business Account</a> aan</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</span>
            <span>Ga naar <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener" className="underline font-bold">Meta for Developers</a> en maak een app</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</span>
            <span>Voeg het WhatsApp product toe aan je app</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">4</span>
            <span>Kopieer je <strong>Phone Number ID</strong> en <strong>Access Token</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">5</span>
            <span>Configureer de webhook URL hieronder in je Meta app</span>
          </li>
        </ol>
      </div>

      {/* Webhook URL */}
      <div className="bg-gray-900 text-white rounded-2xl p-6 mb-8">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <span>🔗</span> Webhook URL (kopieer naar Meta)
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
              alert('Webhook URL gekopieerd!')
            }}
            className="px-4 py-3 bg-green-500 hover:bg-green-600 rounded-xl font-bold"
          >
            📋 Kopieer
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
            <span>🔑</span> API Instellingen
          </h3>
          <button
            onClick={() => setShowTokens(!showTokens)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {showTokens ? '🙈 Verbergen' : '👁️ Tonen'}
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
              Te vinden in Meta Developer Console → WhatsApp → API Setup
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
              Maak een System User aan in Business Settings voor een permanente token
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Account ID (optioneel)
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
                <span>🔌</span> Test Verbinding
              </>
            )}
          </button>
        </div>
      </div>

      {/* Custom Messages */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span>💬</span> Automatische Berichten
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Welkomstbericht
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
              Bevestigingsbericht (na bestelling)
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
              Klaar-bericht (bestelling klaar)
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

      {/* QR Code Preview */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📱</span> QR Code voor Klanten
        </h3>
        <p className="text-gray-500 mb-4">
          Print deze QR code en plaats hem op je toonbank of tafels. Klanten scannen en kunnen direct bestellen via WhatsApp.
        </p>
        <div className="flex items-center justify-center p-8 bg-gray-50 rounded-xl">
          <div className="text-center">
            <div className="w-48 h-48 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-sm">QR Code</span>
            </div>
            <p className="text-sm text-gray-500">
              QR code wordt gegenereerd zodra WhatsApp actief is
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Link
          href={`/shop/${params.tenant}/admin`}
          className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
        >
          Annuleren
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
              <span>💾</span> Opslaan
            </>
          )}
        </motion.button>
      </div>
    </div>
  )
}
