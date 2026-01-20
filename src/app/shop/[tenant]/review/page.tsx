'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getTenantSettings, TenantSettings } from '@/lib/admin-api'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'

export default function ReviewPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    comment: ''
  })

  useEffect(() => {
    async function loadSettings() {
      const data = await getTenantSettings(params.tenant)
      setSettings(data)
      setLoading(false)
    }
    loadSettings()
  }, [params.tenant])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (rating === 0) {
      alert(t('reviewPage.selectRating'))
      return
    }

    if (!formData.customer_name.trim() || !formData.comment.trim()) {
      alert(t('reviewPage.fillAllFields'))
      return
    }

    setSubmitting(true)

    try {
      if (!supabase) {
        throw new Error('Database niet beschikbaar')
      }

      // Simpele insert zonder optionele kolommen voor maximale compatibiliteit
      const { error } = await supabase
        .from('reviews')
        .insert({
          tenant_slug: params.tenant,
          customer_name: formData.customer_name.trim(),
          customer_email: formData.customer_email.trim() || null,
          rating: rating,
          text: formData.comment.trim()
        })

      if (error) {
        console.error('Review insert error:', error)
        throw new Error(error.message)
      }

      setSubmitted(true)
    } catch (error: unknown) {
      console.error('Error submitting review:', error)
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout'
      alert(`Er is iets misgegaan: ${errorMessage}`)
    } finally {
      setSubmitting(false)
    }
  }

  const primaryColor = settings?.primary_color || '#FF6B35'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-md w-full"
        >
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('reviewPage.thankYou')}</h1>
          <p className="text-gray-600 mb-6">
            {t('reviewPage.thankYouDesc')}
          </p>
          <Link href={`/shop/${params.tenant}`}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ backgroundColor: primaryColor }}
              className="text-white font-bold px-8 py-3 rounded-xl"
            >
              {t('reviewPage.backToShop')}
            </motion.button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '100vw', overflowX: 'hidden', width: '100%' }} className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/shop/${params.tenant}`} className="flex items-center gap-2 text-gray-600 hover:opacity-70 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>{t('reviewPage.back')}</span>
          </Link>
          <h1 className="font-bold text-xl text-gray-900">{t('reviewPage.writeReview')}</h1>
          <div className="w-16"></div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 shadow-xl"
        >
          {/* Business Name */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('reviewPage.leaveReviewFor')}
            </h2>
            <p style={{ color: primaryColor }} className="text-xl font-semibold">
              {settings?.business_name || params.tenant}
            </p>
          </div>

          {/* Rating Stars */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
              {t('reviewPage.howWasExperience')} *
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-5xl transition-colors"
                >
                  {(hoverRating || rating) >= star ? '⭐' : '☆'}
                </motion.button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center mt-3 text-gray-600">
                {rating === 1 && t('reviewPage.ratingBad')}
                {rating === 2 && t('reviewPage.ratingPoor')}
                {rating === 3 && t('reviewPage.ratingAverage')}
                {rating === 4 && t('reviewPage.ratingGood')}
                {rating === 5 && t('reviewPage.ratingExcellent')}
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('reviewPage.yourName')} *
              </label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  customer_name: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) 
                }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder={t('reviewPage.yourName')}
              />
            </div>

            {/* Email (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('reviewPage.email')}
              </label>
              <input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder={t('reviewPage.email')}
              />
              <p className="text-sm text-gray-500 mt-1">
                {t('reviewPage.emailNote')}
              </p>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('reviewPage.yourReview')} *
              </label>
              <textarea
                required
                rows={5}
                value={formData.comment}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  comment: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) 
                }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                placeholder={t('reviewPage.reviewPlaceholder')}
              />
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={submitting || rating === 0}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ backgroundColor: rating === 0 ? '#ccc' : primaryColor }}
              className="w-full text-white font-bold py-4 rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>{t('reviewPage.submitting')}</span>
                </>
              ) : (
                <>
                  <span>⭐</span>
                  <span>{t('reviewPage.submit')}</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Note */}
          <p className="text-center text-gray-500 text-sm mt-6">
            {t('reviewPage.reviewModerated')}
          </p>
        </motion.div>
      </main>
    </div>
  )
}
