'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface Review {
  id: string
  author: string
  rating: number
  text: string
  date: string
  reply: string | null
  visible: boolean
}

export default function ReviewsPage({ params }: { params: { tenant: string } }) {
  const [reviews, setReviews] = useState<Review[]>([
    { id: '1', author: 'Marc V.', rating: 5, text: 'Beste frieten van de streek! Altijd vers en krokant. De stoofvleessaus is hemels.', date: '2 dagen geleden', reply: 'Bedankt Marc! Fijn dat je genoten hebt.', visible: true },
    { id: '2', author: 'Sarah D.', rating: 5, text: 'Snelle levering en altijd warm. De Bicky is hier echt de beste!', date: '1 week geleden', reply: null, visible: true },
    { id: '3', author: 'Kevin L.', rating: 4, text: 'Goede porties voor een eerlijke prijs. Aanrader!', date: '2 weken geleden', reply: null, visible: true },
    { id: '4', author: 'Jan P.', rating: 2, text: 'Friet was koud bij aankomst. Jammer.', date: '3 weken geleden', reply: 'Onze excuses Jan, we nemen contact op.', visible: false },
  ])
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const averageRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)

  const toggleVisible = (id: string) => {
    setReviews(prev => prev.map(r => 
      r.id === id ? { ...r, visible: !r.visible } : r
    ))
  }

  const submitReply = (id: string) => {
    setReviews(prev => prev.map(r => 
      r.id === id ? { ...r, reply: replyText } : r
    ))
    setReplyingTo(null)
    setReplyText('')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-500">Beheer klantbeoordelingen</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm text-center"
        >
          <p className="text-4xl font-bold text-orange-500">{averageRating}</p>
          <div className="flex justify-center my-1">
            {[1,2,3,4,5].map(s => (
              <span key={s} className={s <= Math.round(Number(averageRating)) ? 'text-yellow-400' : 'text-gray-200'}>★</span>
            ))}
          </div>
          <p className="text-sm text-gray-500">Gemiddeld</p>
        </motion.div>
        {[5,4,3].map((stars, i) => (
          <motion.div
            key={stars}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i+1) * 0.1 }}
            className="bg-white rounded-2xl p-4 shadow-sm text-center"
          >
            <p className="text-2xl font-bold text-gray-900">
              {reviews.filter(r => r.rating === stars).length}
            </p>
            <div className="flex justify-center">
              {[...Array(stars)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}
            </div>
            <p className="text-sm text-gray-500">{stars} sterren</p>
          </motion.div>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-white rounded-2xl p-6 shadow-sm ${!review.visible ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-500 font-bold text-lg">{review.author[0]}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{review.author}</p>
                  <p className="text-sm text-gray-500">{review.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className={`text-lg ${s <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                  ))}
                </div>
                <button
                  onClick={() => toggleVisible(review.id)}
                  className={`p-2 rounded-lg ${review.visible ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                  title={review.visible ? 'Zichtbaar' : 'Verborgen'}
                >
                  {review.visible ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <p className="text-gray-700 mb-4">{review.text}</p>

            {/* Reply */}
            {review.reply && (
              <div className="bg-orange-50 rounded-xl p-4 ml-8 mb-4">
                <p className="text-sm text-orange-700">
                  <strong>Jouw reactie:</strong> {review.reply}
                </p>
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => submitReply(review.id)}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium"
                  >
                    Versturen
                  </button>
                  <button
                    onClick={() => { setReplyingTo(null); setReplyText(''); }}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            ) : !review.reply && (
              <button
                onClick={() => setReplyingTo(review.id)}
                className="text-orange-500 text-sm font-medium hover:underline"
              >
                💬 Reageren
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
