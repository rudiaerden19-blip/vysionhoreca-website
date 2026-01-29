'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface TenantDetails {
  id: string
  tenant_slug: string
  business_name: string
  email: string
  phone: string
  address: string
  postal_code: string
  city: string
  country: string
  btw_number: string
  created_at: string
}

interface Subscription {
  id?: string
  tenant_slug: string
  plan: string
  status: string
  price_monthly: number
  billing_email: string
  billing_name: string
  billing_address: string
  btw_number: string
  trial_started_at: string
  trial_ends_at: string
  subscription_started_at: string
  subscription_ends_at: string
  cancelled_at: string
  payment_method: string
  last_payment_at: string
  next_payment_at: string
}

interface TenantStats {
  totalOrders: number
  totalRevenue: number
  totalCustomers: number
  totalProducts: number
}

export default function TenantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tenant, setTenant] = useState<TenantDetails | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [stats, setStats] = useState<TenantStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalProducts: 0,
  })
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [subForm, setSubForm] = useState<Subscription>({
    tenant_slug: slug,
    plan: 'starter',
    status: 'trial',
    price_monthly: 69,
    billing_email: '',
    billing_name: '',
    billing_address: '',
    btw_number: '',
    trial_started_at: new Date().toISOString(),
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    subscription_started_at: '',
    subscription_ends_at: '',
    cancelled_at: '',
    payment_method: 'card',
    last_payment_at: '',
    next_payment_at: '',
  })

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkAuth() {
    const adminId = localStorage.getItem('superadmin_id')
    if (!adminId) {
      router.push('/superadmin/login')
      return
    }
    await loadData()
  }

  async function loadData() {
    // Load tenant
    const { data: tenantData } = await supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_slug', slug)
      .single()

    if (tenantData) {
      setTenant(tenantData)
    }

    // Load subscription
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_slug', slug)
      .single()

    if (subData) {
      setSubscription(subData)
      setSubForm(subData)
    }

    // Load stats
    const { data: ordersData } = await supabase
      .from('orders')
      .select('total')
      .eq('tenant_slug', slug)

    const { data: customersData } = await supabase
      .from('shop_customers')
      .select('id')
      .eq('tenant_slug', slug)

    const { data: productsData } = await supabase
      .from('menu_products')
      .select('id')
      .eq('tenant_slug', slug)

    setStats({
      totalOrders: ordersData?.length || 0,
      totalRevenue: ordersData?.reduce((sum, o) => sum + (o.total || 0), 0) || 0,
      totalCustomers: customersData?.length || 0,
      totalProducts: productsData?.length || 0,
    })

    setLoading(false)
  }

  async function handleSaveSubscription() {
    setSaving(true)

    const subscriptionData = {
      ...subForm,
      tenant_slug: slug,
      price_monthly: getPlanPrice(subForm.plan),
    }

    if (subscription?.id) {
      // Update
      await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('id', subscription.id)
    } else {
      // Insert
      await supabase
        .from('subscriptions')
        .insert(subscriptionData)
    }

    await loadData()
    setShowSubscriptionModal(false)
    setSaving(false)
  }

  async function handleActivateSubscription() {
    const now = new Date()
    const nextMonth = new Date(now)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    const updates = {
      status: 'active',
      subscription_started_at: now.toISOString(),
      next_payment_at: nextMonth.toISOString(),
    }

    if (subscription?.id) {
      await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', subscription.id)
    } else {
      await supabase
        .from('subscriptions')
        .insert({
          tenant_slug: slug,
          plan: 'starter',
          price_monthly: 69,
          ...updates,
        })
    }

    await loadData()
  }

  async function handleCancelSubscription() {
    if (!subscription?.id) return
    if (!confirm('Weet je zeker dat je dit abonnement wilt opzeggen?')) return

    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)

    await loadData()
  }

  function getPlanPrice(plan: string): number {
    switch (plan) {
      case 'starter': return 79
      case 'standaard': return 99
      case 'pro': return 129
      default: return 79
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200'
      case 'trial': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'expired': return 'bg-red-100 text-red-700 border-red-200'
      case 'cancelled': return 'bg-gray-100 text-gray-700 border-gray-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/superadmin"
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← Terug
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">{tenant?.business_name || slug}</h1>
              <code className="text-orange-400 text-sm">{slug}</code>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/shop/${slug}`}
              target="_blank"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
            >
              Bekijk Shop
            </Link>
            <Link
              href={`/shop/${slug}/admin`}
              target="_blank"
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-medium"
            >
              🔑 Beheer Klant
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <p className="text-slate-400 text-sm">Orders</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.totalOrders}</p>
          </div>
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <p className="text-slate-400 text-sm">Omzet</p>
            <p className="text-3xl font-bold text-green-400 mt-1">€{stats.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <p className="text-slate-400 text-sm">Klanten</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.totalCustomers}</p>
          </div>
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <p className="text-slate-400 text-sm">Producten</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.totalProducts}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Tenant Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-2xl p-6 border border-slate-700"
          >
            <h2 className="text-xl font-bold text-white mb-6">Bedrijfsgegevens</h2>
            <div className="space-y-4">
              <div>
                <p className="text-slate-400 text-sm">Bedrijfsnaam</p>
                <p className="text-white font-medium">{tenant?.business_name || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Email</p>
                <p className="text-white font-medium">{tenant?.email || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Telefoon</p>
                <p className="text-white font-medium">{tenant?.phone || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Adres</p>
                <p className="text-white font-medium">
                  {tenant?.address || '-'}
                  {tenant?.postal_code && `, ${tenant.postal_code}`}
                  {tenant?.city && ` ${tenant.city}`}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">BTW Nummer</p>
                <p className="text-white font-medium">{tenant?.btw_number || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Aangemaakt op</p>
                <p className="text-white font-medium">
                  {tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString('nl-BE') : '-'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Subscription */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800 rounded-2xl p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Abonnement</h2>
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors text-sm"
              >
                Bewerken
              </button>
            </div>

            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Plan</p>
                    <p className="text-2xl font-bold text-white capitalize">{subscription.plan}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(subscription.status)}`}>
                    {subscription.status}
                  </span>
                </div>

                <div>
                  <p className="text-slate-400 text-sm">Maandelijks bedrag</p>
                  <p className="text-3xl font-bold text-orange-400">€{subscription.price_monthly}/maand</p>
                </div>

                {subscription.status === 'trial' && subscription.trial_ends_at && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-blue-400 text-sm">Trial eindigt op</p>
                    <p className="text-white font-medium">
                      {new Date(subscription.trial_ends_at).toLocaleDateString('nl-BE')}
                    </p>
                  </div>
                )}

                {subscription.next_payment_at && (
                  <div>
                    <p className="text-slate-400 text-sm">Volgende betaling</p>
                    <p className="text-white font-medium">
                      {new Date(subscription.next_payment_at).toLocaleDateString('nl-BE')}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  {subscription.status !== 'active' && (
                    <button
                      onClick={handleActivateSubscription}
                      className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
                    >
                      ✓ Activeren
                    </button>
                  )}
                  {subscription.status === 'active' && (
                    <button
                      onClick={handleCancelSubscription}
                      className="flex-1 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium transition-colors border border-red-500/30"
                    >
                      Opzeggen
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">📋</span>
                <p className="text-slate-400 mb-4">Geen abonnement</p>
                <button
                  onClick={() => setShowSubscriptionModal(true)}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
                >
                  Abonnement toevoegen
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-white mb-6">Abonnement Bewerken</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Plan</label>
                <select
                  value={subForm.plan}
                  onChange={(e) => setSubForm({ ...subForm, plan: e.target.value, price_monthly: getPlanPrice(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                >
                  <option value="starter">Starter - €69/maand</option>
                  <option value="pro">Pro - €79/maand</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                <select
                  value={subForm.status}
                  onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                >
                  <option value="trial">Trial</option>
                  <option value="active">Actief</option>
                  <option value="cancelled">Geannuleerd</option>
                  <option value="expired">Verlopen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Betaalmethode</label>
                <select
                  value={subForm.payment_method}
                  onChange={(e) => setSubForm({ ...subForm, payment_method: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                >
                  <option value="card">Kaart</option>
                  <option value="invoice">Factuur</option>
                  <option value="domiciliering">Domiciliëring</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Facturatie Email</label>
                <input
                  type="email"
                  value={subForm.billing_email}
                  onChange={(e) => setSubForm({ ...subForm, billing_email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                  placeholder="factuur@bedrijf.be"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Facturatie Naam</label>
                <input
                  type="text"
                  value={subForm.billing_name}
                  onChange={(e) => setSubForm({ ...subForm, billing_name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                  placeholder="Bedrijf BV"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">BTW Nummer</label>
                <input
                  type="text"
                  value={subForm.btw_number}
                  onChange={(e) => setSubForm({ ...subForm, btw_number: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                  placeholder="BE0123456789"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleSaveSubscription}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
