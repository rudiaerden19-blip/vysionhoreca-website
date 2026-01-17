'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { getTenantSettings, getOpeningHours, getDeliverySettings, getMenuProducts, createReservation, getTenantTexts, getVisibleReviews, TenantSettings, OpeningHour, DeliverySettings, MenuProduct, TenantTexts, Review as DbReview } from '@/lib/admin-api'
import { supabase } from '@/lib/supabase'

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
  postal_code?: string
  city?: string
  btw_number?: string
  phone: string
  email: string
  primary_color: string
  opening_hours: Record<string, { open?: string; close?: string; closed?: boolean; hasBreak?: boolean; breakStart?: string; breakEnd?: string }>
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
  top_seller_1?: string
  top_seller_2?: string
  top_seller_3?: string
  about_image?: string
  specialty_1_image?: string
  specialty_1_title?: string
  specialty_2_image?: string
  specialty_2_title?: string
  specialty_3_image?: string
  specialty_3_title?: string
  show_qr_codes?: boolean
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

const dayNames = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
const dayNamesNL = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

const formatReviewDate = (dateString?: string) => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Vandaag'
    if (days === 1) return 'Gisteren'
    if (days < 7) return `${days} dagen geleden`
    if (days < 30) return `${Math.floor(days / 7)} weken geleden`
    if (days < 365) return `${Math.floor(days / 30)} maanden geleden`
    
    // Voor oudere reviews, toon de datum
    return date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function TenantLandingPage({ params }: { params: { tenant: string } }) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [popularItems, setPopularItems] = useState<PopularItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [scrollY, setScrollY] = useState(0)
  const [isBlocked, setIsBlocked] = useState(false)
  
  // Reservation form state
  const [reservationForm, setReservationForm] = useState({
    name: '',
    phone: '',
    date: '',
    time: '',
    partySize: '',
    notes: '',
  })
  const [reservationSubmitting, setReservationSubmitting] = useState(false)
  const [reservationSuccess, setReservationSuccess] = useState(false)
  const [reservationError, setReservationError] = useState('')

  const handleReservationSubmit = async () => {
    if (!reservationForm.name || !reservationForm.phone || !reservationForm.date || !reservationForm.time || !reservationForm.partySize) {
      setReservationError('Vul alle verplichte velden in')
      return
    }
    
    setReservationSubmitting(true)
    setReservationError('')
    
    const success = await createReservation({
      tenant_slug: params.tenant,
      customer_name: reservationForm.name,
      customer_phone: reservationForm.phone,
      reservation_date: reservationForm.date,
      reservation_time: reservationForm.time,
      party_size: parseInt(reservationForm.partySize),
      notes: reservationForm.notes,
    })
    
    if (success) {
      setReservationSuccess(true)
      setReservationForm({ name: '', phone: '', date: '', time: '', partySize: '', notes: '' })
    } else {
      setReservationError('Er ging iets mis. Probeer opnieuw of bel ons.')
    }
    setReservationSubmitting(false)
  }

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    async function loadData() {
      // Check of tenant geblokkeerd is
      if (supabase) {
        const { data: blockCheck } = await supabase
          .from('tenant_settings')
          .select('is_blocked')
          .eq('tenant_slug', params.tenant)
          .single()
        
        if (blockCheck?.is_blocked) {
          setIsBlocked(true)
          setLoading(false)
          return
        }
      }

      // Laad data uit Supabase
      const [tenantData, hoursData, deliveryData, productsData, textsData, reviewsData] = await Promise.all([
        getTenantSettings(params.tenant),
        getOpeningHours(params.tenant),
        getDeliverySettings(params.tenant),
        getMenuProducts(params.tenant),
        getTenantTexts(params.tenant),
        getVisibleReviews(params.tenant),
      ])

      // Converteer openingstijden naar het juiste formaat
      const openingHoursMap: Record<string, { open?: string; close?: string; closed?: boolean; hasBreak?: boolean; breakStart?: string; breakEnd?: string }> = {}
      dayNamesNL.forEach((dayName, index) => {
        const hourData = hoursData.find(h => h.day_of_week === index)
        const dayKey = dayName.toLowerCase()
        if (hourData) {
          openingHoursMap[dayKey] = hourData.is_open 
            ? { 
                open: hourData.open_time, 
                close: hourData.close_time,
                hasBreak: hourData.has_break,
                breakStart: hourData.break_start || undefined,
                breakEnd: hourData.break_end || undefined,
              }
            : { closed: true }
        } else {
          openingHoursMap[dayKey] = { closed: true }
        }
      })

      // Bouw business object
      setBusiness({
        id: '1',
        name: tenantData?.business_name || params.tenant,
        slug: params.tenant,
        tagline: tenantData?.tagline || 'Welkom bij onze zaak',
        logo_url: tenantData?.logo_url || '',
        cover_images: [
          tenantData?.cover_image_1 || 'https://images.unsplash.com/photo-1619881590738-a111d176d906?w=1600',
          tenantData?.cover_image_2 || 'https://images.unsplash.com/photo-1598679253544-2c97992403ea?w=1600',
          tenantData?.cover_image_3 || 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=1600',
        ].filter(img => img && img.trim() !== ''),
        description: tenantData?.description || '',
        story: tenantData?.description || '',
        address: tenantData?.address || '',
        postal_code: tenantData?.postal_code || '',
        city: tenantData?.city || '',
        btw_number: tenantData?.btw_number || '',
        phone: tenantData?.phone || '',
        email: tenantData?.email || '',
        primary_color: tenantData?.primary_color || '#FF6B35',
        opening_hours: openingHoursMap,
        social_facebook: tenantData?.facebook_url || '',
        social_instagram: tenantData?.instagram_url || '',
        social_tiktok: tenantData?.tiktok_url || '',
        delivery_enabled: deliveryData?.delivery_enabled === true,
        pickup_enabled: deliveryData?.pickup_enabled === true,
        dine_in_enabled: false,
        minimum_order: deliveryData?.min_order_amount ?? 15,
        delivery_fee: deliveryData?.delivery_fee ?? 2.50,
        delivery_time: `${deliveryData?.delivery_time_minutes ?? 30}-${(deliveryData?.delivery_time_minutes ?? 30) + 15} min`,
        pickup_time: `${deliveryData?.pickup_time_minutes ?? 15}-${(deliveryData?.pickup_time_minutes ?? 15) + 5} min`,
        average_rating: reviewsData.length > 0 
          ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length 
          : 0,
        review_count: reviewsData.length,
        top_seller_1: tenantData?.top_seller_1 || '',
        top_seller_2: tenantData?.top_seller_2 || '',
        top_seller_3: tenantData?.top_seller_3 || '',
        about_image: tenantData?.about_image || '',
        specialty_1_image: tenantData?.specialty_1_image || '',
        specialty_1_title: tenantData?.specialty_1_title || '',
        specialty_2_image: tenantData?.specialty_2_image || '',
        specialty_2_title: tenantData?.specialty_2_title || '',
        specialty_3_image: tenantData?.specialty_3_image || '',
        specialty_3_title: tenantData?.specialty_3_title || '',
        show_qr_codes: tenantData?.show_qr_codes ?? true,
      })

      // Populaire items uit producten
      const popular = productsData
        .filter(p => p.is_popular && p.is_active)
        .slice(0, 4)
        .map(p => ({
          id: p.id || '',
          name: p.name,
          price: p.price,
          image_url: p.image_url || 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400',
        }))
      
      // Als geen populaire items, toon eerste 4 actieve producten
      if (popular.length === 0) {
        const activeProducts = productsData.filter(p => p.is_active).slice(0, 4)
        setPopularItems(activeProducts.map(p => ({
          id: p.id || '',
          name: p.name,
          price: p.price,
          image_url: p.image_url || 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400',
        })))
      } else {
        setPopularItems(popular)
      }

      // Reviews uit database (alleen goedgekeurde)
      const formattedReviews = reviewsData.map(r => ({
        id: r.id || '',
        author: r.customer_name,
        rating: r.rating,
        text: r.text || '',
        date: formatReviewDate(r.created_at),
      }))
      setReviews(formattedReviews)

      setLoading(false)
    }

    loadData()

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

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-12 shadow-xl max-w-md w-full text-center"
        >
          <span className="text-6xl mb-6 block">🚫</span>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Shop Tijdelijk Niet Beschikbaar</h1>
          <p className="text-gray-600 mb-6">
            Deze webshop is momenteel niet actief. Neem contact op met de eigenaar voor meer informatie.
          </p>
          <Link href="/" className="text-orange-500 hover:text-orange-600 font-medium">
            ← Terug naar Vysion
          </Link>
        </motion.div>
      </div>
    )
  }

  if (!business) return null

  const todayHours = business.opening_hours[getDayName()]

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/shop/${params.tenant}`} className="flex items-center gap-3">
            {business.logo_url && (
              <img src={business.logo_url} alt={business.name} className="w-10 h-10 rounded-full object-cover" />
            )}
            <span className="text-white font-bold text-lg hidden sm:block">{business.name}</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <Link 
              href={`/shop/${params.tenant}/menu`}
              style={{ backgroundColor: business.primary_color }}
              className="text-white font-medium px-4 py-2 rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              🍟 Menu
            </Link>
            <Link 
              href={`/shop/${params.tenant}/account`}
              className="bg-white/20 backdrop-blur-md text-white font-medium px-4 py-2 rounded-full text-sm hover:bg-white/30 transition-colors flex items-center gap-2"
            >
              <span>👤</span>
              <span className="hidden sm:inline">Account</span>
            </Link>
          </div>
        </div>
      </header>

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
              className="w-full h-full object-cover object-center"
              style={{ objectPosition: 'center 30%' }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />


        {/* Content */}
        <motion.div 
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
                  Nu open · Sluit om {todayHours?.close?.slice(0, 5)}
                </span>
              )}
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
              {business.address && (
                <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm">
                  <span>📍</span> {business.address}
                </span>
              )}
            </motion.div>
          </div>
        </motion.div>

      </section>


      {/* About Section */}
      {business.story && (
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <span style={{ color: business.primary_color }} className="font-semibold text-sm uppercase tracking-wider">Ons verhaal</span>
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 mt-2 mb-6">Over Ons</h2>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  {business.story}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                  <img
                    src={business.about_image || "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800"}
                    alt="Onze frituur"
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* Specialiteiten Section */}
      {(business.specialty_1_image || business.specialty_2_image || business.specialty_3_image) && (
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span style={{ color: business.primary_color }} className="font-semibold text-sm uppercase tracking-wider">Onze keuken</span>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mt-2">Onze Specialiteiten</h2>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Specialty 1 */}
              {business.specialty_1_image && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="group cursor-pointer"
                >
                  <div className="relative overflow-hidden rounded-2xl shadow-lg aspect-square">
                    <img 
                      src={business.specialty_1_image}
                      alt={business.specialty_1_title || 'Specialiteit 1'}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-2xl font-bold text-white">{business.specialty_1_title || 'Specialiteit'}</h3>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Specialty 2 */}
              {business.specialty_2_image && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="group cursor-pointer"
                >
                  <div className="relative overflow-hidden rounded-2xl shadow-lg aspect-square">
                    <img 
                      src={business.specialty_2_image}
                      alt={business.specialty_2_title || 'Specialiteit 2'}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-2xl font-bold text-white">{business.specialty_2_title || 'Specialiteit'}</h3>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Specialty 3 */}
              {business.specialty_3_image && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="group cursor-pointer"
                >
                  <div className="relative overflow-hidden rounded-2xl shadow-lg aspect-square">
                    <img 
                      src={business.specialty_3_image}
                      alt={business.specialty_3_title || 'Specialiteit 3'}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-2xl font-bold text-white">{business.specialty_3_title || 'Specialiteit'}</h3>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Table Reservation Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span style={{ color: business.primary_color }} className="font-semibold text-sm uppercase tracking-wider">Kom langs</span>
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
            className="bg-white rounded-3xl p-8 md:p-12 shadow-sm"
          >
            {reservationSuccess ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Reservering ontvangen!</h3>
                <p className="text-gray-600 mb-6">
                  We hebben je reservering ontvangen. Je krijgt zo snel mogelijk een bevestiging.
                </p>
                <button
                  onClick={() => setReservationSuccess(false)}
                  className="text-orange-500 hover:text-orange-600 font-medium"
                >
                  Nieuwe reservering maken
                </button>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Naam *
                    </label>
                    <input
                      type="text"
                      value={reservationForm.name}
                      onChange={(e) => setReservationForm({ ...reservationForm, name: e.target.value })}
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
                      value={reservationForm.phone}
                      onChange={(e) => setReservationForm({ ...reservationForm, phone: e.target.value })}
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
                      value={reservationForm.date}
                      onChange={(e) => setReservationForm({ ...reservationForm, date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tijd *
                    </label>
                    <select 
                      value={reservationForm.time}
                      onChange={(e) => setReservationForm({ ...reservationForm, time: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
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
                    <select 
                      value={reservationForm.partySize}
                      onChange={(e) => setReservationForm({ ...reservationForm, partySize: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
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
                      value={reservationForm.notes}
                      onChange={(e) => setReservationForm({ ...reservationForm, notes: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Bijv. kinderstoel, allergie..."
                    />
                  </div>
                </div>

                {reservationError && (
                  <p className="text-red-500 text-center mt-4">{reservationError}</p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleReservationSubmit}
                  disabled={reservationSubmitting}
                  style={{ backgroundColor: business.primary_color }}
                  className="w-full mt-8 text-white font-bold text-lg py-4 rounded-xl transition-colors flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                >
                  {reservationSubmitting ? (
                    <span>Even geduld...</span>
                  ) : (
                    <>
                      <span>🍽️</span>
                      <span>Reserveer nu</span>
                    </>
                  )}
                </motion.button>

                <p className="text-center text-gray-500 text-sm mt-4">
                  Je ontvangt een bevestiging via telefoon of e-mail
                </p>
              </>
            )}
          </motion.div>
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
            <span style={{ color: business.primary_color }} className="font-semibold text-sm uppercase tracking-wider">Wat klanten zeggen</span>
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
                  <div style={{ backgroundColor: `${business.primary_color}20` }} className="w-12 h-12 rounded-full flex items-center justify-center">
                    <span style={{ color: business.primary_color }} className="font-bold text-lg">{review.author[0]}</span>
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

      {/* Top Sellers Section */}
      {business && (business.top_seller_1 || business.top_seller_2 || business.top_seller_3) && (
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 italic">
                Onze Meest Verkochte Producten
              </h2>
              <div className="w-16 h-1 bg-blue-500 mx-auto mt-4 mb-6"></div>
              <p className="text-gray-600">
                Dit zijn de meest verkochte producten bij {business.name.toLowerCase()}.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 justify-items-center">
              {[business.top_seller_1, business.top_seller_2, business.top_seller_3]
                .filter(url => url && url.trim() !== '')
                .map((imageUrl, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <img
                      src={imageUrl}
                      alt={`Topverkoper ${index + 1}`}
                      className="w-full h-72 object-cover"
                    />
                  </motion.div>
                ))
              }
            </div>
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
                        : hours.hasBreak && hours.breakStart && hours.breakEnd
                          ? `${hours.open?.slice(0, 5)} - ${hours.breakStart?.slice(0, 5)} & ${hours.breakEnd?.slice(0, 5)} - ${hours.close?.slice(0, 5)}`
                          : `${hours.open?.slice(0, 5)} - ${hours.close?.slice(0, 5)}`
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
                {business.address && (
                  <a 
                    href={`https://maps.google.com/?q=${encodeURIComponent(`${business.address} ${business.postal_code || ''} ${business.city || ''}`)}`}
                    target="_blank"
                    className="flex items-start gap-4 group"
                  >
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                      <span className="text-xl">📍</span>
                    </div>
                    <div>
                      <p className="font-semibold group-hover:text-orange-400 transition-colors">{business.address}</p>
                      {(business.postal_code || business.city) && (
                        <p className="font-semibold group-hover:text-orange-400 transition-colors">
                          {business.postal_code} {business.city}
                        </p>
                      )}
                      <p className="text-white/60 text-sm">Klik voor routebeschrijving</p>
                    </div>
                  </a>
                )}
                
                {business.btw_number && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                      <span className="text-xl">🏢</span>
                    </div>
                    <div>
                      <p className="font-semibold">BTW: {business.btw_number}</p>
                      <p className="text-white/60 text-sm">Ondernemingsnummer</p>
                    </div>
                  </div>
                )}

                {business.phone && (
                  <a href={`tel:${business.phone}`} className="flex items-start gap-4 group">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                      <span className="text-xl">📞</span>
                    </div>
                    <div>
                      <p className="font-semibold group-hover:text-orange-400 transition-colors">{business.phone}</p>
                      <p className="text-white/60 text-sm">Bel voor reservaties</p>
                    </div>
                  </a>
                )}

                {business.email && (
                  <a href={`mailto:${business.email}`} className="flex items-start gap-4 group">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                      <span className="text-xl">✉️</span>
                    </div>
                    <div>
                      <p className="font-semibold group-hover:text-orange-400 transition-colors">{business.email}</p>
                      <p className="text-white/60 text-sm">Stuur ons een bericht</p>
                    </div>
                  </a>
                )}

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

      {/* QR Codes Section */}
      {business.show_qr_codes && (
      <section className="py-16 bg-gray-100">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">📱 Scan & Ontdek</h2>
            <p className="text-gray-600">Scan de QR-codes met je smartphone</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Menu QR */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-lg text-center"
            >
              <div className="w-48 h-48 mx-auto mb-6 bg-white p-3 rounded-xl shadow-inner">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&data=${encodeURIComponent(`https://www.vysionhoreca.com/shop/${params.tenant}/menukaart`)}`}
                  alt="Menu QR Code"
                  className="w-full h-full"
                />
              </div>
              <div className="text-5xl mb-3">🍟</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Menu Bekijken</h3>
              <p className="text-gray-600">Scan om ons menu te zien</p>
            </motion.div>

            {/* Promoties QR */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-lg text-center"
            >
              <div className="w-48 h-48 mx-auto mb-6 bg-white p-3 rounded-xl shadow-inner">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&data=${encodeURIComponent(`https://www.vysionhoreca.com/shop/${params.tenant}/menukaart?promo=1`)}`}
                  alt="Promoties QR Code"
                  className="w-full h-full"
                />
              </div>
              <div className="text-5xl mb-3">🎁</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Promoties</h3>
              <p className="text-gray-600">Scan om onze aanbiedingen te zien</p>
            </motion.div>

            {/* Review QR */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-8 shadow-lg text-center"
            >
              <div className="w-48 h-48 mx-auto mb-6 bg-white p-3 rounded-xl shadow-inner">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&data=${encodeURIComponent(`https://www.vysionhoreca.com/shop/${params.tenant}/review`)}`}
                  alt="Review QR Code"
                  className="w-full h-full"
                />
              </div>
              <div className="text-5xl mb-3">⭐</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Review Geven</h3>
              <p className="text-gray-600">Scan om een beoordeling te geven</p>
            </motion.div>
          </div>
        </div>
      </section>
      )}

      {/* CTA Section */}
      <section style={{ background: `linear-gradient(to right, ${business.primary_color}, ${business.primary_color}cc)` }} className="py-20">
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
              Bestel nu online en geniet van de lekkerste gerechten!
            </p>
            <Link href={`/shop/${params.tenant}/menu`}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ color: business.primary_color }}
                className="bg-white font-bold text-xl px-12 py-5 rounded-full shadow-2xl inline-flex items-center gap-3"
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
                Powered by <span style={{ color: business.primary_color }} className="font-semibold">Vysion</span>
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
            style={{ backgroundColor: business.primary_color, boxShadow: `0 25px 50px -12px ${business.primary_color}66` }}
            className="w-full text-white font-bold py-4 rounded-2xl shadow-2xl flex items-center justify-center gap-3 hover:opacity-90"
          >
            <span>🍟</span>
            <span>Bestel Nu</span>
          </motion.button>
        </Link>
      </div>
    </div>
  )
}
