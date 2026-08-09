import { isVysionOrderTenant } from '@/lib/admin-hamburger-modules'
import {
  isHorecaKassaPosScreenEnabled,
  isReservationsSoftwareTenant,
  isRetailKassaPosScreenEnabled,
  parseEnabledModulesJson,
  resolveTenantModules,
} from '@/lib/tenant-modules'

export type SuperadminProductLineKey = 'kassa' | 'reservaties' | 'online'

export type SuperadminProductLineStatus = {
  key: SuperadminProductLineKey
  label: string
  on: boolean
  /** Korte hint (bijv. alleen reserveringen, winkelkassa). */
  hint?: string
}

const LABELS: Record<SuperadminProductLineKey, string> = {
  kassa: 'Kassa',
  reservaties: 'Reserveringen',
  online: 'Online',
}

export function getSuperadminTenantProductLines(opts: {
  tenantSlug: string
  enabledModulesRaw: unknown
  postTrialModulesConfirmed?: boolean | null
  subscription: {
    status?: string | null
    trial_ends_at?: string | null
    plan?: string | null
  } | null
}): SuperadminProductLineStatus[] {
  const enabledModulesJson = parseEnabledModulesJson(opts.enabledModulesRaw)
  const access = resolveTenantModules({
    tenantSlug: opts.tenantSlug,
    enabledModulesJson,
    subscription: opts.subscription,
    tenantRow: {
      post_trial_modules_confirmed: opts.postTrialModulesConfirmed,
      subscription_status: opts.subscription?.status ?? null,
      trial_ends_at: opts.subscription?.trial_ends_at ?? null,
      plan: opts.subscription?.plan ?? null,
    },
  })

  const horecaKassa = isHorecaKassaPosScreenEnabled(access)
  const retailKassa = isRetailKassaPosScreenEnabled(access, enabledModulesJson)
  const kassaOn = horecaKassa || retailKassa
  let kassaHint: string | undefined
  if (retailKassa && !horecaKassa) kassaHint = 'Winkelkassa'
  else if (horecaKassa && retailKassa) kassaHint = 'Horeca + winkel'

  const reservatiesOn = !!access.reservaties
  let resHint: string | undefined
  if (isReservationsSoftwareTenant(access, enabledModulesJson)) {
    resHint = 'TableVysion'
  }

  const onlineOn =
    !!access['online-bestellingen'] ||
    !!access.online ||
    isVysionOrderTenant(access, enabledModulesJson)
  let onlineHint: string | undefined
  if (isVysionOrderTenant(access, enabledModulesJson) && !kassaOn) {
    onlineHint = 'Vysion Order'
  }

  return (['kassa', 'reservaties', 'online'] as const).map((key) => ({
    key,
    label: LABELS[key],
    on:
      key === 'kassa'
        ? kassaOn
        : key === 'reservaties'
          ? reservatiesOn
          : onlineOn,
    hint:
      key === 'kassa'
        ? kassaHint
        : key === 'reservaties'
          ? resHint
          : onlineHint,
  }))
}
