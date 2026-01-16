'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Tenant {
  id: string
  tenant_slug: string
  business_name: string
  email: string
  phone: string
  created_at: string
}

interface Subscription {
  id: string
  tenant_slug: string
  plan: string
  status: string
  trial_ends_at: string
  subscription_ends_at: string
  price_monthly: number
}

interface PlatformStats {
  totalTenants: number
  activeTenants: number
  trialTenants: number
  totalOrders: number
  totalRevenue: number
  monthlyRecurring: number
}

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [adminName, setAdminName] = useState('')
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [stats, setStats] = useState<PlatformStats>({
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    totalOrders: 0,
    totalRevenue: 0,
    monthlyRecurring: 0,
  })
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const adminId = localStorage.getItem('superadmin_id')
    const name = localStorage.getItem('superadmin_name')
    
    if (!adminId) {
      router.push('/superadmin/login')
      return
    }

    setAdminName(name || 'Admin')
    await loadData()
  }

  async function loadData() {
    // Load all tenants
    const { data: tenantsData } = await supabase
      .from('tenant_settings')
      .select('*')
      .order('created_at', { ascending: false })

    if (tenantsData) {
      setTenants(tenantsData)
    }

    // Load subscriptions
    const { data: subsData } = await supabase
      .from('subscriptions')
      .select('*')

    if (subsData) {
      setSubscriptions(subsData)
    }

    // Load orders for stats
    const { data: ordersData } = await supabase
      .from('orders')
      .select('total, created_at')

    const totalOrders = ordersData?.length || 0
    const totalRevenue = ordersData?.reduce((sum, o) => sum + (o.total || 0), 0) || 0

    // Calculate stats
    const activeSubs = subsData?.filter(s => s.status === 'active') || []
    const trialSubs = subsData?.filter(s => s.status === 'trial') || []
    const monthlyRecurring = activeSubs.reduce((sum, s) => sum + (s.price_monthly || 0), 0)

    setStats({
      totalTenants: tenantsData?.length || 0,
      activeTenants: activeSubs.length,
      trialTenants: trialSubs.length,
      totalOrders,
      totalRevenue,
      monthlyRecurring,
    })

    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('superadmin_id')
    localStorage.removeItem('superadmin_email')
    localStorage.removeItem('superadmin_name')
    router.push('/superadmin/login')
  }

  const getSubscription = (tenantSlug: string) => {
    return subscriptions.find(s => s.tenant_slug === tenantSlug)
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
      case 'pro': return 'bg-purple-100 text-purple-700'
      case 'standaard': return 'bg-orange-100 text-orange-700'
      case 'starter': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const filteredTenants = tenants.filter(t => 
    t.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tenant_slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
              <span className="text-xl">🚀</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Vysion Super Admin</h1>
              <p className="text-slate-400 text-sm">Welkom, {adminName}</p>
            </div>
          </div>
          <Link
            href="/superadmin/abonnementen"
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors"
          >
            💳 Abonnementen
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
          >
            Uitloggen
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-2xl p-6 border border-slate-700"
          >
            <p className="text-slate-400 text-sm">Totaal Tenants</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.totalTenants}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800 rounded-2xl p-6 border border-slate-700"
          >
            <p className="text-slate-400 text-sm">Actief</p>
            <p className="text-3xl font-bold text-green-400 mt-1">{stats.activeTenants}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800 rounded-2xl p-6 border border-slate-700"
          >
            <p className="text-slate-400 text-sm">Trial</p>
            <p className="text-3xl font-bold text-blue-400 mt-1">{stats.trialTenants}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800 rounded-2xl p-6 border border-slate-700"
          >
            <p className="text-slate-400 text-sm">Totaal Orders</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.totalOrders}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800 rounded-2xl p-6 border border-slate-700"
          >
            <p className="text-slate-400 text-sm">Platform Omzet</p>
            <p className="text-3xl font-bold text-white mt-1">€{stats.totalRevenue.toFixed(0)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6"
          >
            <p className="text-white/80 text-sm">MRR</p>
            <p className="text-3xl font-bold text-white mt-1">€{stats.monthlyRecurring.toFixed(0)}</p>
          </motion.div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="🔍 Zoek tenant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Tenants Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">Alle Tenants ({filteredTenants.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Bedrijf</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Slug</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Plan</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Aangemaakt</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredTenants.map((tenant) => {
                  const sub = getSubscription(tenant.tenant_slug)
                  return (
                    <tr key={tenant.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-white">{tenant.business_name || 'Geen naam'}</p>
                          <p className="text-sm text-slate-400">{tenant.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-orange-400 bg-slate-700 px-2 py-1 rounded text-sm">
                          {tenant.tenant_slug}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlanColor(sub?.plan || 'none')}`}>
                          {sub?.plan || 'Geen'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(sub?.status || 'none')}`}>
                          {sub?.status || 'Geen abonnement'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('nl-BE') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/superadmin/tenant/${tenant.tenant_slug}`}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
                          >
                            Details
                          </Link>
                          <Link
                            href={`/shop/${tenant.tenant_slug}/admin`}
                            target="_blank"
                            className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
                          >
                            Admin
                          </Link>
                          <Link
                            href={`/shop/${tenant.tenant_slug}`}
                            target="_blank"
                            className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors"
                          >
                            Shop
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredTenants.length === 0 && (
            <div className="p-12 text-center">
              <span className="text-4xl mb-4 block">🏪</span>
              <p className="text-slate-400">Geen tenants gevonden</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
