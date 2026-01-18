'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams } from 'next/navigation'

interface Subscription {
  id: string
  tenant_slug: string
  plan: string
  status: string
  price_monthly: number
  trial_started_at: string | null
  trial_ends_at: string | null
  subscription_started_at: string | null
  next_payment_at: string | null
}

interface Plan {
  id: string
  name: string
  price: number
  description: string
  features: string[]
  popular?: boolean
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 79,
    description: 'Perfect voor kleine horecazaken',
    features: [
      'Onbeperkte bestellingen',
      'Online bestelwebsite',
      'Kassa systeem',
      'QR-code menu',
      'Basis statistieken',
      'Email support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 129,
    description: 'Voor groeiende ondernemingen',
    popular: true,
    features: [
      'Alles van Starter',
      'Personeelsbeheer',
      'Urenregistratie',
      'Geavanceerde statistieken',
      'Promoties & kortingscodes',
      'Klantenbeloningen',
      'Prioriteit support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    description: 'Voor meerdere locaties',
    features: [
      'Alles van Professional',
      'Meerdere locaties',
      'API toegang',
      'Dedicated account manager',
      'Custom integraties',
      'SLA garantie',
      '24/7 support',
    ],
  },
]

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey)
}

export default function AbonnementPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string
  
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

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
    setSelectedPlan(data?.plan || 'starter')
    setLoading(false)
  }

  async function handleSubscribe(planId: string) {
    setProcessing(true)
    
    try {
      const response = await fetch('/api/create-subscription-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug,
          planId,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        alert(data.error)
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setProcessing(false)
    }
  }

  // Calculate trial info
  let daysLeft = 0
  let trialEndDate = ''
  if (subscription?.status === 'trial' && subscription.trial_ends_at) {
    const now = new Date()
    const trialEnd = new Date(subscription.trial_ends_at)
    daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    trialEndDate = trialEnd.toLocaleDateString('nl-BE', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Abonnement</h1>
        <p className="text-gray-600 mt-2">Kies het abonnement dat bij je past</p>
      </div>

      {/* Current Status */}
      {subscription && (
        <div className={`rounded-2xl p-6 mb-8 ${
          subscription.status === 'trial' 
            ? 'bg-blue-50 border-2 border-blue-200' 
            : subscription.status === 'active'
            ? 'bg-green-50 border-2 border-green-200'
            : 'bg-red-50 border-2 border-red-200'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  subscription.status === 'trial' 
                    ? 'bg-blue-100 text-blue-700'
                    : subscription.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {subscription.status === 'trial' && 'Proefperiode'}
                  {subscription.status === 'active' && 'Actief'}
                  {subscription.status === 'expired' && 'Verlopen'}
                  {subscription.status === 'cancelled' && 'Geannuleerd'}
                </span>
                <span className="text-gray-900 font-semibold capitalize">{subscription.plan} plan</span>
              </div>
              
              {subscription.status === 'trial' && (
                <p className="text-gray-600 mt-2">
                  Je proefperiode eindigt op <strong>{trialEndDate}</strong> 
                  {daysLeft > 0 && ` (nog ${daysLeft} ${daysLeft === 1 ? 'dag' : 'dagen'})`}
                </p>
              )}
              
              {subscription.status === 'active' && subscription.next_payment_at && (
                <p className="text-gray-600 mt-2">
                  Volgende betaling: {new Date(subscription.next_payment_at).toLocaleDateString('nl-BE')}
                </p>
              )}
            </div>

            {subscription.status === 'active' && (
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">
                  €{subscription.price_monthly}
                  <span className="text-base font-normal text-gray-500">/maand</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-2xl border-2 p-6 transition-all ${
              selectedPlan === plan.id
                ? 'border-orange-500 shadow-lg shadow-orange-500/20'
                : 'border-gray-200 hover:border-gray-300'
            } ${plan.popular ? 'ring-2 ring-orange-500 ring-offset-2' : ''}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  POPULAIR
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">€{plan.price}</span>
                <span className="text-gray-500">/maand</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={processing || (subscription?.status === 'active' && subscription.plan === plan.id)}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-colors ${
                subscription?.status === 'active' && subscription.plan === plan.id
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : plan.popular
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verwerken...
                </span>
              ) : subscription?.status === 'active' && subscription.plan === plan.id ? (
                'Huidig plan'
              ) : subscription?.status === 'active' ? (
                'Wijzig naar dit plan'
              ) : (
                'Kies dit plan'
              )}
            </button>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Veelgestelde vragen</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900">Kan ik op elk moment opzeggen?</h3>
            <p className="text-gray-600 text-sm mt-1">
              Ja, je kunt op elk moment opzeggen. Je abonnement blijft actief tot het einde van de betaalperiode.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900">Wat gebeurt er na de proefperiode?</h3>
            <p className="text-gray-600 text-sm mt-1">
              Na 14 dagen wordt je gevraagd een abonnement te kiezen. Zonder abonnement wordt de toegang tot je admin panel geblokkeerd.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900">Kan ik van plan wisselen?</h3>
            <p className="text-gray-600 text-sm mt-1">
              Ja, je kunt op elk moment upgraden of downgraden. Het verschil wordt pro-rata verrekend.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900">Welke betaalmethodes worden geaccepteerd?</h3>
            <p className="text-gray-600 text-sm mt-1">
              We accepteren Bancontact, iDEAL, creditcard (Visa, Mastercard) en SEPA domiciliëring.
            </p>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="text-center mt-8 text-gray-500">
        <p>
          Vragen over abonnementen?{' '}
          <a href="mailto:support@vysionhoreca.com" className="text-orange-500 hover:underline">
            Neem contact op
          </a>
        </p>
      </div>
    </div>
  )
}
