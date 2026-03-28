'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  customerNeedsPostTrialModulePicker,
  parseEnabledModulesJson,
  resolveTenantModules,
  type TenantModuleId,
} from '@/lib/tenant-modules'

export interface TenantModuleFlagsResult {
  moduleAccess: Record<TenantModuleId, boolean>
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

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!tenantSlug || !supabase) {
      setResult({
        moduleAccess: resolveTenantModules({
          tenantSlug: tenantSlug || '',
          enabledModulesJson: null,
          subscription: null,
          tenantRow: null,
        }),
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
      setResult((r) => ({ ...r, loading: true }))
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

      if (cancelled) return

      const row = tRes.data
      const sub = sRes.data
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

  return { ...result, refetch }
}
