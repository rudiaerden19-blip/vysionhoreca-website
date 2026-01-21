'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getTenantSettings, saveTenantSettings, TenantSettings } from '@/lib/admin-api'
import MediaPicker from '@/components/MediaPicker'
import { useLanguage } from '@/i18n'

export default function ProfielPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState<TenantSettings>({
    tenant_slug: params.tenant,
    business_name: '',
    tagline: '',
    description: '',
    logo_url: '',
    primary_color: '#ef4444',
    secondary_color: '#dc2626',
    email: '',
    phone: '',
    address: '',
    postal_code: '',
    city: '',
    website: '',
    facebook_url: '',
    instagram_url: '',
    tiktok_url: '',
    website_url: '',
    about_image: '',
    top_seller_1: '',
    top_seller_2: '',
    top_seller_3: '',
    cover_image_1: '',
    cover_image_2: '',
    cover_image_3: '',
    specialty_1_image: '',
    specialty_1_title: '',
    specialty_2_image: '',
    specialty_2_title: '',
    specialty_3_image: '',
    specialty_3_title: '',
  })

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const data = await getTenantSettings(params.tenant)
      if (data) {
        setFormData(data)
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
    setSaving(true)
    setError('')
    
    const success = await saveTenantSettings(formData)
    
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
            className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">{t('adminPages.common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adminPages.profiel.title')}</h1>
          <p className="text-gray-500">{t('adminPages.profiel.subtitle')}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
            saved 
              ? 'bg-green-500 text-white' 
              : 'bg-orange-500 hover:bg-orange-600 text-white'
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

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span>🏪</span> {t('adminPages.profiel.businessInfo')}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminPages.profiel.businessName')} *
              </label>
              <input
                type="text"
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminPages.profiel.tagline')}
              </label>
              <input
                type="text"
                name="tagline"
                value={formData.tagline || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminPages.profiel.description')}
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('adminPages.profiel.primaryColor')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleChange}
                    className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleChange}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="#ef4444"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('adminPages.profiel.secondaryColor')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleChange}
                    className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleChange}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="#dc2626"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span>📍</span> {t('adminPages.profiel.contactInfo')}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminPages.profiel.address')}
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminPages.profiel.postalCode')}
              </label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminPages.profiel.city')}
              </label>
              <input
                type="text"
                name="city"
                value={formData.city || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminPages.profiel.phone')}
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminPages.profiel.email')}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </motion.div>

        {/* Social Media */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span>📱</span> {t('adminPages.profiel.socialMedia')}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span>📘</span> {t('adminPages.profiel.facebook')}
              </label>
              <input
                type="url"
                name="facebook_url"
                value={formData.facebook_url}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="https://facebook.com/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span>📸</span> {t('adminPages.profiel.instagram')}
              </label>
              <input
                type="url"
                name="instagram_url"
                value={formData.instagram_url}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="https://instagram.com/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span>🎵</span> {t('adminPages.profiel.tiktok')}
              </label>
              <input
                type="url"
                name="tiktok_url"
                value={formData.tiktok_url}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="https://tiktok.com/@..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span>🌐</span> {t('adminPages.profiel.website')}
              </label>
              <input
                type="url"
                name="website_url"
                value={formData.website_url}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="https://..."
              />
            </div>
          </div>
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span>🖼️</span> {t('adminPages.profiel.logo')}
          </h2>
          
          <MediaPicker
            tenantSlug={params.tenant}
            value={formData.logo_url || ''}
            onChange={(url) => {
              setFormData(prev => ({ ...prev, logo_url: url }))
              setSaved(false)
            }}
          />
        </motion.div>

        {/* Cover Images / Hero Slider */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span>🎠</span> Hero Slider Foto's
          </h2>
          <p className="text-gray-500 text-sm mb-6">Deze foto's worden getoond als slideshow bovenaan je website</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Slide 1</label>
              <MediaPicker
                tenantSlug={params.tenant}
                value={formData.cover_image_1 || ''}
                onChange={(url) => {
                  setFormData(prev => ({ ...prev, cover_image_1: url }))
                  setSaved(false)
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Slide 2</label>
              <MediaPicker
                tenantSlug={params.tenant}
                value={formData.cover_image_2 || ''}
                onChange={(url) => {
                  setFormData(prev => ({ ...prev, cover_image_2: url }))
                  setSaved(false)
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Slide 3</label>
              <MediaPicker
                tenantSlug={params.tenant}
                value={formData.cover_image_3 || ''}
                onChange={(url) => {
                  setFormData(prev => ({ ...prev, cover_image_3: url }))
                  setSaved(false)
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* About Image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span>👥</span> Over Ons Foto
          </h2>
          <p className="text-gray-500 text-sm mb-6">Deze foto wordt getoond naast de "Over Ons" sectie</p>
          
          <MediaPicker
            tenantSlug={params.tenant}
            value={formData.about_image || ''}
            onChange={(url) => {
              setFormData(prev => ({ ...prev, about_image: url }))
              setSaved(false)
            }}
          />
        </motion.div>

        {/* Top Sellers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span>🏆</span> Best Verkochte Producten
          </h2>
          <p className="text-gray-500 text-sm mb-6">Toon je 3 populairste producten op de homepage</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product 1</label>
              <MediaPicker
                tenantSlug={params.tenant}
                value={formData.top_seller_1 || ''}
                onChange={(url) => {
                  setFormData(prev => ({ ...prev, top_seller_1: url }))
                  setSaved(false)
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product 2</label>
              <MediaPicker
                tenantSlug={params.tenant}
                value={formData.top_seller_2 || ''}
                onChange={(url) => {
                  setFormData(prev => ({ ...prev, top_seller_2: url }))
                  setSaved(false)
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product 3</label>
              <MediaPicker
                tenantSlug={params.tenant}
                value={formData.top_seller_3 || ''}
                onChange={(url) => {
                  setFormData(prev => ({ ...prev, top_seller_3: url }))
                  setSaved(false)
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Specialiteiten */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span>⭐</span> Onze Specialiteiten
          </h2>
          <p className="text-gray-500 text-sm mb-6">Highlight 3 specialiteiten met foto en titel</p>
          
          <div className="space-y-6">
            {/* Specialty 1 */}
            <div className="border border-gray-200 rounded-xl p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Specialiteit 1</label>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Titel</label>
                  <input
                    type="text"
                    name="specialty_1_title"
                    value={formData.specialty_1_title || ''}
                    onChange={handleChange}
                    placeholder="bijv. Huisgemaakte Pasta"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Foto</label>
                  <MediaPicker
                    tenantSlug={params.tenant}
                    value={formData.specialty_1_image || ''}
                    onChange={(url) => {
                      setFormData(prev => ({ ...prev, specialty_1_image: url }))
                      setSaved(false)
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Specialty 2 */}
            <div className="border border-gray-200 rounded-xl p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Specialiteit 2</label>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Titel</label>
                  <input
                    type="text"
                    name="specialty_2_title"
                    value={formData.specialty_2_title || ''}
                    onChange={handleChange}
                    placeholder="bijv. Verse Visgerechten"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Foto</label>
                  <MediaPicker
                    tenantSlug={params.tenant}
                    value={formData.specialty_2_image || ''}
                    onChange={(url) => {
                      setFormData(prev => ({ ...prev, specialty_2_image: url }))
                      setSaved(false)
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Specialty 3 */}
            <div className="border border-gray-200 rounded-xl p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Specialiteit 3</label>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Titel</label>
                  <input
                    type="text"
                    name="specialty_3_title"
                    value={formData.specialty_3_title || ''}
                    onChange={handleChange}
                    placeholder="bijv. Ambachtelijk Brood"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Foto</label>
                  <MediaPicker
                    tenantSlug={params.tenant}
                    value={formData.specialty_3_image || ''}
                    onChange={(url) => {
                      setFormData(prev => ({ ...prev, specialty_3_image: url }))
                      setSaved(false)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Preview Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{t('admin.viewWebsite')}</h3>
              <p className="text-white/80 text-sm">{t('adminPages.profiel.subtitle')}</p>
            </div>
            <a
              href={`/shop/${params.tenant}`}
              target="_blank"
              className="bg-white text-orange-500 font-medium px-6 py-3 rounded-xl hover:bg-orange-50 transition-colors flex items-center gap-2"
            >
              <span>{t('admin.viewWebsite')}</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
