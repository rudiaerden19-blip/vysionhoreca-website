'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getTenantSettings, saveTenantSettings, TenantSettings } from '@/lib/admin-api'
import MediaPicker from '@/components/MediaPicker'

export default function SeoPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [seo, setSeo] = useState({
    title: '',
    description: '',
    keywords: '',
    ogImage: '',
  })

  // Load current settings
  useEffect(() => {
    async function loadSettings() {
      setLoading(true)
      const data = await getTenantSettings(params.tenant)
      if (data) {
        setSettings(data)
        setSeo({
          title: data.seo_title || `${data.business_name} | ${data.tagline || ''}`,
          description: data.seo_description || data.description || '',
          keywords: data.seo_keywords || '',
          ogImage: data.seo_og_image || '',
        })
      }
      setLoading(false)
    }
    loadSettings()
  }, [params.tenant])

  const handleChange = (key: string, value: string) => {
    setSeo(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!settings) return
    
    setSaving(true)
    setError('')
    
    const updatedSettings: TenantSettings = {
      ...settings,
      seo_title: seo.title,
      seo_description: seo.description,
      seo_keywords: seo.keywords,
      seo_og_image: seo.ogImage,
    }
    
    const success = await saveTenantSettings(updatedSettings)
    
    if (success) {
      setSettings(updatedSettings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError('Opslaan mislukt. Probeer opnieuw.')
    }
    setSaving(false)
  }

  const titleLength = seo.title.length
  const descLength = seo.description.length

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
      {/* Header - Sticky */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm -mx-4 px-4 py-4 mb-4 flex items-center justify-between border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('websiteSeo.title')}</h1>
          <p className="text-gray-500">{t('websiteSeo.subtitle')}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
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

      {/* SEO Fields */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-sm space-y-6"
      >
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('websiteSeo.pageTitle')}
          </label>
          <input
            type="text"
            value={seo.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('websiteSeo.pageTitlePlaceholder')}
          />
          <div className="flex justify-between mt-2">
            <p className="text-sm text-gray-500">{t('websiteSeo.pageTitleDesc')}</p>
            <p className={`text-sm ${titleLength > 60 ? 'text-red-500' : 'text-gray-400'}`}>
              {titleLength}/60
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('websiteSeo.metaDescription')}
          </label>
          <textarea
            value={seo.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder={t('websiteSeo.metaDescriptionPlaceholder')}
          />
          <div className="flex justify-between mt-2">
            <p className="text-sm text-gray-500">{t('websiteSeo.metaDescriptionDesc')}</p>
            <p className={`text-sm ${descLength > 160 ? 'text-red-500' : 'text-gray-400'}`}>
              {descLength}/160
            </p>
          </div>
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('websiteSeo.keywords')}
          </label>
          <input
            type="text"
            value={seo.keywords}
            onChange={(e) => handleChange('keywords', e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('websiteSeo.keywordsPlaceholder')}
          />
          <p className="text-sm text-gray-500 mt-2">{t('websiteSeo.keywordsDesc')}</p>
        </div>

        {/* OG Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('websiteSeo.ogImage')}
          </label>
          <MediaPicker
            tenantSlug={params.tenant}
            value={seo.ogImage}
            onChange={(url) => handleChange('ogImage', url)}
          />
          <p className="text-sm text-gray-500 mt-2">{t('websiteSeo.ogImageDesc')}</p>
        </div>
      </motion.div>

      {/* Google Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 bg-white rounded-2xl p-6 shadow-sm"
      >
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>🔍</span> {t('websiteSeo.googlePreview')}
        </h3>
        <div className="border rounded-xl p-4 bg-gray-50">
          <p className="text-blue-600 text-lg hover:underline cursor-pointer truncate">
            {seo.title || t('websiteSeo.pageTitle')}
          </p>
          <p className="text-green-700 text-sm mb-1">
            {params.tenant}.ordervysion.com
          </p>
          <p className="text-gray-600 text-sm line-clamp-2">
            {seo.description || t('websiteSeo.addMetaDescription')}
          </p>
        </div>
      </motion.div>

      {/* Social Media Preview */}
      {seo.ogImage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 bg-white rounded-2xl p-6 shadow-sm"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>📱</span> {t('websiteSeo.facebookPreview')}
          </h3>
          <div className="border rounded-xl overflow-hidden bg-gray-50 max-w-md">
            <img 
              src={seo.ogImage} 
              alt="OG preview" 
              className="w-full h-48 object-cover"
            />
            <div className="p-3">
              <p className="text-gray-500 text-xs uppercase">{params.tenant}.ordervysion.com</p>
              <p className="font-semibold text-gray-900 truncate">{seo.title || t('websiteSeo.pageTitle')}</p>
              <p className="text-gray-600 text-sm line-clamp-2">{seo.description || t('websiteSeo.description')}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-6"
      >
        <h3 className="font-semibold text-green-900 mb-2">💡 {t('websiteSeo.tips.title')}</h3>
        <ul className="text-green-700 text-sm space-y-1">
          <li>• {t('websiteSeo.tips.tip1')}</li>
          <li>• {t('websiteSeo.tips.tip2')}</li>
          <li>• {t('websiteSeo.tips.tip3')}</li>
          <li>• {t('websiteSeo.tips.tip4')}</li>
          <li>• {t('websiteSeo.tips.tip5')}</li>
        </ul>
      </motion.div>
    </div>
  )
}
