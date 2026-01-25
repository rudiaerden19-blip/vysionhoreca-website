'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getReviews, replyToReview, toggleReviewVisible, deleteReview, Review } from '@/lib/admin-api'

export default function ReviewsPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [savingReply, setSavingReply] = useState(false)
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all')

  useEffect(() => {
    loadReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant])

  async function loadReviews() {
    setLoading(true)
    const data = await getReviews(params.tenant)
    setReviews(data)
    setLoading(false)
  }

  const handleToggleVisible = async (id: string, currentVisible: boolean) => {
    const success = await toggleReviewVisible(id, !currentVisible)
    if (success) {
      setReviews(prev => prev.map(r => 
        r.id === id ? { ...r, is_visible: !currentVisible } : r
      ))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze review wilt verwijderen?')) return
    
    const success = await deleteReview(id)
    if (success) {
      setReviews(prev => prev.filter(r => r.id !== id))
    }
  }

  const submitReply = async (id: string) => {
    if (!replyText.trim()) return
    
    setSavingReply(true)
    const success = await replyToReview(id, replyText)
    if (success) {
      setReviews(prev => prev.map(r => 
        r.id === id ? { ...r, reply: replyText, replied_at: new Date().toISOString() } : r
      ))
      setReplyingTo(null)
      setReplyText('')
    }
    setSavingReply(false)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Vandaag'
    if (days === 1) return 'Gisteren'
    if (days < 7) return `${days} dagen geleden`
    if (days < 30) return `${Math.floor(days / 7)} weken geleden`
    return `${Math.floor(days / 30)} maanden geleden`
  }

  const filteredReviews = reviews.filter(r => {
    if (filter === 'visible') return r.is_visible
    if (filter === 'hidden') return !r.is_visible
    return true
  })

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  const ratingCounts = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length
  }))

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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('marketingReviews.title')}</h1>
          <p className="text-gray-500">{t('marketingReviews.subtitle')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm text-center col-span-2 md:col-span-1"
        >
          <p className="text-4xl font-bold text-blue-600">{averageRating}</p>
          <div className="flex justify-center my-1">
            {[1,2,3,4,5].map(s => (
              <span key={s} className={s <= Math.round(Number(averageRating)) ? 'text-yellow-400' : 'text-gray-200'}>★</span>
            ))}
          </div>
          <p className="text-sm text-gray-500">Gemiddeld ({reviews.length})</p>
        </motion.div>
        {ratingCounts.slice(0, 4).map((item, i) => (
          <motion.div
            key={item.rating}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i+1) * 0.1 }}
            className="bg-white rounded-2xl p-4 shadow-sm text-center"
          >
            <p className="text-2xl font-bold text-gray-900">{item.count}</p>
            <div className="flex justify-center">
              {[...Array(item.rating)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'all', label: t('marketingReviews.all'), count: reviews.length },
          { id: 'visible', label: t('marketingReviews.visible'), count: reviews.filter(r => r.is_visible).length },
          { id: 'hidden', label: t('marketingReviews.hidden'), count: reviews.filter(r => !r.is_visible).length },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as 'all' | 'visible' | 'hidden')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              filter === f.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 bg-white rounded-2xl shadow-sm"
        >
          <span className="text-6xl mb-4 block">⭐</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {filter === 'all' ? t('marketingReviews.noReviews') : filter === 'visible' ? t('marketingReviews.noVisibleReviews') : t('marketingReviews.noHiddenReviews')}
          </h3>
          <p className="text-gray-500">
            {filter === 'all' ? t('marketingReviews.noReviewsDesc') : t('marketingReviews.changeFilter')}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredReviews.map((review, index) => (
              <motion.div
                key={review.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-2xl p-6 shadow-sm ${!review.is_visible ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-lg">{review.customer_name[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{review.customer_name}</p>
                        {review.is_verified && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">✓ Geverifieerd</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{formatDate(review.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={`text-lg ${s <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                    <button
                      onClick={() => handleToggleVisible(review.id!, review.is_visible)}
                      className={`p-2 rounded-lg transition-colors ${review.is_visible ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                      title={review.is_visible ? 'Zichtbaar - Klik om te verbergen' : 'Verborgen - Klik om te tonen'}
                    >
                      {review.is_visible ? '👁️' : '🙈'}
                    </button>
                    <button
                      onClick={() => handleDelete(review.id!)}
                      className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      title="Verwijderen"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {review.text && (
                  <p className="text-gray-700 mb-4">{review.text}</p>
                )}

                {/* Reply */}
                {review.reply && (
                  <div className="bg-blue-50 rounded-xl p-4 ml-8 mb-4">
                    <p className="text-sm text-blue-700">
                      <strong>Jouw reactie:</strong> {review.reply}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">{formatDate(review.replied_at)}</p>
                  </div>
                )}

                {/* Reply Form */}
                {replyingTo === review.id ? (
                  <div className="ml-8">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Schrijf een reactie..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-2"
                    />
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => submitReply(review.id!)}
                        disabled={savingReply || !replyText.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium flex items-center gap-2"
                      >
                        {savingReply ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          />
                        ) : (
                          '✓'
                        )}
                        Versturen
                      </motion.button>
                      <button
                        onClick={() => { setReplyingTo(null); setReplyText(''); }}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                ) : !review.reply && (
                  <button
                    onClick={() => setReplyingTo(review.id!)}
                    className="text-blue-600 text-sm font-medium hover:underline ml-8"
                  >
                    💬 Reageren
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6"
      >
        <h3 className="font-semibold text-blue-900 mb-2">💡 {t('marketingReviews.tips.title')}</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• {t('marketingReviews.tips.tip1')}</li>
          <li>• {t('marketingReviews.tips.tip2')}</li>
          <li>• {t('marketingReviews.tips.tip3')}</li>
          <li>• {t('marketingReviews.tips.tip4')}</li>
        </ul>
      </motion.div>
    </div>
  )
}
