'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  parseEnabledModulesJson,
  resolveTenantModules,
  type TenantModuleId,
} from '@/lib/tenant-modules'

export interface TenantModuleFlagsResult {
  moduleAccess: Record<TenantModuleId, boolean>
  featureGroupOrders: boolean
  featureLabelPrinting: boolean
  loading: boolean
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
}

export function useTenantModuleFlags(tenantSlug: string | undefined): TenantModuleFlagsResult {
  const [result, setResult] = useState<TenantModuleFlagsResult>(DEFAULT_FLAGS)

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
      })
      return
    }

    let cancelled = false

    async function load() {
      setResult((r) => ({ ...r, loading: true }))
      const [tRes, sRes] = await Promise.all([
        supabase
          .from('tenants')
          .select(
            'plan, enabled_modules, subscription_status, trial_ends_at, feature_group_orders, feature_label_printing'
          )
          .eq('slug', tenantSlug)
          .maybeSingle(),
        supabase
          .from('subscriptions')
          .select('status, trial_ends_at, plan')
          .eq('tenant_slug', tenantSlug)
          .maybeSingle(),
      ])

      if (cancelled) return

      const row = tRes.data
      const sub = sRes.data
      const enabled = parseEnabledModulesJson(row?.enabled_modules)

      const moduleAccess = resolveTenantModules({
        tenantSlug,
        enabledModulesJson: enabled,
        subscription: sub,
        tenantRow: row,
      })

      setResult({
        moduleAccess,
        featureGroupOrders: !!(row as { feature_group_orders?: boolean })?.feature_group_orders,
        featureLabelPrinting: !!(row as { feature_label_printing?: boolean })?.feature_label_printing,
        loading: false,
      })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [tenantSlug])

  return result
}
