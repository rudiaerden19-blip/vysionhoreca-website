'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isAdminTenant } from '@/lib/protected-tenants'
import {
  TENANT_MODULE_IDS,
  TENANT_MODULE_LABELS,
  type TenantModuleId,
  mergeEnabledModulesFromDb,
  getStarterEnabledModulesRecord,
} from '@/lib/tenant-modules'

interface TenantsCoreRow {
  slug: string
  enabled_modules: Record<string, boolean> | null
  post_trial_modules_confirmed?: boolean | null
}

export default function SuperadminTenantModulesPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [loading, setLoading] = useState(true)
  const [businessName, setBusinessName] = useState('')
  const [modulesFullAccess, setModulesFullAccess] = useState(true)
  const [moduleToggles, setModuleToggles] = useState<Record<TenantModuleId, boolean>>(
    () => mergeEnabledModulesFromDb(null, true)
  )
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<'ok' | 'err' | null>(null)

  const loadData = useCallback(async () => {
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('business_name')
      .eq('tenant_slug', slug)
      .maybeSingle()

    if (settings?.business_name) setBusinessName(settings.business_name)

    const { data: coreRow } = await supabase
      .from('tenants')
      .select('slug, enabled_modules, post_trial_modules_confirmed')
      .eq('slug', slug)
      .maybeSingle()

    if (coreRow) {
      const row = coreRow as TenantsCoreRow
      const em = row.enabled_modules as unknown
      const ptOk = row.post_trial_modules_confirmed !== false
      const isFull = em == null && ptOk
      setModulesFullAccess(isFull)
      setModuleToggles(mergeEnabledModulesFromDb(em, ptOk))
    } else {
      setModulesFullAccess(true)
      setModuleToggles(mergeEnabledModulesFromDb(null, true))
    }
  }, [slug])

  useEffect(() => {
    const adminId = localStorage.getItem('superadmin_id')
    if (!adminId) {
      router.push('/superadmin/login')
      return
    }
    let cancelled = false
    ;(async () => {
      await loadData()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [router, loadData])

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    const payload = modulesFullAccess
      ? { enabled_modules: null, post_trial_modules_confirmed: true }
      : {
          enabled_modules: TENANT_MODULE_IDS.reduce(
            (acc, id) => {
              const on = !!moduleToggles[id]
              acc[id] =
                id === 'kassa' || id === 'instellingen' || id === 'account' ? true : on
              return acc
            },
            {} as Record<string, boolean>
          ),
          post_trial_modules_confirmed: true,
        }
    const { error } = await supabase.from('tenants').update(payload).eq('slug', slug)
    setSaving(false)
    if (error) {
      setSaveMsg('err')
      alert('Opslaan mislukt: ' + error.message)
      return
    }
    setSaveMsg('ok')
    await loadData()
    setTimeout(() => setSaveMsg(null), 2500)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700 px-4 py-4">
        <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link href="/superadmin" className="text-slate-400 hover:text-white">
              ← Tenants
            </Link>
            <span className="text-slate-600">|</span>
            <Link href={`/superadmin/tenant/${slug}`} className="text-slate-400 hover:text-white">
              Tenantdetails
            </Link>
          </div>
          <code className="text-orange-400 text-sm">{slug}</code>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">Modules</h1>
        <p className="text-slate-400 text-sm mb-6">
          {businessName || slug} — schakel modules aan of uit. De klant ziet alleen aangezette onderdelen in
          het adminportaal (kassa, instellingen en account blijven altijd beschikbaar).
        </p>

        {isAdminTenant(slug) && (
          <p className="text-amber-400/90 text-sm mb-6 border border-amber-500/30 rounded-xl p-3 bg-amber-500/5">
            Platform-admin tenant: in het portaal heeft deze altijd technisch volledige toegang. Instellingen
            hier bewaren wel vooraf in de database (bijv. voor tests).
          </p>
        )}

        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 mb-6">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div>
              <p className="font-semibold text-white">Volledig pakket</p>
              <p className="text-xs text-slate-400 mt-0.5">Alle modules zichtbaar (geen beperkingen via deze lijst).</p>
            </div>
            <ModuleSlider
              checked={modulesFullAccess}
              disabled={false}
              onChange={(on) => {
                setModulesFullAccess(on)
                setModuleToggles(mergeEnabledModulesFromDb(null, true))
              }}
            />
          </div>
        </div>

        {!modulesFullAccess && (
          <ul className="space-y-2 mb-8">
            {TENANT_MODULE_IDS.map((id) => {
              const locked = id === 'kassa' || id === 'instellingen' || id === 'account'
              const on = !!moduleToggles[id]
              return (
                <li
                  key={id}
                  className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
                    locked ? 'border-slate-600 bg-slate-800/50' : 'border-slate-600 bg-slate-800/80'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-100">{TENANT_MODULE_LABELS[id]}</p>
                    {locked && <p className="text-xs text-slate-500 mt-0.5">Altijd aan</p>}
                  </div>
                  <ModuleSlider
                    checked={on}
                    disabled={locked}
                    onChange={(next) =>
                      setModuleToggles((prev) => ({
                        ...prev,
                        [id]: next,
                      }))
                    }
                  />
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-semibold"
          >
            {saving ? 'Opslaan…' : 'Wijzigingen opslaan'}
          </button>
          {!modulesFullAccess && (
            <button
              type="button"
              onClick={() => setModuleToggles(getStarterEnabledModulesRecord())}
              className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm text-slate-200"
            >
              Template: starter
            </button>
          )}
          {saveMsg === 'ok' && <span className="text-sm text-emerald-400">Opgeslagen.</span>}
        </div>
      </main>
    </div>
  )
}

function ModuleSlider({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative h-8 w-14 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400
        ${checked ? 'bg-emerald-500' : 'bg-slate-600'}
        ${disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform
          ${checked ? 'translate-x-7' : 'translate-x-1'}
        `}
      />
    </button>
  )
}
