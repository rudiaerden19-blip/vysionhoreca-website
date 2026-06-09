'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/i18n'
import { supabase } from '@/lib/supabase'
import { authFetch } from '@/lib/auth-headers'
import { ModuleToggleSlider } from '@/components/ModuleToggleSlider'
import {
  TENANT_MODULE_IDS,
  type TenantModuleId,
  mergeEnabledModulesFromDb,
  parseEnabledModulesJson,
} from '@/lib/tenant-modules'
import {
  buildHamburgerModules,
  mergeHamburgerRowsByTenantModule,
  SUBMENU_IDS_ALWAYS_ON,
} from '@/lib/admin-hamburger-modules'
import { isMissingPostTrialModulesColumnError } from '@/lib/supabase-post-trial-column'
import { invalidateTenantModuleFlags } from '@/lib/use-tenant-modules'

function buildSubToggleState(
  raw: unknown,
  moduleToggles: Record<TenantModuleId, boolean>,
  tenantSlug: string,
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

export default function TenantModulesPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const { t } = useLanguage()
  const baseUrl = `/shop/${tenant}/admin`

  const hamburgerByKey = useMemo(() => {
    const mods = buildHamburgerModules(baseUrl, tenant)
    return mergeHamburgerRowsByTenantModule(mods)
  }, [baseUrl, tenant])

  const [loading, setLoading] = useState(true)
  const [moduleToggles, setModuleToggles] = useState<Record<TenantModuleId, boolean>>(() =>
    mergeEnabledModulesFromDb(null, true),
  )
  const [subToggles, setSubToggles] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<'ok' | 'err' | null>(null)

  const loadData = useCallback(async () => {
    let row: {
      enabled_modules?: unknown
      post_trial_modules_confirmed?: boolean | null
    } | null = null

    const res = await authFetch(`/api/tenant/module-flags?tenant=${encodeURIComponent(tenant)}`)
    if (res.ok) {
      const json = (await res.json()) as { tenant?: typeof row }
      row = json.tenant ?? null
    } else {
      let { data, error } = await supabase
        .from('tenants')
        .select('enabled_modules, post_trial_modules_confirmed')
        .eq('slug', tenant)
        .maybeSingle()
      if (error && isMissingPostTrialModulesColumnError(error)) {
        const r2 = await supabase.from('tenants').select('enabled_modules').eq('slug', tenant).maybeSingle()
        data = r2.data ? { ...r2.data, post_trial_modules_confirmed: true } : null
      }
      row = data
    }

    const ptOk = row?.post_trial_modules_confirmed !== false
    const mod = mergeEnabledModulesFromDb(row?.enabled_modules, ptOk)
    const withAccount = { ...mod, account: true as const }
    setModuleToggles(withAccount)
    setSubToggles(buildSubToggleState(row?.enabled_modules, withAccount, tenant))
  }, [tenant])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await loadData()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [loadData])

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)

    const payload: Record<string, boolean> = {}
    for (const id of TENANT_MODULE_IDS) {
      payload[id] = id === 'account' ? true : !!moduleToggles[id]
    }
    const seen = new Set<string>()
    const hmods = buildHamburgerModules(baseUrl, tenant)
    for (const m of hmods) {
      for (const it of m.items) {
        if (seen.has(it.id)) continue
        seen.add(it.id)
        if (SUBMENU_IDS_ALWAYS_ON.has(it.id)) payload[it.id] = true
        else payload[it.id] = !!subToggles[it.id]
      }
    }

    const res = await authFetch('/api/tenant/confirm-modules', {
      method: 'POST',
      body: JSON.stringify({
        tenantSlug: tenant,
        enabled_modules: payload,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setSaveMsg('err')
      alert(t('tenantModulesPage.saveError').replace('{detail}', String(json?.error || res.status)))
      return
    }
    setSaveMsg('ok')
    invalidateTenantModuleFlags(tenant)
    await loadData()
    window.dispatchEvent(
      new CustomEvent('vysion-tenant-modules-updated', { detail: { tenantSlug: tenant } }),
    )
    setTimeout(() => setSaveMsg(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#3C4D6B] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">{t('tenantModulesPage.title')}</h1>
      <p className="mt-2 text-sm text-gray-600">{t('tenantModulesPage.subtitle')}</p>

      <div className="mt-8 space-y-5">
        {TENANT_MODULE_IDS.map((id) => {
          const mod = hamburgerByKey[id]
          const nestedItems = mod?.items.filter((it) => !SUBMENU_IDS_ALWAYS_ON.has(it.id)) ?? []
          const label = t(`tenantModulesPage.modules.${id}`)

          return (
            <div key={id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-3">
                <div>
                  <p className="text-base font-semibold text-gray-900">{label}</p>
                  {mod?.icon ? (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {mod.icon} {mod.labelKey ? t(mod.labelKey) : mod.label}
                    </p>
                  ) : null}
                </div>
                {id === 'account' ? (
                  <span className="text-xs font-semibold text-emerald-600">{t('tenantModulesPage.alwaysOn')}</span>
                ) : (
                  <ModuleToggleSlider
                    checked={!!moduleToggles[id]}
                    ariaLabel={label}
                    onChange={(next) => setModuleToggles((prev) => ({ ...prev, [id]: next }))}
                  />
                )}
              </div>
              {nestedItems.length > 0 && (
                <ul className="mt-4 space-y-2 border-l-2 border-gray-200 pl-4">
                  {nestedItems.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-3 py-2.5"
                    >
                      <span className="text-sm text-gray-800">
                        <span className="mr-2">{it.icon}</span>
                        {it.labelKey ? t(it.labelKey) : it.label}
                      </span>
                      <ModuleToggleSlider
                        checked={!!subToggles[it.id]}
                        ariaLabel={it.labelKey ? t(it.labelKey) : it.label}
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

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-xl bg-[#3C4D6B] px-6 py-3 font-semibold text-white hover:bg-[#2D3A52] disabled:opacity-50"
        >
          {saving ? t('tenantModulesPage.saving') : t('tenantModulesPage.save')}
        </button>
        {saveMsg === 'ok' && <span className="text-sm font-medium text-emerald-600">{t('tenantModulesPage.saved')}</span>}
      </div>
    </div>
  )
}
