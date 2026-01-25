'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getTenantSettings, saveTenantSettings, TenantSettings } from '@/lib/admin-api'

export default function VacaturesPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState<Partial<TenantSettings>>({
    hiring_enabled: false,
    hiring_title: 'Wij zoeken personeel',
    hiring_description: '',
    hiring_contact: '',
  })

  const [fullSettings, setFullSettings] = useState<TenantSettings | null>(null)

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const data = await getTenantSettings(params.tenant)
      if (data) {
        setFullSettings(data)
        setFormData({
          hiring_enabled: data.hiring_enabled ?? false,
          hiring_title: data.hiring_title || 'Wij zoeken personeel',
          hiring_description: data.hiring_description || '',
          hiring_contact: data.hiring_contact || '',
        })
      }
      setLoading(false)
    }
    loadData()
  }, [params.tenant])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setSaved(false)
    setError('')
  }

  const handleSave = async () => {
    if (!fullSettings) return
    
    setSaving(true)
    setError('')
    
    const updatedSettings: TenantSettings = {
      ...fullSettings,
      hiring_enabled: formData.hiring_enabled,
      hiring_title: formData.hiring_title,
      hiring_description: formData.hiring_description,
      hiring_contact: formData.hiring_contact,
    }
    
    const success = await saveTenantSettings(updatedSettings)
    
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
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('vacaturesPage.title')}</h1>
          <p className="text-gray-500">{t('vacaturesPage.subtitle')}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
            saved 
              ? 'bg-green-500 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {saving ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
              <span>{t('adminPages.common.saving')}</span>
            </>
          ) : saved ? (
            <>
              <span>✓</span>
              <span>{t('adminPages.common.saved')}</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>{t('adminPages.common.save')}</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <span>📢</span> {t('vacaturesPage.lookingForStaff')}
        </h2>
        
        <div className="space-y-6">
          {/* Toggle aan/uit */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('vacaturesPage.showOnWebsite')}
              </label>
              <p className="text-sm text-gray-500">{t('vacaturesPage.showOnWebsiteDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, hiring_enabled: !prev.hiring_enabled }))
                setSaved(false)
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.hiring_enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  formData.hiring_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {formData.hiring_enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('vacaturesPage.titleLabel')}
                </label>
                <input
                  type="text"
                  name="hiring_title"
                  value={formData.hiring_title || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={t('vacaturesPage.titlePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('vacaturesPage.descriptionLabel')}
                </label>
                <textarea
                  name="hiring_description"
                  value={formData.hiring_description || ''}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder={t('vacaturesPage.descriptionPlaceholder')}
                />
                <p className="text-sm text-gray-500 mt-1">{t('vacaturesPage.descriptionTip')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('vacaturesPage.contactLabel')}
                </label>
                <input
                  type="text"
                  name="hiring_contact"
                  value={formData.hiring_contact || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={t('vacaturesPage.contactPlaceholder')}
                />
                <p className="text-sm text-gray-500 mt-1">{t('vacaturesPage.contactTip')}</p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Preview */}
      {formData.hiring_enabled && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6"
        >
          <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <span>👁️</span> {t('vacaturesPage.preview')}
          </h3>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-sm text-blue-600 font-medium uppercase tracking-wider">{t('vacaturesPage.joinOurTeam')}</p>
            <h4 className="text-2xl font-bold text-gray-900 mt-1">{formData.hiring_title || t('vacaturesPage.titlePlaceholder')}</h4>
            {formData.hiring_description && (
              <p className="text-gray-600 mt-4 whitespace-pre-line">{formData.hiring_description}</p>
            )}
            {formData.hiring_contact && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  <span>👋</span> {formData.hiring_contact}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6"
      >
        <h3 className="font-semibold text-blue-900 mb-2">💡 {t('vacaturesPage.tips.title')}</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• {t('vacaturesPage.tips.tip1')}</li>
          <li>• {t('vacaturesPage.tips.tip2')}</li>
          <li>• {t('vacaturesPage.tips.tip3')}</li>
          <li>• {t('vacaturesPage.tips.tip4')}</li>
        </ul>
      </motion.div>
    </div>
  )
}
