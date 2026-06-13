import { collectAllSubmenuIds } from '@/lib/admin-hamburger-modules'
import {
  getFirstAccessibleAdminPath,
  mergeEnabledModulesFromDb,
  TENANT_MODULE_IDS,
  type TenantModuleId,
} from '@/lib/tenant-modules'

/** Keuze bij gratis registratie — presets hieronder zijn aanpasbaar zonder UI-wijziging. */
export const REGISTRATION_PRODUCT_LINES = [
  'horeca_kassa',
  'retail_winkel',
  'online_bestellen',
  'restaurant_reservaties',
] as const

export type RegistrationProductLine = (typeof REGISTRATION_PRODUCT_LINES)[number]

export function isRegistrationProductLine(v: unknown): v is RegistrationProductLine {
  return (
    typeof v === 'string' &&
    (REGISTRATION_PRODUCT_LINES as readonly string[]).includes(v)
  )
}

type PresetDef = {
  /** Hoofdmodules (TenantModuleId). */
  modules: Partial<Record<TenantModuleId, boolean>>
  /** Submenu-id’s (`sm_*`) die aan staan; rest uit. */
  submenusOn: string[]
}

/**
 * Automatische modules per registratie-keuze.
 * Pas deze objecten aan wanneer producteigenaar de pakketten definitief zet.
 */
export const REGISTRATION_MODULE_PRESETS: Record<RegistrationProductLine, PresetDef> = {
  horeca_kassa: {
    modules: {
      kassa: true,
      instellingen: true,
      account: true,
      rapporten: true,
      personeel: false,
      kosten: false,
      website: false,
      online: false,
      'online-bestellingen': false,
      reservaties: false,
      'retail-kassa': false,
      voorraad: false,
    },
    submenusOn: [
      'sm_kassa_pincode',
      'sm_kassa_categorieen',
      'sm_kassa_producten',
      'sm_kassa_opties',
      'sm_kassa_allergenen',
      'sm_kassa_labels',
      'sm_kassa_terminal',
    ],
  },
  retail_winkel: {
    modules: {
      'retail-kassa': true,
      voorraad: true,
      instellingen: true,
      account: true,
      rapporten: true,
      kassa: false,
      'online-bestellingen': false,
      online: false,
      website: false,
      reservaties: false,
      personeel: false,
      kosten: false,
    },
    submenusOn: [
      'sm_retail_kassa_pos',
      'sm_retail_kassa_producten',
      'sm_retail_product_intake',
      'sm_voorraad_producten',
    ],
  },
  online_bestellen: {
    modules: {
      'online-bestellingen': true,
      online: true,
      website: true,
      kassa: true,
      instellingen: true,
      account: true,
      reservaties: false,
      'retail-kassa': false,
      voorraad: false,
      rapporten: false,
      personeel: false,
      kosten: false,
    },
    submenusOn: [
      'sm_orders_bestellingen',
      'sm_orders_groepen',
      'sm_kassa_categorieen',
      'sm_kassa_producten',
      'sm_kassa_opties',
      'sm_kassa_allergenen',
    ],
  },
  restaurant_reservaties: {
    modules: {
      reservaties: true,
      instellingen: true,
      account: true,
      website: true,
      kassa: false,
      'online-bestellingen': false,
      online: false,
      'retail-kassa': false,
      voorraad: false,
      rapporten: false,
      personeel: false,
      kosten: false,
    },
    submenusOn: ['sm_reserveringen'],
  },
}

/** JSON voor `tenants.enabled_modules` bij registratie. */
export function buildRegistrationEnabledModulesJson(
  line: RegistrationProductLine,
): Record<string, boolean> {
  const preset = REGISTRATION_MODULE_PRESETS[line]
  const allSubIds = collectAllSubmenuIds()
  const raw: Record<string, boolean> = {}

  for (const id of TENANT_MODULE_IDS) {
    if (id === 'account') {
      raw[id] = true
      continue
    }
    if (preset.modules[id] === true) raw[id] = true
    else if (preset.modules[id] === false) raw[id] = false
    else raw[id] = false
  }

  for (const subId of allSubIds) {
    raw[subId] = preset.submenusOn.includes(subId)
  }

  raw.account = true
  return raw
}

export function resolveRegistrationModuleAccess(line: RegistrationProductLine) {
  const json = buildRegistrationEnabledModulesJson(line)
  return mergeEnabledModulesFromDb(json, true)
}

/** Eerste admin-URL na registratie (welkom → doorverwijzen). */
export function getRegistrationPostSignupAdminPath(
  tenantSlug: string,
  line: RegistrationProductLine,
): string {
  const json = buildRegistrationEnabledModulesJson(line)
  const access = mergeEnabledModulesFromDb(json, true)
  return getFirstAccessibleAdminPath(tenantSlug, access, json)
}

export function registrationLineWantsDeliveryBootstrap(line: RegistrationProductLine): boolean {
  return line === 'horeca_kassa' || line === 'online_bestellen'
}
