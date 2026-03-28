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
              acc[id] = !!moduleToggles[id]
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
          {businessName || slug} — als platformbeheerder zet je <strong className="text-slate-200">elke</strong>{' '}
          module aan of uit (ook kassa, instellingen, account). Proef-/abonnementsniveau maakt niet uit zolang
          er een expliciete lijst staat. Let op: alles uit behalve één module kan de klantflow beperken.
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
          {modulesFullAccess && (
            <p className="text-amber-200/90 text-xs mt-3 border border-amber-500/25 rounded-lg px-3 py-2 bg-amber-500/10">
              Wil je <strong>losse modules</strong> aan/uit zetten? Zet <strong>Volledig pakket</strong> hierboven{' '}
              <strong>uit</strong> — dan verschijnt de lijst met schuivers.
            </p>
          )}
        </div>

        {!modulesFullAccess && (
          <ul className="space-y-2 mb-8">
            {TENANT_MODULE_IDS.map((id) => {
              const on = !!moduleToggles[id]
              return (
                <li
                  key={id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-100">{TENANT_MODULE_LABELS[id]}</p>
                  </div>
                  <ModuleSlider
                    checked={on}
                    disabled={false}
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
  /** Geen native `disabled`: browsers grijzen kinderen waardoor “aan” op slot eruit ziet als “uit”. */
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (disabled) return
        onChange(!checked)
      }}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onChange(!checked)
        }
      }}
      className={`
        relative h-8 w-14 shrink-0 rounded-full transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
        ${checked ? 'bg-emerald-500' : 'bg-slate-600'}
        ${disabled ? 'cursor-default opacity-80' : 'cursor-pointer'}
      `}
    >
      <span
        aria-hidden
        className={`
          pointer-events-none absolute top-1 left-1 block h-6 w-6 rounded-full bg-white shadow-md
          transition-transform duration-200 ease-out will-change-transform
          ${checked ? 'translate-x-6' : 'translate-x-0'}
        `}
      />
    </button>
  )
}
