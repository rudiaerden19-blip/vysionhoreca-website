import {
  parseEnabledModulesJson,
  resolveTenantModules,
} from '@/lib/tenant-modules'

export type TenantModuleFlagsPayload = {
  tenant?: {
    plan?: string | null
    enabled_modules?: unknown
    subscription_status?: string | null
    trial_ends_at?: string | null
    post_trial_modules_confirmed?: boolean | null
  } | null
  subscription?: {
    status?: string | null
    trial_ends_at?: string | null
    plan?: string | null
  } | null
}

function resolvePublicModuleAccess(
  tenantSlug: string,
  payload: TenantModuleFlagsPayload | null | undefined,
) {
  if (!payload?.tenant) return null
  const enabledJson = parseEnabledModulesJson(payload.tenant.enabled_modules)
  return resolveTenantModules({
    tenantSlug,
    enabledModulesJson: enabledJson,
    subscription: payload.subscription ?? null,
    tenantRow: payload.tenant,
  })
}

/** Publieke tenant-site: webshop/menu alleen als module online-bestellingen aan staat. */
export function resolvePublicOnlineOrderingEnabled(
  tenantSlug: string,
  payload: TenantModuleFlagsPayload | null | undefined,
): boolean {
  const access = resolvePublicModuleAccess(tenantSlug, payload)
  return !!access?.['online-bestellingen']
}

/** Publieke tenant-site: reserveringsformulier alleen als module reservaties aan staat. */
export function resolvePublicReservationsEnabled(
  tenantSlug: string,
  payload: TenantModuleFlagsPayload | null | undefined,
): boolean {
  const access = resolvePublicModuleAccess(tenantSlug, payload)
  return !!access?.reservaties
}

export async function fetchPublicOnlineOrderingEnabled(tenantSlug: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tenant/module-flags?tenant=${encodeURIComponent(tenantSlug)}`)
    if (!res.ok) return false
    const json = (await res.json()) as TenantModuleFlagsPayload
    return resolvePublicOnlineOrderingEnabled(tenantSlug, json)
  } catch {
    return false
  }
}
