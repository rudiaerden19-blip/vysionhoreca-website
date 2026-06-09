'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  customerNeedsPostTrialModulePicker,
  parseEnabledModulesJson,
  resolveTenantModules,
  type TenantModuleId,
} from '@/lib/tenant-modules'
import { isAdminTenant } from '@/lib/protected-tenants'
import { isMissingPostTrialModulesColumnError } from '@/lib/supabase-post-trial-column'
import { cache, CACHE_TTL, cacheKey } from '@/lib/cache'

type RawModuleFlagRow = {
  plan?: string | null
  enabled_modules?: unknown
  subscription_status?: string | null
  trial_ends_at?: string | null
  feature_group_orders?: boolean | null
  feature_label_printing?: boolean | null
  post_trial_modules_confirmed?: boolean | null
} | null

type RawModuleFlagSub = {
  status?: string | null
  trial_ends_at?: string | null
  plan?: string | null
} | null

/**
 * Haalt de twee Supabase-queries op die `useTenantModuleFlags` nodig heeft, met een
 * 60-seconden cache per tenant-slug. Voor admin-modulewissels binnen 60s = 0 round-trips.
 * Bij plan/blokkade-wijziging in superadmin: invalidateModuleFlags(slug).
 */
async function fetchRawModuleFlags(
  slug: string
): Promise<{ row: RawModuleFlagRow; sub: RawModuleFlagSub }> {
  return cache.getOrFetch(
    cacheKey('tenant_module_flags', slug),
    async () => {
      try {
        const res = await fetch(`/api/tenant/module-flags?tenant=${encodeURIComponent(slug)}`)
        if (res.ok) {
          const json = (await res.json()) as {
            tenant?: RawModuleFlagRow
            subscription?: RawModuleFlagSub
          }
          return {
            row: json.tenant ?? null,
            sub: json.subscription ?? null,
          }
        }
      } catch {
        /* fallback */
      }

      const [tRes, sRes] = await Promise.all([
        supabase
          .from('tenants')
          .select(
            'plan, enabled_modules, subscription_status, trial_ends_at, feature_group_orders, feature_label_printing, post_trial_modules_confirmed'
          )
          .eq('slug', slug)
          .maybeSingle(),
        supabase
          .from('subscriptions')
          .select('status, trial_ends_at, plan')
          .eq('tenant_slug', slug)
          .maybeSingle(),
      ])

      let row = tRes.data as RawModuleFlagRow
      if (tRes.error && isMissingPostTrialModulesColumnError(tRes.error)) {
        const r2 = await supabase
          .from('tenants')
          .select(
            'plan, enabled_modules, subscription_status, trial_ends_at, feature_group_orders, feature_label_printing'
          )
          .eq('slug', slug)
          .maybeSingle()
        if (!r2.error && r2.data) {
          row = { ...r2.data, post_trial_modules_confirmed: true } as RawModuleFlagRow
        }
      }

      return { row, sub: sRes.data as RawModuleFlagSub }
    },
    CACHE_TTL.TENANT_MODULE_FLAGS
  )
}

export function invalidateTenantModuleFlags(slug: string) {
  cache.invalidate(cacheKey('tenant_module_flags', slug))
}

export interface TenantModuleFlagsResult {
  moduleAccess: Record<TenantModuleId, boolean>
  /** Ruwe `tenants.enabled_modules` (inclusief submenu-keys `sm_*`). */
  enabledModulesJson: Record<string, boolean> | null
  featureGroupOrders: boolean
  featureLabelPrinting: boolean
  loading: boolean
  /** Trial voorbij, geen Pro, klant moet modules bevestigen. */
  needsPostTrialModulePicker: boolean
}

const DEFAULT_FLAGS: TenantModuleFlagsResult = {
  moduleAccess: resolveTenantModules({
    tenantSlug: '',
    enabledModulesJson: null,
    subscription: null,
    tenantRow: null,
  }),
  enabledModulesJson: null,
  featureGroupOrders: false,
  featureLabelPrinting: false,
  loading: true,
  needsPostTrialModulePicker: false,
}

export function useTenantModuleFlags(tenantSlug: string | undefined): TenantModuleFlagsResult & {
  refetch: () => void
} {
  const [result, setResult] = useState<TenantModuleFlagsResult>(DEFAULT_FLAGS)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => {
    if (tenantSlug) invalidateTenantModuleFlags(tenantSlug)
    setTick((t) => t + 1)
  }, [tenantSlug])

  useEffect(() => {
    if (!tenantSlug || !supabase) {
      setResult({
        moduleAccess: resolveTenantModules({
          tenantSlug: tenantSlug || '',
          enabledModulesJson: null,
          subscription: null,
          tenantRow: null,
        }),
        enabledModulesJson: null,
        featureGroupOrders: false,
        featureLabelPrinting: false,
        loading: false,
        needsPostTrialModulePicker: false,
      })
      return
    }

    const slug = tenantSlug

    let cancelled = false

    async function load() {
      // 60s cache per slug (in-memory, reset bij refresh) → admin-module-wissels binnen
      // dezelfde sessie zijn 0 round-trips i.p.v. 2 Supabase-queries.
      const { row: rawRow, sub: rawSub } = await fetchRawModuleFlags(slug)
      if (cancelled) return

      let row = rawRow
      let sub = rawSub
      if (isAdminTenant(slug)) {
        if (row) {
          row = {
            ...row,
            plan: 'pro',
            subscription_status: 'active',
            trial_ends_at: null,
          }
        }
        if (sub) {
          sub = { ...sub, plan: 'pro', status: 'active', trial_ends_at: null }
        }
      }
      const enabled = parseEnabledModulesJson(row?.enabled_modules)

      const moduleAccess = resolveTenantModules({
        tenantSlug: slug,
        enabledModulesJson: enabled,
        subscription: sub,
        tenantRow: row,
      })

      const needsPostTrialModulePicker = customerNeedsPostTrialModulePicker(slug, sub, row)

      setResult({
        moduleAccess,
        enabledModulesJson: enabled,
        featureGroupOrders: !!(row as { feature_group_orders?: boolean })?.feature_group_orders,
        featureLabelPrinting: !!(row as { feature_label_printing?: boolean })?.feature_label_printing,
        loading: false,
        needsPostTrialModulePicker,
      })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [tenantSlug, tick])

  useEffect(() => {
    if (!tenantSlug || typeof window === 'undefined') return
    const onUpdate = (e: Event) => {
      const slug = (e as CustomEvent<{ tenantSlug?: string }>).detail?.tenantSlug
      if (!slug || slug === tenantSlug) refetch()
    }
    window.addEventListener('vysion-tenant-modules-updated', onUpdate)
    return () => window.removeEventListener('vysion-tenant-modules-updated', onUpdate)
  }, [tenantSlug, refetch])

  return { ...result, refetch }
}
