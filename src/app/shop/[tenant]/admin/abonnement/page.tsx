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
  stripe_subscription_id: string | null
}

interface Invoice {
  id: string
  invoice_number: string
  amount: number
  status: string
  description: string
  due_date: string
  paid_at: string | null
  created_at: string
}

interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  subscription_status: string
  trial_ends_at: string | null
}

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
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [tenantSlug])

  async function loadData() {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }

    // Load subscription
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .single()
    setSubscription(subData)

    // Load tenant
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', tenantSlug)
      .single()
    setTenant(tenantData)

    // Load invoices
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .order('created_at', { ascending: false })
    setInvoices(invoiceData || [])

    setLoading(false)
  }

  async function handleSubscribe(planId: string) {
    setProcessing(planId)
    
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
      setProcessing(null)
    }
  }

  async function handlePayInvoice(invoice: Invoice) {
    setProcessing(invoice.id)
    
    try {
      const response = await fetch('/api/create-invoice-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug,
          invoiceId: invoice.id,
          amount: invoice.amount,
          description: invoice.description || `Factuur ${invoice.invoice_number}`,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        alert(data.error)
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setProcessing(null)
    }
  }

  // Calculate stats
  const paidInvoices = invoices.filter(i => i.status === 'paid')
  const pendingInvoices = invoices.filter(i => i.status === 'pending')
  const overdueInvoices = invoices.filter(i => i.status === 'overdue')
  const totalPaid = paidInvoices.reduce((sum, i) => sum + Number(i.amount), 0)
  const totalOverdue = overdueInvoices.reduce((sum, i) => sum + Number(i.amount), 0)

  // Calculate trial info
  let daysLeft = 0
  let trialEndDate = ''
  const trialEndsAt = subscription?.trial_ends_at || tenant?.trial_ends_at
  const status = subscription?.status || tenant?.subscription_status || 'trial'
  
  if ((status === 'trial' || status === 'TRIAL') && trialEndsAt) {
    const now = new Date()
    const trialEnd = new Date(trialEndsAt)
    daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    trialEndDate = trialEnd.toLocaleDateString('nl-BE', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const currentPlan = subscription?.plan || tenant?.plan || 'starter'
  const isActive = status === 'active' || status === 'ACTIVE'
  const isTrial = status === 'trial' || status === 'TRIAL'
  const isExpired = status === 'expired' || status === 'EXPIRED'
  const hasOverdue = overdueInvoices.length > 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Abonnement</h1>
        <p className="text-gray-600 mt-2">Beheer je abonnement en bekijk facturen</p>
      </div>

      {/* Warning Banner for Overdue */}
      {hasOverdue && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800">Achterstallige betaling</h3>
              <p className="text-red-700 mt-1">
                Je hebt {overdueInvoices.length} onbetaalde {overdueInvoices.length === 1 ? 'factuur' : 'facturen'} 
                ter waarde van €{totalOverdue.toFixed(2)}. Betaal zo snel mogelijk om je account actief te houden.
              </p>
              <button
                onClick={() => overdueInvoices[0] && handlePayInvoice(overdueInvoices[0])}
                className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Nu betalen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Plan Card */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              currentPlan === 'pro' || currentPlan === 'PRO' ? 'bg-purple-100' : 'bg-yellow-100'
            }`}>
              <span className="text-2xl">{currentPlan === 'pro' || currentPlan === 'PRO' ? '✨' : '⚡'}</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Huidig plan</p>
              <p className="text-xl font-bold text-gray-900 capitalize">
                Vysion {currentPlan}
              </p>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            €{currentPlan === 'pro' || currentPlan === 'PRO' ? '99' : '79'}
            <span className="text-base font-normal text-gray-500">/maand</span>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-2">Status</p>
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${
              hasOverdue 
                ? 'bg-red-100 text-red-700'
                : isActive 
                ? 'bg-green-100 text-green-700'
                : isTrial
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {hasOverdue ? '⚠️ Achterstallig' : 
               isActive ? '✓ Actief' : 
               isTrial ? '🕐 Proefperiode' : 
               isExpired ? '✗ Verlopen' : status}
            </span>
          </div>
          {isTrial && (
            <p className="text-gray-600">
              Eindigt op <strong>{trialEndDate}</strong>
              <br />
              <span className="text-orange-600 font-medium">{daysLeft} dagen over</span>
            </p>
          )}
          {isActive && subscription?.next_payment_at && (
            <p className="text-gray-600">
              Volgende betaling: {new Date(subscription.next_payment_at).toLocaleDateString('nl-BE')}
            </p>
          )}
        </div>

        {/* Payment Stats Card */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-4">Betalingsoverzicht</p>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Betaalde facturen</span>
              <span className="font-bold text-green-600">{paidInvoices.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Totaal betaald</span>
              <span className="font-bold text-gray-900">€{totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Openstaand</span>
              <span className={`font-bold ${pendingInvoices.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                {pendingInvoices.length}
              </span>
            </div>
            {overdueInvoices.length > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Achterstallig</span>
                <span className="font-bold">€{totalOverdue.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade/Change Plan */}
      {(isTrial || isExpired || currentPlan === 'starter') && (
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">
                {isTrial ? 'Upgrade naar een betaald plan' : 
                 isExpired ? 'Heractiveer je abonnement' :
                 'Upgrade naar Pro'}
              </h3>
              <p className="text-purple-100">
                {isTrial ? 'Kies een plan voor je proefperiode eindigt' :
                 isExpired ? 'Krijg weer toegang tot alle functies' :
                 'Krijg toegang tot SEO, personeel, reviews en meer'}
              </p>
            </div>
            <div className="flex gap-4">
              {currentPlan !== 'starter' && currentPlan !== 'STARTER' && (
                <button
                  onClick={() => handleSubscribe('starter')}
                  disabled={processing !== null}
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  {processing === 'starter' ? 'Laden...' : 'Starter €79/m'}
                </button>
              )}
              <button
                onClick={() => handleSubscribe('pro')}
                disabled={processing !== null}
                className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-colors"
              >
                {processing === 'pro' ? 'Laden...' : 'Pro €99/m'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Facturen</h2>
        </div>
        
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">Nog geen facturen</p>
            <p className="text-sm mt-1">Je eerste factuur verschijnt hier na je eerste betaling</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Factuurnr.</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Datum</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Omschrijving</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Bedrag</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm">{invoice.invoice_number}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(invoice.created_at).toLocaleDateString('nl-BE')}
                    </td>
                    <td className="px-6 py-4 text-gray-900">{invoice.description || '-'}</td>
                    <td className="px-6 py-4 font-semibold">€{Number(invoice.amount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                        invoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                        invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {invoice.status === 'paid' ? 'Betaald' :
                         invoice.status === 'overdue' ? 'Achterstallig' :
                         invoice.status === 'pending' ? 'Openstaand' :
                         invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {(invoice.status === 'pending' || invoice.status === 'overdue') ? (
                        <button
                          onClick={() => handlePayInvoice(invoice)}
                          disabled={processing === invoice.id}
                          className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                        >
                          {processing === invoice.id ? 'Laden...' : 'Betalen'}
                        </button>
                      ) : invoice.status === 'paid' ? (
                        <span className="text-gray-400 text-sm">✓ Voldaan</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="font-bold text-gray-900 mb-4">Vragen over facturatie?</h3>
        <p className="text-gray-600 mb-4">
          Heb je vragen over je abonnement of facturen? Neem contact met ons op.
        </p>
        <div className="flex flex-wrap gap-4">
          <a 
            href="mailto:support@vysionhoreca.com" 
            className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            support@vysionhoreca.com
          </a>
          <a 
            href="tel:+32123456789" 
            className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            +32 123 456 789
          </a>
        </div>
      </div>
    </div>
  )
}
