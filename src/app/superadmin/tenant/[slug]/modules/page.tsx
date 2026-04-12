'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  parseEnabledModulesJson,
} from '@/lib/tenant-modules'
import {
  isMissingPostTrialModulesColumnError,
  withoutPostTrialModulesConfirmed,
} from '@/lib/supabase-post-trial-column'
import {
  buildHamburgerModules,
  mergeHamburgerRowsByTenantModule,
  SUBMENU_IDS_ALWAYS_ON,
} from '@/lib/admin-hamburger-modules'
import { mirrorSuperadminSessionFromCookieToLocalStorage } from '@/lib/superadmin-cookies'
import { useLanguage } from '@/i18n'

interface TenantsCoreRow {
  slug: string
  enabled_modules: Record<string, boolean> | null
  post_trial_modules_confirmed?: boolean | null
}

function buildSubToggleState(
  raw: unknown,
  moduleToggles: Record<TenantModuleId, boolean>,
  tenantSlug: string
): Record<string, boolean> {
  const p = parseEnabledModulesJson(raw)
  const baseUrl = `/shop/${tenantSlug}/admin`
  const hmods = buildHamburgerModules(baseUrl, tenantSlug)
  const subs: Record<string, boolean> = {}
  for (const m of hmods) {
    for (const it of m.items) {
      if (subs[it.id] !== undefined) continue
      const parentOn = !!moduleToggles[m.key]
      if (SUBMENU_IDS_ALWAYS_ON.has(it.id)) subs[it.id] = true
      else if (p && typeof p[it.id] === 'boolean') subs[it.id] = p[it.id]
      else subs[it.id] = parentOn
    }
  }
  return subs
}

export default function SuperadminTenantModulesPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const { t } = useLanguage()
  const baseUrl = `/shop/${slug}/admin`

  const hamburgerByKey = useMemo(() => {
    const mods = buildHamburgerModules(baseUrl, slug)
    return mergeHamburgerRowsByTenantModule(mods)
  }, [baseUrl, slug])

  const [loading, setLoading] = useState(true)
  const [businessName, setBusinessName] = useState('')
  const [modulesFullAccess, setModulesFullAccess] = useState(true)
  const [moduleToggles, setModuleToggles] = useState<Record<TenantModuleId, boolean>>(
    () => mergeEnabledModulesFromDb(null, true)
  )
  const [subToggles, setSubToggles] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<'ok' | 'err' | null>(null)

  const loadData = useCallback(async () => {
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('business_name')
      .eq('tenant_slug', slug)
      .maybeSingle()

    if (settings?.business_name) setBusinessName(settings.business_name)

    let { data: coreRow, error: coreErr } = await supabase
      .from('tenants')
      .select('slug, enabled_modules, post_trial_modules_confirmed')
      .eq('slug', slug)
      .maybeSingle()

    if (coreErr && isMissingPostTrialModulesColumnError(coreErr)) {
      const r2 = await supabase
        .from('tenants')
        .select('slug, enabled_modules')
        .eq('slug', slug)
        .maybeSingle()
      coreRow = r2.data
        ? ({ ...r2.data, post_trial_modules_confirmed: true } satisfies TenantsCoreRow)
        : null
      coreErr = r2.error
    }

    if (coreRow) {
      const row = coreRow as TenantsCoreRow
      const em = row.enabled_modules as unknown
      const ptOk = row.post_trial_modules_confirmed !== false
      const isFull = em == null && ptOk
      setModulesFullAccess(isFull)
      const mod = mergeEnabledModulesFromDb(em, ptOk)
      setModuleToggles({ ...mod, account: true })
      setSubToggles(buildSubToggleState(em, { ...mod, account: true }, slug))
    } else {
      setModulesFullAccess(true)
      const mod = mergeEnabledModulesFromDb(null, true)
      setModuleToggles({ ...mod, account: true })
      setSubToggles(buildSubToggleState(null, { ...mod, account: true }, slug))
    }
  }, [slug])

  useEffect(() => {
    mirrorSuperadminSessionFromCookieToLocalStorage()
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
    const payload: Record<string, boolean> = {}
    if (modulesFullAccess) {
      const fullPayload = { enabled_modules: null, post_trial_modules_confirmed: true }
      let { error: fullErr } = await supabase.from('tenants').update(fullPayload).eq('slug', slug)
      if (fullErr && isMissingPostTrialModulesColumnError(fullErr)) {
        const r = await supabase
          .from('tenants')
          .update(withoutPostTrialModulesConfirmed(fullPayload as Record<string, unknown>))
          .eq('slug', slug)
        fullErr = r.error
      }
      if (fullErr) {
        setSaving(false)
        setSaveMsg('err')
        alert('Opslaan mislukt: ' + fullErr.message)
        return
      }
      setSaving(false)
      setSaveMsg('ok')
      await loadData()
      setTimeout(() => setSaveMsg(null), 2500)
      return
    }

    for (const id of TENANT_MODULE_IDS) {
      payload[id] = id === 'account' ? true : !!moduleToggles[id]
    }
    const seen = new Set<string>()
    const hmods = buildHamburgerModules(baseUrl, slug)
    for (const m of hmods) {
      for (const it of m.items) {
        if (seen.has(it.id)) continue
        seen.add(it.id)
        const parentOn = m.key === 'account' ? true : !!moduleToggles[m.key]
        if (SUBMENU_IDS_ALWAYS_ON.has(it.id)) payload[it.id] = true
        else payload[it.id] = parentOn && !!subToggles[it.id]
      }
    }

    const upd = {
      enabled_modules: payload,
      post_trial_modules_confirmed: true,
    }
    let { error } = await supabase.from('tenants').update(upd).eq('slug', slug)
    if (error && isMissingPostTrialModulesColumnError(error)) {
      ;({ error } = await supabase
        .from('tenants')
        .update(withoutPostTrialModulesConfirmed(upd as Record<string, unknown>))
        .eq('slug', slug))
    }
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
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="sticky top-0 z-10 border-b border-slate-700 bg-slate-800 px-4 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link href="/superadmin" className="text-slate-400 hover:text-white">
              ← Tenants
            </Link>
            <span className="text-slate-600">|</span>
            <Link href={`/superadmin/tenant/${slug}`} className="text-slate-400 hover:text-white">
              Tenantdetails
            </Link>
          </div>
          <code className="text-sm text-orange-400">{slug}</code>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-bold">Modules & menu-items</h1>
        <p className="mb-6 text-sm text-slate-400">
          {businessName || slug} — schakel <strong className="text-slate-200">hoofdmodules</strong> en{' '}
          <strong className="text-slate-200">submenu&apos;s</strong> (onderdelen per module).{' '}
          <strong className="text-slate-200">Overzicht</strong> en <strong className="text-slate-200">abonnement</strong>{' '}
          blijven altijd beschikbaar voor de tenant. Account-hoofdmodule staat vast aan (zelfde reden).
        </p>

        {isAdminTenant(slug) && (
          <p className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-400/90">
            Platform-admin tenant: in het portaal heeft deze altijd technisch volledige toegang. Instellingen
            hier bewaren wel vooraf in de database (bijv. voor tests).
          </p>
        )}

        <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800 p-5">
          <div className="mb-2 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-white">Volledig pakket</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Geen beperkingen; submenu&apos;s worden niet individueel opgeslagen.
              </p>
            </div>
            <ModuleSlider
              checked={modulesFullAccess}
              disabled={false}
              onChange={(on) => {
                setModulesFullAccess(on)
                const mod = mergeEnabledModulesFromDb(null, true)
                setModuleToggles({ ...mod, account: true })
                setSubToggles(buildSubToggleState(null, { ...mod, account: true }, slug))
              }}
            />
          </div>
          {modulesFullAccess && (
            <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
              Zet <strong>Volledig pakket</strong> <strong>uit</strong> voor een uitgebreide lijst met schuivers per
              onderdeel.
            </p>
          )}
        </div>

        {!modulesFullAccess && (
          <div className="mb-8 space-y-6">
            <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/30 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">
                Altijd zichtbaar in het menu
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                <li className="flex items-center justify-between gap-4 rounded-xl border border-slate-600/60 bg-slate-800/50 px-4 py-3">
                  <span>🏠 Overzicht (dashboard)</span>
                  <span className="text-xs font-semibold text-emerald-400">Aan · vast</span>
                </li>
                <li className="flex items-center justify-between gap-4 rounded-xl border border-slate-600/60 bg-slate-800/50 px-4 py-3">
                  <span>📋 Abonnement / facturatie (/abonnement)</span>
                  <span className="text-xs font-semibold text-emerald-400">Aan · vast</span>
                </li>
              </ul>
            </div>

            {TENANT_MODULE_IDS.map((id) => {
              const mod = hamburgerByKey[id]
              const parentOn = id === 'account' ? true : !!moduleToggles[id]
              const nestedItems =
                mod?.items.filter((it) => !SUBMENU_IDS_ALWAYS_ON.has(it.id)) ?? []

              return (
                <div key={id} className="rounded-2xl border border-slate-600 bg-slate-800/50 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-600/80 pb-3">
                    <p className="text-base font-semibold text-white">{TENANT_MODULE_LABELS[id]}</p>
                    {id === 'account' ? (
                      <span className="text-xs font-bold text-emerald-400">Altijd aan</span>
                    ) : (
                      <ModuleSlider
                        checked={!!moduleToggles[id]}
                        disabled={false}
                        onChange={(next) => {
                          setModuleToggles((prev) => ({ ...prev, [id]: next }))
                          if (!next) {
                            setSubToggles((s) => {
                              const nextS = { ...s }
                              for (const it of nestedItems) {
                                if (!SUBMENU_IDS_ALWAYS_ON.has(it.id)) nextS[it.id] = false
                              }
                              return nextS
                            })
                          }
                        }}
                      />
                    )}
                  </div>
                  {nestedItems.length > 0 && (
                    <ul className="mt-4 space-y-2 border-l-2 border-slate-600 pl-4">
                      {nestedItems.map((it) => (
                        <li
                          key={it.id}
                          className="flex items-center justify-between gap-4 rounded-lg bg-slate-900/40 px-3 py-2.5"
                        >
                          <span className="text-sm text-slate-200">
                            <span className="mr-2">{it.icon}</span>
                            {it.labelKey ? t(it.labelKey) : it.label}
                          </span>
                          <ModuleSlider
                            checked={!!subToggles[it.id] && parentOn}
                            disabled={!parentOn}
                            onChange={(next) =>
                              setSubToggles((s) => ({
                                ...s,
                                [it.id]: next,
                              }))
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? 'Opslaan…' : 'Wijzigingen opslaan'}
          </button>
          {!modulesFullAccess && (
            <button
              type="button"
              onClick={() => {
                const s = getStarterEnabledModulesRecord()
                setModuleToggles({ ...s, account: true })
                setSubToggles(buildSubToggleState(null, { ...s, account: true }, slug))
              }}
              className="rounded-xl bg-slate-700 px-4 py-3 text-sm text-slate-200 hover:bg-slate-600"
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
          pointer-events-none absolute left-1 top-1 block h-6 w-6 rounded-full bg-white shadow-md
          transition-transform duration-200 ease-out will-change-transform
          ${checked ? 'translate-x-6' : 'translate-x-0'}
        `}
      />
    </button>
  )
}
