'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { isAdminTenant } from '@/lib/protected-tenants'
import {
  TENANT_MODULE_IDS,
  TENANT_MODULE_LABELS,
  type TenantModuleId,
  mergeEnabledModulesFromDb,
  getStarterEnabledModulesRecord,
} from '@/lib/tenant-modules'
import {
  isMissingPostTrialModulesColumnError,
  withoutPostTrialModulesConfirmed,
} from '@/lib/supabase-post-trial-column'

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

interface TenantsCoreRow {
  slug: string
  plan: string
  enabled_modules: Record<string, boolean> | null
  post_trial_modules_confirmed?: boolean | null
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


export default function TenantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tenant, setTenant] = useState<TenantDetails | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [tenantsCore, setTenantsCore] = useState<TenantsCoreRow | null>(null)
  const [modulesFullAccess, setModulesFullAccess] = useState(true)
  const [moduleToggles, setModuleToggles] = useState<Record<TenantModuleId, boolean>>(
    () => mergeEnabledModulesFromDb(null, true)
  )
  const [savingModules, setSavingModules] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [subForm, setSubForm] = useState<Subscription>({
    tenant_slug: slug,
    plan: 'starter',
    status: 'trial',
    price_monthly: 59,
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

    let { data: coreRow, error: coreErr } = await supabase
      .from('tenants')
      .select('slug, plan, enabled_modules, post_trial_modules_confirmed')
      .eq('slug', slug)
      .maybeSingle()

    if (coreErr && isMissingPostTrialModulesColumnError(coreErr)) {
      const r2 = await supabase
        .from('tenants')
        .select('slug, plan, enabled_modules')
        .eq('slug', slug)
        .maybeSingle()
      coreRow = r2.data
        ? ({ ...r2.data, post_trial_modules_confirmed: true } satisfies TenantsCoreRow)
        : null
      coreErr = r2.error
    }

    if (coreRow) {
      const row = coreRow as TenantsCoreRow
      setTenantsCore(row)
      const em = row.enabled_modules as unknown
      const ptOk = row.post_trial_modules_confirmed !== false
      const isFull = em == null && ptOk
      setModulesFullAccess(isFull)
      setModuleToggles(mergeEnabledModulesFromDb(em, ptOk))
    } else {
      setTenantsCore(null)
      setModulesFullAccess(true)
      setModuleToggles(mergeEnabledModulesFromDb(null, true))
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

    await supabase
      .from('tenants')
      .update({
        plan: subForm.plan,
      })
      .eq('slug', slug)

    await loadData()
    setShowSubscriptionModal(false)
    setSaving(false)
  }

  async function handleSaveModules() {
    setSavingModules(true)
    const payload = modulesFullAccess
      ? { enabled_modules: null, post_trial_modules_confirmed: true }
      : {
          enabled_modules: TENANT_MODULE_IDS.reduce(
            (acc, id) => {
              acc[id] = !!moduleToggles[id]
              return acc
            },
            {} as Record<string, boolean>
          ),
          post_trial_modules_confirmed: true,
        }
    let { error } = await supabase.from('tenants').update(payload).eq('slug', slug)
    if (error && isMissingPostTrialModulesColumnError(error)) {
      const fallback = withoutPostTrialModulesConfirmed(payload as Record<string, unknown>)
      ;({ error } = await supabase.from('tenants').update(fallback).eq('slug', slug))
    }
    setSavingModules(false)
    if (error) {
      alert('Modules opslaan mislukt: ' + error.message)
      return
    }
    await loadData()
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
          price_monthly: 59,
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
      case 'starter': return 59
      case 'standaard': return 99
      case 'pro': return 129
      default: return 69
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
              <p className="text-indigo-300/90 text-xs mt-1.5 font-medium">
                Gebruik de knop Modules voor de schuifschakelaar-pagina, of scroll hieronder voor het klassieke
                overzicht.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Link
              href={`/superadmin/tenant/${slug}/modules`}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors font-semibold shrink-0"
            >
              📦 Modules
            </Link>
            <Link
              href={`/shop/${slug}`}
              target="_blank"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors shrink-0"
            >
              Bekijk Shop
            </Link>
            <Link
              href={`/shop/${slug}/admin`}
              target="_blank"
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-medium shrink-0"
            >
              🔑 Beheer Klant
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <section
            id="modules"
            className="bg-slate-800 rounded-2xl p-6 border-2 border-indigo-500/40 mb-8 scroll-mt-28 shadow-lg shadow-indigo-950/20"
          >
            <h2 className="text-xl font-bold text-white mb-2">Modules (klantportaal)</h2>
            {isAdminTenant(slug) && (
              <p className="text-amber-400/90 text-sm mb-4 border border-amber-500/30 rounded-xl p-3 bg-amber-500/5">
                Dit is een platform-admin tenant (MAIN). In het klantportaal krijgen die automatisch
                altijd alle modules; je kunt hier tóch preset bewaren voor later of voor tests.
              </p>
            )}
            <p className="text-slate-400 text-sm mb-6">
              <strong className="text-slate-300">Volledig pakket:</strong> alle modules.{' '}
              <strong className="text-slate-300">Aangepast:</strong> elke module (ook kassa, instellingen,
              account) kun je uit zetten — ongeacht Pro of starter.
            </p>

            <div className="flex flex-wrap gap-4 mb-6">
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="radio"
                  name="modpack"
                  checked={modulesFullAccess}
                  onChange={() => {
                    setModulesFullAccess(true)
                    setModuleToggles(mergeEnabledModulesFromDb(null, true))
                  }}
                  className="w-4 h-4"
                />
                Volledig pakket
              </label>
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="radio"
                  name="modpack"
                  checked={!modulesFullAccess}
                  onChange={() => {
                    setModulesFullAccess(false)
                    if (tenantsCore?.enabled_modules == null) {
                      setModuleToggles(
                        mergeEnabledModulesFromDb(
                          null,
                          tenantsCore?.post_trial_modules_confirmed !== false
                        )
                      )
                    }
                  }}
                  className="w-4 h-4"
                />
                Aangepast
              </label>
            </div>

            {!modulesFullAccess && (
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                {TENANT_MODULE_IDS.map((id) => (
                  <label
                    key={id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-600 bg-slate-900/30"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4"
                      checked={!!moduleToggles[id]}
                      onChange={(e) =>
                        setModuleToggles((prev) => ({ ...prev, [id]: e.target.checked }))
                      }
                    />
                    <span className="text-sm text-slate-200">{TENANT_MODULE_LABELS[id]}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveModules}
                disabled={savingModules}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {savingModules ? 'Opslaan…' : 'Modules opslaan'}
              </button>
              {!modulesFullAccess && (
                <button
                  type="button"
                  onClick={() => setModuleToggles(getStarterEnabledModulesRecord())}
                  className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm"
                >
                  Template: starter-pakket
                </button>
              )}
            </div>
          </section>

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
              {!isAdminTenant(slug) && (
                <button
                  onClick={() => setShowSubscriptionModal(true)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors text-sm"
                >
                  Bewerken
                </button>
              )}
            </div>

            {isAdminTenant(slug) ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Plan</p>
                    <p className="text-2xl font-bold text-white">Pro</p>
                  </div>
                  <span className="px-4 py-2 rounded-full text-sm font-medium border bg-purple-100 text-purple-700 border-purple-200">
                    👑 platform (geen trial)
                  </span>
                </div>

                <div>
                  <p className="text-slate-400 text-sm">Maandelijks bedrag</p>
                  <p className="text-3xl font-bold text-green-400">€0/maand</p>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                  <p className="text-purple-400 text-sm">Status</p>
                  <p className="text-white font-medium">Actief — altijd Pro, geen proefperiode</p>
                </div>
              </div>
            ) : subscription ? (
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
                  <option value="starter">Starter - €59/maand</option>
                  <option value="pro">Premium - €99/maand</option>
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
