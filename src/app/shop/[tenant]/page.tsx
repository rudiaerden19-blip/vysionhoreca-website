'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface Business {
  id: string
  name: string
  slug: string
  tagline: string
  logo_url: string
  cover_images: string[]
  description: string
  story: string
  address: string
  phone: string
  email: string
  primary_color: string
  opening_hours: Record<string, { open?: string; close?: string; closed?: boolean }>
  social_facebook: string
  social_instagram: string
  social_tiktok: string
  delivery_enabled: boolean
  pickup_enabled: boolean
  dine_in_enabled: boolean
  minimum_order: number
  delivery_fee: number
  delivery_time: string
  pickup_time: string
  average_rating: number
  review_count: number
}

interface Review {
  id: string
  author: string
  rating: number
  text: string
  date: string
}

interface PopularItem {
  id: string
  name: string
  price: number
  image_url: string
}

export default function TenantLandingPage({ params }: { params: { tenant: string } }) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [popularItems, setPopularItems] = useState<PopularItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    // Demo business data
    setBusiness({
      id: '1',
      name: 'Frituur De Gouden Friet',
      slug: params.tenant,
      tagline: 'Ambachtelijke frieten sinds 1985',
      logo_url: 'https://i.imgur.com/placeholder.png',
      cover_images: [
        'https://images.unsplash.com/photo-1619881590738-a111d176d906?w=1600',
        'https://images.unsplash.com/photo-1598679253544-2c97992403ea?w=1600',
        'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=1600',
      ],
      description: 'De lekkerste frieten van de regio! Ambachtelijk bereid met verse Belgische aardappelen, gebakken in rundvet.',
      story: 'Al meer dan 35 jaar serveren wij de lekkerste frieten van Pelt. Onze frituur is een familiebedrijf, opgericht door onze grootouders in 1985. Wij gebruiken alleen de beste Bintje aardappelen, vers geschild en dubbel gebakken in rundvet. Dat proef je!',
      address: 'Marktplein 15, 3900 Pelt',
      phone: '+32 11 12 34 56',
      email: 'info@degoudenfriet.be',
      primary_color: '#FF6B35',
      opening_hours: {
        maandag: { open: '11:00', close: '21:00' },
        dinsdag: { open: '11:00', close: '21:00' },
        woensdag: { closed: true },
        donderdag: { open: '11:00', close: '21:00' },
        vrijdag: { open: '11:00', close: '22:00' },
        zaterdag: { open: '11:00', close: '22:00' },
        zondag: { open: '12:00', close: '21:00' },
      },
      social_facebook: 'https://facebook.com/degoudenfriet',
      social_instagram: 'https://instagram.com/degoudenfriet',
      social_tiktok: 'https://tiktok.com/@degoudenfriet',
      delivery_enabled: true,
      pickup_enabled: true,
      dine_in_enabled: true,
      minimum_order: 15,
      delivery_fee: 2.50,
      delivery_time: '30-45 min',
      pickup_time: '15-20 min',
      average_rating: 4.8,
      review_count: 127,
    })

    // Demo reviews
    setReviews([
      { id: '1', author: 'Marc V.', rating: 5, text: 'Beste frieten van de streek! Altijd vers en krokant. De stoofvleessaus is hemels.', date: '2 dagen geleden' },
      { id: '2', author: 'Sarah D.', rating: 5, text: 'Snelle levering en altijd warm. De Bicky is hier echt de beste!', date: '1 week geleden' },
      { id: '3', author: 'Kevin L.', rating: 4, text: 'Goede porties voor een eerlijke prijs. Aanrader!', date: '2 weken geleden' },
      { id: '4', author: 'Lisa M.', rating: 5, text: 'Wij bestellen hier elke vrijdag. Nooit teleurgesteld!', date: '3 weken geleden' },
    ])

    // Demo popular items
    setPopularItems([
      { id: '1', name: 'Grote Friet', price: 4.50, image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400' },
      { id: '2', name: 'Bicky Burger', price: 5.50, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
      { id: '3', name: 'Stoofvleessaus', price: 3.00, image_url: 'https://images.unsplash.com/photo-1607116667981-80f49cdf2c42?w=400' },
      { id: '4', name: 'Frikandel Speciaal', price: 4.00, image_url: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400' },
    ])

    setLoading(false)

    // Image slider
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % 3)
    }, 5000)
    return () => clearInterval(interval)
  }, [params.tenant])

  const getDayName = () => {
    const days = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
    return days[new Date().getDay()]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600 font-medium">Laden...</p>
        </motion.div>
      </div>
    )
  }

  if (!business) return null

  const todayHours = business.opening_hours[getDayName()]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Parallax */}
      <section className="relative h-screen min-h-[700px] overflow-hidden">
        {/* Background Image Slider */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            style={{ transform: `translateY(${scrollY * 0.3}px)` }}
            className="absolute inset-0"
          >
            <img
              src={business.cover_images[currentImageIndex]}
              alt={business.name}
              className="w-full h-full object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

        {/* Image Indicators */}
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {business.cover_images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentImageIndex 
                  ? 'w-8 bg-white' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <motion.div 
          style={{ opacity: Math.max(0, 1 - scrollY / 400) }}
          className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 lg:p-16"
        >
          <div className="max-w-5xl mx-auto w-full">
            {/* Open/Closed Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-4"
            >
              {todayHours?.closed ? (
                <span className="inline-flex items-center gap-2 bg-red-500/90 backdrop-blur-md text-white px-4 py-2 rounded-full font-medium">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  Vandaag gesloten
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 bg-green-500/90 backdrop-blur-md text-white px-4 py-2 rounded-full font-medium">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  Nu open · Sluit om {todayHours?.close}
                </span>
              )}
            </motion.div>

            {/* Rating */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span 
                    key={star} 
                    className={`text-2xl ${star <= Math.round(business.average_rating) ? 'text-yellow-400' : 'text-gray-400'}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-white font-bold text-lg">{business.average_rating}</span>
              <span className="text-white/70">({business.review_count} reviews)</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-4 leading-none"
            >
              {business.name}
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-xl md:text-2xl text-white/90 mb-8 font-light"
            >
              {business.tagline}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-wrap gap-4"
            >
              <Link href={`/shop/${params.tenant}/menu`}>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(255, 107, 53, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg px-8 py-4 rounded-full transition-colors flex items-center gap-3"
                >
                  <span>🍟</span>
                  <span>Bestel Nu</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </motion.button>
              </Link>
              <motion.a
                href={`tel:${business.phone}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-lg px-8 py-4 rounded-full transition-colors flex items-center gap-3 border border-white/30"
              >
                <span>📞</span>
                <span>Bel Ons</span>
              </motion.a>
            </motion.div>

            {/* Quick Info Pills */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex flex-wrap gap-3 mt-8"
            >
              {business.pickup_enabled && (
                <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm">
                  <span>🛍️</span> Afhalen · {business.pickup_time}
                </span>
              )}
              {business.delivery_enabled && (
                <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm">
                  <span>🚗</span> Levering · {business.delivery_time}
                </span>
              )}
              <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm">
                <span>📍</span> {business.address}
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-white/50 flex flex-col items-center gap-2"
          >
            <span className="text-sm">Scroll</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* Popular Items Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-orange-500 font-semibold text-sm uppercase tracking-wider">Onze favorieten</span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mt-2">Meest Populair</h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {popularItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group cursor-pointer"
              >
                <Link href={`/shop/${params.tenant}/menu`}>
                  <div className="relative aspect-square rounded-3xl overflow-hidden mb-4 shadow-lg group-hover:shadow-2xl transition-shadow">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                      <span className="bg-orange-500 text-white font-bold px-4 py-2 rounded-full text-sm">
                        Bestel →
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-orange-500 transition-colors">{item.name}</h3>
                  <p className="text-orange-500 font-bold text-xl">€{item.price.toFixed(2)}</p>
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link href={`/shop/${params.tenant}/menu`}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-8 py-4 rounded-full inline-flex items-center gap-2"
              >
                Bekijk volledig menu
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-orange-500 font-semibold text-sm uppercase tracking-wider">Ons verhaal</span>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mt-2 mb-6">Over Ons</h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                {business.story}
              </p>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🏆</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">35+ jaar ervaring</p>
                  <p className="text-gray-500">Familiebedrijf sinds 1985</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800"
                  alt="Onze frituur"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-orange-500 text-white p-6 rounded-2xl shadow-xl">
                <p className="text-4xl font-black">127+</p>
                <p className="text-white/80">Tevreden klanten</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-orange-500 font-semibold text-sm uppercase tracking-wider">Wat klanten zeggen</span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mt-2">Reviews</h2>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="text-yellow-400 text-2xl">★</span>
                ))}
              </div>
              <span className="font-bold text-2xl text-gray-900">{business.average_rating}</span>
              <span className="text-gray-500">({business.review_count} reviews)</span>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {reviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-500 font-bold text-lg">{review.author[0]}</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{review.author}</p>
                    <p className="text-gray-500 text-sm">{review.date}</p>
                  </div>
                  <div className="ml-auto flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span 
                        key={star} 
                        className={`text-lg ${star <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 leading-relaxed">{review.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Table Reservation Section */}
      {business.dine_in_enabled && (
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="text-orange-500 font-semibold text-sm uppercase tracking-wider">Kom langs</span>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mt-2">Reserveer een tafel</h2>
              <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
                Wil je zeker zijn van een plekje? Reserveer vooraf en geniet ter plaatse van onze lekkernijen.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-gray-50 rounded-3xl p-8 md:p-12"
            >
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Naam *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Je naam"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefoonnummer *
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="+32 ..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Datum *
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tijd *
                  </label>
                  <select className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                    <option value="">Selecteer tijd</option>
                    <option value="11:00">11:00</option>
                    <option value="11:30">11:30</option>
                    <option value="12:00">12:00</option>
                    <option value="12:30">12:30</option>
                    <option value="13:00">13:00</option>
                    <option value="17:00">17:00</option>
                    <option value="17:30">17:30</option>
                    <option value="18:00">18:00</option>
                    <option value="18:30">18:30</option>
                    <option value="19:00">19:00</option>
                    <option value="19:30">19:30</option>
                    <option value="20:00">20:00</option>
                    <option value="20:30">20:30</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aantal personen *
                  </label>
                  <select className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                    <option value="">Selecteer</option>
                    <option value="1">1 persoon</option>
                    <option value="2">2 personen</option>
                    <option value="3">3 personen</option>
                    <option value="4">4 personen</option>
                    <option value="5">5 personen</option>
                    <option value="6">6 personen</option>
                    <option value="7">7+ personen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opmerkingen
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Bijv. kinderstoel, allergie..."
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-8 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span>🍽️</span>
                <span>Reserveer nu</span>
              </motion.button>

              <p className="text-center text-gray-500 text-sm mt-4">
                Je ontvangt een bevestiging via telefoon of e-mail
              </p>
            </motion.div>
          </div>
        </section>
      )}

      {/* Opening Hours & Contact Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Opening Hours */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <span className="text-4xl">🕐</span>
                Openingsuren
              </h2>
              <div className="space-y-3">
                {Object.entries(business.opening_hours).map(([day, hours]) => (
                  <div 
                    key={day}
                    className={`flex justify-between items-center py-3 border-b border-white/10 ${
                      day === getDayName() ? 'text-orange-400 font-bold' : ''
                    }`}
                  >
                    <span className="capitalize">{day}</span>
                    <span>
                      {hours.closed 
                        ? <span className="text-red-400">Gesloten</span>
                        : `${hours.open} - ${hours.close}`
                      }
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Contact */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <span className="text-4xl">📍</span>
                Contact
              </h2>
              <div className="space-y-6">
                <a 
                  href={`https://maps.google.com/?q=${encodeURIComponent(business.address)}`}
                  target="_blank"
                  className="flex items-start gap-4 group"
                >
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                    <span className="text-xl">📍</span>
                  </div>
                  <div>
                    <p className="font-semibold group-hover:text-orange-400 transition-colors">{business.address}</p>
                    <p className="text-white/60 text-sm">Klik voor routebeschrijving</p>
                  </div>
                </a>

                <a href={`tel:${business.phone}`} className="flex items-start gap-4 group">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                    <span className="text-xl">📞</span>
                  </div>
                  <div>
                    <p className="font-semibold group-hover:text-orange-400 transition-colors">{business.phone}</p>
                    <p className="text-white/60 text-sm">Bel voor reservaties</p>
                  </div>
                </a>

                <a href={`mailto:${business.email}`} className="flex items-start gap-4 group">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                    <span className="text-xl">✉️</span>
                  </div>
                  <div>
                    <p className="font-semibold group-hover:text-orange-400 transition-colors">{business.email}</p>
                    <p className="text-white/60 text-sm">Stuur ons een bericht</p>
                  </div>
                </a>

                {/* Social Media */}
                <div className="flex gap-4 pt-4">
                  {business.social_facebook && (
                    <a 
                      href={business.social_facebook}
                      target="_blank"
                      className="w-12 h-12 bg-white/10 hover:bg-blue-600 rounded-xl flex items-center justify-center transition-colors"
                    >
                      <span className="text-xl">📘</span>
                    </a>
                  )}
                  {business.social_instagram && (
                    <a 
                      href={business.social_instagram}
                      target="_blank"
                      className="w-12 h-12 bg-white/10 hover:bg-pink-600 rounded-xl flex items-center justify-center transition-colors"
                    >
                      <span className="text-xl">📸</span>
                    </a>
                  )}
                  {business.social_tiktok && (
                    <a 
                      href={business.social_tiktok}
                      target="_blank"
                      className="w-12 h-12 bg-white/10 hover:bg-black rounded-xl flex items-center justify-center transition-colors"
                    >
                      <span className="text-xl">🎵</span>
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-amber-500">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              Honger gekregen?
            </h2>
            <p className="text-white/90 text-xl mb-8">
              Bestel nu online en geniet van de lekkerste frieten!
            </p>
            <Link href={`/shop/${params.tenant}/menu`}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-orange-500 font-bold text-xl px-12 py-5 rounded-full shadow-2xl inline-flex items-center gap-3"
              >
                <span>🍟</span>
                <span>Start je bestelling</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="text-2xl font-bold">{business.name}</h3>
              <p className="text-white/60">{business.tagline}</p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-white/40 text-sm">
                Powered by <span className="text-orange-500 font-semibold">Vysion</span>
              </p>
              <p className="text-white/40 text-sm mt-1">
                © {new Date().getFullYear()} Alle rechten voorbehouden
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Order Button (Mobile) */}
      <div className="fixed bottom-6 left-4 right-4 md:hidden z-50">
        <Link href={`/shop/${params.tenant}/menu`}>
          <motion.button
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            whileTap={{ scale: 0.95 }}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-2xl shadow-orange-500/40 flex items-center justify-center gap-3"
          >
            <span>🍟</span>
            <span>Bestel Nu</span>
          </motion.button>
        </Link>
      </div>
    </div>
  )
}
