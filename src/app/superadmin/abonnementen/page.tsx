'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface SubscriptionWithTenant {
  id: string
  tenant_slug: string
  plan: string
  status: string
  price_monthly: number
  trial_ends_at: string
  subscription_started_at: string
  subscription_ends_at: string
  next_payment_at: string
  business_name?: string
}

interface Stats {
  totalMRR: number
  activeSubs: number
  trialSubs: number
  expiringSoon: number
}

export default function AbonnementenPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithTenant[]>([])
  const [filter, setFilter] = useState('all')
  const [stats, setStats] = useState<Stats>({
    totalMRR: 0,
    activeSubs: 0,
    trialSubs: 0,
    expiringSoon: 0,
  })

  useEffect(() => {
    checkAuth()
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
    // Load subscriptions
    const { data: subsData } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })

    // Load tenant names
    const { data: tenantsData } = await supabase
      .from('tenant_settings')
      .select('tenant_slug, business_name')

    const tenantMap = new Map(tenantsData?.map(t => [t.tenant_slug, t.business_name]) || [])

    const enrichedSubs = (subsData || []).map(sub => ({
      ...sub,
      business_name: tenantMap.get(sub.tenant_slug) || sub.tenant_slug,
    }))

    setSubscriptions(enrichedSubs)

    // Calculate stats
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const activeSubs = enrichedSubs.filter(s => s.status === 'active')
    const trialSubs = enrichedSubs.filter(s => s.status === 'trial')
    const expiringSoon = enrichedSubs.filter(s => {
      if (s.status === 'trial' && s.trial_ends_at) {
        return new Date(s.trial_ends_at) <= weekFromNow
      }
      return false
    })

    setStats({
      totalMRR: activeSubs.reduce((sum, s) => sum + (s.price_monthly || 0), 0),
      activeSubs: activeSubs.length,
      trialSubs: trialSubs.length,
      expiringSoon: expiringSoon.length,
    })

    setLoading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'trial': return 'bg-blue-100 text-blue-700'
      case 'expired': return 'bg-red-100 text-red-700'
      case 'cancelled': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'bg-purple-500 text-white'
      case 'standaard': return 'bg-orange-500 text-white'
      case 'starter': return 'bg-slate-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const filteredSubs = subscriptions.filter(sub => {
    if (filter === 'all') return true
    return sub.status === filter
  })

  const getDaysUntilExpiry = (dateString: string) => {
    if (!dateString) return null
    const diff = new Date(dateString).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
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
            <h1 className="text-xl font-bold text-white">Abonnementen Beheer</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6"
          >
            <p className="text-white/80 text-sm">Maandelijkse Omzet (MRR)</p>
            <p className="text-4xl font-bold text-white mt-1">€{stats.totalMRR}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800 rounded-2xl p-6 border border-slate-700"
          >
            <p className="text-slate-400 text-sm">Actieve Abonnementen</p>
            <p className="text-4xl font-bold text-green-400 mt-1">{stats.activeSubs}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800 rounded-2xl p-6 border border-slate-700"
          >
            <p className="text-slate-400 text-sm">In Trial</p>
            <p className="text-4xl font-bold text-blue-400 mt-1">{stats.trialSubs}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800 rounded-2xl p-6 border border-slate-700"
          >
            <p className="text-slate-400 text-sm">Verloopt Deze Week</p>
            <p className="text-4xl font-bold text-yellow-400 mt-1">{stats.expiringSoon}</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'Alle Abonnementen' },
            { key: 'active', label: 'Actieve Abonnementen' },
            { key: 'trial', label: 'Trial Abonnementen' },
            { key: 'cancelled', label: 'Verwijderde Abonnementen' },
            { key: 'expired', label: 'Vervallen Abonnementen' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f.key
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Subscriptions Grid */}
        <div className="grid gap-4">
          {filteredSubs.map((sub) => {
            const daysLeft = sub.status === 'trial' ? getDaysUntilExpiry(sub.trial_ends_at) : null

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800 rounded-2xl p-6 border border-slate-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">🏪</span>
                    </div>
                    <div>
                      <Link
                        href={`/superadmin/tenant/${sub.tenant_slug}`}
                        className="text-lg font-bold text-white hover:text-orange-400 transition-colors"
                      >
                        {sub.business_name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPlanColor(sub.plan)}`}>
                          {sub.plan.toUpperCase()}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sub.status)}`}>
                          {sub.status}
                        </span>
                        {daysLeft !== null && daysLeft <= 7 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            {daysLeft <= 0 ? 'Verlopen!' : `${daysLeft} dagen`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-400">€{sub.price_monthly || 0}</p>
                      <p className="text-slate-400 text-sm">/maand</p>
                    </div>

                    <Link
                      href={`/superadmin/tenant/${sub.tenant_slug}`}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                    >
                      Beheren →
                    </Link>
                  </div>
                </div>

                {sub.next_payment_at && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-slate-400 text-sm">
                      Volgende betaling: <span className="text-white">{new Date(sub.next_payment_at).toLocaleDateString('nl-BE')}</span>
                    </p>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {filteredSubs.length === 0 && (
          <div className="bg-slate-800 rounded-2xl p-12 text-center border border-slate-700">
            <span className="text-4xl mb-4 block">📋</span>
            <p className="text-slate-400">Geen abonnementen gevonden</p>
          </div>
        )}
      </div>
    </div>
  )
}
