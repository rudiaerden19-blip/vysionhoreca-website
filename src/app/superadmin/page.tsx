'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ensureDeliverySettingsForTenant } from '@/lib/tenant-defaults'
import { DEFAULT_ENABLED_ALLERGEN_IDS } from '@/lib/allergens-defaults'
import {
  isProtectedTenant,
  isAdminTenant,
  isDemoTenant,
  getProtectionError,
  donorAdminDisplaySubscription,
} from '@/lib/protected-tenants'
import {
  isMissingPostTrialModulesColumnError,
  withoutPostTrialModulesConfirmed,
} from '@/lib/supabase-post-trial-column'
import { clearSuperadminSessionCookies, mirrorSuperadminSessionFromCookieToLocalStorage } from '@/lib/superadmin-cookies'

interface Tenant {
  id: string
  tenant_slug: string
  business_name: string
  email: string
  phone: string
  created_at: string
  is_blocked?: boolean
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
  const [showNewTenantModal, setShowNewTenantModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<Tenant | null>(null)
  const [newTenant, setNewTenant] = useState({
    tenant_slug: '',
    business_name: '',
    email: '',
    phone: '',
  })
  const [saving, setSaving] = useState(false)
  const [showExpiringOnly, setShowExpiringOnly] = useState(false)

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Service worker: nieuwe sw.js ophalen (superadmin wordt niet meer gecached — oudere deploys toonden ontbrekende knoppen)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistration().then((reg) => reg?.update()).catch(() => {})
  }, [])

  async function checkAuth() {
    mirrorSuperadminSessionFromCookieToLocalStorage()
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

    // Calculate stats (donor-platformtenants tellen nooit als trial)
    const activeSubs =
      subsData?.filter((s) => s.status === 'active' || isAdminTenant(s.tenant_slug)) || []
    const trialSubs =
      subsData?.filter((s) => s.status === 'trial' && !isAdminTenant(s.tenant_slug)) || []
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
    clearSuperadminSessionCookies()
    router.push('/superadmin/login')
  }

  const handleCreateTenant = async () => {
    if (!newTenant.tenant_slug || !newTenant.business_name) {
      alert('Vul minimaal slug en bedrijfsnaam in')
      return
    }

    setSaving(true)

    const slug = newTenant.tenant_slug.toLowerCase().replace(/[^a-z0-9]/g, '')
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    // 1. Create tenants record
    const tenantInsert = {
      name: newTenant.business_name,
      slug: slug,
      email: newTenant.email || '',
      phone: newTenant.phone || '',
      plan: 'starter',
      subscription_status: 'trial',
      trial_ends_at: trialEndsAt,
      enabled_modules: null as null,
      post_trial_modules_confirmed: false,
    }
    let { error: tenantsError } = await supabase.from('tenants').insert(tenantInsert)

    if (tenantsError && isMissingPostTrialModulesColumnError(tenantsError)) {
      ;({ error: tenantsError } = await supabase
        .from('tenants')
        .insert(withoutPostTrialModulesConfirmed(tenantInsert as Record<string, unknown>)))
    }

    if (tenantsError) {
      console.error('Error creating tenants:', tenantsError)
      // Continue anyway - table might not exist
    }

    // 2. Create business_profiles record (voor login)
    if (newTenant.email) {
      const { error: profileError } = await supabase
        .from('business_profiles')
        .insert({
          name: newTenant.business_name,
          email: newTenant.email,
          password_hash: 'RESET_REQUIRED',
          phone: newTenant.phone || '',
          tenant_slug: slug,
        })

      if (profileError) {
        console.error('Error creating business_profiles:', profileError)
        // Continue anyway
      }
    }

    // 3. Create tenant_settings
    let settingsError = (
      await supabase.from('tenant_settings').insert({
        tenant_slug: slug,
        business_name: newTenant.business_name,
        email: newTenant.email,
        phone: newTenant.phone,
        primary_color: '#FF6B35',
        secondary_color: '#1a1a2e',
        allergens_config: DEFAULT_ENABLED_ALLERGEN_IDS,
      })
    ).error

    if (
      settingsError &&
      /allergens_config|schema cache|PGRST204|column/i.test(settingsError.message)
    ) {
      settingsError = (
        await supabase.from('tenant_settings').insert({
          tenant_slug: slug,
          business_name: newTenant.business_name,
          email: newTenant.email,
          phone: newTenant.phone,
          primary_color: '#FF6B35',
          secondary_color: '#1a1a2e',
        })
      ).error
    }

    if (settingsError) {
      alert('Fout bij aanmaken: ' + settingsError.message)
      setSaving(false)
      return
    }

    // 4. Create subscription (trial)
    await supabase
      .from('subscriptions')
      .insert({
        tenant_slug: slug,
        plan: 'starter',
        status: 'trial',
        price_monthly: 59,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: trialEndsAt,
      })

    await ensureDeliverySettingsForTenant(supabase, slug)

    setNewTenant({ tenant_slug: '', business_name: '', email: '', phone: '' })
    setShowNewTenantModal(false)
    setSaving(false)
    await loadData()
  }

  const handleBlockTenant = async (tenant: Tenant) => {
    const isBlocked = tenant.is_blocked
    const confirmMsg = isBlocked 
      ? `Weet je zeker dat je ${tenant.business_name} wilt deblokkeren?`
      : `Weet je zeker dat je ${tenant.business_name} wilt blokkeren? De shop wordt ontoegankelijk.`
    
    if (!confirm(confirmMsg)) return

    await supabase
      .from('tenant_settings')
      .update({ is_blocked: !isBlocked })
      .eq('id', tenant.id)

    await loadData()
  }

  const handleDeleteTenant = async (tenant: Tenant) => {
    // BESCHERMING: Check of tenant beschermd is
    if (isProtectedTenant(tenant.tenant_slug)) {
      alert(getProtectionError(tenant.tenant_slug))
      setShowDeleteModal(null)
      return
    }

    setSaving(true)

    // Delete ALL related data from ALL tables
    const slug = tenant.tenant_slug

    // Delete in order of dependencies - ALLE TABELLEN
    await supabase.from('order_items').delete().eq('tenant_slug', slug)
    await supabase.from('orders').delete().eq('tenant_slug', slug)
    await supabase.from('reviews').delete().eq('tenant_slug', slug)
    await supabase.from('shop_customers').delete().eq('tenant_slug', slug)
    await supabase.from('loyalty_rewards').delete().eq('tenant_slug', slug)
    await supabase.from('loyalty_redemptions').delete().eq('tenant_slug', slug)
    await supabase.from('promotions').delete().eq('tenant_slug', slug)
    await supabase.from('qr_codes').delete().eq('tenant_slug', slug)
    await supabase.from('menu_products').delete().eq('tenant_slug', slug)
    await supabase.from('menu_categories').delete().eq('tenant_slug', slug)
    await supabase.from('product_options').delete().eq('tenant_slug', slug)
    await supabase.from('product_option_choices').delete().eq('tenant_slug', slug)
    await supabase.from('product_option_links').delete().eq('tenant_slug', slug)
    await supabase.from('tenant_media').delete().eq('tenant_slug', slug)
    await supabase.from('tenant_texts').delete().eq('tenant_slug', slug)
    await supabase.from('delivery_settings').delete().eq('tenant_slug', slug)
    await supabase.from('opening_hours').delete().eq('tenant_slug', slug)
    await supabase.from('reservations').delete().eq('tenant_slug', slug)
    await supabase.from('gift_cards').delete().eq('tenant_slug', slug)
    await supabase.from('team_members').delete().eq('tenant_slug', slug)
    await supabase.from('staff_clock_sessions').delete().eq('tenant_slug', slug)
    await supabase.from('staff').delete().eq('tenant_slug', slug)
    await supabase.from('timesheet_entries').delete().eq('tenant_slug', slug)
    await supabase.from('monthly_timesheets').delete().eq('tenant_slug', slug)
    await supabase.from('daily_sales').delete().eq('tenant_slug', slug)
    await supabase.from('fixed_costs').delete().eq('tenant_slug', slug)
    await supabase.from('variable_costs').delete().eq('tenant_slug', slug)
    await supabase.from('business_targets').delete().eq('tenant_slug', slug)
    await supabase.from('tenant_kasboek_manual_lines').delete().eq('tenant_slug', slug)
    await supabase.from('z_reports').delete().eq('tenant_slug', slug)
    await supabase.from('subscriptions').delete().eq('tenant_slug', slug)
    await supabase.from('tenant_settings').delete().eq('id', tenant.id)
    await supabase.from('tenants').delete().eq('slug', slug)
    await supabase.from('business_profiles').delete().eq('tenant_slug', slug)

    setShowDeleteModal(null)
    setSaving(false)
    await loadData()
  }

  const handleSendPaymentReminder = async (tenant: Tenant) => {
    if (!tenant.email) {
      alert('Deze tenant heeft geen email adres!')
      return
    }

    if (!confirm(`Betalingsherinnering sturen naar ${tenant.email}?`)) return

    try {
      const response = await fetch('/api/send-payment-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantEmail: tenant.email,
          tenantName: tenant.business_name || tenant.tenant_slug,
          tenantSlug: tenant.tenant_slug,
        }),
      })

      if (response.ok) {
        alert('✅ Betalingsherinnering verzonden naar ' + tenant.email)
      } else {
        alert('❌ Fout bij verzenden email')
      }
    } catch (error) {
      alert('❌ Fout bij verzenden email')
    }
  }

  const handleTogglePaymentStatus = async (tenant: Tenant, sub: Subscription | undefined) => {
    const newStatus = sub?.status === 'active' ? 'expired' : 'active'
    const now = new Date()
    const nextMonth = new Date(now)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    if (sub?.id) {
      // Update bestaand abonnement
      await supabase
        .from('subscriptions')
        .update({ 
          status: newStatus,
          subscription_started_at: newStatus === 'active' ? now.toISOString() : null,
          next_payment_at: newStatus === 'active' ? nextMonth.toISOString() : null,
        })
        .eq('id', sub.id)
    } else {
      // Maak nieuw abonnement aan
      await supabase
        .from('subscriptions')
        .insert({
          tenant_slug: tenant.tenant_slug,
          plan: 'starter',
          status: newStatus,
          price_monthly: 59,
          subscription_started_at: newStatus === 'active' ? now.toISOString() : null,
          next_payment_at: newStatus === 'active' ? nextMonth.toISOString() : null,
        })
    }

    await loadData()
  }

  const handleCleanupExpired = async () => {
    const expiredTrials = tenants.filter((t) => {
      if (isAdminTenant(t.tenant_slug)) return false
      const sub = getSubscription(t.tenant_slug)
      if (sub?.status === 'trial' && sub.trial_ends_at) {
        return new Date(sub.trial_ends_at) < new Date()
      }
      return false
    })

    if (expiredTrials.length === 0) {
      alert('Geen verlopen trials gevonden')
      return
    }

    if (!confirm(`Weet je zeker dat je ${expiredTrials.length} verlopen trial(s) wilt verwijderen? Dit kan niet ongedaan worden!`)) {
      return
    }

    for (const tenant of expiredTrials) {
      await handleDeleteTenant(tenant)
    }

    await loadData()
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

  // Check of abonnement binnenkort vervalt (binnen 7 dagen) of niet actief is
  const isExpiringSoon = (sub: Subscription | undefined) => {
    if (!sub) return true // Geen abonnement = moet betalen
    if (sub.status === 'active') return false // Actief = betaald
    if (sub.status === 'trial' && sub.trial_ends_at) {
      const daysLeft = Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return daysLeft <= 7
    }
    if (sub.status === 'expired' || sub.status === 'cancelled') return true
    return false
  }

  const isPaid = (sub: Subscription | undefined) => {
    return sub?.status === 'active'
  }

  // Tel aantal dat binnenkort vervalt
  const expiringCount = tenants.filter((t) => {
    if (isAdminTenant(t.tenant_slug)) return false
    const sub = getSubscription(t.tenant_slug)
    return isExpiringSoon(sub)
  }).length

  const filteredTenants = tenants
    .filter(t => 
      t.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tenant_slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((t) => {
      if (!showExpiringOnly) return true
      if (isAdminTenant(t.tenant_slug)) return false
      const sub = getSubscription(t.tenant_slug)
      return isExpiringSoon(sub)
    })
    .sort((a, b) => {
      // Sorteer: niet-betalende tenants eerst
      const subA = donorAdminDisplaySubscription(a.tenant_slug, getSubscription(a.tenant_slug))
      const subB = donorAdminDisplaySubscription(b.tenant_slug, getSubscription(b.tenant_slug))
      const paidA = isPaid(subA)
      const paidB = isPaid(subB)
      
      if (!paidA && paidB) return -1 // a komt eerst (niet betaald)
      if (paidA && !paidB) return 1  // b komt eerst (niet betaald)
      return 0 // behoud originele volgorde
    })

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewTenantModal(true)}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors"
            >
              ➕ Nieuwe Tenant
            </button>
            <button
              onClick={() => setShowExpiringOnly(!showExpiringOnly)}
              className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 ${
                showExpiringOnly 
                  ? 'bg-red-500 text-white' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              }`}
            >
              ⚠️ Vervalt Binnenkort
              {expiringCount > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm font-bold">
                  {expiringCount}
                </span>
              )}
            </button>
            <Link
              href="/superadmin/abonnementen"
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors"
            >
              💳 Abonnementen
            </Link>
            <Link
              href="/superadmin/analytics"
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors"
            >
              📊 Analytics
            </Link>
            <button
              onClick={handleCleanupExpired}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors border border-red-500/30"
            >
              🧹 Opschonen
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
            >
              Uitloggen
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-6 border border-orange-400/60 shadow-lg shadow-orange-950/25"
          >
            <p className="text-white/85 text-sm">Totaal Tenants</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.totalTenants}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-6 border border-orange-400/60 shadow-lg shadow-orange-950/25"
          >
            <p className="text-white/85 text-sm">Actief</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.activeTenants}</p>
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

        <div className="mb-6 rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-3 text-slate-300 text-sm">
          Per tenant één <strong className="text-orange-400">📦 Modules</strong>-knop bij{' '}
          <strong>Acties</strong>. Oude scherm? <kbd className="px-1 bg-slate-900 rounded text-xs">Cmd+Shift+R</kbd> /{' '}
          <kbd className="px-1 bg-slate-900 rounded text-xs">Ctrl+Shift+R</kbd>.
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
            <p className="text-slate-400 text-sm mt-2">Modules beheer je via de oranje knop in Acties.</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Bedrijf</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Slug</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Plan</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Betaald</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Aangemaakt</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredTenants.map((tenant) => {
                  const sub = donorAdminDisplaySubscription(
                    tenant.tenant_slug,
                    getSubscription(tenant.tenant_slug)
                  )
                  return (
                    <tr key={tenant.id} className={`transition-colors ${tenant.is_blocked ? 'opacity-50' : ''} ${
                      isDemoTenant(tenant.tenant_slug)
                        ? 'bg-blue-500/10 hover:bg-blue-500/20 border-l-4 border-blue-500'
                        : isAdminTenant(tenant.tenant_slug)
                          ? 'bg-purple-500/10 hover:bg-purple-500/20 border-l-4 border-purple-500'
                          : isPaid(sub) 
                            ? 'bg-green-500/10 hover:bg-green-500/20 border-l-4 border-green-500' 
                            : 'bg-red-500/10 hover:bg-red-500/20 border-l-4 border-red-500'
                    }`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {tenant.is_blocked && <span className="text-red-500">🚫</span>}
                          {isDemoTenant(tenant.tenant_slug) && <span className="text-blue-400">🎭</span>}
                          {isProtectedTenant(tenant.tenant_slug) && !isDemoTenant(tenant.tenant_slug) && <span className="text-yellow-500">⭐</span>}
                          <div>
                            <p className="font-medium text-white flex items-center gap-2">
                              {tenant.business_name || 'Geen naam'}
                              {isDemoTenant(tenant.tenant_slug) && (
                                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">DEMO</span>
                              )}
                              {isProtectedTenant(tenant.tenant_slug) && !isDemoTenant(tenant.tenant_slug) && (
                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">MAIN</span>
                              )}
                            </p>
                            <p className="text-sm text-slate-400">{tenant.email}</p>
                          </div>
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isAdminTenant(tenant.tenant_slug) ? (
                            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${isDemoTenant(tenant.tenant_slug) ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}`}>
                              {isDemoTenant(tenant.tenant_slug) ? '🎭 Demo' : '👑 Admin'}
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  handleTogglePaymentStatus(tenant, getSubscription(tenant.tenant_slug))
                                }
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105 ${
                                  sub?.status === 'active'
                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                    : 'bg-red-500 hover:bg-red-600 text-white'
                                }`}
                              >
                                {sub?.status === 'active' ? '✓ Betaald' : '✗ Niet betaald'}
                              </button>
                              {sub?.status !== 'active' && tenant.email && (
                                <button
                                  onClick={() => handleSendPaymentReminder(tenant)}
                                  className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-all hover:scale-105"
                                  title="Stuur betalingsherinnering"
                                >
                                  📧
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('nl-BE') : '-'}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col gap-2 min-w-[160px]">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <Link
                              href={`/superadmin/tenant/${tenant.tenant_slug}/modules`}
                              className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-white rounded-lg text-xs font-semibold whitespace-nowrap"
                            >
                              📦 Modules
                            </Link>
                            <Link
                              href={`/api/auth/superadmin-tenant-entry?slug=${encodeURIComponent(tenant.tenant_slug)}&path=${encodeURIComponent('/admin')}`}
                              target="_blank"
                              title="Opent de klant-site (subdomein); geen zaak-wachtwoord"
                              className="px-2.5 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium whitespace-nowrap shrink-0"
                            >
                              🔑 Beheer
                            </Link>
                            <Link
                              href={`/superadmin/tenant/${tenant.tenant_slug}`}
                              className="px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs whitespace-nowrap shrink-0"
                            >
                              Details
                            </Link>
                          </div>
                          <div className="flex flex-wrap gap-2 items-center">
                            {!isProtectedTenant(tenant.tenant_slug) && (
                              <>
                                <button
                                  onClick={() => handleBlockTenant(tenant)}
                                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                    tenant.is_blocked
                                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                      : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                  }`}
                                >
                                  {tenant.is_blocked ? '✓ Deblokkeren' : '⚠️ Blokkeren'}
                                </button>
                                <button
                                  onClick={() => setShowDeleteModal(tenant)}
                                  className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
                                >
                                  🗑️ Verwijderen
                                </button>
                              </>
                            )}
                            {isProtectedTenant(tenant.tenant_slug) && (
                              <span className="px-3 py-1 bg-slate-700 text-slate-400 rounded-lg text-sm">
                                🔒 Beschermd
                              </span>
                            )}
                          </div>
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

      {/* New Tenant Modal */}
      <AnimatePresence>
        {showNewTenantModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewTenantModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-800 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-6">➕ Nieuwe Tenant Aanmaken</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Slug (URL) *</label>
                  <input
                    type="text"
                    value={newTenant.tenant_slug}
                    onChange={(e) => setNewTenant({ ...newTenant, tenant_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                    placeholder="mijn-frituur"
                  />
                  <p className="text-xs text-slate-400 mt-1">Wordt: <span className="text-orange-400 font-medium">{newTenant.tenant_slug || 'mijn-frituur'}.ordervysion.com</span></p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Bedrijfsnaam *</label>
                  <input
                    type="text"
                    value={newTenant.business_name}
                    onChange={(e) => setNewTenant({ ...newTenant, business_name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                    placeholder="Frituur Nolim"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={newTenant.email}
                    onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                    placeholder="info@frituur.be"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Telefoon</label>
                  <input
                    type="tel"
                    value={newTenant.phone}
                    onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                    placeholder="+32 123 45 67 89"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNewTenantModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleCreateTenant}
                  disabled={saving || !newTenant.tenant_slug || !newTenant.business_name}
                  className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Aanmaken...' : 'Aanmaken'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-800 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <span className="text-5xl mb-4 block">⚠️</span>
                <h2 className="text-xl font-bold text-white mb-2">Tenant Verwijderen?</h2>
                <p className="text-slate-400 mb-2">
                  Weet je zeker dat je <span className="text-white font-semibold">{showDeleteModal.business_name}</span> wilt verwijderen?
                </p>
                <p className="text-red-400 text-sm mb-6">
                  Dit verwijdert ALLE data: orders, producten, klanten, reviews, etc. Dit kan niet ongedaan worden!
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={() => handleDeleteTenant(showDeleteModal)}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Verwijderen...' : '🗑️ Definitief Verwijderen'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="max-w-7xl mx-auto px-4 py-8 mt-4 border-t border-slate-800 text-center text-slate-500 text-xs space-y-3">
        <p>
          <span className="text-slate-400">Deploy-build:</span>{' '}
          <code className="text-orange-400 bg-slate-800 px-2 py-0.5 rounded">
            {(process.env.NEXT_PUBLIC_BUILD_SHA || 'local').slice(0, 7)}
          </code>
          <span className="text-slate-600 ml-2">
            (als dit niet overeenkomt met Vercel → verkeerde site of oude cache)
          </span>
        </p>
        <p className="text-slate-400 max-w-xl mx-auto">
          Zie je <strong className="text-orange-300">geen oranje 📦 Modules</strong> bij Acties? Klik hieronder —
          daarna opnieuw laden.
        </p>
        <button
          type="button"
          onClick={async () => {
            try {
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations()
                await Promise.all(regs.map((r) => r.unregister()))
              }
              if ('caches' in window) {
                const keys = await caches.keys()
                await Promise.all(keys.map((k) => caches.delete(k)))
              }
            } catch {
              /* ignore */
            }
            window.location.reload()
          }}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium"
        >
          Service worker + offline-cache legen en herladen
        </button>
      </footer>
    </div>
  )
}
