'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getTenantSettings, saveTenantSettings, TenantSettings } from '@/lib/admin-api'
import MediaPicker from '@/components/MediaPicker'
import ImageZoomPicker, { parseImageZoomSettings, stringifyImageZoomSettings } from '@/components/ImageZoomPicker'
import { useLanguage } from '@/i18n'
import { getAuthHeaders } from '@/lib/auth-headers'

function detectSmtp(email: string): { host: string; port: number } | null {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return null
  if (domain === 'gmail.com' || domain === 'googlemail.com') return { host: 'smtp.gmail.com', port: 587 }
  if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com' || domain === 'live.be' || domain === 'hotmail.be') return { host: 'smtp-mail.outlook.com', port: 587 }
  if (domain === 'zoho.eu' || domain === 'zohomail.eu' || domain === 'zoho.com') return { host: 'smtp.zoho.eu', port: 465 }
  if (domain === 'yahoo.com' || domain === 'yahoo.be' || domain === 'yahoo.fr') return { host: 'smtp.mail.yahoo.com', port: 465 }
  if (domain === 'icloud.com' || domain === 'me.com') return { host: 'smtp.mail.me.com', port: 587 }
  if (domain === 'telenet.be') return { host: 'smtp.telenet.be', port: 465 }
  if (domain === 'skynet.be') return { host: 'smtp.skynet.be', port: 465 }
  if (domain === 'proximus.be' || domain === 'scarlet.be') return { host: 'smtp.proximus.be', port: 465 }
  return null
}

export default function ProfielPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // SMTP email instellingen (apart van profiel formData)
  const [smtpData, setSmtpData] = useState({
    smtp_host: '',
    smtp_port: 465,
    smtp_user: '',
    smtp_password: '',
    smtp_from_name: '',
  })
  const [smtpPasswordSet, setSmtpPasswordSet] = useState(false)
  const [smtpDetected, setSmtpDetected] = useState<string | null>(null)
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [smtpSaved, setSmtpSaved] = useState(false)
  const [smtpError, setSmtpError] = useState('')
  
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
    btw_number: '',
    btw_percentage: 6,
    kvk_number: '',
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

    async function loadSmtp() {
      try {
        const res = await fetch(`/api/tenant/smtp?tenant=${params.tenant}`, {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          const d = await res.json()
          setSmtpData({
            smtp_host: d.smtp_host || '',
            smtp_port: d.smtp_port || 465,
            smtp_user: d.smtp_user || '',
            smtp_password: '',
            smtp_from_name: d.smtp_from_name || '',
          })
          setSmtpPasswordSet(d.smtp_password_set || false)
          if (d.smtp_host) setSmtpDetected(d.smtp_host)
        }
      } catch {
        // stil falen
      }
    }
    loadSmtp()
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

  const handleSmtpSave = async () => {
    setSmtpSaving(true)
    setSmtpError('')
    try {
      const res = await fetch('/api/tenant/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ tenantSlug: params.tenant, ...smtpData }),
      })
      const result = await res.json()
      if (res.ok && result.success) {
        setSmtpSaved(true)
        setSmtpPasswordSet(true)
        setSmtpData(prev => ({ ...prev, smtp_password: '' }))
        setTimeout(() => setSmtpSaved(false), 3000)
      } else {
        setSmtpError(result.error || 'Opslaan mislukt')
      }
    } catch {
      setSmtpError('Verbindingsfout')
    }
    setSmtpSaving(false)
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
    <div className="max-w-4xl mx-auto overflow-x-hidden pb-24">
      {/* Floating Save Button - Fixed Bottom Right */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSave}
        disabled={saving}
        className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl font-medium shadow-2xl flex items-center gap-2 ${
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

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adminPages.profiel.title')}</h1>
          <p className="text-gray-500">{t('adminPages.profiel.subtitle')}</p>
        </div>
        <Link
          href={`/shop/${params.tenant}/admin/team`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm shrink-0"
        >
          <span>👥</span>
          {t('websiteTeam.mijnTeamButton')}
        </Link>
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
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
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </motion.div>

        {/* Fiscale Gegevens */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span>📋</span> {t('adminPages.profiel.fiscalInfo') || 'Fiscale Gegevens'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {t('adminPages.profiel.fiscalInfoDescription') || 'Deze gegevens worden getoond op kassabonnen en facturen (wettelijk verplicht in België)'}
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminPages.profiel.btwNumber') || 'BTW Nummer'} *
              </label>
              <input
                type="text"
                name="btw_number"
                value={formData.btw_number || ''}
                onChange={handleChange}
                placeholder="BE0123.456.789"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-400 mt-1">Verplicht op kassabonnen in België</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminPages.profiel.btwPercentage') || 'BTW Percentage'} *
              </label>
              <select
                name="btw_percentage"
                value={formData.btw_percentage || 6}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    btw_percentage: parseInt(e.target.value)
                  }))
                  setSaved(false)
                }}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value={6}>6% - Voeding (horeca, afhaal)</option>
                <option value={12}>12% - Restaurant (ter plaatse)</option>
                <option value={21}>21% - Standaard tarief</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">6% voor afhaalmaaltijden, 12% voor ter plaatse consumptie</p>
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
            <span>🎠</span> {t('adminPages.profiel.heroSliderTitle')}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {t('adminPages.profiel.heroSliderIntro')}{' '}
            <span className="text-blue-600 font-medium">{t('adminPages.profiel.heroSliderZoomHint')}</span>
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <ImageZoomPicker
                tenantSlug={params.tenant}
                label={t('ui.slideLabel').replace('{{n}}', '1')}
                value={parseImageZoomSettings(formData.cover_image_1)}
                onChange={(settings) => {
                  setFormData(prev => ({ ...prev, cover_image_1: stringifyImageZoomSettings(settings) }))
                  setSaved(false)
                }}
              />
            </div>
            <div>
              <ImageZoomPicker
                tenantSlug={params.tenant}
                label={t('ui.slideLabel').replace('{{n}}', '2')}
                value={parseImageZoomSettings(formData.cover_image_2)}
                onChange={(settings) => {
                  setFormData(prev => ({ ...prev, cover_image_2: stringifyImageZoomSettings(settings) }))
                  setSaved(false)
                }}
              />
            </div>
            <div>
              <ImageZoomPicker
                tenantSlug={params.tenant}
                label={t('ui.slideLabel').replace('{{n}}', '3')}
                value={parseImageZoomSettings(formData.cover_image_3)}
                onChange={(settings) => {
                  setFormData(prev => ({ ...prev, cover_image_3: stringifyImageZoomSettings(settings) }))
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
            <span>👥</span> {t('adminPages.profiel.aboutPhotoTitle')}
          </h2>
          <p className="text-gray-500 text-sm mb-6">{t('adminPages.profiel.aboutPhotoDesc')}</p>
          
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
            <span>🏆</span> {t('adminPages.profiel.topSellersTitle')}
          </h2>
          <p className="text-gray-500 text-sm mb-6">{t('adminPages.profiel.topSellersDesc')}</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <ImageZoomPicker
                tenantSlug={params.tenant}
                label={t('ui.productLabel').replace('{{n}}', '1')}
                value={parseImageZoomSettings(formData.top_seller_1)}
                onChange={(settings) => {
                  setFormData(prev => ({ ...prev, top_seller_1: stringifyImageZoomSettings(settings) }))
                  setSaved(false)
                }}
              />
            </div>
            <div>
              <ImageZoomPicker
                tenantSlug={params.tenant}
                label={t('ui.productLabel').replace('{{n}}', '2')}
                value={parseImageZoomSettings(formData.top_seller_2)}
                onChange={(settings) => {
                  setFormData(prev => ({ ...prev, top_seller_2: stringifyImageZoomSettings(settings) }))
                  setSaved(false)
                }}
              />
            </div>
            <div>
              <ImageZoomPicker
                tenantSlug={params.tenant}
                label={t('ui.productLabel').replace('{{n}}', '3')}
                value={parseImageZoomSettings(formData.top_seller_3)}
                onChange={(settings) => {
                  setFormData(prev => ({ ...prev, top_seller_3: stringifyImageZoomSettings(settings) }))
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
            <span>⭐</span> {t('adminPages.profiel.specialtiesTitle')}
          </h2>
          <p className="text-gray-500 text-sm mb-6">{t('adminPages.profiel.specialtiesDesc')}</p>
          
          <div className="space-y-6">
            {/* Specialty 1 */}
            <div className="border border-gray-200 rounded-xl p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminPages.profiel.specialtyLabel').replace('{{n}}', '1')}
              </label>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('adminPages.profiel.fieldTitle')}</label>
                  <input
                    type="text"
                    name="specialty_1_title"
                    value={formData.specialty_1_title || ''}
                    onChange={handleChange}
                    placeholder={t('ui.exampleDishPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('adminPages.profiel.fieldPhoto')}</label>
                  <ImageZoomPicker
                    tenantSlug={params.tenant}
                    value={parseImageZoomSettings(formData.specialty_1_image)}
                    onChange={(settings) => {
                      setFormData(prev => ({ ...prev, specialty_1_image: stringifyImageZoomSettings(settings) }))
                      setSaved(false)
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Specialty 2 */}
            <div className="border border-gray-200 rounded-xl p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminPages.profiel.specialtyLabel').replace('{{n}}', '2')}
              </label>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('adminPages.profiel.fieldTitle')}</label>
                  <input
                    type="text"
                    name="specialty_2_title"
                    value={formData.specialty_2_title || ''}
                    onChange={handleChange}
                    placeholder={t('ui.exampleFishPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('adminPages.profiel.fieldPhoto')}</label>
                  <ImageZoomPicker
                    tenantSlug={params.tenant}
                    value={parseImageZoomSettings(formData.specialty_2_image)}
                    onChange={(settings) => {
                      setFormData(prev => ({ ...prev, specialty_2_image: stringifyImageZoomSettings(settings) }))
                      setSaved(false)
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Specialty 3 */}
            <div className="border border-gray-200 rounded-xl p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminPages.profiel.specialtyLabel').replace('{{n}}', '3')}
              </label>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('adminPages.profiel.fieldTitle')}</label>
                  <input
                    type="text"
                    name="specialty_3_title"
                    value={formData.specialty_3_title || ''}
                    onChange={handleChange}
                    placeholder={t('ui.exampleBreadPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('adminPages.profiel.fieldPhoto')}</label>
                  <ImageZoomPicker
                    tenantSlug={params.tenant}
                    value={parseImageZoomSettings(formData.specialty_3_image)}
                    onChange={(settings) => {
                      setFormData(prev => ({ ...prev, specialty_3_image: stringifyImageZoomSettings(settings) }))
                      setSaved(false)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Email SMTP Instellingen */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span>📧</span> {t('adminPages.profiel.emailMarketingTitle')}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {t('adminPages.profiel.emailMarketingDesc')}
          </p>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('adminPages.profiel.smtpFromNameLabel')}</label>
                <input
                  type="text"
                  value={smtpData.smtp_from_name}
                  onChange={e => setSmtpData(prev => ({ ...prev, smtp_from_name: e.target.value }))}
                  placeholder={t('ui.exampleBusinessPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('adminPages.profiel.smtpEmailLabel')}</label>
                <input
                  type="email"
                  value={smtpData.smtp_user}
                  onChange={e => {
                    const email = e.target.value
                    setSmtpData(prev => ({ ...prev, smtp_user: email }))
                    const detected = detectSmtp(email)
                    if (detected) {
                      setSmtpData(prev => ({ ...prev, smtp_user: email, smtp_host: detected.host, smtp_port: detected.port }))
                      setSmtpDetected(detected.host)
                    } else {
                      setSmtpDetected(null)
                    }
                  }}
                  placeholder={t('ui.exampleShopEmailPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {smtpDetected && (
                  <p className="text-xs text-green-600 mt-1">
                    {t('adminPages.profiel.smtpServerDetected').replace('{{host}}', smtpDetected)}
                  </p>
                )}
                {smtpData.smtp_user && !smtpDetected && (
                  <p className="text-xs text-gray-500 mt-1">{t('adminPages.profiel.smtpUnknownProvider')}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('adminPages.profiel.smtpPasswordLabel')}
                {smtpPasswordSet && (
                  <span className="ml-2 text-xs text-green-600 font-normal">{t('adminPages.profiel.smtpPasswordSetBadge')}</span>
                )}
              </label>
              <input
                type="password"
                value={smtpData.smtp_password}
                onChange={e => setSmtpData(prev => ({ ...prev, smtp_password: e.target.value }))}
                placeholder={smtpPasswordSet ? t('adminPages.profiel.smtpPasswordKeepPlaceholder') : t('adminPages.profiel.smtpPasswordPlaceholder')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {smtpData.smtp_user?.includes('@gmail.com') && (
                <p className="text-xs text-amber-600 mt-1">
                  {t('adminPages.profiel.smtpGmailWarning')}
                </p>
              )}
            </div>

            {smtpData.smtp_user && !smtpDetected && (
              <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('adminPages.profiel.smtpServerLabel')}</label>
                  <input
                    type="text"
                    value={smtpData.smtp_host}
                    onChange={e => setSmtpData(prev => ({ ...prev, smtp_host: e.target.value }))}
                    placeholder={t('ui.exampleSmtpPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('adminPages.profiel.smtpPortLabel')}</label>
                  <input
                    type="number"
                    value={smtpData.smtp_port}
                    onChange={e => setSmtpData(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
                    placeholder="465"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                  />
                </div>
              </div>
            )}

            {smtpError && (
              <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl">{smtpError}</p>
            )}

            <button
              onClick={handleSmtpSave}
              disabled={smtpSaving}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {smtpSaving ? t('adminPages.profiel.smtpSaveSaving') : smtpSaved ? t('adminPages.profiel.smtpSaveSaved') : t('adminPages.profiel.smtpSaveButton')}
            </button>
          </div>
        </motion.div>

        {/* Preview Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{t('admin.viewWebsite')}</h3>
              <p className="text-white/80 text-sm">{t('adminPages.profiel.subtitle')}</p>
            </div>
            <a
              href={`/shop/${params.tenant}`}
              target="_blank"
              className="bg-white text-blue-600 font-medium px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2"
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
