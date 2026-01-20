'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { getTenantSettings, getOpeningHours, getDeliverySettings, getMenuProducts, createReservation, getTenantTexts, getVisibleReviews, TenantSettings, OpeningHour, DeliverySettings, MenuProduct, TenantTexts, Review as DbReview } from '@/lib/admin-api'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'

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
  opening_hours: Record<string, { open?: string; close?: string; closed?: boolean; hasShift2?: boolean; open2?: string; close2?: string; hasBreak?: boolean; breakStart?: string; breakEnd?: string }>
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
  hiring_enabled?: boolean
  hiring_title?: string
  hiring_description?: string
  hiring_contact?: string
  gift_cards_enabled?: boolean
  stripe_public_key?: string
  reservations_enabled?: boolean
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

export default function TenantLandingPage({ params }: { params: { tenant: string } }) {
  const { t, locale, setLocale, locales, localeNames, localeFlags } = useLanguage()
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [business, setBusiness] = useState<Business | null>(null)
  
  // Formateer review datum met vertalingen
  const formatReviewDate = (dateString?: string) => {
    if (!dateString) return ''
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      
      if (days === 0) return t('timeAgo.today')
      if (days === 1) return t('timeAgo.yesterday')
      if (days < 7) return t('timeAgo.daysAgo').replace('{days}', String(days))
      if (days < 30) return t('timeAgo.weeksAgo').replace('{weeks}', String(Math.floor(days / 7)))
      if (days < 365) return t('timeAgo.monthsAgo').replace('{months}', String(Math.floor(days / 30)))
      
      // Voor oudere reviews, toon de datum in de juiste taal
      const localeMap: Record<string, string> = {
        nl: 'nl-BE', en: 'en-GB', fr: 'fr-FR', de: 'de-DE', 
        es: 'es-ES', it: 'it-IT', ja: 'ja-JP', zh: 'zh-CN', ar: 'ar-SA'
      }
      return date.toLocaleDateString(localeMap[locale] || 'nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
      return ''
    }
  }
  const [reviews, setReviews] = useState<Review[]>([])
  const [popularItems, setPopularItems] = useState<PopularItem[]>([])
  const [teamMembers, setTeamMembers] = useState<{id: string, name: string, role?: string, photo_url?: string}[]>([])
  const [showGiftCardModal, setShowGiftCardModal] = useState(false)
  const [giftCardForm, setGiftCardForm] = useState({
    occasion: '',
    amount: 50,
    customAmount: '',
    personalMessage: '',
    senderName: '',
    senderEmail: '',
    recipientName: '',
    recipientEmail: '',
  })
  const [giftCardLoading, setGiftCardLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [scrollY, setScrollY] = useState(0)
  const [isBlocked, setIsBlocked] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  
  // Check if owner is logged in for this tenant
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vysion_tenant')
      if (stored) {
        const tenant = JSON.parse(stored)
        if (tenant.tenant_slug === params.tenant) {
          setIsOwner(true)
        }
      }
    } catch {
      // Ignore
    }
  }, [params.tenant])
  
  // Reservation form state
  const [reservationForm, setReservationForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    date: '',
    time: '',
    partySize: '',
    notes: '',
  })
  
  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase())
  }
  const [reservationSubmitting, setReservationSubmitting] = useState(false)
  const [reservationSuccess, setReservationSuccess] = useState(false)
  const [reservationError, setReservationError] = useState('')
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [selectedDayClosed, setSelectedDayClosed] = useState(false)

  // Generate time slots based on opening hours for selected date
  const generateTimeSlots = (date: string, openingHours: Record<string, { open?: string; close?: string; closed?: boolean; hasBreak?: boolean; breakStart?: string; breakEnd?: string }>) => {
    if (!date || !openingHours) {
      setAvailableTimes([])
      setSelectedDayClosed(false)
      return
    }

    // Get day of week from date (0 = Sunday in JS, but we use Monday = 0)
    const dateObj = new Date(date)
    const jsDay = dateObj.getDay()
    const dayIndex = jsDay === 0 ? 6 : jsDay - 1 // Convert to our format
    
    const dayNames = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
    const dayKey = dayNames[dayIndex]
    const dayHours = openingHours[dayKey]

    if (!dayHours || dayHours.closed) {
      setAvailableTimes([])
      setSelectedDayClosed(true)
      return
    }

    setSelectedDayClosed(false)
    
    // Generate 30-minute slots between open and close time
    const times: string[] = []
    const openTime = dayHours.open || '11:00'
    const closeTime = dayHours.close || '21:00'
    const breakStart = dayHours.hasBreak ? dayHours.breakStart : null
    const breakEnd = dayHours.hasBreak ? dayHours.breakEnd : null

    const [openHour, openMin] = openTime.split(':').map(Number)
    const [closeHour, closeMin] = closeTime.split(':').map(Number)
    
    let currentHour = openHour
    let currentMin = openMin

    // Stop 1 hour before closing (for reservations)
    const lastReservationHour = closeHour - 1
    const lastReservationMin = closeMin

    while (currentHour < lastReservationHour || (currentHour === lastReservationHour && currentMin <= lastReservationMin)) {
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`
      
      // Skip break times
      if (breakStart && breakEnd) {
        const [breakStartHour, breakStartMin] = breakStart.split(':').map(Number)
        const [breakEndHour, breakEndMin] = breakEnd.split(':').map(Number)
        const currentMinutes = currentHour * 60 + currentMin
        const breakStartMinutes = breakStartHour * 60 + breakStartMin
        const breakEndMinutes = breakEndHour * 60 + breakEndMin
        
        if (currentMinutes >= breakStartMinutes && currentMinutes < breakEndMinutes) {
          // Skip this time, it's during break
          currentMin += 30
          if (currentMin >= 60) {
            currentMin = 0
            currentHour++
          }
          continue
        }
      }
      
      times.push(timeStr)
      
      currentMin += 30
      if (currentMin >= 60) {
        currentMin = 0
        currentHour++
      }
    }

    setAvailableTimes(times)
  }

  const handleReservationSubmit = async () => {
    if (!reservationForm.firstName || !reservationForm.lastName || !reservationForm.phone || !reservationForm.email || !reservationForm.date || !reservationForm.time || !reservationForm.partySize) {
      setReservationError(t('shopPage.fillAllFields'))
      return
    }
    
    // Check if day is closed
    if (selectedDayClosed) {
      setReservationError(t('shopPage.closedOnThisDay'))
      return
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(reservationForm.email)) {
      setReservationError(t('shopPage.invalidEmail'))
      return
    }
    
    setReservationSubmitting(true)
    setReservationError('')
    
    const fullName = `${capitalizeWords(reservationForm.firstName)} ${capitalizeWords(reservationForm.lastName)}`
    
    const success = await createReservation({
      tenant_slug: params.tenant,
      customer_name: fullName,
      customer_phone: reservationForm.phone,
      customer_email: reservationForm.email.toLowerCase(),
      reservation_date: reservationForm.date,
      reservation_time: reservationForm.time,
      party_size: parseInt(reservationForm.partySize),
      notes: capitalizeWords(reservationForm.notes),
    })
    
    if (success) {
      // Send confirmation email to customer
      try {
        await fetch('/api/send-reservation-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'pending',
            customerEmail: reservationForm.email.toLowerCase(),
            customerName: fullName,
            customerPhone: reservationForm.phone,
            reservationDate: reservationForm.date,
            reservationTime: reservationForm.time,
            partySize: parseInt(reservationForm.partySize),
            tenantSlug: params.tenant,
            businessName: business?.name,
          }),
        })
      } catch (emailError) {
        console.error('Failed to send reservation email:', emailError)
      }
      
      setReservationSuccess(true)
      setReservationForm({ firstName: '', lastName: '', phone: '', email: '', date: '', time: '', partySize: '', notes: '' })
    } else {
      setReservationError(t('shopPage.reservationError'))
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
      try {
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
        const openingHoursMap: Record<string, { open?: string; close?: string; closed?: boolean; hasShift2?: boolean; open2?: string; close2?: string; hasBreak?: boolean; breakStart?: string; breakEnd?: string }> = {}
      dayNamesNL.forEach((dayName, index) => {
        const hourData = hoursData.find(h => h.day_of_week === index)
        const dayKey = dayName.toLowerCase()
        if (hourData) {
          openingHoursMap[dayKey] = hourData.is_open 
            ? { 
                open: hourData.open_time, 
                close: hourData.close_time,
                hasShift2: hourData.has_shift2,
                open2: hourData.open_time_2 || undefined,
                close2: hourData.close_time_2 || undefined,
                // Legacy support
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
          tenantData?.cover_image_1,
          tenantData?.cover_image_2,
          tenantData?.cover_image_3,
        ].filter((img): img is string => !!img && img.trim() !== ''),
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
        hiring_enabled: tenantData?.hiring_enabled ?? false,
        hiring_title: tenantData?.hiring_title || '',
        hiring_description: tenantData?.hiring_description || '',
        hiring_contact: tenantData?.hiring_contact || '',
        gift_cards_enabled: tenantData?.gift_cards_enabled ?? false,
        stripe_public_key: tenantData?.stripe_public_key || '',
        reservations_enabled: tenantData?.reservations_enabled !== false, // Default true
      })

      // Team members ophalen
        if (supabase) {
          const { data: teamData } = await supabase
            .from('team_members')
            .select('*')
            .eq('tenant_slug', params.tenant)
            .eq('is_active', true)
            .order('display_order', { ascending: true })
          
          if (teamData) {
            setTeamMembers(teamData)
          }
        }

      // Populaire items uit producten
      const popular = productsData
        .filter(p => p.is_popular && p.is_active)
        .slice(0, 4)
        .map(p => ({
          id: p.id || '',
          name: p.name,
          price: p.price,
          image_url: p.image_url || '',
        }))
      
      // Als geen populaire items, toon eerste 4 actieve producten
      if (popular.length === 0) {
        const activeProducts = productsData.filter(p => p.is_active).slice(0, 4)
        setPopularItems(activeProducts.map(p => ({
          id: p.id || '',
          name: p.name,
          price: p.price,
          image_url: p.image_url || '',
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
      } catch (error) {
        console.error('Error loading tenant data:', error)
        setLoading(false)
      }
    }

    loadData()

    // Image slider
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % 3)
    }, 5000)
    return () => clearInterval(interval)
  }, [params.tenant])

  const getDayName = () => {
    // JavaScript: 0=Sunday, 1=Monday, etc.
    const jsDay = new Date().getDay() // 0=Sunday
    const days = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
    return days[jsDay]
  }

  const isCurrentlyOpen = () => {
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes() // Minutes since midnight
    const today = getDayName()
    const hours = business?.opening_hours[today]
    
    if (!hours || hours.closed) return false
    
    // Parse open and close times
    const openParts = hours.open?.split(':')
    const closeParts = hours.close?.split(':')
    
    if (!openParts || !closeParts) return false
    
    const openTime = parseInt(openParts[0]) * 60 + parseInt(openParts[1])
    const closeTime = parseInt(closeParts[0]) * 60 + parseInt(closeParts[1])
    
    // Check if current time is within opening hours
    // Handle case where close time might be after midnight (e.g., 23:00 - 02:00)
    if (closeTime < openTime) {
      // Open past midnight
      return currentTime >= openTime || currentTime < closeTime
    }
    
    return currentTime >= openTime && currentTime < closeTime
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
          <p className="text-gray-600 font-medium">{t('shopPage.loading')}</p>
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
    <div style={{ width: '100vw', maxWidth: '100vw', overflowX: 'clip' }} className="min-h-screen bg-white">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/shop/${params.tenant}`} className="flex items-center gap-3">
            {business.logo_url && (
              <div className="relative w-10 h-10">
                <Image 
                  src={business.logo_url} 
                  alt={business.name} 
                  fill
                  sizes="40px"
                  className="rounded-full object-cover" 
                />
              </div>
            )}
            <span className="text-white font-bold text-lg hidden sm:block">{business.name}</span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="bg-white/20 backdrop-blur-md text-white font-medium px-3 py-2 rounded-full text-sm hover:bg-white/30 transition-colors flex items-center gap-1"
                title={t('languageSwitcher.selectLanguage')}
              >
                <span>{localeFlags[locale]}</span>
                <span className="hidden sm:inline">{locale.toUpperCase()}</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Language Dropdown */}
              <AnimatePresence>
                {showLanguageMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl overflow-hidden z-50 min-w-[160px]"
                  >
                    {locales.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => {
                          setLocale(loc)
                          setShowLanguageMenu(false)
                        }}
                        className={`w-full px-4 py-2.5 text-left hover:bg-gray-100 transition-colors flex items-center gap-3 ${
                          locale === loc ? 'bg-gray-50 font-medium' : ''
                        }`}
                      >
                        <span className="text-lg">{localeFlags[loc]}</span>
                        <span className="text-gray-700">{localeNames[loc]}</span>
                        {locale === loc && (
                          <span className="ml-auto text-green-500">✓</span>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isOwner && (
              <Link 
                href={`/shop/${params.tenant}/admin`}
                className="bg-orange-500 text-white font-medium px-4 py-2 rounded-full text-sm hover:bg-orange-600 transition-colors flex items-center gap-2"
              >
                <span>⚙️</span>
                <span className="hidden sm:inline">{t('shopPage.admin')}</span>
              </Link>
            )}
            <Link 
              href={`/shop/${params.tenant}/menu`}
              style={{ backgroundColor: business.primary_color }}
              className="text-white font-medium px-4 py-2 rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              🍟 {t('shopPage.menu')}
            </Link>
            <Link 
              href={`/shop/${params.tenant}/account`}
              className="bg-white/20 backdrop-blur-md text-white font-medium px-4 py-2 rounded-full text-sm hover:bg-white/30 transition-colors flex items-center gap-2"
            >
              <span>👤</span>
              <span className="hidden sm:inline">{t('shopPage.account')}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Parallax */}
      <section className="relative h-screen min-h-[500px] sm:min-h-[700px] overflow-hidden">
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
            <Image
              src={business.cover_images[currentImageIndex]}
              alt={business.name}
              fill
              priority={currentImageIndex === 0}
              sizes="100vw"
              quality={85}
              className="object-cover object-center"
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
                  {t('shopPage.closedToday')}
                </span>
              ) : isCurrentlyOpen() ? (
                <span className="inline-flex items-center gap-2 bg-green-500/90 backdrop-blur-md text-white px-4 py-2 rounded-full font-medium">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  {t('shopPage.openNow')} · {t('shopPage.closesAt')} {todayHours?.close?.slice(0, 5)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 bg-orange-500/90 backdrop-blur-md text-white px-4 py-2 rounded-full font-medium">
                  <span className="w-2 h-2 bg-white rounded-full"></span>
                  {t('shopPage.closedNow')} · {t('shopPage.opensAt')} {todayHours?.open?.slice(0, 5)}
                </span>
              )}
            </motion.div>


            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white mb-4 leading-none break-words"
            >
              {business.name}
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-base sm:text-xl md:text-2xl text-white/90 mb-6 font-light"
            >
              {business.tagline}
            </motion.p>

            {/* Quick Info Pills */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-8"
            >
              {business.pickup_enabled && (
                <span className="inline-flex items-center gap-1 sm:gap-2 bg-white/10 backdrop-blur-md text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm">
                  <span>🛍️</span> <span className="hidden xs:inline">{t('shopPage.pickup')} ·</span> {business.pickup_time}
                </span>
              )}
              {business.delivery_enabled && (
                <span className="inline-flex items-center gap-1 sm:gap-2 bg-white/10 backdrop-blur-md text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm">
                  <span>🚗</span> <span className="hidden xs:inline">{t('shopPage.delivery')} ·</span> {business.delivery_time}
                </span>
              )}
              {business.address && (
                <span className="inline-flex items-center gap-1 sm:gap-2 bg-white/10 backdrop-blur-md text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm max-w-full truncate">
                  <span className="shrink-0">📍</span> <span className="truncate">{business.address}{business.postal_code || business.city ? `, ${business.postal_code || ''} ${business.city || ''}`.trim() : ''}</span>
                </span>
              )}
            </motion.div>
          </div>
        </motion.div>

      </section>


      {/* About Section */}
      {business.story && (
        <section className="py-12 sm:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
              <div>
                <span style={{ color: business.primary_color }} className="font-semibold text-sm uppercase tracking-wider">{t('shopPage.ourStory')}</span>
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 mt-2 mb-6">{t('shopPage.aboutUs')}</h2>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  {business.story}
                </p>
              </div>

              <div className="relative">
                <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl relative">
                  <Image
                    src={business.about_image || "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800"}
                    alt="Onze frituur"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    quality={80}
                    loading="lazy"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Specialiteiten Section */}
      {(business.specialty_1_image || business.specialty_2_image || business.specialty_3_image) && (
        <section 
          className="py-12 sm:py-20 relative overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${business.primary_color}08 0%, ${business.primary_color}15 50%, ${business.primary_color}08 100%)` 
          }}
        >
          {/* Decorative elements - hidden on mobile */}
          <div 
            className="hidden sm:block absolute top-10 left-10 w-48 h-48 rounded-full blur-3xl opacity-15"
            style={{ backgroundColor: business.primary_color }}
          />
          <div 
            className="hidden sm:block absolute bottom-10 right-10 w-64 h-64 rounded-full blur-3xl opacity-10"
            style={{ backgroundColor: business.primary_color }}
          />
          
          <div className="max-w-6xl mx-auto px-4 relative z-10">
            <div className="text-center mb-8 sm:mb-12">
              <span style={{ color: business.primary_color }} className="font-semibold text-sm uppercase tracking-wider">{t('shopPage.ourKitchen')}</span>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 mt-2">{t('shopPage.ourSpecialties')}</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
              {/* Specialty 1 */}
              {business.specialty_1_image && (
                <div className="group cursor-pointer">
                  <div className="relative overflow-hidden rounded-2xl shadow-lg aspect-square">
                    <Image 
                      src={business.specialty_1_image}
                      alt={business.specialty_1_title || t('shopPage.specialty')}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      quality={80}
                      loading="lazy"
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-2xl font-bold text-white">{business.specialty_1_title || t('shopPage.specialty')}</h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Specialty 2 */}
              {business.specialty_2_image && (
                <div className="group cursor-pointer">
                  <div className="relative overflow-hidden rounded-2xl shadow-lg aspect-square">
                    <Image 
                      src={business.specialty_2_image}
                      alt={business.specialty_2_title || t('shopPage.specialty')}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      quality={80}
                      loading="lazy"
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-2xl font-bold text-white">{business.specialty_2_title || t('shopPage.specialty')}</h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Specialty 3 */}
              {business.specialty_3_image && (
                <div className="group cursor-pointer">
                  <div className="relative overflow-hidden rounded-2xl shadow-lg aspect-square">
                    <Image 
                      src={business.specialty_3_image}
                      alt={business.specialty_3_title || t('shopPage.specialty')}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      quality={80}
                      loading="lazy"
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-2xl font-bold text-white">{business.specialty_3_title || t('shopPage.specialty')}</h3>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Table Reservation Section */}
      {business.reservations_enabled && (
      <section className="py-12 sm:py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <span style={{ color: business.primary_color }} className="font-semibold text-sm uppercase tracking-wider">{t('shopPage.comeBy')}</span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 mt-2">{t('shopPage.reserveTable')}</h2>
            <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
              {t('shopPage.reserveDescription')}
            </p>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-12 shadow-sm">
            {reservationSuccess ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('shopPage.reservationReceived')}</h3>
                <p className="text-gray-600 mb-4">
                  {t('shopPage.reservationReceivedDesc')}
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 max-w-md mx-auto">
                  <p className="text-blue-800 font-medium">
                    📧 {t('shopPage.reservationEmailNotice')}
                  </p>
                </div>
                <button
                  onClick={() => setReservationSuccess(false)}
                  className="text-orange-500 hover:text-orange-600 font-medium"
                >
                  {t('shopPage.newReservation')}
                </button>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('shopPage.firstName')} <span className="text-red-500">{t('shopPage.required')}</span>
                    </label>
                    <input
                      type="text"
                      value={reservationForm.firstName}
                      onChange={(e) => setReservationForm({ ...reservationForm, firstName: capitalizeWords(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder={t('shopPage.firstName')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('shopPage.lastName')} <span className="text-red-500">{t('shopPage.required')}</span>
                    </label>
                    <input
                      type="text"
                      value={reservationForm.lastName}
                      onChange={(e) => setReservationForm({ ...reservationForm, lastName: capitalizeWords(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder={t('shopPage.lastName')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('shopPage.email')} <span className="text-red-500">{t('shopPage.required')}</span>
                    </label>
                    <input
                      type="email"
                      value={reservationForm.email}
                      onChange={(e) => setReservationForm({ ...reservationForm, email: e.target.value.toLowerCase() })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder={t('shopPage.email')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('shopPage.phone')} <span className="text-red-500">{t('shopPage.required')}</span>
                    </label>
                    <input
                      type="tel"
                      value={reservationForm.phone}
                      onChange={(e) => setReservationForm({ ...reservationForm, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder={t('shopPage.phone')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('shopPage.date')} <span className="text-red-500">{t('shopPage.required')}</span>
                    </label>
                    <input
                      type="date"
                      value={reservationForm.date}
                      onChange={(e) => {
                        const newDate = e.target.value
                        setReservationForm({ ...reservationForm, date: newDate, time: '' })
                        if (business) {
                          generateTimeSlots(newDate, business.opening_hours)
                        }
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    {selectedDayClosed && reservationForm.date && (
                      <p className="text-red-500 text-sm mt-2">⚠️ {t('shopPage.closedOnThisDay')}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('shopPage.time')} <span className="text-red-500">{t('shopPage.required')}</span>
                    </label>
                    <select 
                      value={reservationForm.time}
                      onChange={(e) => setReservationForm({ ...reservationForm, time: e.target.value })}
                      disabled={!reservationForm.date || selectedDayClosed || availableTimes.length === 0}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">{!reservationForm.date ? t('shopPage.selectDateFirst') : selectedDayClosed ? t('shopPage.closed') : t('shopPage.selectTime')}</option>
                      {availableTimes.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('shopPage.numberOfPersons')} <span className="text-red-500">{t('shopPage.required')}</span>
                    </label>
                    <select 
                      value={reservationForm.partySize}
                      onChange={(e) => setReservationForm({ ...reservationForm, partySize: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">{t('shopPage.select')}</option>
                      <option value="1">1 {t('shopPage.person')}</option>
                      <option value="2">2 {t('shopPage.persons')}</option>
                      <option value="3">3 {t('shopPage.persons')}</option>
                      <option value="4">4 {t('shopPage.persons')}</option>
                      <option value="5">5 {t('shopPage.persons')}</option>
                      <option value="6">6 {t('shopPage.persons')}</option>
                      <option value="7">7+ {t('shopPage.personsPlus')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('shopPage.notes')}
                    </label>
                    <input
                      type="text"
                      value={reservationForm.notes}
                      onChange={(e) => setReservationForm({ ...reservationForm, notes: capitalizeWords(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder={t('shopPage.notesPlaceholder')}
                    />
                  </div>
                </div>

                {reservationError && (
                  <p className="text-red-500 text-center mt-4">{reservationError}</p>
                )}

                <button
                  onClick={handleReservationSubmit}
                  disabled={reservationSubmitting}
                  style={{ backgroundColor: business.primary_color }}
                  className="w-full mt-8 text-white font-bold text-lg py-4 rounded-xl transition-all flex items-center justify-center gap-2 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {reservationSubmitting ? (
                    <span>{t('shopPage.pleaseWait')}</span>
                  ) : (
                    <>
                      <span>🍽️</span>
                      <span>{t('shopPage.reserveNow')}</span>
                    </>
                  )}
                </button>

                <p className="text-center text-gray-500 text-sm mt-4">
                  {t('shopPage.confirmationNotice')}
                </p>
              </>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Vacatures / Personeel Sectie */}
      {business.hiring_enabled && (
        <section 
          className="py-12 sm:py-20 relative overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${business.primary_color}08 0%, ${business.primary_color}15 50%, ${business.primary_color}08 100%)` 
          }}
        >
          {/* Decorative elements */}
          <div 
            className="hidden sm:block absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: business.primary_color }}
          />
          <div 
            className="hidden sm:block absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl opacity-15"
            style={{ backgroundColor: business.primary_color }}
          />
          
          <div className="max-w-4xl mx-auto px-4 relative z-10">
            <div className="text-center">
              <span style={{ color: business.primary_color }} className="font-semibold text-sm uppercase tracking-wider">{t('shopPage.joinOurTeam')}</span>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 mt-2">
                {business.hiring_title || t('shopPage.lookingForStaff')}
              </h2>
            </div>

            <div className="mt-12 bg-white/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-lg border border-white/50">
              {business.hiring_description && (
                <div className="prose prose-lg max-w-none text-gray-700 mb-8">
                  <p className="whitespace-pre-line">{business.hiring_description}</p>
                </div>
              )}

              {business.hiring_contact && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-3 text-gray-600">
                    <span className="text-2xl">📧</span>
                    <span className="font-medium">{t('shopPage.interested')}</span>
                  </div>
                  <a
                    href={business.hiring_contact.includes('@') 
                      ? `mailto:${business.hiring_contact}` 
                      : `tel:${business.hiring_contact.replace(/\s/g, '')}`}
                    style={{ backgroundColor: business.primary_color }}
                    className="inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    <span>👋</span>
                    <span>{business.hiring_contact}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Reviews Section */}
      <section className="py-12 sm:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <span style={{ color: business.primary_color }} className="font-semibold text-sm uppercase tracking-wider">{t('shopPage.whatCustomersSay')}</span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 mt-2">{t('shopPage.reviews')}</h2>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="text-yellow-400 text-2xl">★</span>
                ))}
              </div>
              <span className="font-bold text-2xl text-gray-900">{business.average_rating}</span>
              <span className="text-gray-500">({business.review_count} {t('shopPage.reviews')})</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {reviews.map((review) => (
              <div
                key={review.id}
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Sellers Section */}
      {business && (business.top_seller_1 || business.top_seller_2 || business.top_seller_3) && (
        <section className="py-12 sm:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 italic">
                {t('shopPage.mostSoldProducts')}
              </h2>
              <div className="w-16 h-1 bg-blue-500 mx-auto mt-4 mb-6"></div>
              <p className="text-gray-600">
                {t('shopPage.mostSoldDescription')} {business.name.toLowerCase()}.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 justify-items-center">
              {[business.top_seller_1, business.top_seller_2, business.top_seller_3]
                .filter(url => url && url.trim() !== '')
                .map((imageUrl, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-shadow w-full relative h-72"
                  >
                    <Image
                      src={imageUrl!}
                      alt={`${t('shopPage.topSeller')} ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      quality={80}
                      loading="lazy"
                      className="object-cover"
                    />
                  </div>
                ))
              }
            </div>
          </div>
        </section>
      )}

      {/* Ons Team Section */}
      {teamMembers.length > 0 && (
        <section className="py-12 sm:py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-8 sm:mb-12">
              <span style={{ color: business.primary_color }} className="font-semibold text-sm uppercase tracking-wider">{t('shopPage.meetOur')}</span>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 mt-2">{t('shopPage.ourTeam')}</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="text-center"
                >
                  <div className="aspect-square rounded-2xl bg-gray-200 overflow-hidden mb-4 shadow-lg">
                    {member.photo_url ? (
                      <Image
                        src={member.photo_url}
                        alt={member.name}
                        width={300}
                        height={300}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl text-gray-400">
                        👤
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{member.name}</h3>
                  {member.role && (
                    <p className="text-gray-500">{member.role}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Cadeaubonnen Section */}
      {business.gift_cards_enabled && (
        <section 
          className="py-12 sm:py-20 relative overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${business.primary_color}10 0%, ${business.primary_color}20 50%, ${business.primary_color}10 100%)` 
          }}
        >
          <div 
            className="hidden sm:block absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: business.primary_color }}
          />
          <div 
            className="hidden sm:block absolute bottom-0 left-0 w-56 h-56 rounded-full blur-3xl opacity-15"
            style={{ backgroundColor: business.primary_color }}
          />
          
          <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
            <div>
              <span style={{ color: business.primary_color }} className="font-semibold text-sm uppercase tracking-wider">{t('shopPage.perfectGift')}</span>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 mt-2">{t('shopPage.giftCardTitle')}</h2>
              <p className="text-gray-600 mt-4 max-w-2xl mx-auto text-lg">
                {t('shopPage.giftCardDescription')}
              </p>
            </div>

            <div className="mt-10">
              <button
                onClick={() => setShowGiftCardModal(true)}
                style={{ backgroundColor: business.primary_color }}
                className="inline-flex items-center gap-3 px-8 py-4 text-white font-bold text-lg rounded-2xl hover:opacity-90 transition-opacity shadow-lg"
              >
                <span className="text-2xl">🎁</span>
                <span>{t('shopPage.orderGiftCard')}</span>
              </button>
            </div>

            {/* Gift card visual */}
            <div className="mt-12 max-w-md mx-auto">
              <div 
                className="relative rounded-2xl p-8 text-white shadow-2xl overflow-hidden"
                style={{ backgroundColor: business.primary_color }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <p className="text-white/70 text-sm">{t('shopPage.giftCard')}</p>
                      <p className="text-2xl font-bold">{business.name}</p>
                    </div>
                    <span className="text-4xl">🎁</span>
                  </div>
                  <div className="text-right">
                    <p className="text-white/70 text-sm">{t('shopPage.value')}</p>
                    <p className="text-3xl font-black">€50</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Opening Hours & Contact Section */}
      <section className="py-12 sm:py-20 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12">
            {/* Opening Hours */}
            <div>
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <span className="text-4xl">🕐</span>
                {t('shopPage.openingHours')}
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
                        ? <span className="text-red-400">{t('shopPage.closed')}</span>
                        : hours.hasShift2 && hours.open2 && hours.close2
                          ? `${hours.open?.slice(0, 5)} - ${hours.close?.slice(0, 5)} & ${hours.open2?.slice(0, 5)} - ${hours.close2?.slice(0, 5)}`
                          : `${hours.open?.slice(0, 5)} - ${hours.close?.slice(0, 5)}`
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <span className="text-4xl">📍</span>
                {t('shopPage.contact')}
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
                      <p className="text-white/60 text-sm">{t('shopPage.clickForDirections')}</p>
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
                      <p className="text-white/60 text-sm">{t('shopPage.vatNumber')}</p>
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
                      <p className="text-white/60 text-sm">{t('shopPage.callForReservations')}</p>
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
                      <p className="text-white/60 text-sm">{t('shopPage.sendUsMessage')}</p>
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
            </div>
          </div>
        </div>
      </section>

      {/* QR Codes Section */}
      {business.show_qr_codes && (
      <section className="py-10 sm:py-16 bg-gray-100">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('shopPage.scanAndDiscover')}</h2>
            <p className="text-gray-600">{t('shopPage.scanQrCodes')}</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
            {/* Menu QR */}
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-48 h-48 mx-auto mb-6 bg-white p-3 rounded-xl shadow-inner">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&data=${encodeURIComponent(`https://www.vysionhoreca.com/shop/${params.tenant}/menukaart`)}`}
                  alt="Menu QR Code"
                  className="w-full h-full"
                />
              </div>
              <div className="text-5xl mb-3">🍟</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('shopPage.viewMenu')}</h3>
              <p className="text-gray-600">{t('shopPage.scanToSeeMenu')}</p>
            </div>

            {/* Promoties QR */}
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-48 h-48 mx-auto mb-6 bg-white p-3 rounded-xl shadow-inner">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&data=${encodeURIComponent(`https://www.vysionhoreca.com/shop/${params.tenant}/menukaart?promo=1`)}`}
                  alt="Promoties QR Code"
                  className="w-full h-full"
                />
              </div>
              <div className="text-5xl mb-3">🎁</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('shopPage.promotions')}</h3>
              <p className="text-gray-600">{t('shopPage.scanToSeeOffers')}</p>
            </div>

            {/* Review QR */}
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-48 h-48 mx-auto mb-6 bg-white p-3 rounded-xl shadow-inner">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&data=${encodeURIComponent(`https://www.vysionhoreca.com/shop/${params.tenant}/review`)}`}
                  alt="Review QR Code"
                  className="w-full h-full"
                />
              </div>
              <div className="text-5xl mb-3">⭐</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('shopPage.giveReview')}</h3>
              <p className="text-gray-600">{t('shopPage.scanToReview')}</p>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* CTA Section */}
      <section style={{ background: `linear-gradient(to right, ${business.primary_color}, ${business.primary_color}cc)` }} className="py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white mb-6">
              {t('shopPage.hungryNow')}
            </h2>
            <p className="text-white/90 text-xl mb-8">
              {t('shopPage.orderNowOnline')}
            </p>
            <Link href={`/shop/${params.tenant}/menu`}>
              <button
                style={{ color: business.primary_color }}
                className="bg-white font-bold text-xl px-12 py-5 rounded-full shadow-2xl inline-flex items-center gap-3 hover:scale-105 active:scale-95 transition-transform"
              >
                <span>🍟</span>
                <span>{t('shopPage.startYourOrder')}</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </Link>
          </div>
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
                {t('shopPage.poweredBy')} <span style={{ color: business.primary_color }} className="font-semibold">Vysion</span>
              </p>
              <p className="text-white/40 text-sm mt-1">
                © {new Date().getFullYear()} {t('shopPage.allRightsReserved')}
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Gift Card Modal */}
      <AnimatePresence>
        {showGiftCardModal && business && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setShowGiftCardModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div 
                className="p-6 text-white text-center rounded-t-3xl"
                style={{ backgroundColor: business.primary_color }}
              >
                <span className="text-4xl">🎁</span>
                <h2 className="text-2xl font-bold mt-2">{t('shopPage.giftCardModal.title')}</h2>
                <p className="opacity-80">{t('shopPage.giftCardModal.subtitle')}</p>
              </div>

              {/* Form */}
              <div className="p-6 space-y-5">
                {/* Occasion */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('shopPage.giftCardModal.occasion')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{key: 'birthday', label: t('shopPage.giftCardModal.birthday'), icon: '🎂'}, {key: 'wedding', label: t('shopPage.giftCardModal.wedding'), icon: '💍'}, {key: 'valentine', label: t('shopPage.giftCardModal.valentine'), icon: '❤️'}, {key: 'justBecause', label: t('shopPage.giftCardModal.justBecause'), icon: '🎉'}].map(({key, label, icon}) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setGiftCardForm(prev => ({ ...prev, occasion: key }))}
                        className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          giftCardForm.occasion === key
                            ? 'border-current text-white'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                        style={giftCardForm.occasion === key ? { backgroundColor: business.primary_color, borderColor: business.primary_color } : {}}
                      >
                        {icon} {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('shopPage.giftCardModal.amount')}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 75, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setGiftCardForm(prev => ({ ...prev, amount: amt, customAmount: '' }))}
                        className={`p-3 rounded-xl border-2 transition-all font-bold ${
                          giftCardForm.amount === amt && !giftCardForm.customAmount
                            ? 'text-white'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                        style={giftCardForm.amount === amt && !giftCardForm.customAmount ? { backgroundColor: business.primary_color, borderColor: business.primary_color } : {}}
                      >
                        €{amt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    placeholder={t('shopPage.giftCardModal.otherAmount')}
                    value={giftCardForm.customAmount}
                    onChange={(e) => setGiftCardForm(prev => ({ 
                      ...prev, 
                      customAmount: e.target.value,
                      amount: e.target.value ? parseFloat(e.target.value) : 50 
                    }))}
                    className="w-full mt-2 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {/* Personal Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('shopPage.giftCardModal.personalMessage')}
                  </label>
                  <textarea
                    value={giftCardForm.personalMessage}
                    onChange={(e) => setGiftCardForm(prev => ({ ...prev, personalMessage: e.target.value }))}
                    placeholder={t('shopPage.giftCardModal.personalMessagePlaceholder')}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Sender Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('shopPage.giftCardModal.yourName')}
                    </label>
                    <input
                      type="text"
                      value={giftCardForm.senderName}
                      onChange={(e) => setGiftCardForm(prev => ({ ...prev, senderName: e.target.value }))}
                      placeholder="Jan"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('shopPage.giftCardModal.yourEmail')}
                    </label>
                    <input
                      type="email"
                      value={giftCardForm.senderEmail}
                      onChange={(e) => setGiftCardForm(prev => ({ ...prev, senderEmail: e.target.value }))}
                      placeholder="jan@email.be"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Recipient Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('shopPage.giftCardModal.recipientName')}
                    </label>
                    <input
                      type="text"
                      value={giftCardForm.recipientName}
                      onChange={(e) => setGiftCardForm(prev => ({ ...prev, recipientName: e.target.value }))}
                      placeholder="Marie"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('shopPage.giftCardModal.recipientEmail')} *
                    </label>
                    <input
                      type="email"
                      value={giftCardForm.recipientEmail}
                      onChange={(e) => setGiftCardForm(prev => ({ ...prev, recipientEmail: e.target.value }))}
                      placeholder="marie@email.be"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center">
                  <span className="text-gray-600">{t('giftCardPayment.toPay')}:</span>
                  <span className="text-2xl font-bold" style={{ color: business.primary_color }}>
                    €{(giftCardForm.customAmount ? parseFloat(giftCardForm.customAmount) : giftCardForm.amount).toFixed(2)}
                  </span>
                </div>

                {/* Payment Options */}
                <div className="space-y-3">
                  {/* Bancontact/iDEAL */}
                  <button
                    onClick={async () => {
                      if (!giftCardForm.recipientEmail) {
                        alert('Vul het email adres van de ontvanger in')
                        return
                      }
                      
                      const amount = giftCardForm.customAmount 
                        ? parseFloat(giftCardForm.customAmount) 
                        : giftCardForm.amount
                      
                      if (amount < 10) {
                        alert('Minimum bedrag is €10')
                        return
                      }
                      
                      setGiftCardLoading(true)
                      
                      try {
                        const response = await fetch('/api/create-gift-card-checkout', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            tenantSlug: params.tenant,
                            amount,
                            occasion: giftCardForm.occasion,
                            personalMessage: giftCardForm.personalMessage,
                            senderName: giftCardForm.senderName,
                            senderEmail: giftCardForm.senderEmail,
                            recipientName: giftCardForm.recipientName,
                            recipientEmail: giftCardForm.recipientEmail,
                          }),
                        })
                        
                        const data = await response.json()
                        
                        if (data.url) {
                          window.location.href = data.url
                        } else {
                          alert(data.error || 'Er ging iets mis')
                        }
                      } catch (error) {
                        alert('Er ging iets mis bij het aanmaken van de betaling')
                      }
                      
                      setGiftCardLoading(false)
                    }}
                    disabled={giftCardLoading}
                    style={{ backgroundColor: business.primary_color }}
                    className="w-full py-4 text-white font-bold text-lg rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {giftCardLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{t('giftCardPayment.pleaseWait')}</span>
                      </>
                    ) : (
                      <>
                        <span>💳</span>
                        <span>{t('giftCardPayment.payWithBancontact')}</span>
                      </>
                    )}
                  </button>

                  {/* Cash - betalen in de zaak */}
                  <button
                    onClick={async () => {
                      if (!giftCardForm.recipientEmail) {
                        alert('Vul het email adres van de ontvanger in')
                        return
                      }
                      
                      const amount = giftCardForm.customAmount 
                        ? parseFloat(giftCardForm.customAmount) 
                        : giftCardForm.amount
                      
                      if (amount < 10) {
                        alert('Minimum bedrag is €10')
                        return
                      }
                      
                      setGiftCardLoading(true)
                      
                      try {
                        const response = await fetch('/api/create-gift-card-checkout', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            tenantSlug: params.tenant,
                            amount,
                            occasion: giftCardForm.occasion,
                            personalMessage: giftCardForm.personalMessage,
                            senderName: giftCardForm.senderName,
                            senderEmail: giftCardForm.senderEmail,
                            recipientName: giftCardForm.recipientName,
                            recipientEmail: giftCardForm.recipientEmail,
                            paymentMethod: 'cash', // Mark as cash payment
                          }),
                        })
                        
                        const data = await response.json()
                        
                        if (data.success) {
                          alert(`✅ Cadeaubon aangemaakt!\n\nCode: ${data.code}\n\nBetaal €${amount.toFixed(2)} in de zaak om de bon te activeren.\n\nDe ontvanger krijgt een email zodra de betaling is ontvangen.`)
                          setShowGiftCardModal(false)
                          setGiftCardForm({
                            occasion: '',
                            amount: 50,
                            customAmount: '',
                            personalMessage: '',
                            senderName: '',
                            senderEmail: '',
                            recipientName: '',
                            recipientEmail: '',
                          })
                        } else {
                          alert(data.error || 'Er ging iets mis')
                        }
                      } catch (error) {
                        alert('Er ging iets mis bij het aanmaken van de cadeaubon')
                      }
                      
                      setGiftCardLoading(false)
                    }}
                    disabled={giftCardLoading}
                    className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>💵</span>
                    <span>{t('giftCardPayment.payInStore')}</span>
                  </button>
                </div>

                {/* Cancel */}
                <button
                  onClick={() => setShowGiftCardModal(false)}
                  className="w-full py-3 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {t('shopPage.giftCardModal.cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Order Button (Mobile) */}
      <div className="fixed bottom-4 left-3 right-3 sm:bottom-6 sm:left-4 sm:right-4 md:hidden z-50 pb-safe">
        <Link href={`/shop/${params.tenant}/menu`}>
          <button
            style={{ backgroundColor: business.primary_color, boxShadow: `0 25px 50px -12px ${business.primary_color}66` }}
            className="w-full text-white font-bold py-4 rounded-2xl shadow-2xl flex items-center justify-center gap-3 hover:opacity-90 active:scale-95 transition-transform"
          >
            <span>🍟</span>
            <span>{t('shopPage.startYourOrder')}</span>
          </button>
        </Link>
      </div>
    </div>
  )
}
