'use client'

import { useLanguage } from '@/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { getAuthHeaders } from '@/lib/auth-headers'

const REASONS = [
  { key: 'volzet',   icon: '🔴', labelKey: 'reasonVolzet',   descKey: 'reasonVolzetDesc' },
  { key: 'panne',    icon: '🔧', labelKey: 'reasonPanne',    descKey: 'reasonPanneDesc' },
  { key: 'vakantie', icon: '🌴', labelKey: 'reasonVakantie', descKey: 'reasonVakantieDesc' },
  { key: 'sluiting', icon: '⚠️', labelKey: 'reasonSluiting', descKey: 'reasonSluitingDesc' },
  { key: 'eigen',    icon: '✏️', labelKey: 'reasonEigen',    descKey: 'reasonEigenDesc' },
]

export default function OnlineStatusPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [isOffline, setIsOffline] = useState(false)
  const [offlineReason, setOfflineReason] = useState<string | null>(null)
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [customMessage, setCustomMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [needsMigration, setNeedsMigration] = useState(false)

  useEffect(() => {
    fetch(`/api/shop-offline?tenant=${params.tenant}`)
      .then(r => r.json())
      .then(d => {
        setIsOffline(d.is_offline ?? false)
        setOfflineReason(d.offline_reason ?? null)
        setOfflineMessage(d.offline_message ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.tenant])

  const handleToggle = () => {
    if (isOffline) {
      goOnline()
    } else {
      setSelectedReason(null)
      setCustomMessage('')
      setShowPopup(true)
    }
  }

  const saveStatus = async (payload: object) => {
    setSaveError(null)
    setSaveSuccess(false)
    const res = await fetch('/api/shop-offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ tenant: params.tenant, ...payload }),
    })
    const json = await res.json()
    if (!res.ok || json.error) {
      const msg = json.error ?? 'Onbekende fout'
      setSaveError(msg)
      if (msg.includes('does not exist') || msg.includes('migration')) {
        setNeedsMigration(true)
      }
      return false
    }
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
    return true
  }

  const goOnline = async () => {
    setSaving(true)
    const ok = await saveStatus({ is_offline: false })
    if (ok) {
      setIsOffline(false)
      setOfflineReason(null)
      setOfflineMessage(null)
    }
    setSaving(false)
  }

  const goOffline = async () => {
    if (!selectedReason) return
    if (selectedReason === 'eigen' && !customMessage.trim()) return
    setSaving(true)
    const ok = await saveStatus({
      is_offline: true,
      offline_reason: selectedReason,
      offline_message: selectedReason === 'eigen' ? customMessage.trim() : null,
    })
    if (ok) {
      setIsOffline(true)
      setOfflineReason(selectedReason)
      setOfflineMessage(selectedReason === 'eigen' ? customMessage.trim() : null)
      setShowPopup(false)
    }
    setSaving(false)
  }

  const currentReason = REASONS.find(r => r.key === offlineReason)
  const canConfirm = selectedReason && (selectedReason !== 'eigen' || customMessage.trim().length > 0)

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('shopOffline.title')}</h1>
      <p className="text-gray-600 mb-8">{t('shopOffline.subtitle')}</p>

      {/* Migration warning */}
      {needsMigration && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-5">
          <p className="font-bold text-red-800 mb-2">⚠️ Database tabel ontbreekt</p>
          <p className="text-red-700 text-sm mb-3">
            Voer dit SQL-script uit in de Supabase SQL Editor om de tabel aan te maken:
          </p>
          <code className="block bg-red-100 rounded-xl p-3 text-xs text-red-900 whitespace-pre overflow-x-auto">
{`CREATE TABLE IF NOT EXISTS shop_offline_status (
  tenant_slug TEXT PRIMARY KEY,
  is_offline BOOLEAN DEFAULT FALSE,
  offline_reason TEXT,
  offline_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE shop_offline_status
  ADD COLUMN IF NOT EXISTS offline_message TEXT;`}
          </code>
        </div>
      )}

      {/* Save error */}
      {saveError && !needsMigration && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">❌</span>
          <p className="text-red-800 text-sm">{saveError}</p>
        </div>
      )}

      {/* Save success */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3"
          >
            <span className="text-2xl">✅</span>
            <p className="text-green-800 text-sm font-semibold">Status opgeslagen en zichtbaar voor klanten.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="bg-white rounded-3xl p-10 border border-gray-200 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl p-8 border-2 transition-all ${
            isOffline ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
          }`}
        >
          {/* Status header with toggle */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className={`text-2xl font-bold ${isOffline ? 'text-red-700' : 'text-green-700'}`}>
                {isOffline ? `🔴 ${t('shopOffline.statusOffline')}` : `🟢 ${t('shopOffline.statusOnline')}`}
              </p>
              <p className={`text-sm mt-1 ${isOffline ? 'text-red-500' : 'text-green-500'}`}>
                {isOffline ? t('shopOffline.offlineDesc') : t('shopOffline.onlineDesc')}
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={saving}
              className={`relative w-20 h-10 rounded-full transition-all duration-300 focus:outline-none shadow-inner ${
                isOffline ? 'bg-red-500' : 'bg-green-500'
              } disabled:opacity-50`}
            >
              <span className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow-md transition-all duration-300 ${
                isOffline ? 'left-11' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Current reason card when offline */}
          {isOffline && currentReason && (
            <div className="bg-red-100 border border-red-200 rounded-2xl p-5 mb-6 flex items-center gap-4">
              <span className="text-4xl">{currentReason.icon}</span>
              <div>
                <p className="font-bold text-red-800 text-lg">
                  {currentReason.key === 'eigen' && offlineMessage
                    ? offlineMessage
                    : t(`shopOffline.${currentReason.labelKey}`)}
                </p>
                <p className="text-red-600 text-sm">{t(`shopOffline.${currentReason.descKey}`)}</p>
              </div>
            </div>
          )}

          {isOffline ? (
            <button
              onClick={goOnline}
              disabled={saving}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '✅'}
              {t('shopOffline.goOnline')}
            </button>
          ) : (
            <button
              onClick={() => { setSelectedReason(null); setCustomMessage(''); setShowPopup(true) }}
              disabled={saving}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              🔴 {t('shopOffline.goOffline')}
            </button>
          )}
        </motion.div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <p className="text-blue-800 text-sm font-medium">
          💡 De status wordt onmiddellijk zichtbaar voor alle klanten in de webshop. Klanten kunnen niet bestellen wanneer de shop offline is.
        </p>
      </div>

      {/* Reason Picker Popup */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-1">{t('shopOffline.popupTitle')}</h3>
              <p className="text-gray-500 text-sm mb-6">{t('shopOffline.popupSubtitle')}</p>

              <div className="space-y-3 mb-4">
                {REASONS.map(reason => (
                  <div key={reason.key}>
                    <button
                      onClick={() => setSelectedReason(reason.key)}
                      className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedReason === reason.key
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-2xl mt-0.5">{reason.icon}</span>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{t(`shopOffline.${reason.labelKey}`)}</p>
                        <p className="text-gray-500 text-sm">{t(`shopOffline.${reason.descKey}`)}</p>
                      </div>
                      {selectedReason === reason.key && (
                        <span className="text-red-500 text-xl font-bold">✓</span>
                      )}
                    </button>

                    {reason.key === 'eigen' && selectedReason === 'eigen' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 px-1"
                      >
                        <textarea
                          value={customMessage}
                          onChange={e => setCustomMessage(e.target.value)}
                          placeholder={t('shopOffline.eigenPlaceholder')}
                          maxLength={120}
                          rows={3}
                          className="w-full px-4 py-3 border-2 border-red-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 resize-none text-sm"
                          autoFocus
                        />
                        <p className="text-right text-xs text-gray-400 mt-1">{customMessage.length}/120</p>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>

              {/* Inline save error inside popup */}
              {saveError && !needsMigration && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-red-700 text-sm">❌ {saveError}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPopup(false)}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  {t('shopOffline.cancel')}
                </button>
                <button
                  onClick={goOffline}
                  disabled={!canConfirm || saving}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving
                    ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : `🔴 ${t('shopOffline.confirm')}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
