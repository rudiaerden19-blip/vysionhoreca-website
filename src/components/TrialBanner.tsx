'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

interface TrialBannerProps {
  tenantSlug: string
}

interface Subscription {
  id: string
  status: string
  plan: string
  trial_ends_at: string | null
  subscription_ends_at: string | null
}

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey)
}

export default function TrialBanner({ tenantSlug }: TrialBannerProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    loadSubscription()
  }, [tenantSlug])

  async function loadSubscription() {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .single()

    setSubscription(data)
    setLoading(false)
  }

  if (loading || dismissed) return null
  if (!subscription) return null

  // Calculate days left
  const now = new Date()
  let daysLeft = 0
  let isExpired = false

  if (subscription.status === 'trial' && subscription.trial_ends_at) {
    const trialEnd = new Date(subscription.trial_ends_at)
    daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    isExpired = daysLeft <= 0
  } else if (subscription.status === 'expired' || subscription.status === 'cancelled') {
    isExpired = true
  } else if (subscription.status === 'active') {
    // Active subscription - no banner needed
    return null
  } else if (subscription.status === 'payment_failed') {
    // Show payment failed banner
    return (
      <div className="bg-red-500 text-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">Betaling mislukt</p>
              <p className="text-sm text-white/80">
                Je laatste betaling is niet gelukt. Werk je betaalmethode bij om toegang te behouden.
              </p>
            </div>
          </div>
          
          <Link
            href={`/shop/${tenantSlug}/admin/abonnement`}
            className="bg-white text-red-600 font-semibold px-5 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            Betaling bijwerken
          </Link>
        </div>
      </div>
    )
  }

  // Show nothing if more than 3 days left
  if (!isExpired && daysLeft > 3) return null

  // Expired - show blocking overlay
  if (isExpired) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Je proefperiode is verlopen
          </h2>
          
          <p className="text-gray-600 mb-6">
            Je 14-dagen gratis proefperiode is afgelopen. Om verder te gaan met Vysion, 
            kies een abonnement dat bij je past.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500 mb-2">Aanbevolen</p>
            <p className="text-2xl font-bold text-gray-900">Starter</p>
            <p className="text-3xl font-bold text-orange-500 mt-1">
              €79<span className="text-base font-normal text-gray-500">/maand</span>
            </p>
          </div>

          <Link
            href={`/shop/${tenantSlug}/admin/abonnement`}
            className="block w-full bg-orange-500 text-white font-semibold py-4 px-6 rounded-xl hover:bg-orange-600 transition-colors mb-3"
          >
            Abonnement kiezen
          </Link>
          
          <p className="text-sm text-gray-500">
            Vragen? <a href="mailto:support@vysionhoreca.com" className="text-orange-500 hover:underline">Neem contact op</a>
          </p>
        </div>
      </div>
    )
  }

  // Warning banner (3 days or less remaining)
  return (
    <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold">
              Nog {daysLeft} {daysLeft === 1 ? 'dag' : 'dagen'} in je proefperiode
            </p>
            <p className="text-sm text-white/80">
              Ben je tevreden? Kies een abonnement om door te gaan.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link
            href={`/shop/${tenantSlug}/admin/abonnement`}
            className="bg-white text-orange-600 font-semibold px-5 py-2 rounded-lg hover:bg-orange-50 transition-colors"
          >
            Abonnement kiezen
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Sluiten"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
