'use client'

import { useLanguage } from '@/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const REASONS = [
  { key: 'volzet', icon: '🔴', labelKey: 'reasonVolzet', descKey: 'reasonVolzetDesc' },
  { key: 'panne', icon: '🔧', labelKey: 'reasonPanne', descKey: 'reasonPanneDesc' },
  { key: 'vakantie', icon: '🌴', labelKey: 'reasonVakantie', descKey: 'reasonVakantieDesc' },
  { key: 'sluiting', icon: '⚠️', labelKey: 'reasonSluiting', descKey: 'reasonSluitingDesc' },
]

export default function KassaLinkPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [isOffline, setIsOffline] = useState(false)
  const [offlineReason, setOfflineReason] = useState<string | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/shop-offline?tenant=${params.tenant}`)
      .then(r => r.json())
      .then(d => {
        setIsOffline(d.is_offline ?? false)
        setOfflineReason(d.offline_reason ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.tenant])

  const handleToggle = () => {
    if (isOffline) {
      // Go back online immediately
      goOnline()
    } else {
      // Show reason picker
      setSelectedReason(null)
      setShowPopup(true)
    }
  }

  const goOnline = async () => {
    setSaving(true)
    await fetch('/api/shop-offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant: params.tenant, is_offline: false }),
    })
    setIsOffline(false)
    setOfflineReason(null)
    setSaving(false)
  }

  const goOffline = async () => {
    if (!selectedReason) return
    setSaving(true)
    await fetch('/api/shop-offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant: params.tenant, is_offline: true, offline_reason: selectedReason }),
    })
    setIsOffline(true)
    setOfflineReason(selectedReason)
    setShowPopup(false)
    setSaving(false)
  }

  const currentReason = REASONS.find(r => r.key === offlineReason)

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Online Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-3xl p-8 border-2 transition-all ${
          isOffline
            ? 'bg-red-50 border-red-200'
            : 'bg-green-50 border-green-200'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('shopOffline.title')}</h2>
            <p className="text-gray-500 text-sm mt-1">{t('shopOffline.subtitle')}</p>
          </div>
          {/* Big toggle */}
          <button
            onClick={handleToggle}
            disabled={saving || loading}
            className={`relative w-20 h-10 rounded-full transition-all duration-300 focus:outline-none ${
              isOffline ? 'bg-red-500' : 'bg-green-500'
            } disabled:opacity-50`}
          >
            <span
              className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow-md transition-all duration-300 ${
                isOffline ? 'left-11' : 'left-1'
              }`}
            />
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400 text-sm">Laden...</div>
        ) : isOffline ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-red-100 rounded-2xl p-4">
              <span className="text-3xl">{currentReason?.icon ?? '🔴'}</span>
              <div>
                <p className="font-bold text-red-800 text-lg">
                  {t('shopOffline.statusOffline')}
                </p>
                <p className="text-red-600 text-sm">
                  {currentReason ? t(`shopOffline.${currentReason.labelKey}`) : ''} — {t('shopOffline.offlineDesc')}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggle}
              disabled={saving}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              ✅ {t('shopOffline.goOnline')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-green-100 rounded-2xl p-4">
              <span className="text-3xl">🟢</span>
              <div>
                <p className="font-bold text-green-800 text-lg">
                  {t('shopOffline.statusOnline')}
                </p>
                <p className="text-green-600 text-sm">{t('shopOffline.onlineDesc')}</p>
              </div>
            </div>
            <button
              onClick={handleToggle}
              disabled={saving}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              🔴 {t('shopOffline.goOffline')}
            </button>
          </div>
        )}
      </motion.div>

      {/* Existing Kassa Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white"
      >
        <div className="text-center mb-8">
          <span className="text-6xl mb-4 block">🖥️</span>
          <h2 className="text-2xl font-bold mb-2">{t('kassaPage.fullscreenTitle')}</h2>
          <p className="text-gray-400">
            {t('kassaPage.fullscreenDesc')}
          </p>
        </div>

        <div className="bg-gray-700/50 rounded-2xl p-6 mb-6">
          <h3 className="font-bold mb-4">✨ Features</h3>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span>{t('kassaPage.feature1')}</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span>{t('kassaPage.feature2')}</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span>{t('kassaPage.feature3')}</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span>{t('kassaPage.feature4')}</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span>{t('kassaPage.feature5')}</li>
          </ul>
        </div>

        <Link href={`/kassa/${params.tenant}`} target="_blank">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold text-xl flex items-center justify-center gap-3"
          >
            <span>🚀</span>
            {t('kassaPage.openButton')}
            <span className="text-sm bg-white/20 px-2 py-1 rounded">{t('kassaPage.newTab')}</span>
          </motion.button>
        </Link>

        <p className="text-center text-gray-500 text-sm mt-4">{t('kassaPage.tip')}</p>
      </motion.div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="font-bold text-blue-900 mb-2">💡 {t('kassaPage.kioskTitle')}</h3>
        <p className="text-blue-700 text-sm">{t('kassaPage.kioskDesc')}</p>
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
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-1">{t('shopOffline.popupTitle')}</h3>
              <p className="text-gray-500 text-sm mb-6">{t('shopOffline.popupSubtitle')}</p>

              <div className="space-y-3 mb-8">
                {REASONS.map(reason => (
                  <button
                    key={reason.key}
                    onClick={() => setSelectedReason(reason.key)}
                    className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                      selectedReason === reason.key
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl mt-0.5">{reason.icon}</span>
                    <div>
                      <p className="font-bold text-gray-900">{t(`shopOffline.${reason.labelKey}`)}</p>
                      <p className="text-gray-500 text-sm">{t(`shopOffline.${reason.descKey}`)}</p>
                    </div>
                    {selectedReason === reason.key && (
                      <span className="ml-auto text-red-500 text-xl">✓</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPopup(false)}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  {t('shopOffline.cancel')}
                </button>
                <button
                  onClick={goOffline}
                  disabled={!selectedReason || saving}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? '...' : `🔴 ${t('shopOffline.confirm')}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
